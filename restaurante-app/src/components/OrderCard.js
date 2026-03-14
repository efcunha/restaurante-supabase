import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
/**
 * OrderCard - Card otimizado para exibir pedido
 * Usa React.memo para evitar re-renders desnecessários
 */
const OrderCard = React.memo(({
  order,
  onPress,
  onAction,
  actionLabel,
  isUrgent = false
}) => {
  return (
    <TouchableOpacity
      style={[styles.orderCard, isUrgent && styles.orderCardUrgent]}
      onPress={() => onPress(order.id)}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Text style={styles.orderNumber}>{order.id}</Text>
        {order.orderType === 'delivery' && (
          <View style={styles.deliveryChip}>
            <Ionicons name="bicycle" size={16} color={colors.primary} />
            <Text style={styles.deliveryChipText}>Delivery</Text>
          </View>
        )}
      </View>

      <Text style={styles.orderClient}>{order.client}</Text>

      {order.orderType === 'delivery' && order.deliveryAddress && (
        <Text style={styles.orderAddress} numberOfLines={2}>📍 {order.deliveryAddress}</Text>
      )}

      {order.orderType === 'delivery' && order.deliveryFee > 0 && (
        <Text style={styles.orderFee}>Moto-boy: R$ {order.deliveryFee.toFixed(2)}</Text>
      )}

      {order.observations && (
        <Text style={styles.orderObs}>Obs: {order.observations}</Text>
      )}

      <View style={styles.orderItems}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.orderItem}>
            <View style={[styles.itemDot, idx % 2 === 1 && styles.itemDotSecondary]} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </View>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => {
            e.stopPropagation();
            onAction(order.id);
          }}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

OrderCard.displayName = 'OrderCard';

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryChipText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  orderCardUrgent: {
    backgroundColor: colors.warningSurface,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  orderObs: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.primary,
    marginBottom: 10,
    paddingLeft: 10,
  },
  orderItems: {
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  itemDotSecondary: {
    backgroundColor: colors.secondary,
  },
  itemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  orderFee: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default OrderCard;
