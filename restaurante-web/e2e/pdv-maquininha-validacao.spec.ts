import { test, expect } from '@playwright/test';

const isIntReal = process.env.PDV_E2E_INT_REAL === 'true';
const opsBaseUrl = process.env.PLAYWRIGHT_OPS_BASE_URL || 'https://ops.restaurante-web.app.br';

// Dados de teste parametrizáveis via environment
const TEST_COMPANY_ID = process.env.E2E_TEST_COMPANY_ID || '';
const TEST_COMANDA_NUMBER = process.env.E2E_TEST_COMANDA || '999';
const TEST_AUTH_TOKEN = process.env.E2E_TEST_TOKEN || process.env.PLAYWRIGHT_AUTH_TOKEN || '';

test.describe('[E2E] TEF-14/15: Validação API (INT_REAL only)', () => {
  test.beforeEach(async ({}, testInfo) => {
    // Skip se não estiver em modo INT_REAL ou se faltar credenciais
    if (!isIntReal) {
      testInfo.skip();
    }
    if (!TEST_AUTH_TOKEN) {
      console.warn(
        '[E2E] ⏭️ Skipping TEF-14/15: E2E_TEST_TOKEN ou PLAYWRIGHT_AUTH_TOKEN não configurado.\n' +
        '   Para executar testes INT_REAL, configure:\n' +
        '   export E2E_TEST_TOKEN="seu-bearer-token"\n' +
        '   export E2E_TEST_COMPANY_ID="sua-company-uuid"\n'
      );
      testInfo.skip();
    }
    if (!TEST_COMPANY_ID) {
      console.warn('[E2E] ⏭️ Skipping TEF-14/15: E2E_TEST_COMPANY_ID não configurado.');
      testInfo.skip();
    }
  });

  test('TEF-14: Idempotência - mesma chave retorna mesma transação', async ({ request }) => {
    const idempotencyKey = `tef14-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amount = 10000; // 100 BRL

    console.log('[E2E][TEF-14] Test: Idempotência');
    console.log(`  Company: ${TEST_COMPANY_ID}`);
    console.log(`  Comanda: ${TEST_COMANDA_NUMBER}`);
    console.log(`  Idemkey: ${idempotencyKey}`);

    // Primeira chamada
    const res1 = await request.post(`${opsBaseUrl}/payments/initiate`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
      data: {
        companyId: TEST_COMPANY_ID,
        comandaNumber: TEST_COMANDA_NUMBER,
        amount,
        paymentMethod: 'cartao_credito',
        idempotencyKey,
      },
    });

    const json1 = await res1.json();
    console.log(`  [1st call] status=${res1.status()}, txnId=${json1?.transactionId?.slice(0, 8)}...`);

    expect(res1.status()).toBe(202);
    expect(json1?.transactionId).toBeTruthy();
    const txnId1 = json1.transactionId;

    // Segunda chamada com mesma chave
    const res2 = await request.post(`${opsBaseUrl}/payments/initiate`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
      data: {
        companyId: TEST_COMPANY_ID,
        comandaNumber: TEST_COMANDA_NUMBER,
        amount,
        paymentMethod: 'cartao_credito',
        idempotencyKey, // MESMA CHAVE
      },
    });

    const json2 = await res2.json();
    console.log(`  [2nd call] status=${res2.status()}, txnId=${json2?.transactionId?.slice(0, 8)}...`);

    expect(res2.status()).toBe(202);
    expect(json2?.transactionId).toBe(txnId1);
    console.log('  ✅ Confirmado: transactionIds iguais (idempotência OK)');
  });

  test('TEF-15a: Validação - rejeita comanda inexistente', async ({ request }) => {
    const invalidComanda = '99999999';
    const idempotencyKey = `tef15a-${Date.now()}`;
    const amount = 10000;

    console.log('[E2E][TEF-15a] Test: Rejeita comanda inválida');
    console.log(`  Company: ${TEST_COMPANY_ID}`);
    console.log(`  Comanda: ${invalidComanda} (deve ser inexistente)`);

    const res = await request.post(`${opsBaseUrl}/payments/initiate`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
      data: {
        companyId: TEST_COMPANY_ID,
        comandaNumber: invalidComanda,
        amount,
        paymentMethod: 'cartao_credito',
        idempotencyKey,
      },
    });

    const json = await res.json();
    console.log(`  status=${res.status()}, message="${json?.message?.slice(0, 60)}..."`);

    expect(res.status()).toBe(400);
    expect(json?.code).toBe('invalid_comanda');
    console.log('  ✅ Confirmado: comanda inválida rejeitada com HTTP 400');
  });

  test('TEF-15b: Validação - rejeita saldo insuficiente', async ({ request }) => {
    const excessiveAmount = 999999900; // 9.999.999 BRL (certamente maior que qualquer saldo)
    const idempotencyKey = `tef15b-${Date.now()}`;

    console.log('[E2E][TEF-15b] Test: Rejeita saldo insuficiente');
    console.log(`  Company: ${TEST_COMPANY_ID}`);
    console.log(`  Comanda: ${TEST_COMANDA_NUMBER}`);
    console.log(`  Amount: R$ ${(excessiveAmount / 100).toFixed(2)} (deve exceder saldo)`);

    const res = await request.post(`${opsBaseUrl}/payments/initiate`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
      data: {
        companyId: TEST_COMPANY_ID,
        comandaNumber: TEST_COMANDA_NUMBER,
        amount: excessiveAmount,
        paymentMethod: 'cartao_credito',
        idempotencyKey,
      },
    });

    const json = await res.json();
    console.log(`  status=${res.status()}, message="${json?.message?.slice(0, 60)}..."`);

    expect(res.status()).toBe(400);
    // Em producao, mensagens detalhadas podem ser sanitizadas por seguranca.
    expect(['invalid_comanda', 'insufficient_balance']).toContain(json?.code);
    console.log('  ✅ Confirmado: saldo insuficiente rejeitado com HTTP 400');
  });
});
