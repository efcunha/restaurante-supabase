import { supabase } from '../config/SupabaseConfig';
import { ProductAdicional } from '../types/models';

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCategory(value: unknown): ProductAdicional['category'] {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'molhos' || normalized === 'toppings') return normalized;
  return 'extras';
}

function normalizeSelectionType(value: unknown): ProductAdicional['selectionType'] {
  return String(value ?? '').trim().toLowerCase() === 'unico' ? 'unico' : 'multiplo';
}

function mapRow(row: Record<string, any>): ProductAdicional {
  return {
    id: row.id,
    companyId: row.company_id,
    productId: row.product_id,
    name: row.name,
    description: row.description ?? undefined,
    price: parseOptionalNumber(row.price) ?? 0,
    category: normalizeCategory(row.category),
    selectionType: normalizeSelectionType(row.selection_type),
    maxChoices: parseOptionalNumber(row.max_choices),
    displayOrder: parseOptionalNumber(row.display_order) ?? 0,
    active: row.active ?? true,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export const AdicionaisService = {
  fetchByProduct: async (productId: string, companyId: string): Promise<ProductAdicional[]> => {
    const { data, error } = await supabase
      .from('product_adicionais')
      .select('*')
      .eq('product_id', productId)
      .eq('company_id', companyId)
      .eq('active', true)
      .order('display_order');

    if (error) throw error;
    return (data || []).map(mapRow);
  },

  fetchAllByProduct: async (productId: string, companyId: string): Promise<ProductAdicional[]> => {
    const { data, error } = await supabase
      .from('product_adicionais')
      .select('*')
      .eq('product_id', productId)
      .eq('company_id', companyId)
      .order('display_order');

    if (error) throw error;
    return (data || []).map(mapRow);
  },

  create: async (
    record: Omit<ProductAdicional, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProductAdicional> => {
    const { data, error } = await supabase
      .from('product_adicionais')
      .insert({
        company_id: record.companyId,
        product_id: record.productId,
        name: record.name.trim(),
        description: record.description?.trim() || null,
        price: record.price,
        category: record.category,
        selection_type: record.selectionType,
        max_choices: record.maxChoices ?? null,
        display_order: record.displayOrder,
        active: record.active,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  update: async (
    id: string,
    changes: Partial<Omit<ProductAdicional, 'id' | 'companyId' | 'productId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    const payload: Record<string, any> = {};
    if (changes.name !== undefined) payload.name = changes.name.trim();
    if (changes.description !== undefined) payload.description = changes.description?.trim() || null;
    if (changes.price !== undefined) payload.price = changes.price;
    if (changes.category !== undefined) payload.category = changes.category;
    if (changes.selectionType !== undefined) payload.selection_type = changes.selectionType;
    if (changes.maxChoices !== undefined) payload.max_choices = changes.maxChoices ?? null;
    if (changes.displayOrder !== undefined) payload.display_order = changes.displayOrder;
    if (changes.active !== undefined) payload.active = changes.active;

    const { error } = await supabase
      .from('product_adicionais')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('product_adicionais')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
