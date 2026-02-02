import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { query, where, getDocs } from 'firebase/firestore';
import { getCompanyCollection } from '../utils/firestoreUtils';
import { Ionicons } from '@expo/vector-icons';

export default function CashFlowScreen({ caixa, onClose }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [movimentacoes, setMovimentacoes] = useState([]);

    useEffect(() => {
        if (caixa) {
            carregarExtrato();
        }
    }, [caixa]);

    const carregarExtrato = async () => {
        try {
            setLoading(true);
            const lista = [];

            // 1. Buscar Pagamentos (Entradas de Vendas)
            // Filtrando pelo dateKey do caixa.
            // Se o caixa abrangesse mais de um dia, precisariamos filtrar por timestamp > abertura e < fechamento.
            // Assumindo caixa por dia (dateKey).
            // Assumindo caixa por dia (dateKey).
            // (código original removido pois targetDateKey é quem manda)

            // Conversão de data se necessário
            let targetDateKey = caixa.data;
            if (caixa.data && caixa.data.includes('/')) {
                const [dia, mes, ano] = caixa.data.split('/');
                targetDateKey = `${ano}-${mes}-${dia}`;
            }

            // Query corrigida com targetDateKey
            const qPagamentosCorrigida = query(
                getCompanyCollection(user.companyId, 'pagamentos'),
                where('dateKey', '==', targetDateKey)
            );

            const snapPagamentos = await getDocs(qPagamentosCorrigida);
            snapPagamentos.forEach(doc => {
                const d = doc.data();
                lista.push({
                    id: doc.id,
                    tipo: 'venda',
                    descricao: `Venda - Comanda #${d.comandaNumber}`,
                    valor: d.valor,
                    forma: d.forma,
                    timestamp: d.createdAt ? (d.createdAt.seconds * 1000) : 0,
                    usuario: d.usuarioNome || d.garcomNome,
                    detalhe: d.forma?.toUpperCase()
                });
            });

            // 2. Buscar Movimentos de Caixa (Reforço/Sangria)
            // Estes têm 'caixaId' ou 'createdAt'.
            // Vamos tentar buscar por caixaId se disponível, senão por data.
            let qMovimentos;
            if (caixa.id) {
                qMovimentos = query(
                    getCompanyCollection(user.companyId, 'movimentosCaixa'),
                    where('caixaId', '==', caixa.id)
                );
            } else {
                // Fallback por data se não tiver ID (historico antigo talvez)
                // Mas movimentosCaixa salvam timestamp.
                // Vamos pular se não tiver ID, mas geralmente tem.
            }

            if (qMovimentos) {
                const snapMov = await getDocs(qMovimentos);
                snapMov.forEach(doc => {
                    const d = doc.data();
                    lista.push({
                        id: doc.id,
                        tipo: d.tipo, // 'reforco' ou 'sangria'
                        descricao: d.tipo === 'reforco' ? 'Reforço de Caixa' : 'Sangria de Caixa',
                        valor: d.valor,
                        motivo: d.motivo,
                        timestamp: d.createdAt ? (d.createdAt.seconds * 1000) : 0,
                        usuario: d.usuarioNome,
                        detalhe: d.motivo
                    });
                });
            }

            // 3. Buscar Comandas CANCELADAS (Novo Requisito)
            const qCanceladas = query(
                getCompanyCollection(user.companyId, 'comandas'),
                where('dateKey', '==', targetDateKey),
                where('status', '==', 'cancelada')
            );
            const snapCanceladas = await getDocs(qCanceladas);
            snapCanceladas.forEach(doc => {
                const d = doc.data();
                lista.push({
                    id: doc.id,
                    tipo: 'cancelamento',
                    descricao: `Comanda Cancelada #${d.comandaNumber || d.numeroComanda}`,
                    valor: d.totalConsumido || 0,
                    timestamp: d.canceladaEm ? (new Date(d.canceladaEm).getTime()) : (d.createdAt ? new Date(d.createdAt).getTime() : 0),
                    usuario: d.canceladaPorNome || 'Desconhecido',
                    detalhe: d.motivoCancelamento || 'Sem motivo'
                });
            });

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

    const renderIcon = (tipo) => {
        switch (tipo) {
            case 'venda': return <Ionicons name="arrow-up-circle" size={24} color="#4CAF50" />;
            case 'reforco': return <Ionicons name="add-circle" size={24} color="#2196F3" />;
            case 'abertura': return <Ionicons name="flag" size={24} color="#FFC107" />;
            case 'sangria': return <Ionicons name="arrow-down-circle" size={24} color="#F44336" />;
            case 'cancelamento': return <Ionicons name="trash" size={24} color="#9E9E9E" />;
            default: return <Ionicons name="ellipse" size={24} color="#999" />;
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '--:--';
        const date = new Date(ts);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        // Se já estiver em DD/MM/YYYY, retorna. Se for YYYY-MM-DD, converte.
        if (dateStr.includes('/')) return dateStr;
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Livro Caixa - {formatDate(caixa?.data)}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#8B2F2F" />
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
                                        <Text style={[styles.cardValue, mov.tipo === 'sangria' ? { color: '#F44336' } : { color: '#4CAF50' }]}>
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
    container: { flex: 1, backgroundColor: '#FFF' }, // Branco para modal
    header: {
        backgroundColor: '#8B2F2F',
        paddingTop: 20, // Reduced top padding since it's a modal likely inside a safe area or centered
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    closeBtn: { padding: 5 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },

    row: { flexDirection: 'row' },
    timeContainer: { alignItems: 'center', width: 50, marginRight: 10 },
    timeText: { fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 5 },
    verticalLine: { flex: 1, width: 2, backgroundColor: '#EEE', marginBottom: -10 },

    card: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
    cardNormal: { borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
    cardSangria: { borderLeftWidth: 4, borderLeftColor: '#F44336' },

    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    cardUser: { fontSize: 12, color: '#999' },
    cardValue: { fontWeight: 'bold', fontSize: 14 }
});
