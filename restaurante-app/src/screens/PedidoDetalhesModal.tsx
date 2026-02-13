
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
import { supabase } from '../config/SupabaseConfig';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import TransferModal from '../components/TransferModal';
import { calcularPrecoItem } from '../utils/orderCalculator';

import { getTodayKey } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
}

export default function PedidoDetalhesModal({ visible, orderId, onClose }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { getOrderById, editOrder, deleteOrder, transferOrder } = useOrders();
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const handleTransfer = async (newTable: string) => {
    try {
      await transferOrder(orderId, newTable);
      Alert.alert('Sucesso', `Pedido transferido para a mesa ${newTable}`);
      setIsTransferModalVisible(false);
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao transferir pedido: ' + error.message);
    }
  };

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
  const [comandaData, setComandaData] = useState<any>(null);

  const order = getOrderById(orderId);

  // Fetch Comanda Data
  React.useEffect(() => {
      if (visible) {
          const fetchComanda = async () => {
              const order = getOrderById(orderId);
              if (order && (order.comandaNumber || order.numeroComanda)) {
                  const num = order.comandaNumber || order.numeroComanda;
                  // Use order's dateKey if available, otherwise today
                  const dateKey = order.dateKey || getTodayKey();
                  
                  const { data, error } = await supabase
                      .from('comandas')
                      .select('total_consumed, total_paid, open_balance')
                      .eq('company_id', user?.companyId) // Added company_id check for safety
                      .eq('comanda_number', String(num))
                      .eq('date_key', dateKey) // CRITICAL FIX: Filter by date!
                      .limit(1)
                      .maybeSingle();
                  
                  if (data) {
                      setComandaData(data);
                  } else {
                      setComandaData(null); // Clear incompatible data
                  }
              }
          };
          fetchComanda();
      }
  }, [visible, orderId]);

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

  if (!order) return null;

  const canEdit = order.status === 'preparing';

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <View>
                <Text style={styles.orderId}>
                  Comanda {order.comandaNumber || order.numeroComanda || order.id.slice(0, 8)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
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

              {order.createdByName && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Garçom</Text>
                  <Text style={styles.clientName}>{order.createdByName}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Itens do Pedido</Text>
                {/* Render itemsWithStatus if available (Rich Data) */}
                {order.itemsWithStatus && order.itemsWithStatus.length > 0 ? (
                    order.itemsWithStatus.map((item: any, index: number) => {
                       const qty = item.quantity || 1;
                       const paidQty = item.paid_quantity || (item.paid ? qty : 0);
                       const isFullyPaid = paidQty >= qty;
                       const isPartiallyPaid = paidQty > 0 && !isFullyPaid;
                       
                       return (
                          <View key={item.id || index} style={styles.itemRow}>
                            <Text style={[styles.itemBullet, isFullyPaid && styles.itemPaidBullet]}>
                                {isFullyPaid ? '✓' : '*'}
                            </Text>
                            <View style={{flex: 1}}>
                                <Text style={[styles.itemText, isFullyPaid && styles.itemPaidText]}>
                                    {item.name}
                                </Text>
                                {isPartiallyPaid && (
                                    <Text style={styles.itemSubText}>
                                        {paidQty}/{qty} Pago(s)
                                    </Text>
                                )}
                                {isFullyPaid && (
                                     <Text style={styles.itemSubText}>Pago</Text>
                                )}
                            </View>
                          </View>
                       );
                    })
                ) : (
                    Array.isArray(order.items) && order.items.map((item: string, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemBullet}>*</Text>
                        <Text style={styles.itemText}>{String(item)}</Text>
                      </View>
                    ))
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.totalRow}>
                   <View>
                      <Text style={styles.totalLabel}>Total do Pedido:</Text>
                      {/* Show paid items summary if needed, but Total do Pedido usually means Grand Total */}
                   </View>
                   <Text style={styles.totalValue}>{formatarMoeda(order.totalPrice)}</Text>
                </View>
                
                {/* Show Remaining Balance if any payment exists */}
                {(() => {
                    const items = order.itemsWithStatus || [];
                    
                    // 1. Calculate paid amount based on ITEMS (Physical/Logical Status)
                    let paidAmountItems = 0;
                    if (items.length > 0) {
                        items.forEach((item: any) => {
                            // Calculate price dynamically since it's not in itemsWithStatus
                            const calc = calcularPrecoItem(item.name);
                            const unitPrice = calc.precoUnitario;
                            
                            const qty = item.quantity || 1;
                            const paidQty = item.paid_quantity || (item.paid ? qty : 0);
                            
                            paidAmountItems += (paidQty * unitPrice);
                        });
                    } else if (order.isPago) {
                        paidAmountItems = order.totalPrice;
                    }

                    // 2. Check for Discrepancies if this order belongs to a Comanda
                    // If the Order is part of a Comanda, we might want to warn the user if 
                    // the financial status doesn't match the item status (due to bugs or manual payments).
                    // However, 'PedidoDetalhesModal' is Order-centric.
                    
                    // The user complains about "Restante a Pagar" being wrong.
                    // If the Comanda is fully paid, the Order IS Paid financially, even if items aren't marked.
                    
                    const isOrderPaidFinancially = order.isPago; // From DB 'is_paid' field
                    
                    let displayPaid = paidAmountItems;
                    let displayRemaining = Math.max(0, (order.totalPrice || 0) - displayPaid);
                    
                    // Override if Order is marked as paid at the header level
                    if (isOrderPaidFinancially && displayRemaining > 0) {
                        displayPaid = order.totalPrice || 0;
                        displayRemaining = 0;
                    }

                    // Only show if there's a difference or if partially paid
                    if (displayPaid > 0 && displayPaid < (order.totalPrice || 0)) {
                        return (
                            <>
                                <View style={[styles.totalRow, { marginTop: 5, backgroundColor: 'transparent', paddingVertical: 0 }]}>
                                   <Text style={[styles.totalLabel, { fontSize: 14, color: '#4CAF50' }]}>Pago (Itens):</Text>
                                   <Text style={[styles.totalValue, { fontSize: 16, color: '#4CAF50' }]}>{formatarMoeda(displayPaid)}</Text>
                                </View>
                                <View style={[styles.totalRow, { marginTop: 5, borderTopWidth: 1, borderColor: '#ddd' }]}>
                                   <Text style={[styles.totalLabel, { color: '#8B2F2F' }]}>Restante a Pagar:</Text>
                                   <Text style={[styles.totalValue, { color: '#8B2F2F' }]}>{formatarMoeda(displayRemaining)}</Text>
                                </View>
                            </>
                        );
                    } else if (isOrderPaidFinancially || (displayPaid >= (order.totalPrice || 0) && (order.totalPrice || 0) > 0)) {
                         return (
                            <View style={[styles.totalRow, { marginTop: 5, backgroundColor: '#E8F5E9' }]}>
                               <Text style={[styles.totalLabel, { color: '#4CAF50' }]}>PEDIDO PAGO</Text>
                               <Text style={[styles.totalValue, { color: '#4CAF50' }]}>✓</Text>
                            </View>
                         );
                    }
                    return null;
                })()}
              </View>

                {/* --- COMANDA BALANCE INFO (NEW) --- */}
                {/* Shows partial payments that are not allocated to specific items yet */}
                {comandaData && comandaData.total_paid > 0 && (
                   <View style={[styles.section, { marginTop: 10, padding: 10, backgroundColor: '#F9F9F9', borderRadius: 8 }]}>
                      <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 5 }]}>Status Financeiro da Comanda</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#666' }}>Total Pago (Geral):</Text>
                          <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{formatarMoeda(comandaData.total_paid)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ color: '#666' }}>Saldo Devedor:</Text>
                          <Text style={{ color: '#F44336', fontWeight: 'bold' }}>{formatarMoeda(comandaData.open_balance)}</Text>
                      </View>
                   </View>
                )}

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

              {order.deliveredAt && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Histórico do Pedido</Text>
                  <View style={styles.timeline}>
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: '#8B2F2F' }]} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Entregue</Text>
                        <Text style={styles.timelineTime}>{formatDate(order.deliveredAt)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

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
                    // Navegar para a Tab Comandas, e dentro dela para a tela Pagamento
                    navigation.navigate('Comandas', { 
                      screen: 'Pagamento',
                      params: { 
                        comandaNumber: order.comandaNumber,
                        returnScreen: 'Mapa', // Indica que veio do Mapa
                        returnOrderId: order.id // ID para reabrir o modal
                      }
                    });
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
      </Modal>
      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
        onConfirm={handleTransfer}
        currentTable={order.mesa}
      />
    </>
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
    maxWidth: 500,
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
    textAlign: 'center',
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
    flexShrink: 1,
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
  itemPaidText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemPaidBullet: {
    color: '#4CAF50',
  },
  itemSubText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
