
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { Product } from '../../../types';

import { StockItem } from './types';

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
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
           <View style={styles.header}>
             <Text style={styles.title}>📦 Ficha Técnica</Text>
             <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
           </View>

           <Text style={styles.subtitle}>Produto: <Text style={{fontWeight: 'bold'}}>{product?.name}</Text></Text>

           {/* Selector */}
           <Text style={styles.label}>Adicionar Ingrediente do Estoque:</Text>
           <ScrollView style={styles.listContainer}>
               {stockItems.map(item => (
                   <TouchableOpacity
                       key={item.id}
                       style={[styles.itemRow, selectedStockId === item.id && styles.itemRowActive]}
                       onPress={() => setSelectedStockId(item.id)}
                   >
                       <Text style={{color: selectedStockId === item.id ? '#8B2F2F' : '#333'}}>
                           {item.nome} ({item.unidadeOriginal})
                       </Text>
                   </TouchableOpacity>
               ))}
               {stockItems.length === 0 && <Text style={styles.emptyText}>Nenhum item no estoque.</Text>}
           </ScrollView>

           {/* Inputs */}
           <View style={styles.inputRow}>
               <TextInput
                   style={[styles.input, { flex: 0.4 }]}
                   placeholder="Qtd (Receita)"
                   value={qty}
                   onChangeText={setQty}
                   keyboardType="numeric"
               />
               <View style={{ flex: 0.6 }}>
                   <View style={styles.tabs}>
                       {['QUANTITY', 'VOLUME', 'MASS'].map(t => (
                           <TouchableOpacity 
                             key={t} 
                             onPress={() => setUnitType(t as any)}
                             style={[styles.tab, unitType === t && styles.tabActive]}
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
                           >
                               <Text style={{color: unit === u ? '#FFF' : '#333', fontWeight: 'bold'}}>{u}</Text>
                           </TouchableOpacity>
                       ))}
                   </ScrollView>
               </View>
           </View>

           <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
               <Text style={styles.addBtnText}>+ Adicionar Ingrediente</Text>
           </TouchableOpacity>

           {/* Linked List */}
           <Text style={[styles.label, { marginTop: 20 }]}>Ingredientes Vinculados:</Text>
           <ScrollView style={{ maxHeight: 200 }}>
                {(!product?.inventoryItems || product.inventoryItems.length === 0) ? (
                    <Text style={styles.emptyText}>Nenhum ingrediente vinculado.</Text>
                ) : (
                    product.inventoryItems.map((ing: any, idx: number) => (
                        <View key={idx} style={styles.linkedRow}>
                            <Text style={{ flex: 1 }}>{ing.nome} - {ing.qt} {ing.un}</Text>
                            <TouchableOpacity onPress={() => onRemoveIngredient(ing.id)}>
                                <Text style={{ color: '#F44336' }}>🗑️</Text>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: '#FFF', width: '100%', maxWidth: 500, borderRadius: 20, padding: 20, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#8B2F2F' },
    close: { fontSize: 24, color: '#999', padding: 5 },
    subtitle: { fontSize: 16, marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
    listContainer: { maxHeight: 150, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 10 },
    itemRow: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
    itemRowActive: { backgroundColor: '#FFE4B5' },
    emptyText: { color: '#999', fontStyle: 'italic', padding: 10 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    input: { backgroundColor: '#F5F1E8', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', borderColor: '#B45309', borderWidth: 1 },
    tabs: { flexDirection: 'row', marginBottom: 5 },
    tab: { flex: 1, alignItems: 'center', padding: 5, borderBottomWidth: 2, borderColor: 'transparent' },
    tabActive: { borderColor: '#8B2F2F' },
    tabText: { fontSize: 12, color: '#999' },
    tabTextActive: { color: '#8B2F2F', fontWeight: 'bold' },
    unitBtn: { padding: 8, backgroundColor: '#eee', borderRadius: 8, marginRight: 5, minWidth: 40, alignItems: 'center' },
    unitBtnActive: { backgroundColor: '#8B2F2F' },
    addBtn: { backgroundColor: '#8B2F2F', padding: 12, borderRadius: 10, alignItems: 'center' },
    addBtnText: { color: '#FFF', fontWeight: 'bold' },
    linkedRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }
});
