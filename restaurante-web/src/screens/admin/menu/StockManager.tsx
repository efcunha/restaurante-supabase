
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { Product } from '../../../types';

import { StockItem } from './types';
import { colors } from '../../../theme/colors';
import { DataListItem } from '../../../ui/DataListItem';
import { FieldRow } from '../../../ui/FieldRow';
import { FormSection } from '../../../ui/FormSection';
import { StateView } from '../../../ui/StateView';
interface StockManagerProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  stockItems: StockItem[];
  onAddIngredient: (stockId: string, qty: number, unit: string) => Promise<void>;
  onRemoveIngredient: (ingredientId: string) => Promise<void>;
}

export default function StockManager({
  visible,
  onClose,
  product,
  stockItems,
  onAddIngredient,
  onRemoveIngredient
}: StockManagerProps) {
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [unitType, setUnitType] = useState<'QUANTITY' | 'VOLUME' | 'MASS'>('QUANTITY');
  const [unit, setUnit] = useState('un');

  const unidadesUI = unitType === 'MASS' ? ['kg', 'g', 'mg'] 
                   : unitType === 'VOLUME' ? ['L', 'ml'] 
                   : ['un', 'cx', 'pct'];

  const handleAdd = () => {
      if (!selectedStockId) return Alert.alert('Selecione um item');
      if (!qty || parseFloat(qty) <= 0) return Alert.alert('Quantidade inválida');
      onAddIngredient(selectedStockId, parseFloat(qty.replace(',', '.')), unit);
      setQty('');
  };

  return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
                <View style={styles.content} accessibilityViewIsModal accessibilityLabel="Modal de ficha tecnica e estoque">
           <View style={styles.header}>
             <Text style={styles.title}>📦 Ficha Técnica</Text>
                         <TouchableOpacity
                             onPress={onClose}
                             accessibilityRole="button"
                             accessibilityLabel="Fechar ficha tecnica"
                         >
                             <Text style={styles.close}>✕</Text>
                         </TouchableOpacity>
           </View>

           <Text style={styles.subtitle}>Produto: <Text style={{fontWeight: 'bold'}}>{product?.name}</Text></Text>

           <FormSection title="Adicionar ingrediente" description="Selecione um item do estoque e informe a quantidade da receita.">
           <ScrollView style={styles.listContainer}>
               {stockItems.map(item => (
                   <TouchableOpacity
                       key={item.id}
                       style={[styles.itemRow, selectedStockId === item.id && styles.itemRowActive]}
                       onPress={() => setSelectedStockId(item.id)}
                       accessibilityRole="button"
                       accessibilityLabel={`Selecionar item de estoque ${item.nome}`}
                   >
                     <DataListItem
                       title={item.nome}
                       subtitle={`Unidade base: ${item.unidadeOriginal}`}
                       status={selectedStockId === item.id ? 'success' : 'default'}
                     />
                   </TouchableOpacity>
               ))}
               {stockItems.length === 0 && <StateView state="empty" message="Nenhum item no estoque." />}
           </ScrollView>

           {/* Inputs */}
           <View style={styles.inputRow}>
               <FieldRow label="Quantidade da receita" required>
               <TextInput
                   style={[styles.input, { flex: 0.4 }]}
                   placeholder="Qtd (Receita)"
                   value={qty}
                   onChangeText={setQty}
                   keyboardType="numeric"
                   accessibilityLabel="Quantidade da receita"
                   autoFocus
               />
               </FieldRow>
               <View style={{ flex: 0.6 }}>
                   <View style={styles.tabs}>
                       {['QUANTITY', 'VOLUME', 'MASS'].map(t => (
                           <TouchableOpacity 
                             key={t} 
                             onPress={() => setUnitType(t as any)}
                             style={[styles.tab, unitType === t && styles.tabActive]}
                                                         accessibilityRole="button"
                                                         accessibilityLabel={`Selecionar tipo de unidade ${t}`}
                           >
                               <Text style={[styles.tabText, unitType === t && styles.tabTextActive]}>
                                   {t === 'QUANTITY' ? 'Unid' : t === 'VOLUME' ? 'Vol' : 'Peso'}
                               </Text>
                           </TouchableOpacity>
                       ))}
                   </View>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                       {unidadesUI.map(u => (
                           <TouchableOpacity 
                               key={u} 
                               style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                               onPress={() => setUnit(u)}
                               accessibilityRole="button"
                               accessibilityLabel={`Selecionar unidade ${u}`}
                           >
                            <Text style={{color: unit === u ? colors.white : colors.text, fontWeight: 'bold'}}>{u}</Text>
                           </TouchableOpacity>
                       ))}
                   </ScrollView>
               </View>
           </View>

                     <TouchableOpacity
                         style={styles.addBtn}
                         onPress={handleAdd}
                         accessibilityRole="button"
                         accessibilityLabel="Adicionar ingrediente a ficha tecnica"
                     >
               <Text style={styles.addBtnText}>+ Adicionar Ingrediente</Text>
           </TouchableOpacity>
           </FormSection>

           {/* Linked List */}
           <Text style={[styles.label, { marginTop: 20 }]}>Ingredientes vinculados:</Text>
           <ScrollView style={{ maxHeight: 200 }}>
                {(!product?.inventoryItems || product.inventoryItems.length === 0) ? (
                    <StateView state="empty" message="Nenhum ingrediente vinculado." />
                ) : (
                    product.inventoryItems.map((ing: any, idx: number) => (
                        <View key={idx} style={styles.linkedRow}>
                            <Text style={{ flex: 1 }}>{ing.nome} - {ing.qt} {ing.un}</Text>
                                                        <TouchableOpacity
                                                            onPress={() => onRemoveIngredient(ing.id)}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Remover ingrediente ${ing.nome}`}
                                                        >
                                <Text style={{ color: colors.danger }}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
           </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: colors.white, width: '100%', maxWidth: 500, borderRadius: 20, padding: 20, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
    close: { fontSize: 24, color: colors.textSecondary, padding: 5 },
    subtitle: { fontSize: 16, marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    listContainer: { maxHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 10 },
    itemRow: { padding: 10, borderBottomWidth: 1, borderColor: colors.border },
    itemRowActive: { backgroundColor: colors.warningSurface },
    emptyText: { color: colors.textSecondary, fontStyle: 'italic', padding: 10 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    input: { backgroundColor: colors.background, borderRadius: 12, padding: 15, fontSize: 16, color: colors.text, borderColor: colors.secondary, borderWidth: 1 },
    tabs: { flexDirection: 'row', marginBottom: 5 },
    tab: { flex: 1, alignItems: 'center', padding: 5, borderBottomWidth: 2, borderColor: 'transparent' },
    tabActive: { borderColor: colors.primary },
    tabText: { fontSize: 12, color: colors.textSecondary },
    tabTextActive: { color: colors.primary, fontWeight: 'bold' },
    unitBtn: { padding: 8, backgroundColor: colors.surfaceMuted, borderRadius: 8, marginRight: 5, minWidth: 40, alignItems: 'center' },
    unitBtnActive: { backgroundColor: colors.primary },
    addBtn: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    addBtnText: { color: colors.white, fontWeight: 'bold' },
    linkedRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: colors.border, alignItems: 'center' }
});
