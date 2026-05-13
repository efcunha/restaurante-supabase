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
  settings?: Record<string, any> | null;
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

interface CompanyMenuCategorySetting {
  slug: string;
  name?: string;
  label?: string;
  active?: boolean;
  order?: number;
}

function prettyLabelFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeCategorySlug(value?: string | null): string {
  if (!value) return 'outro';
  let slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (slug === 'outros') slug = 'outro';
  if (slug.includes('espetinho') && slug.includes('simples')) return 'espetinho-simples';
  if (slug.includes('espetinho') && slug.includes('especial')) return 'espetinho-especial';

  return slug;
}

function getCompanyCategoryOrder(settings?: Record<string, any> | null): Map<string, { label: string; order: number }> {
  const list = Array.isArray(settings?.categories)
    ? (settings!.categories as CompanyMenuCategorySetting[])
    : [];

  const map = new Map<string, { label: string; order: number }>();

  list
    .filter((item) => item && item.active !== false && item.slug)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .forEach((item, index) => {
      const slug = normalizeCategorySlug(item.slug);
      const label = (item.name || item.label || prettyLabelFromSlug(slug)).trim();
      map.set(slug, {
        label,
        order: Number.isFinite(item.order) ? Number(item.order) : index,
      });
    });

  return map;
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

  const base = data[0] as PublicCompany;

  // Busca settings por canal seguro (view pública) para obter ordem/label das categorias.
  const { data: companySettingsRow } = await anonClient
    .from('public_menu_companies')
    .select('settings')
    .eq('id', base.id)
    .maybeSingle();

  return {
    ...base,
    settings: (companySettingsRow as any)?.settings ?? null,
  };
}

/**
 * Busca todos os produtos disponiveis de uma empresa para o cardapio publico.
 * Filtra apenas por active=true; available é sempre sincronizado via constraint CHECK.
 */
export async function fetchPublicProducts(companyId: string): Promise<PublicProduct[]> {
  const { data, error } = await anonClient
    .from('products')
    .select(
      'id, name, description, price, prices, category, subcategory, image_url, photo_alt, display_order, tags, ingredients'
    )
    .eq('company_id', companyId)
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
  const categoryMeta = getCompanyCategoryOrder(company.settings);

  // Agrupar apenas categorias que possuem itens ativos/disponíveis (já filtrados no fetch).
  const categoryMap = new Map<string, PublicMenuCategory>();

  for (const product of products) {
    const categoryKey = normalizeCategorySlug(product.category || 'outro');
    if (!categoryMap.has(categoryKey)) {
      const configured = categoryMeta.get(categoryKey);
      categoryMap.set(categoryKey, {
        slug: categoryKey,
        label: configured?.label || prettyLabelFromSlug(categoryKey),
        products: [],
      });
    }
    categoryMap.get(categoryKey)!.products.push(product);
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    const orderA = categoryMeta.get(a.slug)?.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = categoryMeta.get(b.slug)?.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });

  return {
    company,
    categories,
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
