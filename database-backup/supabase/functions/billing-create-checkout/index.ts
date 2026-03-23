// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { corsHeaders } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireSecureAdmin, validateCompanyContext } from '../_shared/auth-secure.ts';

/**
 * BILLING CHECKOUT — Two-mode endpoint
 *
 * Mode A (no cardToken in body): returns Mercado Pago public key for client-side card tokenization.
 * Mode B (cardToken in body):    creates/reuses MP Customer, stores card in MP Vault,
 *                                 persists display-safe fields to payment_methods table.
 *
 * Security:
 * - Card token never logged or stored raw — only mp_card_id kept after vault storage
 * - No CVV, no full PAN stored anywhere
 * - MP customer ID upserted into subscriptions.mp_customer_id (server-side only)
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const MP_API_BASE_URL = Deno.env.get('MERCADOPAGO_API_BASE_URL') || 'https://api.mercadopago.com';

/** Validate card token is non-empty alphanumeric/hyphen string of reasonable length */
function isValidCardTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  // MP card tokens look like UUIDs or hex strings, typically 20-40 chars
  return /^[a-zA-Z0-9_\-]{10,64}$/.test(token);
}

async function upsertMpCustomer(
  accessToken: string,
  existingCustomerId: string | null,
  email: string,
  companyName: string
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const res = await fetch(`${MP_API_BASE_URL}/v1/customers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      description: companyName,
    }),
  });

  if (!res.ok) {
    console.error('[CHECKOUT] MP customer creation failed', { httpStatus: res.status });
    throw new HttpError(502, 'Falha ao criar perfil de pagamento. Tente novamente.');
  }

  const customer = (await res.json()) as Record<string, unknown>;
  const customerId = typeof customer.id === 'string' ? customer.id : null;

  if (!customerId) {
    throw new HttpError(502, 'Resposta inválida do provedor de pagamento.');
  }

  return customerId;
}

async function storeCardInVault(
  accessToken: string,
  customerId: string,
  cardToken: string
): Promise<{
  mpCardId: string;
  lastFour: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}> {
  const res = await fetch(`${MP_API_BASE_URL}/v1/customers/${encodeURIComponent(customerId)}/cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: cardToken }),
  });

  if (res.status === 400 || res.status === 404 || res.status === 422) {
    // Invalid or expired token from client
    throw new HttpError(422, 'Token do cartão inválido ou expirado. Tente novamente.');
  }

  if (!res.ok) {
    console.error('[CHECKOUT] MP card vault failed', { httpStatus: res.status });
    throw new HttpError(502, 'Falha ao salvar cartão. Tente novamente.');
  }

  const card = (await res.json()) as Record<string, unknown>;
  const mpCardId = typeof card.id === 'string' ? card.id : '';
  const lastFour = typeof card.last_four_digits === 'string' ? card.last_four_digits : '';
  const paymentMethod = card.payment_method as Record<string, unknown> | null;
  const brand = typeof paymentMethod?.id === 'string' ? paymentMethod.id : '';
  const expiryMonth = typeof card.expiration_month === 'number' ? card.expiration_month : 0;
  const expiryYear = typeof card.expiration_year === 'number' ? card.expiration_year : 0;

  if (!mpCardId || !lastFour || !brand || !expiryMonth || !expiryYear) {
    throw new HttpError(502, 'Dados do cartão incompletos retornados pelo provedor.');
  }

  return { mpCardId, lastFour, brand, expiryMonth, expiryYear };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { adminClient, profile, auditBillingEvent } = await requireSecureAdmin(req);
    const payload = await req.json().catch(() => ({}));
    const companyId = typeof payload.companyId === 'string' ? payload.companyId : profile.company_id;

    if (!validateCompanyContext(profile.company_id, companyId)) {
      await auditBillingEvent('auth.multi_tenant_violation_attempt', {
        requested_company_id: companyId,
        operation: 'billing.checkout.requested',
      });
      throw new HttpError(403, 'Access denied.');
    }

    const publicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    // ── MODE A: return public key for client-side tokenization ────────────────
    if (!payload.cardToken) {
      await auditBillingEvent('billing.checkout.requested', {
        provider: 'mercadopago',
        public_key_configured: Boolean(publicKey),
        access_token_configured: Boolean(accessToken),
        mode: 'get_public_key',
      });

      if (!publicKey || !accessToken) {
        return jsonResponse(503, {
          status: 'provider_not_ready',
          provider: 'mercadopago',
          message: 'Mercado Pago ainda não está totalmente configurado neste ambiente.',
        });
      }

      return jsonResponse(200, {
        status: 'ready_for_tokenization',
        provider: 'mercadopago',
        publicKey,
      });
    }

    // ── MODE B: persist tokenized card to MP Vault and payment_methods ────────

    if (!accessToken || !publicKey) {
      throw new HttpError(503, 'Provedor de pagamento não configurado.');
    }

    const cardToken = payload.cardToken;

    if (!isValidCardTokenFormat(cardToken)) {
      await auditBillingEvent('billing.checkout.invalid_token_format', {
        mode: 'save_card',
      });
      throw new HttpError(400, 'Formato de token do cartão inválido.');
    }

    // Load subscription to get existing mp_customer_id (if any)
    const { data: subscription, error: subError } = await adminClient
      .from('subscriptions')
      .select('id, mp_customer_id')
      .eq('company_id', companyId)
      .maybeSingle();

    if (subError) {
      throw new HttpError(500, 'Erro ao carregar assinatura.');
    }

    if (!subscription) {
      throw new HttpError(409, 'Assinatura não encontrada para esta empresa.');
    }

    // Load company display name for MP customer; e-mail comes from the authenticated profile.
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new HttpError(500, 'Erro ao carregar dados da empresa.');
    }

    const payerEmail = profile.email;

    if (!payerEmail) {
      throw new HttpError(409, 'E-mail da empresa não cadastrado. Configure antes de salvar cartão.');
    }

    await auditBillingEvent('billing.checkout.card_save_requested', {
      provider: 'mercadopago',
      mode: 'save_card',
      has_existing_customer: Boolean(subscription.mp_customer_id),
    });

    // 1) Upsert MP Customer
    const customerId = await upsertMpCustomer(
      accessToken,
      subscription.mp_customer_id || null,
      payerEmail,
      company.name || 'Restaurante'
    );

    // 2) Store card in MP Vault
    const { mpCardId, lastFour, brand, expiryMonth, expiryYear } = await storeCardInVault(
      accessToken,
      customerId,
      cardToken
    );

    // 3) If customer was just created, persist mp_customer_id to subscriptions
    if (!subscription.mp_customer_id) {
      const { error: updateSubError } = await adminClient
        .from('subscriptions')
        .update({ mp_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', subscription.id)
        .eq('company_id', companyId);

      if (updateSubError) {
        console.error('[CHECKOUT] Failed to persist mp_customer_id', { code: updateSubError.code });
        // Non-fatal: card is stored in vault, customer exists. Log and continue.
      }
    }

    // 4) Clear existing default payment methods for this company
    await adminClient
      .from('payment_methods')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('is_default', true);

    // 5) Insert new payment method (display-safe fields only — no CVV/PAN)
    const { data: newMethod, error: insertError } = await adminClient
      .from('payment_methods')
      .insert({
        company_id: companyId,
        type: 'card',
        last_four: lastFour,
        brand,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        mp_card_id: mpCardId,
        is_default: true,
      })
      .select('id')
      .single();

    if (insertError || !newMethod) {
      console.error('[CHECKOUT] Failed to insert payment_method', { code: insertError?.code });
      throw new HttpError(500, 'Erro ao salvar método de pagamento.');
    }

    await auditBillingEvent('billing.checkout.card_saved', {
      provider: 'mercadopago',
      payment_method_id: newMethod.id,
      card_brand: brand,
      // NOTE: last_four is safe for audit — it's a display field, not full PAN
    });

    return jsonResponse(201, {
      status: 'card_saved',
      paymentMethodId: newMethod.id,
      card: {
        brand,
        lastFour,
        expiryMonth,
        expiryYear,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, {
      error: 'Unexpected checkout error.',
    });
  }
});

