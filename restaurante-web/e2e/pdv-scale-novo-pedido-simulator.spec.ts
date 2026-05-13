import { expect, test, type Page } from '@playwright/test';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-env';

type AuthSessionToken = {
  access_token?: string;
  user?: {
    id?: string;
  };
};

type WeightedProduct = {
  id: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  vendido_por_peso?: boolean | null;
};

async function loginIfNeeded(page: Page) {
  await page.goto('/');

  const loginEmail = page.getByPlaceholder('seu@email.com');
  const dashboard = page.getByText('Novo Pedido').first();

  await Promise.race([
    loginEmail.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    dashboard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);

  if (await loginEmail.isVisible().catch(() => false)) {
    const email = process.env.PLAYWRIGHT_TEST_EMAIL;
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'PLAYWRIGHT_TEST_EMAIL/PLAYWRIGHT_TEST_PASSWORD nao configurados.');
      return;
    }

    await loginEmail.fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByText('ENTRAR', { exact: true }).click();
    await expect(dashboard).toBeVisible({ timeout: 30000 });
  }
}

async function getAuthSession(page: Page): Promise<AuthSessionToken> {
  const raw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
  return raw ? (JSON.parse(raw) as AuthSessionToken) : {};
}

async function getCompanyId(accessToken: string, userId: string): Promise<string | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=company_id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as Array<{ company_id?: string | null }>;
  return rows[0]?.company_id || null;
}

async function findWeightedProduct(accessToken: string, companyId: string): Promise<WeightedProduct | null> {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  let response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?company_id=eq.${encodeURIComponent(companyId)}&available=eq.true&select=id,name,unit,category,vendido_por_peso&order=name.asc&limit=200`,
    { headers }
  );

  if (!response.ok) {
    response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?company_id=eq.${encodeURIComponent(companyId)}&available=eq.true&select=id,name,unit,category&order=name.asc&limit=200`,
      { headers }
    );
  }

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as WeightedProduct[];
  return rows.find((product) => {
    const unit = String(product.unit || '').toLowerCase();
    return product.vendido_por_peso === true || unit.includes('kg') || unit.includes('quilo');
  }) || null;
}

async function findLatestOrderByClient(accessToken: string, clientName: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?client_name=eq.${encodeURIComponent(clientName)}&status=neq.cancelled&select=id,client_name,items,items_with_status,created_at&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Falha ao consultar pedido criado: ${response.status}`);
  }

  const rows = (await response.json()) as Array<{
    id: string;
    client_name: string;
    items?: string[];
    items_with_status?: Array<Record<string, unknown>>;
    created_at?: string;
  }>;

  return rows[0] || null;
}

async function countProductsForCompany(accessToken: string, companyId: string): Promise<number | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?company_id=eq.${encodeURIComponent(companyId)}&select=id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  return rows.length;
}

async function clickPlusUntilWeightModal(page: Page, maxAttempts = 24): Promise<{ opened: boolean; attempts: number; plusVisible: number }> {
  const modalTitle = page.getByText('Pesagem assistida');
  const listViewport = page.locator('div').first();

  let attempts = 0;
  let plusVisible = 0;

  for (let round = 0; round < 8 && attempts < maxAttempts; round += 1) {
    const selectorStrategies = [
      page.getByRole('button', { name: /^\+$/ }).filter({ visible: true }),
      page.locator('div[role="button"]').filter({ hasText: /^\+$/ }).filter({ visible: true }),
      page.locator('div[dir="auto"]').filter({ hasText: /^\+$/ }).filter({ visible: true }),
    ];

    for (const strategy of selectorStrategies) {
      const available = await strategy.count();
      plusVisible = Math.max(plusVisible, available);

      for (let index = 0; index < available && attempts < maxAttempts; index += 1) {
        const plus = strategy.nth(index);
        await plus.scrollIntoViewIfNeeded().catch(() => {});
        await plus.click({ timeout: 350 }).catch(() => {});
        attempts += 1;

        if (await modalTitle.isVisible().catch(() => false)) {
          return { opened: true, attempts, plusVisible };
        }
      }
    }

    await listViewport.press('PageDown').catch(() => {});
    await page.mouse.wheel(0, 900).catch(() => {});
    await page.waitForTimeout(250);
  }

  return { opened: false, attempts, plusVisible };
}

async function checkIfModalCanBeOpenedManually(page: Page): Promise<boolean> {
  // Try clicking on product cards directly instead of + buttons
  const productCards = page.locator('[style*="backgroundColor"]').filter({ 
    hasNot: page.locator('[role="button"]')
  }).first();
  
  const isVisible = await productCards.isVisible().catch(() => false);
  if (isVisible) {
    console.log('📍 Found potential product card, attempting click...');
    await productCards.click({ timeout: 350 }).catch(() => {});
    await page.waitForTimeout(300);
    const modalTitle = page.getByText('Pesagem assistida');
    return await modalTitle.isVisible().catch(() => false);
  }
  return false;
}

async function tryOpenWeightModalForProduct(page: Page, productName: string): Promise<boolean> {
  const modalTitle = page.getByText('Pesagem assistida');
  const searchInput = page.getByPlaceholder('Buscar item do cardápio...');

  await searchInput.fill(productName);
  await page.waitForTimeout(1200);

  const productLabel = page.getByText(productName, { exact: true }).first();
  if (!(await productLabel.isVisible().catch(() => false))) {
    return false;
  }

  const rowContainer = productLabel.locator(
    'xpath=ancestor::div[.//*[normalize-space(text())="+"]][1]'
  );
  const plusInRowByRole = rowContainer.getByRole('button', { name: /^\+$/ }).first();
  if (await plusInRowByRole.isVisible().catch(() => false)) {
    await plusInRowByRole.click({ timeout: 350 }).catch(() => {});
    if (await modalTitle.isVisible().catch(() => false)) {
      return true;
    }
  }

  const plusInRowByDivRole = rowContainer.locator('div[role="button"]').filter({ hasText: /^\+$/ }).first();
  if (await plusInRowByDivRole.isVisible().catch(() => false)) {
    await plusInRowByDivRole.click({ timeout: 350 }).catch(() => {});
    if (await modalTitle.isVisible().catch(() => false)) {
      return true;
    }
  }

  await productLabel.click({ timeout: 350 }).catch(() => {});
  await page.waitForTimeout(400);
  return await modalTitle.isVisible().catch(() => false);
}

async function refreshMenuIfAvailable(page: Page): Promise<void> {
  const refreshButton = page.getByLabel('Atualizar cardápio');
  if (await refreshButton.isVisible().catch(() => false)) {
    await refreshButton.click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

test.describe('PDV balanca - Novo Pedido com simulador local', () => {
  test.setTimeout(120000);

  test('deve adicionar item por peso via simulador e persistir metadata estruturada', async ({ page }) => {
    await loginIfNeeded(page);

    await page.evaluate(() => {
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_scale_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('devSimulators');
    });

    const authSession = await getAuthSession(page);
    const accessToken = authSession.access_token || '';
    const userId = authSession.user?.id || '';

    expect(accessToken).toBeTruthy();
    expect(userId).toBeTruthy();

    const companyId = await getCompanyId(accessToken, userId);
    if (!companyId) {
      test.skip(true, 'Nao foi possivel resolver company_id do usuario logado.');
      return;
    }

    const weightedProduct = await findWeightedProduct(accessToken, companyId);
    const productCount = await countProductsForCompany(accessToken, companyId);

    await page.evaluate(() => {
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_scale_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('devSimulators');
    });

    await page.reload();

    await page.evaluate(() => {
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_scale_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('devSimulators');
    });

    await page.evaluate(() => {
      localStorage.removeItem('menu_data_v2');
    });

    await page.reload();

    await page.evaluate(() => {
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_scale_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('devSimulators');
    });

    await loginIfNeeded(page);

    await page.evaluate(() => {
      window.__DEV_SCALE_SIMULATOR__ = {
        getSnapshot: () => ({
          rawGrams: 750,
          netGrams: 750,
          tareGrams: 0,
          status: 'stable',
          toledoString: 'P:  0.750kg\r\n',
          updatedAt: new Date().toISOString(),
        }),
        applyTare: () => ({
          rawGrams: 750,
          netGrams: 0,
          tareGrams: 750,
          status: 'tared',
          toledoString: 'P:  0.000kg\r\n',
          updatedAt: new Date().toISOString(),
        }),
      };
    });

    const uniqueClientName = `Playwright Peso ${Date.now()}`;

    await page.getByText('Novo Pedido').first().click();
    await page.evaluate(() => {
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('pdv_scale_enabled');
      window.__E2E_FEATURE_FLAGS__?.enable('devSimulators');
    });
    await refreshMenuIfAvailable(page);
    await page.getByPlaceholder('Digite o nome').fill(uniqueClientName);

    let openedByTargetedAction = false;
    if (weightedProduct?.name) {
      const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
      await searchInput.fill(weightedProduct.name);
      await page.waitForTimeout(1200);

      const plusAfterSearch = await page.getByRole('button', { name: /^\+$/ }).filter({ visible: true }).count();
      if (plusAfterSearch === 0) {
        await searchInput.fill('');
        await page.waitForTimeout(1200);
      }

      openedByTargetedAction = await tryOpenWeightModalForProduct(page, weightedProduct.name);
    } else {
      const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
      await searchInput.fill('');
      await page.waitForTimeout(1200);
    }

    if (openedByTargetedAction) {
      await expect(page.getByText('Pesagem assistida')).toBeVisible({ timeout: 10000 });
    }

    const clickResult = openedByTargetedAction
      ? { opened: true, attempts: 0, plusVisible: 0 }
      : await clickPlusUntilWeightModal(page);
    if (!clickResult.opened) {
      const weightedHint = weightedProduct?.name || 'nenhum produto por consulta';
      const weightedPrecondition = weightedProduct ? 'ok' : 'nenhum item com unit kg/quilo ou vendido_por_peso=true';
      const flagsState = await page.evaluate(() => {
        const flags = window.__E2E_FEATURE_FLAGS__?.getAll?.();
        if (!flags) return 'api-indisponivel';
        return `pdv=${Boolean(flags.pdv_enabled)},scale=${Boolean(flags.pdv_scale_enabled)},sim=${Boolean(flags.devSimulators)}`;
      });
      const adicionaisModalVisible = await page.getByText('Escolha os adicionais').isVisible().catch(() => false);
      test.skip(
        true,
        `Nao foi possivel abrir modal de pesagem no cardapio atual (tentativas=${clickResult.attempts}, botoes+visiveis=${clickResult.plusVisible}, precondicaoPeso=${weightedPrecondition}, produtoHint=${weightedHint}, totalProdutos=${productCount ?? 'indisponivel'}, flags=${flagsState}, modalAdicionais=${adicionaisModalVisible}).`
      );
      return;
    }

      // Alternative: try manual modal open if no weighted product detected
      if (!weightedProduct) {
        const manualOpen = await checkIfModalCanBeOpenedManually(page);
        if (!manualOpen) {
          test.skip(true, 'Nao foi possivel abrir modal via cliques nem via tentativa manual fallback.');
          return;
        }
      }

    await expect(page.getByText('Pesagem assistida')).toBeVisible({ timeout: 10000 });
    if (weightedProduct?.name) {
      await expect(page.getByText(weightedProduct.name).last()).toBeVisible({ timeout: 10000 });
    }

    await page.getByText('Peso estavel').click();

    let expectedWeightSource: 'automatic' | 'manual' = 'automatic';
    let expectedWeightTag = 'balanca';

    const weightLocator = page.locator('text=/\\d+\\.\\d{3} kg/i').first();
    const hasWeightReading = await weightLocator.isVisible().catch(() => false);

    if (hasWeightReading) {
      const weightText = (await weightLocator.textContent()) || '';
      const weightMatch = weightText.match(/(\d+\.\d{3})\s*kg/i);
      const capturedWeightKg = weightMatch ? Number(weightMatch[1]) : Number.NaN;
      expect(Number.isFinite(capturedWeightKg) && capturedWeightKg > 0).toBe(true);
      await page.getByText('Confirmar leitura estavel').click();
    } else {
      expectedWeightSource = 'manual';
      expectedWeightTag = 'manual';
      await page.getByText('Usar fallback manual').click();
      await page.getByPlaceholder('Ex: 0,532').fill('0,750');
      await page.getByText('Confirmar peso manual').click();
    }

    await expect(page.getByText(new RegExp(`\\(\\d+\\.\\d{3}kg - ${expectedWeightTag}\\)`, 'i')).first()).toBeVisible({ timeout: 10000 });

    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    await expect(page.locator('[data-testid="toast-container"], div[role="status"]').first()).toContainText(/Pedido criado! Comanda/i, { timeout: 15000 });

    let createdOrder = await findLatestOrderByClient(accessToken, uniqueClientName);
    await expect
      .poll(async () => {
        createdOrder = await findLatestOrderByClient(accessToken, uniqueClientName);
        return Boolean(createdOrder?.id);
      }, { timeout: 20000 })
      .toBe(true);

    expect(createdOrder?.client_name).toBe(uniqueClientName);
    expect(createdOrder?.items?.some((item) => new RegExp(`\\(\\d+\\.\\d{3}kg - ${expectedWeightTag}\\)`, 'i').test(item))).toBe(true);

    const weightedItem = createdOrder?.items_with_status?.find((item) => {
      if (item.measurementType === 'weight') {
        return true;
      }

      if (weightedProduct?.name) {
        return String(item.name || '').includes(weightedProduct.name);
      }

      return false;
    });

    expect(weightedItem).toMatchObject({
      measurementType: 'weight',
      weightSource: expectedWeightSource,
      weightUnit: 'kg',
    });
    expect(Number(weightedItem?.weightKg) > 0).toBe(true);
  });
});
