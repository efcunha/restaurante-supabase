import { corsHeaders } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireAdmin } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { adminClient, profile } = await requireAdmin(req);
    const payload = await req.json().catch(() => ({}));
    const companyId = payload.companyId || profile.company_id;

    if (companyId !== profile.company_id) {
      throw new HttpError(403, 'Billing company context mismatch.');
    }

    const [subscriptionResult, methodsResult] = await Promise.all([
      adminClient
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_end, grace_period_end, plan_amount, mp_customer_id, mp_plan_id, mp_subscription_id')
        .eq('company_id', companyId)
        .maybeSingle(),
      adminClient
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
    ]);

    if (subscriptionResult.error) {
      throw new HttpError(500, subscriptionResult.error.message);
    }

    if (methodsResult.error) {
      throw new HttpError(500, methodsResult.error.message);
    }

    const subscription = subscriptionResult.data;
    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));
    const publicKeyConfigured = Boolean(Deno.env.get('MERCADOPAGO_PUBLIC_KEY'));
    const webhookSecretConfigured = Boolean(Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET'));
    const hasProviderSubscription = Boolean(subscription?.mp_subscription_id || subscription?.mp_customer_id || subscription?.mp_plan_id);
    const hasPaymentMethod = (methodsResult.count || 0) > 0;
    const configured = accessTokenConfigured && publicKeyConfigured;

    return jsonResponse(200, {
      provider: 'mercadopago',
      configured,
      publicKeyConfigured,
      accessTokenConfigured,
      webhookSecretConfigured,
      hasPaymentMethod,
      hasProviderSubscription,
      message: configured
        ? 'Integração Mercado Pago configurada para iniciar o rollout controlado.'
        : 'Integração Mercado Pago ainda depende da configuração completa dos segredos do provider.',
      subscription,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected billing provider status error.',
    });
  }
});
