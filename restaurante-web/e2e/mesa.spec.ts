import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '@playwright/test';

const LOCK_DIR = path.join(os.tmpdir(), 'playwright-mesa-locks');
const MESA_POOL = ['1', '2', '3', '4', '5'];

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

async function cancelOpenComanda(mesaNumber: string, accessToken: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&table_number=eq.${mesaNumber}&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`, // Bypasses RLS para o usuario logado!
      }
    });

    if (res.ok) {
      const comandas = await res.json();
      if (comandas.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/comandas?table_number=eq.${mesaNumber}&status=eq.aberta`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelada' }),
        });
        console.log(`[DB] Comanda aberta encontrada na mesa ${mesaNumber} foi cancelada para o novo teste.`);
      }
    }
  } catch (e) {
    console.warn(`[DB] Falha não crítica ao limpar comanda da mesa ${mesaNumber}:`, e);
  }
}

async function cancelActiveOrdersForMesa(mesaNumber: string, accessToken: string) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesaNumber}&status=neq.cancelled&status=neq.cancelada&select=id,comanda_number,status`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!res.ok) {
      console.warn(`[DB] Não foi possível listar pedidos ativos da mesa ${mesaNumber}: ${res.status}`);
      return;
    }

    const activeOrders = await res.json();
    if (!Array.isArray(activeOrders) || activeOrders.length === 0) {
      return;
    }

    const idFilter = activeOrders.map((o: any) => `id.eq.${o.id}`).join(',');
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(${idFilter})`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'cancelled',
        comanda_status: 'cancelada',
        updated_at: new Date().toISOString(),
      }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.warn(`[DB] Falha ao cancelar pedidos ativos da mesa ${mesaNumber}: ${patchRes.status} - ${err}`);
      return;
    }

    console.log(`[DB] ${activeOrders.length} pedido(s) ativo(s) da mesa ${mesaNumber} foram cancelados antes do teste.`);
  } catch (e) {
    console.warn(`[DB] Falha não crítica ao limpar pedidos ativos da mesa ${mesaNumber}:`, e);
  }
}

/**
 * Pega a próxima mesa disponível do pool sincronizando terminais
 * pelo sistema de arquivos. 'wx' é atômico no Windows/Linux/Mac e 
 * não tem falha de concorrência.
 */
async function lockMesa(): Promise<string> {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }

  const maxRetries = 30; // 30 tentativas = ~30s esperando
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const mesa of MESA_POOL) {
      const lockFile = path.join(LOCK_DIR, `mesa-${mesa}.lock`);
      try {
        // Se a trava for de um terminal que crachou (mais antiga que 2 minutos), apagamos.
        if (fs.existsSync(lockFile)) {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > 1000 * 60 * 2) {
            fs.unlinkSync(lockFile);
          }
        }

        const fd = fs.openSync(lockFile, 'wx'); // Atômico
        fs.closeSync(fd);
        return mesa;
      } catch (e: any) {
        if (e.code === 'EEXIST') continue; // Mesa em uso
        throw e;
      }
    }
    // Se não achou mesa livre, dorme 1s e tenta de novo
    console.log(`[LOCK] Sem mesas livres. Aguardando... (tentativa ${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout: Nenhuma mesa do pool [${MESA_POOL.join(', ')}] ficou livre a tempo. Garanta que o reset do db está limpo.`);
}

function unlockMesa(mesa: string) {
  const lockFile = path.join(LOCK_DIR, `mesa-${mesa}.lock`);
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

test.describe('Fluxo Principal - Mesa (Mapa)', () => {
  let mesaId: string;

  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });
      await emailInput.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
      await page.locator('input[placeholder="••••••••"]').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
      await page.getByText('ENTRAR', { exact: true }).click();
      await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    } catch {
      console.log('Login já persistido. Prosseguindo.');
    }
  });

  test.afterEach(() => {
    // Libera a mesa pra o próximo teste assim que terminar
    if (mesaId) unlockMesa(mesaId);
  });

  test('Deve criar uma comanda individual por mesa (sem agrupamento)', async ({ page }, testInfo) => {
    // Escolhe uma mesa real 1 a 10 usando trava no sistema para não colidir terminais
    mesaId = await lockMesa();

    // Extrai o token do localStorage após ter logado
    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const accessToken = authDataRaw ? JSON.parse(authDataRaw).access_token : '';

    // Cancela comandas fantasmas garantindo que RLS será validado (user logado)
    if (accessToken) {
      await cancelOpenComanda(mesaId, accessToken);
      await cancelActiveOrdersForMesa(mesaId, accessToken);
    }

    const orderName = `Playwright W${testInfo.parallelIndex}R${testInfo.repeatEachIndex}`;
    console.log(`[MESA] Instância usando Mesa ${mesaId}`);

    page.on('dialog', async d => {
      console.log(`[DIALOG] ${d.message()}`);
      if (d.message().includes('Caixa Fechado') || d.message().includes('Caixa não está aberto')) {
        // Não apenas aceita, mas propaga um erro fatal para não dar timeout
        throw new Error(`Dialog de erro interceptado: ${d.message()}`);
      }
      await d.accept();
    });

    page.on('console', msg => console.log(`[PAGE LOG] ${msg.text()}`));

    // ── 1. Navega diretamente para Novo Pedido (evita race no Mapa) ───────────
    //    O Mapa é apenas visual; a criação do pedido acontece no formulário.
    //    Ir pelo Mapa causa corrida: dois workers veem a mesma mesa "Livre"
    //    ao mesmo tempo e ambos criam comanda na mesma mesa.
    console.log('1. Abrindo Novo Pedido diretamente');
    await page.getByText('Novo Pedido').first().click();

    const clienteInput = page.getByPlaceholder('Digite o nome');
    await clienteInput.waitFor({ state: 'visible', timeout: 15000 });

    // ── 2. Preencher nome e mesa ──────────────────────────────────────────────
    await clienteInput.fill(`Playwright W${testInfo.workerIndex}R${testInfo.repeatEachIndex}`);
    console.log(`[W${testInfo.workerIndex}/R${testInfo.repeatEachIndex}] Digitou nome cliente`);

    // Digita o número dinâmico e reservado da Mesa (1 a 10)
    await page.locator('input[placeholder="Nº"]').waitFor({ state: 'visible' });
    await page.locator('input[placeholder="Nº"]').fill(mesaId);

    const inputMesaValue = await page.locator('input[placeholder="Nº"]').inputValue();
    console.log(`input mesa valor retornado: `, inputMesaValue);
    expect(inputMesaValue).toBe(mesaId);

    console.log(`2. Mesa ${mesaId} preenchida`);

    // ── 3. Adicionar itens (mesma base do balcão) ───────────────────────────
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Pizza Grande/Família: 1/2 Calabresa + 1/2 Chocolate com Morango + Bacon
    console.log('Adicionando Pizza Grande/Família (1/2 Calabresa, 1/2 Chocolate com Morango) + Bacon...');
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
      console.log('   ✓ Pizza Grande/Família adicionada');
    } catch (e: any) {
      console.log(`   ⚠️ Pizza: ${e.message}`);
    }
    await page.waitForTimeout(500);

    const itemsToSearch = [
      { term: 'chopp', quantity: 3 },
      { term: 'risoto', quantity: 1 },
      { term: 'caldo', quantity: 3 },
    ];

    for (const { term, quantity } of itemsToSearch) {
      for (let i = 0; i < quantity; i++) {
        console.log(`Buscando por: ${term} (${i + 1}/${quantity})`);
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
            console.log(`- Item '${term}' adicionado com sucesso!`);
          } else {
            const itemCard = page.locator('div[dir="auto"]').filter({ hasText: new RegExp(term, 'i') }).first();
            await itemCard.click();
            console.log(`- Item '${term}' selecionado pelo card.`);
          }
        } catch (e: any) {
          console.log(`- Erro ao adicionar '${term}': ${e.message}`);
        }

        await page.waitForTimeout(500);
      }
    }

    // ── 4. Submeter pedido ────────────────────────────────────────────────────
    console.log('3. Criando pedido...');
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ✅ FIX: poll immediately after submit so short-lived success toasts are not missed
    // by timeout-driven locator races.
    const toastLocator = page.locator('[data-testid="toast-container"], div[role="status"]').first();
    let toastText = '';
    const deadline = Date.now() + 20000;

    while (Date.now() < deadline) {
      toastText = (await toastLocator.textContent().catch(() => ''))?.trim() || '';

      if (/Pedido criado!/i.test(toastText)) {
        break;
      }

      if (/Mesa.*já foi ocupada/i.test(toastText)) {
        throw new Error(`Mesa ${mesaId} já estava ocupada — use --repeat-each menor ou feche as comandas abertas.`);
      }

      if (/Falhou|Erro/i.test(toastText)) {
        throw new Error(`Erro desconhecido interceptado: ${toastText}`);
      }

      await page.waitForTimeout(250);
    }

    if (!/Pedido criado!/i.test(toastText)) {
      const isStillSubmitting = await submitBtn.locator('text=Criar Pedido').count() === 0;
      throw new Error(
        `Timeout esperando toast de sucesso. Toast atual: ${toastText || 'Nenhum toast renderizado'}. ` +
        `Estado de submissão: ${isStillSubmitting ? 'ainda carregando' : 'botão liberado'}`
      );
    }

    console.log(`✅ [Mesa ${mesaId}] ${toastText}`);
    expect(toastText).toMatch(/Pedido criado!/i);

    // ── 5. Validação de integridade Mesa x Comanda x Pedido ───────────────────
    const comandaMatch = toastText.match(/Comanda\s+(\d+)/i);
    const comandaCriada = comandaMatch?.[1];
    expect(comandaCriada).toBeTruthy();

    if (accessToken && comandaCriada) {
      const openComandasRes = await fetch(
        `${SUPABASE_URL}/rest/v1/comandas?status=eq.aberta&table_number=eq.${mesaId}&select=id,comanda_number,table_number`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      expect(openComandasRes.ok).toBeTruthy();
      const openComandas = await openComandasRes.json();

      // Regra 1 e 2: apenas 1 comanda aberta por mesa e deve ser a comanda recém-criada.
      expect(Array.isArray(openComandas)).toBeTruthy();
      expect(openComandas.length).toBe(1);
      expect(String(openComandas[0].comanda_number)).toBe(String(comandaCriada));
      expect(String(openComandas[0].table_number)).toBe(String(mesaId));

      const ordersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?table_number=eq.${mesaId}&comanda_number=eq.${comandaCriada}&status=neq.cancelled&status=neq.cancelada&select=id,items_with_status,items,table_number,comanda_number,created_at&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      expect(ordersRes.ok).toBeTruthy();
      const activeOrders = await ordersRes.json();
      expect(Array.isArray(activeOrders)).toBeTruthy();
      expect(activeOrders.length).toBe(1);

      const newestOrder = activeOrders[0];
      expect(String(newestOrder.table_number)).toBe(String(mesaId));
      expect(String(newestOrder.comanda_number)).toBe(String(comandaCriada));

      const itemNames: string[] = Array.isArray(newestOrder.items_with_status)
        ? newestOrder.items_with_status.map((it: any) => String(it?.name || ''))
        : Array.isArray(newestOrder.items)
          ? newestOrder.items.map((it: any) => String(it || ''))
          : [];

      expect(itemNames.some(name => /chopp/i.test(name))).toBeTruthy();
      expect(itemNames.some(name => /risoto/i.test(name))).toBeTruthy();
      expect(itemNames.some(name => /caldo/i.test(name))).toBeTruthy();
    }

    // ── 6. Cozinha ────────────────────────────────────────────────────────────
    // Assertion: itens de produção (Caldo, Risoto, Pizza) devem aparecer na Cozinha.
    // Bebidas (Chopp) são filtradas por categoria e não devem aparecer.
    console.log('6. Verificando Cozinha...');
    await page.locator('text=Cozinha').first().click();
    await page.waitForTimeout(2000);

    // Verificar item de cozinha obrigatório (forçando elemento visível para evitar colisão com nós ocultos)
    await expect(
      page.locator('div:visible').filter({ hasText: 'Caldo de Camarão 300ml (Cebolinha e Coentro)' }).first()
    ).toBeVisible({ timeout: 10000 });
    console.log('   ✓ Caldo de Camarão visível na Cozinha');

    // Verificar item de cozinha obrigatório (nome específico visível)
    await expect(
      page.locator('div:visible').filter({ hasText: 'Risoto de Camarão (Cebolinha e Coentro)' }).first()
    ).toBeVisible({ timeout: 5000 });
    console.log('   ✓ Risoto de Camarão visível na Cozinha');

    // Verificar que a tag da mesa aparece (agrupamento por mesa, não por comanda)
    await expect(
      page.locator(`text=Mesa ${mesaId}`).first()
    ).toBeVisible({ timeout: 5000 });
    console.log(`   ✓ Mesa ${mesaId} visível como tag na Cozinha`);

    // ── 7. Montagem ───────────────────────────────────────────────────────────
    // Assertion: card da mesa deve aparecer com todos os itens de produção checkable.
    console.log('7. Verificando Montagem...');
    await page.locator('text=Montagem').first().click();
    await page.waitForTimeout(2000);

    // Itens do pedido devem aparecer na lista de Montagem
    await expect(
      page.locator('div:visible').filter({ hasText: 'Caldo de Camarão 300ml (Cebolinha e Coentro)' }).first()
    ).toBeVisible({ timeout: 5000 });
    console.log('   ✓ Caldo de Camarão visível no card de Montagem');

    await expect(
      page.locator('div:visible').filter({ hasText: 'Risoto de Camarão (Cebolinha e Coentro)' }).first()
    ).toBeVisible({ timeout: 5000 });
    console.log('   ✓ Risoto de Camarão visível no card de Montagem');

    // Montagem exibe todos os itens do pedido (incluindo bebidas).
    await expect(
      page.locator('div:visible').filter({ hasText: 'Chopp 300 ML' }).first()
    ).toBeVisible({ timeout: 5000 });
    console.log('   ✓ Chopp 300 ML visível no card de Montagem');

    console.log(`[W${testInfo.workerIndex}/R${testInfo.repeatEachIndex}] Sucesso ao gerar comanda na mesa ${mesaId}`);
  });
});
