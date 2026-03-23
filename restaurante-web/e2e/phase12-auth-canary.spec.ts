import { test, expect, Page, Locator } from '@playwright/test';

async function waitAnyVisible(locators: Locator[], timeout = 30000) {
  await Promise.any(locators.map((locator) => locator.waitFor({ state: 'visible', timeout })));
}

async function ensureLoginScreen(page: Page) {
  const loginEmail = page.getByPlaceholder('seu@email.com');

  await page.goto('/');

  if (await loginEmail.isVisible()) {
    return;
  }

  const sairButton = page.getByText('Sair').first();
  if (await sairButton.isVisible()) {
    await sairButton.click();
    await expect(loginEmail).toBeVisible({ timeout: 15000 });
    return;
  }

  await page.context().clearCookies();
  await page.reload();
  await expect(loginEmail).toBeVisible({ timeout: 15000 });
}

test.describe('Phase 12 Canary Auth', () => {
  test.setTimeout(120000);

  test('deve renderizar login e CTA de cadastro', async ({ page }) => {
    await ensureLoginScreen(page);

    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByText('ENTRAR').first()).toBeVisible();
    await expect(page.getByText('Não tem conta? Cadastre seu restaurante')).toBeVisible();
  });

  test('deve autenticar e chegar na home', async ({ page }) => {
    await ensureLoginScreen(page);

    await page.getByPlaceholder('seu@email.com').fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
    await page.getByPlaceholder('••••••••').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
    await page.getByText('ENTRAR').first().click();

    await waitAnyVisible([
      page.getByText('Pedido Delivery').first(),
      page.getByText('Novo Pedido').first(),
      page.getByText('Configurações').first(),
    ]);
  });
});
