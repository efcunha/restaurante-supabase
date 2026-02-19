import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
      <Text style={styles.orderNumber}>{order.id}</Text>
      <Text style={styles.orderClient}>{order.client}</Text>

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
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  orderCardUrgent: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#E5B84A',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 8,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 12,
  },
  orderObs: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#8B2F2F',
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
    backgroundColor: '#8B2F2F',
    marginRight: 10,
  },
  itemDotSecondary: {
    backgroundColor: '#E5B84A',
  },
  itemText: {
    fontSize: 14,
    color: '#5C5C5C',
  },
  actionBtn: {
    backgroundColor: '#8B2F2F',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 3px 10px rgba(139, 47, 47, 0.2)',
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default OrderCard;
