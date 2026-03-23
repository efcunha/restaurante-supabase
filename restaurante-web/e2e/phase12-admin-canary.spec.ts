import { test, expect, Page, Locator } from '@playwright/test';

async function waitAnyVisible(locators: Locator[], timeout = 30000) {
  await Promise.any(locators.map((locator) => locator.waitFor({ state: 'visible', timeout })));
}

async function loginIfNeeded(page: Page) {
  const loginEmail = page.getByPlaceholder('seu@email.com');
  const homeHints = [
    page.getByText('Administração').first(),
    page.getByText('Admin').first(),
    page.getByText('Novo Pedido').first(),
    page.getByText('Pedido Delivery').first(),
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

test.describe('Phase 12 Canary Admin', () => {
  test.setTimeout(120000);

  test('deve abrir admin e navegar em modulos financeiro/sistema', async ({ page }) => {
    await loginIfNeeded(page);

    if (await page.getByText('Administração').first().isVisible()) {
      await page.getByText('Administração').first().click();
    } else {
      await page.getByText('Admin').first().click();
    }

    await expect(page.getByText('FINANCEIRO').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('SISTEMA').first()).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Dashboard Financeiro').first()).toBeVisible();
    await expect(page.getByText('Gerenciar Funcionários').first()).toBeVisible();

    await page.getByText('Dashboard Financeiro').first().click();
    await expect(page.getByText('Dashboard Financeiro').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Voltar').first().click();

    await expect(page.getByText('FINANCEIRO').first()).toBeVisible({ timeout: 15000 });

    await page.getByText('Gerenciar Funcionários').first().click();
    await expect(page.getByText('Funcionários').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('+ NOVO FUNCIONÁRIO').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Voltar').first().click();

    await expect(page.getByText('SISTEMA').first()).toBeVisible({ timeout: 15000 });
  });
});
