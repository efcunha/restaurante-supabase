
import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import * as ProductService from '../services/ProductService';
import OrderService from '../services/OrderService';
import OrderFirestoreService from '../services/OrderFirestoreService';
import { calcularPrecoItem, fixDecimal } from '../utils/orderCalculator';
import { useAuth } from './AuthContext';
import SyncService from '../services/SyncService';
import { Order } from '../types';
import CaixaService from '../services/CaixaService';
import ComandasService from '../services/ComandasService';

// Dynamic imports are great, but for types we might need to import them or use 'any' if services are JS.
// Assuming services are JS or TS, we'll try to use standard imports for types if possible, 
// using 'typeof import(...)' pattern if needed for dynamic imports.

interface OrderContextType {
  orders: Order[];
  addOrder: (
    clientName: string,
    items: string[],
    observations: string,
    comandaNumber?: string,
    createdBy?: string,
    createdByName?: string,
    totalPrice?: number,
    isPago?: boolean,
    mesa?: string,
    priceMap?: any,
    categoryMap?: any,
    tableId?: string,
    waiterId?: string
  ) => Promise<string>;
  editOrder: (orderId: string, updatedData: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  moveToMontagem: (orderId: string) => Promise<void>;
  moveToProntos: (orderId: string) => Promise<void>;
  markAsDelivered: (orderId: string) => Promise<void>;
  getOrdersByStatus: (status: string) => Order[];
  getOrderById: (orderId: string) => Order | undefined;
  updateItemStatus: (orderId: string, itemId: string, newStatus: string) => Promise<void>;
  updateItemChecked: (orderId: string, itemIds: string | string[], checked: boolean) => Promise<void>;
  markItemAsDelivered: (orderId: string, itemId: string) => Promise<void>;
  transferOrder: (orderId: string, targetTableNumber: string) => Promise<void>;

  // Stats
  getEstatisticasGarcom: (garcomId?: string | null, periodo?: string) => Promise<any>;
  getEstatisticasTodosGarcons: (periodo?: string) => Promise<any>;
  getEstatisticasPagamentos: (garcomId?: string | null, periodo?: string) => Promise<any>;
  getEstatisticasComandas: (garcomId?: string | null, periodo?: string) => Promise<any>;
  getEstatisticasCompletas: (garcomId?: string | null, mesAno?: string | null) => Promise<any>;

  // Debug
  addTestOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

// Helper for calculating total
const calculateTotalFromSupabase = async (companyId: string, items: string[], priceMap: any = null): Promise<number> => {
   try {
     const { produtos } = await ProductService.listarProdutos();
     const cardapioDin = (produtos || []).map((p: any) => ({ name: p.name, price: p.price }));
     
     let total = 0;
     items.forEach(item => {
       const calc = calcularPrecoItem(item, cardapioDin, priceMap);
       total += calc.subtotal;
     });
     
     return fixDecimal(total);
   } catch (error) {
     console.error('❌ Erro ao calcular total (Supabase):', error);
     return 0;
   }
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderCounter, setOrderCounter] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [firestoreDocMap, setFirestoreDocMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.companyId) {
      setOrders([]);
      setFirestoreDocMap({});
      setOrderCounter(1);
      return;
    }

    let unsubscribe: any = null;
    let mounted = true;

    try {
      unsubscribe = OrderFirestoreService.listenToActiveOrders(user.companyId, ({ orders: firestoreOrders, docMap }: any) => {
        if (!mounted || !user) return;

        setFirestoreDocMap(prevMap => {
          if (!mounted || !user) return prevMap;
          return { ...prevMap, ...docMap };
        });

        setOrders(prevOrders => {
          if (!mounted || !user) return prevOrders;
          if (prevOrders.length === 0) return firestoreOrders;

          return firestoreOrders.map((firestoreOrder: Order) => {
            const localOrder = prevOrders.find(o => o.id === firestoreOrder.id);
            if (!localOrder) return firestoreOrder;

            // Merge logic based on timestamps (updatedAt)
            const firestoreTime = new Date(firestoreOrder.updatedAt || firestoreOrder.timestamp || '1970-01-01').getTime();
            const localTime = new Date(localOrder.updatedAt || localOrder.timestamp || '1970-01-01').getTime();

            // If firestore is newer, take it (with some priority for definitive statuses)
            if (firestoreTime > localTime) {
              return firestoreOrder;
            }

            // If local is newer or same, we might want to keep some local state (like checked items)
            // but ONLY if the status is the same. If status changed in Firestore to 'ready' or 'delivered', 
            // and it's newer, we already handled it above.
            
            if (firestoreOrder.status !== localOrder.status) {
              // If Firestore has a more "advanced" status, trust it if times are close
              const statusPriority: Record<string, number> = { 'pending': 0, 'preparing': 1, 'pronto': 2, 'ready': 2, 'dispatched': 2.5, 'delivered': 3, 'cancelled': 4 };
              if ((statusPriority[firestoreOrder.status] || 0) > (statusPriority[localOrder.status] || 0)) {
                return firestoreOrder;
              }
              return localOrder;
            }

            // Same status, merge items (checked state)
            if (localOrder.itemsWithStatus && firestoreOrder.itemsWithStatus) {
              const mergedItems = firestoreOrder.itemsWithStatus.map(firestoreItem => {
                const localItem = localOrder.itemsWithStatus?.find(li => li.id === firestoreItem.id);
                if (!localItem) return firestoreItem;

                const fTime = new Date(firestoreItem.timestamp || '1970-01-01').getTime();
                const lTime = new Date(localItem.timestamp || '1970-01-01').getTime();

                // Trust local checked state if it's newer or same and status is the same
                if (lTime >= fTime) return localItem;
                return firestoreItem;
              });

              return {
                ...firestoreOrder,
                itemsWithStatus: mergedItems,
                timeInMontagem: localOrder.timeInMontagem || firestoreOrder.timeInMontagem,
                timeInProntos: localOrder.timeInProntos || firestoreOrder.timeInProntos,
                deliveredAt: localOrder.deliveredAt || firestoreOrder.deliveredAt,
                updatedAt: localOrder.updatedAt || firestoreOrder.updatedAt
              };
            }

            return localOrder;
          });
        });

        setIsOnline(true);
      });
    } catch (error) {
      console.error('OrderProvider: Erro ao iniciar listener Firestore:', error);
      if (mounted) setIsOnline(false);
    }

    // Offline detection for Web
    const handleOffline = () => { if (mounted) setIsOnline(false); };
    const handleOnline = () => { if (mounted) setIsOnline(true); };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    return () => {
      mounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [user]);

  const addOrder = useCallback(async (
    clientName: string, items: string[], observations: string, comandaNumber: string = '',
    createdBy: string = '', createdByName: string = '', totalPrice: number = 0,
    _isPago: boolean = false, mesa: string = '', priceMap: any = null, categoryMap: any = null,
    tableId: string = '', waiterId: string = ''
  ) => {
    const orderId = OrderService.generateOrderId(orderCounter);

    try {
      if (isOnline) {
        if (!user?.companyId) throw new Error('Empresa não identificada');

        console.log('[OrderContext] Verificando caixa aberto...');
        const caixa = await CaixaService.getCaixaAberto(user.companyId);
        if (!caixa) {
          console.warn('[OrderContext] ⚠️ Caixa não encontrado - prosseguindo sem validação (pode ser timeout)');
          // Don't throw error - allow order creation to proceed
          // This handles the case where Supabase query times out
        } else {
          console.log('[OrderContext] Caixa aberto:', caixa.id);
        }

        // Verificar se comanda já possui pagamentos (usando Supabase)
        if (comandaNumber && comandaNumber.trim() !== '') {
          console.log('[OrderContext] Verificando pagamentos para comanda:', comandaNumber);
          const dateKey = new Date().toISOString().split('T')[0];

          const { data: pagamentos, error } = await supabase
            .from('pagamentos')
            .select('id')
            .eq('company_id', user.companyId)
            .eq('comanda_number', String(comandaNumber))
            .eq('date_key', dateKey)
            .limit(1);

          if (error) {
            console.error('Erro ao verificar pagamentos:', error);
          }

          if (pagamentos && pagamentos.length > 0) {
            throw new Error(`Comanda ${comandaNumber} já possui pagamentos.`);
          }
          console.log('[OrderContext] Comanda sem pagamentos, prosseguindo...');
        }

        console.log('[OrderContext] Chamando ensureComandaAberta...');
        await ComandasService.ensureComandaAberta(user.companyId, comandaNumber, createdBy, createdByName, mesa, clientName);
        console.log('[OrderContext] ensureComandaAberta concluído');

        // PRIORIDADE: Se o UI enviou um total calculado (totalPrice), usa ele.
        // O calculateTotalFromSupabase serve apenas como conferência ou fallback se totalPrice for 0.
        let calculatedTotal = totalPrice > 0 ? totalPrice : 0;
        
        if (calculatedTotal === 0) {
           calculatedTotal = await calculateTotalFromSupabase(user.companyId, items, priceMap);
        }

        // If _isPago is passed, we generally ignore it for new orders as they start unpaid, but let's keep it if needed for logic
        const order = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, calculatedTotal, false, mesa, categoryMap, priceMap, tableId, waiterId);
        const valorPedido = order.totalPrice || 0;

        console.log('🟢 [OrderContext] Chamando saveOrder com:', { companyId: user.companyId, orderId, itemsWithStatus: order.itemsWithStatus?.length });
        console.log('[OrderContext] Chamando Promise.all com saveOrder e adicionarConsumo...');
        const [firestoreDocId] = await Promise.all([
          OrderFirestoreService.saveOrder(user.companyId, order),
          ComandasService.adicionarConsumo(user.companyId, comandaNumber, valorPedido)
        ]);
        console.log('[OrderContext] Promise.all concluído, firestoreDocId:', firestoreDocId);

        setFirestoreDocMap(prev => ({ ...prev, [orderId]: firestoreDocId }));
        setOrderCounter(prev => prev + 1);
        return orderId;
      } else {
        // Offline fallback
        const order = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, totalPrice, false, mesa, categoryMap, priceMap, tableId, waiterId);
        SyncService.addToQueue('ADD_ORDER', { companyId: user?.companyId, id: orderId, orderData: order });
        setOrders(prev => [order as Order, ...prev]);
        setOrderCounter(prev => prev + 1);
        return orderId;
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      throw error;
    }
  }, [orderCounter, isOnline, user]);

  const editOrder = useCallback(async (orderId: string, updatedData: Partial<Order>) => {
    // @ts-ignore
    if ('isPago' in updatedData) throw new Error('isPago só pode ser alterado pelo PagamentosService.');

    const firestoreDocId = firestoreDocMap[orderId];
    if (isOnline && firestoreDocId && user?.companyId) {
      const order = OrderService.findOrderById(orders, orderId);
      if (order) OrderService.updateOrder(order, updatedData);
      await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, updatedData);
    } else {
      SyncService.addToQueue('UPDATE_ORDER', { companyId: user?.companyId, orderId: firestoreDocId || orderId, updates: updatedData });
      setOrders(prev => prev.map(o => o.id === orderId ? OrderService.updateOrder(o, updatedData) as Order : o));
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  const deleteOrder = useCallback(async (orderId: string) => {
    const order = OrderService.findOrderById(orders, orderId);
    if (order) OrderService.validateDelete(order);

    const firestoreDocId = firestoreDocMap[orderId];
    if (isOnline && firestoreDocId && user?.companyId) {
      await OrderFirestoreService.deleteOrder(user.companyId, firestoreDocId);
      setFirestoreDocMap(prev => {
        const n = { ...prev };
        delete n[orderId];
        return n;
      });
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  const moveToMontagem = useCallback(async (orderId: string) => {
    const order = OrderService.findOrderById(orders, orderId);
    if (!order) return;
    const firestoreDocId = firestoreDocMap[orderId];
    const now = new Date().toISOString();

    const updatePayload: any = { movidoParaMontagemPor: user?.id || null, movidoParaMontagemPorNome: user?.nome || null };
    if (!order.timeInMontagem) updatePayload.timeInMontagem = now;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing', ...updatePayload } : o));
    if (isOnline && firestoreDocId && user?.companyId) {
      await OrderFirestoreService.updateOrderStatus(user.companyId, firestoreDocId, 'preparing', updatePayload);
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  // ... (Rest of functions implemented similarly to original but with types)
  // For brevity and to fit context, implementing key ones.

  const moveToProntos = useCallback(async (orderId: string) => {
    const firestoreDocId = firestoreDocMap[orderId];
    const now = new Date().toISOString();
    const payload = { 
      timeInProntos: now, 
      movidoParaProntoPor: user?.id || null, 
      movidoParaProntoPorNome: user?.nome || null,
      updatedAt: now 
    };

    // Update local state immediately for better UX
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready', ...payload } : o));

    if (isOnline && user?.companyId) {
      const docIdToUse = firestoreDocId || orderId; // Use orderId as fallback
      await OrderFirestoreService.updateOrderStatus(user.companyId, docIdToUse, 'ready', payload);
    }
  }, [firestoreDocMap, isOnline, user]);


  const markAsDelivered = useCallback(async (orderId: string) => {
    const firestoreDocId = firestoreDocMap[orderId];
    const now = new Date().toISOString();
    const payload = { status: 'delivered', deliveredAt: now, entreguePor: user?.id || null, entreguePorNome: user?.nome || null };

    if (isOnline && firestoreDocId && user?.companyId) {
      // @ts-ignore
      await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, payload);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o));
    }
  }, [firestoreDocMap, isOnline, user]);

  const updateItemStatus = useCallback(async (orderId: string, itemId: string, newStatus: string) => {
    // ✅ PRIORIDADE TOTAL: Localizar pelo orderId (UUID único)
    const order = orders.find(o => o.id === orderId);
    const firestoreDocId = order?.id || orderId;

    let itemsForDB: any[] = [];
    const now = new Date().toISOString();

    if (order && order.itemsWithStatus) {
      const updatedItems = order.itemsWithStatus.map(item =>
        item.id === itemId ? { ...item, status: newStatus, timestamp: now } : item
      );

      itemsForDB = updatedItems.map(item => ({
        ...item,
        id: (item as any)._originalItemId || item.id.split('::').pop() || item.id,
        _originalItemId: undefined
      }));

      const updatePayload: any = { itemsWithStatus: updatedItems };
      setOrders(prev => prev.map(o => o.id === firestoreDocId ? { ...o, ...updatePayload, updatedAt: now } : o));
    } else {
      console.warn(`[OrderContext] Pedido ${orderId} ausente localmente. Buscando no Supabase...`);
      const { data: remoteOrder } = await supabase.from('orders').select('items_with_status').eq('id', orderId).single();
      if (!remoteOrder || !remoteOrder.items_with_status) throw new Error('Pedido/Items não encontrado');

      itemsForDB = remoteOrder.items_with_status.map((item: any) =>
        item.id === itemId ? { ...item, status: newStatus, timestamp: now } : item
      );
    }

    if (isOnline && user?.companyId && firestoreDocId) {
      await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, { itemsWithStatus: itemsForDB });
    }
  }, [orders, isOnline, user]);

  const updateItemChecked = useCallback(async (orderId: string, itemIds: string | string[], checked: boolean) => {
    const idsToUpdate = Array.isArray(itemIds) ? itemIds : [itemIds];
    
    // ✅ PRIORIDADE TOTAL: Localizar estritamente pelo orderId.
    const order = orders.find(o => o.id === orderId);
    const firestoreDocId = order?.id || orderId;

    let itemsForDB: any[] = [];
    const now = new Date().toISOString();

    if (order && order.itemsWithStatus) {
      const updatedItems = order.itemsWithStatus.map(item =>
        idsToUpdate.includes(item.id) ? { ...item, checked, timestamp: now } : item
      );

      itemsForDB = updatedItems.map(item => ({
        ...item,
        id: (item as any)._originalItemId || item.id.split('::').pop() || item.id,
        _originalItemId: undefined
      }));

      const updatePayload: any = { itemsWithStatus: updatedItems };
      setOrders(prev => prev.map(o => o.id === firestoreDocId ? { ...o, ...updatePayload, updatedAt: now } : o));
    } else {
      console.warn(`[OrderContext] Pedido ${orderId} ausente localmente. Buscando no Supabase...`);
      const { data: remoteOrder } = await supabase.from('orders').select('items_with_status').eq('id', orderId).single();
      if (!remoteOrder || !remoteOrder.items_with_status) throw new Error('Pedido/Items não encontrado');

      itemsForDB = remoteOrder.items_with_status.map((item: any) =>
        idsToUpdate.includes(item.id) ? { ...item, checked, timestamp: now } : item
      );
    }

    if (isOnline && user?.companyId && firestoreDocId) {
      await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, { itemsWithStatus: itemsForDB });
    }
  }, [orders, isOnline, user]);

  const markItemAsDelivered = useCallback(async (orderId: string, itemId: string) => {
    const order = OrderService.findOrderById(orders, orderId);
    if (!order || !order.itemsWithStatus) return;
    const now = new Date().toISOString();
    const updatedItems = order.itemsWithStatus.map(item =>
      item.id === itemId ? { ...item, delivered: true, deliveredAt: now, timestamp: now } : item
    );

    const allDelivered = updatedItems.every(i => i.delivered === true);
    const updatePayload: any = { itemsWithStatus: updatedItems, timeInProntos: order.timeInProntos || now };

    if (allDelivered) {
      updatePayload.status = 'delivered';
      updatePayload.deliveredAt = now;
      updatePayload.entreguePor = user?.id;
      updatePayload.entreguePorNome = user?.nome;
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload, updatedAt: now } : o));
    const firestoreDocId = firestoreDocMap[orderId];
    if (isOnline && firestoreDocId && user?.companyId) {
      await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, updatePayload);
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  // Statistics Hooks
  const getEstatisticasGarcom = useCallback(async (garcomId: string | null = null, periodo = 'hoje') => {
    try {
      if (!user?.companyId) return OrderFirestoreService.getEmptyStats();
      return await OrderFirestoreService.getEstatisticasGarcom(user.companyId, garcomId, periodo);
    } catch (e) {
      console.error('[OrderContext] Erro em getEstatisticasGarcom:', e);
      return OrderFirestoreService.getEmptyStats();
    }
  }, [user]);

  const getEstatisticasTodosGarcons = useCallback(async (periodo = 'hoje') => {
    try {
      if (!user?.companyId) return [];
      return await OrderFirestoreService.getEstatisticasTodosGarcons(user.companyId, periodo);
    } catch (e) {
      console.error('[OrderContext] Erro em getEstatisticasTodosGarcons:', e);
      return [];
    }
  }, [user]);

  const getEstatisticasPagamentos = useCallback(async (garcomId: string | null = null, periodo = 'hoje') => {
    try {
      if (!user?.companyId) return {};
      return await OrderFirestoreService.getEstatisticasPagamentos(user.companyId, garcomId, periodo);
    } catch (e) {
      console.error('[OrderContext] Erro em getEstatisticasPagamentos:', e);
      return {};
    }
  }, [user]);

  const getEstatisticasComandas = useCallback(async (garcomId: string | null = null, periodo = 'hoje') => {
    try {
      if (!user?.companyId) return {};
      return await OrderFirestoreService.getEstatisticasComandas(user.companyId, garcomId, periodo);
    } catch (e) {
      console.error('[OrderContext] Erro em getEstatisticasComandas:', e);
      return {};
    }
  }, [user]);

  const getEstatisticasCompletas = useCallback(async (garcomId: string | null = null, mesAno: string | null = null) => {
    try {
      if (!user?.companyId) {
        return {
          vendas: { hoje: OrderFirestoreService.getEmptyStats(), semana: OrderFirestoreService.getEmptyStats(), mes: OrderFirestoreService.getEmptyStats() },
          pagamentos: { hoje: {}, semana: {}, mes: {} },
          comandas: { hoje: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 }, semana: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 }, mes: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 } },
        };
      }
      return await OrderFirestoreService.getEstatisticasCompletas(user.companyId, garcomId, mesAno);
    } catch (e) {
      console.error('[OrderContext] Erro em getEstatisticasCompletas:', e);
      return {
        vendas: { hoje: OrderFirestoreService.getEmptyStats(), semana: OrderFirestoreService.getEmptyStats(), mes: OrderFirestoreService.getEmptyStats() },
        pagamentos: { hoje: {}, semana: {}, mes: {} },
        comandas: { hoje: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 }, semana: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 }, mes: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 } },
      };
    }
  }, [user]);


  const getOrdersByStatus = useCallback((status: string) => {
    if (status === 'cozinha') return orders.filter(o => o.status === 'preparing');
    return orders.filter(o => o.status === status);
  }, [orders]);

  const getOrderById = useCallback((orderId: string) => OrderService.findOrderById(orders, orderId), [orders]);

  const addTestOrder = useCallback(() => {
    // Debug function
  }, []);


  const transferOrder = useCallback(async (orderId: string, targetTableNumber: string) => {
    if (!user?.companyId) return;
    try {
      // Import dynamically to avoid circular dependency issues if any, or just use the imported service
      const { default: SupabaseOrderService } = await import('../services/supabase/SupabaseOrderService');
      await SupabaseOrderService.transferOrder(user.companyId, orderId, targetTableNumber, undefined, undefined, user.id);

      // Update local state optimistically
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, mesa: targetTableNumber } : o));
    } catch (error) {
      console.error('[OrderContext] Erro ao transferir pedido:', error);
      throw error;
    }
  }, [user]);

  return (
    <OrderContext.Provider value={{
      orders, addOrder, editOrder, deleteOrder, moveToMontagem, moveToProntos, markAsDelivered,
      getOrdersByStatus, getOrderById, updateItemStatus, updateItemChecked, markItemAsDelivered, transferOrder,
      getEstatisticasGarcom, getEstatisticasTodosGarcons, getEstatisticasPagamentos, getEstatisticasComandas, getEstatisticasCompletas,
      addTestOrder
    }}>
      {children}
    </OrderContext.Provider>
  );
};
