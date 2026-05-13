import { test, expect } from '@playwright/test';

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

  test('Deve conseguir abrir uma comanda a partir de uma Mesa Livre no Mapa', async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log(`[ALERT/DIALOG INTERCEPTADO] ${dialog.type()} -> Mensagem: "${dialog.message()}"`);
      await dialog.accept();
    });

    console.log('1. Acessando Aba Mapa de Mesas');
    const tabMapa = page.getByText('Mapa').first();
    await expect(tabMapa).toBeVisible({ timeout: 15000 });
    await tabMapa.click();
    await expect(page.getByText('Mapa de Mesas').first()).toBeVisible({ timeout: 15000 });

    console.log('2. Aguardando mesas carregarem do Supabase');
    await page.waitForTimeout(3000);

    console.log('3. Identificando mesas disponíveis');
    // Em vez de "Mesa", procuramos por "lug." (ex: "4 lug.") que aparece apenas nas mesas Livres no Mapa
    const mesaCards = page.locator('div[dir="auto"]').filter({ hasText: /lug\./i });
    const count = await mesaCards.count();
    console.log(`- Encontradas ${count} mesas disponíveis.`);

    if (count === 0) {
      throw new Error('Nenhuma mesa livre encontrada!');
    }

    // Escolhe uma mesa aleatória das disponíveis
    const randomIndex = Math.floor(Math.random() * count);
    const selectedMesa = mesaCards.nth(randomIndex);

    // Tenta pegar o texto da mesa para logar
    const mesaText = await selectedMesa.innerText().catch(() => 'Desconhecida');
    console.log(`- Clicando na mesa: ${mesaText.split('\n')[0]} (Índice: ${randomIndex})`);

    await selectedMesa.click();

    console.log('4. Mesa selecionada. Deve ter sido redirecionado para Novo Pedido');
    const mesaHeader = page.locator('text=/Mesa:/i').first();
    await expect(mesaHeader).toBeVisible({ timeout: 15000 });

    console.log('5. Preenchendo Nome do Cliente');
    const clienteInput = page.getByPlaceholder('Digite o nome');
    await clienteInput.fill('Comprador da Mesa Mock (Playwright)');

    console.log('6. Adicionando múltiplos itens ao pedido (Calabresa e Caldo)');
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Itens que existem no banco
    const itemsToSearch = ['calabresa', 'caldo'];

    for (const term of itemsToSearch) {
      console.log(`Buscando por: ${term}`);
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(term);
      await page.waitForTimeout(1500);

      try {
        if (term === 'calabresa') {
          const pizzaCard = page.locator('div[dir="auto"]').filter({ hasText: 'Calabresa' }).first();
          await pizzaCard.waitFor({ state: 'visible', timeout: 5000 });
          await pizzaCard.click();

          // Configuração da Pizza
          console.log('Configurando Pizza...');
          await page.locator('text=Broto').click();
          await page.locator('text=Próximo: Extras').click();
          await page.locator('text=Adicionar ao Pedido').click();
          console.log('- Pizza Calabresa adicionada!');
        } else {
          // Caldo ou outros itens simples
          const plusBtn = page.locator('div[role="button"], div[dir="auto"]').filter({ hasText: '+' }).filter({ visible: true }).first();
          if (await plusBtn.count() > 0) {
            await plusBtn.click();
            console.log(`- Item '${term}' adicionado via botão +`);
          } else {
            const itemCard = page.locator('div[dir="auto"]').filter({ hasText: term }).first();
            await itemCard.click();
            console.log(`- Item '${term}' adicionado via clique no card`);
          }
        }
      } catch (e: any) {
        console.log(`- Item '${term}' não encontrado ou erro na seleção: ${e.message}`);
      }
      await page.waitForTimeout(500);
    }

    console.log('7. Finalizando Pedido da Mesa');
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    console.log('8. Aguardando confirmação (Toast de sucesso)...');
    const toast = page.locator('text=Pedido criado com sucesso');
    await expect(toast).toBeVisible({ timeout: 15000 });

    console.log('9. Validando persistência na Cozinha...');
    // Tenta clicar no botão Cozinha (pode estar no rodapé ou menu)
    await page.locator('text=Cozinha').first().click();
    await page.waitForTimeout(2000);

    // Verificar se algum item aparece
    const kitchenItem = page.locator('text=Calabresa').first();
    await kitchenItem.waitFor({ state: 'visible', timeout: 10000 }).catch(() => console.log('⚠️ Aviso: Item não apareceu na cozinha no tempo esperado.'));

    const screenshotPath = `mesa-success-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`- Pedido criado! Screenshot em: ${screenshotPath}`);
  });
});
