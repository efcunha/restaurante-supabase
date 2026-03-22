-- =============================================================================
-- Migration: 20260322170000_create_reconcile_billing_event_atomic_function.sql
-- Description: Reconciliacao atomica de billing com idempotencia e trilha de auditoria
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_billing_event_atomic(
  p_company_id UUID,
  p_actor_id UUID,
  p_idempotency_key TEXT,
  p_event_type TEXT,
  p_payment_status TEXT,
  p_invoice_id UUID DEFAULT NULL,
  p_mp_payment_id TEXT DEFAULT NULL,
  p_payment_method_type TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_webhook_event_id UUID;
  v_subscription RECORD;
  v_invoice RECORD;
  v_candidates RECORD;
  v_next_status TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_payment_status NOT IN ('paid', 'failed') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: payment_status deve ser paid ou failed';
  END IF;

  IF p_payment_method_type IS NOT NULL
     AND p_payment_method_type NOT IN ('card', 'pix') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: payment_method_type deve ser card ou pix';
  END IF;

  BEGIN
    INSERT INTO public.webhook_events(provider, event_type, idempotency_key, payload)
    VALUES ('mercadopago', p_event_type, p_idempotency_key, COALESCE(p_payload, '{}'::JSONB))
    RETURNING id INTO v_webhook_event_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', true,
        'action', 'reconcile',
        'companyId', p_company_id,
        'alreadyProcessed', true,
        'message', 'Evento de webhook ja processado para esta chave de idempotencia.'
      );
  END;

  SELECT id, status, grace_period_end
  INTO v_subscription
  FROM public.subscriptions
  WHERE company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND: assinatura nao encontrada para a empresa';
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT id, company_id, status, retry_count
    INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
      AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVOICE_NOT_FOUND: invoice informada nao encontrada para a empresa';
    END IF;
  ELSE
    SELECT COUNT(*)::INT AS cnt
    INTO v_candidates
    FROM public.invoices
    WHERE company_id = p_company_id
      AND status IN ('pending', 'failed');

    IF v_candidates.cnt = 0 THEN
      RAISE EXCEPTION 'INVOICE_ACTION_TARGET_NOT_FOUND: nenhuma invoice pendente/falha encontrada';
    END IF;

    IF v_candidates.cnt > 1 THEN
      RAISE EXCEPTION 'INVOICE_ACTION_AMBIGUOUS: multiplas invoices elegiveis encontradas; informe invoiceId';
    END IF;

    SELECT id, company_id, status, retry_count
    INTO v_invoice
    FROM public.invoices
    WHERE company_id = p_company_id
      AND status IN ('pending', 'failed')
    ORDER BY due_date ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF p_payment_status = 'paid' THEN
    IF v_invoice.status = 'paid' THEN
      RAISE EXCEPTION 'INVOICE_ALREADY_PAID: invoice ja esta paga';
    END IF;

    IF v_invoice.status = 'cancelled' THEN
      RAISE EXCEPTION 'INVOICE_CANCELLED: invoice cancelada nao pode ser reconciliada como paga';
    END IF;

    IF v_subscription.status = 'cancelled' THEN
      RAISE EXCEPTION 'SUBSCRIPTION_CANCELLED_MANUAL_REACTIVATION_REQUIRED: assinatura cancelada exige reativacao manual';
    END IF;

    v_next_status := CASE
      WHEN v_subscription.status IN ('past_due', 'grace_period', 'suspended') THEN 'reactivated'
      ELSE 'active'
    END;

    UPDATE public.invoices
    SET status = 'paid',
        paid_at = v_now,
        payment_method_type = COALESCE(p_payment_method_type, 'card'),
        mp_payment_id = p_mp_payment_id,
        mp_error_code = NULL,
        updated_at = v_now
    WHERE id = v_invoice.id
      AND company_id = p_company_id;

    UPDATE public.subscriptions
    SET status = v_next_status::subscription_status,
        current_period_start = v_now,
        current_period_end = (v_now + INTERVAL '30 days'),
        grace_period_end = NULL,
        updated_at = v_now
    WHERE id = v_subscription.id
      AND company_id = p_company_id;

    INSERT INTO public.billing_audit_log(
      company_id,
      event_type,
      actor_type,
      actor_id,
      old_status,
      new_status,
      details,
      created_at
    ) VALUES (
      p_company_id,
      'payment.succeeded',
      'user',
      p_actor_id,
      v_subscription.status,
      v_next_status,
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'mp_payment_id', p_mp_payment_id,
        'event_type', p_event_type
      ),
      v_now
    );

    UPDATE public.webhook_events
    SET processed_at = v_now,
        error_message = NULL
    WHERE id = v_webhook_event_id;

    RETURN jsonb_build_object(
      'ok', true,
      'action', 'reconcile',
      'companyId', p_company_id,
      'invoiceId', v_invoice.id,
      'webhookEventId', v_webhook_event_id,
      'subscriptionStatus', v_next_status,
      'message', 'Pagamento reconciliado com sucesso e assinatura atualizada.'
    );
  END IF;

  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'INVOICE_ALREADY_PAID: invoice paga nao pode ser reconciliada como falha';
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'INVOICE_CANCELLED: invoice cancelada nao pode ser reconciliada como falha';
  END IF;

  v_next_status := CASE
    WHEN v_subscription.status = 'suspended' THEN 'suspended'
    ELSE 'grace_period'
  END;

  UPDATE public.invoices
  SET status = 'failed',
      payment_method_type = COALESCE(p_payment_method_type, 'card'),
      mp_payment_id = p_mp_payment_id,
      mp_error_code = COALESCE(p_error_code, 'payment_failed'),
      updated_at = v_now
  WHERE id = v_invoice.id
    AND company_id = p_company_id;

  UPDATE public.subscriptions
  SET status = v_next_status::subscription_status,
      grace_period_end = CASE
        WHEN v_next_status = 'grace_period' THEN (v_now + INTERVAL '5 days')
        ELSE grace_period_end
      END,
      updated_at = v_now
  WHERE id = v_subscription.id
    AND company_id = p_company_id;

  INSERT INTO public.billing_audit_log(
    company_id,
    event_type,
    actor_type,
    actor_id,
    old_status,
    new_status,
    details,
    created_at
  ) VALUES (
    p_company_id,
    'payment.failed',
    'user',
    p_actor_id,
    v_subscription.status,
    v_next_status,
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'mp_payment_id', p_mp_payment_id,
      'mp_error_code', p_error_code,
      'event_type', p_event_type
    ),
    v_now
  );

  UPDATE public.webhook_events
  SET processed_at = v_now,
      error_message = NULL
  WHERE id = v_webhook_event_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', 'reconcile',
    'companyId', p_company_id,
    'invoiceId', v_invoice.id,
    'webhookEventId', v_webhook_event_id,
    'subscriptionStatus', v_next_status,
    'message', 'Falha de pagamento reconciliada e assinatura atualizada.'
  );

EXCEPTION
  WHEN OTHERS THEN
    IF v_webhook_event_id IS NOT NULL THEN
      UPDATE public.webhook_events
      SET processed_at = NOW(),
          error_message = SQLERRM
      WHERE id = v_webhook_event_id;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_billing_event_atomic(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  JSONB
) TO service_role;
