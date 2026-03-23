import { useState, useEffect } from 'react';
import { supabase } from '../config/SupabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Product, Cardapio } from '../types';
import type { MenuItem } from '../types/index';
import { getOrCreateMenuCategories, normalizeCategorySlug } from '../utils/menuCategories';

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

            const [productsResult, companyResult] = await Promise.all([
                supabase
                    .from('products')
                    .select('*')
                    .eq('company_id', user.companyId)
                    .eq('available', true),
                supabase
                    .from('companies')
                    .select('settings')
                    .eq('id', user.companyId)
                    .single(),
            ]);

            const { data: productsData, error } = productsResult;
            if (error) throw error;

            const settings = companyResult.data?.settings || {};
            const { categories } = getOrCreateMenuCategories(settings);
            const validCategorySlugs = new Set(categories.map((item) => item.slug));

            const bucketSlugs = Array.from(new Set([...validCategorySlugs, 'outro']));
            const buckets: Record<string, Product[]> = bucketSlugs.reduce((acc, slug) => {
                acc[slug] = [];
                return acc;
            }, {} as Record<string, Product[]>);

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
                    price: item.price ?? 0
                });

                let cat = normalizeCategorySlug(item.category);
                if (!validCategorySlugs.has(cat)) cat = 'outro';

                if (buckets[cat]) {
                    buckets[cat].push(item);
                } else {
                    if (!buckets.outro) buckets.outro = [];
                    buckets.outro.push(item);
                }
            });

            setAllItems(flatItems);

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
