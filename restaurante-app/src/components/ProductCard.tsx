import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    category: string;
    active?: boolean;
  };
  onPress?: (productId: string) => void;
  onToggleActive?: (productId: string) => void;
}

/**
 * ProductCard - Memoized component for displaying product information
 * 
 * Uses React.memo with custom comparison to prevent unnecessary re-renders
 * Only re-renders when product data actually changes
 */
const ProductCard = React.memo<ProductCardProps>(
  ({ product, onPress, onToggleActive }) => {
    const handlePress = React.useCallback(() => {
      onPress?.(product.id);
    }, [onPress, product.id]);

    const handleToggleActive = React.useCallback(() => {
      onToggleActive?.(product.id);
    }, [onToggleActive, product.id]);

    return (
      <TouchableOpacity
        style={[styles.card, !product.active && styles.cardInactive]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {onToggleActive && (
            <TouchableOpacity
              style={[styles.statusBadge, product.active && styles.statusBadgeActive]}
              onPress={handleToggleActive}
            >
              <Text style={styles.statusText}>
                {product.active ? 'Ativo' : 'Inativo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>
            R$ {product.price.toFixed(2)}
          </Text>
          <Text style={styles.category}>{getCategoryLabel(product.category)}</Text>
        </View>
      </TouchableOpacity>
    );
  },
  // Custom comparison function - only re-render if these properties change
  (prevProps, nextProps) => {
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.name === nextProps.product.name &&
      prevProps.product.price === nextProps.product.price &&
      prevProps.product.category === nextProps.product.category &&
      prevProps.product.active === nextProps.product.active &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.onToggleActive === nextProps.onToggleActive
    );
  }
);

ProductCard.displayName = 'ProductCard';

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'caldo': '🍲 Caldos',
    'espetinho-simples': '🔥 Espetinho',
    'espetinho-especial': '🌟 Especial',
    'porcao': '🍟 Porção',
    'bebida': '🥤 Bebida',
    'comida': '🍽️ Comida',
    'pizza': '🍕 Pizza',
    'outro': '📦 Outro',
  };
  return labels[category] || category;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  statusBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  category: {
    fontSize: 13,
    color: '#666',
  },
});

export default ProductCard;
