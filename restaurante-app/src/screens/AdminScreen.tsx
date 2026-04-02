import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../config/SupabaseConfig';
import { getTodayKey, getDateKeyRange, Period } from '../utils/dateUtils'; // Migrated from FirebaseOptimizations
import { getBusinessDateKey } from '../services/BusinessDateService';


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
import BillingScreen from './BillingScreen';
import DeliveryOcorrenciasScreen from './DeliveryOcorrenciasScreen';
import BiometricSetupModal from '../components/BiometricSetupModal';
import MFASetupModal from '../components/MFASetupModal';
import AdminHeader from '../components/AdminHeader';
import AdminStatsCards from '../components/AdminStatsCards';
import CaixaMenuModal from '../components/CaixaMenuModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminActionCard, AdminBareModal, AdminCaixaModal, AdminSection, AdminSlideModal } from '../features/admin';
import { TrialBanner } from '../components/LicenseGate';
import { isFeatureEnabled } from '../config/featureFlags';
import { colors } from '../theme/colors';
// import PerformanceService from '../services/PerformanceService'; // Removed - Firebase specific

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
  const { user } = useAuth();
  const route = useRoute() as any;
  const navigation = route?.params?.navigation || route?.navigation || (route as any).navigate ? route : require('@react-navigation/native').useNavigation();
  const params = route?.params;
  const billingScreenEnabled = isFeatureEnabled('billing_showBillingScreen');

  useEffect(() => {
    if (params?.openConfigMesas) {
      setShowConfiguracaoMesas(true);
    }
  }, [params]);

  const insets = useSafeAreaInsets();

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
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [showEditarEmpresa, setShowEditarEmpresa] = useState(false);
  const [showFinancialConfig, setShowFinancialConfig] = useState(false);
  const [showConfiguracaoMesas, setShowConfiguracaoMesas] = useState(false);
  const [showOperationalSettings, setShowOperationalSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBillingScreen, setShowBillingScreen] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showDeliveryOcorrencias, setShowDeliveryOcorrencias] = useState(false);

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

    let pedidosChannel: any = null;
    let comandasChannel: any = null;
    let disposed = false;

    const setupChannels = async () => {
      const dateKey = await getBusinessDateKey(user.companyId);
      if (disposed) return;

      pedidosChannel = supabase
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

      comandasChannel = supabase
        .channel('admin-comandas-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comandas',
            filter: `company_id=eq.${user.companyId},date_key=gte.${dateKey}`
          },
          () => {
            debounceReload();
          }
        )
        .subscribe();
    };

    setupChannels();

    // Cleanup: remover listeners ao desmontar
    return () => {
      disposed = true;
      if (pedidosChannel) supabase.removeChannel(pedidosChannel);
      if (comandasChannel) supabase.removeChannel(comandasChannel);
    };
  }, [periodoSelecionado]);

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

      const today = await getBusinessDateKey(user.companyId);
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

  const reports = [
    { name: 'Gerenciar Funcionários', icon: '👥', action: () => setShowFuncionarios(true) },
    { name: 'Estatísticas dos Garçons', icon: '📊', action: () => setShowComandasVisualizacao(true) },
    { name: 'Ocorrencias de Entrega', icon: '⚠️', action: () => setShowDeliveryOcorrencias(true) },
    { name: 'Gerenciar Estoque', icon: '📦', action: () => setShowEstoque(true) },
    { name: 'Gerenciar Cardápio', icon: '🍴', action: () => setShowGerenciarCardapio(true) },
    { name: 'Configurar Mesas e Ambientes', icon: '🪑', action: () => setShowConfiguracaoMesas(true) },
    { name: 'Configurações Operacionais', icon: '🕐', action: () => setShowOperationalSettings(true) },
    { name: 'Configurar Impressora', icon: '🖨️', action: () => setShowPrinterConfig(true) },
    { name: 'Dados da Empresa', icon: '🏢', action: () => setShowEditarEmpresa(true) },
    { name: 'Configurar Biometria', icon: '👆', action: () => setShowBiometricSetup(true) },
    { name: 'Configurar MFA (2FA)', icon: '🛡️', action: () => setShowMFASetup(true) },
  ];

  const financialReports = [
    ...(billingScreenEnabled ? [{ name: 'Assinatura SaaS', icon: '💳', action: () => setShowBillingScreen(true) }] : []),
    { name: 'Caixa', icon: '💰', action: () => setShowCaixaMenu(true) },
    { name: 'Dashboard Financeiro', icon: '📊', action: () => setShowDashboard(true) },
    { name: 'Histórico de Caixas', icon: '📜', action: () => setShowCaixaHistorico(true) },
    { name: 'Config. Financeira', icon: '⚙️', action: () => setShowFinancialConfig(true) },
  ];

  const renderReportList = (
    items: Array<{ name: string; icon: string; action: () => void; danger?: boolean }>,
    options?: { keyPrefix?: string; disabled?: boolean }
  ) =>
    items.map((report, index) =>
      <AdminActionCard
        key={`${options?.keyPrefix || 'rep'}-${index}`}
        name={report.name}
        icon={report.icon}
        onPress={report.action}
        danger={report.danger}
        disabled={options?.disabled}
      />
    );

  return (
    <View style={styles.container}>


      {/* Header */}
      <AdminHeader
        userName={user?.name || user?.email || undefined}
        onBack={() => navigation.goBack()}
        paddingTop={Math.max(insets.top, 20)}
      />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <TrialBanner />

        <AdminStatsCards
          styles={styles}
          loadingStats={loadingStats}
          stats={stats}
          onRefreshStats={carregarEstatisticas}
          loadingVendas={loadingVendas}
          vendasStats={vendasStats}
          periodoSelecionado={periodoSelecionado}
          onSelectPeriodo={setPeriodoSelecionado}
          onRefreshVendas={carregarEstatisticasVendas}
          formatarMoeda={formatarMoeda}
        />

        <AdminSection title="FINANCEIRO">
          {renderReportList(financialReports, { keyPrefix: 'fin' })}
        </AdminSection>

        <AdminSection title="SISTEMA">
          {renderReportList(reports, { keyPrefix: 'sys' })}
        </AdminSection>


      </ScrollView>

      {/* Modal de Funcionários */}
      <AdminSlideModal visible={showFuncionarios} onClose={() => setShowFuncionarios(false)}>
        <FuncionariosScreen onClose={() => setShowFuncionarios(false)} />
      </AdminSlideModal>

      {/* Modal Configuração de Mesas */}
      <AdminSlideModal visible={showConfiguracaoMesas} onClose={() => setShowConfiguracaoMesas(false)}>
        <ConfiguracaoMesasScreen onClose={() => setShowConfiguracaoMesas(false)} />
      </AdminSlideModal>

      {/* Modal Menu Caixa */}
      <CaixaMenuModal
        visible={showCaixaMenu}
        onClose={() => setShowCaixaMenu(false)}
        onOpenAbertura={() => setShowCaixaAbertura(true)}
        onOpenOperacoes={() => setShowCaixaOperacoes(true)}
        onOpenFechamento={() => setShowCaixaFechamento(true)}
        onOpenHistorico={() => setShowCaixaHistorico(true)}
      />

      {/* Modal Abrir Caixa */}
      <AdminCaixaModal
        visible={showCaixaAbertura}
        onClose={() => setShowCaixaAbertura(false)}
        title="Abertura de Caixa"
        icon="cash-outline"
      >
        {showCaixaAbertura && <CaixaAberturaScreen onSuccess={() => setShowCaixaAbertura(false)} />}
      </AdminCaixaModal>

      {/* Modal Sangria/Reforço */}
      <AdminCaixaModal
        visible={showCaixaOperacoes}
        onClose={() => setShowCaixaOperacoes(false)}
        title="Sangria / Reforço"
        icon="swap-horizontal-outline"
      >
        {showCaixaOperacoes && <CaixaOperacoesScreen />}
      </AdminCaixaModal>

      {/* Modal Fechar Caixa */}
      <AdminCaixaModal
        visible={showCaixaFechamento}
        onClose={() => setShowCaixaFechamento(false)}
        title="Fechamento de Caixa"
        icon="lock-closed-outline"
      >
        {showCaixaFechamento && <CaixaFechamentoScreen />}
      </AdminCaixaModal>

      {/* Modal Histórico Caixas */}
      <AdminSlideModal
        visible={showCaixaHistorico}
        onClose={() => setShowCaixaHistorico(false)}
        statusBarTranslucent
        hardwareAccelerated
      >
        {showCaixaHistorico && <CaixaHistoricoScreen onClose={() => setShowCaixaHistorico(false)} />}
      </AdminSlideModal>

      {/* Modal Visualização de Comandas */}
      <AdminSlideModal visible={showComandasVisualizacao} onClose={() => setShowComandasVisualizacao(false)}>
        <ComandaVisualizacaoAdminScreen onClose={() => setShowComandasVisualizacao(false)} />
      </AdminSlideModal>

      {/* Modal Gerenciar Cardápio */}
      <AdminSlideModal visible={showGerenciarCardapio} onClose={() => setShowGerenciarCardapio(false)}>
        <GerenciarCardapioScreen onClose={() => setShowGerenciarCardapio(false)} />
      </AdminSlideModal>

      {/* Modal Gerenciar Estoque */}
      <AdminSlideModal visible={showEstoque} onClose={() => setShowEstoque(false)}>
        <EstoqueScreen onClose={() => setShowEstoque(false)} />
      </AdminSlideModal>

      {/* Modal Configurar Impressora */}
      <AdminSlideModal visible={showPrinterConfig} onClose={() => setShowPrinterConfig(false)}>
        <PrinterConfigScreen navigation={{ goBack: () => setShowPrinterConfig(false) }} />
      </AdminSlideModal>

      {/* Modal Configurações Operacionais */}
      <AdminBareModal visible={showOperationalSettings} onClose={() => setShowOperationalSettings(false)}>
        <View style={{ flex: 1 }}>
          <OperationalSettingsScreen onClose={() => setShowOperationalSettings(false)} />
        </View>
      </AdminBareModal>

      {/* Modal Editar Empresa */}
      <AdminBareModal visible={showEditarEmpresa} onClose={() => setShowEditarEmpresa(false)}>
        <EditarEmpresaScreen onBack={() => setShowEditarEmpresa(false)} />
      </AdminBareModal>

      {/* Modal Configuração Financeira */}
      <AdminBareModal visible={showFinancialConfig} onClose={() => setShowFinancialConfig(false)}>
        <FinancialConfigScreen onClose={() => setShowFinancialConfig(false)} />
      </AdminBareModal>

      {billingScreenEnabled && (
        <AdminBareModal visible={showBillingScreen} onClose={() => setShowBillingScreen(false)}>
          <BillingScreen onClose={() => setShowBillingScreen(false)} />
        </AdminBareModal>
      )}

      {/* Modal Dashboard Financeiro */}
      <AdminBareModal visible={showDashboard} onClose={() => setShowDashboard(false)}>
        <FinancialDashboardScreen onClose={() => setShowDashboard(false)} />
      </AdminBareModal>

      {/* Modal Ocorrencias de Entrega */}
      <AdminSlideModal visible={showDeliveryOcorrencias} onClose={() => setShowDeliveryOcorrencias(false)}>
        <DeliveryOcorrenciasScreen onClose={() => setShowDeliveryOcorrencias(false)} />
      </AdminSlideModal>

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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 15,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
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
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: colors.primaryContrastMuted,
    fontSize: 10,
  },
  userInfo: {
    color: colors.secondary,
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
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 10,
  },
  refreshButton: {
    fontSize: 20,
    color: colors.white,
  },
  statsContentWrapper: {
    backgroundColor: colors.white,
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
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 15,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
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
    color: colors.text,
  },
  reportArrow: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
  },
  reportCardDanger: {
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  reportNameDanger: {
    color: colors.onDanger,
    fontWeight: '700',
  },
  reportArrowDanger: {
    color: colors.onDanger,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 15,
  },
  productForm: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    backgroundColor: colors.warningSurface,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Estilos para o card de vendas
  vendasCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  vendasCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  vendasTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vendaTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  vendaTabActive: {
    backgroundColor: colors.secondary,
  },
  vendaTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  vendaTabTextActive: {
    color: colors.text,
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
    color: colors.primary,
    marginBottom: 4,
  },
  vendaStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Estilos para alertas de estoque
  alertasContainer: {
    backgroundColor: colors.warningSurface,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.secondary,
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
    color: colors.primary,
  },
  alertasRefresh: {
    fontSize: 20,
  },
  alertaCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    width: 150,
    borderWidth: 2,
    borderColor: colors.secondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  alertaCardCritico: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  alertaIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertaNome: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  alertaQuantidade: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 2,
  },
  alertaMinimo: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  alertaCategoria: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 1,
  },
});
