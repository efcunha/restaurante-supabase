import { test, expect, Page, Locator } from '@playwright/test';

async function waitAnyVisible(locators: Locator[], timeout = 30000) {
  await Promise.any(locators.map((locator) => locator.waitFor({ state: 'visible', timeout })));
}

async function loginIfNeeded(page: Page) {
  const loginEmail = page.getByPlaceholder('seu@email.com');
  const homeHints = [
    page.getByText('Pedido Delivery').first(),
    page.getByText('Novo Pedido').first(),
    page.getByText('Configurações').first(),
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

test.describe('Phase 12 Canary Ordering', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
  });

  test('deve abrir Novo Pedido e renderizar busca de cardapio', async ({ page }) => {
    await page.getByText('Novo Pedido').first().click();

    await expect(page.getByText('Novo Pedido').first()).toBeVisible({ timeout: 15000 });

    await waitAnyVisible([
      page.getByPlaceholder('Buscar item do cardápio...'),
      page.getByPlaceholder('Buscar produtos...'),
    ]);
  });

  test('deve abrir Pedido Delivery e renderizar formulario base', async ({ page }) => {
    await page.getByText('Pedido Delivery').first().click();

    await waitAnyVisible([
      page.getByPlaceholder('Nome do Cliente'),
      page.getByPlaceholder('Buscar no cardápio...'),
      page.getByText('Confirmar Delivery').first(),
    ]);
  });
});
