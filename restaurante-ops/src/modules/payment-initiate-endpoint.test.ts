import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

const mod = await import('./payment-initiate-endpoint.js');

test('handleInitiatePaymentEndpoint retorna 202 com contrato esperado para status processing', async () => {
  const operator = {
    id: 'op-1',
    email: 'garcom@example.com',
    fullName: 'Garcom Teste',
    role: 'garcom',
    companyId: '11111111-1111-4111-8111-111111111111',
  };

  const response = await mod.handleInitiatePaymentEndpoint(
    {
      companyId: operator.companyId,
      comandaNumber: '501',
      amount: 1550,
      paymentMethod: 'cartao_debito',
      idempotencyKey: 'company:501:seed-123456',
    },
    operator,
    'req-123',
    {
      initiatePaymentFn: async () => ({
        provider: 'stone',
        transactionId: 'tx-1',
        providerPaymentId: 'pay-1',
        status: 'processing',
        nextAction: 'await_webhook',
        amount: 1550,
        paymentMethod: 'cartao_debito',
        message: 'Pagamento presencial em processamento na maquininha.',
        createdAt: '2026-04-07T12:00:00.000Z',
        updatedAt: '2026-04-07T12:00:00.000Z',
        correlationId: 'corr-1',
      }),
    },
  );

  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.payload, {
    status: 'processing',
    transactionId: 'tx-1',
    providerPaymentId: 'pay-1',
    nextAction: 'await_webhook',
    amount: 1550,
    paymentMethod: 'cartao_debito',
    message: 'Pagamento presencial em processamento na maquininha.',
    correlation_id: 'corr-1',
    created_at: '2026-04-07T12:00:00.000Z',
  });
});

test('handleInitiatePaymentEndpoint retorna 403 quando companyId difere do operador autenticado', async () => {
  const response = await mod.handleInitiatePaymentEndpoint(
    {
      companyId: '22222222-2222-4222-8222-222222222222',
      comandaNumber: '10',
      amount: 1000,
      paymentMethod: 'cartao_credito',
      idempotencyKey: 'company:10:seed-123456',
    },
    {
      id: 'op-2',
      email: 'caixa@example.com',
      fullName: 'Caixa Teste',
      role: 'caixa',
      companyId: '11111111-1111-4111-8111-111111111111',
    },
    'req-403',
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.payload, {
    code: 'forbidden',
    message: 'companyId nao corresponde ao tenant autenticado.',
    correlation_id: 'req-403',
  });
});

test('handleInitiatePaymentEndpoint retorna 400 para payload invalido', async () => {
  const response = await mod.handleInitiatePaymentEndpoint(
    {
      companyId: 'not-uuid',
      comandaNumber: 'abc',
      amount: 0,
      paymentMethod: 'cartao_credito',
      idempotencyKey: 'short',
    },
    {
      id: 'op-3',
      email: 'admin@example.com',
      fullName: 'Admin Teste',
      role: 'admin',
      companyId: '11111111-1111-4111-8111-111111111111',
    },
    'req-400',
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.code, 'invalid_request');
  assert.equal(response.payload.correlation_id, 'req-400');
});
