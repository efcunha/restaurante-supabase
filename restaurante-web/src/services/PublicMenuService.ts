import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente anonimo dedicado para o cardapio publico (sem sessao autenticada)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface PublicCompany {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  contact_phone: string | null;
  menu_banner_url: string | null;
  menu_logo_url: string | null;
  menu_primary_color: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  prices: Record<string, number> | null;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  photo_alt: string | null;
  display_order: number;
  tags: string[];
  ingredients: string[];
}

export interface PublicMenuCategory {
  slug: string;
  label: string;
  products: PublicProduct[];
}

export interface PublicMenu {
  company: PublicCompany;
  categories: PublicMenuCategory[];
}

function buildCategoryLabel(slug: string): string {
  const labels: Record<string, string> = {
    pizza: 'Pizzas',
    caldo: 'Caldos',
    comida: 'Comidas',
    bebida: 'Bebidas',
    espetinho: 'Espetinhos',
    porcao: 'Porções',
    sobremesa: 'Sobremesas',
    outros: 'Outros',
  };
  const key = slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return labels[key] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Busca empresa publicada pelo slug publico.
 * Usa funcao RPC que restringe colunas expostas e respeita RLS.
 */
export async function fetchPublicCompanyBySlug(slug: string): Promise<PublicCompany | null> {
  const { data, error } = await anonClient.rpc('get_company_by_menu_slug', {
    slug_param: slug,
  });

  if (error || !data || data.length === 0) return null;
  return data[0] as PublicCompany;
}

/**
 * Busca todos os produtos disponiveis de uma empresa para o cardapio publico.
 * Ja filtrado por available=true e active=true via RLS anonima.
 */
export async function fetchPublicProducts(companyId: string): Promise<PublicProduct[]> {
  const { data, error } = await anonClient
    .from('products')
    .select(
      'id, name, description, price, prices, category, subcategory, image_url, photo_alt, display_order, tags, ingredients'
    )
    .eq('company_id', companyId)
    .eq('available', true)
    .eq('active', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return [];
  return (data || []) as PublicProduct[];
}

/**
 * Busca o menu completo (empresa + produtos agrupados por categoria) pelo slug.
 */
export async function fetchPublicMenu(slug: string): Promise<PublicMenu | null> {
  const company = await fetchPublicCompanyBySlug(slug);
  if (!company) return null;

  const products = await fetchPublicProducts(company.id);

  // Agrupar por categoria mantendo ordem de insercao (ja vem ordenado do banco)
  const categoryMap = new Map<string, PublicMenuCategory>();

  for (const product of products) {
    const categoryKey = product.category || 'outros';
    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        slug: categoryKey,
        label: buildCategoryLabel(categoryKey),
        products: [],
      });
    }
    categoryMap.get(categoryKey)!.products.push(product);
  }

  return {
    company,
    categories: Array.from(categoryMap.values()),
  };
}

/**
 * Normaliza texto para busca (remove acentos, lowercase).
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtra produtos localmente por texto de busca (nome + descricao).
 */
export function filterProducts(
  products: PublicProduct[],
  query: string
): PublicProduct[] {
  if (!query.trim()) return products;
  const normalized = normalizeSearch(query);
  return products.filter(
    (p) =>
      normalizeSearch(p.name).includes(normalized) ||
      normalizeSearch(p.description || '').includes(normalized)
  );
}
