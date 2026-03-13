import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/SupabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Product, Cardapio, MenuItem } from '../types';

const CARDAPIO_CACHE_KEY = '@cardapio_cache';

export function useMenu() {
    const { user } = useAuth();
    const [cardapio, setCardapio] = useState<Cardapio>({ caldos: [], comidas: [], bebidas: [], porcoes: [], outros: [], espetinhos: [], espetinhosSimples: [], espetinhosEspeciais: [], pizzas: [] });
    const [loading, setLoading] = useState(true);
    const [allItems, setAllItems] = useState<MenuItem[]>([]);

    const carregarCardapioSupabase = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);

            if (!user?.companyId) {
                setLoading(false);
                return;
            }

            // Fetch Products
            const { data: productsData, error } = await supabase
                .from('products')
                .select('*')
                .eq('company_id', user.companyId)
                .eq('available', true);

            if (error) throw error;

            // Processamento em buckets (similar ao useNovoPedido)
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

            const flatItems: MenuItem[] = [];

            productsData?.forEach((data: any) => {
                const item: Product = {
                    ...data,
                    id: data.id,
                    name: data.name,
                    category: data.category || 'outro',
                    price: data.price ? Number(data.price) : 0,
                    active: true,
                    image: data.image_url,
                };

                // Add to flat list for easier searching in SplitPayment
                flatItems.push({
                    name: item.name,
                    price: item.price
                });

                let cat = item.category?.toLowerCase() || 'outro';
                if (cat === 'outros') cat = 'outro';
                if (cat.includes('espetinho') && cat.includes('simples')) cat = 'espetinho-simples';
                if (cat.includes('espetinho') && cat.includes('especial')) cat = 'espetinho-especial';

                if (buckets[cat]) {
                    buckets[cat].push(item);
                } else {
                    if (!buckets.outro) buckets.outro = [];
                    buckets.outro.push(item);
                }
            });

            setAllItems(flatItems);

            const sortFn = (a: Product, b: Product) => a.name.localeCompare(b.name);

            const novoCardapio: Cardapio = {
                caldos: (buckets.caldo || []).sort(sortFn),
                comidas: (buckets.comida || []).sort(sortFn),
                bebidas: (buckets.bebida || []).sort(sortFn),
                porcoes: (buckets.porcao || []).sort(sortFn),
                outros: (buckets.outro || []).sort(sortFn),
                espetinhos: [],
                espetinhosSimples: (buckets['espetinho-simples'] || []).sort(sortFn),
                espetinhosEspeciais: (buckets['espetinho-especial'] || []).sort(sortFn),
                pizzas: (buckets['pizza'] || []).sort(sortFn)
            };

            setCardapio(novoCardapio);
            
            // Cache Update
            await AsyncStorage.setItem(CARDAPIO_CACHE_KEY, JSON.stringify({
                data: novoCardapio,
                flatItems: flatItems,
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('Erro ao carregar menu:', error);
            // Try cache fallback
            const cached = await AsyncStorage.getItem(CARDAPIO_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                setCardapio(parsed.data);
                if (parsed.flatItems) setAllItems(parsed.flatItems);
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        carregarCardapioSupabase();
    }, [user?.companyId]);

    return { cardapio, allItems, loading, refresh: carregarCardapioSupabase };
}
