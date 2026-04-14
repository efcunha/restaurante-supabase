import { expect, test } from '@playwright/test';

test.describe('Auth UI - Fase 1', () => {
  test('deve renderizar login com campos e controles principais', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Entrar na plataforma')).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByText('ENTRAR', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Mostrar senha')).toBeVisible();
  });

  test('deve navegar para cadastro e voltar para login', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Cadastre seu restaurante').click();
    await expect(page.getByText('Cadastro inicial')).toBeVisible();

    await page.getByText('Voltar ao login').click();
    await expect(page.getByText('Entrar na plataforma')).toBeVisible();
  });
});
