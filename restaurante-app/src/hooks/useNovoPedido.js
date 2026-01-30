import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { useOrders } from '../context/OrderContext.firestore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getNextComandaNumber, formatComandaNumber } from '../services/ComandaService';
import { getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from '../utils/firestoreUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { confirmLogout } from '../utils/appUtils';
import InventoryService from '../services/InventoryService';

const CARDAPIO_CACHE_KEY = '@cardapio_cache';
const CARDAPIO_CACHE_EXPIRY = 5 * 60 * 1000;

export const fixDecimal = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function useNovoPedido() {
    const { addOrder, editOrder } = useOrders();
    const { user, logout } = useAuth();
    const { showToast } = useToast();

    const [comandaNumber, setComandaNumber] = useState('');
    const [loadingComanda, setLoadingComanda] = useState(false);
    const [clientName, setClientName] = useState('');
    const [mesa, setMesa] = useState(''); // ✅ Novo estado para Mesa
    const [observations, setObservations] = useState('');
    const [produtos, setProdutos] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cardapio, setCardapio] = useState({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [] });
    const [temperosCaldos, setTemperosCaldos] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [temperosComidas, setTemperosComidas] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [variacoesEspetinho, setVariacoesEspetinho] = useState(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);
    const [pizzaConfig, setPizzaConfig] = useState(null);
    const [customPrices, setCustomPrices] = useState({}); // { 'Pizza Grande (Calabresa)': 40.00 }
    const [loadingCardapio, setLoadingCardapio] = useState(true);

    const cardapioLoadedRef = useRef(false);
    const lastLoadTimeRef = useRef(0);

    const carregarCardapioFirestore = async (isBackground = false) => {
        try {
            if (!isBackground) setLoadingCardapio(true);

            if (!user?.companyId) {
                console.warn('⚠️ Usuário sem empresa vinculada');
                setCardapio({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [] });
                setLoadingCardapio(false);
                return;
            }

            // OTIMIZAÇÃO 1: Filtrar no Firestore (Server-Side)
            const q = query(
                getCompanyCollection(user.companyId, 'cardapio'),
                where('active', '==', true)
            );

            const snapshot = await getDocs(q);

            // OTIMIZAÇÃO 2: Processamento em único loop (Single Pass)
            const buckets = {
                caldo: [],
                comida: [],
                bebida: [],
                porcao: [],
                outro: [],
                'espetinho-simples': [],
                'espetinho-especial': [],
                'pizza': []
            };

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const item = {
                    id: doc.id,
                    name: data.name,
                    price: data.price,
                    prices: data.prices, // Map de preços para Pizza
                    category: data.category || 'outro',
                    inventoryItems: data.inventoryItems
                };

                // Normalizar categoria para o bucket correto
                let cat = item.category;
                if (cat === 'outros') cat = 'outro';

                if (buckets[cat]) {
                    buckets[cat].push(item);
                } else {
                    // Fallback para 'outro' se categoria desconhecida
                    buckets.outro.push(item);
                }
            });

            // Ordenação local (Client-Side) - Mais rápido que criar índices compostos por enquanto
            const sortFn = (a, b) => a.name.localeCompare(b.name);

            const novoCardapio = {
                caldos: buckets.caldo.sort(sortFn),
                comidas: buckets.comida.sort(sortFn),
                bebidas: buckets.bebida.sort(sortFn),
                porcoes: buckets.porcao.sort(sortFn),
                outros: buckets.outro.sort(sortFn),
                espetinhosSimples: buckets['espetinho-simples'].sort(sortFn),
                espetinhosEspeciais: buckets['espetinho-especial'].sort(sortFn),
                pizzas: buckets['pizza'].sort(sortFn)
            };

            // Fetch configuration (temperos)
            try {
                const configRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    if (data.temperosCaldos) setTemperosCaldos(data.temperosCaldos);
                    if (data.temperosComidas) setTemperosComidas(data.temperosComidas);
                    if (data.variacoesEspetinho) setVariacoesEspetinho(data.variacoesEspetinho);

                    if (data.pizzaConfig) {
                        setPizzaConfig(data.pizzaConfig);
                    } else {
                        setPizzaConfig({
                            sizes: [
                                { name: 'Fatia', maxFlavors: 1 },
                                { name: 'Broto', maxFlavors: 2 },
                                { name: 'Média', maxFlavors: 3 },
                                { name: 'Grande', maxFlavors: 4 }
                            ],
                            pricingMode: 'HIGHER'
                        });
                    }

                    // Legacy/Fallback: if only 'temperos' exists
                    if (!data.temperosCaldos && !data.temperosComidas && data.temperos) {
                        setTemperosCaldos(data.temperos);
                        setTemperosComidas(data.temperos);
                    }
                }
            } catch (e) {
                console.warn('Erro ao carregar temperos, usando padrão:', e);
            }

            setCardapio(novoCardapio);
            cardapioLoadedRef.current = true;
            lastLoadTimeRef.current = Date.now();

            await AsyncStorage.setItem(CARDAPIO_CACHE_KEY, JSON.stringify({
                data: novoCardapio,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio do Firestore:', error);
            if (!isBackground) Alert.alert('Erro', 'Não foi possível carregar o cardápio');
        } finally {
            if (!isBackground) setLoadingCardapio(false);
        }
    };

    const carregarCardapio = useCallback(async () => {
        try {
            // OTIMIZAÇÃO 3: Usar cache primeiro (Stale-While-Revalidate)
            setLoadingCardapio(true);

            const cached = await AsyncStorage.getItem(CARDAPIO_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);

                // Se cache for recente (< 30 min), usar e não bloquear
                if (data && (Date.now() - timestamp < 30 * 60 * 1000)) {
                    console.log('⚡ Usando cardápio do cache');
                    setCardapio(data);
                    cardapioLoadedRef.current = true;
                    setLoadingCardapio(false); // Libera UI imediatamente

                    // Atualiza em background
                    carregarCardapioFirestore(true);
                    return;
                }
            }

            // Se não tem cache ou é muito velho, carrega normal
            await carregarCardapioFirestore(false);
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio:', error);
            // Fallback
            await carregarCardapioFirestore(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const now = Date.now();
            if (cardapioLoadedRef.current && (now - lastLoadTimeRef.current) < CARDAPIO_CACHE_EXPIRY) {
                // return; // FORCE RELOAD for testing/updates
            }
            carregarCardapio();
        }, [carregarCardapio])
    );


    const updateProduto = useCallback((itemName, delta) => {
        setProdutos(prev => {
            const currentQty = prev[itemName] || 0;
            const newQty = Math.max(0, currentQty + delta);
            if (newQty === 0) {
                const { [itemName]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemName]: newQty };
        });
    }, []);

    const cardapioCombinado = useMemo(() =>
        [
            ...(cardapio.caldos || []),
            ...(cardapio.bebidas || []),
            ...(cardapio.comidas || []),
            ...(cardapio.porcoes || []),
            ...(cardapio.outros || []),
            ...(cardapio.espetinhosSimples || []),
            ...(cardapio.espetinhosSimples || []),
            ...(cardapio.espetinhosEspeciais || []),
            ...(cardapio.pizzas || [])
        ],
        [cardapio]
    );

    // Helper to calculate price for a single item (extracted for reuse)
    const calculateItemPrice = useCallback((itemName, qty = 1) => {
        // 1. Verificar se é preço customizado (Pizza)
        if (customPrices[itemName]) {
            return qty * customPrices[itemName];
        }

        const nomeBase = itemName.replace(/\s*\(.*\)$/, '');

        // 2. Tentar encontrar item exato no cardápio
        const produtoExato = cardapioCombinado.find(p => p.name === nomeBase);

        if (produtoExato) {
            // Se for pizza e tiver map de prices, tentar pegar. Mas aqui geralmente é produto simples.
            // Pizzas montadas cairão no customPrices.
            return qty * produtoExato.price;
        }

        // Logic for Caldos variations (300ml vs 180ml)
        if (itemName.match(/(Caldinho|Caldo|Calde)/i)) {
            if (itemName.match(/180\s*ml/i)) {
                return qty * 10;
            } else if (itemName.match(/300\s*ml/i)) {
                return qty * 15;
            }
        }

        // 3. Fallback: procurar por prefixo
        const produtoPartial = cardapioCombinado.find(p => itemName.startsWith(p.name));
        if (produtoPartial) {
            return qty * produtoPartial.price;
        }

        return 0;
    }, [cardapioCombinado, customPrices]);

    const total = useMemo(() => {
        let totalCalc = 0;
        for (const [name, qty] of Object.entries(produtos)) {
            if (qty > 0) {
                totalCalc += calculateItemPrice(name, qty);
            }
        }
        return fixDecimal(totalCalc);
    }, [produtos, calculateItemPrice]);

    const selectedItems = useMemo(() => {
        const items = [];
        for (const [name, qty] of Object.entries(produtos)) {
            if (qty > 0) {
                const itemPrice = calculateItemPrice(name, 1); // Unit price
                items.push({
                    text: `${qty}x ${name}`,
                    price: itemPrice * qty
                });
            }
        }
        return items;
    }, [produtos, calculateItemPrice]);

    const handleRemoveItem = useCallback((itemText) => {
        // Remover prefixo de quantidade "1x ", "2x " para obter a chave original
        const keyToRemove = itemText.replace(/^\d+x\s*/, '');

        setProdutos(prev => {
            const newProdutos = { ...prev };
            // Verifica se a chave existe antes de deletar para evitar renderizações desnecessárias
            if (newProdutos[keyToRemove]) {
                delete newProdutos[keyToRemove];
            }
            return newProdutos;
        });
    }, []);

    const addPizzaToOrder = useCallback((sizeName, flavors) => {
        if (!flavors || flavors.length === 0) return;

        // 1. Calcular preço
        // Se pricingMode for HIGHER (padrão), pega o maior preço entre os sabores para aquele tamanho
        let finalPrice = 0;
        const prices = flavors.map(f => {
            // f é o objeto produto do cardápio array
            // ele deve ter .prices[sizeName]
            return f.prices ? (f.prices[sizeName] || 0) : 0;
        });

        // Modo padrão: Maior valor
        finalPrice = Math.max(...prices);

        // TODO: Suportar 'AVERAGE' se configurado no futuro

        // 2. Gerar nome
        // Ex: "Pizza Grande (1/2 Calabresa, 1/2 Frango)" ou "Pizza Fatia (Calabresa)"
        const flavorsNames = flavors.map(f => f.name).join(', ');
        const fraction = flavors.length > 1 ? `1/${flavors.length} ` : '';

        // Melhor formatação de nome:
        let flavorsString = "";
        if (flavors.length === 1) {
            flavorsString = flavors[0].name;
        } else {
            flavorsString = flavors.map(f => `1/${flavors.length} ${f.name}`).join(', ');
        }

        const itemName = `Pizza ${sizeName} (${flavorsString})`;

        setCustomPrices(prev => ({ ...prev, [itemName]: finalPrice }));

        setProdutos(prev => {
            const currentQty = prev[itemName] || 0;
            return { ...prev, [itemName]: currentQty + 1 };
        });

        showToast('Pizza adicionada!', 'success');
    }, []);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            showToast('Adicione pelo menos um item ao pedido', 'warning');
            return;
        }

        try {
            setIsSubmitting(true);
            const nextNumber = await getNextComandaNumber();
            const novoNumeroComanda = formatComandaNumber(nextNumber);

            const items = selectedItems.map(item => item.text);

            // OTIMIZAÇÃO: Criar mapa de preços e categorias para evitar busca redundante no Firestore
            const priceMap = {};
            const categoryMap = {}; // ✅ Novo mapa de categorias para filtragem correta
            cardapioCombinado.forEach(item => {
                if (item.name) {
                    const cleanName = item.name.toLowerCase();
                    if (item.price) priceMap[cleanName] = item.price;
                    if (item.category) categoryMap[cleanName] = item.category;
                }
            });

            const createdOrderId = await addOrder(
                clientName.trim() || 'Cliente',
                items,
                observations.trim(),
                novoNumeroComanda,
                user?.uid || '',
                user?.nome || user?.email || 'Garçom',
                parseFloat(total),
                false, // isPago
                mesa, // ✅ Passar mesa
                priceMap, // ✅ Passar mapa de preços cached
                categoryMap // ✅ Passar mapa de categorias
            );

            showToast(`Pedido criado! Comanda ${novoNumeroComanda}`, 'success');

            setComandaNumber('');
            setClientName('');
            setMesa('');
            setObservations('');
            setProdutos({});

            // --- ESTOQUE INTEGRATION ---
            // Processar baixa de estoque em background (sem bloquear UI)
            setTimeout(async () => {
                const stockItemsToDeduct = [];
                for (const [name, qty] of Object.entries(produtos)) {
                    if (qty <= 0) continue;

                    // Tentar encontrar o produto completo (com inventoryItems)
                    const nomeBase = name.replace(/\s*\(.*\)$/, '');
                    let produtoEncontrado = cardapioCombinado.find(p => p.name === nomeBase);

                    // Fallback de prefixo se não achar exato
                    if (!produtoEncontrado) {
                        produtoEncontrado = cardapioCombinado.find(p => name.startsWith(p.name));
                    }

                    if (produtoEncontrado) {
                        // Clonar e ajustar quantidade para o pedido atual
                        // O InventoryService espera objetos que tenham 'inventoryItems' 
                        // e vamos injetar a 'quantidade' do pedido (qty) no nível do item ou tratar lá.
                        // O service atual lê 'item.quantidade' OU '2x Item'.
                        // Vamos passar um objeto estruturado para ser limpo.
                        stockItemsToDeduct.push({
                            ...produtoEncontrado,
                            quantidade: qty // Quantidade pedida
                        });
                    }
                }

                if (stockItemsToDeduct.length > 0) {
                    const result = await InventoryService.deductStock(user.companyId, stockItemsToDeduct);

                    // Se houve custo calculado, atualizar o pedido com o CMV
                    if (result && result.totalCost > 0 && createdOrderId) {
                        console.log(`[useNovoPedido] Atualizando pedido ${createdOrderId} com custo R$ ${result.totalCost}`);
                        // Usar editOrder do Contexto para salvar no Firestore (mesmo em background)
                        editOrder(createdOrderId, { custoTotal: result.totalCost });
                    }
                }
            }, 100);
            // ---------------------------
        } catch (error) {
            console.error('❌ Erro ao criar pedido:', error);
            if (error.message?.includes('Caixa não está aberto')) {
                Alert.alert(
                    '⚠️ Caixa Fechado',
                    'O caixa precisa estar aberto para criar pedidos.\n\nVá em "Caixa" > "Abertura" para abrir o caixa do dia.',
                    [{ text: 'Entendi' }]
                );
            } else {
                showToast(error.message || 'Não foi possível criar o pedido', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = useCallback(() => {
        confirmLogout(logout);
    }, [logout]);

    return {
        user,
        loadingCardapio,
        cardapio,
        produtos,
        clientName,
        setClientName,
        mesa,
        setMesa,
        observations,
        setObservations,
        updateProduto,
        total,
        selectedItems,
        handleRemoveItem,
        handleSubmit,
        isSubmitting,
        handleLogout,
        temperosCaldos,
        temperosComidas,
        variacoesEspetinho,
        pizzaConfig,
        addPizzaToOrder
    };
}
