
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PizzaSize, PizzaConfig } from '../../../types';

interface MenuSettingsProps {
    visible: boolean;
    onClose: () => void;
    
    // Data
    pizzaConfig?: PizzaConfig;
    caldosList: string[];
    
    // Handlers
    onSaveListas: (listas: { caldos?: string[] }) => Promise<void>;
    onSavePizzaSizes: (sizes: PizzaSize[]) => Promise<void>;
}

export default function MenuSettings({
    visible,
    onClose,
    pizzaConfig,
    caldosList = [],
    onSaveListas,
    onSavePizzaSizes
}: MenuSettingsProps) {
    const [activeTab, setActiveTab] = useState<'pizza' | 'caldos'>('pizza');
    
    // Pizza Size State
    const [sizes, setSizes] = useState<PizzaSize[]>(pizzaConfig?.sizes || []);
    const [editingSizeIdx, setEditingSizeIdx] = useState(-1);
    const [newSizeName, setNewSizeName] = useState('');
    const [newSizeFlavors, setNewSizeFlavors] = useState('');

    // Caldo State
    const [localCaldos, setLocalCaldos] = useState<string[]>(caldosList);
    const [newCaldo, setNewCaldo] = useState('');
    const [editingCaldoIdx, setEditingCaldoIdx] = useState(-1);

    // Pizza Handlers
    const handleAddSize = () => {
        if (!newSizeName) return;
        const newSize: PizzaSize = {
            name: newSizeName,
            maxFlavors: parseInt(newSizeFlavors) || 1,
            active: true
        };
        if (editingSizeIdx >= 0) {
            const updated = [...sizes];
            updated[editingSizeIdx] = newSize;
            setSizes(updated);
            setEditingSizeIdx(-1);
        } else {
            setSizes([...sizes, newSize]);
        }
        setNewSizeName('');
        setNewSizeFlavors('');
    };

    const handleEditSize = (idx: number) => {
        setNewSizeName(sizes[idx].name);
        setNewSizeFlavors(sizes[idx].maxFlavors.toString());
        setEditingSizeIdx(idx);
    };

    const handleRemoveSize = (idx: number) => {
        const updated = sizes.filter((_, i) => i !== idx);
        setSizes(updated);
    };

    const handleToggleSize = (idx: number) => {
        const updated = [...sizes];
        updated[idx].active = !updated[idx].active;
        setSizes(updated);
    };

    // Caldo Handlers
    const handleAddCaldo = () => {
        if (!newCaldo) return;
        if (editingCaldoIdx >= 0) {
             const updated = [...localCaldos];
             updated[editingCaldoIdx] = newCaldo;
             setLocalCaldos(updated);
             setEditingCaldoIdx(-1);
        } else {
            setLocalCaldos([...localCaldos, newCaldo]);
        }
        setNewCaldo('');
    };

    const handleSaveAll = async () => {
        await onSavePizzaSizes(sizes);
        await onSaveListas({ caldos: localCaldos });
        onClose();
    };


    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>⚙️ Configurações do Cardápio</Text>
                        <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
                    </View>

                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, activeTab === 'pizza' && styles.tabActive]} onPress={() => setActiveTab('pizza')}>
                            <Text style={[styles.tabText, activeTab === 'pizza' && styles.tabTextActive]}>Tamanhos Pizza</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeTab === 'caldos' && styles.tabActive]} onPress={() => setActiveTab('caldos')}>
                            <Text style={[styles.tabText, activeTab === 'caldos' && styles.tabTextActive]}>Opções de Caldos</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{flex: 1}}>
                        {activeTab === 'pizza' ? (
                            <View>
                                <View style={styles.addRow}>
                                    <TextInput 
                                        style={[styles.input, {flex: 2}]} 
                                        placeholder="Nome (ex: Grande)" 
                                        value={newSizeName} 
                                        onChangeText={setNewSizeName}
                                    />
                                    <TextInput 
                                        style={[styles.input, {flex: 1}]} 
                                        placeholder="Sabores" 
                                        keyboardType="numeric"
                                        value={newSizeFlavors} 
                                        onChangeText={setNewSizeFlavors}
                                    />
                                    <TouchableOpacity style={styles.addBtn} onPress={handleAddSize}>
                                        <Ionicons name={editingSizeIdx >= 0 ? "checkmark" : "add"} size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                {sizes.map((size, idx) => (
                                    <View key={idx} style={styles.row}>
                                        <Text style={styles.rowText}>{size.name} ({size.maxFlavors} sab) {size.active === false ? '(Off)' : ''}</Text>
                                        <View style={styles.actions}>
                                            <TouchableOpacity onPress={() => handleToggleSize(idx)}>
                                                <Ionicons name={size.active !== false ? "eye" : "eye-off"} size={20} color={size.active !== false ? "green" : "gray"} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleEditSize(idx)}>
                                                <Ionicons name="pencil" size={20} color="#444" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleRemoveSize(idx)}>
                                                <Ionicons name="trash" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                             <View>
                                <View style={styles.addRow}>
                                    <TextInput 
                                        style={[styles.input, {flex: 1}]} 
                                        placeholder="Item (ex: Com Torrada)" 
                                        value={newCaldo} 
                                        onChangeText={setNewCaldo}
                                    />
                                    <TouchableOpacity style={styles.addBtn} onPress={handleAddCaldo}>
                                        <Ionicons name={editingCaldoIdx >= 0 ? "checkmark" : "add"} size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                {localCaldos.map((item, idx) => (
                                    <View key={idx} style={styles.row}>
                                        <Text style={styles.rowText}>{item}</Text>
                                        <View style={styles.actions}>
                                            <TouchableOpacity onPress={() => { setNewCaldo(item); setEditingCaldoIdx(idx); }}>
                                                <Ionicons name="pencil" size={20} color="#444" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => {
                                                const updated = localCaldos.filter((_, i) => i !== idx);
                                                setLocalCaldos(updated);
                                            }}>
                                                <Ionicons name="trash" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
                        <Text style={styles.saveText}>SALVAR CONFIGURAÇÕES</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: '#FFF', width: '100%', maxWidth: 500, borderRadius: 20, padding: 20, maxHeight: '90%', height: 600 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#8B2F2F' },
    close: { fontSize: 24, color: '#999', padding: 5 },
    tabs: { flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderColor: 'transparent' },
    tabActive: { borderColor: '#8B2F2F' },
    tabText: { color: '#999', fontWeight: 'bold' },
    tabTextActive: { color: '#8B2F2F' },
    addRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    input: { backgroundColor: '#F5F1E8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eee' },
    addBtn: { backgroundColor: '#8B2F2F', padding: 10, borderRadius: 8, justifyContent: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
    rowText: { fontSize: 16, color: '#333' },
    actions: { flexDirection: 'row', gap: 10 },
    saveBtn: { backgroundColor: '#8B2F2F', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
