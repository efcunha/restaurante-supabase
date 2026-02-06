import { supabase } from '../config/SupabaseConfig';

/**
 * Returns a Supabase query builder for a company-scoped table.
 * 
 * @param companyId - The ID of the company
 * @param tableName - The name of the table (e.g., 'products', 'comandas', 'orders')
 * @returns Supabase query builder filtered by company_id
 */
export const getCompanyTable = (companyId: string, tableName: string) => {
  if (!companyId) {
    throw new Error('Company ID is required for scoped data access');
  }
  return supabase.from(tableName).select('*').eq('company_id', companyId);
};

/**
 * Legacy compatibility: Maps old Firestore collection names to Supabase table names
 */
const COLLECTION_TO_TABLE_MAP: Record<string, string> = {
  'cardapio': 'products',
  'comandas': 'comandas',
  'pedidos': 'orders',
  'pagamentos': 'payments',
  'funcionarios': 'profiles',
  'caixa': 'cash_registers',
  'movimentacoes': 'cash_movements',
};

/**
 * Returns a Supabase query builder for a company-scoped collection (legacy compatibility).
 * 
 * @param companyId - The ID of the company
 * @param collectionName - The name of the collection (Firestore naming)
 * @returns Supabase query builder
 */
export const getCompanyCollection = (companyId: string, collectionName: string) => {
  const tableName = COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
  return getCompanyTable(companyId, tableName);
};

/**
 * Legacy compatibility: Returns a query builder for a specific document.
 * Note: In Supabase, we don't have "document references" like Firestore.
 * This returns a query builder that can be used with .eq('id', docId)
 * 
 * @param companyId - The ID of the company
 * @param collectionName - The name of the collection
 * @param docId - The ID of the document (optional)
 * @returns Object with table name and query helpers
 */
export const getCompanyDoc = (companyId: string, collectionName: string, docId?: string) => {
  if (!companyId) {
    throw new Error('Company ID is required for scoped data access');
  }
  
  const tableName = COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
  
  return {
    tableName,
    companyId,
    docId,
    // Helper to get the query builder
    query: () => {
      const q = supabase.from(tableName).select('*').eq('company_id', companyId);
      return docId ? q.eq('id', docId).single() : q;
    },
    // Helper to update
    update: (data: any) => {
      if (!docId) throw new Error('Document ID required for update');
      return supabase.from(tableName).update(data).eq('company_id', companyId).eq('id', docId);
    },
    // Helper to delete
    delete: () => {
      if (!docId) throw new Error('Document ID required for delete');
      return supabase.from(tableName).delete().eq('company_id', companyId).eq('id', docId);
    }
  };
};
