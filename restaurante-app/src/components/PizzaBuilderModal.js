import React, { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function PizzaBuilderModal({
    visible,
    onClose,
    onConfirm,
    sizes = [],
    pizzas = [] // Lista de produtos do tipo pizza (para pegar sabores)
}) {
    const [step, setStep] = useState(1); // 1: Tamanho, 2: Sabores
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedFlavors, setSelectedFlavors] = useState([]);
    const [searchText, setSearchText] = useState('');

    const currentSizeConfig = useMemo(() => {
        if (!selectedSize) return null;
        return sizes.find(s => s.name === selectedSize);
    }, [selectedSize, sizes]);

    const maxFlavors = currentSizeConfig?.maxFlavors || 1;

    // Filtrar sabores disponíveis
    const filteredPizzas = useMemo(() => {
        if (!searchText) return pizzas;
        return pizzas.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
    }, [pizzas, searchText]);

    const toggleFlavor = (pizza) => {
        if (selectedFlavors.find(p => p.id === pizza.id)) {
            setSelectedFlavors(prev => prev.filter(p => p.id !== pizza.id));
        } else {
            if (selectedFlavors.length >= maxFlavors) {
                // Replace last one or just block? Block is better UX usually, or simple alert
                // Let's just block/ignore
                return;
            }
            setSelectedFlavors(prev => [...prev, pizza]);
        }
    };

    const calculatePrice = () => {
        if (!selectedSize || selectedFlavors.length === 0) return 0;

        // Default strategy: HIGHER value logic from selected flavors
        const prices = selectedFlavors.map(f => {
            // f.prices should be a map { 'Fatia': 5, 'Grande': 40 }
            return f.prices && f.prices[selectedSize] ? f.prices[selectedSize] : 0;
        });

        return Math.max(...prices);
    };

    const handleConfirm = () => {
        onConfirm(selectedSize, selectedFlavors);
        reset();
    };

    const reset = () => {
        setStep(1);
        setSelectedSize(null);
        setSelectedFlavors([]);
        setSearchText('');
        onClose();
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Escolha o Tamanho</Text>
            <ScrollView>
                <View style={styles.grid}>
                    {sizes.map(size => (
                        <TouchableOpacity
                            key={size.name}
                            style={[styles.sizeCard, selectedSize === size.name && styles.sizeCardActive]}
                            onPress={() => setSelectedSize(size.name)}
                        >
                            <Text style={[styles.sizeText, selectedSize === size.name && styles.sizeTextActive]}>
                                {size.name}
                            </Text>
                            <Text style={styles.sizeSubText}>
                                Até {size.maxFlavors} sabores
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            <TouchableOpacity
                style={[styles.nextBtn, !selectedSize && styles.disabledBtn]}
                disabled={!selectedSize}
                onPress={() => setStep(2)}
            >
                <Text style={styles.nextBtnText}>Continuar &rarr;</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>
                    Sabores ({selectedFlavors.length}/{maxFlavors})
                </Text>
            </View>

            <TextInput
                style={styles.search}
                placeholder="Buscar sabor..."
                value={searchText}
                onChangeText={setSearchText}
            />

            <ScrollView style={{ flex: 1 }}>
                {filteredPizzas.map(pizza => {
                    const isSelected = !!selectedFlavors.find(p => p.id === pizza.id);
                    const priceForSize = pizza.prices && pizza.prices[selectedSize] ? pizza.prices[selectedSize] : 0;

                    // Generate customized ingredients list
                    let ingredientsText = "";
                    if (pizza.ingredients && pizza.ingredients.length > 0) {
                        ingredientsText = pizza.ingredients.join(', ');
                    }
                    if (pizza.customIngredients) {
                        ingredientsText += ingredientsText ? `, ${pizza.customIngredients}` : pizza.customIngredients;
                    }

                    return (
                        <TouchableOpacity
                            key={pizza.id}
                            style={[styles.flavorRow, isSelected && styles.flavorRowActive]}
                            onPress={() => toggleFlavor(pizza)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.flavorName}>{pizza.name}</Text>
                                {ingredientsText ? <Text style={styles.flavorIngredients}>{ingredientsText}</Text> : null}
                                <Text style={styles.flavorPrice}>R$ {priceForSize.toFixed(2)}</Text>
                            </View>
                            <View style={styles.checkbox}>
                                {isSelected && <View style={styles.checked} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.totalText}>Valor: R$ {calculatePrice().toFixed(2)}</Text>
                <TouchableOpacity
                    style={[styles.confirmBtn, selectedFlavors.length === 0 && styles.disabledBtn]}
                    disabled={selectedFlavors.length === 0}
                    onPress={handleConfirm}
                >
                    <Text style={styles.nextBtnText}>Adicionar Pizza</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeBtn} onPress={reset}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>

                    {step === 1 ? renderStep1() : renderStep2()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { flex: 0.85, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    closeBtn: { alignSelf: 'flex-end', padding: 5, marginBottom: 10 },
    stepContainer: { flex: 1 },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sizeCard: {
        width: '48%',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        marginBottom: 10
    },
    sizeCardActive: { borderColor: colors.primary, backgroundColor: '#FFF8E1' },
    sizeText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    sizeTextActive: { color: colors.primary },
    sizeSubText: { fontSize: 12, color: '#666', marginTop: 4 },

    nextBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    disabledBtn: { backgroundColor: '#ccc' },
    nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    backBtn: { padding: 5 },
    search: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10 },

    flavorRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    flavorRowActive: { backgroundColor: '#FFF8E1' },
    flavorName: { fontSize: 16, fontWeight: '600', color: '#333' },
    flavorIngredients: { fontSize: 13, color: '#777', fontStyle: 'italic', marginBottom: 2 },
    flavorPrice: { fontSize: 14, color: '#666' },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    checked: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },

    footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, marginTop: 10 },
    totalText: { fontSize: 20, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 10 },
    confirmBtn: { backgroundColor: colors.success, padding: 15, borderRadius: 10, alignItems: 'center' }
});
