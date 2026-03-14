import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function PizzaBuilderModal({
    visible,
    onClose,
    onConfirm,
    sizes = [],
    pizzas = [],
    initialFlavor = null,
    extras = [] // New prop for extras
}) {
    const [step, setStep] = useState(1); // 1: Tamanho, 2: Sabores, 3: Extras
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedFlavors, setSelectedFlavors] = useState([]);
    const [selectedBorda, setSelectedBorda] = useState(null);
    const [selectedAdicionais, setSelectedAdicionais] = useState([]);
    const [searchText, setSearchText] = useState('');

    // Reset when modal opens
    useEffect(() => {
        if (visible) {
            setStep(1);
            setSelectedSize(null);
            setSelectedFlavors(initialFlavor ? [initialFlavor] : []);
            setSelectedBorda(null);
            setSelectedAdicionais([]);
            setSearchText('');
        }
    }, [visible, initialFlavor]);

    const currentSizeConfig = useMemo(() => {
        if (!selectedSize || !sizes) return null;
        return sizes.find(s => s.name === selectedSize);
    }, [selectedSize, sizes]);

    const maxFlavors = currentSizeConfig?.maxFlavors || 1;

    // Filter flavors and Deduplicate
    const filteredPizzas = useMemo(() => {
        if (!pizzas) return [];
        let list = pizzas;
        if (searchText) {
            list = list.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
        }

        // Deduplicate by name
        const unique = [];
        const seen = new Set();
        list.forEach(p => {
            if (!seen.has(p.name)) {
                seen.add(p.name);
                unique.push(p);
            }
        });
        return unique;
    }, [pizzas, searchText]);

    const handleSelectSize = (size) => {
        setSelectedSize(size.name);

        // Auto-select initial flavor if present
        if (initialFlavor) {
            // Check if flavor exists in deduplicated list or use the initial object
            setSelectedFlavors([initialFlavor]);
        }

        setStep(2);
    };

    const toggleFlavor = (pizza) => {
        // Locked flavor: Cannot deselect the initial flavor
        if (initialFlavor && pizza.id === initialFlavor.id) {
            return;
        }

        if (selectedFlavors.find(p => p.id === pizza.id || p.name === pizza.name)) {
            // Second check for safety: if trying to remove initial flavor by name match
            if (initialFlavor && pizza.name === initialFlavor.name) return;

            setSelectedFlavors(prev => prev.filter(p => p.id !== pizza.id));
        } else {
            if (selectedFlavors.length >= maxFlavors) {
                return;
            }
            setSelectedFlavors(prev => [...prev, pizza]);
        }
    };

    const calculatePrice = () => {
        if (!selectedSize || selectedFlavors.length === 0) return 0;

        // Default strategy: HIGHER value logic
        const prices = selectedFlavors.map(f => {
            const val = f.prices && f.prices[selectedSize] ? f.prices[selectedSize] : 0;
            // Robust parsing for string (handles commas) or number
            if (typeof val === 'string') {
                return parseFloat(val.replace(',', '.')) || 0;
            }
            return Number(val) || 0;
        });

        const basePrice = Math.max(...prices);
        
        // Add extras prices
        let extrasPrice = 0;
        if (selectedBorda) {
            extrasPrice += selectedBorda.price || 0;
        }
        selectedAdicionais.forEach(adicional => {
            extrasPrice += adicional.price || 0;
        });

        return basePrice + extrasPrice;
    };

    const getBasePrice = () => {
        if (!selectedSize || selectedFlavors.length === 0) return 0;
        const prices = selectedFlavors.map(f => {
            const val = f.prices && f.prices[selectedSize] ? f.prices[selectedSize] : 0;
            if (typeof val === 'string') {
                return parseFloat(val.replace(',', '.')) || 0;
            }
            return Number(val) || 0;
        });
        return Math.max(...prices);
    };

    const getExtrasPrice = () => {
        let total = 0;
        if (selectedBorda) {
            total += selectedBorda.price || 0;
        }
        selectedAdicionais.forEach(adicional => {
            total += adicional.price || 0;
        });
        return total;
    };

    const handleConfirm = () => {
        onConfirm(selectedSize, selectedFlavors, selectedBorda, selectedAdicionais);
        onClose();
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Escolha o Tamanho</Text>
            <Text style={styles.subtitle}>Para {initialFlavor ? `"${initialFlavor.name}"` : 'sua pizza'}</Text>

            <ScrollView contentContainerStyle={styles.grid}>
                {(sizes || []).map(size => (
                    <TouchableOpacity
                        key={size.name}
                        style={[styles.sizeCard, selectedSize === size.name && styles.sizeCardActive]}
                        onPress={() => handleSelectSize(size)}
                    >
                        <View style={[styles.sizeIcon, { backgroundColor: selectedSize === size.name ? colors.primary : colors.border }]}>
                            <Ionicons name="pizza-outline" size={32} color={selectedSize === size.name ? colors.white : colors.textSecondary} />
                        </View>
                        <Text style={[styles.sizeText, selectedSize === size.name && styles.sizeTextActive]}>
                            {size.name}
                        </Text>
                        <Text style={styles.sizeSubText}>
                            Até {size.maxFlavors} sabores
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.titleSmall}>
                        {selectedSize} - {selectedFlavors.length}/{maxFlavors} Sabores
                    </Text>
                    {maxFlavors === 1 && initialFlavor && (
                        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>
                            ✓ Sabor Obrigatório
                        </Text>
                    )}
                </View>
            </View>

            {/* Ocultar busca se só pode 1 sabor e já temos 1 (caso Fatia/Broto iniciados por sabor) */}
            {!(maxFlavors === 1 && selectedFlavors.length === 1) && (
                <TextInput
                    style={styles.search}
                    placeholder="🔍 Buscar ou adicionar sabor..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
            )}

            <ScrollView style={{ flex: 1 }}>
                {filteredPizzas.map(pizza => {
                    const isSelected = !!selectedFlavors.find(p => p.name === pizza.name); // Match by name for robustness

                    const rawPrice = pizza.prices && pizza.prices[selectedSize] ? pizza.prices[selectedSize] : 0;

                    // Robust parsing
                    let priceForSize = 0;
                    if (typeof rawPrice === 'string') {
                        priceForSize = parseFloat(rawPrice.replace(',', '.')) || 0;
                    } else {
                        priceForSize = Number(rawPrice) || 0;
                    }

                    // Disable selection if full and not selected
                    const isDisabled = !isSelected && selectedFlavors.length >= maxFlavors;

                    // Check if this is the locked initial flavor
                    const isLocked = initialFlavor && pizza.name === initialFlavor.name;

                    return (
                        <TouchableOpacity
                            key={pizza.id}
                            style={[
                                styles.flavorRow,
                                isSelected && styles.flavorRowActive,
                                isDisabled && styles.flavorRowDisabled,
                                isLocked ? { borderColor: colors.success, backgroundColor: '#F1F8E9' } : null
                            ]}
                            onPress={() => !isDisabled && toggleFlavor(pizza)}
                            disabled={isDisabled || isLocked}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.flavorName, isDisabled && { color: colors.textSecondary }]}>{pizza.name}</Text>
                                <Text style={styles.flavorPrice}>R$ {priceForSize.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.checkbox, isSelected && { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                                {isSelected && <Ionicons name="checkmark" size={16} color={colors.white} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>Total Estimado:</Text>
                    <Text style={styles.totalText}>R$ {calculatePrice().toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.confirmBtn, selectedFlavors.length === 0 && styles.disabledBtn]}
                    disabled={selectedFlavors.length === 0}
                    onPress={() => {
                        if (selectedSize === 'Fatia') {
                            handleConfirm();
                        } else {
                            setStep(3);
                        }
                    }}
                >
                    <Text style={styles.nextBtnText}>
                        {selectedSize === 'Fatia' ? 'Adicionar ao Pedido' : 'Próximo: Extras'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep3 = () => {
        const bordas = extras.filter(e => e.type === 'borda');
        const adicionais = extras.filter(e => e.type === 'adicional');

        return (
            <View style={styles.stepContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.titleSmall}>Extras (Opcional)</Text>
                </View>

                <ScrollView style={{ flex: 1 }}>
                    {/* Bordas Recheadas */}
                    {bordas.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.sectionTitle}>🥖 Borda Recheada</Text>
                            {bordas.map(borda => {
                                const isSelected = selectedBorda?.id === borda.id;
                                return (
                                    <TouchableOpacity
                                        key={borda.id}
                                        style={[styles.extraRow, isSelected && styles.extraRowActive]}
                                        onPress={() => setSelectedBorda(isSelected ? null : borda)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.extraName}>{borda.name}</Text>
                                            <Text style={styles.extraPrice}>+ R$ {borda.price.toFixed(2)}</Text>
                                        </View>
                                        <View style={[styles.radio, isSelected && styles.radioActive]}>
                                            {isSelected && <View style={styles.radioDot} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Adicionais */}
                    {adicionais.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>➕ Adicionais</Text>
                            {adicionais.map(adicional => {
                                const isSelected = selectedAdicionais.some(a => a.id === adicional.id);
                                return (
                                    <TouchableOpacity
                                        key={adicional.id}
                                        style={[styles.extraRow, isSelected && styles.extraRowActive]}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSelectedAdicionais(prev => prev.filter(a => a.id !== adicional.id));
                                            } else {
                                                setSelectedAdicionais(prev => [...prev, adicional]);
                                            }
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.extraName}>{adicional.name}</Text>
                                            <Text style={styles.extraPrice}>+ R$ {adicional.price.toFixed(2)}</Text>
                                        </View>
                                        <View style={[styles.checkbox, isSelected && { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                                            {isSelected && <Ionicons name="checkmark" size={16} color={colors.white} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {bordas.length === 0 && adicionais.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Text style={{ fontSize: 16, color: colors.textSecondary }}>Nenhum extra disponível.</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Pizza:</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary }}>R$ {getBasePrice().toFixed(2)}</Text>
                        </View>
                        {getExtrasPrice() > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Extras:</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>R$ {getExtrasPrice().toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Total:</Text>
                            <Text style={styles.totalText}>R$ {calculatePrice().toFixed(2)}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.nextBtnText}>Adicionar ao Pedido</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.modalHeaderDrag} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close-circle" size={30} color={colors.border} />
                    </TouchableOpacity>

                    {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { height: '85%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    modalHeaderDrag: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

    closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },

    stepContainer: { flex: 1 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 5, textAlign: 'center' },
    subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },

    titleSmall: { fontSize: 18, fontWeight: 'bold', color: colors.text },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    sizeCard: {
        width: '48%',
        backgroundColor: colors.white,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
    },
    sizeCardActive: { borderColor: colors.primary, backgroundColor: colors.dangerSurface, borderWidth: 2 },
    sizeIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    sizeText: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    sizeTextActive: { color: colors.primary },
    sizeSubText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 15 },
    backBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 50 },
    search: { backgroundColor: '#F9F9F9', padding: 14, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#EAEAEA', minHeight: 48 },

    flavorRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    flavorRowActive: { borderColor: colors.primary, backgroundColor: '#FFF9F9', borderWidth: 2 },
    flavorRowDisabled: { opacity: 0.5, backgroundColor: '#F9F9F9' },

    flavorName: { fontSize: 16, fontWeight: '700', color: colors.text },
    flavorPrice: { fontSize: 15, color: colors.primary, fontWeight: 'bold', marginTop: 4 },

    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },

    footer: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 20, marginTop: 10, paddingBottom: 20 },
    totalText: { fontSize: 24, fontWeight: '800', color: colors.primary },
    confirmBtn: { backgroundColor: colors.success, padding: 16, borderRadius: 14, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
    disabledBtn: { backgroundColor: colors.border },
    nextBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },

    // Extras styles
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 14 },
    extraRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    extraRowActive: { borderColor: colors.primary, backgroundColor: '#FFF9F9', borderWidth: 2 },
    extraName: { fontSize: 16, fontWeight: '700', color: colors.text },
    extraPrice: { fontSize: 15, color: colors.primary, fontWeight: 'bold', marginTop: 4 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }
});
