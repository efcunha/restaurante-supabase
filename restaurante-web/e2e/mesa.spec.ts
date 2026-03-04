import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal - Mesa (Mapa)', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    // 1. Autenticação e Login
    console.log('Navegando para o App / Login');
    await page.goto('/');

    try {
      // Esperar um campo de e-mail ser visível
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

    console.log('2. Clicando na Flag de Filtro para forçar visualização');
    // Para estabilidade, garante que a aba livre está ativada.
    await expect(page.locator('text=Livre').first()).toBeVisible();
    await page.waitForTimeout(2000); // Wait map grid to fetch from Supabase

    console.log('3. Identificando e clicando na primeira mesa Livre (0 lug.) ou similar da grid');
    // A UI exibe <Text style={styles.infoSeats}>{table.seats} lug.</Text> apenas em Livre
    const freeTableIndicator = page.locator('text=lug.').first();
    await expect(freeTableIndicator).toBeVisible({ timeout: 10000 });
    await freeTableIndicator.click();

    console.log('4. Mesa selecionada. Deve ter sido redirecionado para Novo Pedido');
    
    // Agora ele deve mostrar "Mesa: X" no header, onde o X é injetado do navigate parametrizado
    const mesaHeader = page.locator('text=/Mesa:/i').first();
    await expect(mesaHeader).toBeVisible({ timeout: 15000 });

    console.log('5. Identificando Nome de Cliente/Comanda automática MESA');
    // Tem que ter preenchido automaticamente, ou podemos preencher manual para forçar
    const clienteInput = page.getByPlaceholder('Digite o nome');
    await clienteInput.fill('Comprador da Mesa Mock (Playwright)');

    console.log('6. Inserindo itens do Cardápio');
    const productAddedSelector = page.getByText('+').first();
    await expect(productAddedSelector).toBeVisible({ timeout: 15000 });
    await productAddedSelector.click();
    await page.waitForTimeout(1000); // UI repaints 

    console.log('7. Lançando Comanda / Pedido');
    const submitBtn = page.getByText('Criar Pedido').first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    console.log('8. Validando persistência (Esperando sumir tela cheia ou limpar)');
    await page.waitForTimeout(3000);
    // Como foi lançado com sucesso, campo clienteInput ficará vazio novamente após o resetForm
    await expect(clienteInput).toHaveValue('');
  });
});
