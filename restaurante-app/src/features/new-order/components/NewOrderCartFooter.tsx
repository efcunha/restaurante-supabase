import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { NewOrderSelectedItem } from './NewOrderSelectedItem';
import { NewOrderCartFooterProps } from '../types';

export const NewOrderCartFooter = memo(function NewOrderCartFooter({
  selectedItems,
  total,
  cartExpanded,
  onToggleCart,
  onRemoveItem,
  onSubmit,
  isSubmitting,
}: NewOrderCartFooterProps) {
  return (
    <View style={styles.stickyFooter}>
      <TouchableOpacity
        style={styles.cartSummaryRow}
        onPress={() => selectedItems.length > 0 && onToggleCart()}
        activeOpacity={selectedItems.length > 0 ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={cartExpanded ? 'Recolher carrinho' : 'Expandir carrinho'}
      >
        <View style={styles.cartBadgeWrapper}>
          <Ionicons name="cart" size={22} color={colors.primary} />
          {selectedItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{selectedItems.length}</Text>
            </View>
          )}
        </View>

        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>

        {selectedItems.length > 0 && (
          <Ionicons
            name={cartExpanded ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.textSecondary}
            style={styles.cartToggleIcon}
          />
        )}
      </TouchableOpacity>

      {cartExpanded && selectedItems.length > 0 && (
        <ScrollView
          style={styles.cartExpandedList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {selectedItems.map((item, index) => (
            <NewOrderSelectedItem
              key={`${item.name}-${index}`}
              item={item.text}
              price={item.price}
              onRemove={() => onRemoveItem(item.name)}
            />
          ))}
        </ScrollView>
      )}

      <Button
        label="Criar Pedido"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        fullWidth
      />
    </View>
  );
});

const styles = StyleSheet.create({
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    elevation: 20,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 40,
  },
  cartBadgeWrapper: {
    width: 34,
    height: 34,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  cartExpandedList: {
    maxHeight: 180,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },
  cartToggleIcon: {
    marginLeft: 'auto',
  },
});