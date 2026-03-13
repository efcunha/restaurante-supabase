import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { NewOrderSelectedItemProps } from '../types';

export const NewOrderSelectedItem = memo(function NewOrderSelectedItem({
  item,
  price,
  onRemove,
}: NewOrderSelectedItemProps) {
  return (
    <View style={styles.selectedItem}>
      <View style={styles.selectedItemInfo}>
        <Text style={styles.selectedItemName}>{item}</Text>
        <Text style={styles.selectedItemPrice}>R$ {price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Text style={styles.removeBtnText}>×</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    color: colors.text,
  },
  selectedItemPrice: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  removeBtn: {
    backgroundColor: colors.dangerLight,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});