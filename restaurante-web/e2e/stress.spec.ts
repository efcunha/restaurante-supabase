import { test, expect } from '@playwright/test';

test.describe('Teste de Estresse - Geração Massiva de Pedidos', () => {
  test.setTimeout(600000); // 10 minutes for stress test

  test.beforeEach(async ({ page }) => {
    console.log('Navegando para o App / Login');
    await page.goto('/');

    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });
      await emailInput.fill('lu@m.com');
      await page.locator('input[placeholder="••••••••"]').fill('mudar123');
      await page.locator('text=ENTRAR').click();
      await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Login já persistido ou erro no login. Tentando prosseguir.');
    }
  });

  const REPETICOES = 10; // Total de 10 ciclos de cada tipo = 30 pedidos

  test('Geração massiva de pedidos (Balcão, Delivery e Mesa)', async ({ page }) => {
    page.on('dialog', async dialog => {
      console.log(`[DIALOG] ${dialog.message()}`);
      await dialog.accept();
    });

    for (let i = 1; i <= REPETICOES; i++) {
      console.log(`\n=== INICIANDO CICLO ${i}/${REPETICOES} ===\n`);

      try {
        // 1. PEDIDO BALCÃO (Novo Pedido)
        console.log(`[BALCÃO] Ciclo ${i}: Abrindo tela...`);
        const tabBalcao = page.getByText('Novo Pedido').first();
        await tabBalcao.click();
        await page.waitForTimeout(1000);
        
        console.log(`[BALCÃO] Ciclo ${i}: Aguardando input nome...`);
        const inputNomeBalcao = page.getByPlaceholder('Digite o nome');
        await inputNomeBalcao.waitFor({ state: 'visible', timeout: 15000 });
        await inputNomeBalcao.fill(`Stress Balcao ${i}`);
        
        console.log(`[BALCÃO] Ciclo ${i}: Aguardando produtos...`);
        const btnAddBase = page.getByText('+', { exact: true });
        await btnAddBase.first().waitFor({ state: 'attached', timeout: 20000 });

        for (let j = 0; j < 3; j++) {
          try {
            console.log(`[BALCÃO] Ciclo ${i}: Clicando no item ${j}...`);
            const btnAdd = btnAddBase.nth(j);
            await btnAdd.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
            await btnAdd.click({ force: true });
            await page.waitForTimeout(500);
          } catch (e: any) {
            console.log(`[BALCÃO] Erro ao clicar no item ${j}: ${e.message}`);
          }
        }

        console.log(`[BALCÃO] Ciclo ${i}: Criando pedido...`);
        const btnCriar = page.getByText('Criar Pedido').first();
        await btnCriar.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await btnCriar.click({ force: true });
        await page.waitForTimeout(1500);
      } catch (e: any) {
        console.log(`[BALCÃO] Falha no ciclo ${i}: ${e.message}`);
      }

      try {
        // 2. PEDIDO DELIVERY
        console.log(`[DELIVERY] Ciclo ${i}: Abrindo tela...`);
        const tabDelivery = page.getByText('Pedido Delivery').first();
        await tabDelivery.click();
        await page.waitForTimeout(1000);

        console.log(`[DELIVERY] Ciclo ${i}: Aguardando input nome...`);
        const inputNomeDelivery = page.getByPlaceholder('Nome do Cliente');
        await inputNomeDelivery.waitFor({ state: 'visible', timeout: 15000 });
        
        await inputNomeDelivery.fill(`Stress Delivery ${i}`);
        await page.getByPlaceholder('(11) 99999-9999').fill('11999999999');
        await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill(`Rua Heavy Load, ${i}`);
        
        // Seletor de taxa mais robusto baseado no delivery.spec.ts
        const inputTaxa = page.locator('text=Taxa de Entrega').locator('xpath=..').locator('input');
        if (await inputTaxa.isVisible()) {
          await inputTaxa.fill('5,00');
        }

        await page.locator('text=PIX').first().click({ force: true });

        console.log(`[DELIVERY] Ciclo ${i}: Adicionando item...`);
        const btnAddDelivery = page.getByText('+', { exact: true }).first();
        await btnAddDelivery.waitFor({ state: 'attached', timeout: 20000 });
        await btnAddDelivery.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await btnAddDelivery.click({ force: true });
        
        console.log(`[DELIVERY] Ciclo ${i}: Confirmando...`);
        const btnConfirmDelivery = page.getByText('Confirmar Delivery').first();
        await btnConfirmDelivery.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await btnConfirmDelivery.click({ force: true });
        await page.waitForTimeout(1500);
      } catch (e: any) {
        console.log(`[DELIVERY] Falha no ciclo ${i}: ${e.message}`);
      }

      try {
        // 3. PEDIDO MESA
        console.log(`[MESA] Ciclo ${i}: Abrindo Mapa...`);
        const tabMapa = page.getByText('Mapa').first();
        await tabMapa.click();
        await page.waitForTimeout(5000); 
        
        console.log(`[MESA] Ciclo ${i}: Procurando mesa livre...`);
        const freeTableIndicator = page.locator('text=lug.').first();
        if (await freeTableIndicator.isVisible({ timeout: 10000 })) {
          console.log(`[MESA] Ciclo ${i}: Selecionando mesa...`);
          await freeTableIndicator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
          await freeTableIndicator.click({ force: true });
          await page.waitForTimeout(2000);

          const inputNomeMesa = page.getByPlaceholder('Digite o nome');
          await inputNomeMesa.waitFor({ state: 'visible', timeout: 15000 });
          await inputNomeMesa.fill(`Stress Mesa ${i}`);
          
          console.log(`[MESA] Ciclo ${i}: Adicionando item...`);
          const btnAddMesa = page.getByText('+', { exact: true }).first();
          await btnAddMesa.waitFor({ state: 'attached', timeout: 20000 });
          await btnAddMesa.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
          await btnAddMesa.click({ force: true });

          console.log(`[MESA] Ciclo ${i}: Criando pedido...`);
          const btnCriarMesa = page.getByText('Criar Pedido').first();
          await btnCriarMesa.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
          await btnCriarMesa.click({ force: true });
          await page.waitForTimeout(2000);
        } else {
          console.log(`[MESA] Ciclo ${i}: Nenhuma mesa livre no momento.`);
        }
      } catch (e: any) {
        console.log(`[MESA] Falha no ciclo ${i}: ${e.message}`);
      }
    }
    
    console.log('\n=== TESTE DE ESTRESSE FINALIZADO ===\n');
  });
});
