import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import { EstatisticasGarcomContainer } from '../components/EstatisticasGarcom';
import { colors } from '../theme/colors';

// Função auxiliar para gerar lista de meses disponíveis (últimos 12 meses)
const gerarMesesDisponiveis = () => {
    const meses = [];
    const nomeMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const hoje = new Date();

    for (let i = 0; i < 12; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = data.getMonth();
        const valor = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const label = `${nomeMeses[mes]} ${ano}`;
        const isAtual = i === 0;

        meses.push({ valor, label, isAtual });
    }

    return meses;
};

interface Props {
    onClose?: () => void;
}

export default function ComandaVisualizacaoAdminScreen({ onClose }: Props) {
    const { user } = useAuth();
    // @ts-ignore
    const { getEstatisticasCompletas, getEstatisticasTodosGarcons } = useOrders();
    const [estatisticas, setEstatisticas] = useState<any>(null);
    const [loadingEstatisticas, setLoadingEstatisticas] = useState(false);
    const [garconsDisponiveis, setGarconsDisponiveis] = useState<any[]>([]);
    const [garcomSelecionado, setGarcomSelecionado] = useState<string | null>(null);
    const [mesSelecionado, setMesSelecionado] = useState<string | null>(null); // null = mês vigente
    const [modalMesVisible, setModalMesVisible] = useState(false);

    // Lista de meses disponíveis para filtro
    const mesesDisponiveis = useMemo(() => gerarMesesDisponiveis(), []);

    // Verificar se é Admin
    useEffect(() => {
        // @ts-ignore
        if (user && user.funcao !== 'admin') {
            Alert.alert(
                'Acesso Negado',
                'Esta área é exclusiva para administradores.',
                [{ text: 'OK' }]
            );
        }
    }, [user]);

    // Carregamento inicial e auto-refresh
    useEffect(() => {
        // @ts-ignore
        if (user && user.funcao === 'admin') {
            // Carregamento inicial
            carregarEstatisticas();

            // Auto-refresh a cada 30 segundos (silenciosamente)
            const intervalId = setInterval(() => {
                carregarEstatisticas(true);
            }, 30000);

            return () => clearInterval(intervalId);
        }
    }, [user, garcomSelecionado, mesSelecionado]);

    // Obter o label do mês selecionado
    const getMesSelecionadoLabel = () => {
        if (!mesSelecionado) {
            return 'Mês Vigente';
        }
        const mes = mesesDisponiveis.find(m => m.valor === mesSelecionado);
        return mes ? mes.label : 'Mês Vigente';
    };

    const carregarEstatisticas = async (silent = false) => {
        if (!silent) setLoadingEstatisticas(true);
        try {
            // Determinar o período para busca
            const periodo = mesSelecionado || 'mesVigente';

            // Se é admin, pode visualizar todos os garçons ou um específico
            // @ts-ignore
            if (user.funcao === 'admin') {
                // 🔄 Carregar lista de garçons disponíveis
                const todosGarcons = await getEstatisticasTodosGarcons(periodo);
                setGarconsDisponiveis(todosGarcons || []);

                // Se nenhum garçom selecionado, mostrar TODOS (null)
                let garcomId = garcomSelecionado;
                let garcomNome = 'Todos os Garçons';

                // garcomSelecionado = null significa "TODOS"
                if (garcomSelecionado === null) {
                    garcomId = null;
                    garcomNome = 'Todos os Garçons';
                } else if (garcomSelecionado && todosGarcons) {
                    // @ts-ignore
                    garcomNome = todosGarcons.find(g => g.garcomId === garcomSelecionado)?.garcomNome || 'Todos';
                }

                // Buscar estatísticas (null = todos os pedidos, ou ID específico)
                const stats = await getEstatisticasCompletas(garcomId, mesSelecionado);

                // Se não há garçons mas há pedidos, mostrar como "Geral"
                if (!garcomId && (!todosGarcons || todosGarcons.length === 0)) {
                    garcomNome = 'Geral (Todos os Pedidos)';
                }

                setEstatisticas({ ...stats, garcomNome });
            } else {
                // Garçom comum vê apenas suas próprias estatísticas
                // @ts-ignore
                const stats = await getEstatisticasCompletas(user.id, mesSelecionado);
                // @ts-ignore
                setEstatisticas({ ...stats, garcomNome: user.nome });
            }
        } catch (error) {
            console.error('[ComandaVisualizacao] Erro ao carregar estatísticas:', error);
            if (!silent) Alert.alert('Erro', 'Não foi possível carregar as estatísticas.');
        } finally {
            if (!silent) setLoadingEstatisticas(false);
        }
    };

    // Bloquear acesso se não for Admin
    // @ts-ignore
    if (!user || user.funcao !== 'admin') {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Acesso Restrito</Text>
                </View>
                <View style={styles.accessDenied}>
                    <Text style={styles.accessDeniedIcon}>🔒</Text>
                    <Text style={styles.accessDeniedTitle}>Área Exclusiva</Text>
                    <Text style={styles.accessDeniedText}>
                        Esta funcionalidade é exclusiva para administradores.
                    </Text>
                    <Text style={styles.accessDeniedSubtext}>
                        Apenas o Admin/Dona pode visualizar comandas no final do dia.
                    </Text>
                </View>
            </View>
        );
    }

    // Tela Principal de Estatísticas
    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>📊 Estatísticas dos Garçons</Text>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.headerButtons}>

                    </View>
                </View>
            </View>

            {/* Indicador do Mês Selecionado */}
            <View style={styles.mesIndicadorContainer}>
                <TouchableOpacity
                    style={styles.mesIndicador}
                    onPress={() => setModalMesVisible(true)}
                >
                    <Text style={styles.mesIndicadorIcon}>📅</Text>
                    <Text style={styles.mesIndicadorText}>{getMesSelecionadoLabel()}</Text>
                    <Text style={styles.mesIndicadorSeta}>▼</Text>
                </TouchableOpacity>
            </View>

            {/* Seletor de Garçom (somente para Admin) */}
            {garconsDisponiveis.length > 0 && (
                <View style={styles.garcomSelectorContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.garcomScroll}>
                        {/* Chip "TODOS" para ver estatísticas consolidadas */}
                        <TouchableOpacity
                            key="todos"
                            style={[styles.garcomChip, garcomSelecionado === null && styles.garcomChipActive]}
                            onPress={() => setGarcomSelecionado(null)}
                        >
                            <Text style={[styles.garcomChipText, garcomSelecionado === null && styles.garcomChipTextActive]}>
                                📊 TODOS
                            </Text>
                            <Text style={[styles.garcomChipSubtext, garcomSelecionado === null && styles.garcomChipSubtextActive]}>
                                R$ {garconsDisponiveis.reduce((sum, g) => sum + (g.totalVendido || 0), 0).toFixed(2)}
                            </Text>
                        </TouchableOpacity>

                        {/* Chips individuais por garçom */}
                        {garconsDisponiveis.map((garcom) => (
                            <TouchableOpacity
                                key={garcom.garcomId}
                                style={[styles.garcomChip, garcomSelecionado === garcom.garcomId && styles.garcomChipActive]}
                                onPress={() => setGarcomSelecionado(garcom.garcomId)}
                            >
                                <Text style={[styles.garcomChipText, garcomSelecionado === garcom.garcomId && styles.garcomChipTextActive]}>
                                    {garcom.garcomNome}
                                </Text>
                                <Text style={[styles.garcomChipSubtext, garcomSelecionado === garcom.garcomId && styles.garcomChipSubtextActive]}>
                                    R$ {(garcom.totalVendido || 0).toFixed(2)} • {garcom.totalPedidos || 0} pedidos
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Mensagem quando não há garçons */}
            {garconsDisponiveis.length === 0 && !loadingEstatisticas && (
                <View style={styles.noGarconsContainer}>
                    <Text style={styles.noGarconsText}>
                        Nenhum garçom com pedidos encontrado em {getMesSelecionadoLabel()}.
                    </Text>
                    <Text style={styles.noGarconsSubtext}>
                        Selecione outro mês usando o botão 📅 acima.
                    </Text>
                </View>
            )}

            {/* Modal de Seleção de Mês */}
            <Modal
                visible={modalMesVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalMesVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📅 Selecionar Mês</Text>
                            <TouchableOpacity onPress={() => setModalMesVisible(false)}>
                                <Text style={styles.modalCloseBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.mesesLista}>
                            {/* Opção "Mês Vigente" no topo */}
                            <TouchableOpacity
                                style={[
                                    styles.mesItem,
                                    mesSelecionado === null && styles.mesItemAtivo
                                ]}
                                onPress={() => {
                                    setMesSelecionado(null);
                                    setModalMesVisible(false);
                                }}
                            >
                                <Text style={[
                                    styles.mesItemText,
                                    mesSelecionado === null && styles.mesItemTextAtivo
                                ]}>
                                    📅 Mês Vigente (Atual)
                                </Text>
                                {mesSelecionado === null && (
                                    <Text style={styles.mesItemCheck}>✓</Text>
                                )}
                            </TouchableOpacity>

                            {/* Lista de meses específicos */}
                            {mesesDisponiveis.map((mes) => (
                                <TouchableOpacity
                                    key={mes.valor}
                                    style={[
                                        styles.mesItem,
                                        mesSelecionado === mes.valor && styles.mesItemAtivo
                                    ]}
                                    onPress={() => {
                                        setMesSelecionado(mes.valor);
                                        setModalMesVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.mesItemText,
                                        mesSelecionado === mes.valor && styles.mesItemTextAtivo
                                    ]}>
                                        {mes.label}
                                    </Text>
                                    {mes.isAtual && (
                                        <View style={styles.mesAtualBadge}>
                                            <Text style={styles.mesAtualText}>ATUAL</Text>
                                        </View>
                                    )}
                                    {mesSelecionado === mes.valor && (
                                        <Text style={styles.mesItemCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <EstatisticasGarcomContainer
                estatisticas={estatisticas}
                // @ts-ignore
                nomeGarcom={estatisticas?.garcomNome || user?.nome || 'Carregando...'}
                loading={loadingEstatisticas}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 10,
        elevation: 8,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 4, // More space for title
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: colors.white,
        fontSize: 20, // Slightly smaller to fit
        fontWeight: 'bold',
        textAlign: 'center',
    },
    filterBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
    },
    filterText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    refreshBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    refreshText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    accessDenied: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    accessDeniedIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    accessDeniedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 15,
    },
    accessDeniedText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
    },
    accessDeniedSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    garcomSelectorContainer: {
        backgroundColor: colors.white,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    garcomScroll: {
        paddingHorizontal: 15,
    },
    garcomChip: {
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        minWidth: 100,
        alignItems: 'center',
    },
    garcomChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    garcomChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    garcomChipTextActive: {
        color: colors.white,
    },
    garcomChipSubtext: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
        marginTop: 2,
    },
    garcomChipSubtextActive: {
        color: 'rgba(255,255,255,0.85)',
    },
    noGarconsContainer: {
        backgroundColor: colors.white,
        padding: 20,
        margin: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    noGarconsText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    noGarconsSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    // Estilos para indicador de mês
    mesIndicadorContainer: {
        backgroundColor: colors.white,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    mesIndicador: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF7ED',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mesIndicadorIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    mesIndicadorText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    mesIndicadorSeta: {
        fontSize: 12,
        marginLeft: 8,
        color: colors.primary,
    },
    // Estilos para modal de seleção de mês
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    modalCloseBtn: {
        fontSize: 20,
        color: colors.textSecondary,
        padding: 4,
    },
    mesesLista: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 30,
    },
    mesItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginVertical: 3,
        borderRadius: 10,
        backgroundColor: '#FFF7ED',
    },
    mesItemAtivo: {
        backgroundColor: colors.primary,
    },
    mesItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
        flex: 1,
    },
    mesItemTextAtivo: {
        color: colors.white,
        fontWeight: '600',
    },
    mesAtualBadge: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 10,
    },
    mesAtualText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.white,
    },
    mesItemCheck: {
        fontSize: 18,
        color: colors.white,
        fontWeight: '700',
    },
});
