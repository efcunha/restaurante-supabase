import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { EvolutionApiService, ConnectionStateResponse } from '../services/EvolutionApiService';

const SAFE_AREA_TOP = 50;

export default function ConfiguracoesWhatsApp({ onClose }: { onClose?: () => void }) {
    const navigation = useNavigation();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Status states
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Track interval for polling QR Code
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    const startPolling = () => {
        if (pollingInterval.current) return;
        pollingInterval.current = setInterval(() => {
            checkConnectionStatus(false);
        }, 5000); // Check every 5 seconds
    };

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    useEffect(() => {
        checkConnectionStatus(true);
        return () => stopPolling();
    }, []);

    const checkConnectionStatus = async (showMainLoader = false) => {
        if (!user?.companyId) return;

        try {
            if (showMainLoader) setLoading(true);
            setErrorMsg(null);

            const data = await EvolutionApiService.getConnectionState(user.companyId);
            
            const state = data.instance?.state || data.state || 'disconnected';
            setConnectionState(state);

            if (state === 'connecting') {
                // Se está conectando, busca o QR Code na rota connect
                try {
                    const connectData = await EvolutionApiService.connectInstance(user.companyId);
                    if (connectData.base64) {
                        const rawBase64 = connectData.base64.includes(',') ? connectData.base64.split(',')[1] : connectData.base64;
                        setQrCodeBase64(`data:image/png;base64,${rawBase64}`);
                    }
                } catch (e) {
                    console.log('Falha ao buscar QR via connect:', e);
                }
                startPolling(); // Continua polling até ser escaneado
            } else if (state === 'open') {
                setQrCodeBase64(null);
                stopPolling();
            } else {
                setQrCodeBase64(null);
                stopPolling();
            }

        } catch (error: any) {
            console.log('Connection state error (likely 404 - not created):', error.message);
            setConnectionState('not_created');
            setQrCodeBase64(null);
            stopPolling();
        } finally {
            if (showMainLoader) setLoading(false);
        }
    };

    const handleCreateInstance = async () => {
        if (!user?.companyId) return;

        try {
            setActionLoading(true);
            setErrorMsg(null);
            
            const createData = await EvolutionApiService.createInstance(user.companyId);
            
            Alert.alert('Sucesso', 'Instância gerada. Buscando QR Code...');
            
            // Tenta usar o QR Code que já vem no retorno da criação (v1.8.2 qrcode: true)
            if (createData?.qrcode?.base64) {
                const rawBase64 = createData.qrcode.base64.includes(',') ? createData.qrcode.base64.split(',')[1] : createData.qrcode.base64;
                setQrCodeBase64(`data:image/png;base64,${rawBase64}`);
                setConnectionState('connecting');
                startPolling();
            } else if (createData?.base64) {
                const rawBase64 = createData.base64.includes(',') ? createData.base64.split(',')[1] : createData.base64;
                setQrCodeBase64(`data:image/png;base64,${rawBase64}`);
                setConnectionState('connecting');
                startPolling();
            } else {
                setTimeout(() => {
                    checkConnectionStatus(true);
                }, 2000);
            }

        } catch (error: any) {
            setErrorMsg(error.message || 'Falha ao conectar no WhatsApp');
            Alert.alert('Erro', error.message || 'Falha ao iniciar conexão.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogoutInstance = async () => {
        if (!user?.companyId) return;

        Alert.alert(
            'Desconectar WhatsApp',
            'Deseja realmente desconectar o número atual? O bot e os envios automáticos pararão de funcionar.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desconectar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            stopPolling();
                            await EvolutionApiService.logoutInstance(user.companyId!);
                            setConnectionState('not_created');
                            setQrCodeBase64(null);
                            Alert.alert('Desconectado', 'Sua instância do WhatsApp foi removida.');
                        } catch (error: any) {
                            Alert.alert('Erro', 'Falha ao desconectar.');
                            // Mesma se falhar, tenta buscar o estado real
                            checkConnectionStatus(false);
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => onClose ? onClose() : navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Integração WhatsApp</Text>
            <View style={{ width: 24 }} />
        </View>
    );

    const renderNotCreated = () => (
        <View style={styles.card}>
            <Ionicons name="logo-whatsapp" size={60} color="#25D366" style={{ marginBottom: 15 }} />
            <Text style={styles.title}>Conecte seu WhatsApp</Text>
            <Text style={styles.description}>
                Escaneie o QR Code com seu aparelho celular para permitir que o sistema envie 
                mensagens automáticas de Delivery e Status de Pedidos diretamente no número do seu restaurante.
            </Text>

            <TouchableOpacity
                style={styles.connectButton}
                onPress={handleCreateInstance}
                disabled={actionLoading}
            >
                {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                ) : (
                    <Text style={styles.connectButtonText}>Gerar QR Code Agora</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderConnecting = () => (
        <View style={styles.card}>
            <Text style={[styles.title, { marginBottom: 10 }]}>Escaneie o QR Code</Text>
            <Text style={styles.description}>
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados {'>'} Conectar Aparelho e aponte a câmera.
            </Text>
            
            {qrCodeBase64 ? (
                <View style={styles.qrContainer}>
                    <Image 
                        source={{ uri: qrCodeBase64 }} 
                        style={styles.qrImage}
                        resizeMode="contain" 
                    />
                </View>
            ) : (
                <View style={[styles.qrContainer, styles.qrLoading]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 15, color: '#666' }}>Aguardando imagem da API...</Text>
                </View>
            )}

            <Text style={styles.pollingText}>Aguardando confirmação do celular...</Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={handleLogoutInstance} disabled={actionLoading}>
                <Text style={styles.cancelButtonText}>Cancelar Processo</Text>
            </TouchableOpacity>
        </View>
    );

    const renderConnected = () => (
        <View style={styles.card}>
            <View style={styles.successIconBadge}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </View>
            <Text style={styles.title}>WhatsApp Conectado!</Text>
            <Text style={styles.description}>
                Seu número está atrelado com sucesso ao painel. O robô já é capaz de enviar mensagens de status 
                aos clientes que comprarem por delivery ou pelo cardápio.
            </Text>

            <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={handleLogoutInstance}
                disabled={actionLoading}
            >
                {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                    <Text style={styles.disconnectButtonText}>Desconectar Aparelho</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const getContent = () => {
        if (loading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }

        if (connectionState === 'open') {
            return renderConnected();
        } else if (connectionState === 'connecting' || qrCodeBase64) {
            return renderConnecting();
        } else {
            return renderNotCreated();
        }
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView contentContainerStyle={styles.content}>
                {errorMsg && (
                    <View style={styles.errorBox}>
                        <Ionicons name="warning" size={20} color="#856404" />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}
                
                {getContent()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5DC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: SAFE_AREA_TOP,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: colors.primary,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.white },
    backButton: { padding: 5 },
    content: { padding: 20, flexGrow: 1, justifyContent: 'center' },
    
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },

    connectButton: {
        backgroundColor: '#25D366',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        elevation: 2,
        width: '100%',
        alignItems: 'center',
    },
    connectButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    disconnectButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.danger,
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    disconnectButtonText: {
        color: colors.danger,
        fontWeight: 'bold',
        fontSize: 16,
    },

    cancelButton: {
        marginTop: 20,
        padding: 10,
    },
    cancelButtonText: {
        color: colors.danger,
        fontWeight: '600',
        fontSize: 15,
    },

    qrContainer: {
        width: 250,
        height: 250,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    qrLoading: {
        backgroundColor: '#f0f0f0',
    },
    qrImage: {
        width: '100%',
        height: '100%',
    },

    pollingText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
    },

    successIconBadge: {
        marginBottom: 15,
    },

    errorBox: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        borderWidth: 1,
        padding: 15,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    errorText: {
        color: '#856404',
        marginLeft: 10,
        flex: 1,
        lineHeight: 20,
    }
});
