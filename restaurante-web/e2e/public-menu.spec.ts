import { expect, test } from '@playwright/test';

const menuSlug = process.env.PLAYWRIGHT_PUBLIC_MENU_SLUG || '';

test.describe('[E2E] Public Menu smoke', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!menuSlug) {
      testInfo.skip();
    }
  });

  test('carrega rota publica /menu/:slug com busca e categorias', async ({ page }) => {
    await page.goto(`/menu/${menuSlug}`);

    await expect(page.getByLabel('Buscar produto')).toBeVisible();
    await expect(page.getByPlaceholder('Buscar no cardapio...')).toBeVisible();

    const notFoundMessage = page.getByText('Cardapio nao encontrado para este endereco.');
    await expect(notFoundMessage).toHaveCount(0);

    const categoryButtons = page.locator('[aria-label^="Categoria "]');
    await expect(categoryButtons.first()).toBeVisible();

    await page.getByPlaceholder('Buscar no cardapio...').fill('pizza');
    await expect(page.getByPlaceholder('Buscar no cardapio...')).toHaveValue('pizza');
  });
});
