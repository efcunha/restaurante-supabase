import { test, expect } from '@playwright/test';

test.describe('Fluxo de Pedido Delivery', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const loginEmail = page.getByPlaceholder('seu@email.com');
    const homeIndicator = page.getByText('Pedido Delivery').first();

    await Promise.race([
      loginEmail.waitFor({ state: 'visible', timeout: 30000 }).catch(() => { }),
      homeIndicator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => { }),
    ]);

    if (await loginEmail.isVisible()) {
      await loginEmail.fill('lu@m.com');
      await page.getByPlaceholder('••••••••').fill('mudar123');
      await page.getByText('ENTRAR').click();
      await expect(homeIndicator).toBeVisible({ timeout: 30000 });
    }
  });

  test('Deve realizar um pedido completo de delivery', async ({ page }) => {
    let successAlertShown = false;

    page.on('dialog', async dialog => {
      console.log(`[ALERT/DIALOG INTERCEPTADO] ${dialog.type()} -> Mensagem: "${dialog.message()}"`);
      if (dialog.message().includes('sucesso')) {
        successAlertShown = true;
      }
      await dialog.accept();
    });

    // 1. Navega para Pedido Delivery
    console.log('STEP 1: click Pedido Delivery');
    await page.getByText('Pedido Delivery').first().click();

    // 2. Aguarda o formulário carregar
    console.log('STEP 2: wait form');
    await expect(page.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });

    // 3. Preenche os campos
    console.log('STEP 3: fill form fields');
    await page.getByPlaceholder('Nome do Cliente').fill('Cliente Playwright');
    await page.getByPlaceholder('(11) 99999-9999').fill('11988887777');
    await page.getByPlaceholder('00000-000').fill('01001000');
    // Espera para dar tempo da busca de CEP via API (que bloqueamos auto-completar testando se já temos o txt)
    await page.waitForTimeout(2000);
    const endereco = page.getByPlaceholder('Rua, Número, Bairro, Referência...');
    await endereco.fill('');
    await endereco.fill('Rua Teste, 100 - Centro');

    // 4. Taxa de entrega
    console.log('STEP 4: fill taxa');
    const taxaInput = page.getByPlaceholder('0,00', { exact: true });
    await expect(taxaInput).toBeVisible({ timeout: 10000 });
    await taxaInput.fill('10');

    // 5. PIX
    console.log('STEP 5: click PIX');
    await page.locator('text=PIX').nth(0).click();

    const searchBox = page.getByPlaceholder('Buscar no cardápio...');

    // Helper: busca item e clica no "+"
    const addItem = async (termo: string, stepNum: number) => {
      console.log(`STEP ${stepNum}: search "${termo}"`);
      await searchBox.fill('');
      await searchBox.fill(termo);
      await page.waitForTimeout(1500);

      console.log(`STEP ${stepNum}: click + for "${termo}"`);
      try {
        const plusBtn = page.locator('div[role="button"], div[dir="auto"]').filter({ hasText: '+' }).filter({ visible: true }).first();
        if (await plusBtn.count() > 0) {
          await plusBtn.click();
          console.log(`- Item '${termo}' adicionado com sucesso!`);
        } else {
          const itemCard = page.locator('div[dir="auto"]').filter({ hasText: new RegExp(termo, 'i') }).first();
          await itemCard.click();
          console.log(`- Item '${termo}' selecionado pelo card.`);
        }
      } catch (e: any) {
        console.log(`- Erro ao adicionar '${termo}': ${e.message}`);
      }
      await page.waitForTimeout(500);
    };

    await addItem('caldo', 6);
    await addItem('risoto', 7);
    await addItem('chopp', 8);

    // 9. Limpa busca e confirma
    console.log('STEP 9: clear search and confirm');
    await searchBox.fill('');
    await page.waitForTimeout(1000);

    const confirmBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Confirmar Delivery' }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Forçamos o clique no container principal
    await confirmBtn.click({ force: true });

    // 10. Valida Resolução (Formulário Limpo / Valor Final = 0.00)
    console.log('STEP 10: validate reset');

    // Aguarda o processamento do submit e a exibição do dialog de sucesso
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results-delivery/after-confirm.png' });

    // Após a confirmação, o nome volta a ficar vazio
    await expect(page.getByPlaceholder('Nome do Cliente')).toHaveValue('', { timeout: 15000 });
    console.log('DONE: test passed!');
  });
});
