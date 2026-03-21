import { corsHeaders } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireAdmin } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { adminClient, profile, user } = await requireAdmin(req);
    const payload = await req.json().catch(() => ({}));
    const companyId = payload.companyId || profile.company_id;

    if (companyId !== profile.company_id) {
      throw new HttpError(403, 'Billing company context mismatch.');
    }

    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));

    await adminClient.from('billing_audit_log').insert({
      company_id: companyId,
      event_type: 'billing.pix.requested',
      actor_type: 'user',
      actor_id: user.id,
      details: {
        provider: 'mercadopago',
        access_token_configured: accessTokenConfigured,
        mode: 'pix_fallback',
      },
    });

    if (!accessTokenConfigured) {
      return jsonResponse(503, {
        status: 'provider_not_ready',
        provider: 'mercadopago',
        message: 'O fallback por Pix ainda depende da configuração completa do provider neste ambiente.',
        nextStep: 'Configurar MERCADOPAGO_ACCESS_TOKEN e implementar a criação da cobrança Pix na próxima etapa do rollout.',
      });
    }

    return jsonResponse(202, {
      status: 'pix_fallback_pending_provider_charge',
      provider: 'mercadopago',
      message: 'A solicitação de regularização via Pix foi registrada. A próxima etapa é gerar a cobrança no provider e persistir o QR code em invoices.',
      nextStep: 'Implementar a emissão da cobrança Pix no Mercado Pago e preencher pix_qr_code / pix_qr_code_text na tabela invoices.',
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected Pix fallback bootstrap error.',
    });
  }
});