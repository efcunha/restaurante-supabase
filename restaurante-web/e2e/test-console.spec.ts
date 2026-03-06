import { test } from '@playwright/test';

test('Verificar erros no console ao criar pedido', async ({ page }) => {
  test.setTimeout(120000);
  
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ ERRO NO CONSOLE:', msg.text());
    }
  });

  await page.goto('https://restaurante-web-production-eacb.up.railway.app/');
  await page.getByPlaceholder('seu@email.com').fill('lu@m.com');
  await page.getByPlaceholder('••••••••').fill('mudar123');
  await page.getByText('ENTRAR').first().click();
  
  await page.waitForTimeout(3000);
  
  await page.getByPlaceholder('Digite o nome').fill('TESTE');
  await page.getByPlaceholder('Nº').fill('99');
  
  // Adicionar um item simples
  const calabresaCard = page.locator('div[dir="auto"]').filter({ hasText: /^Calabresa$/ }).first();
  await calabresaCard.click();
  
  await page.getByText('Grande/Família').first().click();
  await page.getByText('Adicionar ao Pedido').last().click();
  
  await page.waitForTimeout(1000);
  
  const btnCriar = page.locator('div[dir="auto"]').filter({ hasText: /^Criar Pedido$/ }).last();
  await btnCriar.click();
  
  await page.waitForTimeout(5000);
  
  console.log('\n📊 RESUMO:');
  console.log(`Total de erros capturados: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    consoleErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.substring(0, 200)}`);
    });
  } else {
    console.log('✅ Nenhum erro no console!');
  }
});
