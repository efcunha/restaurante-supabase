/**
 * PagamentosService - OTIMIZADO - Registra pagamentos por comanda e integra com CaixaService.
 * Migrated to Supabase
 */
import { supabase } from '../config/SupabaseConfig';
import CaixaService from './CaixaService';
import SyncService from './SyncService';
import { Comanda } from '../types';

interface PagamentoData {
  companyId: string;
  dateKey: string;
  comandaNumber: string | number;
  forma: string;
  valor: number | string;
  usuarioId: string;
  usuarioNome: string;
  paidItemsIds?: string[]; // IDs dos itens sendo pagos nessa transação
}

class PagamentosService {
  /**
   * 🔒 ÚNICA FUNÇÃO AUTORIZADA A MARCAR PEDIDOS COMO PAGOS
   * @param {string} companyId - ID da empresa
   * @param {Array<string>} pedidosIds - IDs dos pedidos (#001, #002, etc)
   * @param {string} formaPagamento - Forma de pagamento usada
   * 
   * OPTIMIZED: Refactored to avoid N+1 query pattern
   * Requirement 1.3: Use batch operations instead of loops
   */
  async marcarPedidosComoPagos(companyId: string, pedidosIds: string[], formaPagamento: string | null = null) {
    if (!companyId) throw new Error('Company ID required');
    if (!Array.isArray(pedidosIds) || pedidosIds.length === 0) {
      throw new Error('Lista de pedidos inválida');
    }

    // OPTIMIZATION: Use single batch update instead of N queries
    // This eliminates the N+1 pattern where we were doing:
    // 1. SELECT for each order ID (N queries)
    // 2. UPDATE for each order ID (N queries)
    // Now we do: 1 UPDATE query for all orders
    
    const updateData: any = { is_paid: true };
    if (formaPagamento) {
      updateData.payment_method = formaPagamento;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('company_id', companyId)
      .in('id', pedidosIds);

    if (error) {
      console.error('[PagamentosService] Error updating orders:', error);
      throw new Error(`Failed to mark orders as paid: ${error.message}`);
    }
  }

  async registrarPagamento({ companyId, dateKey, comandaNumber, forma, valor, usuarioId, usuarioNome, paidItemsIds }: PagamentoData) {
    if (!companyId) throw new Error('Company ID required');
    const safeUsuarioNome = usuarioNome || 'Sistema';
    const safeUsuarioId = usuarioId || null; // ✅ NULL instead of 'system' for UUID field
    
    // 🔒 SEGURANÇA: Validação RIGOROSA de valor
    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(valorNum) || valorNum <= 0) {
      throw new Error('Valor inválido. Informe um valor maior que zero.');
    }
    
    // Normalize payment method (remove accents and convert to lowercase)
    let formaKey = (forma || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
    // Map variations to standard values
    const formaMap: Record<string, string> = {
      'debito': 'debito',
      'credito': 'credito',
      'dinheiro': 'dinheiro',
      'pix': 'pix',
      'cartao_debito': 'debito',
      'cartao_credito': 'credito',
      'cartão_débito': 'debito',
      'cartão_crédito': 'credito'
    };
    
    formaKey = formaMap[formaKey] || formaKey;
    
    const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
    if (!formasValidas.includes(formaKey)) {
      throw new Error('Forma de pagamento inválida');
    }

    // Se offline, adicionar à fila e retornar sucesso
    if (!SyncService.getIsConnected()) {
      SyncService.addToQueue('ADD_PAYMENT_TRANSACTION', {
        companyId, dateKey, comandaNumber, forma, valor, usuarioId, usuarioNome, paidItemsIds
      });
      return { success: true };
    }

    // Buscar comanda
    const { data: comandas, error: findError } = await supabase
      .from('comandas')
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateKey)
      .eq('comanda_number', comandaNumber)
      .limit(1)
      .single();

    if (findError || !comandas) {
      console.error('[PagamentosService] Comanda lookup failed:', {
        companyId,
        dateKey,
        comandaNumber,
        findError: findError?.message,
        hasData: !!comandas
      });
      throw new Error(`Comanda não encontrada: ${findError?.message || 'no data'}`);
    }

    const comanda = comandas as any;

    // 🔒 CRITICAL FIX: Always recalculate total_paid from actual payments table
    // This ensures accuracy even if the comanda.total_paid field was corrupted
    const { data: existingPayments } = await supabase
      .from('pagamentos')
      .select('amount')
      .eq('company_id', companyId)
      .eq('comanda_number', String(comandaNumber))
      .eq('date_key', dateKey);

    const totalPagoAnt = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const novoTotalPago = totalPagoAnt + valorNum;
    const novoSaldo = Math.max(0, (comanda.total_consumed || 0) - novoTotalPago); // ✅ Supabase field name

    // Build pagamentos_resumo (reused for both RPC and Fallback)
    const pagamentosResumoAtual = comanda.pagamentos_resumo || {};
    const novoPagamentosResumo = {
      ...pagamentosResumoAtual,
      [formaKey]: (pagamentosResumoAtual[formaKey] || 0) + valorNum
    };

    // Usar RPC para transação atômica (if it exists)
    const { data: result, error: rpcError } = await supabase.rpc('registrar_pagamento_comanda', {
      p_company_id: companyId,
      p_comanda_id: comanda.id,
      p_comanda_number: String(comandaNumber),
      p_date_key: dateKey,
      p_valor: valorNum,
      p_forma: formaKey,
      p_usuario_id: safeUsuarioId,
      p_usuario_nome: safeUsuarioNome,
      p_total_pago: novoTotalPago,
      p_saldo_aberto: novoSaldo,
      p_pagamentos_resumo: novoPagamentosResumo,
      p_garcom: comanda.opened_by || null,
      p_garcom_nome: comanda.opened_by_name || null,
    });

    if (rpcError) {
      // Fallback: fazer update manual se RPC não existir
      console.warn('[PagamentosService] RPC error (falling back to manual):', rpcError);
      
      // First, insert the new payment
      const { error: insertError } = await supabase
        .from('pagamentos')
        .insert({
          company_id: companyId,
          comanda_number: String(comandaNumber),
          date_key: dateKey,
          amount: valorNum,
          payment_method: formaKey,
          received_by: safeUsuarioId,
          received_by_name: safeUsuarioNome,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Note: pagamentos_resumo is already calculated above (novoPagamentosResumo)


      // Then update comanda with the new totals and payment info
      const updateData: any = {
        total_paid: novoTotalPago,
        open_balance: novoSaldo,
        pagamentos_resumo: novoPagamentosResumo,
        ultimo_pagamento_por: safeUsuarioNome,
        ultimo_pagamento_forma: formaKey,
        ultimo_pagamento_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Only add to received_by array if we have a valid user ID
      if (safeUsuarioId) {
        updateData.received_by = [...(comanda.received_by || []), safeUsuarioId];
      }
      
      const { error: updateError } = await supabase
        .from('comandas')
        .update(updateData)
        .eq('company_id', companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', String(comandaNumber));

      if (updateError) throw updateError;
    }

    // Registrar no CAIXA (Assíncrono para não travar UI)
    CaixaService.registrarVenda(companyId, formaKey, valorNum)
      .catch(err => console.error('[PagamentosService] Erro ao registrar no caixa:', err));

    // Se houver itens específicos sendo pagos, atualizar na tabela orders
    if (paidItemsIds && paidItemsIds.length > 0) {
      this._marcarItensComoPagos(companyId, dateKey, comandaNumber, paidItemsIds)
        .catch(err => console.error('[PagamentosService] Erro ao marcar itens como pagos:', err));
    }

    return { success: true };
  }

  /**
   * Atualiza o status 'paid' nos itens do pedido correspondente
   */
  /**
   * Atualiza o status 'paid' nos itens do pedido correspondente
   * Suporta pagamento parcial de itens (ex: 2x Chopp -> Pagar 1)
   */
  private async _marcarItensComoPagos(companyId: string, dateKey: string, comandaNumber: string | number, itemIds: string[]) {
    try {
      // 1. Buscar pedidos da comanda
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', String(comandaNumber));

      if (error || !orders) return;

      // 2. Para cada pedido, verificar se tem itens a atualizar
      for (const order of orders) {
        let hasUpdates = false;
        
        // Atualizar items_with_status
        const updatedItemsWithStatus = (order.items_with_status || []).map((item: any) => {
          // Verificar se este item foi alvo de pagamento direto (ID exato)
          const directMatch = itemIds.includes(item.id);
          
          // Verificar se foi alvo de pagamento parcial (ID com sufixo _split_)
          // Formato esperado do ID parcial: "{itemId}_split_{index}"
          const splitMatches = itemIds.filter(id => id.startsWith(`${item.id}_split_`));
          const qtdPagaNestaTransacao = splitMatches.length;

          if (directMatch) {
            // Pagamento total do item (legado ou seleção completa)
            if (!item.paid) {
              hasUpdates = true;
              return { 
                ...item, 
                paid: true,
                paid_quantity: item.quantity // Garante que quantidade paga = total
              };
            }
          } else if (qtdPagaNestaTransacao > 0) {
            // Pagamento parcial
            hasUpdates = true;
            
            // Calcular nova quantidade paga
            const currentPaidQtd = item.paid_quantity || (item.paid ? item.quantity : 0);
            const newPaidQtd = Math.min(item.quantity, currentPaidQtd + qtdPagaNestaTransacao);
            
            // Verificar se completou o pagamento do item
            const isFullyPaid = newPaidQtd >= item.quantity;
            
            return {
              ...item,
              paid: isFullyPaid,
              paid_quantity: newPaidQtd
            };
          }
          
          return item;
        });

        if (hasUpdates) {
          await supabase
            .from('orders')
            .update({ items_with_status: updatedItemsWithStatus })
            .eq('id', order.id);
        }
      }
    } catch (e) {
      console.error('[PagamentosService] Erro interno ao marcar itens:', e);
    }
  }
}

export default new PagamentosService();
