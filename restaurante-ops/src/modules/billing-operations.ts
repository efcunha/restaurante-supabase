import { supabase } from '../auth/supabase.js';

type PaymentMethodType = 'card' | 'pix';
type ReconcileStatus = 'paid' | 'failed';

export interface BillingSnapshot {
  companyId: string;
  subscription: {
    id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    grace_period_end: string | null;
    plan_amount: number;
  } | null;
  paymentMethods: Array<{
    id: string;
    type: string;
    brand: string | null;
    last_four: string | null;
    is_default: boolean;
    updated_at: string;
  }>;
  invoices: Array<{
    id: string;
    status: string;
    amount: number;
    due_date: string;
    paid_at: string | null;
    payment_method_type: string | null;
    retry_count: number;
    last_retry_at: string | null;
  }>;
}

export interface BillingActionResult {
  ok: boolean;
  action: string;
  companyId: string;
  invoiceId?: string;
  message: string;
  subscriptionStatus?: string;
  webhookEventId?: string;
  alreadyProcessed?: boolean;
}

export interface ReconcileInput {
  companyId: string;
  idempotencyKey: string;
  eventType: string;
  paymentStatus: ReconcileStatus;
  invoiceId?: string;
  mpPaymentId?: string;
  paymentMethodType?: PaymentMethodType;
  errorCode?: string;
  payload?: Record<string, unknown>;
}

interface SubscriptionRow {
  id: string;
  status: string;
}

interface InvoiceRow {
  id: string;
  company_id: string;
  status: string;
  retry_count: number;
}

function plusDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function fetchCompanySubscription(companyId: string): Promise<SubscriptionRow> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    throw new Error('Assinatura nao encontrada para a empresa.');
  }

  return data;
}

async function fetchInvoiceForAction(companyId: string, invoiceId?: string): Promise<InvoiceRow> {
  if (invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, company_id, status, retry_count')
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      throw new Error('Invoice informada nao encontrada para a empresa.');
    }

    return data;
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('id, company_id, status, retry_count')
    .eq('company_id', companyId)
    .in('status', ['pending', 'failed'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Nenhuma invoice pendente/falha encontrada para regularizacao.');
  }

  return data;
}

async function insertAudit(
  companyId: string,
  eventType: string,
  actorId: string,
  oldStatus: string | null,
  newStatus: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('billing_audit_log')
    .insert({
      company_id: companyId,
      event_type: eventType,
      actor_type: 'user',
      actor_id: actorId,
      old_status: oldStatus,
      new_status: newStatus,
      details,
    });
}

export async function fetchBillingSnapshot(companyId: string): Promise<BillingSnapshot> {
  const [subRes, pmRes, invRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, status, trial_ends_at, current_period_end, grace_period_end, plan_amount')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('payment_methods')
      .select('id, type, brand, last_four, is_default, updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, status, amount, due_date, paid_at, payment_method_type, retry_count, last_retry_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    companyId,
    subscription: subRes.data ?? null,
    paymentMethods: pmRes.data ?? [],
    invoices: invRes.data ?? [],
  };
}

export async function regularizeByCard(
  companyId: string,
  actorId: string,
  invoiceId?: string,
): Promise<BillingActionResult> {
  const invoice = await fetchInvoiceForAction(companyId, invoiceId);

  const nextRetryCount = (invoice.retry_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      payment_method_type: 'card',
      retry_count: nextRetryCount,
      last_retry_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('company_id', companyId);

  if (updateError) {
    throw new Error(`Falha ao preparar regularizacao por cartao: ${updateError.message}`);
  }

  await insertAudit(
    companyId,
    'billing.regularize_card_requested',
    actorId,
    invoice.status,
    invoice.status,
    {
      invoice_id: invoice.id,
      retry_count: nextRetryCount,
    },
  );

  return {
    ok: true,
    action: 'regularize_card',
    companyId,
    invoiceId: invoice.id,
    message: 'Regularizacao por cartao solicitada e invoice marcada para nova tentativa.',
  };
}

export async function regularizeByPix(
  companyId: string,
  actorId: string,
  invoiceId?: string,
): Promise<BillingActionResult> {
  const invoice = await fetchInvoiceForAction(companyId, invoiceId);
  const now = Date.now();
  const pixCodeText = `pix://restaurante-ops/${invoice.id}/${now}`;

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'pending',
      payment_method_type: 'pix',
      pix_qr_code: null,
      pix_qr_code_text: pixCodeText,
      pix_expires_at: plusDaysIso(1),
      retry_count: (invoice.retry_count ?? 0) + 1,
      last_retry_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('company_id', companyId);

  if (updateError) {
    throw new Error(`Falha ao preparar regularizacao por pix: ${updateError.message}`);
  }

  await insertAudit(
    companyId,
    'billing.regularize_pix_requested',
    actorId,
    invoice.status,
    'pending',
    {
      invoice_id: invoice.id,
      pix_qr_code_text: pixCodeText,
    },
  );

  return {
    ok: true,
    action: 'regularize_pix',
    companyId,
    invoiceId: invoice.id,
    message: 'Regularizacao por pix solicitada e referencia de cobranca atualizada.',
  };
}

export async function reconcileBillingEvent(
  actorId: string,
  input: ReconcileInput,
): Promise<BillingActionResult> {
  const { companyId, idempotencyKey, eventType, paymentStatus, paymentMethodType, mpPaymentId, errorCode, payload } = input;
  const invoice = await fetchInvoiceForAction(companyId, input.invoiceId);
  const sub = await fetchCompanySubscription(companyId);

  const webhookInsert = await supabase
    .from('webhook_events')
    .insert({
      provider: 'mercadopago',
      event_type: eventType,
      idempotency_key: idempotencyKey,
      payload: payload ?? {},
    })
    .select('id')
    .single();

  if (webhookInsert.error) {
    if (webhookInsert.error.code === '23505') {
      return {
        ok: true,
        action: 'reconcile',
        companyId,
        invoiceId: invoice.id,
        alreadyProcessed: true,
        message: 'Evento de webhook ja processado para esta chave de idempotencia.',
      };
    }
    throw new Error(`Falha ao registrar evento de webhook: ${webhookInsert.error.message}`);
  }

  const webhookEventId = webhookInsert.data.id as string;

  if (paymentStatus === 'paid') {
    const nextStatus = ['past_due', 'grace_period', 'suspended'].includes(sub.status)
      ? 'reactivated'
      : 'active';

    const [invoiceUpdate, subUpdate] = await Promise.all([
      supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method_type: paymentMethodType ?? 'card',
          mp_payment_id: mpPaymentId ?? null,
          mp_error_code: null,
        })
        .eq('id', invoice.id)
        .eq('company_id', companyId),
      supabase
        .from('subscriptions')
        .update({
          status: nextStatus,
          current_period_start: new Date().toISOString(),
          current_period_end: plusDaysIso(30),
          grace_period_end: null,
        })
        .eq('id', sub.id)
        .eq('company_id', companyId),
    ]);

    if (invoiceUpdate.error || subUpdate.error) {
      await supabase
        .from('webhook_events')
        .update({ processed_at: new Date().toISOString(), error_message: invoiceUpdate.error?.message ?? subUpdate.error?.message ?? 'reconcile_failed' })
        .eq('id', webhookEventId);
      throw new Error('Falha ao reconciliar pagamento aprovado.');
    }

    await insertAudit(
      companyId,
      'payment.succeeded',
      actorId,
      sub.status,
      nextStatus,
      {
        invoice_id: invoice.id,
        mp_payment_id: mpPaymentId ?? null,
        event_type: eventType,
      },
    );

    await supabase
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString(), error_message: null })
      .eq('id', webhookEventId);

    return {
      ok: true,
      action: 'reconcile',
      companyId,
      invoiceId: invoice.id,
      webhookEventId,
      subscriptionStatus: nextStatus,
      message: 'Pagamento reconciliado com sucesso e assinatura atualizada.',
    };
  }

  const nextStatus = 'grace_period';
  const [invoiceUpdate, subUpdate] = await Promise.all([
    supabase
      .from('invoices')
      .update({
        status: 'failed',
        payment_method_type: paymentMethodType ?? 'card',
        mp_payment_id: mpPaymentId ?? null,
        mp_error_code: errorCode ?? 'payment_failed',
      })
      .eq('id', invoice.id)
      .eq('company_id', companyId),
    supabase
      .from('subscriptions')
      .update({
        status: nextStatus,
        grace_period_end: plusDaysIso(5),
      })
      .eq('id', sub.id)
      .eq('company_id', companyId),
  ]);

  if (invoiceUpdate.error || subUpdate.error) {
    await supabase
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString(), error_message: invoiceUpdate.error?.message ?? subUpdate.error?.message ?? 'reconcile_failed' })
      .eq('id', webhookEventId);
    throw new Error('Falha ao reconciliar pagamento com erro.');
  }

  await insertAudit(
    companyId,
    'payment.failed',
    actorId,
    sub.status,
    nextStatus,
    {
      invoice_id: invoice.id,
      mp_payment_id: mpPaymentId ?? null,
      mp_error_code: errorCode ?? null,
      event_type: eventType,
    },
  );

  await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), error_message: null })
    .eq('id', webhookEventId);

  return {
    ok: true,
    action: 'reconcile',
    companyId,
    invoiceId: invoice.id,
    webhookEventId,
    subscriptionStatus: nextStatus,
    message: 'Falha de pagamento reconciliada e assinatura movida para grace_period.',
  };
}