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
import { SalesByDayChart, SalesByPaymentChart } from '../components/FinancialCharts';
import { colors } from '../theme/colors';
import FuncionariosScreen from './FuncionariosScreen';
import CaixaAberturaScreen from './CaixaAberturaScreen';
import CaixaOperacoesScreen from './CaixaOperacoesScreen';
import CaixaFechamentoScreen from './CaixaFechamentoScreen';
import CaixaHistoricoScreen from './CaixaHistoricoScreen';
import ComandaVisualizacaoAdminScreen from './ComandaVisualizacaoAdminScreen';
import GerenciarCardapioScreen from './GerenciarCardapioScreen';
import EstoqueScreen from './EstoqueScreen';
import PrinterConfigScreen from './PrinterConfigScreen';
import EditarEmpresaScreen from './EditarEmpresaScreen';
import FinancialConfigScreen from './FinancialConfigScreen';
import FinancialDashboardScreen from './FinancialDashboardScreen';
import { confirmLogout } from '../utils/appUtils';

export default function AdminScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    confirmLogout(logout);
  };

  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor) => {
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
  const [chartData, setChartData] = useState({
    salesByDay: null,
    salesByPayment: null
  });
  const [loadingVendas, setLoadingVendas] = useState(true);

  // Estados para alertas de estoque
  const [alertasEstoque, setAlertasEstoque] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  // Ref para detectar quando o app volta ao foreground
  const appState = useRef(AppState.currentState);
  const reloadTimeout = useRef(null);

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
    const comandasQuery = getCompanyCollection(user.companyId, 'comandas');

    const unsubscribeComandas = onSnapshot(
      comandasQuery,
      (snapshot) => {
        let abertas = 0;
        let fechadas = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'aberta') abertas++;
          if (data.status === 'fechada') fechadas++;
        });
        // Usar debounce para evitar múltiplos reloads
        debounceReload();
      },
      (error) => {
        console.error('[AdminScreen] ❌ Erro no listener de comandas:', error);
        console.error('[AdminScreen] ❌ Código do erro:', error.code);
        console.error('[AdminScreen] ❌ Mensagem:', error.message);
      }
    );

    // Cleanup: remover listeners ao desmontar
    return () => {
      unsubscribePedidos();
      unsubscribeComandas();
    };
  }, [periodoSelecionado]);

  // Limpa uma coleção inteira em lotes (safe para >500 docs)
  const limparColecao = async (nomeColecao) => {
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
    } catch (error) {
      console.error(`❌ === ERRO ao limpar ${nomeColecao} ===`, error);
      console.error(`❌ Tipo de erro:`, error.name);
      console.error(`❌ Mensagem:`, error.message);
      console.error(`❌ Stack:`, error.stack);
      throw error;
    }
  };

  // Garante que a coleção fique vazia: roda limparColecao e valida com getDocs até um número máximo de tentativas
  const ensureColecaoVazia = async (nomeColecao, maxAttempts = 10, delayMs = 1000) => {
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

    return { ok: finalSnap.empty, attempts: maxAttempts, remaining: finalSnap.size };
  };

  const limparTodasComandas = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Usar window.confirm para web (Alert.alert não funciona bem no navegador)
    const mensagem = `⚠️ ATENÇÃO - LIMPAR COMANDAS ABERTAS\n\n` +
      `Isso apagará PERMANENTEMENTE:\n\n` +
      `• Comandas ABERTAS (não pagas)\n` +
      `• Pedidos não pagos associados\n\n` +
      `💡 Use isso para limpar pendências e comandas abandonadas\n` +
      `✅ Comandas FECHADAS (vendas) serão PRESERVADAS\n` +
      `✅ Histórico de vendas será mantido\n\n` +
      `Deseja continuar?`;

    const confirmado = typeof window !== 'undefined' && window.confirm
      ? window.confirm(mensagem)
      : false;
    if (!confirmado) {
      return;
    }

    try {
      setLoadingLimpar(true);
      let totalComandas = 0;
      let totalPedidos = 0;

      // Implementação da limpeza de comandas abertas aqui
      // ... (código existente)

    } catch (error) {
      console.error('❌ Erro:', error);
    } finally {
      setLoadingLimpar(false);
    }
  };

  // Nova função: Limpar apenas dados antigos (dias anteriores)
  const limparDadosAntigos = async () => {
    const mensagem = `⚠️ LIMPAR DADOS ANTIGOS\n\n` +
      `Isso apagará:\n\n` +
      `• Pedidos de DIAS ANTERIORES\n` +
      `• Comandas de DIAS ANTERIORES\n` +
      `• Pagamentos de DIAS ANTERIORES\n\n` +
      `✅ Dados de HOJE serão PRESERVADOS\n\n` +
      `Deseja continuar?`;

    const confirmado = typeof window !== 'undefined' && window.confirm
      ? window.confirm(mensagem)
      : false;

    if (!confirmado) {
      return;
    }

    try {
      setLoadingLimpar(true);
      const today = new Date().toISOString().split('T')[0];
      let totalPedidos = 0;
      let totalComandas = 0;
      let totalPagamentos = 0;

      // 1. Apagar pedidos antigos
      const pedidosSnap = await getDocs(collection(db, 'pedidos'));
      const batch1 = writeBatch(db);
      let countBatch1 = 0;

      pedidosSnap.docs.forEach(pedidoDoc => {
        const pedido = pedidoDoc.data();
        const dateKey = pedido.dateKey || (pedido.createdAt?.seconds ?
          new Date(pedido.createdAt.seconds * 1000).toISOString().split('T')[0] : null);

        if (dateKey && dateKey < today) {
          batch1.delete(doc(db, 'pedidos', pedidoDoc.id));
          countBatch1++;
        }
      });

      if (countBatch1 > 0) {
        await batch1.commit();
        totalPedidos = countBatch1;
      } else {
        // empty
      }

      // 2. Apagar comandas antigas
      const comandasSnap = await getDocs(collection(db, 'comandas'));
      const batch2 = writeBatch(db);
      let countBatch2 = 0;

      comandasSnap.docs.forEach(comandaDoc => {
        const comanda = comandaDoc.data();
        const dateKey = comanda.dateKey || (comanda.abertaAt?.seconds ?
          new Date(comanda.abertaAt.seconds * 1000).toISOString().split('T')[0] : null);

        if (dateKey && dateKey < today) {
          batch2.delete(doc(db, 'comandas', comandaDoc.id));
          countBatch2++;
        }
      });

      if (countBatch2 > 0) {
        await batch2.commit();
        totalComandas = countBatch2;
      } else {
        // empty
      }

      // 3. Apagar pagamentos antigos
      const pagamentosSnap = await getDocs(collection(db, 'pagamentos'));
      const batch3 = writeBatch(db);
      let countBatch3 = 0;

      pagamentosSnap.docs.forEach(pagamentoDoc => {
        const pagamento = pagamentoDoc.data();
        const dateKey = pagamento.dateKey || (pagamento.createdAt?.seconds ?
          new Date(pagamento.createdAt.seconds * 1000).toISOString().split('T')[0] : null);

        if (dateKey && dateKey < today) {
          batch3.delete(doc(db, 'pagamentos', pagamentoDoc.id));
          countBatch3++;
        }
      });

      if (countBatch3 > 0) {
        await batch3.commit();
        totalPagamentos = countBatch3;
      } else {
        // empty
      }
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`✅ Dados antigos removidos!\n\n` +
          `Pedidos: ${totalPedidos}\n` +
          `Comandas: ${totalComandas}\n` +
          `Pagamentos: ${totalPagamentos}`);
      }

      // Recarregar estatísticas
      carregarEstatisticas();
      carregarEstatisticasVendas();

    } catch (error) {
      console.error('❌ Erro ao limpar dados antigos:', error);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`❌ Erro ao limpar dados: ${error.message}`);
      }
    } finally {
      setLoadingLimpar(false);
    }
  };

  // 💰 Nova função: Migrar campo recebidoPor para comandas pagas antigas
  const migrarRecebidoPor = async () => {
    const mensagem = `💰 CORREÇÃO COMPLETA DE COMANDAS\n\n` +
      `Esta migração vai:\n` +
      `1. Buscar pedidos com isPago=true\n` +
      `2. Criar/atualizar comandas no Firestore\n` +
      `3. Adicionar campo recebidoPor\n` +
      `4. Calcular totalPago e saldoAberto\n\n` +
      `Deseja continuar?`;

    const confirmado = typeof window !== 'undefined' && window.confirm
      ? window.confirm(mensagem)
      : false;

    if (!confirmado) return;

    try {
      // console.log('💰 Iniciando correção completa...\n');

      // Buscar TODOS os pedidos
      const pedidosRef = collection(db, 'pedidos');
      const pedidosSnapshot = await getDocs(pedidosRef);

      if (pedidosSnapshot.empty) {
        Alert.alert('Aviso', 'Nenhum pedido encontrado');
        return;
      }

      // Agrupar pedidos por comanda
      const comandasMap = {};

      pedidosSnapshot.forEach(pedidoDoc => {
        const pedido = pedidoDoc.data();
        const comandaNum = String(pedido.comandaNumber || pedido.comandaId || '');

        if (!comandaNum || comandaNum.startsWith('TEMP')) return;

        if (!comandasMap[comandaNum]) {
          comandasMap[comandaNum] = {
            numero: comandaNum,
            dateKey: pedido.dateKey || new Date().toISOString().split('T')[0],
            pedidos: [],
            totalConsumido: 0,
            totalPago: 0,
            criadoPorNome: pedido.createdByName || pedido.criadoPorNome || 'Sistema',
            criadoPorId: pedido.createdBy || pedido.criadoPor || 'system',
          };
        }

        comandasMap[comandaNum].pedidos.push(pedido);
        comandasMap[comandaNum].totalConsumido += pedido.totalPrice || 0;

        if (pedido.isPago === true) {
          comandasMap[comandaNum].totalPago += pedido.totalPrice || 0;
        }
      });

      // console.log(`[MIGRAÇÃO] Encontradas ${Object.keys(comandasMap).length} comandas\n`);

      let criadas = 0;
      let atualizadas = 0;
      let erros = 0;

      // Para cada comanda, criar/atualizar no Firestore
      for (const [comandaNum, info] of Object.entries(comandasMap)) {
        try {
          // Buscar comanda existente
          const q = query(
            collection(db, 'comandas'),
            where('comandaNumber', '==', comandaNum)
          );
          const snap = await getDocs(q);

          const recebidoPor = info.totalPago > 0 ? [{
            id: info.criadoPorId,
            nome: info.criadoPorNome,
            data: new Date().toISOString(),
            timestamp: Date.now()
          }] : [];

          const comandaData = {
            comandaNumber: comandaNum,
            numeroComanda: comandaNum,
            dateKey: info.dateKey,
            totalConsumido: info.totalConsumido,
            totalPago: info.totalPago,
            saldoAberto: Math.max(0, info.totalConsumido - info.totalPago),
            // 🔒 PROTEÇÃO: Não sobrescrever status 'cancelada'
            status: info.totalPago >= info.totalConsumido ? 'fechada' : 'aberta',
            recebidoPor,
            criadoPorNome: info.criadoPorNome,
            criadoPor: info.criadoPorId,
            ultimaAtualizacao: new Date().toISOString(),
          };

          if (snap.empty) {
            // Criar nova comanda
            const docId = `comanda-${info.dateKey}-${comandaNum}`;
            await setDoc(doc(db, 'comandas', docId), comandaData);
            // console.log(`✅ CRIADA Comanda ${comandaNum}: R$ ${info.totalPago.toFixed(2)} de R$ ${info.totalConsumido.toFixed(2)}`);
            criadas++;
          } else {
            // Atualizar comanda existente
            const docRef = doc(db, 'comandas', snap.docs[0].id);
            const existing = snap.docs[0].data();

            // 🔒 PROTEÇÃO: Não sobrescrever status 'cancelada'
            if (existing.status === 'cancelada') {
              // Comanda cancelada - não atualizar status
              delete comandaData.status;
            }

            // Só atualizar se recebidoPor estiver vazio
            if (!existing.recebidoPor || existing.recebidoPor.length === 0) {
              await setDoc(docRef, comandaData, { merge: true });
              // console.log(`✅ ATUALIZADA Comanda ${comandaNum}: recebidoPor: ${info.criadoPorNome}`);
              atualizadas++;
            } else {
              // console.log(`✓ Comanda ${comandaNum} já tem recebidoPor`);
            }
          }
        } catch (error) {
          console.error(`❌ Erro na Comanda ${comandaNum}:`, error.message);
          erros++;
        }
      }

      // console.log(`\n📊 RESULTADO FINAL:`);
      // console.log(`✅ Comandas criadas: ${criadas}`);
      // console.log(`✅ Comandas atualizadas: ${atualizadas}`);
      // console.log(`❌ Erros: ${erros}`);

      if (criadas > 0 || atualizadas > 0) {
        Alert.alert(
          'Migração Concluída!',
          `✅ ${criadas} comanda(s) criada(s)\n` +
          `✅ ${atualizadas} comanda(s) atualizada(s)\n\n` +
          `Recarregue a tela de Comandas para ver as mudanças.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Aviso', 'Todas as comandas já estão corretas!');
      }

    } catch (error) {
      console.error('❌ Erro na migração:', error);
      Alert.alert('Erro', `Falha na migração: ${error.message}`);
    }
  };

  // 🔧 Nova função: Corrigir campos de garçons retroativamente
  const corrigirGarconsRetroativo = async () => {
    const mensagem = `👤 CORREÇÃO RETROATIVA DE GARÇONS\n\n` +
      `Isso vai adicionar os campos criadoPor/criadoPorNome nos pedidos antigos.\n\n` +
      `Necessário para que as estatísticas de garçons mostrem todos os usuários.\n\n` +
      `Deseja continuar?`;

    const confirmado = typeof window !== 'undefined' && window.confirm
      ? window.confirm(mensagem)
      : false;

    if (!confirmado) return;

    try {
      // console.log('👤 Iniciando correção de garçons retroativa...\n');

      const pedidosRef = collection(db, 'pedidos');
      const snapshot = await getDocs(pedidosRef);

      if (snapshot.empty) {
        Alert.alert('Aviso', 'Nenhum pedido encontrado');
        return;
      }

      let corrigidos = 0;
      let pulados = 0;

      for (const docSnapshot of snapshot.docs) {
        const pedido = docSnapshot.data();

        // Se já tem criadoPor, pular
        if (pedido.criadoPor) {
          pulados++;
          continue;
        }

        // Se tem createdBy mas não tem criadoPor, adicionar
        if (pedido.createdBy) {
          const docRef = doc(db, 'pedidos', docSnapshot.id);
          await setDoc(docRef, {
            criadoPor: pedido.createdBy,
            criadoPorNome: pedido.createdByName || pedido.criadoPorNome || 'Sem nome'
          }, { merge: true });

          // console.log(`✅ Corrigido pedido ${docSnapshot.id.slice(-4)}: ${pedido.createdByName}`);
          corrigidos++;
        } else {
          // console.log(`⚠️  Pedido ${docSnapshot.id.slice(-4)} sem createdBy nem criadoPor`);
          pulados++;
        }
      }

      // console.log(`\n📊 Resumo: ${corrigidos} corrigidos, ${pulados} pulados`);

      if (corrigidos > 0) {
        Alert.alert(
          'Sucesso!',
          `✅ ${corrigidos} pedidos corrigidos!\n\n` +
          `Agora as estatísticas de garçons devem mostrar todos os usuários.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Aviso', 'Nenhuma correção necessária.');
      }

    } catch (error) {
      console.error('❌ Erro ao corrigir garçons:', error);
      Alert.alert('Erro', `Falha ao corrigir: ${error.message}`);
    }
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
      // 🔧 SE NÃO ENCONTROU PEDIDOS, VERIFICAR SE HÁ PEDIDOS SEM dateKey E CORRIGI-LOS
      if (pedidosSnapshot.size === 0) {
        const todosPedidos = await getDocs(getCompanyCollection(user.companyId, 'pedidos'));
        let pedidosSemDateKey = 0;
        const batch = writeBatch(db);

        todosPedidos.docs.forEach(pedidoDoc => {
          const pedido = pedidoDoc.data();

          if (!pedido.dateKey) {
            let dateKey;
            if (pedido.createdAt) {
              if (pedido.createdAt.seconds) {
                const date = new Date(pedido.createdAt.seconds * 1000);
                dateKey = date.toISOString().split('T')[0];
              } else if (typeof pedido.createdAt === 'string') {
                dateKey = pedido.createdAt.split('T')[0];
              }
            }

            if (!dateKey) {
              dateKey = today; // fallback para hoje
            }

            batch.update(doc(db, 'pedidos', pedidoDoc.id), { dateKey });
            pedidosSemDateKey++;
          }
        });

        if (pedidosSemDateKey > 0) {
          await batch.commit();
          // Buscar novamente após correção
          pedidosSnapshot = await getDocs(qPedidosDia);
        }
      }

      let totalPedidos = pedidosSnapshot.size;
      let totalItens = 0;
      let temposTotais = [];

      // console.log(`📊 [Estatísticas] Total de pedidos encontrados (TODOS os status): ${totalPedidos}`);

      pedidosSnapshot.docs.forEach(pedidoDoc => {
        const pedido = pedidoDoc.data();
        // console.log(`📊 [Pedido ${pedidoDoc.id.slice(-4)}] status: ${pedido.status}, itens:`, pedido.itens, 'deliveredAt:', pedido.deliveredAt);
        // O campo correto no Firestore é 'itens' (com acento)
        const items = pedido.itens || pedido.items;

        if (items && Array.isArray(items)) {
          items.forEach(item => {
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
            inicioSeconds = new Date(inicio).getTime() / 1000;
          }

          // Converter fim para seconds
          if (fim.seconds) {
            fimSeconds = fim.seconds;
          } else if (typeof fim === 'string') {
            fimSeconds = new Date(fim).getTime() / 1000;
          } else {
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

      const comandasSnapshot = await getDocs(
        query(
          getCompanyCollection(user.companyId, 'comandas'),
          where('status', '==', 'fechada')
        )
      );

      // console.log(`💰 Total de comandas fechadas no banco: ${comandasSnapshot.size}`);

      let totalVendido = 0;
      let totalPedidos = 0;
      let totalCancelado = 0; // ✅ NOVO: Total de comandas canceladas
      let qtdCanceladas = 0;   // ✅ NOVO: Quantidade de comandas canceladas

      // Filtrar comandas do período e somar valores
      comandasSnapshot.docs.forEach(doc => {
        const comanda = doc.data();
        let comandaDateKey = comanda.dateKey;

        // Se não tiver dateKey, tentar extrair da data de fechamento
        if (!comandaDateKey && comanda.fechadaAt) {
          if (comanda.fechadaAt.toDate) {
            comandaDateKey = comanda.fechadaAt.toDate().toISOString().split('T')[0];
          } else if (comanda.fechadaAt.seconds) {
            const date = new Date(comanda.fechadaAt.seconds * 1000);
            comandaDateKey = date.toISOString().split('T')[0];
          }
        }

        // console.log(`  💰 Comanda ${comanda.numeroComanda || comanda.comandaNumber}: R$ ${(comanda.totalConsumido || 0).toFixed(2)}, data: ${comandaDateKey || 'sem data'}`);

        if (comandaDateKey && comandaDateKey >= dateKeyInicio && comandaDateKey <= dateKeyFim) {
          // ✅ CORREÇÃO: Não incluir comandas canceladas nas vendas
          totalVendido += comanda.totalConsumido || 0;
          totalPedidos++;
          // console.log(`    ✅ Incluída no período (${periodoSelecionado})`);
        } else {
          // console.log(`    ❌ Fora do período ou sem data`);
        }
      });

      // ✅ NOVO: Buscar comandas CANCELADAS separadamente
      const comandasCanceladasSnapshot = await getDocs(
        query(
          getCompanyCollection(user.companyId, 'comandas'),
          where('status', '==', 'cancelada')
        )
      );

      comandasCanceladasSnapshot.docs.forEach(doc => {
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

        if (comandaDateKey && comandaDateKey >= dateKeyInicio && comandaDateKey <= dateKeyFim) {
          totalCancelado += comanda.totalConsumido || 0;
          qtdCanceladas++;
        }
      });

      // console.log(`💰 === RESULTADO ===`);
      // console.log(`💰 Total vendido: R$ ${totalVendido.toFixed(2)}`);
      // console.log(`💰 Total de comandas: ${totalPedidos}`);
      // console.log(`💰 Total cancelado: R$ ${totalCancelado.toFixed(2)}`);
      // console.log(`💰 Comandas canceladas: ${qtdCanceladas}`);

      // --- AGREGAÇÃO PARA GRÁFICOS ---

      // 1. Vendas por Dia (Bar Chart)
      // Inicializar mapa de dias do intervalo com TODOS os dias
      const dailyMap = {};

      // Gerar todos os dias do período
      const startDate = new Date(dateKeyInicio);
      const endDate = new Date(dateKeyFim);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dKey = currentDate.toISOString().split('T')[0];
        dailyMap[dKey] = 0; // Inicializar com 0
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Iterar comandas para preencher dias
      comandasSnapshot.docs.forEach(doc => {
        const comanda = doc.data();
        let dKey = comanda.dateKey;
        if (!dKey && comanda.fechadaAt) {
          const dt = comanda.fechadaAt.toDate ? comanda.fechadaAt.toDate() : new Date(comanda.fechadaAt.seconds * 1000);
          dKey = dt.toISOString().split('T')[0];
        }

        if (dKey && dKey >= dateKeyInicio && dKey <= dateKeyFim) {
          const valor = parseFloat(comanda.totalConsumido) || 0;
          // ✅ VALIDAÇÃO: Ignorar valores absurdos (maior que R$ 10.000)
          if (valor > 0 && valor < 10000) {
            dailyMap[dKey] = (dailyMap[dKey] || 0) + valor;
          } else if (valor >= 10000) {
            console.warn(`⚠️ Valor suspeito ignorado: R$ ${valor.toFixed(2)} na comanda ${comanda.comandaNumber}`);
          }
        }
      });

      // Ordenar e formatar para o gráfico
      const sortedDays = Object.keys(dailyMap).sort();
      const salesByDay = {
        labels: sortedDays.map(d => {
          const parts = d.split('-');
          return parts[2] + '/' + parts[1]; // DD/MM
        }),
        datasets: [{
          data: sortedDays.map(d => Math.round(dailyMap[d] * 100) / 100) // Arredondar para 2 casas decimais
        }]
      };

      // 2. Vendas por Pagamento (Pie Chart) - Buscar na coleção 'pagamentos'
      // Precisamos buscar pagamentos do período
      const pagamentosSnapshot = await getDocs(
        query(
          getCompanyCollection(user.companyId, 'pagamentos'), // ✅ CORRIGIDO: Buscar na subcoleção da empresa
          where('dateKey', '>=', dateKeyInicio),
          where('dateKey', '<=', dateKeyFim)
        )
      );

      const paymentMap = {};
      pagamentosSnapshot.forEach(doc => {
        const p = doc.data();
        const forma = p.forma ? p.forma.toUpperCase() : 'OUTROS';
        const valor = parseFloat(p.valor) || 0;

        // ✅ VALIDAÇÃO: Ignorar valores absurdos (maior que R$ 10.000)
        if (valor > 0 && valor < 10000) {
          paymentMap[forma] = (paymentMap[forma] || 0) + valor;
        } else if (valor >= 10000) {
          console.warn(`⚠️ Pagamento com valor suspeito ignorado: R$ ${valor.toFixed(2)}`);
        }
      });

      const paymentColors = [colors.primary, colors.secondary, colors.success, colors.warning, '#808080'];
      const salesByPayment = Object.keys(paymentMap).map((forma, index) => ({
        name: forma,
        population: Math.round(paymentMap[forma] * 100) / 100, // Arredondar para 2 casas decimais
        color: paymentColors[index % paymentColors.length],
        legendFontColor: "#7F7F7F",
        legendFontSize: 12
      }));

      setChartData({ salesByDay, salesByPayment });

      // -------------------------------

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

  // 🔧 FUNÇÃO TEMPORÁRIA: Adicionar dateKey aos pedidos existentes
  const corrigirDateKeyPedidos = async () => {
    Alert.alert(
      '🔧 Corrigir Pedidos',
      'Isso vai adicionar o campo dateKey aos pedidos que não têm esse campo.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, corrigir',
          onPress: async () => {
            try {
              const pedidosSnapshot = await getDocs(collection(db, 'pedidos'));
              let atualizados = 0;
              let jaExistiam = 0;

              const batch = writeBatch(db);

              pedidosSnapshot.docs.forEach(pedidoDoc => {
                const pedido = pedidoDoc.data();

                if (!pedido.dateKey) {
                  let dateKey;
                  if (pedido.createdAt) {
                    if (pedido.createdAt.seconds) {
                      const date = new Date(pedido.createdAt.seconds * 1000);
                      dateKey = date.toISOString().split('T')[0];
                    } else if (typeof pedido.createdAt === 'string') {
                      dateKey = pedido.createdAt.split('T')[0];
                    }
                  }

                  if (!dateKey) {
                    dateKey = new Date().toISOString().split('T')[0];
                  }

                  batch.update(doc(db, 'pedidos', pedidoDoc.id), { dateKey });
                  atualizados++;
                } else {
                  jaExistiam++;
                }
              });

              await batch.commit();

              Alert.alert(
                '✅ Correção Concluída',
                `Pedidos atualizados: ${atualizados}\nJá tinham dateKey: ${jaExistiam}\n\nRecarregue as estatísticas!`
              );
              // Recarregar estatísticas
              carregarEstatisticas();
            } catch (error) {
              console.error('❌ Erro ao corrigir pedidos:', error);
              Alert.alert('Erro', 'Erro ao corrigir pedidos: ' + error.message);
            }
          }
        }
      ]
    );
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
              try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('limpezaEmAndamento', '1'); } catch { // ignore
              }

              // Sinalizar para outros clientes via Firestore (maintenance flag)
              try {
                const maintenanceRef = doc(db, 'maintenance', 'limpeza');
                await setDoc(maintenanceRef, { startedAt: serverTimestamp(), by: (user && user.id) ? user.id : 'admin' });
              } catch (e) {
                // ignore
              }
              setLoadingLimpar(true);
              const result = await ensureColecaoVazia('comandas', 10, 1200);
              const resumo = result.ok ? `✅ Todas as comandas apagadas (${result.attempts} tentativas)` : `❌ Falha ao apagar comandas (restam ${result.remaining})`;
              Alert.alert('Resultado', resumo);
              try { if (typeof window !== 'undefined' && window.location && window.location.reload) setTimeout(() => window.location.reload(), 700); } catch { // ignore
              }
            } catch (e) {
              console.error('❌ Erro ao apagar comandas:', e);
              Alert.alert('Erro', `Falha: ${e.message}`);
            } finally {
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

  // Migra pedidos antigos para adicionar itemsWithStatus
  const migrarItemsWithStatus = async () => {
    // console.log('🔧 Função migrarItemsWithStatus chamada!');

    // Executar direto sem Alert (não funciona bem no web)
    try {
      setLoadingLimpar(true);

      // console.log('🔧 Iniciando migração de itemsWithStatus...');

      // Buscar TODOS os pedidos
      const ordersRef = collection(db, 'pedidos');
      const snapshot = await getDocs(ordersRef);

      // console.log(`📦 Total de pedidos encontrados: ${snapshot.size}`);

      if (snapshot.empty) {
        // console.log('❌ Nenhum pedido encontrado!');
        alert('Nenhum pedido encontrado!');
        setLoadingLimpar(false);
        return;
      }

      let migrados = 0;
      let jaExistiam = 0;
      let erros = 0;

      // Processar cada pedido
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const orderId = data.id || docSnap.id;

        // FORÇAR MIGRAÇÃO - não pular nenhum pedido
        // (Comentado a verificação que estava pulando pedidos)
        // const temItemsWithStatus = data.itemsWithStatus && Array.isArray(data.itemsWithStatus) && data.itemsWithStatus.length > 0;
        // if (temItemsWithStatus) {
        //   jaExistiam++;
        //   continue;
        // }

        // Buscar items - no Firestore o campo é 'itens' (português)
        let itemsArray = data.itens || data.items || [];

        // Se ainda não tiver, tentar outros campos
        if (!itemsArray || itemsArray.length === 0) {
          const keys = Object.keys(data);

          // Verificar propriedades numéricas (0, 1, 2...)
          const numericKeys = keys.filter(k => /^\d+$/.test(k)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
          if (numericKeys.length > 0 && typeof data[numericKeys[0]] === 'string') {
            itemsArray = numericKeys.map(k => data[k]);
            // console.log(`  📝 Encontrado ${itemsArray.length} items em propriedades numéricas`);
          }
        }

        // console.log(`  Pedido ${orderId}: ${itemsArray?.length || 0} items`);

        // Verificar se conseguimos items válido
        if (!itemsArray || !Array.isArray(itemsArray) || itemsArray.length === 0) {
          // console.log(`  ❌ Pedido ${orderId}: Sem items válido`);
          erros++;
          continue;
        }

        // Criar itemsWithStatus a partir de items
        const now = new Date().toISOString();
        const comandaNum = data.numeroComanda || data.comandaNumber || data.comandaId || 'temp';
        const itemsWithStatus = itemsArray.map((itemName, index) => ({
          id: `${orderId}-comanda-${comandaNum}-item-${index}`,
          name: itemName,
          status: 'churrasqueira',
          checked: false,
          timestamp: now
        }));

        // console.log(`  ✅ Migrando pedido ${orderId} com ${itemsWithStatus.length} itens`);

        // Adicionar ao batch - atualizar items E itemsWithStatus
        const docRef = doc(db, 'pedidos', docSnap.id);
        const updateData = {
          itemsWithStatus,
          items: itemsArray // Garantir que items está preenchido
        };
        batch.update(docRef, updateData);

        migrados++;
        batchCount++;

        // Firestore tem limite de 500 operações por batch
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db); // Criar novo batch
          batchCount = 0;
        }
      }

      // Commit do batch final se houver operações pendentes
      if (batchCount > 0) {
        // console.log(`💾 Commitando batch final com ${batchCount} operações...`);
        await batch.commit();
      }

      // console.log('✅ Migração concluída!');
      // console.log(`   Migrados: ${migrados}`);
      // console.log(`   Já tinham: ${jaExistiam}`);
      // console.log(`   Erros: ${erros}`);
      // console.log(`   Total: ${snapshot.size}`);

      const mensagem = `✅ Migração concluída!\n\nMigrados: ${migrados}\nJá tinham: ${jaExistiam}\nErros: ${erros}\nTotal: ${snapshot.size}`;
      alert(mensagem);

      // Recarregar estatísticas
      carregarEstatisticas();

    } catch (e) {
      console.error('❌ Erro na migração:', e);
      alert(`Erro na migração: ${e.message}`);
    } finally {
      setLoadingLimpar(false);
    }
  };

  const reports = [
    { name: 'Gerenciar Funcionários', icon: '👥', action: () => setShowFuncionarios(true) },
    { name: 'Caixa', icon: '💰', action: () => setShowCaixaMenu(true) },
    { name: 'Estatísticas dos Garçons', icon: '📊', action: () => setShowComandasVisualizacao(true) },
    { name: 'Gerenciar Estoque', icon: '📦', action: () => setShowEstoque(true) },
    { name: 'Gerenciar Cardápio', icon: '🍴', action: () => setShowGerenciarCardapio(true) },
    { name: 'Configurar Impressora', icon: '🖨️', action: () => setShowPrinterConfig(true) },
    { name: 'Dados da Empresa', icon: '🏢', action: () => setShowEditarEmpresa(true) },
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
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
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

        {/* Relatórios Section Title was nearby */}

        {/* Dashboards Gráficos */}
        {!loadingVendas && chartData.salesByDay && (
          <View style={{ marginTop: 20 }}>
            <SalesByDayChart data={chartData.salesByDay} />
            <SalesByPaymentChart data={chartData.salesByPayment} />
          </View>
        )}



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
            style={[styles.reportCard, report.danger && styles.reportCardDanger]}
            onPress={report.action}
            disabled={loadingLimpar}
          >
            <View style={styles.reportLeft}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              <Text style={[styles.reportName, report.danger && styles.reportNameDanger]}>{report.name}</Text>
            </View>
            <Text style={[styles.reportArrow, report.danger && styles.reportArrowDanger]}>›</Text>
          </TouchableOpacity>
        ))}
        {/* --- DIAGNÓSTICO --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          <TouchableOpacity
            style={[styles.menuButton, { borderBottomWidth: 0 }]}
            onPress={() => {
              throw new Error('Test Crash: Sentry Integration Verification');
            }}
          >
            <Ionicons name="bug-outline" size={24} color="#FF0000" />
            <Text style={[styles.menuButtonText, { color: '#FF0000' }]}>Testar Crash (Sentry)</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { marginBottom: 30 }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
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
});
