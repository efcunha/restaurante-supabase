import { test, expect } from '@playwright/test';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

test('Admin > Gerenciar Cardapio > Subcategorias de Bebidas', async ({ page }) => {
  test.setTimeout(180000);

  const adminEmail = getRequiredEnv('PLAYWRIGHT_TEST_EMAIL_ADMIN');
  const adminPassword = getRequiredEnv('PLAYWRIGHT_TEST_PASSWORD_ADMIN');

  await page.goto('/');
  await page.getByPlaceholder('seu@email.com').fill(adminEmail);
  await page.getByPlaceholder('••••••••').fill(adminPassword);
  await page.getByText('ENTRAR', { exact: true }).click();

  const adminTab = page.getByText('Administração', { exact: true });
  await expect(adminTab).toBeVisible({ timeout: 20000 });
  await adminTab.click();

  const gerenciarCardapioAction = page.getByText('Gerenciar Cardápio', { exact: true });
  await expect(gerenciarCardapioAction).toBeVisible({ timeout: 20000 });
  await gerenciarCardapioAction.click();

  await expect(page.getByText('Gerenciar Subcategorias de Bebidas', { exact: false })).toBeVisible({ timeout: 20000 });
  const input = page.getByPlaceholder('Ex: Drinks');
  await expect(input).toBeVisible({ timeout: 20000 });
  const probeValue = `E2E Admin Probe ${Date.now()}`;
  await input.fill(probeValue);
  await expect(input).toHaveValue(probeValue);
});
