import { supabase } from '../auth/supabase.js';

interface ReconcileAtomicRpcResult {
  ok?: boolean;
  action?: string;
  companyId?: string;
  invoiceId?: string;
  webhookEventId?: string;
  subscriptionStatus?: string;
  message?: string;
  alreadyProcessed?: boolean;
}
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
  grace_period_end: string | null;
}

interface InvoiceRow {
  id: string;
  company_id: string;
  status: string;
  retry_count: number;
}

export class BillingOperationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = 'BillingOperationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function plusDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function fetchCompanySubscription(companyId: string): Promise<SubscriptionRow> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, grace_period_end')
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    throw new BillingOperationError(
      'Assinatura nao encontrada para a empresa.',
      'SUBSCRIPTION_NOT_FOUND',
      404,
    );
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
      throw new BillingOperationError(
        'Invoice informada nao encontrada para a empresa.',
        'INVOICE_NOT_FOUND',
        404,
      );
    }

    return data;
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('id, company_id, status, retry_count')
    .eq('company_id', companyId)
    .in('status', ['pending', 'failed'])
    .order('due_date', { ascending: true })
    .limit(2);

  if (error || !data || data.length === 0) {
    throw new BillingOperationError(
      'Nenhuma invoice pendente/falha encontrada para regularizacao.',
      'INVOICE_ACTION_TARGET_NOT_FOUND',
      404,
    );
  }

  if (data.length > 1) {
    throw new BillingOperationError(
      'Multiplas invoices elegiveis encontradas. Informe invoiceId explicitamente.',
      'INVOICE_ACTION_AMBIGUOUS',
      409,
    );
  }

  return data[0];
}

function assertInvoiceTransitionAllowed(currentStatus: string, paymentStatus: ReconcileStatus): void {
  if (paymentStatus === 'paid') {
    if (currentStatus === 'paid') {
      throw new BillingOperationError(
        'Invoice ja esta paga. Reconcile paid nao pode ser reaplicado com nova chave.',
        'INVOICE_ALREADY_PAID',
        409,
      );
    }

    if (currentStatus === 'cancelled') {
      throw new BillingOperationError(
        'Invoice cancelada nao pode ser reconciliada como paga.',
        'INVOICE_CANCELLED',
        409,
      );
    }

    return;
  }

  if (currentStatus === 'paid') {
    throw new BillingOperationError(
      'Invoice paga nao pode ser reconciliada como falha.',
      'INVOICE_ALREADY_PAID',
      409,
    );
  }

  if (currentStatus === 'cancelled') {
    throw new BillingOperationError(
      'Invoice cancelada nao pode ser reconciliada como falha.',
      'INVOICE_CANCELLED',
      409,
    );
  }
}

function mapReconcileRpcError(message: string): BillingOperationError {
  const [rawCode, ...rest] = message.split(':');
  const code = rawCode?.trim() || 'RECONCILE_INTERNAL_ERROR';
  const details = rest.join(':').trim() || message;

  const statusMap: Record<string, number> = {
    INVALID_PAYMENT_STATUS: 400,
    INVALID_PAYMENT_METHOD: 400,
    SUBSCRIPTION_NOT_FOUND: 404,
    INVOICE_NOT_FOUND: 404,
    INVOICE_ACTION_TARGET_NOT_FOUND: 404,
    INVOICE_ACTION_AMBIGUOUS: 409,
    INVOICE_ALREADY_PAID: 409,
    INVOICE_CANCELLED: 409,
    SUBSCRIPTION_CANCELLED_MANUAL_REACTIVATION_REQUIRED: 409,
  };

  return new BillingOperationError(details, code, statusMap[code] ?? 500);
}

export interface BillingAuditEntry {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  old_status: string | null;
  new_status: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export async function fetchBillingAudit(
  companyId: string,
  limit = 30,
): Promise<BillingAuditEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from('billing_audit_log')
    .select('id, event_type, actor_type, actor_id, old_status, new_status, details, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !data) return [];
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

  const { data, error } = await supabase.rpc('reconcile_billing_event_atomic', {
    p_company_id: companyId,
    p_actor_id: actorId,
    p_idempotency_key: idempotencyKey,
    p_event_type: eventType,
    p_payment_status: paymentStatus,
    p_invoice_id: input.invoiceId ?? null,
    p_mp_payment_id: mpPaymentId ?? null,
    p_payment_method_type: paymentMethodType ?? null,
    p_error_code: errorCode ?? null,
    p_payload: payload ?? {},
  });

  if (error) {
    throw mapReconcileRpcError(error.message || 'Falha ao reconciliar evento de billing');
  }

  const rpc = (data ?? {}) as ReconcileAtomicRpcResult;
  return {
    ok: Boolean(rpc.ok),
    action: rpc.action ?? 'reconcile',
    companyId: rpc.companyId ?? companyId,
    invoiceId: rpc.invoiceId,
    webhookEventId: rpc.webhookEventId,
    subscriptionStatus: rpc.subscriptionStatus,
    alreadyProcessed: rpc.alreadyProcessed,
    message: rpc.message ?? 'Reconcile executado.',
  };
}