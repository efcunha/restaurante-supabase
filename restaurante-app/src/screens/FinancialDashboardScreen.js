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
        topProduto: '-'
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

            // 1. Buscar Comandas Fechadas no Período
            // Obs: Para querys complexas (range filter + order), o Firestore exige index.
            // Vamos buscar pelo dateKey e filtrar na memória se necessário, ou usar startAt.
            // Assumindo que dateKey é string 'YYYY-MM-DD'

            const q = query(
                getCompanyCollection(user.companyId, 'comandas'),
                where('status', '==', 'fechada'),
                where('dateKey', '>=', dateStr),
                where('dateKey', '<=', endDateStr)
            );

            const snapshot = await getDocs(q);

            let totalFaturamento = 0;
            let totalPedidos = snapshot.size;
            const vendasPorDia = {}; // { '20-01': 100, '21-01': 200 }
            const formasPagamento = { dinheiro: 0, pix: 0, debito: 0, credito: 0, outros: 0 };
            const produtosCount = {};

            // Processar dados no cliente para evitar criar 50 índices compostos
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const valor = parseFloat(data.totalConsumido || 0);
                totalFaturamento += valor;

                // Agrupar por dia (dd/mm)
                const diaMes = data.dateKey ? data.dateKey.split('-').slice(1).reverse().join('/') : 'N/A';
                vendasPorDia[diaMes] = (vendasPorDia[diaMes] || 0) + valor;

                // Formas de pagamento (se disponível no objeto 'pagamentos' ou 'formas')
                // Assumindo estrutura simplificada ou que teríamos que buscar sub-coleção 'pagamentos'. 
                // Se não tivermos detalhe fácil na comanda, buscamos da coleção 'caixas' ou 'pagamentos'.
                // SIMPLIFICAÇÃO: Se a comanda guardou resumo de pagamento, usamos. Se não, ideal é buscar de 'pagamentos'.
            }

            // Buscar Pagamentos Separadamente para ter breakdown correto
            // (a comanda tem o total, mas o split de pagamento fica na coleção pagamentos)
            const qPagamentos = query(
                getCompanyCollection(user.companyId, 'pagamentos'),
                where('dateKey', '>=', dateStr),
                where('dateKey', '<=', endDateStr)
            );
            const snapPagamentos = await getDocs(qPagamentos);

            snapPagamentos.forEach(doc => {
                const p = doc.data();
                const valor = parseFloat(p.valor || 0);
                // Fix: Field name is 'forma', fallback to 'metodo' just in case
                let metodo = p.forma || p.metodo || 'outros';
                metodo = metodo.toLowerCase();

                if (metodo.includes('dinheiro')) formasPagamento.dinheiro += valor;
                else if (metodo.includes('pix')) formasPagamento.pix += valor;
                else if (metodo.includes('débito') || metodo.includes('debito')) formasPagamento.debito += valor;
                else if (metodo.includes('crédito') || metodo.includes('credito')) formasPagamento.credito += valor;
                else formasPagamento.outros += valor;
            });

            // Buscar Top Produto (requer ler 'itens' das comandas ou 'pedidos')
            // Se a comanda tem array 'itens', usamos.
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.itens && Array.isArray(data.itens)) {
                    data.itens.forEach(itemStr => {
                        // Ex: "2x Coca Cola" -> remover qtd
                        const nome = itemStr.replace(/^\d+x\s*/, '').trim();
                        produtosCount[nome] = (produtosCount[nome] || 0) + 1;
                    });
                }
            });

            // Encontrar Top Produto
            let topProdName = '-';
            let maxCount = 0;
            Object.entries(produtosCount).forEach(([nome, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    topProdName = nome;
                }
            });

            // Preparar dados para Gráfico de Barras (Dias)
            const sortedKeys = Object.keys(vendasPorDia).sort(); // Ordenar datas seria ideal
            const labels = sortedKeys;
            const dataValues = sortedKeys.map(k => vendasPorDia[k]);

            const chartDataDay = {
                labels: labels.length > 0 ? labels : ['Sem dados'],
                datasets: [{ data: dataValues.length > 0 ? dataValues : [0] }]
            };

            // Preparar dados para Gráfico de Pizza (Pagamentos)
            const pieData = [
                { name: 'Dinheiro', population: formasPagamento.dinheiro, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Pix', population: formasPagamento.pix, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Débito', population: formasPagamento.debito, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Crédito', population: formasPagamento.credito, color: '#9C27B0', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                { name: 'Outros', population: formasPagamento.outros, color: '#607D8B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
            ].filter(item => item.population > 0);

            setKpis({
                faturamento: totalFaturamento,
                pedidos: totalPedidos,
                ticketMedio: totalPedidos > 0 ? totalFaturamento / totalPedidos : 0,
                topProduto: topProdName !== '-' ? `${topProdName} (${maxCount})` : '-'
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
    header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 5 },
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
    emptyChart: { padding: 30, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10 }
});
