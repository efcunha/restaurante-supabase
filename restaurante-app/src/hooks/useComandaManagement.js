
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot, limit, startAfter, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getTodayKey } from '../services/FirebaseOptimizations';
import { normalizeComandaNumber } from '../services/OrderFirestoreService';
import { calcularTotalPedido, fixDecimal } from '../utils/orderCalculator';
import { Alert } from 'react-native';

export function useComandaManagement() {
    const [activeTab, setActiveTab] = useState('abertas');
    const [comandasAbertas, setComandasAbertas] = useState([]);
    const [comandasPagas, setComandasPagas] = useState([]);
    const [comandasCanceladas, setComandasCanceladas] = useState([]);
    const [selectedComanda, setSelectedComanda] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastDocs, setLastDocs] = useState({ pagas: null, canceladas: null });
    const [hasMore, setHasMore] = useState({ pagas: true, canceladas: true });
    
    const PAGE_SIZE = 20;
    const reloadTimeout = useRef(null);

    const todayKey = getTodayKey;

    const carregarComandas = useCallback(async (forcarBuscaFirestore = false, loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            if (activeTab === 'abertas') {
                // Real-time or full fetch for open orders
                await _carregarComandasAbertas(forcarBuscaFirestore);
            } else {
                // Paginated fetch for history
                await _carregarHistorico(activeTab, loadMore);
            }
        } catch (error) {
            console.error('[CarregarComandas] ❌ Erro:', error);
        } finally {
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [activeTab, lastDocs]);

    const _carregarComandasAbertas = async (forcarBuscaFirestore = false) => {
        // ... (reuse existing logic for Abertas but filter query)
        // For simplicity reusing the "Load All" logic but filtering memory-side or optimizing query
        // Since "Abertas" shouldn't be huge, fetching all open orders is safer for consistency.
        // We will stick to the robust logic for Abertas:
        await _carregarComandasInterno(forcarBuscaFirestore, true); 
    };

    const _carregarHistorico = async (statusTab, loadMore) => {
        const { robustFirestoreQuery } = await import('../utils/errorHandling');
        const diaHoje = getTodayKey();
        
        if (!loadMore) {
             // Reset list if refreshing
             if (statusTab === 'pagas') setComandasPagas([]);
             if (statusTab === 'canceladas') setComandasCanceladas([]);
        }

        const statusFirestore = statusTab === 'pagas' ? 'fechada' : 'cancelada';
        const lastDoc = statusTab === 'pagas' ? lastDocs.pagas : lastDocs.canceladas;

        if (loadMore && !lastDoc) return; // No more docs

        const constraints = [
            where('dateKey', '==', diaHoje),
            where('status', '==', statusFirestore), 
            orderBy('comandaNumber', 'asc'), // Consistent ordering
            limit(PAGE_SIZE)
        ];

        if (loadMore && lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        try {
            const q = query(collection(db, 'comandas'), ...constraints);
            const snapshot = await getDocs(q);
            
            const newComandas = snapshot.docs.map(doc => ({
                comandaNumber: doc.data().comandaNumber || doc.data().numeroComanda,
                ...doc.data(),
                // Ensure required props for UI
                totalConsumido: doc.data().totalConsumido || 0,
                status: statusTab === 'pagas' ? 'paga' : statusFirestore // Map 'fechada' back to 'paga' for UI
            }));

            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            
            if (statusTab === 'pagas') {
                setComandasPagas(prev => loadMore ? [...prev, ...newComandas] : newComandas);
                setLastDocs(prev => ({ ...prev, pagas: lastVisible }));
                setHasMore(prev => ({ ...prev, pagas: snapshot.docs.length === PAGE_SIZE }));
            } else {
                setComandasCanceladas(prev => loadMore ? [...prev, ...newComandas] : newComandas);
                setLastDocs(prev => ({ ...prev, canceladas: lastVisible }));
                setHasMore(prev => ({ ...prev, canceladas: snapshot.docs.length === PAGE_SIZE }));
            }

        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // Original logic kept for 'abertas'
    const _carregarComandasInterno = async (forcarBuscaFirestore = false, onlyOpen = false) => {
        // Lazy import utils
        const { robustFirestoreQuery } = await import('../utils/errorHandling');

        const comandasMap = {};
        const diaHoje = todayKey();

        // ONLY fetch PEDIDOS if looking for Open orders (to calculate totals/items real-time)
        // If we are in history mode, we should NOT strictly need this if we used _carregarHistorico
        
        // ... (Remaining logic is mostly same but we only setComandasAbertas at the end)
        
        let pedidosParaProcessar = [];

        try {
            pedidosParaProcessar = await robustFirestoreQuery(
                async () => {
                   // Optimization: Only fetch non-paid pedidos? 
                   // Hard to filter by status in 'pedidos' directly without composite index sometimes.
                   // Let's keep fetching all pedidos for 'abertas' consistency for now.
                    const qPedidos = query(
                        collection(db, 'pedidos'),
                        where('dateKey', '==', diaHoje)
                    );
                    const snapPedidos = await getDocs(qPedidos);
                    const pedidos = [];
                    snapPedidos.forEach(doc => {
                        pedidos.push({ id: doc.id, ...doc.data() });
                    });
                    return pedidos;
                },
                {
                     fallbackFn: async () => {
                        const qFallback = query(collection(db, 'pedidos'));
                        const snapFallback = await getDocs(qFallback);
                        return snapFallback.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.dateKey === diaHoje);
                     },
                    maxRetries: 2
                }
            );
        } catch (error) {
            console.error('[CarregarComandas] Failed to load pedidos:', error);
            return;
        }

        // Group orders
        pedidosParaProcessar.forEach((order) => {
            // ... (Same grouping logic)
            // Filter: If we only care about Abertas, we can discard fully paid orders immediately?
            // Risk: Partial payments.
            
            const rawComandaNumber = order.numeroComanda || order.comandaNumber;
            const comandaNum = normalizeComandaNumber(rawComandaNumber);
            if (!comandaNum) return;

             if (!comandasMap[comandaNum]) {
                comandasMap[comandaNum] = {
                    comandaNumber: comandaNum,
                    pedidos: [],
                    pedidosPagos: [],
                    pedidosAbertos: [],
                    totalConsumido: 0,
                    totalPago: 0,
                    saldoAberto: 0,
                    status: 'aberta',
                    cliente: order.client || 'Não informado',
                    ultimaAtualizacao: order.createdAt,
                    criadoPorNome: order.createdByName || null,
                    horarioCriacao: order.horarioCriacao || null,
                    entregues: [],
                    recebidoPor: [],
                    recebedores: [],
                    pagamentosResumo: null // Initialize
                };
            }
             if (order.entreguePorNome && !comandasMap[comandaNum].entregues.includes(order.entreguePorNome)) {
                comandasMap[comandaNum].entregues.push(order.entreguePorNome);
            }
            comandasMap[comandaNum].pedidos.push(order);
            const isPedidoPago = order.isPago === true || order.isPago === 'true' || order.isPago === 1;
            if (isPedidoPago) {
                comandasMap[comandaNum].pedidosPagos.push(order);
            } else {
                comandasMap[comandaNum].pedidosAbertos.push(order);
            }
            if (new Date(order.createdAt) > new Date(comandasMap[comandaNum].ultimaAtualizacao)) {
                comandasMap[comandaNum].ultimaAtualizacao = order.createdAt;
                comandasMap[comandaNum].cliente = order.client || comandasMap[comandaNum].cliente;
            }
        });

        // Get Comandas Metadata (Totals, Status 'fechada')
         try {
            await robustFirestoreQuery(
                async () => {
                    const qComandas = query(collection(db, 'comandas'), where('dateKey', '==', diaHoje));
                    const snapComandas = await getDocs(qComandas);
                    snapComandas.forEach(docSnap => {
                        const data = docSnap.data();
                        const comandaNum = normalizeComandaNumber(data.numeroComanda || data.comandaNumber);
                        if (!comandaNum) return;

                        if (comandasMap[comandaNum]) {
                             const c = comandasMap[comandaNum];
                             c.pagamentosResumo = data.pagamentosResumo || c.pagamentosResumo;
                             c.ultimoPagamentoPor = data.ultimoPagamentoPor || c.ultimoPagamentoPor;
                             c.ultimoPagamentoForma = data.ultimoPagamentoForma || c.ultimoPagamentoForma;
                             c.ultimoPagamentoEm = data.ultimoPagamentoEm || c.ultimoPagamentoEm;
                             
                             if (data.status === 'fechada') c.status = 'paga';
                             else if (data.status === 'cancelada') c.status = 'cancelada';
                        }
                         // If comanda exists in Firestore but has no orders in 'pedidos', we might miss it if we only iterate 'pedidos'.
                         // BUT 'abertas' usually have active pedidos.
                    });
                    return true;
                }, { maxRetries: 2 }
            );
         } catch(e) { console.error(e); }

        // Final Tally and Filter for Abertas
        const todasComandas = Object.values(comandasMap);
        
        // Recalculate totals...
         todasComandas.forEach(comanda => {
            let totalConsumidoReal = 0;
            let totalPagoReal = 0;
            if (comanda.pedidos) {
                comanda.pedidos.forEach(pedido => {
                    const totalPedidoRecalculado = calcularTotalPedido(pedido);
                    const valor = totalPedidoRecalculado > 0 ? totalPedidoRecalculado : (Number(pedido.totalPrice)||0);
                    totalConsumidoReal += valor;
                    if (pedido.isPago === true || pedido.isPago === 'true' || pedido.isPago === 1) {
                        totalPagoReal += valor;
                    }
                });
            }
             comanda.totalConsumido = fixDecimal(totalConsumidoReal);
             comanda.totalPago = fixDecimal(totalPagoReal);
             comanda.saldoAberto = fixDecimal(Math.max(0, comanda.totalConsumido - comanda.totalPago));
             
             // Auto-close check
              const todosPagos = comanda.pedidos && comanda.pedidos.length > 0 && comanda.pedidos.every(p => (
                p.isPago === true || p.isPago === 'true' || p.isPago === 1
            ));

            // Only update status based on items if it is currently 'aberta'.
            // If Firestore says it's 'paga' (fechada) or 'cancelada', we trust Firestore.
            if (comanda.status === 'aberta') {
                if (todosPagos) comanda.status = 'paga';
            } else if (comanda.status === 'paga' && !todosPagos) {
                 // Edge case: Comanda is marked 'fechada' in DB, but has unpaid items?
                 // Usually we should trust the DB status 'fechada'.
                 // Keeping it as 'paga' prevents it from jumping back to 'aberta'.
            }
         });

         // Sort
        const sortComandas = (a, b) => {
            const numA = a.comandaNumber.match(/\d+/);
            const numB = b.comandaNumber.match(/\d+/);
            if (numA && numB) return parseInt(numA[0], 10) - parseInt(numB[0], 10);
            return a.comandaNumber.localeCompare(b.comandaNumber);
        };

        setComandasAbertas(todasComandas.filter(c => c.status === 'aberta').sort(sortComandas));
        // We do NOT set Pagas/Canceladas here if we are only loading open ones.
        // But for safety during transition, let's leave them if we are in 'abertas' tab?
        // Actually the Requirement is to separate them.
    };

    // 1. Carregar dados ao trocar de aba
    useEffect(() => {
        carregarComandas(true);
    }, [activeTab]); 

    // 2. Listeners em Tempo Real (Apenas para 'abertas')
    useEffect(() => {
        if (activeTab !== 'abertas') return;

        const dateKey = todayKey(); 
        const pedidosQuery = query(collection(db, 'pedidos'), where('dateKey', '==', dateKey));
        const comandasQuery = query(collection(db, 'comandas'), where('dateKey', '==', dateKey));

        const unsubPedidos = onSnapshot(pedidosQuery, () => carregarComandas(true));
        const unsubComandas = onSnapshot(comandasQuery, () => carregarComandas(true));

        return () => {
            unsubPedidos();
            unsubComandas();
        };
    }, [activeTab]);

    const selectComanda = async (comanda) => {
        setSelectedComanda(comanda);
        
        // Se estiver em abas de histórico (pagas/canceladas), os pedidos podem não estar carregados
        // Ou se por algum motivo pedidos estiver vazio/undefined
        if (comanda && (!comanda.pedidos || comanda.pedidos.length === 0)) {
            try {
                // Fetch pedidos
                // OBS: Como é histórico, pode ser muitos pedidos.
                // Filtrar apenas pela comanda.
                const q = query(
                    collection(db, 'pedidos'),
                    where('comandaNumber', 'in', [comanda.comandaNumber, Number(comanda.comandaNumber), String(comanda.comandaNumber)])
                    // Nota: Firestore 'in' suporta até 10, aqui é só para garantir tipos string/number
                ); 
                // Simplificando para tipo string que é o padrão normalizado, mas garantindo robustez
                const q2 = query(
                    collection(db, 'pedidos'),
                    where('numeroComanda', '==', String(comanda.comandaNumber))
                );

                // Tentar queries (as vezes salvo como number as vezes string)
                // O ideal é buscar por dataKey também para otimizar, mas histórico pode ser de outro dia?
                // Se o 'comandas' do histórico tem dateKey, usamos.
                
                let constraints = [where('numeroComanda', '==', String(comanda.comandaNumber))];
                if (comanda.dateKey) {
                    constraints.push(where('dateKey', '==', comanda.dateKey));
                }
                
                const qFinal = query(collection(db, 'pedidos'), ...constraints);
                const snap = await getDocs(qFinal);
                
                const pedidos = [];
                snap.forEach(d => pedidos.push({ id: d.id, ...d.data() }));

                if (pedidos.length > 0) {
                    setSelectedComanda(prev => {
                        if (prev && prev.comandaNumber === comanda.comandaNumber) {
                            return { ...prev, pedidos: pedidos };
                        }
                        return prev;
                    });
                } else { 
                    // Fallback: tentar sem dateKey se falhou (compatibilidade legado)
                    if (comanda.dateKey) {
                        const qBackup = query(collection(db, 'pedidos'), where('numeroComanda', '==', String(comanda.comandaNumber)));
                        const snapBackup = await getDocs(qBackup);
                         const pedidosBackup = [];
                        snapBackup.forEach(d => pedidosBackup.push({ id: d.id, ...d.data() }));
                        if (pedidosBackup.length > 0) {
                             setSelectedComanda(prev => {
                                if (prev && prev.comandaNumber === comanda.comandaNumber) {
                                    return { ...prev, pedidos: pedidosBackup };
                                }
                                return prev;
                            });
                        }
                    }
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
        setSelectedComanda: selectComanda, // Use our wrapper
        isRefreshing,
        isLoadingMore,
        hasMore,
        carregarComandas,
        onLoadMore: () => carregarComandas(false, true)
    };
}
