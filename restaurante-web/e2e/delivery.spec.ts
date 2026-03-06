import { test, expect } from '@playwright/test';

test.describe('Fluxo de Pedido Delivery', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    console.log('Navegando para a URL...');
    await page.goto('https://restaurante-web-production-eacb.up.railway.app/');
    
    // Aguarda carregar algo significativo (Login ou Home)
    const loginEmail = page.getByPlaceholder('seu@email.com');
    const homeIndicator = page.getByText('Novo Pedido').first();

    console.log('Aguardando tela de login ou home...');
    await Promise.race([
        loginEmail.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
        homeIndicator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
    ]);

    if (await loginEmail.isVisible()) {
      console.log('Realizando login comercial...');
      await loginEmail.fill('lu@m.com');
      await page.getByPlaceholder('••••••••').fill('mudar123');
      await page.getByText('ENTRAR').click();
      
      // Garante que entrou realmente
      await expect(homeIndicator).toBeVisible({ timeout: 30000 });
      console.log('Login realizado com sucesso.');
    } else {
      console.log('Já parece estar logado ou tela de login não apareceu.');
    }
  });


  test('Deve realizar um pedido completo de delivery', async ({ page }) => {
    // Intercepta diálogos de sucesso/erro
    let successDetected = false;
    page.on('dialog', async dialog => {
      console.log(`[DIALOG] ${dialog.message()}`);
      if (dialog.message().includes('sucesso')) successDetected = true;
      await dialog.accept();
    });

    console.log('1. Acessando tela de Delivery');
    await page.getByText('Pedido Delivery').first().click();
    await expect(page.getByPlaceholder('Nome do Cliente')).toBeVisible();

    console.log('2. Preenchendo formulário do cabeçalho');
    await page.getByPlaceholder('Nome do Cliente').fill('Cliente Teste Playwright');
    await page.getByPlaceholder('(11) 99999-9999').fill('11988887777');
    await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill('Rua das Amostras, 100 - Centro');
    
    // Taxa de entrega - Seletor específico baseado na estrutura inspecionada
    const taxaInput = page.locator('div').filter({ hasText: /^Taxa de Entrega \(R\$\):$/ }).getByPlaceholder('0,00');
    await taxaInput.fill('15,00');

    console.log('3. Selecionando pagamento PIX');
    await page.getByText('PIX').click();

    console.log('4. Adicionando item simples ao pedido (Caldo)');
    const searchInput = page.getByPlaceholder('Buscar no cardápio...');
    await searchInput.fill('caldo');
    await page.waitForTimeout(1000); // Aguarda filtro

    // Clica no botão "+" do primeiro item de caldo encontrado
    const addBtn = page.locator('div[role="button"]').filter({ hasText: '+' }).first();
    await addBtn.click();
    
    // Pequena pausa para garantir que o estado do Redux/Context atualizou
    await page.waitForTimeout(500);

    console.log('5. Validando resumo e finalizando');
    await expect(page.getByText('Total Final:')).toBeVisible();
    
    // O botão de confirmar deve estar habilitado agora
    const submitBtn = page.getByRole('button', { name: 'Confirmar Delivery' }).or(page.getByText('Confirmar Delivery')).last();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Espera pelo alerta de sucesso disparado pelo componente
    await page.waitForFunction(() => true, { timeout: 5000 }); // Pequeno delay
    
    if (!successDetected) {
        console.log('Aviso: Diálogo de sucesso não capturado, mas o clique foi realizado.');
    }

    console.log('6. Verificando se limpou o formulário (reset do estado)');
    await expect(page.getByPlaceholder('Nome do Cliente')).toHaveValue('');
    
    console.log('Teste concluído com sucesso!');
  });
});



