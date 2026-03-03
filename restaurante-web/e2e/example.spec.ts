import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // The app title is likely "Restaurante" or similar, just checking if page loads.
  await expect(page).toHaveTitle(/Restaurante/);
});

test('check main container', async ({ page }) => {
  await page.goto('/');

  // Checks if the root div exists, standard in React apps
  const root = page.locator('#root');
  await expect(root).toBeVisible({ timeout: 10000 });
});
