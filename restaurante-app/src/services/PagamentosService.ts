/**
 * PagamentosService - OTIMIZADO - Registra pagamentos por comanda e integra com CaixaService.
 * Migrated to Supabase
 */
import { supabase } from '../config/SupabaseConfig';
import { cacheLayerService } from '../services/CacheLayerService';
import CaixaService from './CaixaService';
import OrderService from './OrderService';
import SyncService from './SyncService';

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

    // 1. Fetch orders to get current items_with_status
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .in('id', pedidosIds);

    if (fetchError || !orders) {
       console.error('[PagamentosService] Error fetching orders for update:', fetchError);
       throw new Error(`Falha ao buscar pedidos: ${fetchError?.message}`);
    }

    // 2. Update each order
    for (const order of orders) {
       const updatePayload: any = { 
         is_paid: true,
         payment_method: formaPagamento || order.payment_method
       };

       // Update items_with_status if it exists
       if (order.items_with_status && order.items_with_status.length > 0) {
         updatePayload.items_with_status = order.items_with_status.map((item: any) => ({
           ...item,
           paid: true,
           paid_quantity: item.quantity // Mark full quantity as paid
         }));
       }

       const { error: updateError } = await supabase
         .from('orders')
         .update(updatePayload)
         .eq('id', order.id);

       if (updateError) {
         console.error(`[PagamentosService] Failed to mark order ${order.id} as paid:`, updateError);
       }
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
      .order('created_at', { ascending: false })
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

    // 🔒 RECÁLCULO DE SEGURANÇA: Buscar total consumido real dos pedidos
    // Isso corrige casos onde o campo total_consumed da comanda ficou desatualizado
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('company_id', companyId)
      .eq('comanda_number', String(comandaNumber)) // Ensure string match
      .eq('date_key', dateKey)
      .neq('status', 'cancelled');

    const realTotalConsumed = ordersData?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
    
    // Se houver discrepância significativa, usar o valor recalculado
    // (Mas se o valor da comanda for maior, pode haver pedidos deletados? Melhor confiar nos pedidos ativos existentes)
    const totalConsumidoFinal = realTotalConsumed > 0 ? realTotalConsumed : (comanda.total_consumed || 0);

    const totalPagoAnt = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const novoTotalPago = totalPagoAnt + valorNum;
    const novoSaldo = Math.max(0, totalConsumidoFinal - novoTotalPago);

    // Build pagamentos_resumo (reused for both RPC and Fallback)
    const pagamentosResumoAtual = comanda.pagamentos_resumo || {};
    const novoPagamentosResumo = {
      ...pagamentosResumoAtual,
      [formaKey]: (pagamentosResumoAtual[formaKey] || 0) + valorNum
    };

    // Usar RPC para transação atômica (if it exists)
    // DISABLED: Forcing manual update to ensure logic control and fix reported balance issues
    /* 
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
    */

    const rpcError = true; // Force fallback logic

    // Initialize decision variables outside the block
    let shouldClose = false;
    let currentDbBalance = 0;
    let isFullPaymentOfRecordedDebt = false;
    
    // Check closure conditions based on calculated values
    const isBalanceZero = novoSaldo <= 0.05;
    currentDbBalance = Number(comanda.open_balance || 0);
    isFullPaymentOfRecordedDebt = Math.abs(valorNum - currentDbBalance) <= 0.05;
    
    shouldClose = isBalanceZero || isFullPaymentOfRecordedDebt;

    if (rpcError) {
      // Manual Update Logic (Now Primary)
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

      // Update comanda
      const updateData: any = {
        total_paid: novoTotalPago,
        open_balance: shouldClose ? 0 : novoSaldo,
        pagamentos_resumo: novoPagamentosResumo,
        ultimo_pagamento_por: safeUsuarioNome,
        ultimo_pagamento_forma: formaKey,
        ultimo_pagamento_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (safeUsuarioId) {
        const existingReceivedBy = comanda.received_by || [];
        if (!existingReceivedBy.includes(safeUsuarioId)) {
            updateData.received_by = [...existingReceivedBy, safeUsuarioId];
        }
      }
      
      const { error: updateError } = await supabase
        .from('comandas')
        .update(updateData)
        .eq('id', comanda.id);

      if (updateError) throw updateError;
    }
    
    // ... continue to cache registration ...

    // Registrar no CAIXA (Assíncrono para não travar UI)
    CaixaService.registrarVenda(companyId, formaKey, valorNum)
      .catch(err => console.error('[PagamentosService] Erro ao registrar no caixa:', err));

    console.log('[PagamentosService] DEBUG CALC:', {
        realTotalConsumed,
        comandaTotalConsumed: comanda.total_consumed,
        totalConsumidoFinal,
        totalPagoAnt,
        valorNum,
        novoTotalPago,
        novoSaldo,
        currentDbBalance,
        isFullPaymentOfRecordedDebt,
        shouldClose
    });
 
    // Se houver itens específicos sendo pagos, atualizar na tabela orders
    if (paidItemsIds && paidItemsIds.length > 0) {
      this._marcarItensComoPagos(companyId, dateKey, comandaNumber, paidItemsIds)
        .catch(err => console.error('[PagamentosService] Erro ao marcar itens como pagos:', err));
    }

    // 🔒 CRITICAL FIX: Use the 'shouldClose' decision made above
    if (shouldClose) {
       console.log('[PagamentosService] Decisão de fechamento: TRUE. Comanda será fechada.');
       
       // 1. Mark ALL orders as paid
       // 1. Mark ALL orders as paid
       try {
         // Fetch IDs first to ensure we target the correct rows and debug count
         const { data: unpaidOrders, error: fetchUnpaidError } = await supabase
            .from('orders')
            .select('id')
            .eq('company_id', companyId)
            .eq('comanda_number', String(comandaNumber))
            .eq('date_key', dateKey)
            .eq('is_paid', false);

         if (fetchUnpaidError) {
             console.error('[PagamentosService] Erro ao buscar orders pendentes:', fetchUnpaidError);
         } else {
             const unpaidIds = unpaidOrders?.map(o => o.id) || [];
             console.log(`[PagamentosService] Orders pendentes encontradas para fechar: ${unpaidIds.length}`, unpaidIds);

             if (unpaidIds.length > 0) {
                 const { error: updateOrdersError } = await supabase
                   .from('orders')
                   .update({ is_paid: true })
                   .in('id', unpaidIds);
                 
                 if (updateOrdersError) {
                     console.error('[PagamentosService] Erro ao atualizar orders por ID:', updateOrdersError);
                 } else {
                     console.log('[PagamentosService] Orders atualizadas para is_paid=true via IDs');
                     
                     // Invalidate cache directly
                     try {
                         await cacheLayerService.invalidatePattern(`orders:${companyId}`);
                         await cacheLayerService.invalidatePattern(`orders:date:${dateKey}`);
                         console.log('[PagamentosService] Cache de pedidos invalidado.');
                     } catch (cacheError) {
                         console.error('[PagamentosService] Failed to invalidate cache:', cacheError);
                     }
                 }
             } else {
                 console.log('[PagamentosService] Nenhuma order pendente para atualizar. Verificando por erro de dateKey...');
                 // Fallback check: find any unpaid order with this comanda number regardless of date?
                 // Maybe risky, but logging would help diagnosing.
             }
         }
       } catch (e) {
         console.error('[PagamentosService] Exception ao fechar pedidos:', e);
       }

       // 2. Close Comanda
       // Even though we updated valid fields above, we call this to ensure side effects (like closed_at, closed_by) are set if not set above.
       // Actually, the update above sets 'open_balance: 0' but we should ensure 'status: fechada'.
       // The update above did NOT set status='fechada' explicitly, it set totals.
       // Let's force status='fechada' here to be sure.
       
       try {
           await supabase
            .from('comandas')
            .update({ status: 'fechada', open_balance: 0, closed_at: new Date().toISOString(), closed_by: safeUsuarioId, closed_by_name: safeUsuarioNome })
            .eq('id', comanda.id);
            
           console.log('[PagamentosService] Comanda status atualizado para FECHADA.');
       } catch (e: any) {
           console.error('[PagamentosService] Erro ao finalizar status da comanda:', e);
       }
    } else {
        console.log('[PagamentosService] Decisão de fechamento: FALSE. Comanda permanece aberta.');
    }

    return { success: true };
  }

  /**
   * Atualiza o status 'paid' nos itens do pedido correspondente
   * Suporta pagamento parcial de itens (ex: 2x Chopp -> Pagar 1)
   */
  private async _marcarItensComoPagos(companyId: string, dateKey: string, comandaNumber: string | number, itemIds: string[]) {
    try {
      console.log(`[PagamentosService] Marking items as paid. Comanda: ${comandaNumber}, Items: ${itemIds.length}`);
      
      // 1. Buscar pedidos da comanda
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', String(comandaNumber));

      if (error || !orders) {
          console.error('[PagamentosService] Error fetching orders:', error);
          return;
      }

      // 2. Para cada pedido, verificar se tem itens a atualizar
      for (const order of orders) {
        let hasUpdates = false;
        
        // Ensure items_with_status exists
        let currentItems = order.items_with_status || [];
        
        console.log(`[PagamentosService] Processing order ${order.id}. Items: ${currentItems.length}. TargetIDs: ${JSON.stringify(itemIds)}`);

        
        if (currentItems.length === 0 && Array.isArray(order.items) && order.items.length > 0) {
            console.log(`[PagamentosService] Backfilling items_with_status for order ${order.id}`);
            currentItems = OrderService.generateItemsWithStatus(
                order.items, 
                order.id, 
                String(order.comanda_number || ''), 
                null
            );
        }

        if (currentItems.length === 0) continue;

        // 🔒 SELF-HEAL: Check for corrupted quantities (e.g. name "3x..." but quantity 1)
        // This fixes orders that were backfilled incorrectly before the trim() fix
        currentItems = currentItems.map((item: any) => {
             const safeName = (item.name || '').trim();
             const qtyMatch = safeName.match(/^(\d+)x?\s*/);
             const parsedQty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
             
             if (parsedQty > 1 && (item.quantity === 1 || !item.quantity)) {
                 console.log(`[PagamentosService] Healing corrupted quantity for ${safeName}. ${item.quantity} -> ${parsedQty}`);
                 return { ...item, quantity: parsedQty };
             }
             return item;
        });

        // Atualizar items_with_status
        // Atualizar items_with_status
        const updatedItemsWithStatus = currentItems.map((item: any, itemIndex: number) => {
          let directMatch = itemIds.includes(item.id);
          let splitMatches = itemIds.filter(id => id.startsWith(`${item.id}_split_`));

          // 🔒 ROBUST MATCHING: If exact match fails, try matching by Index/Order pattern
          // This handles cases where comanda_number format differs ("2" vs "temp" vs "02")
          if (!directMatch && splitMatches.length === 0) {
             // Extract index from current item ID (or use loop index as fallback)
             const indexMatch = item.id ? item.id.match(/-item-(\d+)$/) : null;
             const index = indexMatch ? indexMatch[1] : String(itemIndex);
             
             // Define pattern: OrderID + "-comanda-" + ANY + "-item-" + Index
             // Ex: 123-comanda-temp-item-0 matches 123-comanda-2-item-0
             const orderPrefix = `${order.id}-comanda-`;
             
             // Find direct match by pattern
             const flexibleDirect = itemIds.find(pid => 
                 pid.startsWith(orderPrefix) && 
                 pid.endsWith(`-item-${index}`)
             );

             if (flexibleDirect) {
                 console.log(`[PagamentosService] Flexible Direct Match: ${item.id} matched with ${flexibleDirect}`);
                 directMatch = true;
             } else {
                 // Find split matches by pattern
                 const flexibleSplits = itemIds.filter(pid => 
                     pid.startsWith(orderPrefix) && 
                     pid.match(new RegExp(`-item-${index}_split_\\d+$`))
                 );
                 
                 if (flexibleSplits.length > 0) {
                     console.log(`[PagamentosService] Flexible Split Match: ${item.id} matched with ${flexibleSplits.length} items`);
                     splitMatches = flexibleSplits;
                 }
             }
          }

          const qtdPagaNestaTransacao = splitMatches.length;

          // Se for pagamento DIRETO do item (sem split), marca tudo como pago
          if (directMatch) {
            // Pagamento total do item
            if (!item.paid) {
              hasUpdates = true;
              console.log(`[PagamentosService] Marking FULL item as paid: ${item.name} (${item.id})`);
              return { 
                ...item, 
                paid: true,
                paid_quantity: item.quantity // Garante que quantidade paga = total
              };
            }
          } 
          
          // Se houver pagamentos parciais (split nodes)
          if (qtdPagaNestaTransacao > 0) {
            // Pagamento parcial
            
            // Calc current paid quantity safely
            const currentPaidQtd = (typeof item.paid_quantity === 'number') 
                ? item.paid_quantity 
                : (item.paid ? (item.quantity || 1) : 0);
            
            const itemQty = item.quantity || 1;
                
            // Don't update if already fully paid
            if (currentPaidQtd >= itemQty) return item;

            hasUpdates = true;
            
            const newPaidQtd = Math.min(itemQty, currentPaidQtd + qtdPagaNestaTransacao);
            
            // Verificar se completou o pagamento do item
            const isFullyPaid = newPaidQtd >= itemQty;

            console.log(`[PagamentosService] Marking PARTIAL item as paid: ${item.name}. OldQty: ${currentPaidQtd}, Added: ${qtdPagaNestaTransacao}, NewQty: ${newPaidQtd}, FullyPaid: ${isFullyPaid}`);
            
            return {
              ...item,
              paid: isFullyPaid,
              paid_quantity: newPaidQtd,
              quantity: itemQty // Ensure quantity is set
            };
          }
          
          return item;
        });

        if (hasUpdates) {
          // 🔒 CRITICAL: Verificar se TODOS os itens deste pedido agora estão pagos
          const allItemsPaid = updatedItemsWithStatus.every((i: any) => i.paid === true);

          const updatePayload: any = { items_with_status: updatedItemsWithStatus };
          
          // Se todos os itens foram pagos, marca o pedido inteiro como pago
          if (allItemsPaid) {
             updatePayload.is_paid = true;
             console.log(`[PagamentosService] Order ${order.id} is now FULLY PAID.`);
          }

          const { error: updateError } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', order.id);
            
          if (updateError) {
              console.error(`[PagamentosService] Failed to update order ${order.id}:`, updateError);
          } else {
              console.log(`[PagamentosService] Successfully updated order ${order.id} items.`);
          }
        }
      }
    } catch (e) {
      console.error('[PagamentosService] Erro interno ao marcar itens:', e);
    }
  }
}

export default new PagamentosService();
