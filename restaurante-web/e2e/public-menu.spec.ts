import { expect, test } from '@playwright/test';

const menuSlug = process.env.PLAYWRIGHT_PUBLIC_MENU_SLUG || process.env.EXPO_PUBLIC_PUBLIC_MENU_SLUG || 'restaurante-teste';

test.describe('[E2E] Public Menu smoke', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!menuSlug) {
      testInfo.skip(true, 'Slug publico ausente no ambiente.');
    }
  });

  test('carrega rota publica /menu/:slug com busca e categorias', async ({ page }) => {
    await page.goto(`/menu/${menuSlug}`);

    await Promise.race([
      page.getByLabel('Buscar produto').waitFor({ state: 'visible', timeout: 20000 }),
      page.getByPlaceholder('Buscar no cardapio...').waitFor({ state: 'visible', timeout: 20000 }),
      page.getByText('Cardapio nao encontrado para este endereco.').waitFor({ state: 'visible', timeout: 20000 }),
    ]);

    const notFoundMessage = page.getByText('Cardapio nao encontrado para este endereco.');
    const hasNotFound = await notFoundMessage.isVisible().catch(() => false);
    if (hasNotFound) {
      test.skip(true, `Slug publico sem cardapio ativo no ambiente atual: ${menuSlug}`);
    }

    await expect(page.getByLabel('Buscar produto')).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('Buscar no cardapio...')).toBeVisible({ timeout: 15000 });

    await expect(notFoundMessage).toHaveCount(0);

    const categoryButtons = page.locator('[aria-label^="Categoria "]');
    await expect(categoryButtons.first()).toBeVisible();

    await page.getByPlaceholder('Buscar no cardapio...').fill('pizza');
    await expect(page.getByPlaceholder('Buscar no cardapio...')).toHaveValue('pizza');
  });
});
