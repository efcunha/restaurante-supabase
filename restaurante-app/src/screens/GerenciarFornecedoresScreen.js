import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';
import { Ionicons } from '@expo/vector-icons';

// --- VALIDATION & MASKING HELPERS ---
const maskCNPJ = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value) => {
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

const validateCNPJ = (cnpj) => {
    const c = cnpj.replace(/[^\d]+/g, '');
    if (c === '') return false;
    if (c.length !== 14) return false;
    // Elimina CNPJs invalidos conhecidos
    if (/^(\d)\1+$/.test(c)) return false;

    // Valida DVs
    let tamanho = c.length - 2
    let numeros = c.substring(0, tamanho);
    let digitos = c.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = c.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;

    return true;
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};
// ------------------------------------

export default function GerenciarFornecedoresScreen({ onClose }) {
    const { user } = useAuth();
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form states
    const [editingId, setEditingId] = useState(null);
    const [nome, setNome] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [contato, setContato] = useState(''); // Usado como Telefone
    const [email, setEmail] = useState('');

    useEffect(() => {
        carregarFornecedores();
    }, []);

    const carregarFornecedores = async () => {
        if (!user?.companyId) return;

        try {
            setLoading(true);
            const snapshot = await getDocs(getCompanyCollection(user.companyId, 'suppliers'));
            const lista = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => a.nome.localeCompare(b.nome));

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

    const abrirModal = (fornecedor = null) => {
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

    const handleChangeCnpj = (text) => {
        const masked = maskCNPJ(text);
        setCnpj(masked);
    };

    const handleChangePhone = (text) => {
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
                contato: contato.trim(), // Telefone formatado
                email: email.trim(),     // Novo campo
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(getCompanyDoc(user.companyId, 'suppliers', editingId), dados);
                Alert.alert('Sucesso', 'Fornecedor atualizado!');
            } else {
                await addDoc(getCompanyCollection(user.companyId, 'suppliers'), {
                    ...dados,
                    createdAt: serverTimestamp()
                });
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

    const deletarFornecedor = (item) => {
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
                            await deleteDoc(getCompanyDoc(user.companyId, 'suppliers', item.id));
                            carregarFornecedores();
                        } catch (error) {
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
            <BackgroundPattern />

            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Fornecedores</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.addBtn} onPress={() => abrirModal()}>
                    <Text style={styles.addBtnText}>+ Novo Fornecedor</Text>
                </TouchableOpacity>

                {loading && !modalVisible ? (
                    <ActivityIndicator size="large" color="#8B2F2F" style={{ marginTop: 20 }} />
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
                                            <Ionicons name="pencil" size={20} color="#E5B84A" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => deletarFornecedor(item)} style={styles.actionBtn}>
                                            <Ionicons name="trash" size={20} color="#FF6B6B" />
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
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="CNPJ"
                            value={cnpj}
                            onChangeText={handleChangeCnpj}
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                            maxLength={18}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Celular (XX) X XXXX-XXXX"
                            value={contato}
                            onChangeText={handleChangePhone}
                            keyboardType="phone-pad"
                            placeholderTextColor="#999"
                            maxLength={15}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#999"
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
    container: { flex: 1, backgroundColor: '#F5F1E8' },
    header: {
        backgroundColor: '#8B2F2F',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        elevation: 5
    },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    content: { flex: 1, padding: 20 },
    addBtn: {
        backgroundColor: '#E5B84A',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 3
    },
    addBtnText: { fontWeight: 'bold', color: '#2C2C2C', fontSize: 16 },
    list: { paddingBottom: 50 },
    card: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2
    },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C2C2C' },
    cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 15 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 20,
        elevation: 5
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B2F2F', marginBottom: 20, textAlign: 'center' },
    input: {
        backgroundColor: '#F5F1E8',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5B84A'
    },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#DDD' },
    saveBtn: { backgroundColor: '#8B2F2F' },
    cancelBtnText: { color: '#333', fontWeight: 'bold' },
    saveBtnText: { color: '#FFF', fontWeight: 'bold' }
});
