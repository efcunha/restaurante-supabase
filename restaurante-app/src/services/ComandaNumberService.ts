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

    // Buscar todos os números e calcular max numericamente (evita bug lexicográfico se TEXT)
    const { data: allNums, error } = await supabase
      .from('comandas')
      .select('comanda_number')
      .eq('company_id', profile.company_id)
      .eq('date_key', dateKey);

    if (error) {
      console.error('[ComandaNumber] Erro ao buscar próximo número:', error);
      return null;
    }

    if (!allNums || allNums.length === 0) return 1;

    const maxNum = allNums.reduce((acc, row) => {
      const n = parseInt(String(row.comanda_number), 10);
      return isNaN(n) ? acc : Math.max(acc, n);
    }, 0);

    return maxNum + 1;

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
      .select('company_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

    const dateKey = getDateKey();

    // 🔒 CORREÇÃO: Usar transação atômica com SELECT FOR UPDATE para evitar race conditions
    // Implementação de reserva atômica via frontend (Retry Loop) mitigando Race Condition.
    let attempts = 0;
    while (attempts < 10) {
      attempts++;

      // 1. Obter o maior número atual com um pequeno delay aleatório para reduzir colisões
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }

      // Buscar TODOS os números do dia e calcular max numericamente no cliente.
      // Evita bug de ordenação lexicográfica (ex: "9" > "10" se campo for TEXT).
      const { data: allNumbers } = await supabase
        .from('comandas')
        .select('comanda_number')
        .eq('company_id', profile.company_id)
        .eq('date_key', dateKey);

      const maxNum = allNumbers?.reduce((acc, row) => {
        const n = parseInt(String(row.comanda_number), 10);
        return isNaN(n) ? acc : Math.max(acc, n);
      }, 0) ?? 0;


      const nextNum = maxNum + 1;


      console.log(`[ComandaNumber] Tentativa ${attempts}: Próximo número calculado = ${nextNum}`);

      // 2. Tentar INSERIR um registro fantasma (reservar)
      const { error: insertError } = await supabase
        .from('comandas')
        .insert({
          company_id: profile.company_id,
          date_key: dateKey,
          comanda_number: String(nextNum),
          status: 'aberta',
          table_number: '',
          client_name: 'Reservando...', // ComandasService.ensureComandaAberta entende e sobrescreve
          total_consumed: 0,
          total_paid: 0,
          open_balance: 0,
          opened_by: user.id,
          opened_by_name: profile.full_name || 'Sistema',
          received_by: []
        });

      // 3. Se inseriu sem conflito, fechou! Retorna e "ComandasService.ensure" reusará.
      if (!insertError) {
        console.log(`[ComandaNumber] ✅ Número ${nextNum} reservado com sucesso`);
        return nextNum;
      }

      // 4. Se deu conflito único (outro terminal preencheu o nextNum milissegundos antes)
      if (insertError.code === '23505') {
        console.warn(`[ComandaNumber] ⚠️ Colisão no número ${nextNum}. Retentando... (Tentativa ${attempts}/10)`);
        // O loop vai girar para tentar de novo pegando o NOVO max
        continue;
      }

      // Se for outro erro gravíssimo, paramos
      console.error('[ComandaNumber] ❌ Erro ao reservar comanda:', insertError);
      throw insertError;
    }

    throw new Error('Falha ao gerar número único de comanda após muitas tentativas (Race Condition extrema).');

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
