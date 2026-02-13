
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import OrderService from '../services/OrderService';
// @ts-ignore
import { useComandaManagement } from '../hooks/useComandaManagement';
import { useToast } from '../context/ToastContext';
import ComandaList from '../components/comandas/ComandaList';
// @ts-ignore
import ComandaDetails from '../components/comandas/ComandaDetails';
// @ts-ignore
import AddItemsModal from '../components/comandas/AddItemsModal';
import { colors } from '../theme/colors';
import { getTodayKey } from '../utils/dateUtils'; // Migrated from FirebaseOptimizations
import { fixDecimal, calcularPrecoItem } from '../utils/orderCalculator';
import CancelOrderModal from '../components/comandas/CancelOrderModal';

import { confirmLogout } from '../utils/appUtils';

import PagamentosService from '../services/PagamentosService';
import ComandasService from '../services/ComandasService';
import PrinterService from '../services/PrinterService';
// @ts-ignore
import CaixaService from '../services/CaixaService';
import { supabase } from '../config/SupabaseConfig';

import { LayoutAnimation, Platform, UIManager } from 'react-native';
import PDFService from '../services/PDFService';


if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ComandaGerenciamentoScreen(props: any) {
  const { user, logout } = useAuth();
  const { addOrder } = useOrders();
  const {
    activeTab, setActiveTab,
    comandasAbertas, comandasPagas, comandasCanceladas,
    selectedComanda, setSelectedComanda,
    isRefreshing, carregarComandas,
    isLoadingMore, onLoadMore
  } = useComandaManagement();

  // Auto-open comanda from params
  // @ts-ignore
  const searchComanda = props.route?.params?.searchComanda;
  
  React.useEffect(() => {
    if (searchComanda && comandasAbertas.length > 0) {
      const found = comandasAbertas.find((c: any) => 
        String(c.comandaNumber) === String(searchComanda)
      );
      if (found) {
        setSelectedComanda(found);
        // Clear param to avoid re-opening
        props.navigation.setParams({ searchComanda: undefined });
      }
    }
  }, [searchComanda, comandasAbertas]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { showToast } = useToast();

  // --- Actions ---

  const handleLogout = () => {
    confirmLogout(logout);
  };

  const handlePrint = async (comandaData: any) => {
    // Preparar dados para o formato esperado pelo PrinterService (itens)
    let itensParaImprimir: any[] = [];

    if (comandaData.pedidos && comandaData.pedidos.length > 0) {
      // Agrupar itens igual fazemos no Details
      const mapItens: any = {};

      comandaData.pedidos.forEach((p: any) => {
        let itemsArray = p.items || p.itens || [];
        if (!Array.isArray(itemsArray)) itemsArray = [];

        itemsArray.forEach((itemText: string) => {
          const calc = calcularPrecoItem(itemText);
          const nome = calc.nomeCompleto;

          if (!mapItens[nome]) {
            mapItens[nome] = {
              nome: nome,
              quantidade: 0,
              valor: calc.precoUnitario,
              observacao: ''
            };
          }
          mapItens[nome].quantidade += calc.quantidade;
        });
      });

      // Converter para array
      itensParaImprimir = Object.values(mapItens).map((item: any) => ({
        nome: item.nome,
        quantidade: item.quantidade,
        valor: item.valor * item.quantidade,
        observacao: item.observacao
      }));
    }

    const dadosImpressao = {
      ...comandaData,
      itens: itensParaImprimir
    };

    const sucesso = await PrinterService.printComanda(dadosImpressao);
    if (!sucesso) {
      Alert.alert('Erro', 'Falha ao conectar na impressora. Verifique se o Bluetooth está ligado e a impressora configurada.');
    }
  };

  const handlePayment = async (comanda: any, forma: string, valor: number) => {
    try {
      if (comanda.status === 'cancelada') {
        Alert.alert('Operação Bloqueada', 'Esta comanda está CANCELADA e não pode receber pagamentos.');
        return;
      }

      const caixaAberto = await CaixaService.getCaixaAberto(user?.companyId);
      if (!caixaAberto) {
        Alert.alert('Caixa Fechado', 'Abra o caixa antes de receber pagamentos.');
        return;
      }

      const pedidosParaPagar = comanda.pedidos
        .filter((p: any) => !p.isPago)
        .map((p: any) => p.id);

      await PagamentosService.registrarPagamento({
        companyId: user?.companyId || '',
        dateKey: getTodayKey(),
        comandaNumber: comanda.comandaNumber,
        forma: forma,
        valor: valor,
        usuarioId: user?.id,
        usuarioNome: user?.nome,
      });

      if (pedidosParaPagar.length > 0) {
        await PagamentosService.marcarPedidosComoPagos(user?.companyId || '', pedidosParaPagar, forma);
      }

      // Check closure
      const saldoRestante = comanda.totalConsumido - (comanda.totalPago + valor);
      if (saldoRestante <= 0.01) {
        // Close comanda
        await new Promise(r => setTimeout(r, 1000)); // wait propagation
        await ComandasService.fecharComanda(user?.companyId || '', comanda.comandaNumber, user?.id, user?.nome);
      }

      showToast('Pagamento registrado!', 'success');
      setSelectedComanda(null);
      carregarComandas(true);

    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCancel = () => {
    if (!selectedComanda) return;

    const temPedidoEntregue = selectedComanda.pedidos?.some((pedido: any) => {
      if (pedido.status === 'delivered') return true;
      if (pedido.itemsWithStatus && Array.isArray(pedido.itemsWithStatus)) {
        return pedido.itemsWithStatus.some((item: any) => item.delivered === true);
      }
      return false;
    });

    if (temPedidoEntregue) {
      Alert.alert(
        'Operação Bloqueada',
        'Esta comanda possui pedidos já ENTREGUES e não pode ser cancelada.\n\nPara cancelar, você precisa primeiro estornar os pedidos entregues.'
      );
      return;
    }

    setShowCancelModal(true);
  };

  const confirmCancel = async (reason: string) => {
    if (!reason?.trim()) {
      Alert.alert('Erro', 'Por favor, informe o motivo do cancelamento.');
      return;
    }

    try {
      console.log('[ComandaGerenciamento] 🚫 Cancelando comanda:', {
        docId: `comanda-${getTodayKey()}-${selectedComanda.comandaNumber}`,
        comandaNumber: selectedComanda.comandaNumber,
        reason
      });

      const { error: updateError } = await supabase
        .from('comandas')
        .update({
          status: 'cancelada',
          canceled_by: user?.id || null,
          canceled_by_name: user?.nome || 'Admin',
          canceled_at: new Date().toISOString(),
          motivo_cancelamento: reason.trim()
        })
        .eq('company_id', user?.companyId || '')
        .eq('date_key', getTodayKey())
        .eq('comanda_number', selectedComanda.comandaNumber);

      if (updateError) throw updateError;

      if (selectedComanda.pedidos && selectedComanda.pedidos.length > 0) {
        const updatePromises = selectedComanda.pedidos.map(async (pedido: any) => {
          try {
            const { error } = await supabase
              .from('orders')
              .update({
                comanda_status: 'cancelada',
                cancelado_em: new Date().toISOString(),
                cancelado_por: user?.nome || 'Admin'
              })
              .eq('company_id', user?.companyId || '')
              .eq('id', pedido.id);

            if (error) throw error;
          } catch (err) {
            console.error('[ComandaGerenciamento] ❌ Erro ao marcar pedido:', pedido.id, err);
          }
        });

        await Promise.all(updatePromises);
      }

      showToast('Comanda cancelada', 'info');
      setSelectedComanda(null);
      setShowCancelModal(false);
      carregarComandas(true);
    } catch (e: any) {
      console.error('[ComandaGerenciamento] ❌ Erro ao cancelar:', e);
      showToast(e.message, 'error');
    }
  };

  const handleAddItems = async (items: string[]) => {
    try {
      const novoPedido = {
        comandaNumber: selectedComanda.comandaNumber,
        client: selectedComanda.cliente || 'Não informado',
        items: items,
        status: 'prontos',
        isPago: false,
        createdAt: new Date(),
        dateKey: getTodayKey(),
        waiter: user?.nome,
        waiterId: user?.id
      };

      await addOrder(
        novoPedido.client,
        novoPedido.items,
        '',
        novoPedido.comandaNumber,
        novoPedido.waiterId,
        novoPedido.waiter,
        0,
        false
      );

      showToast('Itens adicionados com sucesso!', 'success');
      setShowAddModal(false);
      carregarComandas(true);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const prepareDataForExport = (comandaData: any) => {
    let itensParaImprimir: any[] = [];
    if (comandaData.pedidos && comandaData.pedidos.length > 0) {
      const mapItens: any = {};
      comandaData.pedidos.forEach((p: any) => {
        let itemsArray = p.items || p.itens || [];
        if (!Array.isArray(itemsArray)) itemsArray = [];
        itemsArray.forEach((itemText: string) => {
          const calc = calcularPrecoItem(itemText);
          const nome = calc.nomeCompleto;
          if (!mapItens[nome]) {
            mapItens[nome] = { nome: nome, quantidade: 0, valor: calc.precoUnitario, observacao: '' };
          }
          mapItens[nome].quantidade += calc.quantidade;
        });
      });
      itensParaImprimir = Object.values(mapItens).map((item: any) => ({
        nome: item.nome,
        quantidade: item.quantidade,
        valor: item.valor * item.quantidade,
        observacao: item.observacao
      }));
    }

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const dataFormatada = `${dia}/${mes}/${ano} às ${hora}:${min}`;

    return {
      ...comandaData,
      itens: itensParaImprimir,
      dataEmissao: dataFormatada
    };
  };

  const handleShare = async (comandaData: any) => {
    try {
      const data = prepareDataForExport(comandaData);
      await PDFService.generateAndShareComanda(data, user?.company as any);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao compartilhar PDF');
    }
  };

  if (selectedComanda) {
    return (
      <>
        <ComandaDetails
          comanda={selectedComanda}
          onClose={() => setSelectedComanda(null)}
          onPay={(comanda: any, forma: string, valor: number) => handlePayment(comanda, forma, valor)}
          onCancel={handleCancel}
          onAddItems={() => setShowAddModal(true)}
          onPrint={() => handlePrint(selectedComanda)}
          onShare={() => handleShare(selectedComanda)}
          onFullPayment={() => {
            const comandaNum = selectedComanda.comandaNumber;
            // Não limpar a comanda selecionada para permitir voltar para ela
            // setSelectedComanda(null);
            props.navigation.navigate('Pagamento', { comandaNumber: comandaNum });
          }}
        />

        <AddItemsModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddItems}
          comandaNumber={selectedComanda.comandaNumber}
        />

        <CancelOrderModal
          visible={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={confirmCancel}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>


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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="clipboard-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Gerenciamento</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'abertas' && styles.activeTab]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('abertas');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'abertas' && styles.activeTabText]}>
            Abertas ({comandasAbertas.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pagas' && styles.activeTab]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('pagas');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'pagas' && styles.activeTabText]}>
            Pagas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'canceladas' && styles.activeTab]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('canceladas');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'canceladas' && styles.activeTabText]}>
            Canceladas
          </Text>
        </TouchableOpacity>
      </View>

      <ComandaList
        comandas={
          activeTab === 'abertas' ? comandasAbertas :
            activeTab === 'pagas' ? comandasPagas : comandasCanceladas
        }
        onSelectComanda={setSelectedComanda}
        refreshing={isRefreshing}
        onRefresh={() => carregarComandas(true)}
        onLoadMore={onLoadMore}
        loadingMore={isLoadingMore}
      />

      <StatusBar style="dark" />

      <CancelOrderModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    zIndex: 10,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    fontSize: 12,
    color: colors.userInfo,
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  tabs: { flexDirection: 'row', padding: 10 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#E0E0E0', marginHorizontal: 5 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontWeight: 'bold', color: colors.textSecondary },
  activeTabText: { color: colors.white },
});
