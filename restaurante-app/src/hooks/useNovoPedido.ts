import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
// @ts-ignore
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
// @ts-ignore
import { getNextComandaNumber, formatComandaNumber } from '../services/ComandaNumberService';
import { getDocs, doc, getDoc, query } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from '../utils/firestoreUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { confirmLogout } from '../utils/appUtils';
// @ts-ignore
import InventoryService from '../services/InventoryService';
import { Product, Cardapio, PizzaConfig, PizzaSize, Ingredient } from '../types';

const CARDAPIO_CACHE_KEY = '@cardapio_cache';
const CARDAPIO_CACHE_EXPIRY = 5 * 60 * 1000;

export const fixDecimal = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface UseNovoPedidoReturn {
    user: any;
    loadingCardapio: boolean;
    cardapio: Cardapio;
    produtos: Record<string, number>;
    clientName: string;
    setClientName: (name: string) => void;
    mesa: string;
    setMesa: (mesa: string) => void;
    observations: string;
    setObservations: (obs: string) => void;
    updateProduto: (itemName: string, delta: number) => void;
    total: number;
    selectedItems: { text: string; price: number }[];
    handleRemoveItem: (itemText: string) => void;
    handleSubmit: () => Promise<void>;
    isSubmitting: boolean;
    handleLogout: () => void;
    temperosCaldos: string[];
    temperosComidas: string[];
    variacoesEspetinho: string[];
    pizzaConfig: PizzaConfig | null;
    addPizzaToOrder: (sizeName: string, flavors: Product[]) => void;
}

export function useNovoPedido(): UseNovoPedidoReturn {
    const { addOrder, editOrder } = useOrders();
    const { user, logout } = useAuth();
    const { showToast } = useToast();

    // Removed unused loadingComanda state
    const [clientName, setClientName] = useState('');
    const [mesa, setMesa] = useState(''); // ✅ Novo estado para Mesa
    const [observations, setObservations] = useState('');
    const [produtos, setProdutos] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cardapio, setCardapio] = useState<Cardapio>({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [], espetinhos: [], espetinhosSimples: [], espetinhosEspeciais: [], pizzas: [] });
    const [temperosCaldos, setTemperosCaldos] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [temperosComidas, setTemperosComidas] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [variacoesEspetinho, setVariacoesEspetinho] = useState(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);
    const [pizzaConfig, setPizzaConfig] = useState<PizzaConfig | null>(null);
    const [customPrices, setCustomPrices] = useState<Record<string, number>>({}); // { 'Pizza Grande (Calabresa)': 40.00 }
    const [loadingCardapio, setLoadingCardapio] = useState(true);

    const cardapioLoadedRef = useRef(false);
    const lastLoadTimeRef = useRef(0);

    const carregarCardapioFirestore = async (isBackground = false) => {
        try {
            if (!isBackground) setLoadingCardapio(true);

            if (!user?.companyId) {
                console.warn('⚠️ Usuário sem empresa vinculada');
                setCardapio({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [], espetinhos: [], espetinhosSimples: [], espetinhosEspeciais: [], pizzas: [] });
                setLoadingCardapio(false);
                return;
            }

            // OTIMIZAÇÃO 1: Filtrar no Firestore (Server-Side) - REMOVIDO para evitar problemas de cache
            // Buscamos tudo e filtramos localmente para garantir consistência
            const q = query(
                getCompanyCollection(user.companyId, 'cardapio')
            );

            const snapshot = await getDocs(q);

            // OTIMIZAÇÃO 2: Processamento em único loop (Single Pass)
            const buckets: Record<string, Product[]> = {
                caldo: [],
                comida: [],
                bebida: [],
                porcao: [],
                outro: [],
                'espetinho-simples': [],
                'espetinho-especial': [],
                'pizza': []
            };

            let totalItems = 0;
            let keptItems = 0;

            snapshot.docs.forEach(doc => {
                totalItems++;
                const data = doc.data();
                
                // CLIENT-SIDE FILTER - ROBUST
                // Tratar 'false' string ou boolean
                const isActive = data.active !== false && data.active !== 'false';
                
                if (!isActive) {
                    console.log(`🚫 Item ignorado (inativo): ${data.name} [ID: ${doc.id}]`);
                    return;
                }

                keptItems++;
                console.log(`✅ Item mantido: ${data.name} [Category: ${data.category}] [Active: ${data.active}]`);

                const item: Product = {
                  id: doc.id,
                  name: data.name,
                  category: data.category || 'outro',
                  price: data.price,
                  prices: data.prices, // Map de preços para Pizza
                  inventoryItems: data.inventoryItems,
                  active: data.active,
                  createdAt: data.createdAt,
                  ...data // Spread other fields
                };

                // Normalizar categoria para o bucket correto
                let cat = item.category;
                if (cat === 'outros') cat = 'outro';

                if (buckets[cat]) {
                    buckets[cat].push(item);
                } else {
                    // Fallback para 'outro' se categoria desconhecida
                    if (!buckets.outro) buckets.outro = [];
                    buckets.outro.push(item);
                }
            });

            console.log(`📊 [DEBUG CARDAPIO] Total Encontrado: ${totalItems} | Mantidos: ${keptItems}`);
            console.log('📦 [DEBUG BUCKETS]', {
                caldos: buckets.caldo.length,
                espetinhosSimples: buckets['espetinho-simples'].length,
                espetinhosEspeciais: buckets['espetinho-especial'].length,
                comidas: buckets.comida.length,
                pizzas: buckets.pizza.length
            });

            // Ordenação local (Client-Side) - Mais rápido que criar índices compostos por enquanto
            const sortFn = (a: Product, b: Product) => a.name.localeCompare(b.name);

            const novoCardapio: Cardapio = {
                caldos: (buckets.caldo || []).sort(sortFn),
                comidas: (buckets.comida || []).sort(sortFn),
                bebidas: (buckets.bebida || []).sort(sortFn),
                porcoes: (buckets.porcao || []).sort(sortFn),
                outros: (buckets.outro || []).sort(sortFn),
                espetinhos: [], // Adicionado para cumprir interface
                espetinhosSimples: (buckets['espetinho-simples'] || []).sort(sortFn),
                espetinhosEspeciais: (buckets['espetinho-especial'] || []).sort(sortFn),
                pizzas: (buckets['pizza'] || []).sort(sortFn)
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
                        // FILTER and SORT sizes
                        let processedSizes: PizzaSize[] = data.pizzaConfig.sizes || [];

                        // 1. Filter active
                        processedSizes = processedSizes.filter(s => s.active !== false);

                        // 2. Sort
                        processedSizes.sort((a, b) => {
                            const order = ['Fatia', 'Broto', 'Média', 'Grande'];
                            const idxA = order.indexOf(a.name);
                            const idxB = order.indexOf(b.name);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return a.name.localeCompare(b.name);
                        });

                        setPizzaConfig({ ...data.pizzaConfig, sizes: processedSizes });
                    } else {
                        setPizzaConfig({
                            sizes: [
                                { name: 'Fatia', maxFlavors: 1 },
                                { name: 'Broto', maxFlavors: 1 },
                                { name: 'Média', maxFlavors: 2 },
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
            
            // CACHE DISABLED FOR DEBUGGING/FIXING UPDATE ISSUE
            /*
            const cached = await AsyncStorage.getItem(CARDAPIO_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);

                // Se cache for recente (usar constante), usar e não bloquear
                if (data && (Date.now() - timestamp < CARDAPIO_CACHE_EXPIRY)) {
                    console.log('⚡ Usando cardápio do cache');
                    setCardapio(data);
                    cardapioLoadedRef.current = true;
                    setLoadingCardapio(false); // Libera UI imediatamente

                    // Atualiza em background
                    carregarCardapioFirestore(true);
                    return;
                }
            }
            */

            // Se não tem cache ou é muito velho, carrega normal
            await carregarCardapioFirestore(false);
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio:', error);
            // Fallback
            await carregarCardapioFirestore(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            const now = Date.now();
            if (cardapioLoadedRef.current && (now - lastLoadTimeRef.current) < CARDAPIO_CACHE_EXPIRY) {
                // return; // FORCE RELOAD for testing/updates
            }
            carregarCardapio();
        }, [carregarCardapio])
    );


    const updateProduto = useCallback((itemName: string, delta: number) => {
        setProdutos(prev => {
            const currentQty = prev[itemName] || 0;
            const newQty = Math.max(0, currentQty + delta);
            if (newQty === 0) {
                const newObj = { ...prev };
                delete newObj[itemName];
                return newObj;
            }
            return { ...prev, [itemName]: newQty };
        });
    }, []);

    const cardapioCombinado = useMemo<Product[]>(() =>
        [
            ...(cardapio.caldos || []),
            ...(cardapio.bebidas || []),
            ...(cardapio.comidas || []),
            ...(cardapio.porcoes || []),
            ...(cardapio.outros || []),
            ...(cardapio.espetinhosSimples || []),
            ...(cardapio.espetinhosSimples || []), // Duplicate in original? JS version had strict duplication? Checked, yes line 240/239 in original JS
            ...(cardapio.espetinhosEspeciais || []),
            ...(cardapio.pizzas || [])
        ],
        [cardapio]
    );

    // Helper to calculate price for a single item (extracted for reuse)
    const calculateItemPrice = useCallback((itemName: string, qty: number = 1) => {
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
            return qty * (produtoExato.price || 0);
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
            return qty * (produtoPartial.price || 0);
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
        const items: { text: string; price: number }[] = [];
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

    const handleRemoveItem = useCallback((itemText: string) => {
        Alert.alert(
            'Remover Item',
            `Deseja remover "${itemText}" do pedido?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        // Remover prefixo de quantidade "1x ", "2x " para obter a chave original
                        const keyToRemove = itemText.replace(/^\d+x\s*/, '');

                        setProdutos(prev => {
                            const newProdutos = { ...prev };
                            if (newProdutos[keyToRemove]) {
                                delete newProdutos[keyToRemove];
                            }
                            return newProdutos;
                        });
                    }
                }
            ]
        );
    }, []);

    const addPizzaToOrder = useCallback((sizeName: string, flavors: Product[]) => {
        if (!flavors || flavors.length === 0) return;

        // 1. Calcular preço
        // Se pricingMode for HIGHER (padrão), pega o maior preço entre os sabores para aquele tamanho
        let finalPrice = 0;
        const prices = flavors.map(f => {
            // f é o objeto produto do cardápio array
            // ele deve ter .prices[sizeName]
            const priceValue = f.prices ? (f.prices[sizeName] || 0) : 0;

            // 🔒 CORREÇÃO: Converter string com vírgula para número
            if (typeof priceValue === 'string') {
                // Substituir vírgula por ponto e converter para número
                // @ts-ignore
                return parseFloat(priceValue.replace(',', '.')) || 0;
            }
            return typeof priceValue === 'number' ? priceValue : 0;
        });

        console.log('🍕 [addPizzaToOrder] Preços dos sabores:', prices);

        // Modo padrão: Maior valor
        finalPrice = Math.max(...prices);

        console.log('🍕 [addPizzaToOrder] Preço final calculado:', finalPrice);

        // Validar que não é NaN
        if (isNaN(finalPrice) || finalPrice <= 0) {
            console.error('❌ [addPizzaToOrder] Preço inválido!', { sizeName, flavors, prices, finalPrice });
            showToast('Erro ao calcular preço da pizza', 'error');
            return;
        }

        // TODO: Suportar 'AVERAGE' se configurado no futuro

        // 2. Gerar nome

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
    }, [showToast]);

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
            const priceMap: Record<string, number> = {};
            const categoryMap: Record<string, string> = {}; 

            // Populando com base nos itens SELECIONADOS (que já têm o preço total calculado corretamente)
            selectedItems.forEach(item => {
                // item.text é "2x Chopp 400 ML"
                // item.price é o preço TOTAL (ex: 24.00)
                priceMap[item.text] = item.price;

                // Tentar obter categoria do cardápio combinado
                const nomeBase = item.text.replace(/^\d+x\s*/, '').replace(/\s*\(.*\)$/, ''); // "Chopp 400 ML"
                const produtoOriginal = cardapioCombinado.find(p => p.name === nomeBase || item.text.includes(p.name));
                if (produtoOriginal && produtoOriginal.category) {
                    categoryMap[item.text.toLowerCase()] = produtoOriginal.category;
                    // Também mapear o nome limpo para garantir
                    categoryMap[nomeBase.toLowerCase()] = produtoOriginal.category;
                }
            });

            // Fallback: adicionar itens do cardápio base também (Unitários) para segurança
             cardapioCombinado.forEach(item => {
                if (item.name) {
                    const cleanName = item.name.toLowerCase();
                    if (item.price) priceMap[cleanName] = item.price;
                    if (item.category) categoryMap[cleanName] = item.category;
                }
            });

            // ✅ CRÍTICO: Incluir preços customizados (Pizzas montadas) no priceMap
            // Isso garante que o OrderContext encontre o preço exato para "Pizza Grande (Sabor...)"
            console.log('🍕 [NovoPedido] Adicionando customPrices ao priceMap:', customPrices);
            Object.entries(customPrices).forEach(([name, price]) => {
                const lowerName = name.toLowerCase();
                // Custom prices geralmente são unitários no state, mas se for 1x ok. 
                // Se tiver 2x Pizza, o selectedItems loop acima já deve ter pego o total.
                // Mas vamos garantir que o nome base esteja lá.
                priceMap[lowerName] = price; 
                categoryMap[lowerName] = 'pizza';
            });

            console.log('📦 [NovoPedido] Items a serem enviados:', items);
            console.log('💰 [NovoPedido] Total calculado:', total);
            console.log('🗺️ [NovoPedido] PriceMap final (primeiras 20 chaves):', Object.keys(priceMap).slice(0, 20));

            const createdOrderId = await addOrder(
                clientName.trim() || 'Cliente',
                items,
                observations.trim(),
                novoNumeroComanda,
                user?.uid || '',
                user?.nome || user?.email || 'Garçom',
                parseFloat(total.toString()),
                false, // isPago
                mesa, // ✅ Passar mesa
                priceMap, // ✅ Passar mapa de preços cached
                categoryMap // ✅ Passar mapa de categorias
            );

            // 🔒 VALIDAÇÃO: Alertar se o pedido foi criado com total zerado
            if (parseFloat(total.toString()) === 0) {
                console.error('⚠️ [NovoPedido] PEDIDO CRIADO COM TOTAL ZERADO!', {
                    items,
                    produtos,
                    customPrices,
                    priceMap
                });
                Alert.alert(
                    'Atenção',
                    'O pedido foi criado mas o valor total está R$ 0,00. Verifique se os preços dos produtos estão configurados corretamente no cardápio.',
                    [{ text: 'OK' }]
                );
            }

            showToast(`Pedido criado! Comanda ${novoNumeroComanda}`, 'success');

            setClientName('');
            setMesa('');
            setObservations('');
            setProdutos({});

            // --- ESTOQUE INTEGRATION ---
            // Processar baixa de estoque em background (sem bloquear UI)
            setTimeout(async () => {
                const stockItemsToDeduct: any[] = [];
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
        } catch (error: any) {
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
