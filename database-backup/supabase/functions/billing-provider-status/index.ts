import { buildCorsPreflightResponse } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireSecureAdmin, validateCompanyContext } from '../_shared/auth-secure.ts';
import { getActivePlanConfigSafe } from '../_shared/billing-plan-config.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return buildCorsPreflightResponse(req);
  }

  try {
    const { adminClient, profile, auditBillingEvent } = await requireSecureAdmin(req);
    const payload = await req.json().catch(() => ({}));
    const companyId = typeof payload.companyId === 'string' ? payload.companyId : profile.company_id;

    if (!validateCompanyContext(profile.company_id, companyId)) {
      await auditBillingEvent('auth.multi_tenant_violation_attempt', {
        requested_company_id: companyId,
      });
      throw new HttpError(403, 'Access denied.');
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
      console.error('[BILLING_PROVIDER_STATUS] Subscription lookup failed', {
        code: subscriptionResult.error.code,
      });
      throw new HttpError(500, 'Não foi possível carregar o status do provider de billing.');
    }

    if (methodsResult.error) {
      console.error('[BILLING_PROVIDER_STATUS] Payment methods lookup failed', {
        code: methodsResult.error.code,
      });
      throw new HttpError(500, 'Não foi possível carregar o status do provider de billing.');
    }

    const subscription = subscriptionResult.data;
    // Fail-open: provider-status is a display endpoint; plan config unavailability is surfaced but non-blocking.
    const activePlanConfig = await getActivePlanConfigSafe(adminClient);
    const accessTokenConfigured = Boolean(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));
    const publicKeyConfigured = Boolean(Deno.env.get('MERCADOPAGO_PUBLIC_KEY'));
    const webhookSecretConfigured = Boolean(Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET'));
    const hasProviderSubscription = Boolean(subscription?.mp_subscription_id || subscription?.mp_customer_id || subscription?.mp_plan_id);
    const hasPaymentMethod = (methodsResult.count || 0) > 0;
    const configured = accessTokenConfigured && publicKeyConfigured;

    await auditBillingEvent('billing.provider_status.checked', {
      provider: 'mercadopago',
      configured,
      has_payment_method: hasPaymentMethod,
      has_provider_subscription: hasProviderSubscription,
    });

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
      plan_config: activePlanConfig
        ? {
            amount_cents: activePlanConfig.amount_cents,
            currency: activePlanConfig.currency,
            trial_days: activePlanConfig.trial_days,
            effective_from: activePlanConfig.effective_from,
          }
        : null,
      subscription: subscription
        ? {
            status: subscription.status,
            trial_ends_at: subscription.trial_ends_at,
            current_period_end: subscription.current_period_end,
            grace_period_end: subscription.grace_period_end,
            plan_amount: activePlanConfig?.amount_cents ?? subscription.plan_amount,
          }
        : null,
    }, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    return jsonResponse(500, {
      error: 'Unexpected billing provider status error.',
    }, req);
  }
});
