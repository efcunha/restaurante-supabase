import { supabase } from '../config/SupabaseConfig';
// @ts-ignore
import { convertUnit } from '../utils/unitConversion';
import OfflineQueueService from './OfflineQueueService';
import { Ingredient } from '../types';

class InventoryService {
    /**
     * Realiza a baixa de estoque para uma lista de itens do pedido.
     * @param {string} companyId - ID da empresa
     * @param {Array} orderItems - Itens do pedido (devem conter inventoryItems se configurado)
     */
    async deductStock(companyId: string, orderItems: any[]): Promise<{ totalCost: number; error?: any }> {
        try {
            const result = await this.processStockDeduction(companyId, orderItems, false);
            return result;
        } catch (error) {
            console.error('[InventoryService] Erro inicial ao baixar estoque. Adicionando à fila.', error);
            return { totalCost: 0, error };
        }
    }

    /**
     * Lógica interna de processamento.
     * @param {string} companyId 
     * @param {Array} orderItems 
     * @param {boolean} isRetry - Indica se é uma re-tentativa da fila (para não loopear)
     * @returns {Promise<{totalCost: number}>}
     */
    async processStockDeduction(companyId: string, orderItems: any[], isRetry: boolean = false): Promise<{ totalCost: number }> {
        if (!companyId || !orderItems || orderItems.length === 0) return { totalCost: 0 };

        try {
            const stockIdsToFetch = new Set<string>();
            const deductions: { stockId: string; reqQty: number; reqUnit: string }[] = [];
            let hasInventoryItems = false;

            // Extract quantity from item (e.g., "2x Coca")
            for (const item of orderItems) {
                const itemNome = item.nome || item.name || '';
                const qtyMatch = typeof item === 'string'
                    ? item.match(/^(\d+)x/)
                    : (itemNome).match(/^(\d+)x/);

                const orderQty = qtyMatch ? parseInt(qtyMatch[1], 10) : (item.quantidade || 1);

                if (item.inventoryItems && Array.isArray(item.inventoryItems)) {
                    hasInventoryItems = true;
                    item.inventoryItems.forEach((ingrediente: Ingredient) => {
                        if (ingrediente.id) {
                            stockIdsToFetch.add(ingrediente.id);
                            deductions.push({
                                stockId: ingrediente.id,
                                reqQty: (ingrediente.qt || 0) * orderQty,
                                reqUnit: ingrediente.un
                            });
                        }
                    });
                }
            }

            if (!hasInventoryItems) {
                return { totalCost: 0 };
            }

            if (stockIdsToFetch.size === 0) return { totalCost: 0 };

            // Fetch current stock data
            const stockIds = Array.from(stockIdsToFetch);
            const { data: stockItems, error: fetchError } = await supabase
                .from('inventory')
                .select('*')
                .eq('company_id', companyId)
                .in('id', stockIds);

            if (fetchError) {
                throw fetchError;
            }

            const stockMap: Record<string, any> = {};
            (stockItems || []).forEach(item => {
                stockMap[item.id] = item;
            });

            // Process deductions
            let totalCost = 0;
            const updates: any[] = [];

            for (const ded of deductions) {
                const stockItem = stockMap[ded.stockId];
                if (!stockItem) {
                    console.warn(`[InventoryService] Item de estoque ${ded.stockId} não encontrado/excluído.`);
                    continue;
                }

                // Unit conversion
                const convertedAmount = convertUnit(ded.reqQty, ded.reqUnit, stockItem.unidade);

                if (convertedAmount !== null && convertedAmount > 0) {
                    const newQuantity = (stockItem.quantidade || 0) - convertedAmount;
                    
                    // Update stock quantity
                    updates.push(
                        supabase
                            .from('inventory')
                            .update({
                                quantidade: newQuantity,
                                atualizado_em: new Date().toISOString()
                            })
                            .eq('company_id', companyId)
                            .eq('id', ded.stockId)
                    );

                    // Calculate cost (CMV)
                    if (stockItem.preco_custo) {
                        const custoParcela = Number(stockItem.preco_custo) * convertedAmount;
                        totalCost += custoParcela;
                    }
                } else {
                    console.warn(`[InventoryService] Falha na conversão ou valor zero: ${ded.reqQty} ${ded.reqUnit} -> ${stockItem.unidade}`);
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                console.log(`[InventoryService] Baixa efetuada em ${updates.length} itens. Custo Total (CMV): R$ ${totalCost.toFixed(2)}`);
            }

            return { totalCost };

        } catch (error) {
            console.error('[InventoryService] Erro no processStockDeduction:', error);

            if (!isRetry) {
                await OfflineQueueService.enqueue('STOCK_DEDUCTION', async () => ({ totalCost: 0 }), {
                    companyId,
                    orderItems: orderItems
                });
            } else {
                throw error;
            }
            return { totalCost: 0 };
        }
    }
}

export default new InventoryService();
