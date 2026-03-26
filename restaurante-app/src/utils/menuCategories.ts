export interface MenuCategory {
  slug: string;
  name: string;
  order: number;
  active: boolean;
}

export const LEGACY_MENU_CATEGORIES: MenuCategory[] = [
  { slug: 'caldo', name: 'Caldos', order: 1, active: true },
  { slug: 'espetinho-simples', name: 'Espetinho Simples', order: 2, active: true },
  { slug: 'espetinho-especial', name: 'Espetinho Especial', order: 3, active: true },
  { slug: 'porcao', name: 'Porcao', order: 4, active: true },
  { slug: 'bebida', name: 'Bebida', order: 5, active: true },
  { slug: 'comida', name: 'Comida', order: 6, active: true },
  { slug: 'pizza', name: 'Pizza', order: 7, active: true },
  { slug: 'outro', name: 'Outro', order: 8, active: true },
];

const CATEGORY_ICON_BY_SLUG: Record<string, string> = {
  caldo: '🍲',
  'espetinho-simples': '🔥',
  'espetinho-especial': '🌟',
  porcao: '🍟',
  bebida: '🥤',
  comida: '🍽️',
  pizza: '🍕',
  outro: '📦',
};

export function normalizeCategorySlug(value?: string | null): string {
  if (!value) return 'outro';
  let slug = value.trim().toLowerCase();

  if (slug === 'outros') slug = 'outro';
  if (slug.includes('espetinho') && slug.includes('simples')) return 'espetinho-simples';
  if (slug.includes('espetinho') && slug.includes('especial')) return 'espetinho-especial';

  return slug;
}

export function slugifyCategoryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function sanitizeMenuCategories(input: unknown): MenuCategory[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const slug = normalizeCategorySlug(String(row.slug ?? row.value ?? ''));
      const name = String(row.name ?? row.label ?? slug).trim();
      const orderRaw = Number(row.order ?? index + 1);
      const active = row.active === undefined ? true : Boolean(row.active);

      if (!slug) return null;

      return {
        slug,
        name: name || slug,
        order: Number.isFinite(orderRaw) ? orderRaw : index + 1,
        active,
      } as MenuCategory;
    })
    .filter((item): item is MenuCategory => Boolean(item));

  const dedup = new Map<string, MenuCategory>();
  normalized.forEach((item) => {
    if (!dedup.has(item.slug)) {
      dedup.set(item.slug, item);
    }
  });

  return Array.from(dedup.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function getOrCreateMenuCategories(settings: Record<string, any> | null | undefined): {
  categories: MenuCategory[];
  categoryOrder: Record<string, number>;
  createdFromLegacy: boolean;
} {
  const parsed = sanitizeMenuCategories(settings?.categories);
  const categories = parsed.length > 0 ? parsed : LEGACY_MENU_CATEGORIES;
  const categoryOrder = categories.reduce<Record<string, number>>((acc, item, index) => {
    acc[item.slug] = item.order ?? index + 1;
    return acc;
  }, {});

  return {
    categories,
    categoryOrder,
    createdFromLegacy: parsed.length === 0,
  };
}

export function toCategoryOption(category: MenuCategory): { value: string; label: string } {
  const icon = CATEGORY_ICON_BY_SLUG[category.slug] || '📦';
  return {
    value: category.slug,
    label: `${icon} ${category.name}`,
  };
}

export function isPizzaCategorySlug(slug?: string | null): boolean {
  return normalizeCategorySlug(slug).includes('pizza');
}

export function isEspetinhoCategorySlug(slug?: string | null): boolean {
  const normalized = normalizeCategorySlug(slug);
  return normalized === 'espetinho-simples' || normalized === 'espetinho-especial';
}

/**
 * Returns true for categories that support the ingredients field (Caldos and Comidas).
 */
export function isIngredientsCategorySlug(slug?: string | null): boolean {
  const normalized = normalizeCategorySlug(slug);
  return normalized === 'caldo' || normalized === 'comida';
}
