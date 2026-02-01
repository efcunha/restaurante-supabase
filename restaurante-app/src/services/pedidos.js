import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const PEDIDOS_COLLECTION = 'pedidos';

/**
 * Cria um novo pedido no Firestore
 * @param {string} cliente - Nome do cliente
 * @param {Array} itens - Array de itens do pedido [{nome, quantidade, preco, opcoes}]
 * @param {string} observacoes - Observações do pedido
 * @returns {Promise<Object>} ID do pedido criado
 */
export const criarPedido = async (cliente, itens, observacoes = '') => {
  try {
    const pedidoData = {
      cliente: cliente.trim(),
      itens: itens,
      observacoes: observacoes.trim(),
      status: 'churrasqueira', // Estados: churrasqueira, montagem, pronto, entregue
      horaPedido: serverTimestamp(),
      criadoEm: new Date().toISOString(),
      atualizado: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, PEDIDOS_COLLECTION), pedidoData);
    return { 
      success: true, 
      pedidoId: docRef.id,
      pedido: { ...pedidoData, id: docRef.id }
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao criar pedido: ' + error.message 
    };
  }
};

/**
 * Atualiza o status de um pedido
 * @param {string} pedidoId - ID do pedido
 * @param {string} novoStatus - Novo status (churrasqueira, montagem, pronto, entregue)
 * @returns {Promise<Object>} Resultado da atualização
 */
export const atualizarStatusPedido = async (pedidoId, novoStatus) => {
  try {
    const pedidoRef = doc(db, PEDIDOS_COLLECTION, pedidoId);
    
    await updateDoc(pedidoRef, {
      status: novoStatus,
      atualizado: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao atualizar status: ' + error.message 
    };
  }
};

/**
 * Lista pedidos filtrados por status (tempo real)
 * @param {string} status - Status dos pedidos (churrasqueira, montagem, pronto, entregue)
 * @param {Function} callback - Função callback que recebe os pedidos atualizados
 * @returns {Function} Função para remover o listener
 */
export const listarPedidosPorStatus = (status, callback) => {
  try {
    const q = query(
      collection(db, PEDIDOS_COLLECTION),
      where('status', '==', status),
      orderBy('horaPedido', 'asc')
    );

    // Retorna a função unsubscribe para parar de ouvir mudanças
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Converter Timestamp do Firebase para Date
        let timestamp = data.horaPedido;
        if (timestamp && timestamp.toDate) {
          timestamp = timestamp.toDate().getTime();
        } else if (timestamp) {
          timestamp = new Date(timestamp).getTime();
        } else {
          timestamp = Date.now();
        }

        pedidos.push({
          id: doc.id,
          ...data,
          timestamp,
        });
      });
      
      callback(pedidos);
    });

    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {}; // Retorna função vazia em caso de erro
  }
};

/**
 * Lista todos os pedidos (tempo real)
 * @param {Function} callback - Função callback que recebe os pedidos atualizados
 * @returns {Function} Função para remover o listener
 */
export const listarTodosPedidos = (callback) => {
  try {
    const q = query(
      collection(db, PEDIDOS_COLLECTION),
      orderBy('horaPedido', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let timestamp = data.horaPedido;
        if (timestamp && timestamp.toDate) {
          timestamp = timestamp.toDate().getTime();
        } else if (timestamp) {
          timestamp = new Date(timestamp).getTime();
        } else {
          timestamp = Date.now();
        }

        pedidos.push({
          id: doc.id,
          ...data,
          timestamp,
        });
      });
      
      callback(pedidos);
    });

    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {};
  }
};

/**
 * Busca pedidos por cliente
 * @param {string} nomeCliente - Nome do cliente
 * @returns {Promise<Array>} Lista de pedidos do cliente
 */
export const buscarPedidosPorCliente = async (nomeCliente) => {
  try {
    const q = query(
      collection(db, PEDIDOS_COLLECTION),
      where('cliente', '==', nomeCliente),
      orderBy('horaPedido', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const pedidos = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      let timestamp = data.horaPedido;
      if (timestamp && timestamp.toDate) {
        timestamp = timestamp.toDate().getTime();
      } else if (timestamp) {
        timestamp = new Date(timestamp).getTime();
      } else {
        timestamp = Date.now();
      }

      pedidos.push({
        id: doc.id,
        ...data,
        timestamp,
      });
    });

    return { success: true, pedidos };
  } catch (error) {
    return { success: false, error: error.message, pedidos: [] };
  }
};

/**
 * Marca um pedido como entregue (remove do sistema)
 * @param {string} pedidoId - ID do pedido
 * @returns {Promise<Object>} Resultado da operação
 */
export const marcarPedidoComoEntregue = async (pedidoId) => {
  return await atualizarStatusPedido(pedidoId, 'entregue');
};
