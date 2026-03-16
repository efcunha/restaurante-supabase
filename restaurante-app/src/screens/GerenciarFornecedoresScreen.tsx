import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
// --- VALIDATION & MASKING HELPERS ---
const maskCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
    let r = value.replace(/\D/g, '');
    r = r.replace(/^0/, ''); // Remove zero prefix if present

    if (r.length > 10) {
        // 11 Digits: (XX) X XXXX-XXXX
        r = r.replace(/^(\d\d)(\d)(\d{4})(\d{4}).*/, '($1) $2 $3-$4');
    } else if (r.length > 5) {
        // 10 Digits or partial: (XX) XXXX-XXXX
        r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (r.length > 2) {
        r = r.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    } else {
        r = r.replace(/^(\d*)/, '($1');
    }
    return r;
};

const validateCNPJ = (cnpj: string) => {
    const c = cnpj.replace(/[^\d]+/g, '');
    if (c === '') return false;
    if (c.length !== 14) return false;
    // Elimina CNPJs invalidos conhecidos
    if (/^(\d)\1+$/.test(c)) return false;

    // Valida DVs
    let tamanho = c.length - 2
    let numeros = c.substring(0, tamanho);
    const digitos = c.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = c.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(1))) return false;

    return true;
};

const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};
// ------------------------------------

interface Props {
  onClose?: () => void;
}

export default function GerenciarFornecedoresScreen({ onClose }: Props) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nome, setNome] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [contato, setContato] = useState(''); // Usado como Telefone
    const [email, setEmail] = useState('');

    useEffect(() => {
        carregarFornecedores();
    }, []);

    const carregarFornecedores = async () => {
        // @ts-ignore
        if (!user?.companyId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('company_id', user.companyId)
                .order('nome', { ascending: true });

            if (error) throw error;

            const lista = (data || []).map(item => ({ id: item.id, ...item }));
            setFornecedores(lista);
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            Alert.alert('Erro', 'Não foi possível carregar os fornecedores');
        } finally {
            setLoading(false);
        }
    };

    const limparForm = () => {
        setEditingId(null);
        setNome('');
        setCnpj('');
        setContato('');
        setEmail('');
    };

    const abrirModal = (fornecedor: any = null) => {
        if (fornecedor) {
            setEditingId(fornecedor.id);
            setNome(fornecedor.nome);
            setCnpj(fornecedor.cnpj || '');
            setContato(fornecedor.contato || '');
            setEmail(fornecedor.email || '');
        } else {
            limparForm();
        }
        setModalVisible(true);
    };

    const handleChangeCnpj = (text: string) => {
        const masked = maskCNPJ(text);
        setCnpj(masked);
    };

    const handleChangePhone = (text: string) => {
        const masked = maskPhone(text);
        setContato(masked);
    };

    const salvarFornecedor = async () => {
        if (!nome.trim()) {
            Alert.alert('Atenção', 'Nome do fornecedor é obrigatório');
            return;
        }

        // Validação CNPJ
        if (cnpj && !validateCNPJ(cnpj)) {
            Alert.alert('Erro', 'CNPJ inválido');
            return;
        }

        // Validação Email
        if (email && !validateEmail(email)) {
            Alert.alert('Erro', 'Email inválido');
            return;
        }

        try {
            setLoading(true);
            const dados = {
                nome: nome.trim(),
                cnpj: cnpj.trim(),
                contato: contato.trim(),
                email: email.trim(),
                company_id: user?.companyId,
                updated_at: new Date().toISOString()
            };

            if (editingId) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(dados)
                    .eq('id', editingId);

                if (error) throw error;
                Alert.alert('Sucesso', 'Fornecedor atualizado!');
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert({
                        ...dados,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;
                Alert.alert('Sucesso', 'Fornecedor cadastrado!');
            }

            setModalVisible(false);
            carregarFornecedores();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            Alert.alert('Erro', 'Falha ao salvar fornecedor');
        } finally {
            setLoading(false);
        }
    };

    const deletarFornecedor = (item: any) => {
        Alert.alert(
            'Excluir Fornecedor',
            `Deseja realmente excluir "${item.nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from('suppliers')
                                .delete()
                                .eq('id', item.id);

                            if (error) throw error;
                            carregarFornecedores();
                        } catch {
                            Alert.alert('Erro', 'Não foi possível excluir');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}> 
                <View style={styles.headerLeft} />
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="people-outline" size={24} color={colors.white} style={styles.headerIcon} />
                        <Text style={styles.headerTitle}>Fornecedores</Text>
                    </View>
                    {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={onClose ?? (() => {})}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.addBtn} onPress={() => abrirModal()}>
                    <Text style={styles.addBtnText}>+ Novo Fornecedor</Text>
                </TouchableOpacity>

                {loading && !modalVisible ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <ScrollView contentContainerStyle={styles.list}>
                        {fornecedores.length === 0 ? (
                            <Text style={styles.emptyText}>Nenhum fornecedor cadastrado</Text>
                        ) : (
                            fornecedores.map(item => (
                                <View key={item.id} style={styles.card}>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>{item.nome}</Text>
                                        {!!item.cnpj && <Text style={styles.cardSubtitle}>CNPJ: {item.cnpj}</Text>}
                                        {!!item.contato && <Text style={styles.cardSubtitle}>📞 {item.contato}</Text>}
                                        {!!item.email && <Text style={styles.cardSubtitle}>✉️ {item.email}</Text>}
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => abrirModal(item)} style={styles.actionBtn}>
                                            <Ionicons name="pencil" size={20} color={colors.secondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => deletarFornecedor(item)} style={styles.actionBtn}>
                                            <Ionicons name="trash" size={20} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nome da Empresa *"
                            value={nome}
                            onChangeText={setNome}
                            placeholderTextColor={colors.textSecondary}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="CNPJ"
                            value={cnpj}
                            onChangeText={handleChangeCnpj}
                            keyboardType="numeric"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={18}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Celular (XX) X XXXX-XXXX"
                            value={contato}
                            onChangeText={handleChangePhone}
                            keyboardType="phone-pad"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={15}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.saveBtn]}
                                onPress={salvarFornecedor}
                            >
                                <Text style={styles.saveBtnText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, paddingBottom: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    headerLeft: { flex: 1 },
    headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 6 },
    headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
    content: { flex: 1, padding: 20 },
    addBtn: {
        backgroundColor: colors.secondary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 3
    },
    addBtnText: { fontWeight: 'bold', color: colors.text, fontSize: 16 },
    list: { paddingBottom: 50 },
    card: {
        backgroundColor: colors.white,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 15 },
    actionBtn: { padding: 5 },
    emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 15,
        padding: 20,
        elevation: 5
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 20, textAlign: 'center' },
    input: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.secondary
    },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.border },
    saveBtn: { backgroundColor: colors.primary },
    cancelBtnText: { color: colors.text, fontWeight: 'bold' },
    saveBtnText: { color: colors.white, fontWeight: 'bold' }
});
