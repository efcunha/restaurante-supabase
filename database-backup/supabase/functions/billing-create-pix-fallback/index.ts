import { corsHeaders } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireSecureAdmin, validateCompanyContext } from '../_shared/auth-secure.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profile, auditBillingEvent } = await requireSecureAdmin(req);
    const payload = await req.json().catch(() => ({}));
    const companyId = typeof payload.companyId === 'string' ? payload.companyId : profile.company_id;

    if (!validateCompanyContext(profile.company_id, companyId)) {
      await auditBillingEvent('auth.multi_tenant_violation_attempt', {
        requested_company_id: companyId,
        operation: 'billing.pix.requested',
      });
      throw new HttpError(403, 'Access denied.');
    }

    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));

    await auditBillingEvent('billing.pix.requested', {
      provider: 'mercadopago',
      access_token_configured: accessTokenConfigured,
      mode: 'pix_fallback',
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
      error: 'Unexpected Pix fallback bootstrap error.',
    });
  }
});