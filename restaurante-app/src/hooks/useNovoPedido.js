import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { useOrders } from '../context/OrderContext.firestore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getNextComandaNumber, peekNextComandaNumber, formatComandaNumber } from '../services/ComandaService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { exitApp } from '../utils/appUtils';

const CARDAPIO_CACHE_KEY = '@cardapio_cache';
const CARDAPIO_CACHE_EXPIRY = 5 * 60 * 1000;

export const fixDecimal = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function useNovoPedido() {
    const { addOrder } = useOrders();
    const { user } = useAuth(); 
    const { showToast } = useToast();

    const [comandaNumber, setComandaNumber] = useState('');
    const [loadingComanda, setLoadingComanda] = useState(false);
    const [clientName, setClientName] = useState('');
    const [observations, setObservations] = useState('');
    const [produtos, setProdutos] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cardapio, setCardapio] = useState({ caldos: [], comidas: [], bebidas: [], porcoes: [] });
    const [loadingCardapio, setLoadingCardapio] = useState(true);

    const cardapioLoadedRef = useRef(false);
    const lastLoadTimeRef = useRef(0);

    const carregarCardapioFirestore = async (isBackground = false) => {
        try {
            if (!isBackground) setLoadingCardapio(true);

            const snapshot = await getDocs(collection(db, 'cardapio'));
            const produtosDb = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(p => p.active);

            const caldos = produtosDb
                .filter(p => p.category === 'caldo')
                .map(p => ({ name: p.name, price: p.price }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const comidas = produtosDb
                .filter(p => p.category === 'comida')
                .map(p => ({ name: p.name, price: p.price }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const bebidas = produtosDb
                .filter(p => p.category === 'bebida')
                .map(p => ({ name: p.name, price: p.price }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const porcoes = produtosDb
                .filter(p => p.category === 'porcao')
                .map(p => ({ name: p.name, price: p.price }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const novoCardapio = { caldos, comidas, bebidas, porcoes };
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
            setLoadingCardapio(true);
            // TEMPORÁRIO: Ignorar cache para forçar reload
            await AsyncStorage.removeItem(CARDAPIO_CACHE_KEY);

            await carregarCardapioFirestore(false);
        } catch (error) {
            console.error('❌ Erro ao carregar cardápio:', error);
            Alert.alert('Erro', 'Não foi possível carregar o cardápio');
            setLoadingCardapio(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const now = Date.now();
            if (cardapioLoadedRef.current && (now - lastLoadTimeRef.current) < CARDAPIO_CACHE_EXPIRY) {
                return;
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
        [...(cardapio.caldos || []), ...(cardapio.bebidas || []), ...(cardapio.comidas || []), ...(cardapio.porcoes || [])],
        [cardapio]
    );

    const total = useMemo(() => {
        let totalCalc = 0;
        for (const [name, qty] of Object.entries(produtos)) {
            if (qty > 0) {
                const nomeBase = name.replace(/\s*\(.*\)$/, '');

                // 1. Tentar encontrar item exato no cardápio
                // Isso cobre "Cerveja Heineken", "Espetinho Simples", etc.
                const produtoExato = cardapioCombinado.find(p => p.name === nomeBase);

                if (produtoExato) {
                    totalCalc += qty * produtoExato.price;
                } else {
                    // Logic for Caldos variations (300ml vs 180ml) if not in DB
                    // This mimics the UI fallback logic
                    if (name.includes('Caldinho') || name.includes('Caldo')) {
                        if (name.includes('180ml')) {
                            totalCalc += qty * 10;
                            continue;
                        } else if (name.includes('300ml')) {
                            totalCalc += qty * 15;
                            continue;
                        }
                    }

                    // 2. Fallback: procurar por prefixo (ex: "Caldinho" encontrando "Caldinho de Macaxeira")
                    // CUIDADO: Isso pode pegar o preço base (15) para um item de 180ml (10) se a lógica acima falhar
                    const produtoPartial = cardapioCombinado.find(p => name.startsWith(p.name));
                    if (produtoPartial) {
                        totalCalc += qty * produtoPartial.price;
                    }
                }
            }
        }
        return fixDecimal(totalCalc);
    }, [produtos, cardapioCombinado]);

    const selectedItems = useMemo(() => {
        const items = [];
        for (const [name, qty] of Object.entries(produtos)) {
            if (qty > 0) {
                items.push({
                    text: `${qty}x ${name}`,
                    price: 0 // Calculated by context/backend
                });
            }
        }
        return items;
    }, [produtos]);

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

            await addOrder(
                clientName.trim() || 'Cliente',
                items,
                observations.trim(),
                novoNumeroComanda,
                user?.uid || '',
                user?.nome || user?.email || 'Garçom',
                0, // totalPrice calculated by backend/service
                false // isPago
            );

            showToast(`Pedido criado! Comanda ${novoNumeroComanda}`, 'success');

            setComandaNumber('');
            setClientName('');
            setObservations('');
            setProdutos({});
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
        exitApp();
    }, []);

    return {
        user,
        loadingCardapio,
        cardapio,
        produtos,
        clientName,
        setClientName,
        observations,
        setObservations,
        updateProduto,
        total,
        selectedItems,
        handleRemoveItem,
        handleSubmit,
        isSubmitting,
        handleLogout
    };
}
