import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { PaymentOrderSummaryProps } from '../types';

export const PaymentOrderSummary = memo(function PaymentOrderSummary({
  orders,
  formatCurrency,
}: PaymentOrderSummaryProps) {
  return (
    <View style={styles.resumoContainer}>
      <Text style={styles.resumoTitle}>Resumo do Pedido</Text>
      {orders.map((order, idx) => (
        <View key={order.id || idx} style={styles.orderItemContainer}>
          {order.itemsWithStatus ? (
            order.itemsWithStatus.map((item: any, itemIndex: number) => {
              const qty = item.quantity || 1;
              const paidQty = item.paid_quantity || (item.paid ? qty : 0);
              const isFullyPaid = paidQty >= qty;
              const isPartiallyPaid = paidQty > 0 && !isFullyPaid;

              return (
                <View key={itemIndex} style={styles.itemRow}>
                  <View style={styles.itemInfoRow}>
                    <Text style={[styles.itemText, isFullyPaid && styles.paidItemText]}>
                      {qty}x {item.name || item.nome}
                    </Text>
                    {isPartiallyPaid ? (
                      <Text style={styles.partialPaidText}>({paidQty}/{qty} pago)</Text>
                    ) : null}
                    {isFullyPaid ? <Text style={styles.partialPaidText}>(Pago)</Text> : null}
                  </View>
                  <Text style={[styles.itemPrice, isFullyPaid && styles.paidItemText]}>
                    {item.price ? formatCurrency(item.price) : item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                  </Text>
                </View>
              );
            })
          ) : (
            order.items?.map((itemStr: string, itemIndex: number) => (
              <Text key={itemIndex} style={styles.itemTextSimple}>• {itemStr}</Text>
            ))
          )}

          {(Number(order.delivery_fee) || 0) > 0 && (
            <View style={styles.deliveryFeeRow}>
              <View style={styles.itemInfoRow}>
                <Ionicons name="bicycle-outline" size={16} color="#8B2F2F" style={styles.deliveryIcon} />
                <Text style={styles.deliveryText}>MOTO-BOY (Taxa de Entrega)</Text>
              </View>
              <Text style={styles.deliveryPrice}>{formatCurrency(order.delivery_fee)}</Text>
            </View>
          )}
        </View>
      ))}
      {orders.length === 0 && <Text style={styles.emptyText}>Nenhum pedido encontrado.</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  resumoContainer: {
    marginBottom: 20,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  resumoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 5,
  },
  orderItemContainer: {
    marginBottom: 5,
    paddingBottom: 5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  itemTextSimple: {
    fontSize: 14,
    color: colors.text,
  },
  paidItemText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  partialPaidText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 5,
  },
  deliveryFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  deliveryIcon: {
    marginRight: 6,
  },
  deliveryText: {
    fontWeight: 'bold',
    color: '#8B2F2F',
  },
  deliveryPrice: {
    fontWeight: 'bold',
    color: '#8B2F2F',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
});