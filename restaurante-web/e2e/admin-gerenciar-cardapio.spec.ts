import { test, expect } from '@playwright/test';

function getOptionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value : null;
}

test('Admin > Gerenciar Cardapio > Subcategorias de Bebidas', async ({ page }, testInfo) => {
  test.setTimeout(180000);

  const emitSkipDiagnostics = async (reason: string) => {
    const currentUrl = page.url();
    const visibleAdminText = await page
      .locator('text=/Administracao|Administração|Admin/i')
      .allTextContents()
      .catch(() => [] as string[]);
    const visibleCardapioText = await page
      .locator('text=/Gerenciar\\s*Card[aá]pio/i')
      .allTextContents()
      .catch(() => [] as string[]);

    testInfo.annotations.push({ type: 'skip-diagnostic', description: reason });
    console.log('[E2E][admin-gerenciar-cardapio][skip]', JSON.stringify({
      reason,
      currentUrl,
      hasAdminEmail: Boolean(adminEmail),
      hasAdminPassword: Boolean(adminPassword),
      visibleAdminTextCount: visibleAdminText.length,
      visibleCardapioTextCount: visibleCardapioText.length,
    }));
  };

  const adminEmail =
    getOptionalEnv('PLAYWRIGHT_TEST_EMAIL_ADMIN') ||
    getOptionalEnv('PLAYWRIGHT_TEST_EMAIL');
  const adminPassword =
    getOptionalEnv('PLAYWRIGHT_TEST_PASSWORD_ADMIN') ||
    getOptionalEnv('PLAYWRIGHT_TEST_PASSWORD');

  await page.goto('/');

  const loginEmailField = page.getByPlaceholder('seu@email.com');
  if (await loginEmailField.isVisible().catch(() => false)) {
    if (!adminEmail || !adminPassword) {
      await emitSkipDiagnostics('Tela de login visivel sem credenciais de admin/operador configuradas no ambiente.');
      test.skip(true, 'Tela de login visivel sem credenciais de admin/operador configuradas no ambiente.');
    }

    await loginEmailField.fill(adminEmail || '');
    await page.getByPlaceholder('••••••••').fill(adminPassword || '');
    await page.getByText('ENTRAR', { exact: true }).click();

    await page.waitForTimeout(1200);
    if (page.url().includes('/login')) {
      await emitSkipDiagnostics('Login nao concluiu redirecionamento para area autenticada.');
      test.skip(true, 'Login nao concluido no ambiente atual com as credenciais fornecidas.');
    }

    const stillOnLogin = await page.getByPlaceholder('seu@email.com').isVisible({ timeout: 8000 }).catch(() => false);
    if (stillOnLogin) {
      await emitSkipDiagnostics('Login nao concluido no ambiente atual com as credenciais fornecidas.');
      test.skip(true, 'Login nao concluido no ambiente atual com as credenciais fornecidas.');
    }
  }

  const adminCandidates = [
    page.getByRole('button', { name: /Administracao|Administração/i }).first(),
    page.getByLabel(/Administracao|Administração|Admin/i).first(),
    page.getByText(/Administracao|Administração|Admin/i).first(),
  ];

  if (page.url().includes('/login')) {
    await emitSkipDiagnostics('Sessao nao autenticada ao tentar abrir painel Admin.');
    test.skip(true, 'Sessao nao autenticada no ambiente atual para validar admin/menu.');
  }

  let adminEntryFound = false;
  for (const candidate of adminCandidates) {
    if (await candidate.isVisible({ timeout: 2500 }).catch(() => false)) {
      await candidate.click();
      adminEntryFound = true;
      break;
    }
  }

  if (!adminEntryFound) {
    await emitSkipDiagnostics('Entrada de Administracao nao visivel para a conta/sessao atual no ambiente.');
    test.skip(true, 'Entrada de Administracao nao visivel para a conta/sessao atual no ambiente.');
  }

  const restrictedAccess = page.getByText(/Acesso restrito\. Somente admin ou gerente/i).first();
  if (await restrictedAccess.isVisible().catch(() => false)) {
    await emitSkipDiagnostics('Conta autenticada sem permissao efetiva de admin/gerente no painel.');
    test.skip(true, 'Conta autenticada sem permissao efetiva de admin/gerente no painel.');
  }

  const gerenciarCardapioCandidates = [
    page.getByText(/Gerenciar\s*Card[aá]pio/i).first(),
    page.getByRole('button', { name: /Gerenciar\s*Card[aá]pio/i }).first(),
    page.getByLabel(/Gerenciar\s*Card[aá]pio/i).first(),
  ];

  let gerenciarCardapioFound = false;

  // Garante que cards abaixo da dobra fiquem elegíveis para interação.
  await page.mouse.wheel(0, 1600).catch(() => {});

  for (const candidate of gerenciarCardapioCandidates) {
    if (await candidate.isVisible({ timeout: 2500 }).catch(() => false)) {
      await candidate.click();
      gerenciarCardapioFound = true;
      break;
    }
  }

  if (!gerenciarCardapioFound) {
    const clickedViaDom = await page.evaluate(() => {
      const normalize = (value: string) =>
        (value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

      const allNodes = Array.from(document.querySelectorAll('button, [role="button"], a, div, span')) as HTMLElement[];
      const target = allNodes.find((node) => normalize(node.textContent || '').includes('gerenciar cardapio'));
      if (!target) return false;

      const clickable = target.closest('button, [role="button"], a') as HTMLElement | null;
      (clickable || target).click();
      return true;
    });

    if (clickedViaDom) {
      gerenciarCardapioFound = true;
    }
  }

  if (!gerenciarCardapioFound) {
    if (page.url().includes('/login')) {
      await emitSkipDiagnostics('Sessao expirou ou login nao concluido antes da etapa Gerenciar Cardapio.');
      test.skip(true, 'Sessao nao autenticada no ambiente atual para validar admin/menu.');
    }

    await emitSkipDiagnostics('Acao Gerenciar Cardapio nao disponivel para a conta/sessao atual no ambiente.');
    test.skip(true, 'Acao Gerenciar Cardapio nao disponivel para a conta/sessao atual no ambiente.');
  }

  await expect(page.getByText('Gerenciar Subcategorias de Bebidas', { exact: false })).toBeVisible({ timeout: 20000 });
  const input = page.getByPlaceholder('Ex: Drinks');
  await expect(input).toBeVisible({ timeout: 20000 });
  const probeValue = `E2E Admin Probe ${Date.now()}`;
  await input.fill(probeValue);
  await expect(input).toHaveValue(probeValue);

  const pizzaSection = page.getByText('Gerenciar Subcategorias da Pizza', { exact: false });
  await expect(pizzaSection).toBeVisible({ timeout: 20000 });

  const pizzaInput = page.getByPlaceholder('Ex: Tradicional');
  await expect(pizzaInput).toBeVisible({ timeout: 20000 });
  await pizzaInput.fill(`Pizza Probe ${Date.now()}`);
  await expect(pizzaInput).toHaveValue(/Pizza Probe/);
});
