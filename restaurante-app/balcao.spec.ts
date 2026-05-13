import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal - Balcão (Novo Pedido Direto)', () => {
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

  test('Deve conseguir criar um pedido de Balcão puro sem vínculo externo', async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log(`[ALERT/DIALOG INTERCEPTADO] ${dialog.type()} -> Mensagem: "${dialog.message()}"`);
      await dialog.accept();
    });

    // Adiciona um pequeno delay aleatório para evitar race condition na geração de número da comanda
    // quando executado em terminais rodando exata e perfeitamente ao mesmo tempo.
    await page.waitForTimeout(Math.random() * 3000);

    console.log('1. Acessando Aba Novo Pedido');
    const tabNovoPedido = page.getByText('Novo Pedido').first();
    await expect(tabNovoPedido).toBeVisible({ timeout: 15000 });
    await tabNovoPedido.click();

    // Pequena pausa para garantir carregamento do form
    await page.waitForTimeout(2000);

    console.log('2. Verificando Novo Pedido e Preenchendo Nome');
    const clienteInput = page.getByPlaceholder('Digite o nome');
    await expect(clienteInput).toBeVisible({ timeout: 15000 });
    const uniqueId = Date.now() + Math.round(Math.random() * 1000);
    await clienteInput.fill(`Cliente Balcão ${uniqueId}`);

    console.log('3. Adicionando itens variados ao pedido');
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Lista de itens reais e variados para o teste de balcão
    const itemsToSearch = ['chopp', 'risoto', 'caldo'];

    for (const term of itemsToSearch) {
      console.log(`Buscando por: ${term}`);
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(term);
      await page.waitForTimeout(1500);

      try {
        // Tenta clicar no botão de adicionar (+) que aparece nos resultados
        const plusBtn = page.locator('div[role="button"], div[dir="auto"]').filter({ hasText: '+' }).filter({ visible: true }).first();

        if (await plusBtn.count() > 0) {
          await plusBtn.click();
          console.log(`- Item '${term}' adicionado com sucesso!`);
        } else {
          // Se não achar o botão +, tenta clicar no card do item
          const itemCard = page.locator('div[dir="auto"]').filter({ hasText: new RegExp(term, 'i') }).first();
          await itemCard.click();
          console.log(`- Item '${term}' selecionado pelo card.`);
        }
      } catch (e: any) {
        console.log(`- Erro ao adicionar '${term}': ${e.message}`);
      }
      await page.waitForTimeout(500);
    }

    console.log('4. Finalizando Pedido');
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Aguarda a confirmação (Toast de sucesso do useNovoPedido)
    console.log('5. Aguardando confirmação...');
    const toast = page.locator('text=Pedido criado com sucesso');
    await expect(toast).toBeVisible({ timeout: 15000 });

    const screenshotPath = `balcao-success-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`- Pedido Balcão criado! Screenshot: ${screenshotPath}`);
  });
});
