import { writeBatch, doc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyDoc, getCompanyCollection } from '../utils/firestoreUtils';
import { convertUnit } from '../utils/unitConversion';
import OfflineQueueService from './OfflineQueueService';

class InventoryService {
    /**
     * Realiza a baixa de estoque para uma lista de itens do pedido.
     * @param {string} companyId - ID da empresa
     * @param {Array} orderItems - Itens do pedido (devem conter inventoryItems se configurado)
     */
    async deductStock(companyId, orderItems) {
        // Chama o processamento interno, mas captura erro para fila se necessário
        try {
            await this.processStockDeduction(companyId, orderItems, false);
            /* console.log('[InventoryService] Baixa de estoque solicitada.'); */
        } catch (error) {
            console.error('[InventoryService] Erro inicial ao baixar estoque. Adicionando à fila.', error);
            // O processStockDeduction já deve ter cuidado da fila se fosse um erro de execução,
            // mas se falhar ANTES, garantimos aqui.
            // Na verdade, a lógica de fila deve ser tratada com cuidado.
        }
    }

    /**
     * Lógica interna de processamento.
     * @param {string} companyId 
     * @param {Array} orderItems 
     * @param {boolean} isRetry - Indica se é uma re-tentativa da fila (para não loopear)
     */
    async processStockDeduction(companyId, orderItems, isRetry = false) {
        if (!companyId || !orderItems || orderItems.length === 0) return;

        try {
            // 1. Identificar quais itens de estoque precisamos ler
            // Estrutura esperada do inventoryItems: [{ id: 'stockId', qt: 10, un: 'ml', nome: 'Leite' }]
            const stockIdsToFetch = new Set();
            const deductions = []; // { stockId, amountToDeduct }

            let hasInventoryItems = false;

            // Extrair quantidade do item (ex: "2x Coca")
            for (const item of orderItems) {
                const qtyMatch = typeof item === 'string'
                    ? item.match(/^(\d+)x/)
                    : (item.nome || '').match(/^(\d+)x/);

                const orderQty = qtyMatch ? parseInt(qtyMatch[1], 10) : (item.quantidade || 1);

                // Se o item tem configuração de estoque (precisa vir do Cardápio)
                // Nota: O objeto 'item' aqui precisa vir POPULADO com 'inventoryItems'.
                // Se o pedido salvou apenas strings ou dados parciais, isso vai falhar se não buscarmos do cardápio.
                // Assumimos por enquanto que o hook useNovoPedido vai passar o objeto completo do produto.
                if (item.inventoryItems && Array.isArray(item.inventoryItems)) {
                    hasInventoryItems = true;
                    item.inventoryItems.forEach(ingrediente => {
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
                // console.log('[InventoryService] Nenhum item do pedido possui vínculo com estoque.');
                return;
            }

            if (stockIdsToFetch.size === 0) return;

            // 2. Buscar dados atuais do estoque (para saber a Unidade de Destino)
            // Firestore não suporta 'whereIn' com IDs de documento diretamente de forma fácil para collection group ou subcollection customizada sem index,
            // mas podemos fazer leituras paralelas (getAll não existe no client SDK exatamente como no Admin, usamos Promise.all).

            const stockDocsPromises = Array.from(stockIdsToFetch).map(id =>
                getDoc(getCompanyDoc(companyId, 'estoque', id))
            );

            const stockSnapshots = await Promise.all(stockDocsPromises);
            const stockMap = {}; // { id: { unidade: 'L', ... } }

            stockSnapshots.forEach(snap => {
                if (snap.exists()) {
                    stockMap[snap.id] = snap.data();
                }
            });

            // 3. Preparar Batch
            const batch = writeBatch(db);
            let operationsCount = 0;

            for (const ded of deductions) {
                const stockItem = stockMap[ded.stockId];
                if (!stockItem) {
                    console.warn(`[InventoryService] Item de estoque ${ded.stockId} não encontrado/excluído.`);
                    continue;
                }

                // Conversão
                // ded.reqQty (da receita, ex: 50) | ded.reqUnit (da receita, ex: 'ml')
                // stockItem.unidade (do estoque, ex: 'L')
                const convertedAmount = convertUnit(ded.reqQty, ded.reqUnit, stockItem.unidade);

                if (convertedAmount !== null && convertedAmount > 0) {
                    const ref = getCompanyDoc(companyId, 'estoque', ded.stockId);
                    // Decrementar (permitindo negativo)
                    batch.update(ref, {
                        quantidade: increment(-convertedAmount),
                        atualizadoEm: serverTimestamp()
                    });
                    operationsCount++;
                } else {
                    console.warn(`[InventoryService] Falha na conversão ou valor zero: ${ded.reqQty} ${ded.reqUnit} -> ${stockItem.unidade}`);
                }
            }

            if (operationsCount > 0) {
                await batch.commit();
                console.log(`[InventoryService] Baixa efetuada em ${operationsCount} itens.`);
            }

        } catch (error) {
            console.error('[InventoryService] Erro no processStockDeduction:', error);

            // Se NÃO for retry (primeira tentativa) e formos resilientes, salva na fila.
            if (!isRetry) {
                await OfflineQueueService.addTask('STOCK_DEDUCTION', {
                    companyId,
                    orderItems: orderItems // Cuidado: garantir que seja serializável limpo
                });
            } else {
                // Se já é retry, joga erro para o QueueService saber que falhou
                throw error;
            }
        }
    }
}

export default new InventoryService();
