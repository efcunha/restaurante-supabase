import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import OrderService from '../services/OrderService';

import { Order, OrderItemStatus } from '../types';

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
    isPago?: boolean
  ) => string;
  editOrder: (orderId: string, updatedData: Partial<Order>) => void;
  deleteOrder: (orderId: string) => void;
  moveToMontagem: (orderId: string) => void;
  moveToProntos: (orderId: string) => void;
  markAsDelivered: (orderId: string) => void;
  getOrdersByStatus: (status: string) => Order[];
  getOrderById: (orderId: string) => Order | undefined;
}


const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderCounter, setOrderCounter] = useState<number>(1);

  // Adicionar novo pedido - usa OrderService
  const addOrder = useCallback((
    clientName: string, 
    items: string[], 
    observations: string, 
    comandaNumber: string = '', 
    createdBy: string = '', 
    createdByName: string = '', 
    totalPrice: number = 0, 
    isPago: boolean = false
  ) => {
    const orderId = OrderService.generateOrderId(orderCounter);
    const newOrder = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, totalPrice, isPago) as Order;
    
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    setOrderCounter(prev => prev + 1);
    
    return newOrder.id;
  }, [orderCounter]);

  // Editar pedido - usa OrderService com validação
  const editOrder = useCallback((orderId: string, updatedData: Partial<Order>) => {
    // Validar antes de atualizar o estado para propagar exceções sincronicamente nos testes
    const current = OrderService.findOrderById(orders, orderId);
    if (current) {
      // Pode lançar erro conforme regra de negócio
      OrderService.updateOrder(current, updatedData);
    }
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? (OrderService.updateOrder(order, updatedData) as Order) : order
      )
    );
  }, [orders]);

  // Cancelar/Excluir pedido - usa OrderService com validação
  const deleteOrder = useCallback((orderId: string) => {
    // Validar fora do setState para lançar sincronicamente
    const current = OrderService.findOrderById(orders, orderId);
    if (current) {
      OrderService.validateDelete(current); // pode lançar
    }
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
  }, [orders]);

  // Mover pedido para montagem - usa OrderService
  const moveToMontagem = useCallback((orderId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? (OrderService.updateOrderStatus(order, 'montagem') as Order)
          : order
      )
    );
  }, []);

  // Mover pedido para prontos - usa OrderService
  const moveToProntos = useCallback((orderId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? (OrderService.updateOrderStatus(order, 'pronto') as Order)
          : order
      )
    );
  }, []);

  // Marcar pedido como entregue - mantém no histórico em memória
  const markAsDelivered = useCallback((orderId: string) => {
    setOrders(prevOrders => prevOrders.map(order =>
      order.id === orderId
        ? (OrderService.updateOrderStatus(order, 'delivered') as Order)
        : order
    ));
  }, []);

  // Obter pedidos por status - usa OrderService
  const getOrdersByStatus = useCallback((status: string) => {
    return OrderService.filterOrdersByStatus(orders, status);
  }, [orders]);

  // Obter pedido por ID - usa OrderService
  const getOrderById = useCallback((orderId: string) => {
    return OrderService.findOrderById(orders, orderId);
  }, [orders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        editOrder,
        deleteOrder,
        moveToMontagem,
        moveToProntos,
        markAsDelivered,
        getOrdersByStatus,
        getOrderById,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
