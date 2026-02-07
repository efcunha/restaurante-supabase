import React from 'react';
import { FlatList, FlatListProps } from 'react-native';

/**
 * OptimizedFlatList - FlatList component with performance optimizations
 * 
 * Features:
 * - Virtualization with optimized window size
 * - Reduced initial render batch
 * - Clipped subviews removal for better memory usage
 * - Configurable item layout for fixed-height items
 * 
 * @template T - Type of items in the list
 */

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  /**
   * Fixed height of each item (enables getItemLayout optimization)
   */
  itemHeight?: number;
  
  /**
   * Number of items to render initially (default: 10)
   */
  initialNumToRender?: number;
  
  /**
   * Maximum number of items to render per batch (default: 10)
   */
  maxToRenderPerBatch?: number;
  
  /**
   * Number of screens worth of content to keep rendered (default: 5)
   */
  windowSize?: number;
  
  /**
   * Whether to remove clipped subviews (default: true on Android/iOS)
   */
  removeClippedSubviews?: boolean;
}

function OptimizedFlatList<T>({
  itemHeight,
  initialNumToRender = 10,
  maxToRenderPerBatch = 10,
  windowSize = 5,
  removeClippedSubviews = true,
  ...props
}: OptimizedFlatListProps<T>) {
  // Generate optimized getItemLayout if itemHeight is provided
  const getItemLayout = itemHeight
    ? (_data: ArrayLike<T> | null | undefined, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      })
    : undefined;

  return (
    <FlatList
      {...props}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      getItemLayout={getItemLayout}
      // Additional optimizations
      updateCellsBatchingPeriod={50}

    />
  );
}

export default OptimizedFlatList;
