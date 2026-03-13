/**
 * useOrderOperations.ts
 * Custom hook for order operations with UI feedback
 * 
 * Requirements: 23.5
 */

import { useOrders } from '../context/OrderContext';
import { useToast } from '../context/ToastContext';
import type { Order } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface OrderOperations {
  createOrder: (
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
    categoryMap?: any
  ) => Promise<string>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  moveToMontagem: (orderId: string) => Promise<void>;
  moveToProntos: (orderId: string) => Promise<void>;
  markAsDelivered: (orderId: string) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for order operations with toast notifications
 */
export const useOrderOperations = (): OrderOperations => {
  const {
    addOrder,
    editOrder,
    deleteOrder,
    moveToMontagem: moveToMontagemBase,
    moveToProntos: moveToProntosBase,
    markAsDelivered: markAsDeliveredBase
  } = useOrders();
  
  const { showToast } = useToast();

  const createOrder = async (
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
    categoryMap?: any
  ): Promise<string> => {
    try {
      const orderId = await addOrder(
        clientName,
        items,
        observations,
        comandaNumber,
        createdBy,
        createdByName,
        totalPrice,
        isPago,
        mesa,
        priceMap,
        categoryMap
      );
      showToast('Pedido criado com sucesso', 'success');
      return orderId;
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao criar pedido', 'error');
      throw error;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
    try {
      await editOrder(orderId, updates);
      showToast('Pedido atualizado com sucesso', 'success');
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao atualizar pedido', 'error');
      throw error;
    }
  };

  const removeOrder = async (orderId: string): Promise<void> => {
    try {
      await deleteOrder(orderId);
      showToast('Pedido excluído com sucesso', 'success');
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao excluir pedido', 'error');
      throw error;
    }
  };

  const moveToMontagem = async (orderId: string): Promise<void> => {
    try {
      await moveToMontagemBase(orderId);
      showToast('Pedido movido para montagem', 'success');
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao mover pedido', 'error');
      throw error;
    }
  };

  const moveToProntos = async (orderId: string): Promise<void> => {
    try {
      await moveToProntosBase(orderId);
      showToast('Pedido marcado como pronto', 'success');
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao marcar pedido como pronto', 'error');
      throw error;
    }
  };

  const markAsDelivered = async (orderId: string): Promise<void> => {
    try {
      await markAsDeliveredBase(orderId);
      showToast('Pedido entregue', 'success');
    } catch (error) {
      const err = error as Error;
      showToast(err.message || 'Erro ao marcar pedido como entregue', 'error');
      throw error;
    }
  };

  return {
    createOrder,
    updateOrder,
    removeOrder,
    moveToMontagem,
    moveToProntos,
    markAsDelivered
  };
};

export default useOrderOperations;
