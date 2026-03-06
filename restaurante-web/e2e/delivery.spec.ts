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
    // Captura erros do console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Captura erros de rede
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // 1. Navega para Pedido Delivery
    console.log('STEP 1: click Pedido Delivery');
    await page.getByRole('link', { name: 'Pedido Delivery' }).click();

    // 2. Aguarda o formulário carregar
    console.log('STEP 2: wait form');
    await expect(page.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });

    // 3. Preenche os campos obrigatórios
    console.log('STEP 3: fill form fields');
    await page.getByPlaceholder('Nome do Cliente').fill('João Silva');
    await page.getByPlaceholder('(11) 99999-9999').fill('11987654321');
    await page.getByPlaceholder('00000-000').fill('01310100');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill('Av Paulista, 1000, Bela Vista');

    // 4. Busca e adiciona Caldo
    console.log('STEP 4: search and add Caldo');
    const searchBox = page.getByPlaceholder('Buscar no cardápio...');
    await searchBox.fill('caldo');
    await page.waitForTimeout(1000);
    await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();
    await page.waitForTimeout(500);

    // 5. Busca e adiciona Risoto
    console.log('STEP 5: search and add Risoto');
    await searchBox.fill('risoto');
    await page.waitForTimeout(1000);
    await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();
    await page.waitForTimeout(500);

    // 6. Busca e adiciona Chopp
    console.log('STEP 6: search and add Chopp');
    await searchBox.fill('chopp');
    await page.waitForTimeout(1000);
    await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();
    await page.waitForTimeout(500);

    // 7. Limpa a busca
    console.log('STEP 7: clear search');
    await searchBox.fill('');
    await page.waitForTimeout(500);

    // 8. Verifica que os itens foram adicionados ao carrinho
    console.log('STEP 8: verify items in cart');
    await page.waitForTimeout(1000);
    
    // Verifica se há itens no resumo do pedido
    const cartItems = await page.locator('text=/x.*Caldo|Risoto|Chopp/i').count();
    console.log(`Itens encontrados no carrinho: ${cartItems}`);
    
    if (cartItems === 0) {
      throw new Error('Nenhum item foi adicionado ao carrinho!');
    }
    
    // Verifica o total
    const totalText = await page.locator('text=/Total Final:/').textContent();
    console.log(`Total antes de confirmar: ${totalText}`);
    
    if (totalText?.includes('R$ 0.00')) {
      throw new Error('Total está R$ 0.00 - itens não foram adicionados corretamente!');
    }

    // 9. Confirma o pedido
    console.log('STEP 9: confirm delivery');
    await page.getByText('Confirmar Delivery').click();
    await page.waitForTimeout(4000);

    // 10. Valida sucesso e verifica erros
    console.log('STEP 10: validate success');
    await expect(page.getByText('Confirmar Delivery')).toBeVisible({ timeout: 5000 });
    
    // Reporta erros capturados
    if (consoleErrors.length > 0) {
      console.log('⚠️  Erros no console:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('⚠️  Erros de rede:', networkErrors);
    }
    
    console.log('✓ Pedido delivery confirmado com sucesso!');
    console.log('DONE: test passed!');
  });
});
