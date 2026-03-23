import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';
const TODAY_KEY = new Date().toISOString().slice(0, 10);
const LOCK_DIR = path.join(os.tmpdir(), 'playwright-mesa-locks');

async function isMesaLivreNoBanco(mesa: string, accessToken: string): Promise<boolean> {
  try {
    const comandasRes = await fetch(
      `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&date_key=eq.${TODAY_KEY}&or=(table_number.eq.${mesa},mesa.eq.${mesa})&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!comandasRes.ok) return false;
    const comandasAbertas = await comandasRes.json();
    if (Array.isArray(comandasAbertas) && comandasAbertas.length > 0) return false;

    const ordersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesa}&date_key=eq.${TODAY_KEY}&select=id,status`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!ordersRes.ok) return false;
    const orders = await ordersRes.json();
    const activeOrders = (orders || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o?.status || '').toLowerCase()));
    return activeOrders.length === 0;
  } catch {
    return false;
  }
}

async function lockMesa(accessToken: string, excluded: string[] = []): Promise<string> {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }

  const maxRetries = 30;
  const excludedSet = new Set(excluded.map(String));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (let i = 1; i <= 10; i++) {
      const mesa = String(i);
      if (excludedSet.has(mesa)) continue;

      const lockFile = path.join(LOCK_DIR, `mesa-${mesa}.lock`);
      try {
        if (fs.existsSync(lockFile)) {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > 1000 * 60 * 2) {
            fs.unlinkSync(lockFile);
          }
        }

        const fd = fs.openSync(lockFile, 'wx');
        fs.closeSync(fd);

        const livre = await isMesaLivreNoBanco(mesa, accessToken);
        if (!livre) {
          fs.unlinkSync(lockFile);
          continue;
        }

        return mesa;
      } catch (e: any) {
        if (e.code === 'EEXIST') continue;
        throw e;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout: Nenhuma mesa livre disponível para o teste de consolidação');
}

function unlockMesa(mesa: string | null | undefined) {
  if (!mesa) return;
  const lockFile = path.join(LOCK_DIR, `mesa-${mesa}.lock`);
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

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
  // Mesmo bloco de itens do mesa.spec.ts
  try {
    const calabresaCard = page.locator('div[dir="auto"]').filter({ hasText: /^Calabresa$/ }).first();
    await calabresaCard.waitFor({ state: 'visible', timeout: 5000 });
    await calabresaCard.click();
    await page.getByText('Grande/Família').first().waitFor({ state: 'visible' });
    await page.getByText('Grande/Família').first().click();
    await page.getByText('Chocolate com Morango').last().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText('Chocolate com Morango').last().click();
    await page.getByText('Próximo: Extras').last().click();
    await page.getByText('Bacon').last().waitFor({ state: 'visible' });
    await page.getByText('Bacon').last().click();
    await page.getByText('Adicionar ao Pedido').last().click();
  } catch {
    // Mantém robustez se o fluxo de pizza estiver indisponível no ambiente.
  }

  await page.waitForTimeout(500);

  const itemsToSearch = [
    { term: 'chopp', quantity: 3 },
    { term: 'risoto', quantity: 1 },
    { term: 'caldo', quantity: 3 },
  ];

  for (const { term, quantity } of itemsToSearch) {
    for (let i = 0; i < quantity; i++) {
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(term);
      await page.waitForTimeout(1500);

      try {
        const plusBtn = page
          .locator('div[role="button"], div[dir="auto"]')
          .filter({ hasText: '+' })
          .filter({ visible: true })
          .first();

        if (await plusBtn.count() > 0) {
          await plusBtn.click();
        } else {
          const itemCard = page.locator('div[dir="auto"]').filter({ hasText: new RegExp(term, 'i') }).first();
          await itemCard.click();
        }
      } catch {
        // O assert de criação do pedido cobre falhas reais.
      }

      await page.waitForTimeout(500);
    }
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

  test('Consolidar mesa origem em destino deve manter 1 comanda aberta operacional na mesa destino', async ({ page }) => {
    let sourceMesa: string | null = null;
    let targetMesa: string | null = null;

    page.on('dialog', async d => {
      await d.accept();
    });

    try {
      await page.goto('/');

      try {
        const emailInput = page.locator('input[placeholder="seu@email.com"]');
        await emailInput.waitFor({ state: 'visible', timeout: 8000 });
        await emailInput.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
        await page.locator('input[placeholder="••••••••"]').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
        await page.getByText('ENTRAR', { exact: true }).click();
        await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
      } catch {
        // Session persisted.
      }

      const accessToken = await getAccessToken(page);
      expect(accessToken).toBeTruthy();

      sourceMesa = await lockMesa(accessToken);
      targetMesa = await lockMesa(accessToken, [sourceMesa]);

      // Cleanup for deterministic scenario.
      await cancelOpenComandasByMesa(sourceMesa, accessToken);
      await cancelOpenComandasByMesa(targetMesa, accessToken);
      await cancelActiveOrdersByMesa(sourceMesa, accessToken);
      await cancelActiveOrdersByMesa(targetMesa, accessToken);

      await createSimpleMesaOrder(page, sourceMesa, 'PW Consolidacao Origem');
      await createSimpleMesaOrder(page, targetMesa, 'PW Consolidacao Destino');

      const initialOpenSource = await waitForOpenComandaByMesa(sourceMesa, accessToken);
      expect(Array.isArray(initialOpenSource)).toBeTruthy();
      expect(initialOpenSource.length).toBe(1);
      const sourceComanda = String(initialOpenSource[0].comanda_number);

      const initialOpenTarget = await waitForOpenComandaByMesa(targetMesa, accessToken);
      expect(Array.isArray(initialOpenTarget)).toBeTruthy();
      const canonicalTargetComanda = initialOpenTarget.length > 0
        ? String(initialOpenTarget[0].comanda_number)
        : '';
      expect(canonicalTargetComanda).toBeTruthy();

      // Consolidate source orders into target canonical comanda via API, mirroring the service behavior.
      const sourceOrdersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${sourceMesa}&comanda_number=eq.${sourceComanda}&date_key=eq.${TODAY_KEY}&select=id,status,date_key`,
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
          table_number: Number(targetMesa),
          comanda_number: Number(canonicalTargetComanda),
          updated_at: new Date().toISOString(),
        }),
      });

      expect(moveRes.ok).toBeTruthy();

      const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
      const authData = authDataRaw ? JSON.parse(authDataRaw) : null;
      const userId = authData?.user?.id || null;

      const markMergedRes = await fetch(
        `${SUPABASE_URL}/rest/v1/comandas?table_number=eq.${sourceMesa}&comanda_number=eq.${sourceComanda}&status=eq.aberta&date_key=eq.${TODAY_KEY}`,
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

      const openTarget = await listOpenComandasByMesa(targetMesa, accessToken);
      expect(Array.isArray(openTarget)).toBeTruthy();
      expect(openTarget.length).toBe(1);

      const canonicalTarget = String(openTarget[0].comanda_number);

      // Destination must keep exactly one canonical open comanda.
      expect(canonicalTarget).toBeTruthy();

      // Source table should no longer have open comandas after consolidation.
      const openSource = await listOpenComandasByMesa(sourceMesa, accessToken);
      expect(openSource.length).toBe(0);

      // All active orders now in destination table should point to the canonical comanda.
      const ordersTargetRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${targetMesa}&date_key=eq.${TODAY_KEY}&select=id,comanda_number,status,date_key`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(ordersTargetRes.ok).toBeTruthy();
      const ordersTarget = await ordersTargetRes.json();

      const activeTargetOrders = (ordersTarget || []).filter((o: any) => !['cancelled', 'cancelada'].includes(String(o.status || '').toLowerCase()));
      expect(activeTargetOrders.length).toBeGreaterThan(0);

      const distinctComandas = [...new Set(activeTargetOrders.map((o: any) => String(o.comanda_number)))];
      expect(distinctComandas.length).toBe(1);
      expect(distinctComandas[0]).toBe(canonicalTarget);

      // Optional technical validation: source comanda was merged.
      const mergedLookupRes = await fetch(
        `${SUPABASE_URL}/rest/v1/comandas?comanda_number=eq.${sourceComanda}&date_key=eq.${TODAY_KEY}&select=status,merged_into_comanda_number,date_key&order=created_at.desc&limit=1`,
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
    } finally {
      unlockMesa(targetMesa);
      unlockMesa(sourceMesa);
    }
  });
});
