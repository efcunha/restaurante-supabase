/**
 * Componentes de Cards Otimizados com React.memo
 * 
 * Evita re-renderizações desnecessárias quando outros pedidos da lista mudam
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
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
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
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
    paddingVertical: 3,
  },
  
  // Botão "PEDIDO MONTADO"
  readyBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  readyBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // Botão "ENTREGUE"
  deliverBtn: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  deliverBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Styles para cards de espetos
  espetoCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
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
    color: colors.text,
  },
  quantityBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  quantityText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  quantityLabel: {
    fontSize: 11,
    color: colors.white,
    marginTop: 2,
    fontWeight: '500',
  },
});
