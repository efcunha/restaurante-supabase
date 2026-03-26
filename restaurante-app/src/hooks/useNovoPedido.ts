import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
// @ts-ignore
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
// @ts-ignore
import { getNextComandaNumber, formatComandaNumber } from '../services/ComandaNumberService';
import { supabase } from '../config/SupabaseConfig'; // Switched to Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '../utils/dateUtils';
// @ts-ignore
import { confirmLogout } from '../utils/appUtils';
// @ts-ignore
// @ts-ignore
import InventoryService from '../services/InventoryService';
import { listarFuncionarios } from '../services/FuncionariosService';
import { Product, Cardapio, PizzaConfig, Funcionario } from '../types';
import { getOrCreateMenuCategories, normalizeCategorySlug } from '../utils/menuCategories';

const CARDAPIO_CACHE_KEY = '@cardapio_cache_v2';
const MENU_REFRESH_WINDOW_MS = 30 * 60 * 1000;

export const fixDecimal = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface UseNovoPedidoReturn {
    user: any;
    loadingCardapio: boolean;
    cardapio: Cardapio;
    produtos: Record<string, number>;
    clientName: string;
    setClientName: (name: string) => void;
    tableId: string;
    setTableId: (id: string) => void;
    waiterId: string;
    setWaiterId: (id: string) => void;
    waiters: Funcionario[];
    mesa: string;
    setMesa: (mesa: string) => void;
    observations: string;
    setObservations: (obs: string) => void;
    updateProduto: (itemName: string, delta: number) => void;
    total: number;
    selectedItems: { text: string; price: number; name: string }[];
    handleRemoveItem: (itemText: string) => void;
    handleSubmit: () => Promise<void>;
    isSubmitting: boolean;
    handleLogout: () => void;
    temperosCaldos: string[];
    temperosComidas: string[];
    variacoesEspetinho: string[];
    pizzaSubcategories: string[];
    pizzaConfig: PizzaConfig | null;
    addPizzaToOrder: (sizeName: string, flavors: Product[], selectedBorda?: any, selectedAdicionais?: any[]) => void;
    carregarCardapio: () => Promise<void>;
    refreshCardapio: () => Promise<void>;
    isRefreshingCardapio: boolean;
    extras: any[];
    resetForm: () => void;
}

export function useNovoPedido(): UseNovoPedidoReturn {
    const { addOrder, editOrder } = useOrders();
    const { user, logout } = useAuth();
    const { showToast } = useToast();

    // Removed unused loadingComanda state
    const [clientName, setClientName] = useState('');
    const [mesa, setMesa] = useState(''); // ✅ Novo estado para Mesa
    const [tableId, setTableId] = useState('');
    const [waiterId, setWaiterId] = useState('');
    const [waiters, setWaiters] = useState<Funcionario[]>([]);
    const [observations, setObservations] = useState('');
    const [produtos, setProdutos] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cardapio, setCardapio] = useState<Cardapio>({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [], espetinhos: [], espetinhosSimples: [], espetinhosEspeciais: [], pizzas: [] });
    const [temperosCaldos] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [temperosComidas] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
    const [variacoesEspetinho] = useState(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);
    const [pizzaSubcategories, setPizzaSubcategories] = useState<string[]>([]);
    const [pizzaConfig, setPizzaConfig] = useState<PizzaConfig | null>(null);
    const [customPrices, setCustomPrices] = useState<Record<string, number>>({}); // { 'Pizza Grande (Calabresa)': 40.00 }
    const [loadingCardapio, setLoadingCardapio] = useState(true);
    const [isRefreshingCardapio, setIsRefreshingCardapio] = useState(false);
    const [extras, setExtras] = useState<any[]>([]); // Pizza extras (bordas and adicionais)

    const cardapioLoadedRef = useRef(false);
    const lastLoadTimeRef = useRef(0);

    // Fetch wait staff
    useEffect(() => {
        const fetchWaiters = async () => {
            if (!user?.companyId) return;
            const result = await listarFuncionarios();
            if (result.success && result.funcionarios) {
                setWaiters(result.funcionarios.filter(f => f.ativo));
            }
        };
        fetchWaiters();
    }, [user?.companyId]);

    // Auto-select current user as waiter if they are in the list
    useEffect(() => {
        if (user && waiters.length > 0 && !waiterId) {
            // Find current user in waiters list
            const currentUser = waiters.find(w => w.uid === user.uid || w.id === user.uid || w.email === user.email);
            if (currentUser) {
                setWaiterId(currentUser.id);
            }
        }
    }, [user, waiters, waiterId]);

    const applyCachedCardapio = useCallback((parsedCache: { data: Cardapio; pizzaConfig?: PizzaConfig | null; pizzaSubcategories?: string[]; extras?: any[] }) => {
        setCardapio(parsedCache.data);
        if (parsedCache.pizzaConfig) {
            setPizzaConfig(parsedCache.pizzaConfig);
        }
        if (Array.isArray(parsedCache.pizzaSubcategories)) {
            setPizzaSubcategories(parsedCache.pizzaSubcategories);
        }
        setExtras(parsedCache.extras || []);
        cardapioLoadedRef.current = true;
        lastLoadTimeRef.current = Date.now();
    }, []);

    const carregarCardapioSupabase = useCallback(async ({ showGlobalLoading = true }: { showGlobalLoading?: boolean } = {}) => {
        try {
            if (showGlobalLoading) setLoadingCardapio(true);

            if (!user?.companyId) {
                console.warn('⚠️ Usuário sem empresa vinculada');
                if (showGlobalLoading) {
                    Alert.alert(
                        'Atenção',
                        'Seu usuário não está vinculado a nenhuma empresa/loja.\n\nContate o administrador ou verifique seu cadastro.'
                    );
                }
                setCardapio({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [], espetinhos: [], espetinhosSimples: [], espetinhosEspeciais: [], pizzas: [] });
                setExtras([]);
                setLoadingCardapio(false);
                return;
            }

            console.log('Fetching products from Supabase for company:', user.companyId);

            // Fetch Products, Company Settings, and Pizza Extras in parallel
            const [productsResult, companyResult, extrasResult] = await Promise.all([
                supabase
                    .from('products')
                    .select('*')
                    .eq('company_id', user.companyId),
                supabase
                    .from('companies')
                    .select('settings')
                    .eq('id', user.companyId)
                    .single(),
                supabase
                    .from('pizza_extras')
                    .select('*')
                    .eq('company_id', user.companyId)
                    .eq('active', true)
            ]);

            const { data: productsData, error } = productsResult;
            if (error) throw error;

            const settingsFromCompany = companyResult.data?.settings || {};
            const { categories } = getOrCreateMenuCategories(settingsFromCompany);
            const validCategorySlugs = new Set(categories.map((item) => item.slug));

            console.log('Products fetched:', productsData?.length);

            // Debug: Log pizza products specifically
            const pizzaProducts = productsData?.filter(p => p.category === 'pizza') || [];
            console.log('🍕 Pizza products from database:', pizzaProducts.length);
            pizzaProducts.forEach(p => {
                console.log(`  - ${p.name} (active: ${p.active}, subcategory: ${p.subcategory})`);
            });

            const bucketSlugs = Array.from(new Set([...validCategorySlugs, 'outro']));
            const buckets: Record<string, Product[]> = bucketSlugs.reduce((acc, slug) => {
                acc[slug] = [];
                return acc;
            }, {} as Record<string, Product[]>);

            productsData?.forEach((data: any) => {
                // Client-side Active Filter
                // Check both 'available' (correct DB column) and 'active' (legacy/potential)
                const isActive = data.available !== undefined ? data.available : data.active;

                if (isActive === false) return;

                const item: Product = {
                    ...data,
                    id: data.id,
                    name: data.name,
                    category: data.category || 'outro',
                    price: data.price ? Number(data.price) : 0, // Ensure number
                    prices: data.prices || {}, // Map de preços para Pizza
                    // inventoryItems: data.inventoryItems, // Not yet in SQL schema?
                    active: isActive !== undefined ? isActive : true, // Default to true if missing
                    createdAt: new Date(data.created_at).getTime(),
                    description: data.description,
                    image: data.image_url,
                };

                // Normalizar categoria para o bucket correto
                let cat = normalizeCategorySlug(item.category);
                if (!validCategorySlugs.has(cat)) cat = 'outro';

                if (buckets[cat]) {
                    buckets[cat].push(item);
                } else {
                    // Fallback para 'outro' se categoria desconhecida
                    if (!buckets.outro) buckets.outro = [];
                    buckets.outro.push(item);
                }
            });

            // Debug: Log bucket contents
            console.log('🍕 Pizzas in bucket after processing:', buckets['pizza']?.length || 0);
            buckets['pizza']?.forEach(p => {
                console.log(`  - ${p.name} (subcategory: ${p.subcategory})`);
            });

            // Ordenação local (Client-Side)
            const sortFn = (a: Product, b: Product) => a.name.localeCompare(b.name);

            const sortedBuckets = Object.keys(buckets).reduce((acc, slug) => {
                acc[slug] = (buckets[slug] || []).sort(sortFn);
                return acc;
            }, {} as Record<string, Product[]>);

            const novoCardapio: Cardapio = {
                ...sortedBuckets,
                caldos: sortedBuckets.caldo || [],
                comidas: sortedBuckets.comida || [],
                bebidas: sortedBuckets.bebida || [],
                porcoes: sortedBuckets.porcao || [],
                outros: sortedBuckets.outro || [],
                espetinhos: [],
                espetinhosSimples: sortedBuckets['espetinho-simples'] || [],
                espetinhosEspeciais: sortedBuckets['espetinho-especial'] || [],
                pizzas: sortedBuckets['pizza'] || []
            };

            // Load Pizza Config from company settings (already fetched in parallel)
            const { data: companyData, error: companyError } = companyResult;
            const companySettings = companyData?.settings || {};

            const configuredPizzaSubcategories = Array.isArray(companySettings?.pizzaSubcategories)
                ? companySettings.pizzaSubcategories.filter((item: any) => typeof item === 'string' && item.trim() !== '')
                : [];
            const resolvedPizzaSubcategories = configuredPizzaSubcategories.length > 0
                ? configuredPizzaSubcategories
                : ['Tradicional', 'Especiais', 'Doces'];
            setPizzaSubcategories(resolvedPizzaSubcategories);

            let newPizzaConfig = null;
            if (!companyError && companySettings?.pizzaConfig?.sizes?.length > 0) {
                newPizzaConfig = companySettings.pizzaConfig;
                setPizzaConfig(newPizzaConfig);
            } else {
                // Fallback to defaults if not configured
                newPizzaConfig = {
                    sizes: [
                        { name: 'Fatia', maxFlavors: 1 },
                        { name: 'Broto', maxFlavors: 1 },
                        { name: 'Média', maxFlavors: 2 },
                        { name: 'Grande/Família', maxFlavors: 4 }
                    ],
                    pricingMode: 'HIGHER' as const
                };
                setPizzaConfig(newPizzaConfig);
            }

            const { data: extrasData, error: extrasError } = extrasResult;
            let currentExtras: any[] = [];
            if (!extrasError && extrasData) {
                currentExtras = extrasData.map((e: any) => ({
                    id: e.id,
                    companyId: e.company_id,
                    type: e.type,
                    name: e.name,
                    price: e.price,
                    active: e.active,
                    createdAt: new Date(e.created_at),
                    updatedAt: e.updated_at ? new Date(e.updated_at) : undefined
                }));
                setExtras(currentExtras);
            } else {
                setExtras([]);
            }

            setCardapio(novoCardapio);
            cardapioLoadedRef.current = true;
            lastLoadTimeRef.current = Date.now();

            // Find the latest update time from the fetched products
            const maxUpdatedAt = productsData?.reduce((max: number, p: any) => {
                const pTime = p.updated_at ? new Date(p.updated_at).getTime() : 0;
                return pTime > max ? pTime : max;
            }, 0) || Date.now();

            await AsyncStorage.setItem(CARDAPIO_CACHE_KEY, JSON.stringify({
                data: novoCardapio,
                pizzaConfig: newPizzaConfig, // Cache config too
                pizzaSubcategories: resolvedPizzaSubcategories,
                extras: currentExtras,       // FIX: Use the loaded array instead of the stale state component `extras` variable
                timestamp: Date.now(),       // When we fetched
                lastUpdated: maxUpdatedAt    // The max server timestamp
            }));
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio do Supabase:', error);
            if (showGlobalLoading) Alert.alert('Erro', 'Não foi possível carregar o cardápio');
        } finally {
            if (showGlobalLoading) setLoadingCardapio(false);
        }
    }, [user?.companyId]);

    const checkMenuUpdates = useCallback(async () => {
        try {
            if (!user?.companyId) return true; // Force load if no company

            // 1. Get the latest timestamp from the server (Lite query)
            // Query both products and pizza_extras to check for ANY changes
            const [productsUpdate, extrasUpdate] = await Promise.all([
                supabase
                    .from('products')
                    .select('updated_at')
                    .eq('company_id', user.companyId)
                    .order('updated_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('pizza_extras')
                    .select('updated_at')
                    .eq('company_id', user.companyId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
            ]);

            const lastProductUpdate = productsUpdate.data?.[0]?.updated_at ? new Date(productsUpdate.data[0].updated_at).getTime() : 0;
            const lastExtraUpdate = extrasUpdate.data?.[0]?.updated_at ? new Date(extrasUpdate.data[0].updated_at).getTime() : 0;

            const latestServerUpdate = Math.max(lastProductUpdate, lastExtraUpdate);

            // 2. Get local cache info
            const cached = await AsyncStorage.getItem(CARDAPIO_CACHE_KEY);
            if (!cached) return true; // No cache, load full

            const parsedCache = JSON.parse(cached);
            const localTimestamp = parsedCache.lastUpdated || 0;

            // 🐛 FIX: Se o cache estiver quebrado sem pizzaConfig, forçar recarregamento!
            if (!parsedCache.pizzaConfig || !parsedCache.pizzaConfig.sizes) {
                console.log('🔄 Cache quebrado (pizzaConfig ausente). Forçando recarga...');
                return true;
            }

            // 3. Compare: If server is newer (> 1s diff to be safe), reload
            // Also reload if cache is older than 24h (force refresh just in case)
            const isCacheExpired = (Date.now() - parsedCache.timestamp) > (24 * 60 * 60 * 1000);

            if (latestServerUpdate > localTimestamp || isCacheExpired) {
                console.log('🔄 New data available or cache expired. Reloading...', { server: latestServerUpdate, local: localTimestamp });
                return true; // Need reload
            }

            console.log('✅ Menu is up to date. Using cache.');
            applyCachedCardapio(parsedCache);
            setLoadingCardapio(false);
            return false; // No reload needed
        } catch (err) {
            console.warn('⚠️ Error checking updates, forcing reload:', err);
            return true;
        }
    }, [applyCachedCardapio, user?.companyId]);

    const carregarCardapio = useCallback(async () => {
        try {
            const hasLoadedMenu = cardapioLoadedRef.current;
            const isRecentLoad = hasLoadedMenu && (Date.now() - lastLoadTimeRef.current) < MENU_REFRESH_WINDOW_MS;

            if (isRecentLoad) {
                console.log('⏭️ Skipping menu refresh, cache still within refresh window.');
                return;
            }

            if (!hasLoadedMenu) {
                setLoadingCardapio(true);
            }

            // Smart Cache Check
            const needsReload = await checkMenuUpdates();

            if (needsReload) {
                console.log('🔄 Reloading cardápio from database (Smart Cache trigger)...');
                await carregarCardapioSupabase({ showGlobalLoading: !hasLoadedMenu });
            }
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio:', error);
            // Fallback
            await carregarCardapioSupabase({ showGlobalLoading: !cardapioLoadedRef.current });
        }
    }, [carregarCardapioSupabase, checkMenuUpdates]);

    const refreshCardapio = useCallback(async () => {
        if (isRefreshingCardapio) {
            return;
        }

        try {
            setIsRefreshingCardapio(true);
            await carregarCardapioSupabase({ showGlobalLoading: false });
        } finally {
            setIsRefreshingCardapio(false);
        }
    }, [carregarCardapioSupabase, isRefreshingCardapio]);

    // Load menu once on mount (or when user changes)
    useEffect(() => {
        carregarCardapio();
    }, [carregarCardapio]);


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
        const items: { text: string; price: number; name: string }[] = [];
        for (const [name, qty] of Object.entries(produtos)) {
            if (qty > 0) {
                const itemPrice = calculateItemPrice(name, 1); // Unit price
                items.push({
                    text: `${qty}x ${name}`,
                    price: itemPrice * qty,
                    name: name // Pass the KEY explicitly
                });
            }
        }
        return items;
    }, [produtos, calculateItemPrice]);

    const handleRemoveItem = useCallback((itemName: string) => {
        if (Platform.OS === 'web') {
            // Web-specific confirmation
            if (window.confirm(`Deseja remover "${itemName}" do pedido?`)) {
                setProdutos(prev => {
                    const newProdutos = { ...prev };
                    if (newProdutos[itemName]) {
                        delete newProdutos[itemName];
                    }
                    return newProdutos;
                });
            }
            return;
        }

        Alert.alert(
            'Remover Item',
            `Deseja remover "${itemName}" do pedido?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        // Directly delete by key, no regex needed
                        setProdutos(prev => {
                            const newProdutos = { ...prev };
                            if (newProdutos[itemName]) {
                                delete newProdutos[itemName];
                            }
                            return newProdutos;
                        });
                    }
                }
            ]
        );
    }, []);

    const addPizzaToOrder = useCallback((sizeName: string, flavors: Product[], selectedBorda?: any, selectedAdicionais?: any[]) => {
        if (!flavors || flavors.length === 0) return;

        // 1. Calcular preço base
        // Se pricingMode for HIGHER (padrão), pega o maior preço entre os sabores para aquele tamanho
        let basePrice = 0;
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
        basePrice = Math.max(...prices);

        // 2. Adicionar preços dos extras
        let extrasPrice = 0;
        const extrasNames: string[] = [];
        const extrasDetails: Array<{ id: string, name: string, type: string, price: number }> = [];

        if (selectedBorda) {
            extrasPrice += selectedBorda.price || 0;
            extrasNames.push(`Borda: ${selectedBorda.name}`);
            extrasDetails.push({
                id: selectedBorda.id,
                name: selectedBorda.name,
                type: 'borda',
                price: selectedBorda.price || 0
            });
        }

        if (selectedAdicionais && selectedAdicionais.length > 0) {
            selectedAdicionais.forEach(adicional => {
                extrasPrice += adicional.price || 0;
                extrasNames.push(adicional.name);
                extrasDetails.push({
                    id: adicional.id,
                    name: adicional.name,
                    type: 'adicional',
                    price: adicional.price || 0
                });
            });
        }

        const finalPrice = basePrice + extrasPrice;

        console.log('🍕 [addPizzaToOrder] Preço base:', basePrice, 'Extras:', extrasPrice, 'Final:', finalPrice);

        // Validar que não é NaN
        if (isNaN(finalPrice) || finalPrice <= 0) {
            console.error('❌ [addPizzaToOrder] Preço inválido!', { sizeName, flavors, prices, finalPrice });
            showToast('Erro ao calcular preço da pizza', 'error');
            return;
        }

        // 3. Gerar nome

        // Melhor formatação de nome:
        let flavorsString = "";
        if (flavors.length === 1) {
            flavorsString = flavors[0].name;
        } else {
            flavorsString = flavors.map(f => `1/${flavors.length} ${f.name}`).join(', ');
        }

        let itemName = `Pizza ${sizeName} (${flavorsString})`;

        // Adicionar extras ao nome se houver
        if (extrasNames.length > 0) {
            itemName += ` + ${extrasNames.join(', ')}`;
        }

        // Store structured extras data in customPrices with a special key
        const extrasKey = `${itemName}__extras`;
        setCustomPrices(prev => ({
            ...prev,
            [itemName]: finalPrice,
            [extrasKey]: extrasDetails as any // Store extras metadata
        }));

        setProdutos(prev => {
            const currentQty = prev[itemName] || 0;
            return { ...prev, [itemName]: currentQty + 1 };
        });

        showToast('Pizza adicionada!', 'success');
    }, [showToast]);

    const resetForm = useCallback(() => {
        console.log('🧹 [useNovoPedido] Resetting form state...');
        setClientName('');
        setMesa('');
        setTableId('');
        setWaiterId('');
        setObservations('');
        setProdutos({});
        setCustomPrices({});
    }, []);

    const isSubmittingRef = useRef(false);

    const handleSubmit = async () => {
        console.log('[useNovoPedido] handleSubmit START');
        
        if (isSubmittingRef.current) return;

        if (selectedItems.length === 0) {
            showToast('Adicione pelo menos um item ao pedido', 'warning');
            return;
        }

        try {
            console.log('[useNovoPedido] Setting isSubmitting=true');
            isSubmittingRef.current = true;
            setIsSubmitting(true);

            // ✅ CRÍTICO: Prevenção de Concorrência em Mesas Livres
            if (user && mesa && mesa.trim() !== '') {
                console.log('[useNovoPedido] Verificando se mesa já está ocupada:', mesa);
                // Verifica rapidamente se já não há uma comanda aberta para essa mesa hoje.
                const { data: ocupadas } = await supabase
                    .from('comandas')
                    .select('id')
                    .eq('company_id', user.companyId)
                    .eq('date_key', getLocalDateKey())
                    .eq('table_number', mesa)
                    .eq('status', 'aberta')
                    .limit(1)
                    .maybeSingle();

                if (ocupadas) {
                    console.log('[useNovoPedido] Mesa já ocupada!');
                    setIsSubmitting(false);
                    showToast(`A Mesa ${mesa} já foi ocupada!`, 'error');
                    Alert.alert(
                        'Mesa já ocupada',
                        `Alguém já abriu um pedido para a Mesa ${mesa} agora pouco. Por favor, volte ao Mapa de Mesas.`
                    );
                    return;
                }
                console.log('[useNovoPedido] Mesa livre, prosseguindo...');
            }

            console.log('[useNovoPedido] Gerando número de comanda...');
            const nextNumber = await getNextComandaNumber();
            const novoNumeroComanda = formatComandaNumber(nextNumber);
            console.log('[useNovoPedido] Número de comanda gerado:', novoNumeroComanda);

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
                priceMap[lowerName] = price;
                categoryMap[lowerName] = 'pizza'; // ✅ CRÍTICO: Pizzas customizadas precisam da categoria
            });

            console.log('📦 [NovoPedido] Items a serem enviados:', items);
            console.log('💰 [NovoPedido] Total calculado:', total);
            console.log('🗺️ [NovoPedido] PriceMap size:', Object.keys(priceMap).length);

            console.log('[useNovoPedido] CHECKPOINT 1 - Antes de addOrder');
            console.log('[useNovoPedido] Chamando addOrder com params:', {
                clientName: clientName.trim() || 'Cliente',
                itemsCount: items.length,
                comandaNumber: novoNumeroComanda,
                mesa,
                total
            });

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
                categoryMap, // ✅ Passar mapa de categorias
                tableId,
                waiterId
            );
            console.log('[useNovoPedido] addOrder concluído, orderId:', createdOrderId);

            console.log('[useNovoPedido] Verificando total zerado...');
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

            console.log('[useNovoPedido] Chamando showToast...');
            showToast(`Pedido criado! Comanda ${novoNumeroComanda}`, 'success');

            resetForm();

            // --- ESTOQUE INTEGRATION ---

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

                if (stockItemsToDeduct.length > 0 && user?.companyId) {
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
            isSubmittingRef.current = false;
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
        tableId,
        setTableId,
        waiterId,
        setWaiterId,
        waiters,
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
        pizzaSubcategories,
        pizzaConfig,
        addPizzaToOrder,
        carregarCardapio,
        refreshCardapio,
        isRefreshingCardapio,
        extras,
        resetForm
    };
}
