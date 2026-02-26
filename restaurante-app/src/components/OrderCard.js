import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.orderNumber}>{order.id}</Text>
        {order.orderType === 'delivery' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDECEC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Ionicons name="bicycle" size={16} color="#8B2F2F" />
            <Text style={{ marginLeft: 4, fontSize: 13, fontWeight: 'bold', color: '#8B2F2F' }}>Delivery</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  orderAddress: {
    fontSize: 13,
    color: '#444',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  orderFee: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E5B84A',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionBtn: {
    backgroundColor: '#8B2F2F',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default OrderCard;
