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
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { validateCPF, validateCNPJ } from '../utils/validation';
import { supabase } from '../config/SupabaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
interface Props {
  onBack: () => void;
}

export default function EditarEmpresaScreen({ onBack }: Props) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { isTablet, horizontalPadding, inputMaxWidth } = useResponsive();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [restaurantName, setRestaurantName] = useState('');
    const [documentType, setDocumentType] = useState('cpf'); // 'cpf' | 'cnpj'
    const [documentValue, setDocumentValue] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');

    // Load initial data
    useEffect(() => {
        const loadCompanyData = async () => {
            try {
                // @ts-ignore
                if (!user?.companyId) return;

                const { data, error } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', user.companyId)
                    .single();

                if (error) throw error;

                if (data) {
                    setRestaurantName(data.name || '');
                    setDocumentType(data.document_type || 'cpf');
                    setContactName(data.contact_name || '');
                    setAddress(data.address || '');
                    setCity(data.city || '');
                    setState(data.state || '');

                    // Format initial document value if exists
                    if (data.document) {
                        setDocumentValue(formatDocument(data.document, data.document_type || 'cpf'));
                    }

                    // Format initial phone if exists
                    if (data.contact_phone) {
                        setContactPhone(formatPhone(data.contact_phone));
                    }

                    // Format initial CEP if exists
                    if (data.zip_code) {
                        setZipCode(formatZipCode(data.zip_code));
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
    const formatDocument = (text: string, type: string) => {
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

    const handleDocumentChange = (text: string) => {
        setDocumentValue(formatDocument(text, documentType));
    };

    const formatPhone = (text: string) => {
        const numbers = text.replace(/\D/g, '');
        if (numbers.length <= 10) {
            // Formato: (83) 9917-2452
            return numbers
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        } else {
            // Formato: (83) 99917-2452
            return numbers
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        }
    };

    const handlePhoneChange = (text: string) => {
        setContactPhone(formatPhone(text));
    };

    const formatZipCode = (text: string) => {
        const numbers = text.replace(/\D/g, '');
        return numbers
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1')
            .substring(0, 9); // Limita a 8 dígitos + hífen
    };

    const handleZipCodeChange = (text: string) => {
        setZipCode(formatZipCode(text));
    };

    const searchAddressByCEP = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        
        if (cleanCEP.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const data = await response.json();

            if (data.erro) {
                Alert.alert('Aviso', 'CEP não encontrado');
                return;
            }

            // Preencher campos automaticamente
            setAddress(data.logradouro || '');
            setCity(data.localidade || '');
            setState(data.uf || '');
            
            // Mostrar feedback
            if (Platform.OS === 'web') {
                console.log('✅ Endereço encontrado:', data);
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            Alert.alert('Erro', 'Não foi possível buscar o endereço. Verifique sua conexão.');
        }
    };

    const handleDocumentTypeChange = (type: string) => {
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
            // @ts-ignore
            console.log('[EditarEmpresa] 🏢 Atualizando documento:', user.companyId);

            const updateData = {
                name: restaurantName.trim(),
                document_type: documentType,
                document: docValidation.value,
                contact_name: contactName.trim() || null,
                contact_phone: contactPhone.replace(/\D/g, '') || null,
                address: address.trim() || null,
                city: city.trim() || null,
                state: state.trim() || null,
                zip_code: zipCode.replace(/\D/g, '') || null,
                updated_at: new Date().toISOString(),
                // @ts-ignore
                updated_by: user.uid || user.id || 'admin'
            };

            console.log('[EditarEmpresa] 📋 Dados:', updateData);

            const { error } = await supabase
                .from('companies')
                .update(updateData)
                // @ts-ignore
                .eq('id', user.companyId);

            if (error) throw error;

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

        } catch (error: any) {
            console.error('[EditarEmpresa] ❌ Erro updating company:', error);
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                    <View style={styles.headerLeft} />
                    <View style={styles.headerCenter}>
                        <View style={styles.headerTitleRow}>
                            <Ionicons name="business-outline" size={24} color={colors.white} style={styles.headerIcon} />
                            <Text style={styles.headerTitle}>Dados da Empresa</Text>
                        </View>
                        {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.logoutBtn} onPress={onBack}>
                            <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <View style={styles.headerLeft} />
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="business-outline" size={24} color={colors.white} style={styles.headerIcon} />
                        <Text style={styles.headerTitle}>Dados da Empresa</Text>
                    </View>
                    {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={onBack}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { 
                    paddingBottom: 100,
                    paddingHorizontal: horizontalPadding,
                }]}>
                    <View style={[styles.card, {
                        maxWidth: isTablet ? 700 : '100%',
                        alignSelf: 'center',
                        width: '100%',
                    }]}>
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>

                        <Text style={styles.label}>Nome do Restaurante</Text>
                        <TextInput
                            style={[styles.input, { maxWidth: inputMaxWidth }]}
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
                            style={[styles.input, { maxWidth: inputMaxWidth }]}
                            value={documentValue}
                            onChangeText={handleDocumentChange}
                            placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                            keyboardType="numeric"
                        />

                        <Text style={styles.sectionTitle}>Dados de Contato</Text>

                        <Text style={styles.label}>Nome do Responsável</Text>
                        <TextInput
                            style={styles.input}
                            value={contactName}
                            onChangeText={setContactName}
                            placeholder="Nome completo do responsável"
                        />

                        <Text style={styles.label}>Telefone de Contato</Text>
                        <TextInput
                            style={styles.input}
                            value={contactPhone}
                            onChangeText={handlePhoneChange}
                            placeholder="(00) 00000-0000"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.sectionTitle}>Endereço</Text>

                        <Text style={styles.label}>CEP</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 10 }]}
                                value={zipCode}
                                onChangeText={handleZipCodeChange}
                                placeholder="00000-000"
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={() => searchAddressByCEP(zipCode)}
                            >
                                <Ionicons name="search" size={20} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Endereço Completo</Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Rua, número, complemento"
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 2, marginRight: 10 }}>
                                <Text style={styles.label}>Cidade</Text>
                                <TextInput
                                    style={styles.input}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="Cidade"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Estado</Text>
                                <TextInput
                                    style={styles.input}
                                    value={state}
                                    onChangeText={(text) => setState(text.toUpperCase())}
                                    placeholder="UF"
                                    maxLength={2}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color={colors.white} />
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
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, minHeight: 92, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    headerLeft: { flex: 1 },
    headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 8 },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 15,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
    },
    docTypeContainer: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    docTypeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.surfaceMuted,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border
    },
    docTypeBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    docTypeText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    docTypeTextActive: {
        color: colors.white
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
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 48,
    },
});
