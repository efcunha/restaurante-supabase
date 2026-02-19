/**
 * ComandaNumberService - Migrado para Supabase
 * Gera números de comanda sequenciais por dia usando PostgreSQL sequence.
 * Usa a função RPC get_next_comanda_number() criada na migration.
 */
import { supabase } from '../config/SupabaseConfig';

/**
 * Retorna string da data (YYYY-MM-DD) para chave diária.
 */
const getDateKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Retorna o próximo número que SERÁ gerado, sem incrementar o contador
 * @returns {Promise<number | null>} próximo número disponível
 */
export const peekNextComandaNumber = async (): Promise<number | null> => {
  try {
    // Buscar company_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) return null;

    const dateKey = getDateKey();

    // Buscar o maior número de comanda para hoje
    const { data, error } = await supabase
      .from('comandas')
      .select('comanda_number')
      .eq('company_id', profile.company_id)
      .eq('date_key', dateKey)
      .order('comanda_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ComandaNumber] Erro ao buscar próximo número:', error);
      return null;
    }

    // Se não há comandas hoje, próximo é 1
    if (!data) return 1;

    // Próximo número é o maior + 1
    return (data.comanda_number || 0) + 1;
  } catch (error) {
    console.error('[ComandaNumber] Erro em peekNextComandaNumber:', error);
    return null;
  }
};

/**
 * Gera próximo número de comanda (incremental) para o dia atual.
 * Usa a função RPC get_next_comanda_number() do Supabase.
 * @returns {Promise<number>} novo número de comanda
 */
export const getNextComandaNumber = async (): Promise<number> => {
  try {
    // Buscar company_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

    const dateKey = getDateKey();

    // FALLBACK: Manualmente buscar o maior número de comanda para hoje
    // Originalmente usava RPC 'get_next_comanda_number', mas estava dando erro de ambiguidade (PGRST203)
    const { data, error } = await supabase
      .from('comandas')
      .select('comanda_number')
      .eq('company_id', profile.company_id)
      .eq('date_key', dateKey)
      .order('comanda_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ComandaNumber] Erro ao consultar último número:', error);
      throw error;
    }

    // Se não há comandas hoje, próximo é 1
    if (!data) return 1;

    // Próximo número é o maior + 1
    return (data.comanda_number || 0) + 1;

  } catch (error) {
    console.error('[ComandaNumber] Erro em getNextComandaNumber:', error);
    throw error;
  }
};

/**
 * Formata número da comanda para exibição (ex: 12 -> 012 se desejar padding).
 * @param {number} num
 * @returns {string}
 */
export const formatComandaNumber = (num: number | string): string => {
  const numStr = String(num);
  // Opcional: adicionar padding com zeros à esquerda
  // return numStr.padStart(3, '0'); // Ex: 1 -> 001
  return numStr;
};

export default {
  peekNextComandaNumber,
  getNextComandaNumber,
  formatComandaNumber,
};
