import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { supabase } from '../auth/supabase.js';
import { buildEnv } from '../config/env.js';
import { logError, logInfo, logWarn } from '../lib/logger.js';

const env = buildEnv();

const PAYMENT_OPERATOR_ROLES = new Set(['admin', 'gerente', 'garcom', 'caixa']);

export type PaymentMethod = 'cartao_credito' | 'cartao_debito';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
export type PaymentNextAction = 'none' | 'await_terminal' | 'await_webhook' | 'retry_allowed';

export interface PaymentOperatorIdentity {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string;
}

export interface InitiatePaymentInput {
  companyId: string;
  comandaNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface PaymentTransactionRecord {
  id: string;
  companyId: string;
  comandaNumber: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  provider: string;
  providerPaymentId: string;
  providerStatus: string;
  status: PaymentStatus;
  idempotencyKey: string;
  correlationId: string;
  authCode: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  lastWebhookEventId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusView {
  transactionId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  nextAction: PaymentNextAction;
  amount: number;
  paymentMethod: PaymentMethod;
  message: string;
  createdAt: string;
  updatedAt: string;
  correlationId: string;
}

export interface InitiatePaymentResult extends PaymentStatusView {
  provider: string;
  authCode?: string;
}

export interface WebhookProcessResult {
  ok: true;
  applied: boolean;
  duplicate: boolean;
  transitionSkipped: boolean;
  transactionId: string;
  providerPaymentId: string;
  status: PaymentStatus;
}

export interface GatewayConfigRecord {
  id: string;
  companyId: string;
  provider: string;
  terminalId: string;
  hyperswitchMerchantId: string;
  hyperswitchProfileId: string;
  active: boolean;
}

interface PaymentGatewayRepository {
  getGatewayConfig(companyId: string): Promise<GatewayConfigRecord | null>;
  findTransactionByIdempotencyKey(companyId: string, idempotencyKey: string): Promise<PaymentTransactionRecord | null>;
  insertTransaction(input: {
    companyId: string;
    comandaNumber: string;
    amountCents: number;
    paymentMethod: PaymentMethod;
    provider: string;
    providerPaymentId: string;
    providerStatus: string;
    status: PaymentStatus;
    idempotencyKey: string;
    correlationId: string;
    authCode: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    lastWebhookEventId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentTransactionRecord>;
  findTransactionById(companyId: string, transactionId: string): Promise<PaymentTransactionRecord | null>;
  findTransactionByProviderPaymentId(providerPaymentId: string): Promise<PaymentTransactionRecord | null>;
  updateTransaction(
    transactionId: string,
    patch: Partial<Pick<PaymentTransactionRecord, 'providerStatus' | 'status' | 'authCode' | 'errorCode' | 'errorMessage' | 'lastWebhookEventId' | 'metadata'>>,
  ): Promise<PaymentTransactionRecord>;
}

interface GatewayInitiationResult {
  providerPaymentId: string;
  providerStatus: string;
  status: PaymentStatus;
  authCode?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  raw?: Record<string, unknown>;
}

interface GatewayClient {
  initiatePayment(input: {
    amountCents: number;
    paymentMethod: PaymentMethod;
    companyId: string;
    comandaNumber: string;
    correlationId: string;
    gatewayConfig: GatewayConfigRecord;
  }): Promise<GatewayInitiationResult>;
}

interface PaymentProfile {
  full_name: string | null;
  role: string | null;
  company_id: string | null;
}

export class PaymentGatewayError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentGatewayError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function sanitizeText(value: string | null | undefined, maxLength = 120): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>`]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeProviderMessage(value: string | null | undefined): string | null {
  const safe = sanitizeText(value, 240)
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, '[REDACTED]')
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_]+/g, '[REDACTED]');
  return safe || null;
}

function sanitizeErrorCode(value: string | null | undefined): string | null {
  const safe = sanitizeText(value, 64).replace(/[^A-Za-z0-9_.-]/g, '_');
  return safe || null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return asRecord(source[key]);
}

function getNestedString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' ? value : null;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    const safeKey = sanitizeText(key, 64);
    if (!safeKey) continue;

    if (entry == null) {
      output[safeKey] = entry;
      continue;
    }

    if (typeof entry === 'string') {
      output[safeKey] = sanitizeProviderMessage(entry);
      continue;
    }

    if (typeof entry === 'number' || typeof entry === 'boolean') {
      output[safeKey] = entry;
      continue;
    }

    if (Array.isArray(entry)) {
      output[safeKey] = entry.slice(0, 25).map((item) => {
        if (typeof item === 'string') return sanitizeProviderMessage(item);
        if (item && typeof item === 'object') return sanitizeMetadata(item);
        return item;
      });
      continue;
    }

    if (typeof entry === 'object') {
      output[safeKey] = sanitizeMetadata(entry);
    }
  }

  return output;
}

export function normalizePaymentRole(role: string | null | undefined): string | null {
  const normalized = sanitizeText(role, 40).toLowerCase();
  if (!normalized) return null;

  if (normalized === 'manager') return 'gerente';
  if (normalized === 'waiter') return 'garcom';
  if (normalized === 'cashier') return 'caixa';
  return normalized;
}

export function validateInitiatePaymentInput(input: Partial<InitiatePaymentInput>): string | null {
  if (!input.companyId || !input.comandaNumber || input.amount == null || !input.paymentMethod || !input.idempotencyKey) {
    return 'Campos obrigatorios: companyId, comandaNumber, amount, paymentMethod, idempotencyKey.';
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.companyId)) {
    return 'companyId invalido. Informe UUID valido.';
  }

  const comandaNumber = sanitizeText(input.comandaNumber, 32);
  if (!/^\d{1,10}$/.test(comandaNumber)) {
    return 'comandaNumber invalido. Informe apenas numeros.';
  }

  if (!Number.isInteger(input.amount) || Number(input.amount) <= 0) {
    return 'amount deve ser inteiro positivo em centavos.';
  }

  if (input.paymentMethod !== 'cartao_credito' && input.paymentMethod !== 'cartao_debito') {
    return 'paymentMethod deve ser cartao_credito ou cartao_debito.';
  }

  const idempotencyKey = sanitizeText(input.idempotencyKey, 120);
  if (idempotencyKey.length < 8) {
    return 'idempotencyKey deve ter pelo menos 8 caracteres.';
  }

  return null;
}

export function mapGatewayStatus(rawStatus: string | null | undefined): PaymentStatus {
  const normalized = sanitizeText(rawStatus, 80).toLowerCase();
  const map: Record<string, PaymentStatus> = {
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    pending: 'pending',
    requires_action: 'processing',
    requires_customer_action: 'processing',
    requires_capture: 'processing',
    processing: 'processing',
    partially_captured: 'processing',
    partially_captured_and_capturable: 'processing',
    succeeded: 'succeeded',
    success: 'succeeded',
    charged: 'succeeded',
    failed: 'failed',
    failure: 'failed',
    declined: 'failed',
    authorization_failed: 'failed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    voided: 'cancelled',
  };
  return map[normalized] ?? 'pending';
}

export function canTransitionPaymentStatus(current: PaymentStatus, next: PaymentStatus): boolean {
  if (current === next) return true;
  if (current === 'succeeded' || current === 'cancelled' || current === 'failed') {
    return false;
  }
  return true;
}

export function deriveNextAction(status: PaymentStatus): PaymentNextAction {
  if (status === 'pending' || status === 'processing') {
    return 'await_webhook';
  }

  if (status === 'failed' || status === 'cancelled') {
    return 'retry_allowed';
  }

  return 'none';
}

export function buildPaymentStatusMessage(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'Pagamento presencial criado e aguardando confirmacao.';
    case 'processing':
      return 'Pagamento presencial em processamento na maquininha.';
    case 'succeeded':
      return 'Pagamento presencial aprovado.';
    case 'failed':
      return 'Pagamento presencial recusado ou falhou no adquirente.';
    case 'cancelled':
      return 'Pagamento presencial cancelado.';
  }
}

export function verifyHyperswitchSignature(rawBody: string, signatureHeader: string | null | undefined, secret: string): boolean {
  const signature = sanitizeText(signatureHeader, 200);
  if (!signature || !secret) {
    return false;
  }

  const candidates = signature
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.includes('=') ? entry.split('=').slice(1).join('=') : entry)
    .map((entry) => entry.trim());

  const digest = createHmac('sha256', secret).update(rawBody, 'utf-8').digest('hex');
  const digestBuffer = Buffer.from(digest, 'utf-8');

  return candidates.some((candidate) => {
    if (candidate.length !== digest.length) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(candidate, 'utf-8'), digestBuffer);
    } catch {
      return false;
    }
  });
}

export async function authenticatePaymentOperator(
  authorizationHeader: string | string[] | undefined,
): Promise<PaymentOperatorIdentity | null> {
  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  if (!match) {
    return null;
  }

  const token = sanitizeText(match[1], 4096);
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, company_id')
    .eq('id', data.user.id)
    .single<PaymentProfile>();

  if (profileError || !profile?.company_id) {
    return null;
  }

  const normalizedRole = normalizePaymentRole(profile.role);
  if (!normalizedRole || !PAYMENT_OPERATOR_ROLES.has(normalizedRole)) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    fullName: profile.full_name,
    role: normalizedRole,
    companyId: profile.company_id,
  };
}

function mapTransactionRow(row: Record<string, unknown>): PaymentTransactionRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    comandaNumber: String(row.comanda_number),
    amountCents: Number(row.amount_cents),
    paymentMethod: String(row.payment_method) as PaymentMethod,
    provider: String(row.provider),
    providerPaymentId: String(row.provider_payment_id),
    providerStatus: String(row.provider_status),
    status: String(row.status) as PaymentStatus,
    idempotencyKey: String(row.idempotency_key),
    correlationId: String(row.correlation_id),
    authCode: row.auth_code ? String(row.auth_code) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    lastWebhookEventId: row.last_webhook_event_id ? String(row.last_webhook_event_id) : null,
    metadata: sanitizeMetadata(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function isMissingRowError(code: string | undefined, message: string | undefined): boolean {
  return code === 'PGRST116' || (message ?? '').toLowerCase().includes('no rows');
}

const defaultRepository: PaymentGatewayRepository = {
  async getGatewayConfig(companyId) {
    const { data, error } = await supabase
      .from('payment_gateway_configs')
      .select('id, company_id, provider, terminal_id, hyperswitch_merchant_id, hyperswitch_profile_id, active')
      .eq('company_id', companyId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      if (isMissingRowError(error.code, error.message)) {
        return null;
      }
      throw new PaymentGatewayError('Nao foi possivel consultar a configuracao de gateway.', 'internal_error', 500);
    }

    if (!data) return null;

    return {
      id: String(data.id),
      companyId: String(data.company_id),
      provider: String(data.provider),
      terminalId: String(data.terminal_id),
      hyperswitchMerchantId: String(data.hyperswitch_merchant_id),
      hyperswitchProfileId: String(data.hyperswitch_profile_id),
      active: Boolean(data.active),
    };
  },

  async findTransactionByIdempotencyKey(companyId, idempotencyKey) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      if (isMissingRowError(error.code, error.message)) return null;
      throw new PaymentGatewayError('Nao foi possivel consultar a transacao existente.', 'internal_error', 500);
    }

    return data ? mapTransactionRow(data) : null;
  },

  async insertTransaction(input) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        company_id: input.companyId,
        comanda_number: input.comandaNumber,
        amount_cents: input.amountCents,
        payment_method: input.paymentMethod,
        provider: input.provider,
        provider_payment_id: input.providerPaymentId,
        provider_status: input.providerStatus,
        status: input.status,
        idempotency_key: input.idempotencyKey,
        correlation_id: input.correlationId,
        auth_code: input.authCode,
        error_code: input.errorCode,
        error_message: input.errorMessage,
        last_webhook_event_id: input.lastWebhookEventId ?? null,
        metadata: sanitizeMetadata(input.metadata),
      })
      .select('*')
      .single();

    if (error) {
      if (String(error.code) === '23505') {
        const existing = await defaultRepository.findTransactionByIdempotencyKey(input.companyId, input.idempotencyKey);
        if (existing) return existing;
      }
      throw new PaymentGatewayError('Nao foi possivel registrar a transacao presencial.', 'internal_error', 500);
    }

    return mapTransactionRow(data);
  },

  async findTransactionById(companyId, transactionId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', transactionId)
      .maybeSingle();

    if (error) {
      if (isMissingRowError(error.code, error.message)) return null;
      throw new PaymentGatewayError('Nao foi possivel consultar a transacao.', 'internal_error', 500);
    }

    return data ? mapTransactionRow(data) : null;
  },

  async findTransactionByProviderPaymentId(providerPaymentId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('provider_payment_id', providerPaymentId)
      .maybeSingle();

    if (error) {
      if (isMissingRowError(error.code, error.message)) return null;
      throw new PaymentGatewayError('Nao foi possivel localizar a transacao do webhook.', 'internal_error', 500);
    }

    return data ? mapTransactionRow(data) : null;
  },

  async updateTransaction(transactionId, patch) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        provider_status: patch.providerStatus,
        status: patch.status,
        auth_code: patch.authCode,
        error_code: patch.errorCode,
        error_message: patch.errorMessage,
        last_webhook_event_id: patch.lastWebhookEventId,
        metadata: patch.metadata ? sanitizeMetadata(patch.metadata) : undefined,
      })
      .eq('id', transactionId)
      .select('*')
      .single();

    if (error) {
      throw new PaymentGatewayError('Nao foi possivel atualizar a transacao presencial.', 'internal_error', 500);
    }

    return mapTransactionRow(data);
  },
};

function readJsonSafe(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const defaultGatewayClient: GatewayClient = {
  async initiatePayment(input) {
    if (env.PDV_DEVICE_SIMULATION) {
      return {
        providerPaymentId: `sim_${randomUUID()}`,
        providerStatus: 'processing',
        status: 'processing',
        raw: {
          simulation: true,
          terminal_id: input.gatewayConfig.terminalId,
        },
      };
    }

    if (!env.HYPERSWITCH_BASE_URL || !env.HYPERSWITCH_API_KEY) {
      throw new PaymentGatewayError(
        'Gateway presencial indisponivel. Verifique a configuracao server-side.',
        'provider_unavailable',
        503,
      );
    }

    const response = await fetch(`${env.HYPERSWITCH_BASE_URL.replace(/\/$/, '')}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.HYPERSWITCH_API_KEY,
        'x-correlation-id': input.correlationId,
      },
      body: JSON.stringify({
        amount: input.amountCents,
        currency: 'BRL',
        payment_method: 'card',
        payment_method_type: 'card_present',
        capture_method: 'automatic',
        confirm: true,
        merchant_id: input.gatewayConfig.hyperswitchMerchantId,
        profile_id: input.gatewayConfig.hyperswitchProfileId,
        metadata: {
          company_id: input.companyId,
          comanda_number: input.comandaNumber,
          terminal_id: input.gatewayConfig.terminalId,
          correlation_id: input.correlationId,
        },
        description: `Comanda ${input.comandaNumber}`,
        payment_method_data: {
          type: input.paymentMethod === 'cartao_credito' ? 'credit' : 'debit',
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const rawText = await response.text();
    const payload = readJsonSafe(rawText);
    const errorPayload = getNestedRecord(payload, 'error');
    const paymentMethodData = getNestedRecord(payload, 'payment_method_data');
    const cardPayload = paymentMethodData ? getNestedRecord(paymentMethodData, 'card') : null;
    if (!response.ok) {
      throw new PaymentGatewayError(
        sanitizeProviderMessage(
          String(getNestedString(errorPayload ?? {}, 'message') ?? getNestedString(payload, 'message') ?? response.statusText),
        ) || 'Nao foi possivel iniciar o pagamento presencial.',
        'provider_unavailable',
        response.status >= 500 ? 503 : 502,
      );
    }

    const providerStatus = sanitizeText(String(getNestedString(payload, 'status') ?? 'processing'), 80).toLowerCase() || 'processing';
    return {
      providerPaymentId: sanitizeText(String(getNestedString(payload, 'payment_id') ?? getNestedString(payload, 'id') ?? randomUUID()), 120),
      providerStatus,
      status: mapGatewayStatus(providerStatus),
      authCode: sanitizeText(String(getNestedString(cardPayload ?? {}, 'auth_code') ?? ''), 80) || null,
      errorCode: sanitizeErrorCode(String(getNestedString(errorPayload ?? {}, 'code') ?? '')),
      errorMessage: sanitizeProviderMessage(String(getNestedString(errorPayload ?? {}, 'message') ?? '')),
      raw: sanitizeMetadata(payload),
    };
  },
};

function toStatusView(transaction: PaymentTransactionRecord): PaymentStatusView {
  return {
    transactionId: transaction.id,
    providerPaymentId: transaction.providerPaymentId,
    status: transaction.status,
    nextAction: deriveNextAction(transaction.status),
    amount: transaction.amountCents,
    paymentMethod: transaction.paymentMethod,
    message: buildPaymentStatusMessage(transaction.status),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    correlationId: transaction.correlationId,
  };
}

export async function initiatePayment(
  input: InitiatePaymentInput,
  deps: { repository?: PaymentGatewayRepository; gatewayClient?: GatewayClient } = {},
): Promise<InitiatePaymentResult> {
  const validationError = validateInitiatePaymentInput(input);
  if (validationError) {
    throw new PaymentGatewayError(validationError, 'invalid_request', 400);
  }

  const repository = deps.repository ?? defaultRepository;
  const gatewayClient = deps.gatewayClient ?? defaultGatewayClient;

  const existing = await repository.findTransactionByIdempotencyKey(input.companyId, input.idempotencyKey);
  if (existing) {
    return {
      ...toStatusView(existing),
      provider: existing.provider,
      authCode: existing.authCode ?? undefined,
    };
  }

  const gatewayConfig = await repository.getGatewayConfig(input.companyId);
  if (!gatewayConfig) {
    throw new PaymentGatewayError(
      'Gateway presencial nao configurado para esta empresa.',
      'gateway_not_configured',
      404,
    );
  }

  const correlationId = input.idempotencyKey;
  const gatewayResult = await gatewayClient.initiatePayment({
    amountCents: input.amount,
    paymentMethod: input.paymentMethod,
    companyId: input.companyId,
    comandaNumber: input.comandaNumber,
    correlationId,
    gatewayConfig,
  });

  const created = await repository.insertTransaction({
    companyId: input.companyId,
    comandaNumber: sanitizeText(input.comandaNumber, 32),
    amountCents: input.amount,
    paymentMethod: input.paymentMethod,
    provider: gatewayConfig.provider,
    providerPaymentId: gatewayResult.providerPaymentId,
    providerStatus: gatewayResult.providerStatus,
    status: gatewayResult.status,
    idempotencyKey: sanitizeText(input.idempotencyKey, 120),
    correlationId,
    authCode: gatewayResult.authCode ?? null,
    errorCode: sanitizeErrorCode(gatewayResult.errorCode),
    errorMessage: sanitizeProviderMessage(gatewayResult.errorMessage),
    metadata: {
      provider: gatewayConfig.provider,
      gateway: 'hyperswitch',
      response: sanitizeMetadata(gatewayResult.raw),
    },
  });

  logInfo('payments.initiated', {
    company_id: created.companyId,
    user_id: undefined,
    metadata: {
      transactionId: created.id,
      providerPaymentId: created.providerPaymentId,
      status: created.status,
      paymentMethod: created.paymentMethod,
    },
  });

  return {
    ...toStatusView(created),
    provider: created.provider,
    authCode: created.authCode ?? undefined,
  };
}

export async function getPaymentStatus(
  companyId: string,
  transactionId: string,
  deps: { repository?: PaymentGatewayRepository } = {},
): Promise<PaymentStatusView> {
  const repository = deps.repository ?? defaultRepository;
  const transaction = await repository.findTransactionById(companyId, transactionId);
  if (!transaction) {
    throw new PaymentGatewayError('Transacao presencial nao encontrada.', 'payment_not_found', 404);
  }

  return toStatusView(transaction);
}

export async function processHyperswitchWebhook(
  payload: Record<string, unknown>,
  deps: { repository?: PaymentGatewayRepository } = {},
): Promise<WebhookProcessResult> {
  const repository = deps.repository ?? defaultRepository;
  const payloadData = getNestedRecord(payload, 'data');
  const eventId = sanitizeText(String(payload.event_id ?? payload.id ?? ''), 120);
  const providerPaymentId = sanitizeText(String(payload.payment_id ?? payloadData?.payment_id ?? ''), 120);
  const providerStatus = sanitizeText(String(payload.status ?? payloadData?.status ?? ''), 80).toLowerCase();

  if (!eventId || !providerPaymentId || !providerStatus) {
    throw new PaymentGatewayError(
      'Webhook de maquininha invalido. Campos minimos ausentes.',
      'invalid_request',
      400,
    );
  }

  const transaction = await repository.findTransactionByProviderPaymentId(providerPaymentId);
  if (!transaction) {
    throw new PaymentGatewayError('Transacao presencial nao encontrada para o webhook.', 'payment_not_found', 404);
  }

  if (transaction.lastWebhookEventId === eventId) {
    logInfo('payments.webhook_duplicate', {
      company_id: transaction.companyId,
      metadata: { transactionId: transaction.id, providerPaymentId, eventId },
    });
    return {
      ok: true,
      applied: false,
      duplicate: true,
      transitionSkipped: false,
      transactionId: transaction.id,
      providerPaymentId,
      status: transaction.status,
    };
  }

  const nextStatus = mapGatewayStatus(providerStatus);
  const errorPayload = getNestedRecord(payload, 'error');
  const paymentMethodData = getNestedRecord(payload, 'payment_method_data');
  const cardPayload = paymentMethodData ? getNestedRecord(paymentMethodData, 'card') : null;
  const errorCode = sanitizeErrorCode(String(getNestedString(errorPayload ?? {}, 'code') ?? payload.error_code ?? ''));
  const errorMessage = sanitizeProviderMessage(String(getNestedString(errorPayload ?? {}, 'message') ?? payload.error_message ?? ''));
  const authCode = sanitizeText(String(getNestedString(cardPayload ?? {}, 'auth_code') ?? payload.auth_code ?? ''), 80) || null;

  if (!canTransitionPaymentStatus(transaction.status, nextStatus)) {
    const preserved = await repository.updateTransaction(transaction.id, {
      providerStatus,
      lastWebhookEventId: eventId,
      metadata: {
        ...transaction.metadata,
        lastSkippedTransition: {
          from: transaction.status,
          attempted: nextStatus,
          eventId,
        },
      },
    });

    logWarn('payments.webhook_transition_skipped', {
      company_id: preserved.companyId,
      metadata: {
        transactionId: preserved.id,
        providerPaymentId,
        from: transaction.status,
        attempted: nextStatus,
        eventId,
      },
    });

    return {
      ok: true,
      applied: false,
      duplicate: false,
      transitionSkipped: true,
      transactionId: preserved.id,
      providerPaymentId,
      status: preserved.status,
    };
  }

  const updated = await repository.updateTransaction(transaction.id, {
    providerStatus,
    status: nextStatus,
    authCode,
    errorCode,
    errorMessage,
    lastWebhookEventId: eventId,
    metadata: {
      ...transaction.metadata,
      lastWebhookAt: new Date().toISOString(),
      lastWebhookEventId: eventId,
    },
  });

  logInfo('payments.webhook_applied', {
    company_id: updated.companyId,
    metadata: {
      transactionId: updated.id,
      providerPaymentId,
      status: updated.status,
      eventId,
    },
  });

  return {
    ok: true,
    applied: true,
    duplicate: false,
    transitionSkipped: false,
    transactionId: updated.id,
    providerPaymentId,
    status: updated.status,
  };
}

export function respondPaymentGatewayError(err: unknown, correlationId?: string): {
  statusCode: number;
  payload: Record<string, unknown>;
} {
  if (err instanceof PaymentGatewayError) {
    return {
      statusCode: err.statusCode,
      payload: {
        code: sanitizeText(err.code, 40).toLowerCase() || 'internal_error',
        message: sanitizeProviderMessage(err.message) || 'Falha ao processar pagamento presencial.',
        correlation_id: correlationId || null,
      },
    };
  }

  logError('payments.unhandled_error', {
    metadata: {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    },
  });

  return {
    statusCode: 500,
    payload: {
      code: 'internal_error',
      message: 'Falha interna ao processar pagamento presencial.',
      correlation_id: correlationId || null,
    },
  };
}
