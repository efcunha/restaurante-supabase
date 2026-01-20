import React, { createContext, useState, useContext, useCallback } from 'react';
import OrderService from '../services/OrderService';

const OrderContext = createContext();

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [orderCounter, setOrderCounter] = useState(1);

  // Adicionar novo pedido - usa OrderService
  const addOrder = useCallback((clientName, items, observations, comandaNumber = '', createdBy = '', createdByName = '', totalPrice = 0, isPago = false) => {
    const orderId = OrderService.generateOrderId(orderCounter);
    const newOrder = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, totalPrice, isPago);
    
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    setOrderCounter(prev => prev + 1);
    
    return newOrder.id;
  }, [orderCounter]);

  // Editar pedido - usa OrderService com validação
  const editOrder = useCallback((orderId, updatedData) => {
    // Validar antes de atualizar o estado para propagar exceções sincronicamente nos testes
    const current = OrderService.findOrderById(orders, orderId);
    if (current) {
      // Pode lançar erro conforme regra de negócio
      OrderService.updateOrder(current, updatedData);
    }
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? OrderService.updateOrder(order, updatedData) : order
      )
    );
  }, [orders]);

  // Cancelar/Excluir pedido - usa OrderService com validação
  const deleteOrder = useCallback((orderId) => {
    // Validar fora do setState para lançar sincronicamente
    const current = OrderService.findOrderById(orders, orderId);
    if (current) {
      OrderService.validateDelete(current); // pode lançar
    }
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
  }, [orders]);

  // Mover pedido para montagem - usa OrderService
  const moveToMontagem = useCallback((orderId) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? OrderService.updateOrderStatus(order, 'montagem')
          : order
      )
    );
  }, []);

  // Mover pedido para prontos - usa OrderService
  const moveToProntos = useCallback((orderId) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? OrderService.updateOrderStatus(order, 'pronto')
          : order
      )
    );
  }, []);

  // Marcar pedido como entregue - mantém no histórico em memória
  const markAsDelivered = useCallback((orderId) => {
    setOrders(prevOrders => prevOrders.map(order =>
      order.id === orderId
        ? OrderService.updateOrderStatus(order, 'delivered')
        : order
    ));
  }, []);

  // Obter pedidos por status - usa OrderService
  const getOrdersByStatus = useCallback((status) => {
    return OrderService.filterOrdersByStatus(orders, status);
  }, [orders]);

  // Obter pedido por ID - usa OrderService
  const getOrderById = useCallback((orderId) => {
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
