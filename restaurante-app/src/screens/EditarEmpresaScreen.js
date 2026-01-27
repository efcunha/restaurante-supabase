import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { validateCPF, validateCNPJ } from '../utils/validation';

export default function EditarEmpresaScreen({ onBack }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [restaurantName, setRestaurantName] = useState('');
    const [documentType, setDocumentType] = useState('cpf'); // 'cpf' | 'cnpj'
    const [documentValue, setDocumentValue] = useState('');

    // Load initial data
    useEffect(() => {
        const loadCompanyData = async () => {
            try {
                if (!user?.companyId) return;

                const docRef = doc(db, 'companies', user.companyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setRestaurantName(data.name || '');
                    setDocumentType(data.documentType || 'cpf');

                    // Format initial document value if exists
                    if (data.document) {
                        setDocumentValue(formatDocument(data.document, data.documentType || 'cpf'));
                    }
                }
            } catch (error) {
                console.error('Error loading company:', error);
                Alert.alert('Erro', 'Não foi possível carregar os dados da empresa');
            } finally {
                setLoading(false);
            }
        };

        loadCompanyData();
    }, [user]);

    // Formatter mechanism (same as Register)
    const formatDocument = (text, type) => {
        if (!text) return '';
        const numbers = text.replace(/\D/g, '');
        if (type === 'cpf') {
            return numbers
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        } else {
            return numbers
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        }
    };

    const handleDocumentChange = (text) => {
        setDocumentValue(formatDocument(text, documentType));
    };

    const handleDocumentTypeChange = (type) => {
        setDocumentType(type);
        setDocumentValue(''); // Clear value on type switch to avoid confusion
    };

    const handleSave = async () => {
        console.log('[EditarEmpresa] 💾 Iniciando salvamento...');

        if (!restaurantName.trim()) {
            alert('Erro: Nome do restaurante é obrigatório');
            return;
        }

        if (!documentValue) {
            alert('Erro: CPF ou CNPJ é obrigatório');
            return;
        }

        // Validation
        let docValidation;
        if (documentType === 'cpf') {
            docValidation = validateCPF(documentValue);
        } else {
            docValidation = validateCNPJ(documentValue);
        }

        if (!docValidation.isValid) {
            alert(`Erro: ${docValidation.error}`);
            return;
        }

        try {
            setSaving(true);
            console.log('[EditarEmpresa] 🏢 Atualizando documento:', user.companyId);

            const docRef = doc(db, 'companies', user.companyId);

            const updateData = {
                name: restaurantName.trim(),
                documentType: documentType,
                document: docValidation.value,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid || user.id || 'admin' // Fallback se uid falhar
            };

            console.log('[EditarEmpresa] 📋 Dados:', updateData);

            await updateDoc(docRef, updateData);

            console.log('[EditarEmpresa] ✅ Sucesso!');

            // Feedback compatível com Web/Mobile
            if (Platform.OS === 'web') {
                window.alert('✅ Dados da empresa atualizados com sucesso!');
                onBack();
            } else {
                Alert.alert('Sucesso', 'Dados da empresa atualizados com sucesso!', [
                    { text: 'OK', onPress: onBack }
                ]);
            }

        } catch (error) {
            console.error('[EditarEmpresa] ❌ Erro updating company:', error);
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dados da Empresa</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>

                        <Text style={styles.label}>Nome do Restaurante</Text>
                        <TextInput
                            style={styles.input}
                            value={restaurantName}
                            onChangeText={setRestaurantName}
                            placeholder="Nome do seu negócio"
                        />

                        <Text style={styles.label}>Tipo de Documento</Text>
                        <View style={styles.docTypeContainer}>
                            <TouchableOpacity
                                style={[styles.docTypeBtn, documentType === 'cpf' && styles.docTypeBtnActive]}
                                onPress={() => handleDocumentTypeChange('cpf')}
                            >
                                <Text style={[styles.docTypeText, documentType === 'cpf' && styles.docTypeTextActive]}>CPF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.docTypeBtn, documentType === 'cnpj' && styles.docTypeBtnActive]}
                                onPress={() => handleDocumentTypeChange('cnpj')}
                            >
                                <Text style={[styles.docTypeText, documentType === 'cnpj' && styles.docTypeTextActive]}>CNPJ</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</Text>
                        <TextInput
                            style={styles.input}
                            value={documentValue}
                            onChangeText={handleDocumentChange}
                            placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>SALVAR ALTERAÇÕES</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F1E8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F1E8',
    },
    header: {
        backgroundColor: '#8B2F2F',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    docTypeContainer: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    docTypeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    docTypeBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    docTypeText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    docTypeTextActive: {
        color: '#FFF'
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
