// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from '../_shared/auth-secure.ts';

/**
 * BILLING WEBHOOK HANDLER — Mercado Pago payment events
 *
 * Security controls:
 * - HMAC-SHA256 signature verification (x-signature header)
 * - 5-minute timestamp window (replay attack prevention)
 * - Idempotency via webhook_events UNIQUE constraint inside reconcile RPC
 * - No JWT required (MP webhook has its own auth)
 * - Service role only for DB writes
 * - Sanitized error logging (no payment details in logs)
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const MP_API_BASE_URL = Deno.env.get('MERCADOPAGO_API_BASE_URL') || 'https://api.mercadopago.com';
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

/** Nil UUID used as actor_id for system/webhook-initiated reconciliation events */
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

/** MP payment statuses that map to a final billing outcome */
const PAID_STATUSES = new Set(['approved']);
const FAILED_STATUSES = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);

function mapMpStatus(mpStatus: string): 'paid' | 'failed' | null {
  if (PAID_STATUSES.has(mpStatus)) return 'paid';
  if (FAILED_STATUSES.has(mpStatus)) return 'failed';
  return null;
}

/**
 * Verify Mercado Pago webhook signature.
 *
 * MP sends:
 *   x-signature: ts=<unix_timestamp>,v1=<hmac_hex>
 *   x-request-id: <UUID>
 *
 * Signed template: "id:<data.id>;request-id:<x-request-id>;ts:<ts>"
 * Algorithm: HMAC-SHA256 using MERCADOPAGO_WEBHOOK_SECRET
 */
async function verifySignature(
  req: Request,
  dataId: string
): Promise<void> {
  const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');

  if (!webhookSecret) {
    // Secret not configured: reject all webhooks to prevent unsigned requests from slipping through
    console.error('[WEBHOOK_SECURITY] MERCADOPAGO_WEBHOOK_SECRET not configured');
    throw new HttpError(503, 'Webhook temporarily unavailable.');
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature) {
    throw new HttpError(401, 'Unauthorized webhook request.');
  }

  // Parse "ts=<timestamp>,v1=<hmac>" from x-signature header
  const parts: Record<string, string> = {};
  for (const segment of xSignature.split(',')) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx > 0) {
      parts[segment.slice(0, eqIdx).trim()] = segment.slice(eqIdx + 1).trim();
    }
  }

  const { ts, v1 } = parts;

  if (!ts || !v1) {
    throw new HttpError(401, 'Unauthorized webhook request.');
  }

  // Reject stale webhooks (replay attack prevention)
  const tsSeconds = parseInt(ts, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (isNaN(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    throw new HttpError(401, 'Unauthorized webhook request.');
  }

  // Compute expected HMAC: HMAC-SHA256("id:<data.id>;request-id:<xRequestId>;ts:<ts>")
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(template)
  );

  const computedHmac = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (computedHmac.length !== v1.length) {
    throw new HttpError(401, 'Unauthorized webhook request.');
  }

  let diff = 0;
  for (let i = 0; i < computedHmac.length; i++) {
    diff |= computedHmac.charCodeAt(i) ^ v1.charCodeAt(i);
  }

  if (diff !== 0) {
    throw new HttpError(401, 'Unauthorized webhook request.');
  }
}

Deno.serve(async (req) => {
  // Webhook endpoint does not respond to OPTIONS (no CORS needed — MP calls from server)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Always read body first (before parsing) to support raw signature verification
  const rawBody = await req.text().catch(() => '');

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Invalid JSON — return 200 immediately to prevent MP infinite retries
    console.warn('[WEBHOOK] Received non-JSON body');
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  const data = payload.data as Record<string, unknown> | null;
  const dataId = typeof data?.id === 'string' ? data.id : typeof data?.id === 'number' ? String(data.id) : '';

  // Only process payment.* events with valid IDs
  if (!action.startsWith('payment.') || !dataId) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'not_a_payment_event' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify webhook signature BEFORE any DB operations
    await verifySignature(req, dataId);

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      console.error('[WEBHOOK] Missing required environment variables');
      return new Response(JSON.stringify({ error: 'temporarily_unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch full payment details from Mercado Pago
    const mpRes = await fetch(
      `${MP_API_BASE_URL}/v1/payments/${encodeURIComponent(dataId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!mpRes.ok) {
      // Log minimal info — do not log full MP response (may contain sensitive data)
      console.error('[WEBHOOK] MP payment fetch failed', { httpStatus: mpRes.status, dataId: dataId.slice(0, 20) });
      return new Response(JSON.stringify({ error: 'temporarily_unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payment = (await mpRes.json()) as Record<string, unknown>;
    const mpStatus = typeof payment.status === 'string' ? payment.status : '';
    const paymentStatus = mapMpStatus(mpStatus);

    // Non-final status (pending, in_process, authorized) — acknowledge and ignore
    if (!paymentStatus) {
      return new Response(JSON.stringify({ ok: true, skipped: true, mpStatus }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find the invoice associated with this MP payment ID
    const { data: invoice, error: invoiceError } = await adminClient
      .from('invoices')
      .select('id, company_id, status')
      .eq('mp_payment_id', dataId)
      .maybeSingle();

    if (invoiceError) {
      console.error('[WEBHOOK] Invoice lookup error', { code: invoiceError.code });
      return new Response(JSON.stringify({ error: 'temporarily_unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!invoice) {
      // No invoice linked — could be a Mercado Pago test event or manual payment outside the system
      console.warn('[WEBHOOK] No invoice found for payment', { eventAction: action });
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'invoice_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Derive payment method type from MP payment_method_id field
    const mpMethodId = typeof payment.payment_method_id === 'string' ? payment.payment_method_id : '';
    const paymentMethodType = mpMethodId === 'pix' ? 'pix' : 'card';

    // Use status_detail as error code for failed payments (safe to store, not PII)
    const mpErrorCode = paymentStatus === 'failed'
      ? (typeof payment.status_detail === 'string' ? payment.status_detail : 'payment_failed')
      : undefined;

    // Idempotency key: "<mp_payment_id>:<action>" — unique per payment event type
    const idempotencyKey = `${dataId}:${action}`;

    // Call atomic reconcile RPC — single write path for all billing state transitions
    const { data: reconcileResult, error: reconcileError } = await adminClient.rpc(
      'reconcile_billing_event_atomic',
      {
        p_company_id: invoice.company_id,
        p_actor_id: SYSTEM_ACTOR_ID,
        p_idempotency_key: idempotencyKey,
        p_event_type: action,
        p_payment_status: paymentStatus,
        p_invoice_id: invoice.id,
        p_mp_payment_id: dataId,
        p_payment_method_type: paymentMethodType,
        ...(mpErrorCode ? { p_error_code: mpErrorCode } : {}),
        p_payload: { mp_status: mpStatus, action },
      }
    );

    if (reconcileError) {
      // Log minimal error context — reconcile RPC handles already-processed idempotency internally
      console.error('[WEBHOOK] Reconciliation RPC error', { code: reconcileError.code, hint: reconcileError.hint?.slice(0, 100) });
      return new Response(JSON.stringify({ error: 'temporarily_unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = reconcileResult as Record<string, unknown> | null;

    if (result?.alreadyProcessed) {
      // Idempotency handled — duplicate webhook delivery from MP
      return new Response(JSON.stringify({ ok: true, alreadyProcessed: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, paymentStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      // Security/auth errors return sanitized messages only.
      console.warn('[WEBHOOK_SECURITY]', { status: error.status, message: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Unexpected errors should remain retryable until investigated.
    console.error('[WEBHOOK] Unexpected error', error instanceof Error ? error.message : 'unknown');
    return new Response(JSON.stringify({ error: 'temporarily_unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
