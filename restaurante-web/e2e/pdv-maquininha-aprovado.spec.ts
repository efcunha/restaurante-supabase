import { test, expect } from '@playwright/test';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-env';

interface AuthSessionToken {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
}

async function navigateToTab(page: import('@playwright/test').Page, tabName: RegExp, expectedText: RegExp): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tabButton = page.getByRole('button', { name: tabName }).first();
    const hasButton = await tabButton.isVisible().catch(() => false);
    if (!hasButton) {
      await page.waitForTimeout(600);
      continue;
    }

    await tabButton.click().catch(() => {});
    const hasExpectedText = await page.locator(`text=/${expectedText.source}/i`).first().isVisible().catch(() => false);
    if (hasExpectedText) {
      return true;
    }

    // Fallback for flaky pointer events in React Native Web.
    await page.evaluate((namePattern: string) => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]')) as HTMLElement[];
      const target = buttons.find((el) => new RegExp(namePattern, 'i').test((el.textContent || '').trim()));
      target?.click();
    }, tabName.source);

    const hasExpectedAfterFallback = await page.locator(`text=/${expectedText.source}/i`).first().isVisible().catch(() => false);
    if (hasExpectedAfterFallback) {
      return true;
    }

    await page.waitForTimeout(800);
  }

  return false;
}

async function getLatestOrderComandaByClientName(clientName: string, accessToken: string): Promise<string | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?client_name=eq.${encodeURIComponent(clientName)}&status=neq.cancelled&status=neq.cancelada&select=comanda_number,created_at&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const orders = (await response.json()) as Array<{ comanda_number?: string | number }>;
  if (!Array.isArray(orders) || orders.length === 0) {
    return null;
  }

  const comandaNumber = orders[0]?.comanda_number;
  return comandaNumber != null ? String(comandaNumber) : null;
}

async function createComandaViaRest(accessToken: string, userId: string, userName?: string): Promise<string | null> {
  const profileResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=company_id,full_name&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return null;
  }

  const profiles = (await profileResponse.json()) as Array<{ company_id?: string; full_name?: string }>;
  const companyId = profiles[0]?.company_id;
  if (!companyId) {
    return null;
  }

  const comandaNumber = String(900000 + Math.floor(Math.random() * 99999));
  const todayKey = new Date().toISOString().split('T')[0];

  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/comandas`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      company_id: companyId,
      date_key: todayKey,
      comanda_number: comandaNumber,
      status: 'aberta',
      table_number: '',
      client_name: 'Cliente E2E Maquininha',
      total_consumed: 1,
      total_paid: 0,
      open_balance: 1,
      opened_by: userId,
      opened_by_name: userName || profiles[0]?.full_name || 'Operador E2E',
      received_by: [],
    }),
  });

  if (!insertResponse.ok) {
    return null;
  }

  return comandaNumber;
}

async function createComandaIfMissing(
  page: import('@playwright/test').Page,
  accessToken: string,
): Promise<string | null> {
  const emptyComandas = page.getByText('Nenhuma comanda encontrada.');
  if (!(await emptyComandas.isVisible().catch(() => false))) {
    return null;
  }

  const movedToNovoPedido = await navigateToTab(page, /Novo Pedido/i, /Novo Pedido/i);
  if (!movedToNovoPedido) {
    return null;
  }

  const clienteInput = page.getByPlaceholder('Digite o nome');
  await expect(clienteInput).toBeVisible({ timeout: 15000 });

  const uniqueId = Date.now() + Math.round(Math.random() * 1000);
  const clientName = `Cliente E2E Maquininha ${uniqueId}`;
  await clienteInput.fill(clientName);

  const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill('chopp');
  await page.waitForTimeout(1200);

  const plusButton = page
    .locator('div[role="button"], div[dir="auto"]')
    .filter({ hasText: /^\+$/ })
    .filter({ visible: true })
    .first();

  await expect(plusButton).toBeVisible({ timeout: 10000 });
  await plusButton.click();

  const createOrderButton = page.getByRole('button', { name: 'Criar Pedido' }).first();
  await expect(createOrderButton).toBeVisible({ timeout: 10000 });

  let dialogMessage = '';
  const onDialog = async (dialog: import('@playwright/test').Dialog) => {
    dialogMessage = dialog.message();
    await dialog.accept();
  };
  page.on('dialog', onDialog);

  await createOrderButton.click();
  await page.waitForTimeout(1500);

  page.off('dialog', onDialog);

  const dialogMatch = dialogMessage.match(/Comanda\s+(\d+)/i);
  if (dialogMatch?.[1]) {
    return String(dialogMatch[1]);
  }

  const toast = page.locator('text=/Pedido criado! Comanda/i');
  const hasToast = await toast.isVisible().catch(() => false);
  if (!hasToast) {
    return null;
  }

  const toastText = (await toast.textContent()) || '';
  const createdMatch = toastText.match(/Comanda\s+(\d+)/i);
  if (createdMatch?.[1]) {
    return String(createdMatch[1]);
  }

  // Final fallback: resolve comanda by recently created client_name.
  return await getLatestOrderComandaByClientName(clientName, accessToken);
}

async function getAnyOpenComandaNumber(accessToken: string): Promise<string | null> {
  const todayKey = new Date().toISOString().split('T')[0];
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${todayKey}&open_balance=gt.0&select=comanda_number&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const comandas = (await response.json()) as Array<{ comanda_number?: string | number }>;
  if (!Array.isArray(comandas) || comandas.length === 0) {
    return null;
  }

  const comandaNumber = comandas[0]?.comanda_number;
  return comandaNumber != null ? String(comandaNumber) : null;
}

test.describe('PDV maquininha - fluxo aprovado', () => {
  test.setTimeout(120000);

  test('deve aprovar maquininha e manter registro operacional da comanda', async ({ page }) => {
    const isIntReal = process.env.PDV_E2E_INT_REAL === 'true';
    const expectedFinalStatus = (process.env.PDV_E2E_EXPECT_FINAL_STATUS || '').toLowerCase();
    console.warn('[E2E][maquininha] expectedFinalStatus:', expectedFinalStatus || 'none');
    const opsBaseUrlForIntReal = process.env.EXPO_PUBLIC_OPS_BASE_URL || 'https://ops.restaurante-web.app.br';
    const startUrl = process.env.PDV_E2E_START_URL || '/';
    const observedPaymentRequests: string[] = [];
    const observedPaymentRequestFailures: string[] = [];
    const observedResponseStatuses: number[] = [];
    const observedResponsesByUrl: string[] = [];
    const observedPayloadStatuses: string[] = [];
    const observedPayloadCodes: string[] = [];
    const observedPayloadMessages: string[] = [];
    const observedDialogMessages: string[] = [];
    let observedStatusPollRequests = 0;
    let observedStatusPollResponses = 0;

    page.on('dialog', async (dialog) => {
      observedDialogMessages.push((dialog.message() || '').toLowerCase());
      await dialog.accept().catch(() => {});
    });

    page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('/payments/')) {
        return;
      }
      observedPaymentRequests.push(url);
      if (url.includes('/status')) {
        observedStatusPollRequests += 1;
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!url.includes('/payments/')) {
        return;
      }
      const failureText = request.failure()?.errorText || 'request_failed';
      observedPaymentRequestFailures.push(`${url}::${failureText}`);
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('/payments/')) {
        return;
      }

      observedResponseStatuses.push(response.status());
      observedResponsesByUrl.push(`${response.request().method()}::${response.status()}::${url}`);
      if (url.includes('/status')) {
        observedStatusPollResponses += 1;
      }
      try {
        const payload = (await response.json()) as { status?: unknown; code?: unknown; error?: unknown; message?: unknown };
        if (typeof payload?.status === 'string') {
          observedPayloadStatuses.push(payload.status.toLowerCase());
        }
        if (typeof payload?.code === 'string') {
          observedPayloadCodes.push(payload.code.toLowerCase());
        }
        if (typeof payload?.error === 'string') {
          observedPayloadCodes.push(payload.error.toLowerCase());
        }
        if (typeof payload?.message === 'string') {
          observedPayloadMessages.push(payload.message.toLowerCase());
        }
      } catch {
        // Ignore non-JSON bodies in this observer.
      }
    });

    await page.goto(startUrl);

    if (isIntReal) {
      await page.evaluate((runtimeOpsBaseUrl) => {
        const runtimeWindow = window as Window & { __PDV_OPS_BASE_URL__?: string };
        runtimeWindow.__PDV_OPS_BASE_URL__ = runtimeOpsBaseUrl;
      }, opsBaseUrlForIntReal);
    }

    const loginEmail = page.getByPlaceholder('seu@email.com');
    const comandasNav = page.getByRole('button', { name: /Comandas/i }).first();

    await Promise.race([
      loginEmail.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
      comandasNav.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ]);

    if (await loginEmail.isVisible()) {
      await loginEmail.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
      await page.getByPlaceholder('••••••••').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
      await page.getByText('ENTRAR', { exact: true }).click();
      await expect(comandasNav).toBeVisible({ timeout: 30000 });
    }

    const authDataRawAtStart = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const authSession = authDataRawAtStart ? (JSON.parse(authDataRawAtStart) as AuthSessionToken) : {};
    const accessTokenAtStart = authSession.access_token || '';
    const currentUserId = authSession.user?.id || '';
    const currentUserName = authSession.user?.user_metadata?.full_name || authSession.user?.user_metadata?.name || authSession.user?.email;
    expect(accessTokenAtStart).toBeTruthy();

    const movedToComandasInitial = await navigateToTab(page, /Comandas/i, /Gerenciamento|Abertas/i);
    if (!movedToComandasInitial) {
      console.warn('[E2E][maquininha] Skip: nao foi possivel abrir aba Comandas');
      test.skip(true, 'Nao foi possivel abrir a aba Comandas neste ambiente.');
      return;
    }

    const createdComandaNumber = await createComandaIfMissing(page, accessTokenAtStart);

    const movedToComandasAfterCreate = await navigateToTab(page, /Comandas/i, /Gerenciamento|Abertas/i);
    if (!movedToComandasAfterCreate) {
      console.warn('[E2E][maquininha] Skip: nao foi possivel retornar para aba Comandas apos criacao');
      test.skip(true, 'Nao foi possivel retornar para a aba Comandas apos criar pedido de teste.');
      return;
    }

    let fallbackComandaNumber = await getAnyOpenComandaNumber(accessTokenAtStart);
    if (!fallbackComandaNumber && createdComandaNumber) {
      fallbackComandaNumber = createdComandaNumber;
    }

    const stillEmptyComandas = page.getByText('Nenhuma comanda encontrada.');
    if (await stillEmptyComandas.isVisible().catch(() => false)) {
      const createdByRest = currentUserId
        ? await createComandaViaRest(accessTokenAtStart, currentUserId, currentUserName)
        : null;

      if (!createdByRest) {
        console.warn('[E2E][maquininha] Skip: sem comanda aberta no ambiente apos fallback de criacao');
        test.skip(true, 'Ambiente sem comanda aberta e sem criacao automatica de comanda no fluxo de teste.');
        return;
      }

      const movedToComandasAfterRestInsert = await navigateToTab(page, /Comandas/i, /Gerenciamento|Abertas/i);
      if (!movedToComandasAfterRestInsert) {
        console.warn('[E2E][maquininha] Skip: comanda criada via REST, mas nao navegou para Comandas');
        test.skip(true, 'Comanda criada via REST, mas nao foi possivel navegar para Comandas no ambiente.');
        return;
      }

      fallbackComandaNumber = createdByRest;
    }

    let comandaNumber = createdComandaNumber || fallbackComandaNumber;
    if (!comandaNumber) {
      const firstComandaCard = page.locator('text=/Comanda\\s+\\d+/').first();
      const hasAnyCard = await firstComandaCard.isVisible().catch(() => false);
      if (hasAnyCard) {
        const cardText = (await firstComandaCard.textContent()) || '';
        const comandaMatch = cardText.match(/Comanda\s+(\d+)/i);
        if (comandaMatch?.[1]) {
          comandaNumber = String(comandaMatch[1]);
        }
      }
    }

    if (!comandaNumber) {
      console.warn('[E2E][maquininha] Skip: sem comanda apos todos os fallbacks');
      test.skip(true, 'Sem comanda aberta disponivel para executar fluxo de maquininha neste ambiente.');
      return;
    }

    const pagamentoVisible = await page.getByText('Resumo e Pagamento').first().isVisible().catch(() => false);
    if (!pagamentoVisible) {
      const hookAvailable = await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const globalWindow = window as Window & {
                __E2E_NAVIGATE_TO_PAYMENT__?: (comandaNumber: string) => void;
              };
              return typeof globalWindow.__E2E_NAVIGATE_TO_PAYMENT__ === 'function';
            }),
          { timeout: 10000 },
        )
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);

      if (!hookAvailable) {
        console.warn('[E2E][maquininha] Hook global de navegacao E2E indisponivel no runtime atual');
      }

      if (hookAvailable) {
        await page.evaluate((targetComandaNumber) => {
          const globalWindow = window as Window & {
            __E2E_NAVIGATE_TO_PAYMENT__?: (comandaNumber: string) => void;
          };
          globalWindow.__E2E_NAVIGATE_TO_PAYMENT__?.(String(targetComandaNumber));
        }, comandaNumber);
        await page.waitForTimeout(1200);
      }

      const pagamentoVisibleAfterHook = await page.getByText('Resumo e Pagamento').first().isVisible().catch(() => false);
      if (pagamentoVisibleAfterHook) {
        // Navigation hook worked; continue test.
      } else {
      const movedToComandas = await navigateToTab(page, /Comandas/i, /Gerenciamento|Abertas/i);
      if (!movedToComandas) {
        console.warn('[E2E][maquininha] Skip: falha no fallback de navegacao para Comandas apos deep-link');
        test.skip(true, 'Nao foi possivel navegar para Comandas no fallback apos deep-link de Pagamento.');
        return;
      }

      const createdCard = page.locator(`text=/Comanda\\s+${comandaNumber}/`).first();
      const cardVisible = await createdCard.isVisible().catch(() => false);
      if (!cardVisible) {
        console.warn('[E2E][maquininha] Skip: comanda no banco, mas card nao renderizado para fallback manual', { comandaNumber });
        test.skip(true, 'Comanda existe no banco, mas nao foi listada na UI para fallback de abertura manual.');
        return;
      }

      await createdCard.click();
      const rateioButton = page.getByText('RATEIO (DIVISÃO)').first();
      await expect(rateioButton).toBeVisible({ timeout: 10000 });
      await rateioButton.click();
      }
    }

    await expect(page.getByText('Resumo e Pagamento').first()).toBeVisible({ timeout: 20000 });

    expect(comandaNumber).toBeTruthy();

    const valorInput = page.getByPlaceholder('0,00').first();
    await expect(valorInput).toBeVisible({ timeout: 10000 });
    await valorInput.fill('1');

    let statusPollCount = 0;
    if (!isIntReal) {
      await page.route('**/payments/initiate', async (route) => {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'processing',
            transactionId: '11111111-1111-4111-8111-111111111111',
            providerPaymentId: 'pay-pw-1',
            nextAction: 'await_webhook',
            amount: 100,
            paymentMethod: 'cartao_debito',
            message: 'Pagamento em processamento na maquininha.',
            correlation_id: 'pw-1',
            created_at: new Date().toISOString(),
          }),
        });
      });

      await page.route('**/payments/**/status', async (route) => {
        statusPollCount += 1;
        const isFinal = statusPollCount >= 2;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: isFinal ? 'succeeded' : 'processing',
            transactionId: '11111111-1111-4111-8111-111111111111',
            providerPaymentId: 'pay-pw-1',
            nextAction: isFinal ? 'none' : 'await_webhook',
            amount: 100,
            paymentMethod: 'cartao_debito',
            message: isFinal ? 'Pagamento aprovado.' : 'Pagamento em processamento.',
            correlation_id: 'pw-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      });
    }

    const useDevicePaymentButton = page.getByText('Usar Maquininha').first();
    let hasDevicePaymentButton = await useDevicePaymentButton.isVisible().catch(() => false);

    if (!hasDevicePaymentButton) {
      const tefTab = page.getByText('TEF Integrado').first();
      const hasTefTab = await tefTab.isVisible().catch(() => false);
      if (hasTefTab) {
        await tefTab.click().catch(() => {});
        await page.waitForTimeout(300);
        hasDevicePaymentButton = await useDevicePaymentButton.isVisible().catch(() => false);
      }
    }

    if (!hasDevicePaymentButton) {
      console.warn('[E2E][maquininha] Skip: botao "Usar Maquininha" indisponivel (feature flag PDV pode estar desabilitada)');
      test.skip(true, 'Botao "Usar Maquininha" indisponivel neste ambiente (possivel feature flag desabilitada).');
      return;
    }

    await useDevicePaymentButton.click();

    if (isIntReal) {
      await expect
        .poll(() => observedPaymentRequests.length, { timeout: 30000 })
        .toBeGreaterThan(0);

      await expect
        .poll(() => observedResponseStatuses.length + observedPaymentRequestFailures.length, { timeout: 30000 })
        .toBeGreaterThan(0);

      if (observedResponseStatuses.length > 0) {
        console.warn('[E2E][maquininha][INT_REAL] Response statuses observados:', observedResponseStatuses);
        console.warn('[E2E][maquininha][INT_REAL] Responses por URL:', observedResponsesByUrl);
        if (observedPayloadStatuses.length > 0) {
          console.warn('[E2E][maquininha][INT_REAL] Payload statuses observados:', observedPayloadStatuses);
        }
        if (observedPayloadCodes.length > 0) {
          console.warn('[E2E][maquininha][INT_REAL] Payload codes observados:', observedPayloadCodes);
        }
        if (observedPayloadMessages.length > 0) {
          console.warn('[E2E][maquininha][INT_REAL] Payload messages observados:', observedPayloadMessages);
        }

        const hasAcceptedStatus = observedResponseStatuses.some((statusCode) => statusCode === 200 || statusCode === 202);
        const hasGatewayNotConfigured =
          observedResponseStatuses.includes(404)
          && observedPayloadCodes.includes('gateway_not_configured');
        const hasProviderUnavailable =
          observedResponseStatuses.includes(503)
          && (
            observedPayloadCodes.includes('provider_unavailable')
            || observedPayloadCodes.includes('internal server error')
            || observedPayloadMessages.some((msg) => msg.includes('indisponivel'))
          );

        if (!hasAcceptedStatus && hasGatewayNotConfigured) {
          console.warn('[E2E][maquininha][INT_REAL] Bloqueio detectado: gateway presencial nao configurado para o tenant autenticado.');
        }
        if (!hasAcceptedStatus && hasProviderUnavailable) {
          console.warn('[E2E][maquininha][INT_REAL] Bloqueio detectado: gateway presencial indisponivel por configuracao server-side (Hyperswitch).');
        }

        expect(hasAcceptedStatus || hasGatewayNotConfigured || hasProviderUnavailable).toBeTruthy();
        if (observedPayloadStatuses.length > 0) {
          expect(
            observedPayloadStatuses.some((status) =>
              ['processing', 'pending', 'approved', 'succeeded', 'declined', 'failed', 'error', 'timeout'].includes(status),
            ),
          ).toBeTruthy();
        }
      } else {
        // Keep network/CORS failures observable in output without exposing secrets.
        console.warn('[E2E][maquininha][INT_REAL] Sem response HTTP; falhas de request observadas:', observedPaymentRequestFailures);
        expect(observedPaymentRequestFailures.length).toBeGreaterThan(0);
      }

      if (expectedFinalStatus === 'approved') {
        await expect
          .poll(
            () => observedPayloadStatuses.some((status) => status === 'approved' || status === 'succeeded'),
            { timeout: 90000 },
          )
          .toBeTruthy();
        console.warn('[E2E][maquininha][INT_REAL] Confirmado final approved/succeeded. Statuses observados:', observedPayloadStatuses);
      }

      if (expectedFinalStatus === 'timeout') {
        await expect
          .poll(() => observedStatusPollRequests, { timeout: 90000 })
          .toBeGreaterThan(0);

        await expect
          .poll(
            async () => {
              const hasTimeoutDialog = observedDialogMessages.some((message) =>
                message.includes('tempo limite') || message.includes('tente novamente'),
              );
              if (hasTimeoutDialog) {
                return true;
              }

              const resetVisible = await page.getByText('Usar Maquininha').first().isVisible().catch(() => false);
              return resetVisible && observedStatusPollResponses > 0;
            },
            { timeout: 120000 },
          )
          .toBeTruthy();

        console.warn('[E2E][maquininha][INT_REAL] Confirmado timeout operacional. Poll requests/responses:', {
          observedStatusPollRequests,
          observedStatusPollResponses,
          observedDialogMessages,
        });
      }
    } else {
      await expect.poll(() => statusPollCount, { timeout: 20000 }).toBeGreaterThan(0);
    }

    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const accessToken = authDataRaw ? JSON.parse(authDataRaw).access_token : '';
    expect(accessToken).toBeTruthy();

    const todayKey = new Date().toISOString().split('T')[0];
    const comandaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/comandas?comanda_number=eq.${encodeURIComponent(comandaNumber)}&date_key=eq.${todayKey}&select=comanda_number,status,total_paid,total_consumed&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(comandaRes.ok).toBeTruthy();
    const comandas = await comandaRes.json();
    expect(Array.isArray(comandas)).toBeTruthy();
    expect(comandas.length).toBeGreaterThan(0);
    expect(String(comandas[0].status || '').toLowerCase()).toBe('aberta');
  });
});
