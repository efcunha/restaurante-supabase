import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

const mod = await import('./payment-gateway.js');

test('validateInitiatePaymentInput aceita payload valido', () => {
  const error = mod.validateInitiatePaymentInput({
    companyId: '11111111-1111-4111-8111-111111111111',
    comandaNumber: '123',
    amount: 2590,
    paymentMethod: 'cartao_debito',
    idempotencyKey: 'company:123:abc12345',
  });

  assert.equal(error, null);
});

test('validateInitiatePaymentInput aceita pix no payload valido', () => {
  const error = mod.validateInitiatePaymentInput({
    companyId: '11111111-1111-4111-8111-111111111111',
    comandaNumber: '124',
    amount: 3390,
    paymentMethod: 'pix',
    idempotencyKey: 'company:124:pix12345',
  });

  assert.equal(error, null);
});

test('validateInitiatePaymentInput rejeita amount nao inteiro e comanda invalida', () => {
  assert.equal(
    mod.validateInitiatePaymentInput({
      companyId: '11111111-1111-4111-8111-111111111111',
      comandaNumber: '12A',
      amount: 10.5,
      paymentMethod: 'cartao_credito',
      idempotencyKey: 'short',
    }),
    'comandaNumber invalido. Informe apenas numeros.',
  );
});

test('mapGatewayStatus normaliza estados externos', () => {
  assert.equal(mod.mapGatewayStatus('requires_action'), 'processing');
  assert.equal(mod.mapGatewayStatus('succeeded'), 'succeeded');
  assert.equal(mod.mapGatewayStatus('declined'), 'failed');
  assert.equal(mod.mapGatewayStatus('voided'), 'cancelled');
  assert.equal(mod.mapGatewayStatus('unknown_status'), 'pending');
});

test('canTransitionPaymentStatus bloqueia regressao de estados finais', () => {
  assert.equal(mod.canTransitionPaymentStatus('processing', 'succeeded'), true);
  assert.equal(mod.canTransitionPaymentStatus('succeeded', 'failed'), false);
  assert.equal(mod.canTransitionPaymentStatus('cancelled', 'processing'), false);
  assert.equal(mod.canTransitionPaymentStatus('failed', 'succeeded'), false);
});

test('verifyHyperswitchSignature valida HMAC sha256', async () => {
  const rawBody = JSON.stringify({ event_id: 'evt_1', payment_id: 'pay_1', status: 'processing' });
  const crypto = await import('node:crypto');
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  const digest = crypto.createHmac('sha256', webhookSecret).update(rawBody, 'utf-8').digest('hex');

  assert.equal(mod.verifyHyperswitchSignature(rawBody, digest, webhookSecret), true);
  assert.equal(mod.verifyHyperswitchSignature(rawBody, 'bad-signature', webhookSecret), false);
});

test('processHyperswitchWebhook ignora replay por event_id e bloqueia regressao', async () => {
  const baseTransaction = {
    id: 'tx-1',
    companyId: '11111111-1111-4111-8111-111111111111',
    comandaNumber: '321',
    amountCents: 2590,
    paymentMethod: 'cartao_debito',
    provider: 'stone',
    providerPaymentId: 'pay-1',
    providerStatus: 'processing',
    status: 'processing',
    idempotencyKey: 'idem-1',
    correlationId: 'corr-1',
    authCode: null,
    errorCode: null,
    errorMessage: null,
    lastWebhookEventId: null,
    metadata: {} as Record<string, unknown>,
    createdAt: '2026-04-07T10:00:00.000Z',
    updatedAt: '2026-04-07T10:00:00.000Z',
  };

  let current: import('./payment-gateway.js').PaymentTransactionRecord = {
    ...baseTransaction,
    paymentMethod: 'cartao_debito',
    status: 'processing',
  };

  const repository = {
    getGatewayConfig: async () => null,
    findTransactionByIdempotencyKey: async () => null,
    insertTransaction: async () => current,
    findTransactionById: async () => current,
    findTransactionByProviderPaymentId: async (providerPaymentId: string) => providerPaymentId === current.providerPaymentId ? current : null,
    updateTransaction: async (_transactionId: string, patch: Record<string, unknown>) => {
      current = {
        ...current,
        providerStatus: typeof patch.providerStatus === 'string' ? patch.providerStatus : current.providerStatus,
        status: (patch.status as typeof current.status | undefined) ?? current.status,
        authCode: (patch.authCode as string | null | undefined) ?? current.authCode,
        errorCode: (patch.errorCode as string | null | undefined) ?? current.errorCode,
        errorMessage: (patch.errorMessage as string | null | undefined) ?? current.errorMessage,
        lastWebhookEventId: (patch.lastWebhookEventId as string | null | undefined) ?? current.lastWebhookEventId,
        metadata: (patch.metadata as Record<string, unknown> | undefined) ?? current.metadata,
        updatedAt: '2026-04-07T10:05:00.000Z',
      };
      return current;
    },
  };

  const first = await mod.processHyperswitchWebhook(
    { event_id: 'evt-1', payment_id: 'pay-1', status: 'succeeded' },
    { repository },
  );

  assert.equal(first.applied, true);
  assert.equal(first.status, 'succeeded');

  const duplicate = await mod.processHyperswitchWebhook(
    { event_id: 'evt-1', payment_id: 'pay-1', status: 'succeeded' },
    { repository },
  );

  assert.equal(duplicate.duplicate, true);

  const lateFailure = await mod.processHyperswitchWebhook(
    { event_id: 'evt-2', payment_id: 'pay-1', status: 'failed' },
    { repository },
  );

  assert.equal(lateFailure.applied, false);
  assert.equal(lateFailure.transitionSkipped, true);
  assert.equal(lateFailure.status, 'succeeded');
});
