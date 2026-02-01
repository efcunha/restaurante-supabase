import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { query, where, getDocs } from 'firebase/firestore';
import { getCompanyCollection } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';
import { SalesByDayChart, SalesByPaymentChart } from '../components/FinancialCharts';
import { Ionicons } from '@expo/vector-icons';

// Métricas KPI
// Métricas KPI
const KPICard = ({ title, value, subtext, icon, color }) => (
    <View style={styles.kpiCard}>
        <View style={[styles.kpiIconContainer, { backgroundColor: color || '#E5B84A' }]}>
            <Ionicons name={icon || 'stats-chart'} size={24} color="#FFF" />
        </View>
        <View style={styles.kpiContent}>
            <Text style={styles.kpiLabel}>{String(title)}</Text>
            <Text style={styles.kpiValue}>{String(value)}</Text>
            {!!subtext && <Text style={styles.kpiSubtext}>{String(subtext)}</Text>}
        </View>
    </View>
);

export default function FinancialDashboardScreen({ onClose }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('7dias'); // 'hoje', '7dias', '30dias'

    const [kpis, setKpis] = useState({
        faturamento: 0,
        pedidos: 0,
        ticketMedio: 0,
        topProduto: '-',
        totalCancelado: 0,
        qtdCanceladas: 0,
        taxaCancelamento: 0
    });

    const [chartData, setChartData] = useState({
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
            const q = query(
                getCompanyCollection(user.companyId, 'comandas'),
                where('status', '==', 'fechada')
            );

            const snapshot = await getDocs(q);

            let totalFaturamento = 0;
            let totalPedidos = 0;
            let totalCancelado = 0;
            let qtdCanceladas = 0;
            const vendasPorDia = {}; // { 'YYYY-MM-DD': valor }
            const formasPagamento = { dinheiro: 0, pix: 0, debito: 0, credito: 0, outros: 0 };
            const produtosCount = {};

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
            for (const doc of snapshot.docs) {
                const data = doc.data();
                let comandaDateKey = data.dateKey;

                // Se não tiver dateKey, tentar extrair da data de fechamento
                if (!comandaDateKey && data.fechadaAt) {
                    if (data.fechadaAt.toDate) {
                        comandaDateKey = data.fechadaAt.toDate().toISOString().split('T')[0];
                    } else if (data.fechadaAt.seconds) {
                        const date = new Date(data.fechadaAt.seconds * 1000);
                        comandaDateKey = date.toISOString().split('T')[0];
                    }
                }

                // Filtrar pelo período
                if (comandaDateKey && comandaDateKey >= dateStr && comandaDateKey <= endDateStr) {
                    const valor = parseFloat(data.totalConsumido || 0);
                    
                    // ✅ VALIDAÇÃO: Ignorar valores absurdos (maior que R$ 10.000)
                    if (valor > 0 && valor < 10000) {
                        totalFaturamento += valor;
                        totalPedidos++;
                        vendasPorDia[comandaDateKey] = (vendasPorDia[comandaDateKey] || 0) + valor;
                    } else if (valor >= 10000) {
                        console.warn(`⚠️ Valor suspeito ignorado: R$ ${valor.toFixed(2)} na comanda ${data.comandaNumber}`);
                    }

                    // Contar produtos
                    if (data.itens && Array.isArray(data.itens)) {
                        data.itens.forEach(itemStr => {
                            const nome = itemStr.replace(/^\d+x\s*/, '').trim();
                            produtosCount[nome] = (produtosCount[nome] || 0) + 1;
                        });
                    }
                }
            }

            // 2. Buscar Comandas CANCELADAS no Período
            const qCanceladas = query(
                getCompanyCollection(user.companyId, 'comandas'),
                where('status', '==', 'cancelada')
            );

            const snapshotCanceladas = await getDocs(qCanceladas);

            snapshotCanceladas.docs.forEach(doc => {
                const comanda = doc.data();
                let comandaDateKey = comanda.dateKey;

                // Extrair dateKey se não existir
                if (!comandaDateKey && comanda.canceladaEm) {
                    if (typeof comanda.canceladaEm === 'string') {
                        comandaDateKey = comanda.canceladaEm.split('T')[0];
                    } else if (comanda.canceladaEm.seconds) {
                        const date = new Date(comanda.canceladaEm.seconds * 1000);
                        comandaDateKey = date.toISOString().split('T')[0];
                    }
                }

                if (comandaDateKey && comandaDateKey >= dateStr && comandaDateKey <= endDateStr) {
                    const valor = parseFloat(comanda.totalConsumido || 0);
                    if (valor > 0 && valor < 10000) {
                        totalCancelado += valor;
                        qtdCanceladas++;
                    }
                }
            });

            // 3. Buscar Pagamentos Separadamente para ter breakdown correto
            const qPagamentos = query(
                getCompanyCollection(user.companyId, 'pagamentos'),
                where('dateKey', '>=', dateStr),
                where('dateKey', '<=', endDateStr)
            );
            const snapPagamentos = await getDocs(qPagamentos);

            snapPagamentos.forEach(doc => {
                const p = doc.data();
                const valor = parseFloat(p.valor || 0);
                
                // ✅ VALIDAÇÃO: Ignorar valores absurdos
                if (valor > 0 && valor < 10000) {
                    let metodo = p.forma || p.metodo || 'outros';
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
                { name: 'Dinheiro', population: Math.round(formasPagamento.dinheiro * 100) / 100, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Pix', population: Math.round(formasPagamento.pix * 100) / 100, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Débito', population: Math.round(formasPagamento.debito * 100) / 100, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Crédito', population: Math.round(formasPagamento.credito * 100) / 100, color: '#9C27B0', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Outros', population: Math.round(formasPagamento.outros * 100) / 100, color: '#607D8B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
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

    const formatCurrency = (val) => {
        return 'R$ ' + (val || 0).toFixed(2).replace('.', ',');
    };

    return (
        <View style={styles.container}>
            <BackgroundPattern />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📊 Dashboard Financeiro</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filtros de Período */}
            <View style={styles.filterContainer}>
                {['hoje', '7dias', '30dias'].map((p) => (
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
                    <ActivityIndicator size="large" color="#8B2F2F" />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {/* Section: KPIs */}
                    <View style={styles.kpiRow}>
                        <KPICard
                            title="Faturamento"
                            value={formatCurrency(kpis.faturamento)}
                            icon="cash-outline"
                            color="#4CAF50"
                        />
                        <KPICard
                            title="Ticket Médio"
                            value={formatCurrency(kpis.ticketMedio)}
                            icon="wallet-outline"
                            color="#2196F3"
                        />
                    </View>
                    <View style={styles.kpiRow}>
                        <KPICard
                            title="Pedidos"
                            value={kpis.pedidos}
                            icon="receipt-outline"
                            color="#FF9800"
                        />
                        <KPICard
                            title="Top Produto"
                            value={kpis.topProduto.split('(')[0].trim()}
                            subtext={kpis.topProduto.includes('(') ? kpis.topProduto.split('(')[1].replace(')', ' unid.') : ''}
                            icon="star-outline"
                            color="#9C27B0"
                        />
                    </View>

                    {/* Section: Cancelamentos (só mostra se houver cancelamentos) */}
                    {kpis.qtdCanceladas > 0 && (
                        <View style={styles.cancelamentoSection}>
                            <Text style={styles.cancelamentoTitle}>📊 Estatísticas de Cancelamento</Text>
                            <View style={styles.kpiRow}>
                                <View style={[styles.kpiCard, styles.cancelamentoCard]}>
                                    <View style={[styles.kpiIconContainer, { backgroundColor: '#E65100' }]}>
                                        <Ionicons name="close-circle-outline" size={24} color="#FFF" />
                                    </View>
                                    <View style={styles.kpiContent}>
                                        <Text style={styles.kpiLabel}>Total Cancelado</Text>
                                        <Text style={[styles.kpiValue, { color: '#E65100' }]}>{formatCurrency(kpis.totalCancelado)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.kpiCard, styles.cancelamentoCard]}>
                                    <View style={[styles.kpiIconContainer, { backgroundColor: '#E65100' }]}>
                                        <Ionicons name="alert-circle-outline" size={24} color="#FFF" />
                                    </View>
                                    <View style={styles.kpiContent}>
                                        <Text style={styles.kpiLabel}>Comandas Canceladas</Text>
                                        <Text style={[styles.kpiValue, { color: '#E65100' }]}>{kpis.qtdCanceladas}</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F1E8' },
    header: {
        backgroundColor: '#8B2F2F',
        paddingTop: 50,
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
        zIndex: 10,
    },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1, padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    filterContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15, gap: 10 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#E0D8C8' },
    filterBtnActive: { backgroundColor: '#8B2F2F' },
    filterText: { color: '#666', fontWeight: 'bold' },
    filterTextActive: { color: '#FFF' },

    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    kpiCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    kpiIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    kpiContent: { flex: 1 },
    kpiLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
    kpiValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    kpiSubtext: { fontSize: 10, color: '#999' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B2F2F', marginTop: 20, marginBottom: 10, marginLeft: 5 },
    emptyChart: { padding: 30, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10 },

    cancelamentoSection: { marginTop: 15, marginBottom: 10 },
    cancelamentoTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 10, marginLeft: 5 },
    cancelamentoCard: { backgroundColor: '#FFF3E0' }
});
