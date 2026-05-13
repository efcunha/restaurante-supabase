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

export interface BillingOpsMetrics {
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  failedCount: number;
  pendingAmount: number;
  overdueAmount: number;
  collectedThisMonth: number;
}

export interface RevenuePoint {
  monthKey: string;
  label: string;
  amount: number;
}

export interface SubscriptionBreakdown {
  active: number;
  trialing: number;
  pastDue: number;
  suspended: number;
  cancelled: number;
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

function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${month}/${year.slice(2)}`;
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

export async function fetchBillingOpsMetrics(): Promise<BillingOpsMetrics> {
  try {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const next7Key = next7.toISOString().slice(0, 10);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString();

    const [pendingRowsRes, paidThisMonthRes, failedCountRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('amount, due_date')
        .eq('status', 'pending'),

      supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', firstOfMonth),

      supabase
        .from('invoices')
        .select('count', { count: 'exact', head: true })
        .in('status', ['failed', 'cancelled']),
    ]);

    const pendingRows = pendingRowsRes.data ?? [];

    let pendingAmount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;

    for (const row of pendingRows) {
      const amount = row.amount ?? 0;
      const dueDate = row.due_date ?? '';
      pendingAmount += amount;

      if (dueDate && dueDate < todayKey) {
        overdueCount += 1;
        overdueAmount += amount;
      } else if (dueDate && dueDate >= todayKey && dueDate <= next7Key) {
        dueSoonCount += 1;
      }
    }

    const collectedThisMonth = (paidThisMonthRes.data ?? [])
      .reduce((sum, row) => sum + (row.amount ?? 0), 0);

    return {
      pendingCount: pendingRows.length,
      overdueCount,
      dueSoonCount,
      failedCount: failedCountRes.count ?? 0,
      pendingAmount,
      overdueAmount,
      collectedThisMonth,
    };
  } catch {
    return {
      pendingCount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      failedCount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      collectedThisMonth: 0,
    };
  }
}

export async function fetchRevenueSeries(months = 6): Promise<RevenuePoint[]> {
  try {
    const anchor = new Date();
    anchor.setDate(1);
    anchor.setHours(0, 0, 0, 0);
    anchor.setMonth(anchor.getMonth() - (months - 1));

    const [seriesStartKey, nowKey] = [monthKey(anchor), monthKey(new Date())];

    const timeline: RevenuePoint[] = [];
    const cursor = new Date(anchor);
    while (monthKey(cursor) <= nowKey) {
      const key = monthKey(cursor);
      timeline.push({ monthKey: key, label: monthLabel(key), amount: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', `${seriesStartKey}-01T00:00:00Z`);

    if (error || !data) return timeline;

    const byMonth = new Map(timeline.map((p) => [p.monthKey, p.amount]));
    for (const row of data) {
      if (!row.paid_at) continue;
      const key = row.paid_at.slice(0, 7);
      if (!byMonth.has(key)) continue;
      byMonth.set(key, (byMonth.get(key) ?? 0) + (row.amount ?? 0));
    }

    return timeline.map((point) => ({
      ...point,
      amount: byMonth.get(point.monthKey) ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function fetchSubscriptionBreakdown(): Promise<SubscriptionBreakdown> {
  try {
    const [active, trialing, pastDue, suspended, cancelled] = await Promise.all([
      supabase.from('subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'trialing'),
      supabase.from('subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'past_due'),
      supabase.from('subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'suspended'),
      supabase.from('subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);

    return {
      active: active.count ?? 0,
      trialing: trialing.count ?? 0,
      pastDue: pastDue.count ?? 0,
      suspended: suspended.count ?? 0,
      cancelled: cancelled.count ?? 0,
    };
  } catch {
    return { active: 0, trialing: 0, pastDue: 0, suspended: 0, cancelled: 0 };
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
