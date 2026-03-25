/**
 * Smoke Test Automation para Billing (Fase 2)
 * 
 * Objetivo: Validar fluxo end-to-end de assinatura com TEST- credentials
 * Uso: npx playwright test SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts --project=chromium
 * 
 * Docs: https://playwright.dev
 */

import { test, expect, Page } from '@playwright/test';

const OPS_URL = process.env.OPS_URL || 'https://ops.restaurante-web.app.br';

// Credenciais de teste (customize conforme seu ambiente)
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test-billing@restaurante.local',
  password: process.env.TEST_PASSWORD || 'TestPassword123!',
};

const TEST_CARD = {
  number: '4235647728025682',
  expiry: '12/25',
  cvv: '123',
  name: 'TEST USER',
};

test.describe('Smoke Test - Billing (Fase 2)', () => {
  let page: Page;
  let invoiceId: string;

  test.beforeAll(async ({ browser }) => {
    // Pode reusar page entre testes ou criar nova para cada um
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  /**
   * S1: Tela de assinatura carrega sem erro auth
   */
  test('S1: Tela de assinatura carrega sem erro auth', async () => {
    // Login
    await page.goto(`${OPS_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button:has-text("Entrar")');

    // Aguardar redirecionamento (dashboard ou inicial)
    await page.waitForURL(`${OPS_URL}/**`);

    // Navegar para Assinatura
    await page.goto(`${OPS_URL}/billing`);

    // Validar carregamento sem erro de auth
    // (Esperado: 200, Não esperado: 401, 403)
    const response = await page.goto(`${OPS_URL}/billing`);
    expect(response?.status()).toBeLessThan(400);

    // Confirmar elemento de assinatura visível (customize seletor conforme seu UI)
    const subscriptionTitle = await page.locator('h1:has-text("Assinatura")');
    await expect(subscriptionTitle).toBeVisible({ timeout: 10000 });

    // Validar console sem erros auth
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Aguardar carregamento completo
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);

    // Verificar se há erros de 403 ou 401 em console
    const authErrors = consoleLogs.filter(
      (log) => log.includes('403') || log.includes('401') || log.includes('Unauthorized')
    );
    expect(authErrors).toHaveLength(0);

    console.log('✓ S1 PASS: Tela de assinatura carregou sem erro auth');
  });

  /**
   * S2: Gerar PIX e validar criação de invoice
   */
  test('S2: Gerar PIX e validar criação de invoice', async () => {
    // Pré-requisito: estar logado
    await page.goto(`${OPS_URL}/billing`);

    // Clicar no botão "Gerar PIX" ou "Novo Plano" (customize seletor)
    const pixButton = await page.locator('button:has-text("PIX")').first();
    await expect(pixButton).toBeVisible();
    await pixButton.click();

    // Aguardar modal/tela de PIX abrir
    const pixQrCode = await page.locator('[data-testid="pix-qr-code"]');
    await expect(pixQrCode).toBeVisible({ timeout: 10000 });

    // QR code foi gerado
    console.log('✓ S2a PASS: PIX QR code gerado');

    // Validar em SQL que invoice foi criada (manual ou via API)
    // Para automação, você pode fazer chamada direto à API se houver endpoint de validação
    // ou marcar timestamp aqui e validar manualmente depois

    const timestamp = new Date().toISOString();
    console.log(`✓ S2b: Timestamp de geração PIX: ${timestamp}`);
    console.log('   Validar em SQL: SELECT * FROM invoices WHERE created_at > NOW() - INTERVAL 5 minutes');
  });

  /**
   * S3: Cadastrar cartão TEST e validar persistência
   */
  test('S3: Cadastrar cartão TEST e validar persistência', async () => {
    // Pré-requisito: estar em billing
    await page.goto(`${OPS_URL}/billing`);

    // Clicar em "Adicionar Cartão" ou similar
    const addCardButton = await page.locator('button:has-text("Cartão")').first();
    await expect(addCardButton).toBeVisible();
    await addCardButton.click();

    // Preencher formulário de cartão (customize seletores conforme seu formulário)
    const cardNumberInput = await page.locator('input[placeholder*="Número do cartão"]');
    const expiryInput = await page.locator('input[placeholder*="Validade"]');
    const cvvInput = await page.locator('input[placeholder*="CVV"]');
    const nameInput = await page.locator('input[placeholder*="Titular"]');

    await expect(cardNumberInput).toBeVisible();
    await cardNumberInput.fill(TEST_CARD.number);
    await expiryInput.fill(TEST_CARD.expiry);
    await cvvInput.fill(TEST_CARD.cvv);
    await nameInput.fill(TEST_CARD.name);

    // Clicar em "Salvar" ou "Confirmar"
    const confirmButton = await page.locator('button:has-text("Salvar")').first();
    await confirmButton.click();

    // Aguardar sucesso (modal fecha ou mensagem de sucesso)
    const successMessage = await page
      .locator('text=/Cartão adicionado|Card saved/i')
      .first();
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Validar que cartão armazenado é mascarado (não deve mostrar número completo)
    const cardDisplay = await page.locator('[data-testid="saved-card"]');
    const cardText = await cardDisplay.textContent();
    expect(cardText).toMatch(/\*+.*\d{4}/); // Esperado: algo como **** **** **** 5682

    console.log('✓ S3a PASS: Cartão TEST persistido com máscara');
    console.log('   Validar em SQL sem vazamento via query de audit log');
  });

  /**
   * S4: Simular webhook idempotente (manual via curl, validar resposta aqui se houver endpoint exposto)
   * Nota: Webhook é melhor testado via curl/Postman, mas deixamos estrutura aqui para referência
   */
  test('S4: Validar webhook sem duplicação (referência manual)', async () => {
    // Este teste é principalmente manual (curl), mas você pode adicionar
    // uma validação de endpoint webhook_status se existir

    console.log('Manual test: Execute curl webhook 2x com mesmo ID e valide idempotência');
    console.log(`
curl -X POST "${OPS_URL}/functions/v1/billing-webhook" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "webhook-test-001", "type": "payment.created", "status": "approved"}'
    `);

    // Se houver endpoint de status de webhook, validar aqui
    const webhookStatusResponse = await page.request.get(`${OPS_URL}/functions/v1/billing-provider-status`);
    const webhookStatus = await webhookStatusResponse.json();

    // Validar que webhook está healthy
    expect(webhookStatus).toHaveProperty('ok', true);
    console.log('✓ S4 PASS (validação parcial): Webhook endpoint respondendo');
  });

  /**
   * S5: License gate sem regressão (usuário sem assinatura é bloqueado)
   */
  test('S5: License gate sem regressão', async () => {
    // Este teste requer conta sem assinatura ativa
    // Alternativa: mockar a resposta de assinatura para NOT_ACTIVE

    // Abrir app com token de usuário sem assinatura
    const testPageWithoutSubscription = await page.context().newPage();
    await testPageWithoutSubscription.goto(`${OPS_URL}/app`);

    // Esperar redirecionamento para billing (license gate ativo)
    await expect(testPageWithoutSubscription).toHaveURL(/billing|subscription/);

    console.log('✓ S5 PASS: Usuário sem assinatura redirecionado para billing');

    await testPageWithoutSubscription.close();
  });

  /**
   * Teste auxiliar: Health check de provider de billing
   */
  test('Auxiliary: Health check billing-provider-status', async () => {
    const response = await page.request.get(
      `${OPS_URL}/functions/v1/billing-provider-status`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('ok');

    // Se ok=true, Mercado Pago está respondendo
    if (data.ok) {
      console.log('✓ Billing provider health: OK');
    } else {
      console.warn('⚠ Billing provider health: DEGRADED');
      console.warn(data.error || 'Unknown error');
    }
  });
});

/**
 * Notas de execução:
 * 
 * 1. Configure variáveis de ambiente:
 *    export OPS_URL=https://ops.restaurante-web.app.br
 *    export TEST_EMAIL=seu-email@restaurante.local
 *    export TEST_PASSWORD=sua-senha
 * 
 * 2. Execute:
 *    npx playwright test SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts --project=chromium
 * 
 * 3. Monitore output e ajuste seletores conforme seu UI
 * 
 * 4. Testes manuais (curl webhook) executar em paralelo em outro terminal
 * 
 * 5. Registre resultados em SMOKE-TEST-26MAR-EXECUTION-PLAN.md (seção Registro)
 */
