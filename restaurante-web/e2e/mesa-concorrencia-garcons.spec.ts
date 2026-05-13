import { test, expect } from '@playwright/test';
import { SUPABASE_ANON_KEY, SUPABASE_URL, getRequiredEnv } from './supabase-env';

const TODAY_KEY = new Date().toISOString().slice(0, 10);
const MESA_TESTE = '10';

function buildHeaders(accessToken: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function getAccessToken(page: any): Promise<string> {
  const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
  return authDataRaw ? JSON.parse(authDataRaw).access_token : '';
}

async function login(page: any, email: string, password: string) {
  await page.goto('/');

  const loginEmail = page.getByPlaceholder('seu@email.com');
  const dashboard = page.getByText('Novo Pedido').first();

  await Promise.race([
    loginEmail.waitFor({ state: 'visible', timeout: 15000 }).catch(() => { }),
    dashboard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => { }),
  ]);

  if (await loginEmail.isVisible().catch(() => false)) {
    await loginEmail.fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByText('ENTRAR', { exact: true }).click();
  }

  await expect(dashboard).toBeVisible({ timeout: 30000 });
}

async function cancelOpenComandasByMesa(mesa: string, accessToken: string) {
  if (!SUPABASE_URL) {
    throw new Error('Variavel EXPO_PUBLIC_SUPABASE_URL ausente.');
  }

  await fetch(
    `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${TODAY_KEY}&or=(table_number.eq.${mesa},mesa.eq.${mesa})`,
    {
      method: 'PATCH',
      headers: buildHeaders(accessToken),
      body: JSON.stringify({
        status: 'cancelada',
        canceled_at: new Date().toISOString(),
        motivo_cancelamento: 'cleanup-mesa-concorrencia-e2e',
      }),
    },
  );
}

async function cancelActiveOrdersByMesa(mesa: string, accessToken: string) {
  if (!SUPABASE_URL) {
    throw new Error('Variavel EXPO_PUBLIC_SUPABASE_URL ausente.');
  }

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesa}&date_key=eq.${TODAY_KEY}&select=id,status,date_key`,
    { headers: buildHeaders(accessToken) },
  );

  if (!listRes.ok) return;

  const orders = await listRes.json();
  const activeOrders = (orders || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o?.status || '').toLowerCase()));
  if (activeOrders.length === 0) return;

  const idFilter = activeOrders.map((o: any) => `id.eq.${o.id}`).join(',');

  await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(${idFilter})`, {
    method: 'PATCH',
    headers: buildHeaders(accessToken),
    body: JSON.stringify({
      status: 'cancelled',
      comanda_status: 'cancelada',
      updated_at: new Date().toISOString(),
    }),
  });
}

async function createMesaOrder(page: any, mesa: string, clientName: string) {
  let dialogMessage = '';
  page.on('dialog', async (d: any) => {
    dialogMessage = d.message();
    await d.accept();
  });

  await page.getByText('Novo Pedido').first().click();

  const clienteInput = page.getByPlaceholder('Digite o nome');
  await clienteInput.waitFor({ state: 'visible', timeout: 15000 });
  await clienteInput.fill(clientName);

  const mesaInput = page.locator('input[placeholder="Nº"]');
  await mesaInput.waitFor({ state: 'visible', timeout: 10000 });
  await mesaInput.fill(mesa);

  const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('chopp');
  await page.waitForTimeout(900);

  try {
    const plusBtn = page
      .locator('div[role="button"], div[dir="auto"]')
      .filter({ hasText: '+' })
      .filter({ visible: true })
      .first();

    if (await plusBtn.count() > 0) {
      await plusBtn.click();
    } else {
      const itemCard = page.locator('div[dir="auto"]').filter({ hasText: /chopp/i }).first();
      await itemCard.click();
    }
  } catch {
    // O resultado final sera validado por toast/dialog e por estado no banco.
  }

  const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
  await expect(submitBtn).toBeVisible({ timeout: 15000 });
  await submitBtn.click();

  const toastLocator = page.locator('[data-testid="toast-container"], div[role="status"]').first();
  let toastText = '';
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    toastText = (await toastLocator.textContent().catch(() => ''))?.trim() || '';

    if (/Pedido criado!/i.test(toastText)) {
      break;
    }

    if (/Mesa.*(ocupada|já foi ocupada|já está ocupada)/i.test(toastText)) {
      break;
    }

    if (dialogMessage) {
      break;
    }

    await page.waitForTimeout(220);
  }

  const combined = `${toastText} ${dialogMessage}`.trim();

  return {
    success: /Pedido criado!/i.test(combined),
    occupied: /Mesa.*(ocupada|já foi ocupada|já está ocupada)/i.test(combined),
    rawMessage: combined || 'Sem mensagem detectada',
  };
}

async function listOpenComandasByMesa(mesa: string, accessToken: string) {
  if (!SUPABASE_URL) {
    throw new Error('Variavel EXPO_PUBLIC_SUPABASE_URL ausente.');
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${TODAY_KEY}&or=(table_number.eq.${mesa},mesa.eq.${mesa})&select=id,comanda_number,table_number,date_key`,
    { headers: buildHeaders(accessToken) },
  );

  if (!res.ok) {
    throw new Error(`Falha ao listar comandas abertas: ${res.status}`);
  }

  return await res.json();
}

async function listActiveOrdersByMesa(mesa: string, accessToken: string) {
  if (!SUPABASE_URL) {
    throw new Error('Variavel EXPO_PUBLIC_SUPABASE_URL ausente.');
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesa}&date_key=eq.${TODAY_KEY}&select=id,comanda_number,status,date_key`,
    { headers: buildHeaders(accessToken) },
  );

  if (!res.ok) {
    throw new Error(`Falha ao listar pedidos: ${res.status}`);
  }

  const orders = await res.json();
  return (orders || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o?.status || '').toLowerCase()));
}

test.describe('Concorrencia de mesa entre garcons', () => {
  test.setTimeout(180000);

  test('Dois garcons simultaneos na mesma mesa nao devem criar duas comandas nem dois pedidos ativos', async ({ browser }) => {
    const email1 = getRequiredEnv('PLAYWRIGHT_TEST_EMAIL');
    const password1 = getRequiredEnv('PLAYWRIGHT_TEST_PASSWORD');
    const email2 = getRequiredEnv('PLAYWRIGHT_TEST_EMAIL_GARCOM02');
    const password2 = getRequiredEnv('PLAYWRIGHT_TEST_PASSWORD_GARCOM02');

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await login(page1, email1, password1);
      await login(page2, email2, password2);

      const accessToken = await getAccessToken(page1);
      expect(accessToken).toBeTruthy();

      await cancelOpenComandasByMesa(MESA_TESTE, accessToken);
      await cancelActiveOrdersByMesa(MESA_TESTE, accessToken);

      // Dispara dois fluxos praticamente simultaneos para reproduzir condicao de corrida.
      const [result1, result2] = await Promise.all([
        createMesaOrder(page1, MESA_TESTE, `PW Race G1 ${Date.now()}`),
        createMesaOrder(page2, MESA_TESTE, `PW Race G2 ${Date.now()}`),
      ]);

      const successCount = [result1, result2].filter(r => r.success).length;
      const occupiedCount = [result1, result2].filter(r => r.occupied).length;

      // Regra esperada: apenas um fluxo vence e o outro deve ser bloqueado por mesa ocupada.
      expect(successCount).toBe(1);
      expect(occupiedCount).toBeGreaterThanOrEqual(1);

      const openComandas = await listOpenComandasByMesa(MESA_TESTE, accessToken);
      expect(Array.isArray(openComandas)).toBeTruthy();
      expect(openComandas.length).toBe(1);

      const activeOrders = await listActiveOrdersByMesa(MESA_TESTE, accessToken);
      expect(activeOrders.length).toBe(1);

      const distinctOpenComandas = [...new Set(activeOrders.map((o: any) => String(o.comanda_number || '')))].filter(Boolean);
      expect(distinctOpenComandas.length).toBe(1);
      expect(String(openComandas[0].comanda_number)).toBe(distinctOpenComandas[0]);
    } finally {
      // Limpeza para manter repetibilidade do ambiente de testes.
      const cleanupToken = await getAccessToken(page1).catch(() => '');
      if (cleanupToken) {
        await cancelOpenComandasByMesa(MESA_TESTE, cleanupToken);
        await cancelActiveOrdersByMesa(MESA_TESTE, cleanupToken);
      }

      await page1.close();
      await page2.close();
      await ctx1.close();
      await ctx2.close();
    }
  });
});
