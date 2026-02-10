import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
import { supabase } from '../config/SupabaseConfig';

interface Props {
    onClose?: () => void;
}

export default function FinancialConfigScreen({ onClose }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings state
    const [blindClosing, setBlindClosing] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        // @ts-ignore
        if (!user?.companyId) return;
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('key', 'financeiro')
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (data && data.value) {
                setBlindClosing(data.value.blind_closing || false);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações financeiras:', error);
            Alert.alert('Erro', 'Não foi possível carregar as configurações.');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        // @ts-ignore
        if (!user?.companyId) return;
        try {
            setSaving(true);

            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    company_id: user.companyId,
                    key: 'financeiro',
                    value: {
                        blind_closing: blindClosing
                    },
                    updated_at: new Date().toISOString(),
                    // @ts-ignore
                    updated_by: user.id
                });

            if (error) throw error;

            Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
            if (onClose) onClose();
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            Alert.alert('Erro', 'Não foi possível salvar as alterações.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <BackgroundPattern />

            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>⚙️ Configurações Financeiras</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#8B2F2F" />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Fechamento de Caixa</Text>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Fechamento Cego</Text>
                                <Text style={styles.settingDescription}>
                                    Oculta o saldo esperado durante o fechamento. O operador deve contar o dinheiro sem saber quanto o sistema espera.
                                </Text>
                            </View>
                            <Switch
                                value={blindClosing}
                                onValueChange={setBlindClosing}
                                trackColor={{ false: "#767577", true: "#E5B84A" }}
                                thumbColor={blindClosing ? "#8B2F2F" : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.disabledBtn]}
                        onPress={saveConfig}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>Salvar Configurações</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F1E8',
    },
    header: {
        backgroundColor: '#8B2F2F',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 5,
        // @ts-ignore
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    },
    closeBtn: {
        padding: 5
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        // @ts-ignore
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8B2F2F',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    settingInfo: {
        flex: 1,
        paddingRight: 10,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    saveBtn: {
        backgroundColor: '#8B2F2F',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 3,
        // @ts-ignore
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.2)',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledBtn: {
        opacity: 0.7,
    }
});
