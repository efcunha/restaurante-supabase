import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, writeBatch, setDoc, deleteDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getTodayKey, getDateKeyRange } from '../services/FirebaseOptimizations';
import { getCompanyCollection } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';

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
import PrinterConfigScreen from './PrinterConfigScreen';
// @ts-ignore
import EditarEmpresaScreen from './EditarEmpresaScreen';
// @ts-ignore
import FinancialConfigScreen from './FinancialConfigScreen';
// @ts-ignore
import FinancialDashboardScreen from './FinancialDashboardScreen';
import { confirmLogout } from '../utils/appUtils';
import BiometricSetupModal from '../components/BiometricSetupModal';
import MFASetupModal from '../components/MFASetupModal';

export default function AdminScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    confirmLogout(logout);
  };

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
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [loadingLimpar, setLoadingLimpar] = useState(false);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalItens: 0,
    tempoMedio: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Estados para estatísticas de vendas
  const [periodoSelecionado, setPeriodoSelecionado] = useState('hoje'); // 'hoje', 'semana', 'mes'
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
    const pedidosQuery = query(
      getCompanyCollection(user.companyId, 'pedidos'),
      where('dateKey', '==', dateKey)
    );

    const unsubscribePedidos = onSnapshot(
      pedidosQuery,
      (snapshot) => {
        debounceReload();
      },
      (error) => {
        console.error('[AdminScreen] ❌ Erro no listener de pedidos:', error);
      }
    );

    // Listener para comandas (atualiza estatísticas de vendas E operacionais)
    // ✅ OTIMIZAÇÃO: Escutar apenas comandas RECENTES (últimos 7 dias) ou ABERTAS
    // Para simplificar, vamos escutar 'abertas' e 'hoje'
    const today = getTodayKey();
    const comandasQuery = query(
      getCompanyCollection(user.companyId, 'comandas'),
      where('dateKey', '>=', today) // Escuta comandas de hoje em diante (inclui abertura e fechamento)
    );

    const unsubscribeComandas = onSnapshot(
      comandasQuery,
      (snapshot) => {
        // Apenas acionar reload
        debounceReload();
      },
      (error) => {
        console.error('[AdminScreen] ❌ Erro no listener de comandas:', error);
      }
    );

    // Cleanup: remover listeners ao desmontar
    return () => {
      unsubscribePedidos();
      unsubscribeComandas();
    };
  }, [periodoSelecionado]);

  // Limpa uma coleção inteira em lotes (safe para >500 docs)
  const limparColecao = async (nomeColecao: string) => {
    let totalApagado = 0;
    const PAGE_SIZE = 450; // margem < 500 limite do batch
    try {
      while (true) {
        const snapshot = await getDocs(collection(db, nomeColecao));
        if (snapshot.empty) {
          if (totalApagado === 0) console.log(`⚠️ Coleção ${nomeColecao} já está vazia`);
          break;
        }

        // Mostrar amostra dos IDs (primeiros 5)
        if (snapshot.size > 0) {
          const amostra = snapshot.docs.slice(0, 5).map(d => d.id).join(', ');
        }

        // Seleciona apenas até PAGE_SIZE para não ultrapassar
        const docs = snapshot.docs.slice(0, PAGE_SIZE);
        const batch = writeBatch(db);
        docs.forEach(dRef => {
          batch.delete(doc(db, nomeColecao, dRef.id));
        });
        await batch.commit();
        totalApagado += docs.length;
        if (docs.length < PAGE_SIZE) break; // último lote
      }
      return totalApagado;
    } catch (error: any) {
      console.error(`❌ === ERRO ao limpar ${nomeColecao} ===`, error);
      console.error(`❌ Tipo de erro:`, error.name);
      console.error(`❌ Mensagem:`, error.message);
      console.error(`❌ Stack:`, error.stack);
      throw error;
    }
  };

  // Garante que a coleção fique vazia: roda limparColecao e valida com getDocs até um número máximo de tentativas
  const ensureColecaoVazia = async (nomeColecao: string, maxAttempts = 10, delayMs = 1000) => {
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      // Buscar snapshot para ver quantos docs existem
      const snapBefore = await getDocs(collection(db, nomeColecao));
      if (snapBefore.empty) {
        return { ok: true, attempts: attempt };
      }

      // Apagar
      await limparColecao(nomeColecao);

      // Aguardar commit no servidor
      await new Promise(res => setTimeout(res, delayMs));

      // Verifica
      const snapAfter = await getDocs(collection(db, nomeColecao));
      if (snapAfter.empty) {
        return { ok: true, attempts: attempt };
      }
      // Se o número não mudou, aumentar delay (pode ser problema de replicação)
      if (snapAfter.size === snapBefore.size) {
        await new Promise(res => setTimeout(res, delayMs * 2));
      }
    }

    const finalSnap = await getDocs(collection(db, nomeColecao));
    console.error(`❌ [ensureColecaoVazia] FALHA em ${nomeColecao} após ${maxAttempts} tentativas. Restantes: ${finalSnap.size}`);

    // Mostrar IDs dos docs que não foram apagados
    if (!finalSnap.empty && finalSnap.size <= 20) {
      console.error(`📋 IDs não apagados:`);
      finalSnap.forEach(doc => console.error(`  - ${doc.id}`));
    }

    // @ts-ignore
    return { ok: finalSnap.empty, attempts: maxAttempts, remaining: finalSnap.size };
  };

  // Carregar estatísticas operacionais do dia
  const carregarEstatisticas = async () => {
    try {
      setLoadingStats(true);
      if (!user?.companyId) return;

      const today = getTodayKey();
      // Buscar DIRETAMENTE todos os pedidos do dia pelo dateKey
      const qPedidosDia = query(
        getCompanyCollection(user.companyId, 'pedidos'),
        where('dateKey', '==', today)
      );
      let pedidosSnapshot = await getDocs(qPedidosDia);


      let totalPedidos = pedidosSnapshot.size;
      let totalItens = 0;
      let temposTotais: any[] = [];

      // console.log(`📊 [Estatísticas] Total de pedidos encontrados (TODOS os status): ${totalPedidos}`);

      pedidosSnapshot.docs.forEach(pedidoDoc => {
        const pedido = pedidoDoc.data();
        // console.log(`📊 [Pedido ${pedidoDoc.id.slice(-4)}] status: ${pedido.status}, itens:`, pedido.itens, 'deliveredAt:', pedido.deliveredAt);
        // O campo correto no Firestore é 'itens' (com acento)
        const items = pedido.itens || pedido.items;

        if (items && Array.isArray(items)) {
          items.forEach((item: any) => {
            // Extrair quantidade do item (formato: "2x Carne Simples" ou "1x Item")
            const qtyMatch = item.match(/^(\d+)x/);
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            totalItens += qty;
          });
        } else {
          // do nothing
        }

        // Calcular tempo médio se tiver timestamps
        // Usar criadoEm ou horaPedido (campos do Firestore) em vez de createdAt
        const inicio = pedido.criadoEm || pedido.horaPedido || pedido.createdAt;
        const fim = pedido.timeInProntos;

        // console.log(`⏱️  [Pedido ${pedidoDoc.id.slice(-4)}] inicio:`, inicio, 'fim:', fim, 'status:', pedido.status);

        if (inicio && fim) {
          // console.log(`✅ [Pedido ${pedidoDoc.id.slice(-4)}] TEM AMBOS OS TIMESTAMPS! Calculando...`);
          let inicioSeconds, fimSeconds;

          // Converter início para seconds
          if (inicio.seconds) {
            inicioSeconds = inicio.seconds;
          } else if (typeof inicio === 'string') {
            inicioSeconds = new Date(inicio).getTime() / 1000;
          } else {
            // @ts-ignore
            inicioSeconds = new Date(inicio).getTime() / 1000;
          }

          // Converter fim para seconds
          if (fim.seconds) {
            fimSeconds = fim.seconds;
          } else if (typeof fim === 'string') {
            fimSeconds = new Date(fim).getTime() / 1000;
          } else {
            // @ts-ignore
            fimSeconds = new Date(fim).getTime() / 1000;
          }

          const tempoMinutos = Math.round((fimSeconds - inicioSeconds) / 60);
          // console.log(`⏱️  [Pedido ${pedidoDoc.id.slice(-4)}] Tempo calculado: ${tempoMinutos} minutos`);
          if (tempoMinutos > 0 && tempoMinutos < 180) {
            temposTotais.push(tempoMinutos);
          } else {
            // console.log(`⚠️  [Pedido ${pedidoDoc.id.slice(-4)}] Tempo inválido (${tempoMinutos} min) - ignorado`);
          }
        } else {
          // console.log(`⚠️  [Pedido ${pedidoDoc.id.slice(-4)}] Sem timestamps para calcular tempo`);
        }
      });

      const tempoMedio = temposTotais.length > 0
        ? Math.round(temposTotais.reduce((a, b) => a + b, 0) / temposTotais.length)
        : 0;

      // console.log(`📊 [Estatísticas FINAL] Pedidos: ${totalPedidos}, Itens: ${totalItens}, Tempo Médio: ${tempoMedio} min (de ${temposTotais.length} pedidos com tempo)`);

      setStats({
        totalPedidos,
        totalItens,
        tempoMedio
      });
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Carregar estatísticas de vendas por período
  const carregarEstatisticasVendas = async () => {
    try {
      setLoadingVendas(true);
      // console.log('💰 === CARREGANDO ESTATÍSTICAS DE VENDAS ===');

      setLoadingVendas(true);
      // console.log('💰 === CARREGANDO ESTATÍSTICAS DE VENDAS ===');

      const { startKey: dateKeyInicio, endKey: dateKeyFim } = getDateKeyRange(periodoSelecionado);

      // console.log(`💰 Período: ${dateKeyInicio} até ${dateKeyFim}`);
      // console.log(`💰 Buscando comandas fechadas...`);

      // Buscar todas as comandas fechadas no período
      if (!user?.companyId) return;

      // ✅ OTIMIZAÇÃO: Filtrar por data direto no Firestore
      const comandasSnapshot = await getDocs(
        query(
          getCompanyCollection(user.companyId, 'comandas'),
          where('status', '==', 'fechada'),
          where('dateKey', '>=', dateKeyInicio),
          where('dateKey', '<=', dateKeyFim)
        )
      );

      // console.log(`💰 Total de comandas fechadas no banco (filtradas): ${comandasSnapshot.size}`);

      let totalVendido = 0;
      let totalPedidos = 0;
      let totalCancelado = 0; // ✅ NOVO: Total de comandas canceladas
      let qtdCanceladas = 0;   // ✅ NOVO: Quantidade de comandas canceladas

      // Filtrar comandas do período e somar valores
      comandasSnapshot.docs.forEach(doc => {
        const comanda = doc.data();
        // Como o filtro já foi feito no banco, podemos confiar que está no range (exceto edge cases de fuso)
        // Somar
        totalVendido += comanda.totalConsumido || 0;
        totalPedidos++;
      });

      // ✅ NOVO: Buscar comandas CANCELADAS separadamente (com filtro de data)
      const comandasCanceladasSnapshot = await getDocs(
        query(
          getCompanyCollection(user.companyId, 'comandas'),
          where('status', '==', 'cancelada'),
          where('dateKey', '>=', dateKeyInicio),
          where('dateKey', '<=', dateKeyFim)
        )
      );

      comandasCanceladasSnapshot.docs.forEach(doc => {
        const comanda = doc.data();
        totalCancelado += comanda.totalConsumido || 0;
        qtdCanceladas++;
      });



      const ticketMedio = totalPedidos > 0 ? totalVendido / totalPedidos : 0;
      setVendasStats({
        totalVendido,
        totalPedidos,
        ticketMedio,
        totalCancelado,    // ✅ NOVO
        qtdCanceladas      // ✅ NOVO
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

              // Sinalizar para outros clientes via Firestore (maintenance flag)
              try {
                const maintenanceRef = doc(db, 'maintenance', 'limpeza');
                await setDoc(maintenanceRef, { startedAt: serverTimestamp(), by: (user && user.uid) ? user.uid : 'admin' });
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
                const maintenanceRef = doc(db, 'maintenance', 'limpeza');
                await deleteDoc(maintenanceRef);
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
    { name: 'Gerenciar Estoque', icon: '📦', action: () => setShowEstoque(true) },
    { name: 'Gerenciar Cardápio', icon: '🍴', action: () => setShowGerenciarCardapio(true) },
    { name: 'Configurar Impressora', icon: '🖨️', action: () => setShowPrinterConfig(true) },
    { name: 'Dados da Empresa', icon: '🏢', action: () => setShowEditarEmpresa(true) },
    { name: 'Configurar Biometria', icon: '👆', action: () => setShowBiometricSetup(true) },
    { name: 'Configurar MFA (2FA)', icon: '🛡️', action: () => setShowMFASetup(true) },
  ];

  return (
    <View style={styles.container}>
      <BackgroundPattern />

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#FFF" />
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
        <View style={{ flex: 1, backgroundColor: '#F5F1E8' }}>
          <FuncionariosScreen onClose={() => setShowFuncionarios(false)} />
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
    backgroundColor: '#F5F1E8',
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
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  vendaTabActive: {
    backgroundColor: '#E5B84A',
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
