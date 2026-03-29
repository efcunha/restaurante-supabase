import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { AdicionaisService } from '../../../services/AdicionaisService';
import { ProductAdicional } from '../../../types/models';

// ─── tipos de categoria e seleção ────────────────────────────────────────────
const CATEGORIES: { value: ProductAdicional['category']; label: string }[] = [
  { value: 'molhos', label: '🥫 Molhos' },
  { value: 'extras', label: '🍖 Extras' },
  { value: 'toppings', label: '⭐ Toppings' },
];

const SELECTION_TYPES: { value: ProductAdicional['selectionType']; label: string }[] = [
  { value: 'unico', label: 'Escolha única' },
  { value: 'multiplo', label: 'Múltipla escolha' },
];

// ─── props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  product: { id: string; name: string };
  companyId: string;
}

// ─── form inicial vazio ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'extras' as ProductAdicional['category'],
  selectionType: 'multiplo' as ProductAdicional['selectionType'],
  maxChoices: '',
  active: true,
};

type CategorySetting = {
  selectionType: ProductAdicional['selectionType'];
  maxChoices: string;
};

const DEFAULT_CATEGORY_SETTINGS: Record<ProductAdicional['category'], CategorySetting> = {
  molhos: { selectionType: 'multiplo', maxChoices: '' },
  extras: { selectionType: 'multiplo', maxChoices: '' },
  toppings: { selectionType: 'multiplo', maxChoices: '' },
};

function normalizeCategoryConstraints(
  selectionType: ProductAdicional['selectionType'],
  maxChoices: number | undefined
): { selectionType: ProductAdicional['selectionType']; maxChoices: number | undefined } {
  if (selectionType === 'unico') {
    return { selectionType: 'unico', maxChoices: undefined };
  }
  return { selectionType: 'multiplo', maxChoices };
}

function buildCategorySettingsFromAdicionais(items: ProductAdicional[]): Record<ProductAdicional['category'], CategorySetting> {
  const next = {
    molhos: { ...DEFAULT_CATEGORY_SETTINGS.molhos },
    extras: { ...DEFAULT_CATEGORY_SETTINGS.extras },
    toppings: { ...DEFAULT_CATEGORY_SETTINGS.toppings },
  };

  CATEGORIES.forEach(({ value }) => {
    const group = items.filter(item => item.category === value);
    if (group.length === 0) return;

    const firstSelection = group[0].selectionType;
    const selectionType = group.every(item => item.selectionType === firstSelection)
      ? firstSelection
      : 'multiplo';

    const firstMax = group[0].maxChoices;
    const hasSameMax = group.every(item => item.maxChoices === firstMax);
    const maxChoices = hasSameMax && firstMax != null ? String(firstMax) : '';

    next[value] = { selectionType, maxChoices };
  });

  return next;
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function AdicionaisConfigModal({ visible, onClose, product, companyId }: Props) {
  const [adicionais, setAdicionais] = useState<ProductAdicional[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryApplying, setCategoryApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductAdicional['category']>('molhos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [categorySettings, setCategorySettings] = useState<Record<ProductAdicional['category'], CategorySetting>>({
    molhos: { ...DEFAULT_CATEGORY_SETTINGS.molhos },
    extras: { ...DEFAULT_CATEGORY_SETTINGS.extras },
    toppings: { ...DEFAULT_CATEGORY_SETTINGS.toppings },
  });

  // ─── carregar adicionais ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!product.id || !companyId) return;
    setLoading(true);
    try {
      const data = await AdicionaisService.fetchAllByProduct(product.id, companyId);
      setAdicionais(data);
      setCategorySettings(buildCategorySettingsFromAdicionais(data));
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível carregar os adicionais.');
    } finally {
      setLoading(false);
    }
  }, [product.id, companyId]);

  useEffect(() => {
    if (visible) {
      load();
      setCategorySettings({
        molhos: { ...DEFAULT_CATEGORY_SETTINGS.molhos },
        extras: { ...DEFAULT_CATEGORY_SETTINGS.extras },
        toppings: { ...DEFAULT_CATEGORY_SETTINGS.toppings },
      });
      setForm({
        ...EMPTY_FORM,
        category: activeTab,
        selectionType: categorySettings[activeTab].selectionType,
        maxChoices: categorySettings[activeTab].maxChoices,
      });
      setEditingId(null);
    }
  }, [visible, load]);

  // ─── helpers de form ──────────────────────────────────────────────────────
  const setField = (key: keyof typeof EMPTY_FORM, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const applyCategorySettingsToForm = useCallback((category: ProductAdicional['category']) => {
    setForm(prev => ({
      ...prev,
      category,
      selectionType: categorySettings[category].selectionType,
      maxChoices: categorySettings[category].maxChoices,
    }));
  }, [categorySettings]);

  const updateCategorySetting = useCallback((
    category: ProductAdicional['category'],
    changes: Partial<CategorySetting>
  ) => {
    setCategorySettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...changes,
      },
    }));
  }, []);

  const syncCategoryConstraints = useCallback(async (
    category: ProductAdicional['category'],
    selectionType: ProductAdicional['selectionType'],
    maxChoices: number | undefined
  ) => {
    if (!product.id || !companyId) return;

    const normalized = normalizeCategoryConstraints(selectionType, maxChoices);
    const currentItems = await AdicionaisService.fetchAllByProduct(product.id, companyId);
    const categoryItems = currentItems.filter(item => item.category === category);

    if (categoryItems.length === 0) return;

    const updates = categoryItems
      .filter(item => (
        item.selectionType !== normalized.selectionType || item.maxChoices !== normalized.maxChoices
      ))
      .map(item => AdicionaisService.update(item.id, {
        selectionType: normalized.selectionType,
        maxChoices: normalized.maxChoices,
      }));

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }, [product.id, companyId]);

  // ─── salvar configuração da categoria ─────────────────────────────────────
  const handleSaveCategorySettings = useCallback(async () => {
    const settings = categorySettings[activeTab];
    const maxChoicesVal = settings.selectionType === 'multiplo' && settings.maxChoices.trim()
      ? parseInt(settings.maxChoices, 10)
      : undefined;
    if (
      settings.selectionType === 'multiplo' &&
      settings.maxChoices.trim() &&
      (isNaN(maxChoicesVal!) || maxChoicesVal! < 1)
    ) {
      Alert.alert('Validação', 'Máximo de escolhas deve ser um número inteiro ≥ 1.');
      return;
    }
    setCategoryApplying(true);
    try {
      await syncCategoryConstraints(activeTab, settings.selectionType, maxChoicesVal);
      await load();
    } catch (e: any) {
      Alert.alert('Erro', `Não foi possível salvar: ${e?.message || e}`);
    } finally {
      setCategoryApplying(false);
    }
  }, [activeTab, categorySettings, syncCategoryConstraints, load]);

  const startEdit = (item: ProductAdicional) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      selectionType: item.selectionType,
      maxChoices: item.maxChoices != null ? item.maxChoices.toString() : '',
      active: item.active,
    });
    setActiveTab(item.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    applyCategorySettingsToForm(activeTab);
  };

  // ─── salvar (criar ou atualizar) ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validação', 'O nome do adicional é obrigatório.');
      return;
    }
    const priceVal = parseFloat(form.price.replace(',', '.'));
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Validação', 'Informe um preço válido (0 ou mais).');
      return;
    }
    // selectionType e maxChoices vêm das configurações da categoria, não do form individual.
    const catSettings = categorySettings[form.category];
    const catMaxVal = catSettings.selectionType === 'multiplo' && catSettings.maxChoices.trim()
      ? parseInt(catSettings.maxChoices, 10)
      : undefined;
    const normalized = normalizeCategoryConstraints(catSettings.selectionType, catMaxVal);

    setSaving(true);
    try {
      if (editingId) {
        const previousItem = adicionais.find(item => item.id === editingId);

        await AdicionaisService.update(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: priceVal,
          category: form.category,
          selectionType: normalized.selectionType,
          maxChoices: normalized.maxChoices,
          active: form.active,
        });

        await syncCategoryConstraints(form.category, normalized.selectionType, normalized.maxChoices);
        if (previousItem && previousItem.category !== form.category) {
          await syncCategoryConstraints(previousItem.category, previousItem.selectionType, previousItem.maxChoices);
        }
      } else {
        await syncCategoryConstraints(form.category, normalized.selectionType, normalized.maxChoices);

        const nextOrder =
          adicionais.filter(a => a.category === form.category).length * 10 + 10;
        await AdicionaisService.create({
          companyId,
          productId: product.id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: priceVal,
          category: form.category,
          selectionType: normalized.selectionType,
          maxChoices: normalized.maxChoices,
          displayOrder: nextOrder,
          active: form.active,
        });

        await syncCategoryConstraints(form.category, normalized.selectionType, normalized.maxChoices);
      }
      await load();
      cancelEdit();
    } catch (e: any) {
      Alert.alert('Erro', `Não foi possível salvar: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── remover ──────────────────────────────────────────────────────────────
  const handleDelete = (item: ProductAdicional) => {
    Alert.alert(
      'Remover adicional',
      `Deseja remover "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdicionaisService.delete(item.id);
              await load();
              if (editingId === item.id) cancelEdit();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover.');
            }
          },
        },
      ]
    );
  };

  // ─── toggle ativo ─────────────────────────────────────────────────────────
  const handleToggleActive = async (item: ProductAdicional) => {
    try {
      await AdicionaisService.update(item.id, { active: !item.active });
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar.');
    }
  };

  const filtered = adicionais.filter(a => a.category === activeTab);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🍟 Adicionais — {product.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs por categoria */}
          <View style={styles.tabs}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.tab, activeTab === cat.value && styles.tabActive]}
                onPress={() => {
                  setActiveTab(cat.value);
                  if (!editingId) applyCategorySettingsToForm(cat.value);
                }}
              >
                <Text style={[styles.tabText, activeTab === cat.value && styles.tabTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Lista de adicionais da categoria ativa */}
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                {/* ── Configuração da categoria ─────────────────────── */}
                <View style={styles.categoryCfgCard}>
                  <Text style={styles.categoryCfgTitle}>⚙️ Configuração desta categoria</Text>
                  <Text style={styles.label}>Tipo de seleção</Text>
                  <View style={styles.segmentRow}>
                    {SELECTION_TYPES.map(st => (
                      <TouchableOpacity
                        key={st.value}
                        style={[styles.segment, categorySettings[activeTab].selectionType === st.value && styles.segmentActive]}
                        onPress={() =>
                          setCategorySettings(prev => ({
                            ...prev,
                            [activeTab]: {
                              selectionType: st.value as ProductAdicional['selectionType'],
                              maxChoices: st.value === 'unico' ? '' : prev[activeTab].maxChoices,
                            },
                          }))
                        }
                      >
                        <Text style={[styles.segmentText, categorySettings[activeTab].selectionType === st.value && styles.segmentTextActive]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.label, categorySettings[activeTab].selectionType === 'unico' && { opacity: 0.4 }]}>
                    {categorySettings[activeTab].selectionType === 'unico' ? 'Máx. escolhas (N/A — escolha única)' : 'Máx. escolhas (vazio = sem limite)'}
                  </Text>
                  <TextInput
                    style={[styles.input, categorySettings[activeTab].selectionType === 'unico' && { opacity: 0.4, backgroundColor: '#f0f0f0' }]}
                    value={categorySettings[activeTab].selectionType === 'unico' ? '' : categorySettings[activeTab].maxChoices}
                    editable={categorySettings[activeTab].selectionType !== 'unico'}
                    onChangeText={v => updateCategorySetting(activeTab, { maxChoices: v })}
                    keyboardType="number-pad"
                    placeholder={categorySettings[activeTab].selectionType === 'unico' ? '—' : 'Ex: 3'}
                    placeholderTextColor={colors.disabled}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 0, marginTop: 12 }, categoryApplying && { opacity: 0.6 }]}
                    onPress={handleSaveCategorySettings}
                    disabled={categoryApplying}
                  >
                    {categoryApplying
                      ? <ActivityIndicator color={colors.white} size="small" />
                      : <Text style={styles.saveBtnText}>✓ Aplicar configuração</Text>
                    }
                  </TouchableOpacity>
                </View>
                {filtered.length === 0 && (
                  <Text style={styles.emptyText}>Nenhum adicional nesta categoria ainda.</Text>
                )}
                {filtered.map(item => (
                  <View key={item.id} style={[styles.itemRow, !item.active && styles.itemRowInactive]}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      ) : null}
                      <Text style={styles.itemPrice}>
                        {item.price === 0 ? 'Grátis' : `R$ ${item.price.toFixed(2)}`}
                        {' · '}
                        {item.selectionType === 'unico' ? 'Único' : 'Múltiplo'}
                        {item.maxChoices ? ` · máx ${item.maxChoices}` : ''}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Switch
                        value={item.active}
                        onValueChange={() => handleToggleActive(item)}
                        trackColor={{ false: colors.disabled, true: colors.success }}
                        thumbColor={colors.white}
                      />
                      <TouchableOpacity onPress={() => startEdit(item)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Formulário de adição/edição */}
                <View style={styles.formSection}>
                  <Text style={styles.formTitle}>{editingId ? '✏️ Editar adicional' : '➕ Novo adicional'}</Text>

                  <Text style={styles.label}>Nome *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={v => setField('name', v)}
                    placeholder="Ex: Bacon crocante"
                    placeholderTextColor={colors.disabled}
                  />

                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    style={styles.input}
                    value={form.description}
                    onChangeText={v => setField('description', v)}
                    placeholder="Opcional"
                    placeholderTextColor={colors.disabled}
                  />

                  <Text style={styles.label}>Preço (R$) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.price}
                    onChangeText={v => setField('price', v)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.disabled}
                  />

                  <Text style={styles.label}>Categoria</Text>
                  <View style={styles.segmentRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.segment, form.category === cat.value && styles.segmentActive]}
                        onPress={() => {
                          if (editingId) {
                            setField('category', cat.value);
                            return;
                          }
                          setActiveTab(cat.value);
                          applyCategorySettingsToForm(cat.value);
                        }}
                      >
                        <Text style={[styles.segmentText, form.category === cat.value && styles.segmentTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.activeRow}>
                    <Text style={styles.label}>Ativo</Text>
                    <Switch
                      value={form.active}
                      onValueChange={v => setField('active', v)}
                      trackColor={{ false: colors.disabled, true: colors.success }}
                      thumbColor={colors.white}
                    />
                  </View>

                  <View style={styles.formButtons}>
                    {editingId && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>{editingId ? 'Salvar alterações' : 'Adicionar'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── estilos ──────────────────────────────────────────────────────────────────
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
    maxHeight: '90%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary || '#888',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary || '#888',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    color: colors.textSecondary || '#888',
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemRowInactive: {
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textSecondary || '#888',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  iconBtnText: {
    fontSize: 16,
  },
  formSection: {
    marginTop: 20,
    backgroundColor: '#f4f6fb',
    borderRadius: 12,
    padding: 14,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary || '#888',
    marginBottom: 4,
    marginTop: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.white || '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: colors.white || '#fff',
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    color: colors.text,
  },
  segmentTextActive: {
    color: colors.white || '#fff',
    fontWeight: '700',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger || '#e74c3c',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.danger || '#e74c3c',
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.white || '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  categoryCfgCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  categoryCfgTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 2,
  },
});
