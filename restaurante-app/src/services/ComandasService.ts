/**
 * ComandasService - Gerencia contas abertas (comandas), totais e fechamento.
 */
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import { Comanda } from '../types';

const TABLE_COMANDAS = 'comandas';

const todayKey = (): string => getLocalDateKey();

class ComandasService {

  private _isMesaOpenConflict(error: any): boolean {
    if (!error || error.code !== '23505') return false;
    const detail = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    return detail.includes('idx_unique_open_mesa') || detail.includes('table_number');
  }

  // Helper to map DB row to Comanda type
  private _mapToComanda(row: any): Comanda {
    return {
      id: row.id,
      dateKey: row.date_key,
      comandaNumber: row.comanda_number,
      status: row.status,
      mesa: row.table_number || '',
      cliente: row.client_name || '',
      totalConsumido: row.total_consumed || 0,
      totalPago: row.total_paid || 0,
      saldoAberto: row.open_balance || 0,
      recebidoPor: row.received_by || [],
      abertaAt: row.opened_at,
      abertaPor: row.opened_by || '',
      abertaPorNome: row.opened_by_name || '',
      // Compatibilidade com UI
      criadaEm: row.created_at,
      horarioCriacao: new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),

      fechadaAt: row.closed_at,
      fechadaPor: row.closed_by,
      fechadaPorNome: row.closed_by_name,

      canceladaEm: row.canceled_at,
      canceladaPor: row.canceled_by,
      canceladaPorNome: row.canceled_by_name,
      motivoCancelamento: row.cancel_reason,

      atualizado: row.updated_at
    };
  }

  // Ensure comanda exists and is open
  async ensureComandaAberta(
    companyId: string,
    comandaNumber: string | number,
    usuarioId: string,
    usuarioNome: string,
    mesa: string = '',
    cliente: string = '',
    attemptCount: number = 0
  ): Promise<{ id: string; dateKey: string }> {
    console.log(`[ComandasService] ensureComandaAberta START - attempt ${attemptCount}, comanda ${comandaNumber}, mesa ${mesa}, cliente ${cliente}`);
    
    // ✅ FIX: Bounded retry logic - prevent infinite recursion
    if (attemptCount >= 2) {
      console.error('[ComandasService] Max attempts reached (2)');
      throw new Error('Failed to ensure comanda after 2 attempts');
    }

    if (!companyId) throw new Error("Company ID required");
    const dateK = todayKey();
    const numStr = String(comandaNumber);

    // 1. Check if exists — busca APENAS por company_id + date_key + comanda_number.
    // Nunca filtrar por table_number aqui: o ComandaNumberService reserva com table_number=''
    // e filtrar por mesa impediria encontrar essa reserva, causando INSERT duplicado (23505).
    const { data: existing } = await supabase
      .from(TABLE_COMANDAS)
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateK)
      .eq('comanda_number', numStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[ComandasService] SELECT result: ${existing ? `found id ${existing.id}, table_number=${existing.table_number}, client=${existing.client_name}` : 'not found'}`);

    if (existing) {
      // Update if needed
      const updates: any = {};
      let needsUpdate = false;

      // Reopen if closed? (Legacy logic did this, sticking to it)
      if (existing.status === 'fechada') {
        updates.status = 'aberta';
        needsUpdate = true;
      }

      if (mesa && existing.table_number !== mesa) {
        updates.table_number = mesa;
        needsUpdate = true;
      }

      // ✅ FIX: Recognize and update "Reservando..." placeholder from ComandaNumberService
      const invalidos = ['Não informado', 'Cliente Balcão', 'Cliente', 'Reservando...', '', null, undefined];
      const novoClienteValido = cliente && !invalidos.includes(cliente);
      if (novoClienteValido && existing.client_name !== cliente) {
        updates.client_name = cliente;
        needsUpdate = true;
      }

      // ✅ FIX: Also update if existing is "Reservando..." placeholder
      if (existing.client_name === 'Reservando...' && novoClienteValido) {
        updates.client_name = cliente;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`[ComandasService] Updating existing comanda ${existing.id} with:`, updates);
        const { error: updateError } = await supabase.from(TABLE_COMANDAS).update(updates).eq('id', existing.id);
        if (updateError) {
          if (this._isMesaOpenConflict(updateError) && mesa) {
            throw new Error(`Mesa ${mesa} já foi ocupada`);
          }
          throw updateError;
        }
      }

      console.log(`[ComandasService] ensureComandaAberta SUCCESS - found existing comanda id: ${existing.id}`);
      return { id: existing.id, dateKey: dateK };
    }

    // 2. Create New
    const { data: novo, error } = await supabase
      .from(TABLE_COMANDAS)
      .insert({
        company_id: companyId,
        date_key: dateK,
        comanda_number: numStr,
        status: 'aberta',
        table_number: mesa || '',
        client_name: cliente || 'Não informado',
        total_consumed: 0,
        total_paid: 0,
        open_balance: 0,
        opened_by: usuarioId,
        opened_by_name: usuarioNome,
        received_by: []
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { 
        if (this._isMesaOpenConflict(error) && mesa) {
          throw new Error(`Mesa ${mesa} já foi ocupada`);
        }
        // 23505 = Unique violation. Meaning another instance concurrently created this 'aberta' comanda just milliseconds ago!
        console.warn('[ComandasService] Empate (Race condition) identificado! Comanda foi criada milisegundos antes por outro usuário. Recuperando a existente...');
        
        // ✅ FIX: Bounded retry - only retry once
        if (attemptCount < 1) {
          console.log('[ComandasService] Retry SELECT with params:', { companyId, dateK, numStr, mesa });
          // Add small delay to handle race condition timing
          await new Promise(resolve => setTimeout(resolve, 100));
          return this.ensureComandaAberta(companyId, comandaNumber, usuarioId, usuarioNome, mesa, cliente, attemptCount + 1);
        } else {
          throw new Error('Failed to ensure comanda after 2 attempts');
        }
      }
      console.error("Erro ao criar comanda:", error.message);
      throw error;
    }

    console.log(`[ComandasService] ensureComandaAberta SUCCESS - comanda id: ${novo.id}`);
    return { id: novo.id, dateKey: dateK };
  }

  async adicionarConsumo(companyId: string, comandaNumber: string | number, valorAcrescentar: number | string) {
    if (!companyId) throw new Error("Company ID required");
    const dateK = todayKey();
    const numStr = String(comandaNumber);
    const valor = typeof valorAcrescentar === 'string' ? parseFloat(valorAcrescentar) : valorAcrescentar;

    if (isNaN(valor) || valor <= 0) return;

    const { data: mergedCheck } = await supabase
      .from(TABLE_COMANDAS)
      .select('id')
      .eq('company_id', companyId)
      .eq('date_key', dateK)
      .eq('comanda_number', numStr)
      .eq('status', 'merged')
      .limit(1)
      .maybeSingle();

    if (mergedCheck) {
      throw new Error('Comanda consolidada não pode receber novos consumos');
    }

    // 🔒 ATÔMICO: usa RPC para fazer o UPDATE direto no Postgres sem READ-MODIFY-WRITE.
    // Evita race condition quando múltiplos garçons adicionam pedidos à mesma comanda simultaneamente.
    const { error } = await supabase.rpc('adicionar_consumo_atomico', {
      p_company_id:      companyId,
      p_date_key:        dateK,
      p_comanda_number:  numStr,
      p_valor:           valor
    });

    if (error) {
      // Fallback: READ → WRITE caso a RPC ainda não exista no banco
      console.warn('[ComandasService] RPC adicionar_consumo_atomico falhou, usando fallback:', error.message);
      const { data: comanda } = await supabase
        .from(TABLE_COMANDAS)
        .select('id, total_consumed, total_paid')
        .eq('company_id', companyId)
        .eq('date_key', dateK)
        .eq('comanda_number', numStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!comanda) throw new Error('Comanda não encontrada');

      const novoTotal = Number(comanda.total_consumed || 0) + valor;
      const novoSaldo = Math.max(0, novoTotal - Number(comanda.total_paid || 0));

      await supabase.from(TABLE_COMANDAS).update({
        total_consumed: novoTotal,
        open_balance: novoSaldo,
        updated_at: new Date().toISOString()
      }).eq('id', comanda.id);
    }
  }

  async fecharComanda(companyId: string, comandaNumber: string | number, usuarioId: string, usuarioNome: string) {
    if (!companyId) throw new Error("Company ID required");
    const dateK = todayKey();
    const numStr = String(comandaNumber);

    const { data: comanda } = await supabase
      .from(TABLE_COMANDAS)
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateK)
      .eq('comanda_number', numStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!comanda) throw new Error('Comanda não encontrada');
    if (comanda.status === 'cancelada') throw new Error('Comanda cancelada não pode ser fechada');
    if (comanda.status === 'merged') throw new Error('Comanda consolidada não pode ser fechada diretamente');

    const saldo = Number(comanda.open_balance || 0);
    if (saldo > 0.01) throw new Error(`Saldo em aberto: R$ ${saldo.toFixed(2)}`);

    await supabase.from(TABLE_COMANDAS).update({
      status: 'fechada',
      open_balance: 0,
      closed_at: new Date().toISOString(),
      closed_by: usuarioId,
      closed_by_name: usuarioNome
    }).eq('id', comanda.id);
  }

  async listarComandasAbertas(companyId: string): Promise<Comanda[]> {
    if (!companyId) return [];

    const { data } = await supabase
      .from(TABLE_COMANDAS)
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', todayKey())
      .eq('status', 'aberta');

    // Ordenação numérica no cliente para evitar bug lexicográfico (ex: 1, 10, 2 se TEXT)
    const sorted = (data || []).sort((a, b) => {
      const aNum = parseInt(String(a.comanda_number), 10);
      const bNum = parseInt(String(b.comanda_number), 10);
      return (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
    });

    return sorted.map(this._mapToComanda);
  }

  async sincronizarTotalComanda(companyId: string, comandaNumber: string | number, totalReal: number) {
    if (!companyId) return;
    const dateK = todayKey();
    const numStr = String(comandaNumber);

    const { data: comanda } = await supabase
      .from(TABLE_COMANDAS)
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateK)
      .eq('comanda_number', numStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle just in case

    if (!comanda) return;

    const novoSaldo = Math.max(0, totalReal - Number(comanda.total_paid || 0));

    await supabase.from(TABLE_COMANDAS).update({
      total_consumed: totalReal,
      open_balance: novoSaldo,
      updated_at: new Date().toISOString()
    }).eq('id', comanda.id);
  }
}

export default new ComandasService();

