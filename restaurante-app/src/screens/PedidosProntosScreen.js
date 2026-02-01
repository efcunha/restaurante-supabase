import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BackgroundPattern from '../components/BackgroundPattern';
import PedidoDetalhesModal from './PedidoDetalhesModal';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import { query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { getLocalDateKey } from '../utils/dateUtils';
import { exitApp } from '../utils/appUtils';

export default function PedidosProntosScreen() {
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set()); // Loading state
  const [allOrders, setAllOrders] = useState([]);

  // ✅ TEMPO REAL: Listener para multi-usuários
  useEffect(() => {
    if (!user?.companyId) return;
    const today = getLocalDateKey();
    const qPedidos = query(
      getCompanyCollection(user.companyId, 'pedidos'),
      where('dateKey', '==', today)
    );

    const unsubscribe = onSnapshot(qPedidos, (snapshot) => {
      const pedidos = [];
      snapshot.forEach(doc => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });
      setAllOrders(pedidos);
    }, (error) => {
      console.error('Erro ao ouvir pedidos:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Buscar pedidos com status montagem ou churrasqueira que têm itens marcados como prontos
  const churrasqueiraOrders = allOrders.filter(o => o.status === 'churrasqueira' || o.status === 'montagem');

  // Extrair itens prontos individuais (que ainda NÃO foram entregues)
  const readyItems = [];
  const seenItems = new Set(); // Para evitar duplicatas

  churrasqueiraOrders.forEach(order => {
    if (order.itemsWithStatus && order.itemsWithStatus.length > 0) {
      order.itemsWithStatus.forEach(item => {
        if (item.status === 'pronto' && item.checked && !item.delivered) {
          // Criar chave única para evitar duplicatas
          const itemKey = `${order.id}-${item.id}`;

          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            readyItems.push({
              ...item,
              orderId: order.id,
              comandaNumber: order.comandaNumber || order.numeroComanda,
              client: order.client,
              mesa: order.mesa, // ✅ Propagar mesa
              criadoPorNome: order.criadoPorNome || order.createdByName,
              orderTimestamp: order.timestamp || order.createdAt
            });
          }
        }
      });
    }
  });

  // ORDENAR: Primeiro por número de comanda (menor primeiro), depois por timestamp do pedido
  readyItems.sort((a, b) => {
    // Extrair número da comanda (ex: "002" de "002")
    const numA = parseInt(a.comandaNumber) || 0;
    const numB = parseInt(b.comandaNumber) || 0;

    if (numA !== numB) {
      return numA - numB; // Comanda menor primeiro
    }

    // Se mesma comanda, ordenar por timestamp do pedido (mais antigo primeiro)
    const timeA = new Date(a.orderTimestamp).getTime();
    const timeB = new Date(b.orderTimestamp).getTime();
    return timeA - timeB;
  });

  // console.log('📋 [Prontos] Itens prontos:', readyItems.length, readyItems.map(i => ({ 
  //   id: i.id,
  //   orderId: i.orderId,
  //   name: i.name,
  //   status: i.status, 
  //   checked: i.checked, 
  //   delivered: i.delivered 
  // })));

  const handleDeliver = async (orderId, itemId) => {
    console.log('[Prontos] Delivering item:', orderId, itemId);

    // Validar se caixa está aberto
    try {
      const { default: CaixaService } = await import('../services/CaixaService');
      const caixaAberto = await CaixaService.getCaixaAberto(user.companyId); // UPDATE: Pass companyId
      if (!caixaAberto) {
        if (Platform.OS === 'web') window.alert('Caixa Fechado: É necessário abrir o caixa antes de entregar pedidos.');
        else Alert.alert('Caixa Fechado', 'É necessário abrir o caixa antes de entregar pedidos.');
        return;
      }
    } catch (e) {
      console.error('[Prontos] Erro ao verificar caixa:', e);
    }

    try {
      const itemKey = `${orderId}-${itemId}`;
      setProcessingItems(prev => new Set([...prev, itemKey]));

      // Buscar pedido atual do estado local (vem do onSnapshot)
      const order = allOrders.find(o => o.id === orderId);
      if (!order || !order.itemsWithStatus) {
        throw new Error('Pedido não encontrado');
      }

      const now = new Date().toISOString();

      // Atualizar item como entregue
      const updatedItems = order.itemsWithStatus.map(item =>
        item.id === itemId
          ? { ...item, delivered: true, deliveredAt: now }
          : item
      );

      // Verificar se todos os itens foram entregues
      const allDelivered = updatedItems.every(item => item.delivered === true);

      const updatePayload = {
        itemsWithStatus: updatedItems,
        atualizadoEm: now
      };

      if (allDelivered) {
        updatePayload.status = 'delivered';
        updatePayload.deliveredAt = now;
        updatePayload.entreguePor = user?.id || null;
        updatePayload.entreguePorNome = user?.nome || null;
      }

      console.log('[Prontos] Updating doc:', user.companyId, orderId);
      // Atualizar diretamente no Firebase
      const pedidoRef = getCompanyDoc(user.companyId, 'pedidos', orderId);
      await updateDoc(pedidoRef, updatePayload);
      console.log('[Prontos] Update success!');

      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });

    } catch (error) {
      console.error('❌ Erro ao entregar item:', error);
      if (Platform.OS === 'web') window.alert('Erro: ' + error.message);
      else Alert.alert('Erro', 'Não foi possível marcar como entregue: ' + error.message);

      const itemKey = `${orderId}-${itemId}`;
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  /*
  const handleOpenDetails = (orderId) => {
    setSelectedOrderId(orderId);
    setModalVisible(true);
  };
  */

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrderId(null);
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-done-circle-outline" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Prontos para entrega</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={exitApp}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {readyItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum item pronto</Text>
            <Text style={styles.emptySubtext}>Marque itens na montagem e eles aparecerão aqui</Text>
          </View>
        ) : (
          readyItems.map((item) => (
            <View
              key={`${item.orderId}-${item.id}`}
              style={styles.itemCard}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.comandaNumber}>
                  Comanda {item.comandaNumber || '?'}
                  {item.mesa ? ` - Mesa ${item.mesa}` : ''}
                </Text>
                <Text style={styles.clientName}>{item.client}</Text>
              </View>

              <View style={styles.itemBody}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>

              {item.criadoPorNome && (
                <Text style={styles.garcomText}>👤 Garçom: {item.criadoPorNome}</Text>
              )}

              <TouchableOpacity
                style={styles.deliverBtn}
                onPress={() => handleDeliver(item.orderId, item.id)}
              >
                <Text style={styles.deliverBtnText}>
                  {processingItems.has(`${item.orderId}-${item.id}`) ? 'AGUARDE...' : 'ENTREGUE'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {selectedOrderId && (
        <PedidoDetalhesModal
          visible={modalVisible}
          orderId={selectedOrderId}
          onClose={handleCloseModal}
        />
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15 }
    }),
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    color: '#E5B84A',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comandaNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  clientName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  itemBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 5,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  garcomText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 6,
  },
  finalizadoPorText: {
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  orderItems: {
    marginBottom: 15,
  },
  itemText: {
    fontSize: 14,
    color: '#5C5C5C',
    paddingVertical: 3,
  },
  deliverBtn: {
    backgroundColor: '#E5B84A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E5B84A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  deliverBtnText: {
    color: '#2C2C2C',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
