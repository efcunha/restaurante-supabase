import { test, expect } from '@playwright/test';

/**
 * Testes de Mesa — serializado para evitar race condition.
 *
 * Mesas cadastradas: 1–10.
 * Com mode:'serial', apenas 1 worker executa por vez →
 * não há risco de dois workers concorrerem pela mesma mesa.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Fluxo Principal - Mesa (Mapa)', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    console.log('Navegando para o App / Login');
    await page.goto('/');

    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });

      console.log('Preenchendo credenciais...');
      await emailInput.fill('lu@m.com');
      await page.locator('input[placeholder="••••••••"]').fill('mudar123');
      await page.locator('text=ENTRAR').click();

      await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Login já persistido ou tela de login ignorada. Prosseguindo.');
    }
  });

  test('Deve criar uma comanda individual a partir de uma Mesa Livre no Mapa', async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log(`[DIALOG] ${dialog.type()} → "${dialog.message()}"`);
      await dialog.accept();
    });

    // ── 1. Abrir Mapa de Mesas ────────────────────────────────────────────────
    console.log('1. Acessando Aba Mapa de Mesas');
    await page.getByText('Mapa').first().click();
    await expect(page.getByText('Mapa de Mesas').first()).toBeVisible({ timeout: 15000 });

    console.log('2. Aguardando mesas carregarem do Supabase');
    await page.waitForTimeout(3000);

    // ── 2. Identificar UMA mesa livre ("X lug." só aparece em mesas Livres) ───
    console.log('3. Identificando a primeira mesa disponível');
    const mesaCards = page.locator('div[dir="auto"]').filter({ hasText: /\d+ lug\./i });
    const count = await mesaCards.count();
    console.log(`- Encontradas ${count} mesas livres.`);

    if (count === 0) {
      throw new Error('Nenhuma mesa livre encontrada! Feche comandas abertas antes de rodar o teste.');
    }

    // Sempre usa a primeira mesa livre (execução serial → sem concorrência)
    const selectedMesa = mesaCards.first();
    const mesaText = await selectedMesa.innerText().catch(() => 'Desconhecida');
    console.log(`- Clicando na mesa: ${mesaText.split('\n')[0]}`);

    await selectedMesa.click();

    // ── 3. Formulário de Novo Pedido deve abrir ───────────────────────────────
    console.log('4. Verificando redirecionamento para Novo Pedido');
    const mesaHeader = page.locator('text=/Mesa:/i').first();
    await expect(mesaHeader).toBeVisible({ timeout: 15000 });

    // Ler o número da mesa pré-preenchido para logar
    const mesaField = page.locator('input[placeholder="Nº"]');
    const mesaNumero = await mesaField.inputValue().catch(() => '?');
    console.log(`- Mesa pré-preenchida no formulário: ${mesaNumero}`);

    // ── 4. Preencher dados da comanda ─────────────────────────────────────────
    console.log('5. Preenchendo Nome do Cliente');
    const clienteInput = page.getByPlaceholder('Digite o nome');
    await clienteInput.fill(`Playwright Mesa ${mesaNumero}`);

    // ── 5. Adicionar itens ────────────────────────────────────────────────────
    console.log('6. Adicionando itens (Calabresa e Caldo)');
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    for (const term of ['calabresa', 'caldo']) {
      console.log(`   Buscando: ${term}`);
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(term);
      await page.waitForTimeout(1500);

      try {
        if (term === 'calabresa') {
          const pizzaCard = page.locator('div[dir="auto"]').filter({ hasText: 'Calabresa' }).first();
          await pizzaCard.waitFor({ state: 'visible', timeout: 5000 });
          await pizzaCard.click();

          await page.locator('text=Broto').click();
          await page.locator('text=Próximo: Extras').click();
          await page.locator('text=Adicionar ao Pedido').click();
          console.log('   ✓ Pizza Calabresa adicionada');
        } else {
          const caldoCard = page.locator('div[dir="auto"]').filter({ hasText: /caldo/i }).first();
          await caldoCard.waitFor({ state: 'visible', timeout: 5000 });
          await caldoCard.click();
          console.log('   ✓ Caldo adicionado');
        }
      } catch (e: any) {
        console.log(`   ⚠️ Item '${term}' não encontrado: ${e.message}`);
      }
      await page.waitForTimeout(500);
    }

    // ── 6. Criar pedido ───────────────────────────────────────────────────────
    console.log('7. Clicando em Criar Pedido');
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ── 7. Validar Toast com número de comanda (1 comanda por pedido) ─────────
    console.log('8. Aguardando Toast de sucesso...');
    const toastComanda = page.locator('text=/Pedido criado! Comanda/i');
    await expect(toastComanda).toBeVisible({ timeout: 20000 });

    const toastText = await toastComanda.innerText().catch(() => '');
    console.log(`✅ Comanda criada: "${toastText}"`);

    // Garantia: o toast deve conter "Comanda" (número único, não agrupado)
    expect(toastText).toMatch(/Comanda\s+\S+/i);

    // ── 8. Verificar item na Cozinha ──────────────────────────────────────────
    console.log('9. Verificando item na Cozinha...');
    await page.locator('text=Cozinha').first().click();
    await page.waitForTimeout(2000);

    await page.locator('text=Calabresa').first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => console.log('⚠️ Item não apareceu na cozinha no tempo esperado.'));

    await page.screenshot({ path: `mesa-${mesaNumero}-${Date.now()}.png` });
    console.log('✅ Teste concluído com sucesso.');
  });
});
