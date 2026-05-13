
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/SupabaseConfig';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import TransferModal from '../components/TransferModal';
import { calcularPrecoItem, MenuItem } from '../utils/orderCalculator';

import { getBusinessDateKey } from '../services/BusinessDateService';
import { colors } from '../theme/colors';
interface Props {
  visible: boolean;
  orderId?: string;
  orderIds?: string[];
  tableNumber?: string;
  onClose: () => void;
}

export default function PedidoDetalhesModal({ visible, orderId, orderIds = [], tableNumber, onClose }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { getOrderById, editOrder, transferOrder } = useOrders();
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const resolvedOrderIds = orderIds.length > 0
    ? Array.from(new Set(orderIds))
    : orderId
      ? [orderId]
      : [];
  const resolvedOrders = resolvedOrderIds
    .map(currentOrderId => getOrderById(currentOrderId))
    .filter(Boolean) as any[];
  const order = resolvedOrders[0];
  const primaryOrderId = resolvedOrderIds[0] || null;
  const isTableAggregate = resolvedOrders.length > 1;
  const aggregateTableNumber = tableNumber || order?.mesa;
  const aggregateTotal = resolvedOrders.reduce((sum, currentOrder) => sum + (currentOrder.totalPrice || 0), 0);

  const handleTransfer = async (newTable: string) => {
    try {
      await Promise.all(resolvedOrderIds.map(currentOrderId => transferOrder(currentOrderId, newTable)));
      Alert.alert(
        'Sucesso',
        isTableAggregate
          ? `Mesa ${aggregateTableNumber || ''} transferida para a mesa ${newTable}`.trim()
          : `Pedido transferido para a mesa ${newTable}`
      );
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
  const [cardapioDin, setCardapioDin] = useState<MenuItem[]>([]);

  // Fetch Comanda Data
  React.useEffect(() => {
      if (visible && order && !isTableAggregate) {
          const fetchComanda = async () => {
              if (order && (order.comandaNumber || order.numeroComanda)) {
                  const num = order.comandaNumber || order.numeroComanda;
                  // Use order's dateKey if available, otherwise today
                  const dateKey = order.dateKey || await getBusinessDateKey(user?.companyId || '');
                  
                    const { data } = await supabase
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
          } else {
            setComandaData(null);
      }
        }, [visible, order, isTableAggregate]);

  // Fetch Products for accurate pricing
  React.useEffect(() => {
    if (visible && user?.companyId) {
      const fetchProducts = async () => {
        const { data } = await supabase
          .from('products')
          .select('name, price')
          .eq('company_id', user.companyId)
          .eq('available', true);
        
        if (data) {
          setCardapioDin(data.map(p => ({
            name: p.name,
            price: Number(p.price)
          })));
        }
      };
      fetchProducts();
    }
  }, [visible, user?.companyId]);

  const formatDate = (isoString: any) => {
    if (!isoString) return '--';
    const date = typeof isoString === 'string' ? new Date(isoString) : isoString.toDate ? isoString.toDate() : new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getUniqueNames = (values: Array<string | null | undefined>) => (
    Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))
  );

  const getOldestTimestamp = (values: Array<string | null | undefined>) => {
    const validDates = values
      .filter(Boolean)
      .map(value => new Date(String(value)))
      .filter(date => !Number.isNaN(date.getTime()));

    if (validDates.length === 0) return null;

    return validDates.sort((left, right) => left.getTime() - right.getTime())[0].toISOString();
  };

  const handleEdit = () => {
    if (!order || !primaryOrderId) return;
    if (isEditing) {
      try {
        editOrder(primaryOrderId, {
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
      case 'preparing': return colors.secondary;
      case 'ready': return colors.success;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.textSecondary;
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

  const canEdit = !isTableAggregate && order.status === 'preparing';
  const canPay = !isTableAggregate;
  const viewModeLabel = isTableAggregate ? 'Modo: Mesa consolidada' : 'Modo: Pedido individual';
  const creatorNames = getUniqueNames(resolvedOrders.map((currentOrder: any) => currentOrder.criadoPorNome || currentOrder.createdByName));
  const movedByNames = getUniqueNames(resolvedOrders.map((currentOrder: any) => currentOrder.movidoParaMontagemPorNome));
  const createdAtReference = getOldestTimestamp(resolvedOrders.map((currentOrder: any) => currentOrder.createdAt || currentOrder.timestamp));
  const montagemReference = getOldestTimestamp(resolvedOrders.map((currentOrder: any) => currentOrder.timeInMontagem || currentOrder.time_in_montagem));
  const prontosReference = getOldestTimestamp(resolvedOrders.map((currentOrder: any) => currentOrder.timeInProntos || currentOrder.time_in_prontos));

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
              <View style={styles.headerLeft} />
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="receipt-outline" size={22} color={colors.white} style={styles.headerIcon} />
                  <Text style={styles.orderId}>
                    {isTableAggregate
                      ? `Mesa ${aggregateTableNumber || '--'}`
                      : `Comanda ${order.comandaNumber || order.numeroComanda || order.id.slice(0, 8)}`}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{isTableAggregate ? `${resolvedOrders.length} pedidos ativos` : getStatusLabel(order.status)}</Text>
                </View>
                <Text style={styles.viewModeText}>{viewModeLabel}</Text>
                {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
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
                      <Text style={styles.clientName}>{isTableAggregate ? `${resolvedOrders.length} pedidos na mesa` : order.client}</Text>
                    )}
                  </View>

                  {aggregateTableNumber && (
                    <View style={{ marginLeft: 20 }}>
                      <Text style={styles.sectionTitle}>Mesa</Text>
                      <Text style={styles.clientName}>{aggregateTableNumber}</Text>
                    </View>
                  )}
                </View>
              </View>

              {(creatorNames.length > 0 || movedByNames.length > 0 || createdAtReference || montagemReference || prontosReference) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Origem do Pedido</Text>
                  {creatorNames.length > 0 && (
                    <Text style={styles.clientName}>Pedido por: {creatorNames.join(', ')}</Text>
                  )}
                  {movedByNames.length > 0 && (
                    <Text style={styles.metaText}>Recebido de: {movedByNames.join(', ')}</Text>
                  )}
                  {createdAtReference && (
                    <Text style={styles.metaText}>Criado em: {formatDate(createdAtReference)}</Text>
                  )}
                  {montagemReference && (
                    <Text style={styles.metaText}>Entrou na montagem: {formatDate(montagemReference)}</Text>
                  )}
                  {prontosReference && (
                    <Text style={styles.metaText}>Ficou pronto: {formatDate(prontosReference)}</Text>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{isTableAggregate ? 'Itens da Mesa (Consolidado)' : 'Itens do Pedido'}</Text>
                {resolvedOrders.map((currentOrder: any, orderIndex: number) => (
                  <View key={currentOrder.id} style={isTableAggregate ? styles.orderGroup : undefined}>
                    {isTableAggregate && (
                      <Text style={styles.orderGroupTitle}>
                        Pedido {orderIndex + 1} - {currentOrder.client || 'Cliente'}
                      </Text>
                    )}
                    {currentOrder.itemsWithStatus && currentOrder.itemsWithStatus.length > 0 ? (
                    currentOrder.itemsWithStatus.map((item: any, index: number) => {
                       const qty = item.quantity || 1;
                       const paidQty = item.paid_quantity || (item.paid ? qty : 0);
                       const isFullyPaid = paidQty >= qty;
                       const isPartiallyPaid = paidQty > 0 && !isFullyPaid;
                       
                       /* Parse Extras */
                       const parts = item.name.split(' + ');
                       const mainName = parts[0];
                       const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;

                       return (
                          <View key={`${currentOrder.id}-${item.id || index}`} style={styles.itemRow}>
                            <Text style={[styles.itemBullet, isFullyPaid && styles.itemPaidBullet]}>
                                {isFullyPaid ? '✓' : '*'}
                            </Text>
                            <View style={{flex: 1}}>
                                <Text style={[styles.itemText, isFullyPaid && styles.itemPaidText]}>
                                    {mainName}
                                </Text>
                                {extras && (
                                   <Text style={[styles.itemExtras, isFullyPaid && styles.itemPaidText]}>
                                      + {extras}
                                   </Text>
                                )}
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
                    Array.isArray(currentOrder.items) && currentOrder.items.map((item: string, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemBullet}>*</Text>
                        <Text style={styles.itemText}>{String(item)}</Text>
                      </View>
                    ))
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <View style={styles.totalRow}>
                   <View>
                      <Text style={styles.totalLabel}>{isTableAggregate ? 'Total da Mesa:' : 'Total do Pedido:'}</Text>
                   </View>
                   <Text style={styles.totalValue}>{formatarMoeda(isTableAggregate ? aggregateTotal : order.totalPrice)}</Text>
                </View>
                
                {/* Show Remaining Balance if any payment exists */}
                {!isTableAggregate && (() => {
                    const items = order.itemsWithStatus || [];
                    
                    // 1. Calculate paid amount based on ITEMS (Physical/Logical Status)
                    let paidAmountItems = 0;
                    if (items.length > 0) {
                        items.forEach((item: any) => {
                            // Tentar obter preço do priceMap primeiro
                            let unitPrice = 0;
                            let found = false;

                            if (order.priceMap) {
                                const cleanName = item.name.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
                                if (order.priceMap[item.name] !== undefined) {
                                  unitPrice = order.priceMap[item.name] / (item.quantity || 1);
                                  found = true;
                                } else if (order.priceMap[cleanName] !== undefined) {
                                  unitPrice = order.priceMap[cleanName];
                                  found = true;
                                }
                            }

                            if (!found) {
                                const calc = calcularPrecoItem(item.name, cardapioDin);
                                unitPrice = calc.precoUnitario;
                            }
                            
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
                                   <Text style={[styles.totalLabel, { fontSize: 14, color: colors.success }]}>Pago (Itens):</Text>
                                   <Text style={[styles.totalValue, { fontSize: 16, color: colors.success }]}>{formatarMoeda(displayPaid)}</Text>
                                </View>
                                <View style={[styles.totalRow, { marginTop: 5, borderTopWidth: 1, borderColor: colors.border }]}>
                                   <Text style={[styles.totalLabel, { color: colors.primary }]}>Restante a Pagar:</Text>
                                   <Text style={[styles.totalValue, { color: colors.primary }]}>{formatarMoeda(displayRemaining)}</Text>
                                </View>
                            </>
                        );
                    } else if (isOrderPaidFinancially || (displayPaid >= (order.totalPrice || 0) && (order.totalPrice || 0) > 0)) {
                         return (
                            <View style={[styles.totalRow, { marginTop: 5, backgroundColor: colors.successSurface }]}>
                               <Text style={[styles.totalLabel, { color: colors.success }]}>PEDIDO PAGO</Text>
                               <Text style={[styles.totalValue, { color: colors.success }]}>✓</Text>
                            </View>
                         );
                    }
                    return null;
                })()}
              </View>

              {/* --- COMANDA BALANCE INFO (NEW) --- */}
              {/* Shows partial payments that are not allocated to specific items yet */}
              {!isTableAggregate && !!comandaData && comandaData.total_paid > 0 && (
                   <View style={[styles.section, { marginTop: 10, padding: 10, backgroundColor: colors.surfaceMuted, borderRadius: 8 }]}>
                      <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 5 }]}>Status Financeiro da Comanda</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: colors.textSecondary }}>Total Pago (Geral):</Text>
                          <Text style={{ color: colors.success, fontWeight: 'bold' }}>{formatarMoeda(comandaData.total_paid)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ color: colors.textSecondary }}>Saldo Devedor:</Text>
                          <Text style={{ color: colors.danger, fontWeight: 'bold' }}>{formatarMoeda(comandaData.open_balance)}</Text>
                      </View>
                   </View>
                )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{isTableAggregate ? 'Observações da Mesa' : 'Observações'}</Text>
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
                  <>
                    {isTableAggregate ? (
                      resolvedOrders.some((currentOrder: any) => currentOrder.observations) ? (
                        resolvedOrders
                          .filter((currentOrder: any) => currentOrder.observations)
                          .map((currentOrder: any) => (
                            <Text key={`${currentOrder.id}-obs`} style={styles.observations}>
                              {currentOrder.client || 'Cliente'}: {currentOrder.observations}
                            </Text>
                          ))
                      ) : (
                        <Text style={styles.observations}>Sem observações</Text>
                      )
                    ) : (
                      <Text style={styles.observations}>
                        {order.observations || 'Sem observações'}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {!isTableAggregate && order.deliveredAt && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Histórico do Pedido</Text>
                  <View style={styles.timeline}>
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
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
                    style={[styles.actionBtn, { backgroundColor: colors.warning, flex: 1 }]}
                    onPress={() => setIsTransferModalVisible(true)}
                  >
                    <Text style={styles.actionBtnText}>{isTableAggregate ? '🔄 Mover Mesa' : '🔄 Mover'}</Text>
                  </TouchableOpacity>

                  {!isTableAggregate && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn, { flex: 1 }]}
                    onPress={handleEdit}
                  >
                    <Text style={styles.actionBtnText}>
                      {isEditing ? '💾 Salvar' : '✏️ Editar'}
                    </Text>
                  </TouchableOpacity>
                  )}
                </>
              )}

              {canPay && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.success, flex: 1 }]}
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
              )}

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
                  {isTableAggregate
                    ? '⚠️ Visualização consolidada da mesa. Para editar ou pagar individualmente, abra a comanda específica.'
                    : '⚠️ Pedidos em montagem ou prontos não podem ser editados'}
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
        currentTable={aggregateTableNumber}
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
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  orderId: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
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
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeText: {
    marginTop: 6,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
    textAlign: 'center',
  },
  userInfo: {
    marginTop: 6,
    color: colors.userInfo,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    color: colors.white,
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
    color: colors.primary,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
  orderGroup: {
    marginBottom: 16,
  },
  orderGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  itemBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  observations: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: colors.secondary,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
  },
  cancelBtn: {
    backgroundColor: colors.textSecondary,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: colors.warningSurface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.warning,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
  },
  itemPaidText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  itemPaidBullet: {
    color: colors.success,
  },
  itemSubText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  itemExtras: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: 'bold',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
