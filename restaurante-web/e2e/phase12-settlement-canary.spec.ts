import { test, expect, Page, Locator } from '@playwright/test';

async function waitAnyVisible(locators: Locator[], timeout = 30000) {
  await Promise.any(locators.map((locator) => locator.waitFor({ state: 'visible', timeout })));
}

async function loginIfNeeded(page: Page) {
  const loginEmail = page.getByPlaceholder('seu@email.com');
  const homeHints = [
    page.getByText('Pedido Delivery').first(),
    page.getByText('Novo Pedido').first(),
    page.getByText('Comandas').first(),
  ];

  await page.goto('/');

  await Promise.race([
    loginEmail.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    waitAnyVisible(homeHints, 30000).catch(() => {}),
  ]);

  if (await loginEmail.isVisible()) {
    await loginEmail.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
    await page.getByPlaceholder('••••••••').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
    await page.getByText('ENTRAR').first().click();
    await waitAnyVisible(homeHints, 30000);
  }
}

async function createOpenOrderIfNeeded(page: Page) {
  await page.getByText('Novo Pedido').first().click();

  const clientInput = page.getByPlaceholder('Digite o nome');
  await expect(clientInput).toBeVisible({ timeout: 15000 });

  await clientInput.fill(`Canary Settlement ${Date.now()}`);

  const mesaInput = page.locator('input[placeholder="Nº"]').first();
  await mesaInput.waitFor({ state: 'visible', timeout: 10000 });
  await mesaInput.fill('9');

  const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill('caldo');
  await page.waitForTimeout(1200);

  const plusButton = page
    .locator('div[role="button"], div[dir="auto"]')
    .filter({ hasText: '+' })
    .filter({ visible: true })
    .first();

  await plusButton.click();
  await page.waitForTimeout(600);

  await page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last().click();

  const successToast = page.locator('text=/Pedido criado!/i').first();
  await expect(successToast).toBeVisible({ timeout: 15000 });
}

test.describe('Phase 12 Canary Settlement', () => {
  test.setTimeout(180000);

  test('deve abrir Gerenciamento e navegar para Resumo e Pagamento', async ({ page }) => {
    await loginIfNeeded(page);
    await createOpenOrderIfNeeded(page);

    await page.getByText('Comandas').first().click();
    await expect(page.getByText('Gerenciamento').first()).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    await waitAnyVisible([
      page.getByText('Comanda ').first(),
      page.getByText('Nenhuma comanda encontrada.').first(),
    ]);

    if (await page.getByText('Nenhuma comanda encontrada.').first().isVisible()) {
      throw new Error('Nenhuma comanda encontrada para validar o fluxo de settlement.');
    }

    await page.getByText('Comanda ').first().click();
    await expect(page.getByText('RATEIO (DIVISÃO)').first()).toBeVisible({ timeout: 15000 });

    await page.getByText('RATEIO (DIVISÃO)').first().click();

    await expect(page.getByText('Resumo e Pagamento').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Confirmar Pagamento').first()).toBeVisible({ timeout: 15000 });

    await waitAnyVisible([
      page.getByText('Por Pessoas').first(),
      page.getByText('Por Itens').first(),
    ]);
  });
});
