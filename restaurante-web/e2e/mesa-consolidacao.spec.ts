import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';
const TODAY_KEY = new Date().toISOString().slice(0, 10);

async function getAccessToken(page: any): Promise<string> {
  const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
  return authDataRaw ? JSON.parse(authDataRaw).access_token : '';
}

async function listOpenComandasByMesa(mesa: string, accessToken: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${TODAY_KEY}&or=(table_number.eq.${mesa},mesa.eq.${mesa})&select=id,comanda_number,table_number,mesa,date_key`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Falha ao listar comandas abertas da mesa ${mesa}: ${res.status}`);
  }

  return await res.json();
}

async function waitForOpenComandaByMesa(mesa: string, accessToken: string, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = await listOpenComandasByMesa(mesa, accessToken);
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  return [];
}

async function cancelOpenComandasByMesa(mesa: string, accessToken: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${TODAY_KEY}&or=(table_number.eq.${mesa},mesa.eq.${mesa})`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'cancelada',
      canceled_at: new Date().toISOString(),
      motivo_cancelamento: 'cleanup-mesa-consolidacao-e2e',
    }),
  });
}

async function cancelActiveOrdersByMesa(mesa: string, accessToken: string) {
  const listRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesa}&date_key=eq.${TODAY_KEY}&select=id,status,date_key`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listRes.ok) {
    return;
  }

  const orders = await listRes.json();
  const activeOrders = (orders || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o.status || '').toLowerCase()));
  if (activeOrders.length === 0) {
    return;
  }

  const idFilter = activeOrders.map((o: any) => `id.eq.${o.id}`).join(',');

  await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(${idFilter})`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'cancelled',
      comanda_status: 'cancelada',
      updated_at: new Date().toISOString(),
    }),
  });
}

async function createSimpleMesaOrder(page: any, mesa: string, clientName: string): Promise<string> {
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
  await page.waitForTimeout(1200);

  const plusBtn = page
    .locator('div[role="button"], div[dir="auto"]')
    .filter({ hasText: '+' })
    .filter({ visible: true })
    .first();

  if (await plusBtn.count() > 0) {
    await plusBtn.click();
  } else {
    const fallbackCard = page.locator('div[dir="auto"]').filter({ hasText: /chopp/i }).first();
    await fallbackCard.click();
  }

  const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();

  const toastLocator = page.locator('[data-testid="toast-container"], div[role="status"]').first();
  let toastText = '';
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    toastText = (await toastLocator.textContent().catch(() => ''))?.trim() || '';

    if (/Pedido criado!/i.test(toastText)) {
      break;
    }

    if (/Mesa.*já foi ocupada/i.test(toastText)) {
      throw new Error(`Mesa ${mesa} já estava ocupada durante criação de pedido`);
    }

    await page.waitForTimeout(200);
  }

  expect(toastText).toMatch(/Pedido criado!/i);

  const comandaMatch = toastText.match(/Comanda\s+(\d+)/i);
  const comandaNumber = comandaMatch?.[1];
  expect(comandaNumber).toBeTruthy();

  return String(comandaNumber);
}

test.describe('Consolidacao Mesa -> Comanda Canônica', () => {
  test.setTimeout(180000);

  test('Mesa 1 consolidada na Mesa 2 deve manter 1 comanda aberta operacional na mesa 2', async ({ page }) => {
    page.on('dialog', async d => {
      await d.accept();
    });

    await page.goto('/');

    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });
      await emailInput.fill('lu@m.com');
      await page.locator('input[placeholder="••••••••"]').fill('mudar123');
      await page.getByText('ENTRAR', { exact: true }).click();
      await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    } catch {
      // Session persisted.
    }

    const accessToken = await getAccessToken(page);
    expect(accessToken).toBeTruthy();

    // Cleanup for deterministic scenario.
    await cancelOpenComandasByMesa('1', accessToken);
    await cancelOpenComandasByMesa('2', accessToken);
    await cancelActiveOrdersByMesa('1', accessToken);
    await cancelActiveOrdersByMesa('2', accessToken);

    await createSimpleMesaOrder(page, '1', 'PW Consolidacao Origem');
    await createSimpleMesaOrder(page, '2', 'PW Consolidacao Destino');

    const initialOpenMesa1 = await waitForOpenComandaByMesa('1', accessToken);
    expect(Array.isArray(initialOpenMesa1)).toBeTruthy();
    expect(initialOpenMesa1.length).toBe(1);
    const sourceComanda = String(initialOpenMesa1[0].comanda_number);

    const initialOpenMesa2 = await waitForOpenComandaByMesa('2', accessToken);
    expect(Array.isArray(initialOpenMesa2)).toBeTruthy();
    const canonicalTargetComanda = initialOpenMesa2.length > 0
      ? String(initialOpenMesa2[0].comanda_number)
      : '';
    expect(canonicalTargetComanda).toBeTruthy();

    // Consolidate source orders into target canonical comanda via API, mirroring the service behavior.
    const sourceOrdersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?table_number=eq.1&comanda_number=eq.${sourceComanda}&date_key=eq.${TODAY_KEY}&select=id,status,date_key`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(sourceOrdersRes.ok).toBeTruthy();
    const sourceOrders = await sourceOrdersRes.json();
    const sourceActiveOrders = (sourceOrders || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o.status || '').toLowerCase()));
    expect(sourceActiveOrders.length).toBeGreaterThan(0);

    const sourceOrderIdsFilter = sourceActiveOrders.map((o: any) => `id.eq.${o.id}`).join(',');
    const moveRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(${sourceOrderIdsFilter})`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_number: 2,
        comanda_number: Number(canonicalTargetComanda),
        updated_at: new Date().toISOString(),
      }),
    });

    expect(moveRes.ok).toBeTruthy();

    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const authData = authDataRaw ? JSON.parse(authDataRaw) : null;
    const userId = authData?.user?.id || null;

    const markMergedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/comandas?table_number=eq.1&comanda_number=eq.${sourceComanda}&status=eq.aberta&date_key=eq.${TODAY_KEY}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'merged',
          merged_into_comanda_number: Number(canonicalTargetComanda),
          merged_at: new Date().toISOString(),
          merged_by: userId,
          merge_reason: 'e2e-consolidacao-mesa',
        }),
      }
    );

    expect(markMergedRes.ok).toBeTruthy();

    await page.waitForTimeout(1200);

    const openMesa2 = await listOpenComandasByMesa('2', accessToken);
    expect(Array.isArray(openMesa2)).toBeTruthy();
    expect(openMesa2.length).toBe(1);

    const canonicalMesa2 = String(openMesa2[0].comanda_number);

    // Destination must keep exactly one canonical open comanda.
    expect(canonicalMesa2).toBeTruthy();

    // Source table should no longer have open comandas after consolidation.
    const openMesa1 = await listOpenComandasByMesa('1', accessToken);
    expect(openMesa1.length).toBe(0);

    // All active orders now in mesa 2 should point to the canonical comanda.
    const ordersMesa2Res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?table_number=eq.2&date_key=eq.${TODAY_KEY}&select=id,comanda_number,status,date_key`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(ordersMesa2Res.ok).toBeTruthy();
    const ordersMesa2 = await ordersMesa2Res.json();

    const activeMesa2Orders = (ordersMesa2 || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o.status || '').toLowerCase()));
    expect(activeMesa2Orders.length).toBeGreaterThan(0);

    const distinctComandas = [...new Set(activeMesa2Orders.map((o: any) => String(o.comanda_number)))];
    expect(distinctComandas.length).toBe(1);
    expect(distinctComandas[0]).toBe(canonicalMesa2);

    // Optional technical validation: source comanda was merged.
    const mergedLookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/comandas?comanda_number=eq.${sourceComanda}&select=status,merged_into_comanda_number,date_key&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(mergedLookupRes.ok).toBeTruthy();
    const mergedLookup = await mergedLookupRes.json();
    if (Array.isArray(mergedLookup) && mergedLookup.length > 0) {
      expect(String(mergedLookup[0].status)).toBe('merged');
      expect(String(mergedLookup[0].merged_into_comanda_number || '')).toMatch(/\d+/);
    }
  });
});
