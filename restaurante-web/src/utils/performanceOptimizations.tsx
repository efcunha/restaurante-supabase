import React from 'react';

/**
 * Performance optimization utilities for React Native components
 * 
 * This file provides utilities and examples for optimizing component performance:
 * - Component memoization with React.memo
 * - Callback memoization with useCallback
 * - Value memoization with useMemo
 * - Expensive computation optimization
 */

/**
 * Example: Memoized list item component
 * 
 * This pattern should be used for list items that:
 * - Render frequently (in FlatList, ScrollView, etc.)
 * - Have expensive render logic
 * - Receive props that don't change often
 */
export const MemoizedListItem = React.memo<{
  item: any;
  onPress: (id: string) => void;
  isSelected: boolean;
}>(
  ({ item, onPress, isSelected }) => {
    // Use useCallback for event handlers to prevent re-creating functions
    const handlePress = React.useCallback(() => {
      onPress(item.id);
    }, [onPress, item.id]);

    return (
      <div onClick={handlePress}>
        {/* Render item content */}
        {item.name} - {isSelected ? 'Selected' : 'Not selected'}
      </div>
    );
  },
  // Custom comparison function - only re-render if these change
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onPress === nextProps.onPress
    );
  }
);

/**
 * Example: Using useMemo for expensive computations
 * 
 * Use this pattern when:
 * - Computing derived data from props/state
 * - Filtering/sorting large arrays
 * - Complex calculations
 */
export function useExpensiveComputationExample(orders: any[]) {
  // Memoize expensive filtering/sorting operations
  const activeOrders = React.useMemo(() => {
    return orders
      .filter(order => order.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // Memoize expensive aggregations
  const totalRevenue = React.useMemo(() => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  return { activeOrders, totalRevenue };
}

/**
 * Example: Using useCallback for event handlers
 * 
 * Use this pattern when:
 * - Passing callbacks to memoized child components
 * - Callbacks are used in useEffect dependencies
 * - Preventing unnecessary re-renders
 */
export function useCallbackExample() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Memoize callback to prevent re-creating on every render
  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(id);
  }, []); // Empty deps because setSelectedId is stable

  // Memoize callback with dependencies
  const handleDelete = React.useCallback((id: string) => {
    if (id === selectedId) {
      setSelectedId(null);
    }
    // Delete logic here
  }, [selectedId]); // Re-create only when selectedId changes

  return { handleSelect, handleDelete };
}

/**
 * Example: Optimizing component with multiple memoizations
 * 
 * This shows how to combine React.memo, useMemo, and useCallback
 * for maximum performance optimization
 */
export const OptimizedComponent = React.memo<{
  data: any[];
  onItemPress: (id: string) => void;
  filter: string;
}>(({ data, onItemPress, filter }) => {
  // Memoize filtered data
  const filteredData = React.useMemo(() => {
    return data.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  // Memoize expensive computation
  const statistics = React.useMemo(() => {
    return {
      total: filteredData.length,
      average: filteredData.reduce((sum, item) => sum + item.value, 0) / filteredData.length,
    };
  }, [filteredData]);

  // Memoize callback
  const handlePress = React.useCallback((id: string) => {
    onItemPress(id);
  }, [onItemPress]);

  return (
    <div>
      <div>Total: {statistics.total}, Average: {statistics.average.toFixed(2)}</div>
      {filteredData.map(item => (
        <MemoizedListItem
          key={item.id}
          item={item}
          onPress={handlePress}
          isSelected={false}
        />
      ))}
    </div>
  );
});

/**
 * Performance optimization checklist:
 * 
 * 1. Component Memoization (React.memo):
 *    - Use for components that render frequently
 *    - Add custom comparison function for complex props
 *    - Don't overuse - only for expensive components
 * 
 * 2. Callback Memoization (useCallback):
 *    - Use for callbacks passed to memoized children
 *    - Use for callbacks in useEffect dependencies
 *    - Include all dependencies in the deps array
 * 
 * 3. Value Memoization (useMemo):
 *    - Use for expensive computations
 *    - Use for derived data from props/state
 *    - Don't memoize cheap operations
 * 
 * 4. List Optimization:
 *    - Use FlatList instead of ScrollView + map
 *    - Implement getItemLayout for fixed-height items
 *    - Use keyExtractor for stable keys
 *    - Memoize renderItem callback
 * 
 * 5. State Updates:
 *    - Batch related state updates
 *    - Use functional updates for state based on previous state
 *    - Avoid unnecessary state updates
 */
