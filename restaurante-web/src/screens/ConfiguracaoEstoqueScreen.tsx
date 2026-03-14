import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/SupabaseConfig';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';
interface Props {
    onClose: () => void;
}

export default function ConfiguracaoEstoqueScreen({ onClose }: Props) {
    const { user } = useAuth();
    // Default categories if nothing is configured
    const [categorias, setCategorias] = useState<any[]>([
        { id: 'descartaveis', nome: 'Descartáveis', icon: '🥤' },
        { id: 'mercearia', nome: 'Mercearia', icon: '🛒' },
        { id: 'carnes', nome: 'Carnes', icon: '🥩' },
        { id: 'verduras', nome: 'Verduras', icon: '🥬' },
    ]);
    const [loading, setLoading] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📦');

    // State for editing
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        carregarConfig();
    }, []);

    const carregarConfig = async () => {
        if (!user?.companyId) return;
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('key', 'estoque_config')
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (data && data.value && data.value.stock_categories) {
                setCategorias(data.value.stock_categories);
            }
        } catch (error) {
            console.error('Erro ao carregar config:', error);
        } finally {
            setLoading(false);
        }
    };

    const salvarConfig = async (novasCategorias: any[]) => {
        try {
            setLoading(true);

            if (!user?.companyId) return;
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    company_id: user.companyId,
                    key: 'estoque_config',
                    value: {
                        stock_categories: novasCategorias
                    },
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setCategorias(novasCategorias);
            Alert.alert('Sucesso', 'Configurações salvas!');
        } catch {
            Alert.alert('Erro', 'Falha ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const salvarCategoria = () => {
        if (!newCatName.trim()) return;

        let novaLista = [...categorias];

        if (editingIndex !== null) {
            // Edit existing
            const catAtual = novaLista[editingIndex];
            novaLista[editingIndex] = {
                ...catAtual,
                nome: newCatName.trim(),
                icon: newCatIcon
            };
        } else {
            // Create new
            // Simple ID generation
            const id = newCatName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
            const nova = { id, nome: newCatName.trim(), icon: newCatIcon };
            novaLista = [...categorias, nova];
        }

        salvarConfig(novaLista);
        limparForm();
    };

    const limparForm = () => {
        setNewCatName('');
        setNewCatIcon('📦');
        setEditingIndex(null);
    };

    const iniciarEdicao = (index: number) => {
        const cat = categorias[index];
        setNewCatName(cat.nome);
        setNewCatIcon(cat.icon);
        setEditingIndex(index);
    };

    const removerCategoria = (index: number) => {
        Alert.alert(
            'Remover Categoria',
            'Itens vinculados a esta categoria ficarão sem categoria. Continuar?',
            [
                { text: 'Cancelar' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        const novaLista = [...categorias];
                        novaLista.splice(index, 1);
                        salvarConfig(novaLista);
                        if (editingIndex === index) limparForm();
                    }
                }
            ]
        );
    };

    const icons = ['📦', '🥤', '🛒', '🥩', '🥬', '🧹', '🍺', '🍽️', '🥫', '❄️'];

    return (
        <ScreenScaffold
            title="Categorias de Estoque"
            leftAction={{ label: 'Voltar', onPress: onClose }}
        >
            <BackgroundPattern />

            <View style={styles.content}>
                <View style={styles.addSection}>
                    <Text style={styles.label}>{editingIndex !== null ? 'Editar Categoria:' : 'Nova Categoria:'}</Text>

                    <TextInput
                        style={[styles.input, { width: '100%', marginBottom: 15 }]}
                        placeholder="Nome (ex: Limpeza)"
                        value={newCatName}
                        onChangeText={setNewCatName}
                    />

                    <View style={styles.row}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                            {icons.map(ic => (
                                <TouchableOpacity
                                    key={ic}
                                    style={[styles.iconBtn, newCatIcon === ic && styles.iconBtnActive]}
                                    onPress={() => setNewCatIcon(ic)}
                                >
                                    <Text style={styles.iconText}>{ic}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity style={styles.plusBtn} onPress={salvarCategoria}>
                                <Ionicons name={editingIndex !== null ? "checkmark" : "add"} size={24} color={colors.white} />
                            </TouchableOpacity>

                            {editingIndex !== null && (
                                <TouchableOpacity style={[styles.plusBtn, { backgroundColor: colors.textSecondary, marginLeft: 5 }]} onPress={limparForm}>
                                    <Ionicons name="close" size={24} color={colors.white} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Categorias Ativas ({categorias.length})</Text>

                {loading ? (
                    <ActivityIndicator color={colors.primary} />
                ) : (
                    <ScrollView contentContainerStyle={styles.list}>
                        {categorias.map((cat, index) => (
                            <View key={cat.id + index} style={styles.card}>
                                <View style={styles.cardLeft}>
                                    <Text style={styles.catIcon}>{cat.icon}</Text>
                                    <View>
                                        <Text style={styles.catName}>{cat.nome}</Text>
                                        <Text style={styles.catId}>ID: {cat.id}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 15 }}>
                                    <TouchableOpacity onPress={() => iniciarEdicao(index)}>
                                        <Ionicons name="pencil-outline" size={22} color={colors.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removerCategoria(index)}>
                                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </ScreenScaffold>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, padding: 20 },
    addSection: {
        backgroundColor: colors.white,
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 2
    },
    label: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.secondary
    },
    iconScroll: { maxHeight: 50 },
    iconBtn: { padding: 8, borderRadius: 8, marginRight: 5 },
    iconBtnActive: { backgroundColor: colors.secondary },
    iconText: { fontSize: 20 },
    plusBtn: {
        backgroundColor: colors.primary,
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
    list: { paddingBottom: 50 },
    card: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 8,
        elevation: 1
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    catIcon: { fontSize: 24 },
    catName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    catId: { fontSize: 12, color: colors.textSecondary }
});
