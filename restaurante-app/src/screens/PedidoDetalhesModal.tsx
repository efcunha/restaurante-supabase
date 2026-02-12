
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOrders } from '../context/OrderContext';
import TransferModal from '../components/TransferModal';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
}

export default function PedidoDetalhesModal({ visible, orderId, onClose }: Props) {
  const navigation = useNavigation<any>();
  const { getOrderById, editOrder, deleteOrder, transferOrder } = useOrders();
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  // ... (existing helper functions)

  const handleTransfer = async (newTable: string) => {
    try {
      await transferOrder(orderId, newTable);
      Alert.alert('Sucesso', `Pedido transferido para a mesa ${newTable}`);
      setIsTransferModalVisible(false);
      onClose(); // Optional: close details modal after transfer
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao transferir pedido: ' + error.message);
    }
  };

  // ... (existing handleEdit, handleDelete)

  // ... (render)


  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor: any) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState('');
  const [editedObservations, setEditedObservations] = useState('');

  const order = getOrderById(orderId);

  if (!order) {
    return null;
  }

  const canEdit = order.status === 'preparing';

  const formatDate = (isoString: any) => {
    if (!isoString) return '--';
    const date = typeof isoString === 'string' ? new Date(isoString) : isoString.toDate ? isoString.toDate() : new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateFull = (isoString: any) => {
    if (!isoString) return '--';
    const date = typeof isoString === 'string' ? new Date(isoString) : isoString.toDate ? isoString.toDate() : new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    if (isEditing) {
      // Salvar alterações
      try {
        editOrder(orderId, {
          client: editedClient,
          observations: editedObservations,
        });
        Alert.alert('Sucesso', 'Pedido atualizado com sucesso!');
        setIsEditing(false);
      } catch (error: any) {
        Alert.alert('Erro', error.message);
      }
    } else {
      // Entrar em modo de edição
      setEditedClient(order.client || '');
      setEditedObservations(order.observations || '');
      setIsEditing(true);
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#E5B84A';
      case 'ready': return '#7ED321';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Em Preparo';
      case 'ready': return 'Pronto';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.orderId}>{order.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Cliente */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Cliente</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editedClient}
                      onChangeText={setEditedClient}
                      placeholder="Nome do cliente"
                    />
                  ) : (
                    <Text style={styles.clientName}>{order.client}</Text>
                  )}
                </View>

                {order.mesa && (
                  <View style={{ marginLeft: 20 }}>
                    <Text style={styles.sectionTitle}>Mesa</Text>
                    <Text style={styles.clientName}>{order.mesa}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Garçom */}
            {order.createdByName && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Garçom</Text>
                <Text style={styles.clientName}>{order.createdByName}</Text>
              </View>
            )}

            {/* Itens do Pedido */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Itens do Pedido</Text>
              {order.items.map((item: string, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemBullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.section}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total do Pedido:</Text>
                <Text style={styles.totalValue}>{formatarMoeda(order.totalPrice)}</Text>
              </View>
            </View>

            {/* Observações */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Observações</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedObservations}
                  onChangeText={setEditedObservations}
                  placeholder="Observações"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.observations}>
                  {order.observations || 'Sem observações'}
                </Text>
              )}
            </View>

            {/* Linha do Tempo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico do Pedido</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Criado</Text>
                    <Text style={styles.timelineTime}>{formatDateFull(order.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: order.timeInChurrasqueira ? '#E5B84A' : '#DDD' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Churrasqueira</Text>
                    <Text style={styles.timelineTime}>{formatDate(order.timeInChurrasqueira)}</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: order.timeInMontagem ? '#4A90E2' : '#DDD' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Montagem</Text>
                    <Text style={styles.timelineTime}>{formatDate(order.timeInMontagem)}</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: order.timeInProntos ? '#7ED321' : '#DDD' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Pronto</Text>
                    <Text style={styles.timelineTime}>{formatDate(order.timeInProntos)}</Text>
                  </View>
                </View>

                {order.deliveredAt && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#8B2F2F' }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Entregue</Text>
                      <Text style={styles.timelineTime}>{formatDate(order.deliveredAt)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Botões de Ação */}
          {/* Botões de Ação */}
          <View style={styles.actions}>
            {canEdit && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF9800', flex: 1 }]}
                  onPress={() => setIsTransferModalVisible(true)}
                >
                  <Text style={styles.actionBtnText}>🔄 Mover</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, { flex: 1 }]}
                  onPress={handleEdit}
                >
                  <Text style={styles.actionBtnText}>
                    {isEditing ? '💾 Salvar' : '✏️ Editar'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4CAF50', flex: 1 }]}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate('Comandas', { searchComanda: order.comandaNumber });
                }, 300);
              }}
            >
              <Text style={styles.actionBtnText}>💰 Pagar</Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn, { flex: 1 }]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>

          {!canEdit && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Pedidos em montagem ou prontos não podem ser editados
              </Text>
            </View>
          )}
        </View>
      </View>
      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
        onConfirm={handleTransfer}
        currentTable={order.mesa}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        // @ts-ignore
        boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
      }
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#8B2F2F',
  },
  orderId: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  itemBullet: {
    fontSize: 16,
    color: '#8B2F2F',
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    padding: 16,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  observations: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B2F2F',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0D8C8',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#4A90E2',
  },
  deleteBtn: {
    backgroundColor: '#E74C3C',
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE69C',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },
});
