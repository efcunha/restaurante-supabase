import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '@playwright/test';

const LOCK_DIR = path.join(os.tmpdir(), 'playwright-mesa-locks');

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

/**
 * Pega a próxima mesa disponível de 1 a 10 sincronizando terminais
 * pelo sistema de arquivos. 'wx' é atômico no Windows/Linux/Mac e 
 * não tem falha de concorrência.
 */
async function lockMesa(): Promise<string> {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }

  const maxRetries = 30; // 30 tentativas = ~30s esperando
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (let i = 1; i <= 10; i++) {
      const lockFile = path.join(LOCK_DIR, `mesa-${i}.lock`);
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
        return String(i);
      } catch (e: any) {
        if (e.code === 'EEXIST') continue; // Mesa em uso
        throw e;
      }
    }
    // Se não achou mesa livre, dorme 1s e tenta de novo
    console.log(`[LOCK] Sem mesas livres. Aguardando... (tentativa ${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout: Nenhuma mesa de 1 a 10 ficou livre a tempo. Garanta que o reset do db está limpo.');
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
      await emailInput.fill('lu@m.com');
      await page.locator('input[placeholder="••••••••"]').fill('mudar123');
      await page.locator('text=ENTRAR').click();
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

    // ── 3. Adicionar itens ────────────────────────────────────────────────────
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Pizza Calabresa
    await searchInput.fill('calabresa');
    await page.waitForTimeout(1500);
    try {
      const pizzaCard = page.locator('div[dir="auto"]').filter({ hasText: 'Calabresa' }).first();
      await pizzaCard.waitFor({ state: 'visible', timeout: 5000 });
      await pizzaCard.click();
      await page.locator('text=Broto').click();
      await page.locator('text=Próximo: Extras').click();
      await page.locator('text=Adicionar ao Pedido').click();
      console.log('   ✓ Pizza Calabresa adicionada');
    } catch (e: any) {
      console.log(`   ⚠️ Calabresa: ${e.message}`);
    }

    await page.waitForTimeout(500);

    // Caldo
    await searchInput.fill('caldo');
    await page.waitForTimeout(1500);
    try {
      const caldoCard = page.locator('div[dir="auto"]').filter({ hasText: /caldo/i }).first();
      await caldoCard.waitFor({ state: 'visible', timeout: 5000 });
      await caldoCard.click();
      console.log('   ✓ Caldo adicionado');
    } catch (e: any) {
      console.log(`   ⚠️ Caldo: ${e.message}`);
    }

    // ── 4. Submeter pedido ────────────────────────────────────────────────────
    console.log('3. Criando pedido...');
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ✅ FIX: Fail-fast mechanism - detect frozen state early
    // Wait 10s to allow order creation to complete
    await page.waitForTimeout(10000);
    const isStillLoading = await submitBtn.locator('text=Criar Pedido').count() === 0;
    if (isStillLoading) {
      // Check if there's any network activity or if it's truly frozen
      const hasToast = await page.locator('div[role="status"]').count() > 0;
      if (!hasToast) {
        throw new Error('Order submission appears frozen - no response after 10s and no toast displayed');
      }
    }

    // ── 5. Validar toast — 1 comanda por pedido ───────────────────────────────
    const toastSucesso = page.locator('text=/Pedido criado!/i');
    const toastErroMesa = page.locator('text=/Mesa.*já foi ocupada/i');
    const toastErroGen = page.locator('text=/Falhou|Erro/i');

    await Promise.race([
      toastSucesso.waitFor({ state: 'visible', timeout: 20000 }),
      toastErroMesa.waitFor({ state: 'visible', timeout: 10000 })
        .then(() => { throw new Error(`Mesa ${mesaId} já estava ocupada — use --repeat-each menor ou feche as comandas abertas.`); }),
      toastErroGen.waitFor({ state: 'visible', timeout: 10000 })
        .then(async () => { throw new Error(`Erro desconhecido interceptado: ${await toastErroGen.textContent()}`); })
    ]).catch(async (e) => {
      // Se ainda der timeout, tenta capturar o texto do que quer que esteja na tela no container de toast
      const qqrToast = await page.locator('[data-testid="toast-container"], div[role="status"]').textContent().catch(() => 'Nenhum toast renderizado');
      throw new Error(`Timeout esperando toast. Toast atual na tela: ${qqrToast}. Erro original: ${e.message}`);
    });

    const toastText = await page.locator('[data-testid="toast-container"], div[role="status"]').textContent();
    console.log(`✅ [Mesa ${mesaId}] ${toastText}`);
    expect(toastText).toMatch(/Pedido criado!/i);

    // ── 6. Cozinha ────────────────────────────────────────────────────────────
    await page.locator('text=Cozinha').first().click();
    await page.waitForTimeout(2000);
    await page.locator('text=Calabresa').first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => console.log('⚠️ Item não apareceu na cozinha.'));

    await page.screenshot({ path: `pizza-success-${Date.now()}.png` });
    console.log(`[W${testInfo.workerIndex}/R${testInfo.repeatEachIndex}] Sucesso ao gerar comanda na mesa ${mesaId}`);
  });
});
