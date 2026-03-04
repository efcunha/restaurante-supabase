/**
 * ComandasService - Gerencia contas abertas (comandas), totais e fechamento.
 */
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import { Comanda } from '../types';

const TABLE_COMANDAS = 'comandas';

const todayKey = (): string => getLocalDateKey();

class ComandasService {

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
    cliente: string = ''
  ): Promise<{ id: string; dateKey: string }> {
    if (!companyId) throw new Error("Company ID required");
    const dateK = todayKey();
    const numStr = String(comandaNumber);

    // 1. Check if exists
    // We search by (company, date, number) - assuming unique per day
    const { data: existing } = await supabase
      .from(TABLE_COMANDAS)
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateK)
      .eq('comanda_number', numStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

      const invalidos = ['Não informado', 'Cliente Balcão', 'Cliente', '', null, undefined];
      const novoClienteValido = cliente && !invalidos.includes(cliente);
      if (novoClienteValido && existing.client_name !== cliente) {
        updates.client_name = cliente;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase.from(TABLE_COMANDAS).update(updates).eq('id', existing.id);
      }

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
      console.error("Erro ao criar comanda:", error.message);
      throw error;
    }

    return { id: novo.id, dateKey: dateK };
  }

  async adicionarConsumo(companyId: string, comandaNumber: string | number, valorAcrescentar: number | string) {
    if (!companyId) throw new Error("Company ID required");
    const dateK = todayKey();
    const numStr = String(comandaNumber);
    const valor = typeof valorAcrescentar === 'string' ? parseFloat(valorAcrescentar) : valorAcrescentar;

    if (isNaN(valor)) return;

    // Supabase doesn't support atomic increment easily on 'update' without stored procedure or raw SQL.
    // For simplicity/migration, we READ -> CALCULATE -> WRITE.
    // Ideally use RPC for atomicity.

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

    const novoTotal = Number(comanda.total_consumed || 0) + valor;
    const novoSaldo = Math.max(0, novoTotal - Number(comanda.total_paid || 0));

    await supabase.from(TABLE_COMANDAS).update({
      total_consumed: novoTotal,
      open_balance: novoSaldo,
      updated_at: new Date().toISOString()
    }).eq('id', comanda.id);
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
      .eq('status', 'aberta')
      .order('comanda_number', { ascending: true }); // String sort might be 1, 10, 2... but ok for now

    return (data || []).map(this._mapToComanda);
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

