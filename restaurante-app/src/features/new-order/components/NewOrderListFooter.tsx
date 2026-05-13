import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NewOrderSelectedItem } from './NewOrderSelectedItem';
import { NewOrderListFooterProps } from '../types';

export const NewOrderListFooter = memo(function NewOrderListFooter({
  selectedItems,
  onRemoveItem,
}: NewOrderListFooterProps) {
  return (
    <View style={styles.listFooter}>
      {selectedItems.map((item, index) => (
        <NewOrderSelectedItem
          key={`${item.name}-${index}`}
          item={item.text}
          price={item.price}
          subtitle={item.accompanimentsText}
          onRemove={() => onRemoveItem(item.name)}
        />
      ))}
      <View style={styles.totalSpace} />
    </View>
  );
});

const styles = StyleSheet.create({
  listFooter: {
    marginTop: 20,
  },
  totalSpace: {
    height: 100,
  },
});