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

    const publicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));

    await adminClient.from('billing_audit_log').insert({
      company_id: companyId,
      event_type: 'billing.checkout.requested',
      actor_type: 'user',
      actor_id: user.id,
      details: {
        provider: 'mercadopago',
        public_key_configured: Boolean(publicKey),
        access_token_configured: accessTokenConfigured,
        mode: 'setup_card',
      },
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
      error: error instanceof Error ? error.message : 'Unexpected checkout bootstrap error.',
    });
  }
});
