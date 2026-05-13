import { buildCorsPreflightResponse } from '../_shared/cors.ts';
import { HttpError, jsonResponse, requireSecureAdmin, validateCompanyContext } from '../_shared/auth-secure.ts';
import { getActivePlanConfig, PlanConfigError } from '../_shared/billing-plan-config.ts';

const MP_API_BASE_URL = Deno.env.get('MERCADOPAGO_API_BASE_URL') || 'https://api.mercadopago.com';
const PIX_EXPIRATION_MINUTES = 30;

function digitsOnly(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '');
}

function formatInvoiceDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDueDate(subscription: { trial_ends_at: string | null; current_period_end: string | null; status: string }) {
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    return subscription.trial_ends_at;
  }

  if (subscription.current_period_end) {
    return subscription.current_period_end;
  }

  return new Date().toISOString();
}

function getDocumentContext(company: { document_type: string | null; document: string | null; cnpj: string | null }, profile: { cpf: string | null }) {
  const companyDocument = digitsOnly(company.document) || digitsOnly(company.cnpj);

  if (companyDocument) {
    return {
      type: (company.document_type || 'cnpj').toLowerCase() === 'cpf' ? 'CPF' : 'CNPJ',
      number: companyDocument,
    };
  }

  const profileDocument = digitsOnly(profile.cpf);
  if (profileDocument) {
    return {
      type: 'CPF',
      number: profileDocument,
    };
  }

  return null;
}

function sanitizeProviderError(errorBody: unknown) {
  if (!errorBody || typeof errorBody !== 'object') {
    return null;
  }

  const payload = errorBody as Record<string, unknown>;
  return {
    status: payload.status,
    error: payload.error,
    cause: Array.isArray(payload.cause)
      ? payload.cause.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const causeEntry = entry as Record<string, unknown>;
          return {
            code: causeEntry.code,
          };
        }).filter(Boolean)
      : undefined,
  };
}

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
        operation: 'billing.pix.requested',
      });
      throw new HttpError(403, 'Access denied.');
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const notificationUrl = Deno.env.get('MERCADOPAGO_NOTIFICATION_URL');

    await auditBillingEvent('billing.pix.requested', {
      provider: 'mercadopago',
      access_token_configured: Boolean(accessToken),
      mode: 'pix_fallback',
    });

    if (!accessToken) {
      return jsonResponse(503, {
        status: 'provider_not_ready',
        provider: 'mercadopago',
        message: 'O fallback por Pix ainda depende da configuração completa do provider neste ambiente.',
        nextStep: 'Configurar MERCADOPAGO_ACCESS_TOKEN para liberar a emissão segura da cobrança Pix.',
      }, req);
    }

    const [subscriptionResult, companyResult, pendingInvoiceResult] = await Promise.all([
      adminClient
        .from('subscriptions')
        .select('id, status, plan_amount, trial_ends_at, current_period_end')
        .eq('company_id', companyId)
        .maybeSingle(),
      adminClient
        .from('companies')
        .select('id, name, document_type, document, cnpj, contact_name')
        .eq('id', companyId)
        .single(),
      adminClient
        .from('invoices')
        .select('id, amount, due_date, status, payment_method_type, mp_payment_id, pix_qr_code, pix_qr_code_text, pix_expires_at, created_at')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .eq('payment_method_type', 'pix')
        .not('pix_qr_code_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (subscriptionResult.error) {
      throw new HttpError(500, 'Não foi possível consultar a assinatura.', subscriptionResult.error.message);
    }

    if (companyResult.error || !companyResult.data) {
      throw new HttpError(404, 'Empresa não encontrada para billing.', companyResult.error?.message);
    }

    if (pendingInvoiceResult.error) {
      throw new HttpError(500, 'Não foi possível consultar cobranças Pix pendentes.', pendingInvoiceResult.error.message);
    }

    const subscription = subscriptionResult.data;
    if (!subscription) {
      throw new HttpError(409, 'Assinatura não encontrada para emitir cobrança Pix.');
    }

    // Fail-closed: resolve price from dynamic plan config — no hardcoded fallback allowed.
    const planConfig = await getActivePlanConfig(adminClient);

    await auditBillingEvent('billing.pix.plan_config_resolved', {
      provider: 'mercadopago',
      plan_code: planConfig.plan_code,
      amount_cents: planConfig.amount_cents,
      currency: planConfig.currency,
      config_id: planConfig.id,
    });

    const company = companyResult.data;
    const pendingInvoice = pendingInvoiceResult.data;
    const now = new Date();

    if (pendingInvoice?.pix_expires_at) {
      const pixExpiresAt = new Date(pendingInvoice.pix_expires_at);
      if (!Number.isNaN(pixExpiresAt.getTime()) && pixExpiresAt.getTime() > now.getTime()) {
        await auditBillingEvent('billing.pix.reused', {
          provider: 'mercadopago',
          invoice_id: pendingInvoice.id,
        });

        return jsonResponse(200, {
          status: 'pix_ready',
          provider: 'mercadopago',
          message: 'Já existe uma cobrança Pix pendente para esta empresa. Reutilize o QR code abaixo antes de gerar uma nova.',
          invoiceId: pendingInvoice.id,
          amount: pendingInvoice.amount,
          dueDate: pendingInvoice.due_date,
          pixQrCode: pendingInvoice.pix_qr_code,
          pixQrCodeText: pendingInvoice.pix_qr_code_text,
          pixExpiresAt: pendingInvoice.pix_expires_at,
          mpPaymentId: pendingInvoice.mp_payment_id,
        }, req);
      }

      await adminClient
        .from('invoices')
        .update({
          status: 'failed',
          mp_error_code: 'pix_expired_before_reissue',
          updated_at: now.toISOString(),
        })
        .eq('id', pendingInvoice.id)
        .eq('company_id', companyId);
    }

    const payerEmail = profile.email;
    if (!payerEmail) {
      throw new HttpError(409, 'Atualize o e-mail do administrador antes de emitir cobrança Pix.');
    }

    const document = getDocumentContext(company, profile);
    if (!document?.number) {
      throw new HttpError(409, 'Cadastre o documento fiscal da empresa antes de emitir cobrança Pix.');
    }

    const invoiceId = crypto.randomUUID();
    const dueAt = buildDueDate(subscription);
    const dueDate = formatInvoiceDate(new Date(dueAt));
    const expiresAt = new Date(now.getTime() + PIX_EXPIRATION_MINUTES * 60 * 1000).toISOString();
    const amount = Number((planConfig.amount_cents / 100).toFixed(2));
    const idempotencyKey = `billing-pix:${companyId}:${invoiceId}`;
    const description = `Assinatura SaaS Restaurante - ${company.name}`;

    const paymentRequestBody: Record<string, unknown> = {
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      date_of_expiration: expiresAt,
      external_reference: invoiceId,
      payer: {
        email: payerEmail,
        first_name: company.contact_name || profile.full_name || company.name,
        entity_type: document.type === 'CNPJ' ? 'business' : 'individual',
        identification: {
          type: document.type,
          number: document.number,
        },
      },
    };

    if (notificationUrl) {
      paymentRequestBody.notification_url = notificationUrl;
    }

    const providerResponse = await fetch(`${MP_API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentRequestBody),
    });

    const providerPayload = await providerResponse.json().catch(() => null);

    if (!providerResponse.ok) {
      await auditBillingEvent('billing.pix.provider_error', {
        provider: 'mercadopago',
        company_id: companyId,
        response_status: providerResponse.status,
        provider_error: sanitizeProviderError(providerPayload),
      });
      throw new HttpError(502, 'O provider recusou a emissão da cobrança Pix. Revise os dados cadastrais e tente novamente.');
    }

    const mpPaymentId = providerPayload && typeof providerPayload === 'object' && 'id' in providerPayload
      ? String((providerPayload as { id: string | number }).id)
      : null;
    const pointOfInteraction = providerPayload && typeof providerPayload === 'object' && 'point_of_interaction' in providerPayload
      ? (providerPayload as { point_of_interaction?: { transaction_data?: { qr_code_base64?: string; qr_code?: string } } }).point_of_interaction
      : undefined;
    const pixQrCode = pointOfInteraction?.transaction_data?.qr_code_base64 || null;
    const pixQrCodeText = pointOfInteraction?.transaction_data?.qr_code || null;
    const pixExpiresAt = providerPayload && typeof providerPayload === 'object' && 'date_of_expiration' in providerPayload
      ? String((providerPayload as { date_of_expiration?: string }).date_of_expiration || expiresAt)
      : expiresAt;

    if (!mpPaymentId || !pixQrCode || !pixQrCodeText) {
      await auditBillingEvent('billing.pix.provider_payload_invalid', {
        provider: 'mercadopago',
        company_id: companyId,
      });
      throw new HttpError(502, 'O provider não retornou os dados necessários para o Pix. Tente novamente.');
    }

    const { error: insertInvoiceError } = await adminClient
      .from('invoices')
      .insert({
        id: invoiceId,
        company_id: companyId,
        subscription_id: subscription.id,
        status: 'pending',
        amount: planConfig.amount_cents,
        due_date: dueDate,
        payment_method_type: 'pix',
        mp_payment_id: mpPaymentId,
        pix_qr_code: pixQrCode,
        pix_qr_code_text: pixQrCodeText,
        pix_expires_at: pixExpiresAt,
      });

    if (insertInvoiceError) {
      await auditBillingEvent('billing.pix.invoice_persist_failed', {
        provider: 'mercadopago',
        invoice_id: invoiceId,
        error_code: insertInvoiceError.code,
      });
      throw new HttpError(500, 'Falha ao persistir a cobrança Pix.', insertInvoiceError.message);
    }

    await auditBillingEvent('billing.pix.issued', {
      provider: 'mercadopago',
      invoice_id: invoiceId,
      due_date: dueDate,
      amount_cents: planConfig.amount_cents,
      plan_config_id: planConfig.id,
      has_notification_url: Boolean(notificationUrl),
    });

    return jsonResponse(201, {
      status: 'pix_ready',
      provider: 'mercadopago',
      message: 'Cobrança Pix emitida com sucesso. Use o QR code ou o código copia-e-cola antes do vencimento.',
      nextStep: 'Após o pagamento, a reconciliação automática dependerá do webhook Mercado Pago ou de verificação operacional.',
      invoiceId,
      amount: planConfig.amount_cents,
      dueDate,
      pixQrCode,
      pixQrCodeText,
      pixExpiresAt,
      mpPaymentId,
    }, req);
  } catch (error) {
    if (error instanceof PlanConfigError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    return jsonResponse(500, {
      error: 'Unexpected Pix fallback bootstrap error.',
    }, req);
  }
});