
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Product } from '../../../types';
import { colors } from '../../../theme/colors';
interface ProductListProps {
  products: Product[];
  categories: { label: string; value: string }[];
  isLoading: boolean;
  onEdit: (productName: string) => void;
  onDelete: (variations: Product[]) => void;
  onToggleStatus: (variations: Product[], currentStatus: boolean) => void;
  onManageStock: (product: Product) => void;
}

export default function ProductList({
  products,
  categories,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onManageStock
}: ProductListProps) {
  const [activeCategory, setActiveCategory] = useState('todos');

  // Filter and Group Logic
  const groupedProducts = useMemo(() => {
    // 1. Filter
    const filtered = activeCategory === 'todos'
      ? products
      : products.filter(p => p.category === activeCategory);

    // 2. Group
    const groups: { [key: string]: Product[] } = {};
    
    // Sort
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(p => {
       const baseName = p.name.replace(/\s*\(.*\)\s*$/, '').trim();
       if (!groups[baseName]) groups[baseName] = [];
       groups[baseName].push(p);
    });
    return groups;
  }, [products, activeCategory]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <TouchableOpacity
            style={[styles.filterBtn, activeCategory === 'todos' && styles.filterBtnActive]}
            onPress={() => setActiveCategory('todos')}
        >
            <Text style={[styles.filterBtnText, activeCategory === 'todos' && styles.filterBtnTextActive]}>Todos</Text>
        </TouchableOpacity>
        {categories.map(cat => (
             <TouchableOpacity
                key={cat.value}
                style={[styles.filterBtn, activeCategory === cat.value && styles.filterBtnActive]}
                onPress={() => setActiveCategory(cat.value)}
            >
                <Text style={[styles.filterBtnText, activeCategory === cat.value && styles.filterBtnTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {Object.keys(groupedProducts).length === 0 ? (
         <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
         </View>
      ) : (
          Object.keys(groupedProducts).map(baseName => {
              const variations = groupedProducts[baseName];
              const first = variations[0];
              const isVisualActive = variations.some(v => v.active !== false);

              return (
                  <View key={baseName} style={styles.card}>
                      {/* LEFT: Info */}
                      <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{baseName}</Text>
                          <Text style={styles.cardSubtitle}>
                             {variations.length === 1
                                ? `R$ ${Number(first.price).toFixed(2)}`
                                : `${variations.length} variações`}
                          </Text>
                      </View>

                      {/* RIGHT: Actions */}
                      <View style={styles.cardActions}>
                           <TouchableOpacity
                                style={[styles.actionBtn, isVisualActive ? styles.btnSuccess : styles.btnDanger]}
                                onPress={() => onToggleStatus(variations, isVisualActive)}
                           >
                               <Text style={styles.btnText}>{isVisualActive ? 'ATIVO' : 'INATIVO'}</Text>
                           </TouchableOpacity>

                           <TouchableOpacity style={[styles.actionBtn, styles.btnStock]} onPress={() => onManageStock(first)}>
                               <Text style={styles.btnText}>Ficha Técnica</Text>
                           </TouchableOpacity>

                           <TouchableOpacity style={[styles.actionBtn, styles.btnEdit]} onPress={() => onEdit(baseName)}>
                               <Text style={styles.btnText}>Editar</Text>
                           </TouchableOpacity>

                           <TouchableOpacity style={[styles.actionBtn, styles.btnDelete]} onPress={() => onDelete(variations)}>
                               <Text style={styles.btnText}>Excluir</Text>
                           </TouchableOpacity>
                      </View>
                  </View>
              );
          })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    filters: { flexDirection: 'row', marginBottom: 15 },
    filterBtn: { backgroundColor: colors.white, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: colors.secondary },
    filterBtnActive: { backgroundColor: colors.secondary, borderColor: colors.primary },
    filterBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    filterBtnTextActive: { color: colors.white },
    
    loadingContainer: { padding: 40, alignItems: 'center', backgroundColor: colors.white, borderRadius: 15 },
    loadingText: { color: colors.textSecondary, marginTop: 15, fontSize: 14 },
    
    emptyContainer: { padding: 40, alignItems: 'center', backgroundColor: colors.white, borderRadius: 15 },
    emptyText: { color: colors.textSecondary, fontSize: 16 },
    
    // Original Card Style Restoration
    card: { 
        backgroundColor: colors.white, 
        borderRadius: 15, 
        padding: 15, 
        marginBottom: 12, 
        flexDirection: 'row', // Side by Side
        justifyContent: 'space-between', 
        alignItems: 'center', 
        shadowColor: colors.shadow, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.08, 
        shadowRadius: 10, 
        elevation: 3 
    },
    cardInfo: { 
        flex: 1, 
        marginRight: 10 
    },
    cardTitle: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: colors.text, 
        marginBottom: 4 
    },
    cardSubtitle: { 
        color: colors.textSecondary, 
        fontSize: 12 
    },
    
    cardActions: { 
        flexDirection: 'row', 
        gap: 8, 
        justifyContent: 'flex-end', 
        flexWrap: 'wrap', 
        maxWidth: '50%' 
    },
    
    actionBtn: { 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 8, 
        width: '48%', // Approx half of 50%?? No, let's use fixed width or flex to match behavior
        // Original used fixed width 130. If we use flexWrap with maxWidth 50%, fixed width might not fit two side-by-side unless container is wide.
        // Let's use flexible width but similar styling
        minWidth: 100,
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 5
    },
    btnSuccess: { backgroundColor: colors.success },
    btnDanger: { backgroundColor: colors.danger },
    btnStock: { backgroundColor: colors.warning },
    btnEdit: { backgroundColor: colors.secondary },
    btnDelete: { backgroundColor: colors.danger },
    btnText: { color: colors.white, fontSize: 11, fontWeight: '700' }
});
