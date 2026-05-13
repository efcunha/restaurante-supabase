
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { CARDAPIO_STATIC } from '../../utils/orderCalculator';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/SupabaseConfig';
import { colors } from '../../theme/colors';
export default function AddItemsModal({ visible, onClose, onConfirm, comandaNumber }) {
    const { user } = useAuth();
    const [itensSelecionados, setItensSelecionados] = useState([]);
    const [showPontoModal, setShowPontoModal] = useState(false);
    const [espetoParaPonto, setEspetoParaPonto] = useState(null); // { nome, tipo }
    const [temperosCaldos, setTemperosCaldos] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [temperosComidas, setTemperosComidas] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);

    useEffect(() => {
        if (visible && user?.companyId) {
            const fetchTemperos = async () => {
                try {
                    const { data, error } = await supabase
                        .from('app_settings')
                        .select('*')
                        .eq('company_id', user.companyId)
                        .eq('key', 'cardapio_config')
                        .single();

                    if (error && error.code !== 'PGRST116') throw error;

                    if (data && data.value) {
                        if (data.value.temperos_caldos) setTemperosCaldos(data.value.temperos_caldos);
                        if (data.value.temperos_comidas) setTemperosComidas(data.value.temperos_comidas);

                        // Fallback
                        if (!data.value.temperos_caldos && !data.value.temperos_comidas && data.value.temperos) {
                            setTemperosCaldos(data.value.temperos);
                            setTemperosComidas(data.value.temperos);
                        }
                    }
                } catch (e) { console.error('Erro ao carregar temperos', e); }
            };
            fetchTemperos();
        }
    }, [visible, user]);

    const adicionarItemCarrinho = (nome, tipo) => {
        // Verificar se precisa de seleção extra (caldo/comida -> tempero)
        // Na lógica original, caldos e comidas abriam modal de "ponto".
        // Aqui simplificamos ou mantemos. Vamos manter a lógica original adaptada.
        const ehCaldo = CARDAPIO_STATIC.caldos.some(c => c.name === nome);
        const ehComida = CARDAPIO_STATIC.comidas.some(c => c.name === nome);

        if (ehCaldo || ehComida) {
            setEspetoParaPonto({
                nome,
                tipo: 'tempero',
                category: ehCaldo ? 'caldo' : 'comida'
            });
            setShowPontoModal(true);
        } else {
            const itemFormatado = tipo ? `1x ${nome} ${tipo}` : `1x ${nome}`;
            setItensSelecionados(prev => [...prev, itemFormatado]);
        }
    };

    const adicionarComPonto = (opcao) => {
        if (!espetoParaPonto) return;
        const { nome } = espetoParaPonto;
        const itemFormatado = `1x ${nome} (${opcao})`;
        setItensSelecionados(prev => [...prev, itemFormatado]);
        setShowPontoModal(false);
        setEspetoParaPonto(null);
    };

    const removerItemCarrinho = (index) => {
        setItensSelecionados(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirm = () => {
        if (itensSelecionados.length === 0) {
            Alert.alert('Atenção', 'Selecione itens para adicionar');
            return;
        }
        onConfirm(itensSelecionados);
        setItensSelecionados([]);
    };

    const renderCardapioSection = (title, items, _type = 'simple') => {
        if (!items || items.length === 0) return null;
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {items.map(item => (
                    <TouchableOpacity
                        key={item.name}
                        style={styles.menuItem}
                        onPress={() => adicionarItemCarrinho(item.name)}
                    >
                        <Text style={styles.menuItemText}>{item.name}</Text>
                        <Text style={styles.menuItemPrice}>R$ {item.price.toFixed(2)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>➕ Adicionar Itens</Text>
                        <TouchableOpacity onPress={() => { setItensSelecionados([]); onClose(); }}>
                            <Text style={styles.closeBtn}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.subtitle}>Comanda {comandaNumber}</Text>

                    <ScrollView style={styles.content}>
                        {/* Carrinho */}
                        {itensSelecionados.length > 0 && (
                            <View style={styles.cart}>
                                <Text style={styles.cartTitle}>🛒 Carrinho ({itensSelecionados.length})</Text>
                                {itensSelecionados.map((item, idx) => (
                                    <View key={idx} style={styles.cartItem}>
                                        <Text style={{ flex: 1 }}>{item}</Text>
                                        <TouchableOpacity onPress={() => removerItemCarrinho(idx)}>
                                            <Text style={styles.removeText}>×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                                    <Text style={styles.confirmText}>CONFIRMAR ADIÇÃO</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Cardapio Items */}
                        {renderCardapioSection('🍲 Caldos', CARDAPIO_STATIC.caldos)}
                        {renderCardapioSection('🍽️ Comidas', CARDAPIO_STATIC.comidas)}
                        {renderCardapioSection('🥤 Bebidas', CARDAPIO_STATIC.bebidas)}
                    </ScrollView>

                    {/* Modal de Opções (Tempero/Ponto) */}
                    <Modal visible={showPontoModal} transparent animationType="fade">
                        <View style={styles.overlay}>
                            <View style={[styles.modalContainer, { maxHeight: 300 }]}>
                                <Text style={[styles.title, { color: colors.text, marginBottom: 20 }]}>Selecione a Opção</Text>
                                {espetoParaPonto && (espetoParaPonto.category === 'caldo' ? temperosCaldos : temperosComidas).map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={styles.optionBtn}
                                        onPress={() => adicionarComPonto(opt)}
                                    >
                                        <Text style={styles.optionText}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity onPress={() => setShowPontoModal(false)} style={{ marginTop: 10, padding: 10 }}>
                                    <Text style={{ textAlign: 'center', color: colors.danger }}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
    closeBtn: { fontSize: 32, color: colors.textLight },
    subtitle: { color: colors.textSecondary, marginBottom: 20 },
    content: { flex: 1 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: colors.border },
    menuItemText: { fontSize: 16, color: colors.text },
    menuItemPrice: { fontWeight: 'bold', color: colors.success },

    cart: { backgroundColor: colors.successSurface, padding: 15, borderRadius: 10, marginBottom: 20 },
    cartTitle: { fontWeight: 'bold', color: colors.success, marginBottom: 10 },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    removeText: { color: colors.danger, fontWeight: 'bold', fontSize: 20 },
    confirmBtn: { backgroundColor: colors.success, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    confirmText: { color: colors.white, fontWeight: 'bold' },

    optionBtn: { padding: 15, backgroundColor: colors.background, borderRadius: 8, marginBottom: 8 },
    optionText: { textAlign: 'center', fontSize: 16, fontWeight: 'bold' }
});
