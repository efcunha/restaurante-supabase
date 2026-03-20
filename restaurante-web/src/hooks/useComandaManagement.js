
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
import { getTodayKey } from '../utils/dateUtils'; // Migrated from FirebaseOptimizations
import { normalizeComandaNumber } from '../services/OrderFirestoreService';
import { calcularTotalPedido, calcularPagoPedido, fixDecimal } from '../utils/orderCalculator';
import ComandasService from '../services/ComandasService';

const getMesaValida = (mesa) => {
    const normalizedMesa = String(mesa || '').trim();
    const mesaNumero = Number(normalizedMesa.replace(/\D/g, ''));

    if (!normalizedMesa || !Number.isFinite(mesaNumero) || mesaNumero <= 0) {
        return '';
    }

    return normalizedMesa;
};

export function useComandaManagement() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('abertas');
    const [comandasAbertas, setComandasAbertas] = useState([]);
    const [comandasPagas, setComandasPagas] = useState([]);
    const [comandasCanceladas, setComandasCanceladas] = useState([]);
    const [selectedComanda, setSelectedComanda] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState({ pagas: true, canceladas: true });
    const [cardapioDin, setCardapioDin] = useState([]);

    const todayKey = getTodayKey;

    const carregarComandas = useCallback(async (_forcarBusca = false, loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            if (activeTab === 'abertas') {
                await _carregarComandasAbertas();
            } else {
                await _carregarHistorico(activeTab);
            }
        } catch (error) {
            console.error('[CarregarComandas] ❌ Erro:', error);
        } finally {
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [activeTab, user]);

    // Helper para ordenação numérica
    const sortComandasNumerico = (a, b) => {
        const strA = String(a.comandaNumber || '');
        const strB = String(b.comandaNumber || '');
        const numA = strA.match(/\d+/);
        const numB = strB.match(/\d+/);

        if (numA && numB) {
            const diff = parseInt(numA[0], 10) - parseInt(numB[0], 10);
            if (diff !== 0) return diff;
        }

        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
    };

    const _carregarComandasAbertas = async () => {
        if (!user?.companyId) return;
        const diaHoje = getTodayKey();

        try {
            // Buscar pedidos do dia
            const { data: pedidos, error: pedidosError } = await supabase
                .from('orders')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('date_key', diaHoje);

            if (pedidosError) throw pedidosError;
            
            // 🔄 NEW: Fetch product list for accurate dynamic calculations (avoiding hardcode)
            const { data: produtos } = await supabase
                .from('products')
                .select('name, price')
                .eq('company_id', user.companyId)
                .eq('available', true);
            
            const cardapioList = (produtos || []).map(p => ({
                name: p.name,
                price: Number(p.price)
            }));
            
            setCardapioDin(cardapioList);

            // Agrupar pedidos por comanda
            const comandasMap = {};

            (pedidos || []).forEach((order) => {
                const rawComandaNumber = order.comanda_number;
                const comandaNum = normalizeComandaNumber(rawComandaNumber);
                if (!comandaNum) return;

                if (!comandasMap[comandaNum]) {
                    // Extrair hora do created_at
                    const createdDate = order.created_at ? new Date(order.created_at) : new Date();
                    const horarioCriacao = createdDate.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });

                    comandasMap[comandaNum] = {
                        comandaNumber: comandaNum,
                        pedidos: [],
                        pedidosPagos: [],
                        pedidosAbertos: [],
                        totalConsumido: 0,
                        totalPago: 0,
                        saldoAberto: 0,
                        status: 'aberta',
                        cliente: order.client_name || order.client || 'Não informado',
                        mesa: getMesaValida(order.table_number?.toString() || order.mesa),
                        ultimaAtualizacao: order.created_at,
                        criadoPorNome: order.created_by_name || null,
                        horarioCriacao: horarioCriacao,
                        tipoComanda: 'balcao',
                        entregues: [],
                        recebidoPor: [],
                        recebedores: [],
                        pagamentosResumo: null
                    };
                }

                if (order.entregue_por_nome && !comandasMap[comandaNum].entregues.includes(order.entregue_por_nome)) {
                    comandasMap[comandaNum].entregues.push(order.entregue_por_nome);
                }

                // Atualizar mesa se vier do pedido
                const mesaPedido = getMesaValida(order.table_number?.toString() || order.mesa);
                if (mesaPedido && !comandasMap[comandaNum].mesa) {
                    comandasMap[comandaNum].mesa = mesaPedido;
                }

                const orderType = String(order.order_type || order.orderType || '').toLowerCase();
                if (orderType === 'delivery') {
                    comandasMap[comandaNum].tipoComanda = 'delivery';
                } else if (mesaPedido && comandasMap[comandaNum].tipoComanda !== 'delivery') {
                    comandasMap[comandaNum].tipoComanda = 'mesa';
                }

                // Map Supabase fields to expected format before adding to array
                const mappedOrder = {
                    ...order,
                    totalPrice: order.total_amount || 0,
                    isPago: order.is_paid || false,
                    priceMap: order.price_map || {},
                    itemsWithStatus: order.items_with_status || []
                };

                comandasMap[comandaNum].pedidos.push(mappedOrder);
                const isPedidoPago = order.is_paid === true || order.is_paid === 'true' || order.is_paid === 1;
                
                if (isPedidoPago) {
                    comandasMap[comandaNum].pedidosPagos.push(mappedOrder);
                } else {
                    comandasMap[comandaNum].pedidosAbertos.push(mappedOrder);
                }

                if (new Date(order.created_at) > new Date(comandasMap[comandaNum].ultimaAtualizacao)) {
                    comandasMap[comandaNum].ultimaAtualizacao = order.created_at;
                    comandasMap[comandaNum].cliente = order.client_name || order.client || comandasMap[comandaNum].cliente;
                }
            });

            // Buscar metadados das comandas
            const { data: comandas, error: comandasError } = await supabase
                .from('comandas')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('date_key', diaHoje);

            if (comandasError) throw comandasError;

            (comandas || []).forEach(data => {
                const comandaNum = normalizeComandaNumber(data.comanda_number);
                if (!comandaNum) return;

                if (comandasMap[comandaNum]) {
                    const c = comandasMap[comandaNum];
                    c.pagamentosResumo = data.pagamentos_resumo || c.pagamentosResumo;
                    c.ultimoPagamentoPor = data.ultimo_pagamento_por || c.ultimoPagamentoPor;
                    c.ultimoPagamentoForma = data.ultimo_pagamento_forma || c.ultimoPagamentoForma;
                    c.ultimoPagamentoEm = data.ultimo_pagamento_em || c.ultimoPagamentoEm;
                    c.mesa = getMesaValida(data.mesa) || c.mesa;
                    c.abertaPorNome = data.opened_by_name || c.criadoPorNome;

                    if (c.mesa && c.tipoComanda !== 'delivery') {
                        c.tipoComanda = 'mesa';
                    }

                    // Support for synced financial data
                    c.totalPaidMetadata = data.total_paid || 0;
                    c.totalConsumidoMetadata = data.total_consumed || 0;

                    if (data.cliente && data.cliente !== 'Não informado' && data.cliente !== 'Cliente Balcão') {
                        c.cliente = data.cliente;
                    }

                    if (data.status === 'fechada') c.status = 'paga';
                    else if (data.status === 'cancelada') c.status = 'cancelada';
                    else if (data.status === 'merged') c.status = 'merged';
                }
            });

            // Calcular totais
            const todasComandas = Object.values(comandasMap);

            todasComandas.forEach(comanda => {
                let totalConsumidoPedidos = 0;
                let totalPagoPedidos = 0;

                if (comanda.pedidos) {
                    comanda.pedidos.forEach(pedido => {
                        const dbPrice = Number(pedido.totalPrice || pedido.total_amount) || 0;
                        
                        // 🔒 CORREÇÃO CRÍTICA (Bug Discrepância de Preço):
                        // Anteriormente, o cálculo com cardapioList ignorava os preços salvos no order
                        // (em especial Pizzas) o que abaixava silenciosamente o valor dbPrice e
                        // sobrescrevia o banco usando sincronizarTotalComanda.
                        // AGORA: respeitamos o DB rigidamente, permitindo recálculo APENAS se dbPrice 0.
                        const totalPedidoRecalculado = calcularTotalPedido(pedido, cardapioList);
                        const valor = dbPrice > 0 ? dbPrice : totalPedidoRecalculado;
                        
                        let totalPagoRecalculado = 0;
                        if (pedido.is_paid === true || pedido.is_paid === 'true' || pedido.is_paid === 1 || pedido.isPago === true) {
                            totalPagoRecalculado = valor;
                        } else {
                            totalPagoRecalculado = calcularPagoPedido(pedido, cardapioList);
                        }
                        
                        totalConsumidoPedidos += valor;
                        totalPagoPedidos += totalPagoRecalculado;
                    });
                }

                // Prioritize calculation from orders over comanda metadata 
                // UNLESS metadata is significantly higher (maybe due to manual charges not in orders)
                const metadataTotal = Number(comanda.totalConsumidoMetadata || 0);
                comanda.totalConsumido = fixDecimal(totalConsumidoPedidos > 0 ? totalConsumidoPedidos : metadataTotal);
                
                // totalPago must include both specific item payments AND general comanda payments
                const totalPagoFinanceiro = Number(comanda.totalPaidMetadata || 0);
                comanda.totalPago = fixDecimal(Math.max(totalPagoPedidos, totalPagoFinanceiro));
                
                comanda.saldoAberto = fixDecimal(Math.max(0, comanda.totalConsumido - comanda.totalPago));

                // 🔄 Auto-sync metadata if different from items sum
                // We only do this if we have orders, to avoid overwriting metadata with 0 if orders didn't load
                // (Isso agora será raro, já que confiamos no próprio valor gravado nas ordens)
                if (totalConsumidoPedidos > 0 && Math.abs(totalConsumidoPedidos - metadataTotal) > 0.01) {
                    console.log(`[useComandaManagement] 🔄 Syncing Comanda ${comanda.comandaNumber} total: ${metadataTotal} -> ${totalConsumidoPedidos}`);
                    ComandasService.sincronizarTotalComanda(user.companyId, comanda.comandaNumber, totalConsumidoPedidos);
                }

                const todosPagos = comanda.pedidos && comanda.pedidos.length > 0 && 
                    comanda.pedidos
                        .filter(p => p.status !== 'cancelled' && p.status !== 'cancelada')
                        .every(p => p.is_paid === true || p.is_paid === 'true' || p.is_paid === 1 || p.isPago === true);

                if (comanda.status === 'aberta' && (todosPagos || comanda.saldoAberto <= 0.01)) {
                    comanda.status = 'paga';
                }
            });

            setComandasAbertas(todasComandas.filter(c => c.status === 'aberta').sort(sortComandasNumerico));

        } catch (error) {
            console.error('[CarregarComandasAbertas] Erro:', error);
        }
    };

    const _carregarHistorico = async (statusTab) => {
        if (!user?.companyId) return;
        const diaHoje = getTodayKey();
        const statusSupabase = statusTab === 'pagas' ? 'fechada' : 'cancelada';

        try {
            const { data: comandas, error } = await supabase
                .from('comandas')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('date_key', diaHoje)
                .eq('status', statusSupabase);

            if (error) throw error;

            const newComandas = (comandas || []).map(doc => {
                // Extrair hora do created_at
                const createdDate = doc.created_at ? new Date(doc.created_at) : null;
                const horarioCriacao = createdDate ? createdDate.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : '';

                return {
                    comandaNumber: doc.comanda_number,
                    ...doc,
                    // Informações básicas
                    cliente: doc.cliente || 'Não informado',
                    mesa: doc.mesa || '',
                    horarioCriacao: horarioCriacao,
                    
                    // Totais
                    totalConsumido: doc.total_consumed || 0,
                    totalPago: doc.total_paid || 0,
                    saldoAberto: doc.open_balance || 0,
                    
                    // Informações do garçom
                    abertaPorNome: doc.opened_by_name || null,
                    criadoPorNome: doc.opened_by_name || null,
                    
                    // Informações de pagamento
                    pagamentosResumo: doc.pagamentos_resumo || null,
                    ultimoPagamentoPor: doc.ultimo_pagamento_por || null,
                    ultimoPagamentoForma: doc.ultimo_pagamento_forma || null,
                    ultimoPagamentoEm: doc.ultimo_pagamento_em || null,
                    
                    // Informações de cancelamento (se aplicável)
                    canceladaPorNome: doc.canceled_by_name || null,
                    motivoCancelamento: doc.motivo_cancelamento || null,
                    canceladaEm: doc.canceled_at || null,
                    
                    status: statusTab === 'pagas' ? 'paga' : statusSupabase
                };
            }).sort(sortComandasNumerico);

            if (statusTab === 'pagas') {
                setComandasPagas(newComandas);
                setHasMore(prev => ({ ...prev, pagas: false }));
            } else {
                setComandasCanceladas(newComandas);
                setHasMore(prev => ({ ...prev, canceladas: false }));
            }

        } catch (error) {
            console.error('[CarregarHistorico] Erro:', error);
        }
    };

    // Carregar dados ao trocar de aba
    useEffect(() => {
        carregarComandas(true);
    }, [activeTab]);

    // Listeners em Tempo Real (Apenas para 'abertas')
    useEffect(() => {
        if (activeTab !== 'abertas' || !user?.companyId) return;

        const dateKey = todayKey();

        // Subscribe to orders changes
        const ordersChannel = supabase
            .channel(`orders-${user.companyId}-${dateKey}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `company_id=eq.${user.companyId}`
                },
                (payload) => {
                    console.log('[useComandaManagement] 🔄 Realtime update for Orders:', payload.eventType);
                    carregarComandas(true);
                }
            )
            .subscribe();

        // Subscribe to comandas changes
        const comandasChannel = supabase
            .channel(`comandas-${user.companyId}-${dateKey}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comandas',
                    filter: `company_id=eq.${user.companyId}`
                },
                (payload) => {
                    console.log('[useComandaManagement] 🔄 Realtime update for Comandas:', payload.eventType);
                    carregarComandas(true);
                }
            )
            .subscribe();

        return () => {
            ordersChannel.unsubscribe();
            comandasChannel.unsubscribe();
        };
    }, [activeTab, user?.companyId]);

    const selectComanda = async (comanda) => {
        setSelectedComanda(comanda);

        if (comanda && (!comanda.pedidos || comanda.pedidos.length === 0)) {
            try {
                const { data: pedidos, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('company_id', user.companyId)
                    .eq('comanda_number', String(comanda.comandaNumber));

                if (error) throw error;

                if (pedidos && pedidos.length > 0) {
                    // Map Supabase fields to expected format
                    const mappedPedidos = pedidos.map(p => ({
                        ...p,
                        totalPrice: p.total_amount || 0, // Map total_amount to totalPrice
                        isPago: p.is_paid || false, // Map is_paid to isPago
                    }));
                    
                    setSelectedComanda(prev => {
                        if (prev && prev.comandaNumber === comanda.comandaNumber) {
                            return { ...prev, pedidos: mappedPedidos };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error("Erro ao carregar detalhes da comanda:", e);
            }
        }
    };

    return {
        activeTab,
        setActiveTab,
        comandasAbertas,
        comandasPagas,
        comandasCanceladas,
        selectedComanda,
        setSelectedComanda: selectComanda,
        isRefreshing,
        isLoadingMore,
        hasMore,
        carregarComandas,
        onLoadMore: () => carregarComandas(false, true),
        cardapioDin
    };
}
