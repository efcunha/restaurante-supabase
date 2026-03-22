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
        operation: 'billing.checkout.requested',
      });
      throw new HttpError(403, 'Access denied.');
    }

    const publicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));

    await auditBillingEvent('billing.checkout.requested', {
      provider: 'mercadopago',
      public_key_configured: Boolean(publicKey),
      access_token_configured: accessTokenConfigured,
      mode: 'setup_card',
    });

    if (!publicKey || !accessTokenConfigured) {
      return jsonResponse(503, {
        status: 'provider_not_ready',
        provider: 'mercadopago',
        message: 'Mercado Pago ainda não está totalmente configurado neste ambiente.',
        nextStep: 'Configurar MERCADOPAGO_PUBLIC_KEY e MERCADOPAGO_ACCESS_TOKEN para liberar a tokenização do cartão.',
      });
    }

    return jsonResponse(202, {
      status: 'pending_client_tokenization',
      provider: 'mercadopago',
      publicKey,
      message: 'A Edge Function já valida o contexto e registra a tentativa. O próximo passo é conectar a tokenização do cartão no cliente usando a public key retornada.',
      nextStep: 'Integrar o SDK público do Mercado Pago no BillingScreen para gerar o token do cartão e enviá-lo para uma próxima função de persistência segura.',
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, {
      error: 'Unexpected checkout bootstrap error.',
    });
  }
});
