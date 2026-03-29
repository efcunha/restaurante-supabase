import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { ProductAdicional, SelectedAdicional } from '../types/models';
import { AdicionaisService } from '../services/AdicionaisService';

// ─── props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selected: SelectedAdicional[]) => void;
  product: { id: string; name: string; price: number };
  companyId: string;
  /** Adicionais pré-carregados (otimização). Se vazio, o modal carrega do DB. */
  adicionais?: ProductAdicional[];
}

// ─── helper: agrupar por categoria ─────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  molhos: '🥫 Molhos',
  extras: '🍖 Extras',
  toppings: '⭐ Toppings',
};

const CATEGORY_ORDER = ['molhos', 'extras', 'toppings'];

function groupByCategory(items: ProductAdicional[]): Array<{ category: string; label: string; items: ProductAdicional[] }> {
  const map: Record<string, ProductAdicional[]> = {};
  for (const item of items) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  return CATEGORY_ORDER
    .filter(cat => map[cat] && map[cat].length > 0)
    .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, items: map[cat] }));
}

type CategoryConstraints = {
  selectionType: 'unico' | 'multiplo';
  maxChoices?: number;
};

function computeEffectiveCategoryConstraints(categoryItems: ProductAdicional[]): CategoryConstraints {
  if (categoryItems.length === 0) {
    return { selectionType: 'multiplo' };
  }

  // Treat category as single-choice only if all items are configured as 'unico'.
  const selectionType: 'unico' | 'multiplo' = categoryItems.every(item => item.selectionType === 'unico')
    ? 'unico'
    : 'multiplo';

  if (selectionType === 'unico') {
    return { selectionType };
  }

  // Apply maxChoices only when every item defines the same positive value.
  const normalizedMaxChoices = categoryItems.map(item => (
    typeof item.maxChoices === 'number' && item.maxChoices > 0 ? item.maxChoices : null
  ));

  if (normalizedMaxChoices.some(value => value == null)) {
    return { selectionType };
  }

  const firstMaxChoices = normalizedMaxChoices[0] as number;
  const hasSameMaxChoices = normalizedMaxChoices.every(value => value === firstMaxChoices);

  return hasSameMaxChoices
    ? { selectionType, maxChoices: firstMaxChoices }
    : { selectionType };
}

// ─── componente ────────────────────────────────────────────────────────────────
export default function AdicionaisPickerModal({ visible, onClose, onConfirm, product, companyId, adicionais: adicionaisProp }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [adicionais, setAdicionais] = useState<ProductAdicional[]>(adicionaisProp ?? []);
  const [loading, setLoading] = useState(false);

  // Ao abrir, sempre sincroniza com o DB para evitar regras desatualizadas no cache local.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setSelected({});
    const fallback = adicionaisProp ?? [];
    setAdicionais(fallback);
    if (!product.id || !companyId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    AdicionaisService.fetchByProduct(product.id, companyId)
      .then(data => {
        if (!cancelled) setAdicionais(data);
      })
      .catch(() => {
        if (!cancelled) setAdicionais(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, product.id, companyId, adicionaisProp]);

  const groups = groupByCategory(adicionais);

  const toggle = useCallback((adicional: ProductAdicional) => {
    const cat = adicional.category;
    const groupItems = adicionais.filter(a => a.category === cat);
    const { selectionType, maxChoices } = computeEffectiveCategoryConstraints(groupItems);

    setSelected(prev => {
      const next = { ...prev };

      if (next[adicional.id]) {
        // Deselect
        delete next[adicional.id];
        return next;
      }

      // For category-level 'unico': deselect all others in this category first.
      if (selectionType === 'unico') {
        for (const item of groupItems) {
          delete next[item.id];
        }
        next[adicional.id] = true;
        return next;
      }

      // For 'multiplo' with max_choices: check limit per category.
      if (maxChoices != null) {
        const currentCount = groupItems.filter(a => next[a.id]).length;
        if (currentCount >= maxChoices) return prev;
      }

      next[adicional.id] = true;
      return next;
    });
  }, [adicionais]);

  const selectedAdicionais = adicionais.filter(a => selected[a.id]);
  const adicionaisTotal = selectedAdicionais.reduce((sum, a) => sum + a.price, 0);
  const finalTotal = product.price + adicionaisTotal;

  const handleConfirm = () => {
    const result: SelectedAdicional[] = selectedAdicionais.map(a => ({
      adicionalId: a.id,
      name: a.name,
      price: a.price,
      category: a.category,
    }));
    onConfirm(result);
    setSelected({});
  };

  const handleClose = () => {
    setSelected({});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.subtitle}>Escolha os adicionais</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : adicionais.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum adicional configurado para esta porção.{`\n`}Toque em "Adicionar" para incluir sem extras.</Text>
            ) : (
              groups.map(group => {
                const { maxChoices } = computeEffectiveCategoryConstraints(group.items);
                return (
                  <View key={group.category} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.label}</Text>
                    {group.items.map(item => {
                      const isSelected = !!selected[item.id];
                      const catSelectedCount = group.items.filter(a => selected[a.id]).length;
                      const atLimit = maxChoices != null && !isSelected && catSelectedCount >= maxChoices;

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.adItem, isSelected && styles.adItemSelected, atLimit && styles.adItemDisabled]}
                          onPress={() => !atLimit && toggle(item)}
                          activeOpacity={atLimit ? 1 : 0.7}
                        >
                          <View style={styles.adInfo}>
                            <Text style={[styles.adName, isSelected && styles.adNameSelected]}>{item.name}</Text>
                            {item.description ? (
                              <Text style={styles.adDesc}>{item.description}</Text>
                            ) : null}
                          </View>
                          <View style={styles.adRight}>
                            <Text style={[styles.adPrice, isSelected && styles.adPriceSelected]}>
                              {item.price === 0 ? 'Grátis' : `+R$ ${item.price.toFixed(2)}`}
                            </Text>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer com total e botão */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base:</Text>
              <Text style={styles.totalValue}>R$ {product.price.toFixed(2)}</Text>
            </View>
            {adicionaisTotal > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Adicionais:</Text>
                <Text style={styles.totalValue}>+R$ {adicionaisTotal.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalFinal]}>
              <Text style={styles.totalFinalLabel}>Total:</Text>
              <Text style={styles.totalFinalValue}>R$ {finalTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>
                {selectedAdicionais.length > 0
                  ? `Adicionar ao pedido · R$ ${finalTotal.toFixed(2)}`
                  : 'Adicionar sem adicionais'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background || '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#888',
    marginTop: 2,
  },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 20, color: colors.textSecondary || '#888' },
  scroll: { padding: 16, paddingBottom: 8 },
  emptyText: { color: colors.textSecondary || '#888', textAlign: 'center', marginVertical: 24, fontSize: 14, lineHeight: 22 },
  group: { marginBottom: 20 },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  adItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  adItemSelected: {
    backgroundColor: '#eef4ff',
    borderColor: colors.primary,
  },
  adItemDisabled: {
    opacity: 0.5,
  },
  adInfo: { flex: 1 },
  adName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  adNameSelected: { color: colors.primary },
  adDesc: {
    fontSize: 12,
    color: colors.textSecondary || '#888',
    marginTop: 2,
  },
  adRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  adPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary || '#888',
  },
  adPriceSelected: { color: colors.primary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white || '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary || '#888',
  },
  totalValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  totalFinal: {
    marginTop: 6,
    marginBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalFinalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  confirmBtn: {
    backgroundColor: colors.success || '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.white || '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
