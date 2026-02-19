/**
 * Componentes de Cards Otimizados com React.memo
 * 
 * Evita re-renderizações desnecessárias quando outros pedidos da lista mudam
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

/**
 * Card para pedidos em Montagem
 */
export const MontagemOrderCard = React.memo(({ 
  order, 
  isUrgent, 
  onMarkReady, 
  onOpenDetails 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.orderCard, isUrgent && styles.orderCardUrgent]}
      onPress={onOpenDetails}
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
      <TouchableOpacity 
        style={styles.readyBtn} 
        onPress={(e) => {
          e.stopPropagation();
          onMarkReady();
        }}
      >
        <Text style={styles.readyBtnText}>PEDIDO MONTADO</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Re-renderizar apenas se o pedido ou urgência mudarem
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.client === nextProps.order.client &&
    prevProps.order.observations === nextProps.order.observations &&
    prevProps.order.items.length === nextProps.order.items.length &&
    prevProps.isUrgent === nextProps.isUrgent
  );
});

MontagemOrderCard.displayName = 'MontagemOrderCard';

/**
 * Card para pedidos Prontos
 */
export const ProntoOrderCard = React.memo(({ 
  order, 
  onDeliver, 
  onOpenDetails 
}) => {
  return (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={onOpenDetails}
      activeOpacity={0.7}
    >
      <Text style={styles.orderNumber}>{order.id}</Text>
      <Text style={styles.orderClient}>{order.client}</Text>
      <View style={styles.orderItems}>
        {order.items.map((item, idx) => (
          <Text key={idx} style={styles.itemText}>• {item}</Text>
        ))}
      </View>
      <TouchableOpacity 
        style={styles.deliverBtn} 
        onPress={(e) => {
          e.stopPropagation();
          onDeliver();
        }}
      >
        <Text style={styles.deliverBtnText}>ENTREGUE</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Re-renderizar apenas se o pedido mudar
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.client === nextProps.order.client &&
    prevProps.order.items.length === nextProps.order.items.length
  );
});

ProntoOrderCard.displayName = 'ProntoOrderCard';

/**
 * Card para espetos na Churrasqueira
 */
export const EspetoCard = React.memo(({ espeto }) => {
  return (
    <View style={styles.espetoCard}>
      <View style={styles.espetoLeft}>
        <Text style={styles.espetoIcon}>{espeto.icon}</Text>
        <View>
          <Text style={styles.espetoTipo}>{espeto.tipo}</Text>
        </View>
      </View>
      <View style={styles.quantityBadge}>
        <Text style={styles.quantityText}>{espeto.quantidade}</Text>
        <Text style={styles.quantityLabel}>espetos</Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Re-renderizar apenas se quantidade ou tipo mudarem
  return (
    prevProps.espeto.tipo === nextProps.espeto.tipo &&
    prevProps.espeto.quantidade === nextProps.espeto.quantidade
  );
});

EspetoCard.displayName = 'EspetoCard';

const styles = StyleSheet.create({
  // Styles comuns aos cards de pedidos
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
    paddingVertical: 3,
  },
  
  // Botão "PEDIDO MONTADO"
  readyBtn: {
    backgroundColor: '#8B2F2F',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  readyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // Botão "ENTREGUE"
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

  // Styles para cards de espetos
  espetoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#E5B84A',
  },
  espetoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  espetoIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  espetoTipo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  quantityBadge: {
    backgroundColor: '#8B2F2F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  quantityText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
    fontWeight: '500',
  },
});
