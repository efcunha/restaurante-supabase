import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../config/SupabaseConfig';
import { getTodayKey, getDateKeyRange, Period } from '../utils/dateUtils'; // Migrated from FirebaseOptimizations

// @ts-ignore
import FuncionariosScreen from './FuncionariosScreen';
// @ts-ignore
import CaixaAberturaScreen from './CaixaAberturaScreen';
// @ts-ignore
import CaixaOperacoesScreen from './CaixaOperacoesScreen';
// @ts-ignore
import CaixaFechamentoScreen from './CaixaFechamentoScreen';
// @ts-ignore
import CaixaHistoricoScreen from './CaixaHistoricoScreen';
// @ts-ignore
import ComandaVisualizacaoAdminScreen from './ComandaVisualizacaoAdminScreen';
// @ts-ignore
import GerenciarCardapioScreen from './GerenciarCardapioScreen';
// @ts-ignore
import EstoqueScreen from './EstoqueScreen';
// @ts-ignore
import ExtrasConfigScreen from './ExtrasConfigScreen';
// @ts-ignore
import ConfiguracaoMesasScreen from './ConfiguracaoMesasScreen';
// @ts-ignore
import PrinterConfigScreen from './PrinterConfigScreen';
// @ts-ignore
import EditarEmpresaScreen from './EditarEmpresaScreen';
// @ts-ignore
import FinancialConfigScreen from './FinancialConfigScreen';
// @ts-ignore
import FinancialDashboardScreen from './FinancialDashboardScreen';
// @ts-ignore
import OperationalSettingsScreen from './OperationalSettingsScreen';
import { confirmLogout } from '../utils/appUtils';
import BiometricSetupModal from '../components/BiometricSetupModal';
import MFASetupModal from '../components/MFASetupModal';
// import PerformanceService from '../services/PerformanceService'; // Removed - Firebase specific

// WhatsApp Integração
import ConfiguracoesWhatsApp from './ConfiguracoesWhatsApp';

/**
 * AdminScreen - Main Administrative Dashboard
 * 
 * Takes care of:
 * 1. Displaying operational statistics (Orders, Items, Avg Time).
 * 2. Displaying sales statistics (Total Sales, Ticket Average).
 * 3. Providing navigation to sub-modules (Stock, Menu, Finance).
 * 4. System maintenance (Biometrics, MFA, Data Clearing).
 */
export default function AdminScreen() {
  const { user, logout } = useAuth();
  const route = useRoute() as any;
  const params = route?.params;
  const navigation = useNavigation() as any;

  useEffect(() => {
    if (params?.openConfigMesas) {
      setShowConfiguracaoMesas(true);
    }
  }, [params]);

  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor: any) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };

  const [showFuncionarios, setShowFuncionarios] = useState(false);
  const [showCaixaMenu, setShowCaixaMenu] = useState(false);
  const [showCaixaAbertura, setShowCaixaAbertura] = useState(false);
  const [showCaixaOperacoes, setShowCaixaOperacoes] = useState(false);
  const [showCaixaFechamento, setShowCaixaFechamento] = useState(false);
  const [showCaixaHistorico, setShowCaixaHistorico] = useState(false);
  const [showComandasVisualizacao, setShowComandasVisualizacao] = useState(false);
  const [showGerenciarCardapio, setShowGerenciarCardapio] = useState(false);
  const [showEstoque, setShowEstoque] = useState(false);
  const [showExtrasConfig, setShowExtrasConfig] = useState(false);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [showEditarEmpresa, setShowEditarEmpresa] = useState(false);
  const [showFinancialConfig, setShowFinancialConfig] = useState(false);
  const [showConfiguracaoMesas, setShowConfiguracaoMesas] = useState(false);
  const [showOperationalSettings, setShowOperationalSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showConfiguracoesWhatsApp, setShowConfiguracoesWhatsApp] = useState(false);
  const [loadingLimpar, setLoadingLimpar] = useState(false);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalItens: 0,
    tempoMedio: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Estados para estatísticas de vendas
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Period>('hoje'); // 'hoje', 'semana', 'mes'
  const [vendasStats, setVendasStats] = useState({
    totalVendido: 0,
    totalPedidos: 0,
    ticketMedio: 0,
    totalCancelado: 0,      // ✅ NOVO
    qtdCanceladas: 0        // ✅ NOVO
  });

  const [loadingVendas, setLoadingVendas] = useState(true);

  // Estados para alertas de estoque
  // @ts-ignore
  const [alertasEstoque, setAlertasEstoque] = useState([]);
  // @ts-ignore
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  // Ref para detectar quando o app volta ao foreground
  const appState = useRef(AppState.currentState);
  const reloadTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounce para evitar múltiplas recargas
  const debounceReload = () => {
    if (reloadTimeout.current) {
      clearTimeout(reloadTimeout.current);
    }
    reloadTimeout.current = setTimeout(() => {
      carregarEstatisticas();
      carregarEstatisticasVendas();
    }, 1000); // Aguarda 1s antes de recarregar
  };

  // Carregar estatísticas ao montar o componente
  useEffect(() => {
    carregarEstatisticas();
    carregarEstatisticasVendas();
    // carregarAlertasEstoque(); // Desabilitado temporariamente
  }, []);

  // Recarregar dados quando o app volta ao foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        carregarEstatisticas();
        carregarEstatisticasVendas();
        // carregarAlertasEstoque(); // Desabilitado temporariamente
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Recarregar vendas quando mudar o período
  useEffect(() => {
    carregarEstatisticasVendas();
  }, [periodoSelecionado]);

  // 🔴 LISTENERS EM TEMPO REAL para atualizar estatísticas automaticamente
  useEffect(() => {
    // Listener para pedidos (atualiza estatísticas operacionais)
    if (!user?.companyId) return;

    const dateKey = getTodayKey();

    // Supabase Realtime para pedidos
    const pedidosChannel = supabase
      .channel('admin-pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${user.companyId},date_key=eq.${dateKey}`
        },
        () => {
          debounceReload();
        }
      )
      .subscribe();

    // Supabase Realtime para comandas
    const today = getTodayKey();
    const comandasChannel = supabase
      .channel('admin-comandas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
          filter: `company_id=eq.${user.companyId},date_key=gte.${today}`
        },
        () => {
          debounceReload();
        }
      )
      .subscribe();

    // Cleanup: remover listeners ao desmontar
    return () => {
      supabase.removeChannel(pedidosChannel);
      supabase.removeChannel(comandasChannel);
    };
  }, [periodoSelecionado]);

  // Limpa uma coleção inteira em lotes (safe para >500 docs)
  const limparColecao = async (nomeTabela: string) => {
    let totalApagado = 0;
    const PAGE_SIZE = 450;
    try {
      while (true) {
        const { data, error } = await supabase
          .from(nomeTabela)
          .select('id')
          .eq('company_id', user?.companyId)
          .limit(PAGE_SIZE);

        if (error) throw error;
        if (!data || data.length === 0) {
          if (totalApagado === 0) console.log(`⚠️ Tabela ${nomeTabela} já está vazia`);
          break;
        }

        const ids = data.map(d => d.id);
        const { error: deleteError } = await supabase
          .from(nomeTabela)
          .delete()
          .in('id', ids);

        if (deleteError) throw deleteError;

        totalApagado += ids.length;
        if (ids.length < PAGE_SIZE) break;
      }
      return totalApagado;
    } catch (error: any) {
      console.error(`❌ === ERRO ao limpar ${nomeTabela} ===`, error);
      console.error(`❌ Tipo de erro:`, error.name);
      console.error(`❌ Mensagem:`, error.message);
      throw error;
    }
  };

  // Garante que a coleção fique vazia: roda limparColecao e valida com getDocs até um número máximo de tentativas
  const ensureColecaoVazia = async (nomeTabela: string, maxAttempts = 10, delayMs = 1000) => {
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;

      // Buscar para ver quantos docs existem
      const { data: dataBefore, error: errorBefore } = await supabase
        .from(nomeTabela)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user?.companyId);

      if (errorBefore) throw errorBefore;
      if (!dataBefore || dataBefore.length === 0) {
        return { ok: true, attempts: attempt };
      }

      // Apagar
      await limparColecao(nomeTabela);

      // Aguardar commit no servidor
      await new Promise(res => setTimeout(res, delayMs));

      // Verifica
      const { data: dataAfter, error: errorAfter } = await supabase
        .from(nomeTabela)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user?.companyId);

      if (errorAfter) throw errorAfter;
      if (!dataAfter || dataAfter.length === 0) {
        return { ok: true, attempts: attempt };
      }

      // Se o número não mudou, aumentar delay
      if (dataAfter.length === dataBefore.length) {
        await new Promise(res => setTimeout(res, delayMs * 2));
      }
    }

    const { data: finalData, error: finalError } = await supabase
      .from(nomeTabela)
      .select('id')
      .eq('company_id', user?.companyId);

    if (finalError) throw finalError;

    const remaining = finalData?.length || 0;
    console.error(`❌ [ensureColecaoVazia] FALHA em ${nomeTabela} após ${maxAttempts} tentativas. Restantes: ${remaining}`);

    // @ts-ignore
    return { ok: remaining === 0, attempts: maxAttempts, remaining };
  };

  /**
   * Loads operational statistics for the CURRENT day.
   * - Fetches all orders for today.
   * - Calculates total orders, total items sold.
   * - Calculates average preparation/delivery time based on timestamps.
   * 
   * @performance Measured by PerformanceService ('Admin:CarregarEstatsOperacionais')
   */
  const carregarEstatisticas = async () => {
    // Previously measured by PerformanceService (removed - Firebase specific)
    try {
      setLoadingStats(true);
      if (!user?.companyId) return;

      const today = getTodayKey();
      const { data: pedidos, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', today);

      if (error) throw error;

      // Optimizing aggregation loop
      const statsResult = (pedidos || []).reduce((acc, pedido) => {
        acc.totalPedidos++;

        // Itens aggregation
        const items = pedido.itens || pedido.items;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (typeof item === 'string') {
              const qtyMatch = item.match(/^(\d+)x/);
              acc.totalItens += qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            }
          }
        }

        // Time calculation
        const inicio = pedido.criado_em || pedido.hora_pedido || pedido.created_at;
        const fim = pedido.time_in_prontos;

        if (inicio && fim) {
          const getSeconds = (val: any) => {
            if (typeof val === 'string') return new Date(val).getTime() / 1000;
            if (typeof val === 'number') return val;
            return 0;
          };

          const inicioSec = getSeconds(inicio);
          const fimSec = getSeconds(fim);

          if (inicioSec && fimSec) {
            const diffMin = Math.round((fimSec - inicioSec) / 60);
            if (diffMin > 0 && diffMin < 180) {
              acc.totalTempo += diffMin;
              acc.countTempo++;
            }
          }
        }
        return acc;
      }, { totalPedidos: 0, totalItens: 0, totalTempo: 0, countTempo: 0 });

      setStats({
        totalPedidos: statsResult.totalPedidos,
        totalItens: statsResult.totalItens,
        tempoMedio: statsResult.countTempo > 0
          ? Math.round(statsResult.totalTempo / statsResult.countTempo)
          : 0
      });

    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * Loads financial/sales statistics for a selected period.
   * - Fetches 'fechada' (closed) and 'cancelada' (canceled) commands in parallel.
   * - Aggregates totals and calculates metrics like Ticket Average.
   * 
   * @performance Measured by PerformanceService ('Admin:CarregarVendas')
   */
  const carregarEstatisticasVendas = async () => {
    // Previously measured by PerformanceService (removed - Firebase specific)
    try {
      setLoadingVendas(true);

      const { startKey: dateKeyInicio, endKey: dateKeyFim } = getDateKeyRange(periodoSelecionado);
      if (!user?.companyId) return;

      // Fetch concurrently
      const [salesResult, canceledResult] = await Promise.all([
        supabase
          .from('comandas')
          .select('*')
          .eq('company_id', user.companyId)
          .eq('status', 'fechada')
          .gte('date_key', dateKeyInicio)
          .lte('date_key', dateKeyFim),
        supabase
          .from('comandas')
          .select('*')
          .eq('company_id', user.companyId)
          .eq('status', 'cancelada')
          .gte('date_key', dateKeyInicio)
          .lte('date_key', dateKeyFim)
      ]);

      if (salesResult.error) throw salesResult.error;
      if (canceledResult.error) throw canceledResult.error;

      // Sales Stats
      const salesStats = (salesResult.data || []).reduce((acc, data) => {
        acc.totalVendido += (data.total_consumed || 0);
        acc.totalPedidos++;
        return acc;
      }, { totalVendido: 0, totalPedidos: 0 });

      // Canceled Stats
      const canceledStats = (canceledResult.data || []).reduce((acc, data) => {
        acc.totalCancelado += (data.total_consumed || 0);
        acc.qtdCanceladas++;
        return acc;
      }, { totalCancelado: 0, qtdCanceladas: 0 });

      const ticketMedio = salesStats.totalPedidos > 0
        ? salesStats.totalVendido / salesStats.totalPedidos
        : 0;

      setVendasStats({
        totalVendido: salesStats.totalVendido,
        totalPedidos: salesStats.totalPedidos,
        ticketMedio,
        totalCancelado: canceledStats.totalCancelado,
        qtdCanceladas: canceledStats.qtdCanceladas
      });

    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas de vendas:', error);
    } finally {
      setLoadingVendas(false);
    }
  };

  // Carregar alertas de estoque
  // @ts-ignore
  const carregarAlertasEstoque = async () => {
    try {
      setLoadingAlertas(true);

      // TODO: Implementar EstoqueService quando necessário
      // Por enquanto, apenas limpar alertas
      setAlertasEstoque([]);

      /* DESABILITADO até implementar EstoqueService
      const { default: EstoqueService } = await import('../services/EstoqueService');
      
      // Verificar se estoque está habilitado
      const estoqueHabilitado = await EstoqueService.isEstoqueHabilitado();
      
      if (!estoqueHabilitado) {
        setAlertasEstoque([]);
        return;
      }
      
      // Buscar itens com estoque baixo
      const itens = await EstoqueService.buscarItensEstoqueBaixo();
      setAlertasEstoque(itens);
      
      if (itens.length > 0) {
      }
      */
    } catch (error) {
      console.error('[AdminScreen] Erro ao carregar alertas:', error);
      setAlertasEstoque([]);
    } finally {
      setLoadingAlertas(false);
    }
  };

  // Limpa apenas a coleção `comandas` (abertas e fechadas)
  const limparSomenteComandas = async () => {
    Alert.alert(
      '⚠️ ATENÇÃO - LIMPAR COMANDAS',
      'Isso apagará PERMANENTEMENTE todas as comandas (abertas e fechadas)\n\nEsta ação NÃO PODE ser desfeita!\n\nTem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'SIM, APAGAR COMANDAS',
          style: 'destructive',
          onPress: async () => {
            try {
              // sinalizar limpeza para listeners
              // @ts-ignore
              try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('limpezaEmAndamento', '1'); } catch { // ignore
              }

              // Sinalizar para outros clientes via Supabase (maintenance flag)
              try {
                await supabase
                  .from('maintenance')
                  .upsert({
                    id: 'limpeza',
                    started_at: new Date().toISOString(),
                    by: (user && user.uid) ? user.uid : 'admin'
                  });
              } catch (e) {
                // ignore
              }
              setLoadingLimpar(true);
              const result = await ensureColecaoVazia('comandas', 10, 1200);
              // @ts-ignore
              const resumo = result.ok ? `✅ Todas as comandas apagadas (${result.attempts} tentativas)` : `❌ Falha ao apagar comandas (restam ${result.remaining})`;
              Alert.alert('Resultado', resumo);
              // @ts-ignore
              try { if (typeof window !== 'undefined' && window.location && window.location.reload) setTimeout(() => window.location.reload(), 700); } catch { // ignore
              }
            } catch (e: any) {
              console.error('❌ Erro ao apagar comandas:', e);
              Alert.alert('Erro', `Falha: ${e.message}`);
            } finally {
              // @ts-ignore
              try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem('limpezaEmAndamento'); } catch { // ignore
              }
              // remover flag de manutenção
              try {
                await supabase
                  .from('maintenance')
                  .delete()
                  .eq('id', 'limpeza');
              } catch (e) {
                // ignore
              }
              setLoadingLimpar(false);
            }
          }
        }
      ]
    );
  };

  const reports = [
    { name: 'Gerenciar Funcionários', icon: '👥', action: () => setShowFuncionarios(true) },
    { name: 'Caixa', icon: '💰', action: () => setShowCaixaMenu(true) },
    { name: 'Estatísticas dos Garçons', icon: '📊', action: () => setShowComandasVisualizacao(true) },
    { name: 'Gerenciar Entregas/Despacho', icon: '🛵', action: () => navigation.navigate('Entregas') },
    { name: 'Gerenciar Estoque', icon: '📦', action: () => setShowEstoque(true) },
    { name: 'Gerenciar Cardápio', icon: '🍴', action: () => setShowGerenciarCardapio(true) },
    { name: 'Configurar Mesas e Ambientes', icon: '🪑', action: () => setShowConfiguracaoMesas(true) },
    { name: 'Configurações Operacionais', icon: '🕐', action: () => setShowOperationalSettings(true) },
    { name: 'Configurações do WhatsApp', icon: '💬', action: () => setShowConfiguracoesWhatsApp(true) },
    { name: 'Configurar Extras de Pizza', icon: '🍕', action: () => setShowExtrasConfig(true) },
    { name: 'Configurar Impressora', icon: '🖨️', action: () => setShowPrinterConfig(true) },
    { name: 'Dados da Empresa', icon: '🏢', action: () => setShowEditarEmpresa(true) },
    // { name: 'Configurar Biometria', icon: '👆', action: () => setShowBiometricSetup(true) },
    // { name: 'Configurar MFA (2FA)', icon: '🛡️', action: () => setShowMFASetup(true) }, // Desabilitado para futura implementação
  ];

  return (
    <View style={styles.container}>


      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.name || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Admin</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => confirmLogout(logout)}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Estatísticas Operacionais</Text>
            <TouchableOpacity onPress={() => {
              carregarEstatisticas();
            }}>
              <Text style={styles.refreshButton}>🔄</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsContentWrapper}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{loadingStats ? '...' : stats.totalPedidos}</Text>
                <Text style={styles.statLabel}>Pedidos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{loadingStats ? '...' : `${stats.totalItens}x`}</Text>
                <Text style={styles.statLabel}>Itens{'\n'}vendidos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{loadingStats ? '...' : `${stats.tempoMedio}m`}</Text>
                <Text style={styles.statLabel}>Tempo{('\n')}médio</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Card de Vendas com Períodos */}
        <View style={styles.vendasCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.vendasCardTitle}>Estatísticas de Venda</Text>
            <TouchableOpacity onPress={() => {
              carregarEstatisticasVendas();
            }}>
              <Text style={styles.refreshButton}>🔄</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vendasTabs}>
            <TouchableOpacity
              style={[styles.vendaTab, periodoSelecionado === 'hoje' && styles.vendaTabActive]}
              onPress={() => setPeriodoSelecionado('hoje')}
            >
              <Text style={[styles.vendaTabText, periodoSelecionado === 'hoje' && styles.vendaTabTextActive]}>
                Hoje
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vendaTab, periodoSelecionado === 'semana' && styles.vendaTabActive]}
              onPress={() => setPeriodoSelecionado('semana')}
            >
              <Text style={[styles.vendaTabText, periodoSelecionado === 'semana' && styles.vendaTabTextActive]}>
                Semana
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vendaTab, periodoSelecionado === 'mes' && styles.vendaTabActive]}
              onPress={() => setPeriodoSelecionado('mes')}
            >
              <Text style={[styles.vendaTabText, periodoSelecionado === 'mes' && styles.vendaTabTextActive]}>
                Mês
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vendasContent}>
            <View style={styles.vendasRowStats}>
              <View style={styles.vendaStatItem}>
                <Text style={styles.vendaStatValue}>
                  {loadingVendas ? '...' : formatarMoeda(vendasStats.totalVendido)}
                </Text>
                <Text style={styles.vendaStatLabel}>Total Vendido</Text>
              </View>
              <View style={styles.vendaStatItem}>
                <Text style={styles.vendaStatValue}>
                  {loadingVendas ? '...' : vendasStats.totalPedidos}
                </Text>
                <Text style={styles.vendaStatLabel}>Pedidos</Text>
              </View>
              <View style={styles.vendaStatItem}>
                <Text style={styles.vendaStatValue}>
                  {loadingVendas ? '...' : formatarMoeda(vendasStats.ticketMedio)}
                </Text>
                <Text style={styles.vendaStatLabel}>Ticket Médio</Text>
              </View>
            </View>

            {/* ✅ NOVO: Estatísticas de Cancelamento */}
            {vendasStats.qtdCanceladas > 0 && (
              <View style={[styles.vendasRowStats, { marginTop: 15, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10 }]}>
                <View style={styles.vendaStatItem}>
                  <Text style={[styles.vendaStatValue, { color: '#E65100' }]}>
                    {loadingVendas ? '...' : formatarMoeda(vendasStats.totalCancelado)}
                  </Text>
                  <Text style={[styles.vendaStatLabel, { color: '#E65100' }]}>Total Cancelado</Text>
                </View>
                <View style={styles.vendaStatItem}>
                  <Text style={[styles.vendaStatValue, { color: '#E65100' }]}>
                    {loadingVendas ? '...' : vendasStats.qtdCanceladas}
                  </Text>
                  <Text style={[styles.vendaStatLabel, { color: '#E65100' }]}>Comandas Canceladas</Text>
                </View>
                <View style={styles.vendaStatItem}>
                  <Text style={[styles.vendaStatValue, { color: '#E65100', fontSize: 16 }]}>
                    {loadingVendas ? '...' : `${((vendasStats.qtdCanceladas / (vendasStats.totalPedidos + vendasStats.qtdCanceladas)) * 100).toFixed(1)}%`}
                  </Text>
                  <Text style={[styles.vendaStatLabel, { color: '#E65100' }]}>Taxa Cancelamento</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />
        {/* --- FINANCEIRO --- */}
        <Text style={styles.sectionHeader}>FINANCEIRO</Text>

        {[
          { name: 'Dashboard Financeiro', icon: '📊', action: () => setShowDashboard(true) },
          { name: 'Histórico de Caixas', icon: '📜', action: () => setShowCaixaHistorico(true) },
          { name: 'Config. Financeira', icon: '⚙️', action: () => setShowFinancialConfig(true) },
        ].map((report, index) => (
          <TouchableOpacity
            key={`fin-${index}`}
            style={[styles.reportCard]}
            onPress={report.action}
          >
            <View style={styles.reportLeft}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              <Text style={styles.reportName}>{report.name}</Text>
            </View>
            <Text style={styles.reportArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />
        {/* --- SISTEMA --- */}
        <Text style={styles.sectionHeader}>SISTEMA</Text>

        {loadingLimpar && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B2F2F" />
            <Text style={styles.loadingText}>Apagando todos os dados...</Text>
          </View>
        )}

        {reports.map((report, index) => (
          <TouchableOpacity
            key={index}
            // @ts-ignore
            style={[styles.reportCard, report.danger && styles.reportCardDanger]}
            onPress={report.action}
            disabled={loadingLimpar}
          >
            <View style={styles.reportLeft}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              {/* @ts-ignore */}
              <Text style={[styles.reportName, report.danger && styles.reportNameDanger]}>{report.name}</Text>
            </View>
            {/* @ts-ignore */}
            <Text style={[styles.reportArrow, report.danger && styles.reportArrowDanger]}>›</Text>
          </TouchableOpacity>
        ))}


      </ScrollView>

      {/* Modal de Funcionários */}
      <Modal
        visible={showFuncionarios}
        animationType="slide"
        onRequestClose={() => setShowFuncionarios(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F5DC' }}>
          <FuncionariosScreen onClose={() => setShowFuncionarios(false)} />
        </View>
      </Modal>

      {/* Modal Configuração de Mesas */}
      <Modal
        visible={showConfiguracaoMesas}
        animationType="slide"
        onRequestClose={() => setShowConfiguracaoMesas(false)}
      >
        <View style={{ flex: 1 }}>
          <ConfiguracaoMesasScreen onClose={() => setShowConfiguracaoMesas(false)} />
        </View>
      </Modal>

      {/* Modal Configuração do WhatsApp */}
      <Modal
        visible={showConfiguracoesWhatsApp}
        animationType="slide"
        onRequestClose={() => setShowConfiguracoesWhatsApp(false)}
      >
        <View style={{ flex: 1 }}>
          <ConfiguracoesWhatsApp onClose={() => setShowConfiguracoesWhatsApp(false)} />
        </View>
      </Modal>

      {/* Modal Menu Caixa */}
      <Modal visible={showCaixaMenu} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.caixaMenuContainer}>
            <View style={styles.caixaMenuHeader}>
              <Text style={styles.caixaMenuTitle}>💰 Caixa</Text>
              <TouchableOpacity onPress={() => setShowCaixaMenu(false)}>
                <Text style={styles.caixaMenuClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.caixaMenuContent}>
              <TouchableOpacity
                style={styles.caixaMenuItem}
                onPress={() => {
                  setShowCaixaMenu(false);
                  setShowCaixaAbertura(true);
                }}
              >
                <Text style={styles.caixaMenuIcon}>💼</Text>
                <Text style={styles.caixaMenuText}>Abrir Caixa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.caixaMenuItem}
                onPress={() => {
                  setShowCaixaMenu(false);
                  setShowCaixaOperacoes(true);
                }}
              >
                <Text style={styles.caixaMenuIcon}>💵</Text>
                <Text style={styles.caixaMenuText}>Sangria / Reforço</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.caixaMenuItem}
                onPress={() => {
                  setShowCaixaMenu(false);
                  setShowCaixaFechamento(true);
                }}
              >
                <Text style={styles.caixaMenuIcon}>🔒</Text>
                <Text style={styles.caixaMenuText}>Fechar Caixa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.caixaMenuItem}
                onPress={() => {
                  setShowCaixaMenu(false);
                  setShowCaixaHistorico(true);
                }}
              >
                <Text style={styles.caixaMenuIcon}>📊</Text>
                <Text style={styles.caixaMenuText}>Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Abrir Caixa */}
      <Modal
        visible={showCaixaAbertura}
        animationType="slide"
        onRequestClose={() => setShowCaixaAbertura(false)}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCaixaAbertura(false)}>
              <Text style={styles.closeButton}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Abertura de Caixa</Text>
          </View>
          {showCaixaAbertura && <CaixaAberturaScreen onSuccess={() => setShowCaixaAbertura(false)} />}
        </View>
      </Modal>

      {/* Modal Sangria/Reforço */}
      <Modal
        visible={showCaixaOperacoes}
        animationType="slide"
        onRequestClose={() => setShowCaixaOperacoes(false)}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCaixaOperacoes(false)}>
              <Text style={styles.closeButton}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Sangria / Reforço</Text>
          </View>
          {showCaixaOperacoes && <CaixaOperacoesScreen />}
        </View>
      </Modal>

      {/* Modal Fechar Caixa */}
      <Modal
        visible={showCaixaFechamento}
        animationType="slide"
        onRequestClose={() => setShowCaixaFechamento(false)}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCaixaFechamento(false)}>
              <Text style={styles.closeButton}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Fechamento de Caixa</Text>
          </View>
          {showCaixaFechamento && <CaixaFechamentoScreen />}
        </View>
      </Modal>

      {/* Modal Histórico Caixas */}
      <Modal
        visible={showCaixaHistorico}
        animationType="slide"
        onRequestClose={() => setShowCaixaHistorico(false)}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          {showCaixaHistorico && (
            <CaixaHistoricoScreen onClose={() => setShowCaixaHistorico(false)} />
          )}
        </View>
      </Modal>

      {/* Modal Visualização de Comandas */}
      <Modal
        visible={showComandasVisualizacao}
        animationType="slide"
        onRequestClose={() => setShowComandasVisualizacao(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <ComandaVisualizacaoAdminScreen onClose={() => setShowComandasVisualizacao(false)} />
        </View>
      </Modal>

      {/* Modal Gerenciar Cardápio */}
      <Modal
        visible={showGerenciarCardapio}
        animationType="slide"
        onRequestClose={() => setShowGerenciarCardapio(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <GerenciarCardapioScreen onClose={() => setShowGerenciarCardapio(false)} />
        </View>
      </Modal>

      {/* Modal Gerenciar Estoque */}
      <Modal
        visible={showEstoque}
        animationType="slide"
        onRequestClose={() => setShowEstoque(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <EstoqueScreen onClose={() => setShowEstoque(false)} />
        </View>
      </Modal>

      {/* Modal Configurar Extras de Pizza */}
      <Modal
        visible={showExtrasConfig}
        animationType="slide"
        onRequestClose={() => setShowExtrasConfig(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <ExtrasConfigScreen onClose={() => setShowExtrasConfig(false)} />
        </View>
      </Modal>

      {/* Modal Configurar Impressora */}
      <Modal
        visible={showPrinterConfig}
        animationType="slide"
        onRequestClose={() => setShowPrinterConfig(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <PrinterConfigScreen navigation={{ goBack: () => setShowPrinterConfig(false) }} />
        </View>
      </Modal>

      {/* Modal Configurações Operacionais */}
      <Modal
        visible={showOperationalSettings}
        animationType="slide"
        onRequestClose={() => setShowOperationalSettings(false)}
      >
        <View style={{ flex: 1 }}>
          <OperationalSettingsScreen onClose={() => setShowOperationalSettings(false)} />
        </View>
      </Modal>

      {/* Modal Editar Empresa */}
      <Modal
        visible={showEditarEmpresa}
        animationType="slide"
        onRequestClose={() => setShowEditarEmpresa(false)}
      >
        <EditarEmpresaScreen onBack={() => setShowEditarEmpresa(false)} />
      </Modal>

      {/* Modal Configuração Financeira */}
      <Modal
        visible={showFinancialConfig}
        animationType="slide"
        onRequestClose={() => setShowFinancialConfig(false)}
      >
        <FinancialConfigScreen onClose={() => setShowFinancialConfig(false)} />
      </Modal>

      {/* Modal Dashboard Financeiro */}
      <Modal
        visible={showDashboard}
        animationType="slide"
        onRequestClose={() => setShowDashboard(false)}
      >
        <FinancialDashboardScreen onClose={() => setShowDashboard(false)} />
      </Modal>

      <StatusBar style="light" />
      <BiometricSetupModal
        visible={showBiometricSetup}
        onClose={() => setShowBiometricSetup(false)}
        onSuccess={() => {
          // Optional: visual feedback
        }}
      />
      <MFASetupModal
        visible={showMFASetup}
        onClose={() => setShowMFASetup(false)}
        onSuccess={() => {
          // Optional: visual feedback
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#2C2C2C',
    marginLeft: 15,
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
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
    elevation: 8,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    color: '#E5B84A',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#8B2F2F',
    borderBottomWidth: 2,
    borderBottomColor: '#7A2828',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#8B2F2F',
    borderBottomWidth: 2,
    borderBottomColor: '#7A2828',
  },
  refreshButton: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  statsContentWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  reportArrow: {
    fontSize: 28,
    color: '#8B2F2F',
    fontWeight: '300',
  },
  reportCardDanger: {
    backgroundColor: '#FFF3F3',
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  reportNameDanger: {
    color: '#DC3545',
    fontWeight: '700',
  },
  reportArrowDanger: {
    color: '#DC3545',
  },
  loadingContainer: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5B84A',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8B2F2F',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8B2F2F',
    marginTop: 20,
    marginBottom: 15,
  },
  productForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2C2C2C',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5B84A',
  },
  addBtn: {
    backgroundColor: '#8B2F2F',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalHeader: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 60, // Balance the back button width
  },
  closeButton: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  caixaMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  caixaMenuHeader: {
    backgroundColor: '#8B2F2F',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caixaMenuTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  caixaMenuClose: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  caixaMenuContent: {
    padding: 10,
  },
  caixaMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginVertical: 5,
    backgroundColor: '#F5F1E8',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  caixaMenuIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  caixaMenuText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  // Estilos para o card de vendas
  vendasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  vendasCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#8B2F2F',
    borderBottomWidth: 2,
    borderBottomColor: '#7A2828',
  },
  vendasTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  vendaTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vendaTabActive: {
    backgroundColor: '#E5B84A',
  },
  // Estilos PDV FAB
  pdvFabCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#8B2F2F',
  },
  pdvFabIconContainer: {
    backgroundColor: '#8B2F2F',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  pdvFabTextContainer: {
    flex: 1,
  },
  pdvFabTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B2F2F',
    marginBottom: 4,
  },
  pdvFabSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  vendaTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  vendaTabTextActive: {
    color: '#2C2C2C',
  },
  vendasContent: {
    padding: 15,
  },
  vendasRowStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vendaStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  vendaStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 4,
  },
  vendaStatLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  // Estilos para alertas de estoque
  alertasContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  alertasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertasTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  alertasRefresh: {
    fontSize: 20,
  },
  alertaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    width: 150,
    borderWidth: 2,
    borderColor: '#FFA500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  alertaCardCritico: {
    borderColor: '#FF0000',
    backgroundColor: '#FFE5E5',
  },
  alertaIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertaNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
    textAlign: 'center',
  },
  alertaQuantidade: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 2,
  },
  alertaMinimo: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  alertaCategoria: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 1,
  },
});
