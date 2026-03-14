import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

// @ts-ignore
import { SalesByDayChart, SalesByPaymentChart } from '../components/FinancialCharts';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/SupabaseConfig';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';
// Tipos para as props dos componentes internos
interface KPICardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
}

// Métricas KPI
const KPICard: React.FC<KPICardProps> = ({ title, value, subtext, icon, color }) => (
    <View style={styles.kpiCard}>
        <View style={[styles.kpiIconContainer, { backgroundColor: color || colors.secondary }]}>
            <Ionicons name={icon || 'stats-chart'} size={24} color={colors.white} />
        </View>
        <View style={styles.kpiContent}>
            <Text style={styles.kpiLabel}>{String(title)}</Text>
            <Text style={styles.kpiValue}>{String(value)}</Text>
            {!!subtext && <Text style={styles.kpiSubtext}>{String(subtext)}</Text>}
        </View>
    </View>
);

// Tipos para o estado
interface KpisState {
    faturamento: number;
    pedidos: number;
    ticketMedio: number;
    topProduto: string;
    totalCancelado: number;
    qtdCanceladas: number;
    taxaCancelamento: number;
}

interface ChartDataState {
    salesByDay: any; // Tipar melhor se migrar os charts
    salesByPayment: any[];
}

interface FinancialDashboardScreenProps {
    onClose: () => void;
}

export default function FinancialDashboardScreen({ onClose }: FinancialDashboardScreenProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState<boolean>(true);
    const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias'>('7dias'); // 'hoje', '7dias', '30dias'

    const [kpis, setKpis] = useState<KpisState>({
        faturamento: 0,
        pedidos: 0,
        ticketMedio: 0,
        topProduto: '-',
        totalCancelado: 0,
        qtdCanceladas: 0,
        taxaCancelamento: 0
    });

    const [chartData, setChartData] = useState<ChartDataState>({
        salesByDay: null,
        salesByPayment: []
    });

    useEffect(() => {
        carregarDados();
    }, [periodo]);

    const carregarDados = async () => {
        if (!user?.companyId) return;
        setLoading(true);

        try {
            const hoje = new Date();
            const startDate = new Date();

            if (periodo === 'hoje') {
                startDate.setHours(0, 0, 0, 0);
            } else if (periodo === '7dias') {
                startDate.setDate(hoje.getDate() - 7);
            } else if (periodo === '30dias') {
                startDate.setDate(hoje.getDate() - 30);
            }

            const dateStr = startDate.toISOString().split('T')[0];
            const endDateStr = hoje.toISOString().split('T')[0];

            // 1. Buscar Comandas Fechadas no Período (VENDAS)
            const { data: comandasData, error: comandasError } = await supabase
                .from('comandas')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('status', 'fechada')
                .gte('date_key', dateStr)
                .lte('date_key', endDateStr);

            if (comandasError) throw comandasError;

            let totalFaturamento = 0;
            let totalPedidos = 0;
            let totalCancelado = 0;
            let qtdCanceladas = 0;
            const vendasPorDia: Record<string, number> = {}; // { 'YYYY-MM-DD': valor }
            const formasPagamento = { dinheiro: 0, pix: 0, debito: 0, credito: 0, outros: 0 };
            const produtosCount: Record<string, number> = {};

            // Inicializar TODOS os dias do período com 0
            const periodStartDate = new Date(dateStr);
            const endDate = new Date(endDateStr);
            const currentDate = new Date(periodStartDate);
            
            while (currentDate <= endDate) {
                const dKey = currentDate.toISOString().split('T')[0];
                vendasPorDia[dKey] = 0;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Processar comandas fechadas (VENDAS)
            for (const comanda of (comandasData || [])) {
                let comandaDateKey = comanda.date_key;

                // Se não tiver dateKey, tentar extrair da data de fechamento
                if (!comandaDateKey && comanda.closed_at) {
                    comandaDateKey = new Date(comanda.closed_at).toISOString().split('T')[0];
                }

                // Filtrar pelo período
                if (comandaDateKey && comandaDateKey >= dateStr && comandaDateKey <= endDateStr) {
                    const valor = parseFloat(comanda.total_consumed || 0);
                    
                    // ✅ VALIDAÇÃO: Ignorar valores absurdos (maior que R$ 10.000)
                    if (valor > 0 && valor < 10000) {
                        totalFaturamento += valor;
                        totalPedidos++;
                        vendasPorDia[comandaDateKey] = (vendasPorDia[comandaDateKey] || 0) + valor;
                    } else if (valor >= 10000) {
                        console.warn(`⚠️ Valor suspeito ignorado: R$ ${valor.toFixed(2)} na comanda ${comanda.comanda_number}`);
                    }

                    // Contar produtos
                    if (comanda.items && Array.isArray(comanda.items)) {
                        comanda.items.forEach((itemStr: string) => {
                            const nome = itemStr.replace(/^\d+x\s*/, '').trim();
                            produtosCount[nome] = (produtosCount[nome] || 0) + 1;
                        });
                    }
                }
            }

            // 2. Buscar Comandas CANCELADAS no Período
            const { data: canceladasData, error: canceladasError } = await supabase
                .from('comandas')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('status', 'cancelada')
                .gte('date_key', dateStr)
                .lte('date_key', endDateStr);

            if (canceladasError) throw canceladasError;

            (canceladasData || []).forEach((comanda: any) => {
                let comandaDateKey = comanda.date_key;

                // Extrair dateKey se não existir
                if (!comandaDateKey && comanda.canceled_at) {
                    comandaDateKey = new Date(comanda.canceled_at).toISOString().split('T')[0];
                }

                if (comandaDateKey && comandaDateKey >= dateStr && comandaDateKey <= endDateStr) {
                    const valor = parseFloat(comanda.total_consumed || 0);
                    if (valor > 0 && valor < 10000) {
                        totalCancelado += valor;
                        qtdCanceladas++;
                    }
                }
            });

            // 3. Buscar Pagamentos Separadamente para ter breakdown correto
            const { data: pagamentosData, error: pagamentosError } = await supabase
                .from('pagamentos')
                .select('*')
                .eq('company_id', user.companyId)
                .gte('date_key', dateStr)
                .lte('date_key', endDateStr);

            if (pagamentosError) throw pagamentosError;

            (pagamentosData || []).forEach((p: any) => {
                const valor = parseFloat(p.amount || 0);
                
                // ✅ VALIDAÇÃO: Ignorar valores absurdos
                if (valor > 0 && valor < 10000) {
                    let metodo = p.payment_method || 'outros';
                    metodo = metodo.toLowerCase();

                    if (metodo.includes('dinheiro')) formasPagamento.dinheiro += valor;
                    else if (metodo.includes('pix')) formasPagamento.pix += valor;
                    else if (metodo.includes('débito') || metodo.includes('debito')) formasPagamento.debito += valor;
                    else if (metodo.includes('crédito') || metodo.includes('credito')) formasPagamento.credito += valor;
                    else formasPagamento.outros += valor;
                } else if (valor >= 10000) {
                    console.warn(`⚠️ Pagamento com valor suspeito ignorado: R$ ${valor.toFixed(2)}`);
                }
            });

            // 4. Buscar Top Produto (requer ler 'itens' das comandas)
            // Já processado acima durante iteração das comandas fechadas

            // Encontrar Top Produto
            let topProdName = '-';
            let maxCount = 0;
            Object.entries(produtosCount).forEach(([nome, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    topProdName = nome;
                }
            });

            // 5. Preparar dados para Gráfico de Barras (Dias)
            // Ordenar dias e formatar labels
            const sortedKeys = Object.keys(vendasPorDia).sort();
            const labels = sortedKeys.map(d => {
                const parts = d.split('-');
                return parts[2] + '/' + parts[1]; // DD/MM
            });
            const dataValues = sortedKeys.map(k => Math.round(vendasPorDia[k] * 100) / 100); // Arredondar para 2 casas decimais

            const chartDataDay = {
                labels: labels.length > 0 ? labels : ['Sem dados'],
                datasets: [{ data: dataValues.length > 0 ? dataValues : [0] }]
            };

            // 6. Preparar dados para Gráfico de Pizza (Pagamentos)
            const pieData = [
                { name: 'Dinheiro', population: Math.round(formasPagamento.dinheiro * 100) / 100, color: colors.success, legendFontColor: colors.textSecondary, legendFontSize: 12 },
                { name: 'Pix', population: Math.round(formasPagamento.pix * 100) / 100, color: colors.secondary, legendFontColor: colors.textSecondary, legendFontSize: 12 },
                { name: 'Débito', population: Math.round(formasPagamento.debito * 100) / 100, color: colors.warning, legendFontColor: colors.textSecondary, legendFontSize: 12 },
                { name: 'Crédito', population: Math.round(formasPagamento.credito * 100) / 100, color: colors.secondary, legendFontColor: colors.textSecondary, legendFontSize: 12 },
                { name: 'Outros', population: Math.round(formasPagamento.outros * 100) / 100, color: colors.textSecondary, legendFontColor: colors.textSecondary, legendFontSize: 12 },
            ].filter(item => item.population > 0);

            // 7. Calcular taxa de cancelamento
            const totalOperacoes = totalPedidos + qtdCanceladas;
            const taxaCancelamento = totalOperacoes > 0 ? (qtdCanceladas / totalOperacoes) * 100 : 0;

            setKpis({
                faturamento: totalFaturamento,
                pedidos: totalPedidos,
                ticketMedio: totalPedidos > 0 ? totalFaturamento / totalPedidos : 0,
                topProduto: topProdName !== '-' ? `${topProdName} (${maxCount})` : '-',
                totalCancelado,
                qtdCanceladas,
                taxaCancelamento
            });

            setChartData({
                salesByDay: chartDataDay,
                salesByPayment: pieData
            });

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenScaffold
            title="📊 Dashboard Financeiro"
            leftAction={{ label: 'Voltar', onPress: onClose }}
        >
            {/* Filtros de Período */}
            <View style={styles.filterContainer}>
                {(['hoje', '7dias', '30dias'] as const).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.filterBtn, periodo === p && styles.filterBtnActive]}
                        onPress={() => setPeriodo(p)}
                    >
                        <Text style={[styles.filterText, periodo === p && styles.filterTextActive]}>
                            {p === 'hoje' ? 'Hoje' : p === '7dias' ? '7 Dias' : '30 Dias'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {/* Section: KPIs */}
                    <View style={styles.kpiRow}>
                        <KPICard
                            title="Faturamento"
                            value={formatCurrency(kpis.faturamento)}
                            icon="cash-outline"
                            color={colors.success}
                        />
                        <KPICard
                            title="Ticket Médio"
                            value={formatCurrency(kpis.ticketMedio)}
                            icon="wallet-outline"
                            color={colors.secondary}
                        />
                    </View>
                    <View style={styles.kpiRow}>
                        <KPICard
                            title="Pedidos"
                            value={kpis.pedidos}
                            icon="receipt-outline"
                            color={colors.warning}
                        />
                        <KPICard
                            title="Top Produto"
                            value={kpis.topProduto.split('(')[0].trim()}
                            subtext={kpis.topProduto.includes('(') ? kpis.topProduto.split('(')[1].replace(')', ' unid.') : ''}
                            icon="star-outline"
                            color={colors.secondary}
                        />
                    </View>

                    {/* Section: Cancelamentos (só mostra se houver cancelamentos) */}
                    {kpis.qtdCanceladas > 0 && (
                        <View style={styles.cancelamentoSection}>
                            <Text style={styles.cancelamentoTitle}>📊 Estatísticas de Cancelamento</Text>
                            <View style={styles.kpiRow}>
                                <View style={[styles.kpiCard, styles.cancelamentoCard]}>
                                    <View style={[styles.kpiIconContainer, { backgroundColor: colors.warning }]}>
                                        <Ionicons name="close-circle-outline" size={24} color={colors.white} />
                                    </View>
                                    <View style={styles.kpiContent}>
                                        <Text style={styles.kpiLabel}>Total Cancelado</Text>
                                        <Text style={[styles.kpiValue, { color: colors.warning }]}>{formatCurrency(kpis.totalCancelado)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.kpiCard, styles.cancelamentoCard]}>
                                    <View style={[styles.kpiIconContainer, { backgroundColor: colors.warning }]}>
                                        <Ionicons name="alert-circle-outline" size={24} color={colors.white} />
                                    </View>
                                    <View style={styles.kpiContent}>
                                        <Text style={styles.kpiLabel}>Comandas Canceladas</Text>
                                        <Text style={[styles.kpiValue, { color: colors.warning }]}>{kpis.qtdCanceladas}</Text>
                                        <Text style={styles.kpiSubtext}>Taxa: {kpis.taxaCancelamento.toFixed(1)}%</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Section: Charts */}
                    <Text style={styles.sectionTitle}>Evolução de Vendas</Text>
                    <SalesByDayChart data={chartData.salesByDay} />

                    <Text style={styles.sectionTitle}>Meios de Pagamento</Text>
                    {chartData.salesByPayment.length > 0 ? (
                        <SalesByPaymentChart data={chartData.salesByPayment} />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text>Sem dados de pagamento no período.</Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </ScreenScaffold>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    filterContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15, gap: 10 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.border },
    filterBtnActive: { backgroundColor: colors.primary },
    filterText: { color: colors.textSecondary, fontWeight: 'bold' },
    filterTextActive: { color: colors.white },

    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    kpiCard: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    kpiIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    kpiContent: { flex: 1 },
    kpiLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    kpiValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    kpiSubtext: { fontSize: 10, color: colors.textSecondary },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 20, marginBottom: 10, marginLeft: 5 },
    emptyChart: { padding: 30, alignItems: 'center', backgroundColor: colors.white, borderRadius: 10 },

    cancelamentoSection: { marginTop: 15, marginBottom: 10 },
    cancelamentoTitle: { fontSize: 16, fontWeight: 'bold', color: colors.warning, marginBottom: 10, marginLeft: 5 },
    cancelamentoCard: { backgroundColor: colors.warningSurface }
});
