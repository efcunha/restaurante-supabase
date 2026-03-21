/**
 * Camada de acesso a dados para os paineis do restaurante-ops.
 * Usa o cliente service-role do Supabase (bypass RLS para operacoes admin).
 * Todos os helpers retornam dados ou defaults seguros em caso de falha.
 */
import { supabase } from '../auth/supabase.js';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface KpiCounts {
  active: number;
  trialing: number;
  pastDue: number;
  mrr: number; // em reais (ex: 1490.00)
}

export interface CompanyRow {
  id: string;
  name: string;
  plan: string | null;
  active: boolean;
  created_at: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

export interface InvoiceStats {
  pending: number;
  paidToday: number;
  overdue: number;
}

export interface InvoiceRow {
  id: string;
  company_name: string;
  amount: number; // centavos
  status: string;
  due_date: string;
  paid_at: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function brl(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

export { brl };

function safeCount(data: { count: number | null }[] | null): number {
  if (!data || data.length === 0) return 0;
  return data[0].count ?? 0;
}

// ─── KPIs do dashboard ──────────────────────────────────────────────────────

export async function fetchKpiCounts(): Promise<KpiCounts> {
  try {
    const [activeRes, trialingRes, pastDueRes, mrrRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'active'),

      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'trialing'),

      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .in('status', ['past_due', 'grace_period', 'suspended']),

      supabase
        .from('subscriptions')
        .select('plan_amount')
        .eq('status', 'active'),
    ]);

    const mrr = mrrRes.data
      ? mrrRes.data.reduce((sum, row) => sum + (row.plan_amount ?? 0), 0)
      : 0;

    return {
      active: activeRes.count ?? 0,
      trialing: trialingRes.count ?? 0,
      pastDue: pastDueRes.count ?? 0,
      mrr: mrr / 100,
    };
  } catch {
    return { active: 0, trialing: 0, pastDue: 0, mrr: 0 };
  }
}

// ─── Lista de empresas com status de assinatura ──────────────────────────────

export async function fetchRecentCompanies(limit = 20): Promise<CompanyRow[]> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        plan,
        active,
        created_at,
        subscriptions (
          status,
          trial_ends_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => {
      const sub = Array.isArray(row.subscriptions)
        ? row.subscriptions[0]
        : row.subscriptions;
      return {
        id: row.id,
        name: row.name,
        plan: row.plan,
        active: row.active,
        created_at: row.created_at,
        subscription_status: sub?.status ?? null,
        trial_ends_at: sub?.trial_ends_at ?? null,
      };
    });
  } catch {
    return [];
  }
}

// ─── Totais de invoices ──────────────────────────────────────────────────────

export async function fetchInvoiceStats(): Promise<InvoiceStats> {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [pendingRes, paidRes, overdueRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'pending'),

      supabase
        .from('invoices')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('paid_at', `${today}T00:00:00Z`),

      supabase
        .from('invoices')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('due_date', today),
    ]);

    return {
      pending: pendingRes.count ?? 0,
      paidToday: paidRes.count ?? 0,
      overdue: overdueRes.count ?? 0,
    };
  } catch {
    return { pending: 0, paidToday: 0, overdue: 0 };
  }
}

// ─── Invoices recentes com nome da empresa ───────────────────────────────────

export async function fetchRecentInvoices(limit = 15): Promise<InvoiceRow[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        status,
        due_date,
        paid_at,
        companies (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      company_name: row.companies?.name ?? '—',
      amount: row.amount,
      status: row.status,
      due_date: row.due_date,
      paid_at: row.paid_at,
    }));
  } catch {
    return [];
  }
}

// ─── Metricas SaaS ───────────────────────────────────────────────────────────

export interface SaasMetrics {
  mrr: number;
  totalCompanies: number;
  activeCompanies: number;
  cancelledThisMonth: number;
  conversionRate: string; // ex: "72%"
}

export async function fetchSaasMetrics(): Promise<SaasMetrics> {
  try {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const start = firstOfMonth.toISOString();

    const [kpis, totalRes, cancelledRes, trialingRes, convertedRes] = await Promise.all([
      fetchKpiCounts(),

      supabase
        .from('companies')
        .select('count', { count: 'exact', head: true })
        .eq('active', true),

      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', start),

      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'trialing'),

      supabase
        .from('subscriptions')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', start),
    ]);

    const total = totalRes.count ?? 0;
    const trialing = trialingRes.count ?? 1; // evita divisao por zero
    const converted = convertedRes.count ?? 0;
    const conversionRate =
      trialing > 0 ? `${Math.round((converted / trialing) * 100)}%` : '—';

    return {
      mrr: kpis.mrr,
      totalCompanies: total,
      activeCompanies: kpis.active,
      cancelledThisMonth: cancelledRes.count ?? 0,
      conversionRate,
    };
  } catch {
    return {
      mrr: 0,
      totalCompanies: 0,
      activeCompanies: 0,
      cancelledThisMonth: 0,
      conversionRate: '—',
    };
  }
}
