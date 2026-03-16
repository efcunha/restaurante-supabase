import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Caixa } from '../types';
import { colors } from '../theme/colors';
interface CashFlowScreenProps {
    caixa: Caixa | null;
    onClose: () => void;
}

interface Movimentacao {
    id: string;
    tipo: 'venda' | 'reforco' | 'sangria' | 'cancelamento' | 'abertura';
    descricao: string;
    valor: number;
    forma?: string; // Para vendas
    motivo?: string; // Para reforço/sangria
    timestamp: number;
    usuario: string;
    detalhe: string;
}

export default function CashFlowScreen({ caixa, onClose }: CashFlowScreenProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState<boolean>(true);
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

    useEffect(() => {
        if (caixa) {
            carregarExtrato();
        }
    }, [caixa]);

    const carregarExtrato = async () => {
        if (!user?.companyId || !caixa) return;
        try {
            setLoading(true);
            const lista: Movimentacao[] = [];

            // 1. Buscar Pagamentos (Entradas de Vendas)
            // Conversão de data se necessário
            let targetDateKey = caixa.data;
            if (caixa.data && caixa.data.includes('/')) {
                const [dia, mes, ano] = caixa.data.split('/');
                targetDateKey = `${ano}-${mes}-${dia}`;
            }

            // Query corrigida com targetDateKey
            const { data: pagamentos, error: pagamentosError } = await supabase
                .from('pagamentos')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('date_key', targetDateKey);

            if (pagamentosError) throw pagamentosError;

            (pagamentos || []).forEach(d => {
                lista.push({
                    id: d.id,
                    tipo: 'venda',
                    descricao: `Venda - Comanda #${d.comanda_number}`,
                    valor: d.amount,
                    forma: d.payment_method,
                    timestamp: new Date(d.created_at).getTime(),
                    usuario: d.received_by_name || d.garcom_nome,
                    detalhe: d.payment_method?.toUpperCase()
                });
            });

            // 2. Buscar Movimentos de Caixa (Reforço/Sangria)
            if (caixa.id) {
                const { data: movimentos, error: movimentosError } = await supabase
                    .from('cash_movements')
                    .select('*')
                    .eq('company_id', user.companyId)
                    .eq('cash_register_id', caixa.id);

                if (!movimentosError && movimentos) {
                    movimentos.forEach(d => {
                        lista.push({
                            id: d.id,
                            tipo: d.tipo,
                            descricao: d.tipo === 'reforco' ? 'Reforço de Caixa' : 'Sangria de Caixa',
                            valor: d.valor,
                            motivo: d.motivo,
                            timestamp: new Date(d.created_at).getTime(),
                            usuario: d.usuario_nome,
                            detalhe: d.motivo
                        });
                    });
                }
            }

            // 3. Buscar Comandas CANCELADAS
            const { data: canceladas, error: canceladasError } = await supabase
                .from('comandas')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('date_key', targetDateKey)
                .eq('status', 'cancelada');

            if (!canceladasError && canceladas) {
                canceladas.forEach(d => {
                    lista.push({
                        id: d.id,
                        tipo: 'cancelamento',
                        descricao: `Comanda Cancelada #${d.comanda_number}`,
                        valor: d.total_consumed || 0,
                        timestamp: d.canceled_at ? new Date(d.canceled_at).getTime() : (d.created_at ? new Date(d.created_at).getTime() : 0),
                        usuario: d.canceled_by_name || 'Desconhecido',
                        detalhe: d.cancel_reason || 'Sem motivo'
                    });
                });
            }

            // 4. Adicionar Evento de Abertura (Fictício para visualização)
            if (caixa.valorInicial) {
                lista.push({
                    id: 'abertura-auto',
                    tipo: 'abertura',
                    descricao: 'Abertura de Caixa',
                    valor: caixa.valorInicial,
                    timestamp: caixa.abertoAt ? (caixa.abertoAt.seconds * 1000) : 0, // Pode estar null se for muito antigo
                    usuario: caixa.abertoPorNome,
                    detalhe: 'Saldo Inicial'
                });
            }

            // Ordenar Cronologicamente
            lista.sort((a, b) => a.timestamp - b.timestamp);

            setMovimentacoes(lista);
        } catch (error) {
            console.error('Erro ao carregar livro caixa:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderIcon = (tipo: Movimentacao['tipo']) => {
        switch (tipo) {
            case 'venda': return <Ionicons name="arrow-up-circle" size={24} color={colors.success} />;
            case 'reforco': return <Ionicons name="add-circle" size={24} color={colors.secondary} />;
            case 'abertura': return <Ionicons name="flag" size={24} color={colors.warning} />;
            case 'sangria': return <Ionicons name="arrow-down-circle" size={24} color={colors.danger} />;
            case 'cancelamento': return <Ionicons name="trash" size={24} color={colors.textSecondary} />;
            default: return <Ionicons name="ellipse" size={24} color={colors.textSecondary} />;
        }
    };

    const formatTime = (ts: number | undefined) => {
        if (!ts) return '--:--';
        const date = new Date(ts);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        // Se já estiver em DD/MM/YYYY, retorna. Se for YYYY-MM-DD, converte.
        if (dateStr.includes('/')) return dateStr;
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerCenter}>
                        <View style={styles.headerTitleRow}>
                            <Ionicons name="receipt-outline" size={22} color={colors.white} style={styles.headerIcon} />
                            <Text style={styles.headerTitle}>Livro Caixa - {formatDate(caixa?.data)}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight} />
                </View>
                {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />
            ) : (
                <ScrollView style={styles.content}>
                    {movimentacoes.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
                    ) : (
                        movimentacoes.map((mov, index) => (
                            <View key={mov.id || index} style={styles.row}>
                                <View style={styles.timeContainer}>
                                    <Text style={styles.timeText}>{formatTime(mov.timestamp)}</Text>
                                    <View style={styles.verticalLine} />
                                </View>

                                <View style={[styles.card, mov.tipo === 'sangria' ? styles.cardSangria : styles.cardNormal]}>
                                    <View style={styles.cardHeader}>
                                        {renderIcon(mov.tipo)}
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={styles.cardTitle}>{mov.descricao}</Text>
                                            <Text style={styles.cardUser}>{mov.usuario || 'Sistema'} • {mov.detalhe}</Text>
                                        </View>
                                        <Text style={[styles.cardValue, mov.tipo === 'sangria' ? { color: colors.danger } : { color: colors.success }]}>
                                            {mov.tipo === 'sangria' ? '- ' : '+ '}
                                            R$ {Number(mov.valor).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white }, // Branco para modal
    header: {
        backgroundColor: colors.primary,
        paddingTop: 20, // Reduced top padding since it's a modal likely inside a safe area or centered
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: { flex: 1 },
    headerCenter: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: { flex: 1 },
    closeBtn: { padding: 5 },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: { marginRight: 8 },
    headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
    userInfo: {
        marginTop: 4,
        color: colors.userInfo,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    content: { padding: 20 },
    emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },

    row: { flexDirection: 'row' },
    timeContainer: { width: 50, alignItems: 'center' },
    timeText: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
    verticalLine: { flex: 1, width: 1, backgroundColor: colors.border },

    card: { flex: 1, borderRadius: 10, padding: 12, marginBottom: 15, borderWidth: 1, elevation: 2 },
    cardNormal: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
    cardSangria: { backgroundColor: colors.dangerSurface, borderColor: colors.danger },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontWeight: 'bold', fontSize: 14, color: colors.text },
    cardUser: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    cardValue: { fontWeight: 'bold', fontSize: 14 },
});
