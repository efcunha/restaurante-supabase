/**
 * CaixaService - Gerencia operações de caixa (abertura, reforço, sangria, fechamento, histórico).
 */
import { supabase } from '../config/SupabaseConfig';
import { Caixa } from '../types';
import { getLocalDateKey } from '../utils/dateUtils';

const TABLE_CAIXA = 'cash_registers';
const TABLE_MOVIMENTOS = 'cash_movements';

// Cache para caixa aberto (2 minutos)
interface CaixaCache {
  data: Caixa | null;
  timestamp: number;
}

let caixaCache: CaixaCache = { data: null, timestamp: 0 };
const CACHE_TTL = 2 * 60 * 1000;

class CaixaService {

  // Helper: Get user's company ID
  private async _getCompanyId(): Promise<string | null> {
    console.log('[CaixaService] _getCompanyId START');
    
    // ✅ Add timeout to auth.getUser()
    const getUserPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: auth.getUser() exceeded 3s')), 3000);
    });

    let user;
    try {
      const result = await Promise.race([getUserPromise, timeoutPromise]);
      user = result.data.user;
      console.log('[CaixaService] User fetched:', user?.id);
    } catch (timeoutError: any) {
      console.error('[CaixaService] auth.getUser() timeout:', timeoutError.message);
      throw timeoutError;
    }

    if (!user) {
      console.log('[CaixaService] No user found');
      return null;
    }

    // ✅ Add timeout to profiles query
    console.log('[CaixaService] Querying profiles for company_id...');
    const profileQueryPromise = supabase.from('profiles').select('company_id').eq('id', user.id).single();
    const profileTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: profiles query exceeded 3s')), 3000);
    });

    try {
      const result = await Promise.race([profileQueryPromise, profileTimeoutPromise]);
      console.log('[CaixaService] Profile company_id:', result.data?.company_id);
      return result.data?.company_id || null;
    } catch (timeoutError: any) {
      console.error('[CaixaService] profiles query timeout:', timeoutError.message);
      throw timeoutError;
    }
  }

  async getCaixaAberto(companyId?: string): Promise<Caixa | null> {
    console.log('[CaixaService] getCaixaAberto START [VERSION 4 - WITH ABORT]', companyId);
    const cid = companyId || await this._getCompanyId();
    console.log('[CaixaService] Company ID resolved:', cid);
    if (!cid) return null;

    const now = Date.now();
    const today = getLocalDateKey();
    console.log('[CaixaService] Today key:', today);
    
    // Verificar cache: válido se dentro do TTL E do mesmo dia
    if (caixaCache.data && (now - caixaCache.timestamp) < CACHE_TTL) {
      // Validar se o cache é do dia atual
      if (caixaCache.data.data === today) {
        console.log('[CaixaService] Returning from cache');
        return caixaCache.data;
      }
      // Cache é de outro dia, invalidar
      caixaCache = { data: null, timestamp: 0 };
    }

    console.log('[CaixaService] Querying Supabase for caixa aberto... [v4-with-abort]');
    
    // ✅ Add timeout to prevent hanging
    const queryPromise = supabase
      .from(TABLE_CAIXA)
      .select('*')
      .eq('company_id', cid)
      .eq('status', 'aberto')
      .eq('date_key', today) // ✅ CRÍTICO: Buscar apenas caixa do dia atual
      .limit(1)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error('[CaixaService] Timeout reached after 3s');
        reject(new Error('Timeout: getCaixaAberto query exceeded 3s'));
      }, 3000);
    });

    let data, error;
    try {
      console.log('[CaixaService] Starting Promise.race...');
      const result = await Promise.race([queryPromise, timeoutPromise]);
      data = result.data;
      error = result.error;
      console.log('[CaixaService] Promise.race completed successfully');
    } catch (timeoutError: any) {
      console.error('[CaixaService] Query timeout or error:', timeoutError.message);
      // Return null instead of throwing to allow order creation to proceed
      return null;
    }

    console.log('[CaixaService] Query result:', { hasData: !!data, hasError: !!error });

    if (error) {
      console.error('Erro ao buscar caixa aberto:', error.message);
      return null;
    }

    if (data) {
      const mappedCaixa: Caixa = this._mapCaixaToType(data);
      caixaCache = { data: mappedCaixa, timestamp: now };
      console.log('[CaixaService] Caixa found and cached:', mappedCaixa.id);
      return mappedCaixa;
    }

    caixaCache = { data: null, timestamp: now };
    console.log('[CaixaService] No caixa aberto found');
    return null;
  }

  invalidateCache() {
    caixaCache = { data: null, timestamp: 0 };
  }

  async abrirCaixa(companyId: string, valorInicial: string | number, usuarioId: string, usuarioNome: string) {
    if (!companyId) throw new Error("Company ID required");

    const valor = typeof valorInicial === 'string' ? parseFloat(valorInicial) : valorInicial;
    if (isNaN(valor) || valor < 0) throw new Error("Valor inicial inválido.");

    // Check if open exists
    const existente = await this.getCaixaAberto(companyId);
    if (existente) throw new Error('Já existe um caixa aberto para hoje/agora.');

    const { data, error } = await supabase
      .from(TABLE_CAIXA)
      .insert({
        company_id: companyId,
        date_key: getLocalDateKey(),
        opened_by: usuarioId,
        opened_by_name: usuarioNome,
        initial_value: valor,
        expected_balance: valor, // Start with initial
        status: 'aberto',
        sales_by_method: { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    this.invalidateCache();
    return data;
  }

  async registrarReforco(companyId: string, valor: string | number, motivo: string, usuarioId: string, usuarioNome: string) {
    const caixa = await this.getCaixaAberto(companyId);
    if (!caixa) throw new Error('Nenhum caixa aberto.');

    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (!(valorNum > 0)) throw new Error('Valor inválido.');

    // Update Caixa
    // We do optimized increment if possible, or read-modify-write.
    // Supabase doesn't support field increments easily without RPC or raw SQL.
    // Let's use read-modify-write for now, relying on optimistic locking if versioning existed, but here relying on short transaction gap.

    const novoReforcos = (caixa.reforcosTotal || 0) + valorNum;
    const novoSaldo = (caixa.saldoEsperado || 0) + valorNum;

    // Transaction logic: Update Register AND Insert Movement
    // Since Supabase JS client doesn't do multi-table transactions easily, we do them sequentially.
    // Ideally use RPC. For rapid migration, sequential is acceptable if errors handled.

    // 1. Insert Movement
    const { error: movError } = await supabase.from(TABLE_MOVIMENTOS).insert({
      company_id: companyId,
      cash_register_id: caixa.id,
      type: 'reforco',
      value: valorNum,
      reason: motivo,
      user_id: usuarioId,
      user_name: usuarioNome
    });
    if (movError) throw new Error(movError.message);

    // 2. Update Register
    const { error: updError } = await supabase.from(TABLE_CAIXA)
      .update({
        total_reinforcements: novoReforcos,
        expected_balance: novoSaldo,
        updated_at: new Date().toISOString()
      })
      .eq('id', caixa.id);

    if (updError) throw new Error(updError.message);

    this.invalidateCache();
  }

  async registrarSangria(companyId: string, valor: string | number, motivo: string, usuarioId: string, usuarioNome: string) {
    const caixa = await this.getCaixaAberto(companyId);
    if (!caixa) throw new Error('Nenhum caixa aberto.');

    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (!(valorNum > 0)) throw new Error('Valor inválido.');

    if (valorNum > caixa.saldoEsperado) throw new Error('Sangria maior que saldo disponível.');

    const novoSangrias = (caixa.sangriasTotal || 0) + valorNum;
    const novoSaldo = caixa.saldoEsperado - valorNum;

    // 1. Insert Movement
    const { error: movError } = await supabase.from(TABLE_MOVIMENTOS).insert({
      company_id: companyId,
      cash_register_id: caixa.id,
      type: 'sangria',
      value: valorNum,
      reason: motivo,
      user_id: usuarioId,
      user_name: usuarioNome
    });
    if (movError) throw new Error(movError.message);

    // 2. Update Register
    const { error: updError } = await supabase.from(TABLE_CAIXA)
      .update({
        total_bleedings: novoSangrias,
        expected_balance: novoSaldo,
        updated_at: new Date().toISOString()
      })
      .eq('id', caixa.id);

    if (updError) throw new Error(updError.message);

    this.invalidateCache();
  }

  // Used by Order/Payment Service to sync sales
  async registrarVenda(companyId: string, forma: string, valor: number | string) {
    if (!companyId) return;

    const caixa = await this.getCaixaAberto(companyId);
    if (!caixa) throw new Error('Caixa fechado ou inexistente.');

    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (!(valorNum > 0)) return; // Valid?

    const porForma = caixa.porForma || { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
    porForma[forma] = (porForma[forma] || 0) + valorNum; // Update specific method

    const novaVendasTotal = (caixa.vendasTotal || 0) + valorNum;
    const novoSaldo = (caixa.saldoEsperado || 0) + valorNum;
    // Note: SaldoEsperado increases with any sale or just cash? 
    // Usually "Saldo" refers to Cash in Drawer. 
    // If logic is "Saldo Do Caixa" (Money physically there), then only 'dinheiro' increases it.
    // However, original code implies `saldoEsperado = saldoAnterior + valorNum` for ALL sales?
    // Let's re-read original:
    // `const saldoEsperado = saldoAnterior + valorNum;` -> Yes, it added ALL sales to expected balance.
    // That seems odd for a cash register (Pix doesn't go to drawer), but I will replicate original logic 1:1.

    const { error } = await supabase.from(TABLE_CAIXA)
      .update({
        sales_by_method: porForma,
        total_sales: novaVendasTotal,
        expected_balance: novoSaldo,
        updated_at: new Date().toISOString()
      })
      .eq('id', caixa.id);

    if (error) console.error('Erro ao registrar venda no caixa:', error.message);
    else this.invalidateCache();
  }

  async getCaixasAbertos(companyId: string): Promise<Caixa[]> {
    const { data } = await supabase.from(TABLE_CAIXA)
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'aberto');

    return (data || []).map(this._mapCaixaToType);
  }

  async fecharCaixa(companyId: string, usuarioId: string | null, usuarioNome: string, saldoRealContado: string | number, caixaId?: string) {
    let caixa: Caixa | null = null;

    if (caixaId) {
      const { data } = await supabase.from(TABLE_CAIXA)
        .select('*')
        .eq('id', caixaId)
        .eq('company_id', companyId)
        .single();
      
      if (data) caixa = this._mapCaixaToType(data);
    } else {
      caixa = await this.getCaixaAberto(companyId);
    }

    if (!caixa) throw new Error('Nenhum caixa aberto encontrado.');

    const saldoReal = typeof saldoRealContado === 'string' ? parseFloat(saldoRealContado) : saldoRealContado;
    const dif = saldoReal - caixa.saldoEsperado;

    const { error } = await supabase.from(TABLE_CAIXA)
      .update({
        status: 'fechado',
        real_balance: saldoReal,
        difference: dif,
        closed_at: new Date().toISOString(),
        closed_by: usuarioId,
        closed_by_name: usuarioNome,
        updated_at: new Date().toISOString()
      })
      .eq('id', caixa.id);

    if (error) throw new Error(error.message);
    this.invalidateCache();
    
    return {
      saldoEsperado: caixa.saldoEsperado,
      saldoReal,
      diferenca: dif
    };
  }

  async historico(companyId: string, limitVal: number = 30): Promise<Caixa[]> {
    const { data } = await supabase.from(TABLE_CAIXA)
      .select('*')
      .eq('company_id', companyId)
      .order('date_key', { ascending: false })
      .limit(limitVal);

    return (data || []).map(this._mapCaixaToType);
  }

  async getTotalCancelados(companyId: string, dateKey: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('comandas')
        .select('total_consumed')
        .eq('company_id', companyId)
        .eq('date_key', dateKey)
        .eq('status', 'cancelada');

      if (error) {
        console.error('Erro ao buscar comandas canceladas:', error.message);
        return 0;
      }

      const total = (data || []).reduce((sum, comanda) => sum + (comanda.total_consumed || 0), 0);
      return total;
    } catch (error) {
      console.error('Erro ao calcular total cancelado:', error);
      return 0;
    }
  }

  // --- Mapper ---
  private _mapCaixaToType(row: any): Caixa {
    return {
      id: row.id,
      data: row.date_key,
      status: row.status,
      abertoPor: row.opened_by,
      abertoPorNome: row.opened_by_name,
      abertoAt: row.opened_at,
      valorInicial: row.initial_value || 0,
      vendasTotal: row.total_sales || 0,
      reforcosTotal: row.total_reinforcements || 0,
      sangriasTotal: row.total_bleedings || 0,
      saldoEsperado: row.expected_balance || 0,
      saldoReal: row.real_balance || 0,
      diferenca: row.difference || 0,
      movimentosCount: row.movements_count || 0,
      fechadoAt: row.closed_at,
      fechadoPor: row.closed_by,
      fechadoPorNome: row.closed_by_name,
      porForma: row.sales_by_method || { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
    };
  }
}

export default new CaixaService();

