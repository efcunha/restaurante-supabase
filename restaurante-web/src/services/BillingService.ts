import { supabase } from '../config/SupabaseConfig';

export interface BillingPaymentMethod {
  id: string;
  type: 'card' | 'pix';
  last_four: string | null;
  brand: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  is_default: boolean;
  created_at: string;
}

export interface BillingInvoice {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amount: number;
  due_date: string;
  paid_at: string | null;
  payment_method_type: 'card' | 'pix' | null;
  mp_payment_id: string | null;
  pix_qr_code: string | null;
  pix_qr_code_text: string | null;
  pix_expires_at: string | null;
  created_at: string;
}

export interface BillingProviderStatus {
  provider: string;
  configured: boolean;
  publicKeyConfigured: boolean;
  accessTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  hasPaymentMethod: boolean;
  hasProviderSubscription: boolean;
  message: string;
}

export interface BillingActionResult {
  status: string;
  provider?: string;
  message: string;
  nextStep?: string;
  checkoutUrl?: string;
  publicKey?: string;
  invoiceId?: string;
  amount?: number;
  dueDate?: string;
  mpPaymentId?: string;
  pixQrCode?: string | null;
  pixQrCodeText?: string | null;
  pixExpiresAt?: string | null;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
}

export async function listBillingPaymentMethods(companyId?: string): Promise<BillingPaymentMethod[]> {
  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, type, last_four, brand, expiry_month, expiry_year, is_default, created_at')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BillingPaymentMethod[];
}

export async function listBillingInvoices(companyId?: string): Promise<BillingInvoice[]> {
  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('id, status, amount, due_date, paid_at, payment_method_type, mp_payment_id, pix_qr_code, pix_qr_code_text, pix_expires_at, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BillingInvoice[];
}

export async function getBillingProviderStatus(companyId?: string): Promise<BillingProviderStatus> {
  if (!companyId) {
    return {
      provider: 'mercadopago',
      configured: false,
      publicKeyConfigured: false,
      accessTokenConfigured: false,
      webhookSecretConfigured: false,
      hasPaymentMethod: false,
      hasProviderSubscription: false,
      message: 'Empresa não identificada para billing.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('billing-provider-status', {
      body: { companyId },
    });

    if (error) {
      throw error;
    }

    return {
      provider: 'mercadopago',
      configured: false,
      publicKeyConfigured: false,
      accessTokenConfigured: false,
      webhookSecretConfigured: false,
      hasPaymentMethod: false,
      hasProviderSubscription: false,
      message: 'Status do provider indisponível.',
      ...(data || {}),
    } as BillingProviderStatus;
  } catch (error) {
    return {
      provider: 'mercadopago',
      configured: false,
      publicKeyConfigured: false,
      accessTokenConfigured: false,
      webhookSecretConfigured: false,
      hasPaymentMethod: false,
      hasProviderSubscription: false,
      message: toErrorMessage(error, 'Não foi possível consultar a integração de billing.'),
    };
  }
}

export async function startBillingCheckout(companyId?: string): Promise<BillingActionResult> {
  if (!companyId) {
    throw new Error('Empresa não identificada para iniciar o checkout.');
  }

  const { data, error } = await supabase.functions.invoke('billing-create-checkout', {
    body: { companyId },
  });

  if (error) {
    throw new Error(toErrorMessage(error, 'Falha ao iniciar o checkout de billing.'));
  }

  return data as BillingActionResult;
}

export async function requestBillingPixFallback(companyId?: string): Promise<BillingActionResult> {
  if (!companyId) {
    throw new Error('Empresa não identificada para solicitar Pix.');
  }

  const { data, error } = await supabase.functions.invoke('billing-create-pix-fallback', {
    body: { companyId },
  });

  if (error) {
    throw new Error(toErrorMessage(error, 'Falha ao solicitar regularização via Pix.'));
  }

  return data as BillingActionResult;
}

export interface CardInput {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

/**
 * Tokenize a card directly with Mercado Pago public key.
 * Card data is sent from the client straight to api.mercadopago.com —
 * CVV and PAN never touch our Edge Functions.
 */
export async function tokenizeCardWithMp(publicKey: string, card: CardInput): Promise<string> {
  const MP_TOKENIZE_URL = 'https://api.mercadopago.com/v1/card_tokens';

  const response = await fetch(MP_TOKENIZE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      card_number: card.cardNumber.replace(/\s/g, ''),
      expiration_month: parseInt(card.expiryMonth, 10),
      expiration_year: parseInt(
        card.expiryYear.length === 2 ? `20${card.expiryYear}` : card.expiryYear,
        10
      ),
      security_code: card.cvv,
      cardholder: { name: card.cardholderName.trim().toUpperCase() },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ message: 'Tokenização falhou' })) as Record<string, unknown>;
    const cause = Array.isArray(errBody.cause) ? (errBody.cause as Array<Record<string, unknown>>) : [];
    const causeMsg = cause.length > 0 ? `: ${cause.map((c) => c.description ?? c.code).join(', ')}` : '';
    const msg = typeof errBody.message === 'string' ? errBody.message : 'Dados do cartão inválidos';
    throw new Error(`${msg}${causeMsg}`);
  }

  const tokenData = (await response.json()) as Record<string, unknown>;
  const token = typeof tokenData.id === 'string' ? tokenData.id : '';

  if (!token) {
    throw new Error('Token de cartão ausente na resposta do provedor.');
  }

  return token;
}

/**
 * Persist a tokenized card to the backend (billing-create-checkout Mode B).
 * Only the opaque MP card token is sent — no card number, no CVV.
 */
export async function saveCardToken(companyId: string, cardToken: string): Promise<BillingActionResult> {
  const { data, error } = await supabase.functions.invoke('billing-create-checkout', {
    body: { companyId, cardToken },
  });

  if (error) {
    throw new Error(toErrorMessage(error, 'Falha ao salvar o cartão.'));
  }

  return data as BillingActionResult;
}
