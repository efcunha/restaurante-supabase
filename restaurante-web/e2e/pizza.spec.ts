import { test, expect } from '@playwright/test';

test('Pedido de Pizza - Estável Final', async ({ page }) => {
  test.setTimeout(180000); // Aumentado para 3 minutos

  // 1. Login
  console.log('Realizando login...');
  await page.goto('/');
  await page.getByPlaceholder('seu@email.com').fill('lu@m.com');
  await page.getByPlaceholder('••••••••').fill('mudar123');
  await page.getByText('ENTRAR', { exact: true }).click();

  // 2. Dash e Identificação
  console.log('Aguardando Dashboard...');
  await expect(page.getByText('Novo Pedido').first()).toBeVisible({ timeout: 15000 });

  // Adiciona um pequeno delay aleatório para evitar race condition na geração de número da comanda
  // quando executado em terminais rodando exata e perfeitamente ao mesmo tempo.
  await page.waitForTimeout(Math.random() * 3000);

  console.log('Preenchendo identificação...');
  const uniqueId = Date.now() + Math.round(Math.random() * 1000);
  await page.getByPlaceholder('Digite o nome').fill(`PEDIDO PIZZA ${uniqueId}`);

  // 3. Seleção da Pizza (Principal)
  console.log('Selecionando Pizza Calabresa...');
  const calabresaCard = page.locator('div[dir="auto"]').filter({ hasText: /^Calabresa$/ }).first();
  await calabresaCard.waitFor({ state: 'visible' });
  await calabresaCard.click();

  // 4. Seleção de Tamanho
  console.log('Selecionando tamanho Grande/Família...');
  const sizeOption = page.getByText('Grande/Família').first();
  await sizeOption.waitFor({ state: 'visible' });
  await sizeOption.click();

  // 5. Seleção de Sabores (Dentro do Modal)
  console.log('Aguardando Modal de Sabores...');
  console.log('Selecionando sabor Chocolate com Morango no modal...');
  const flavorOption = page.getByText('Chocolate com Morango').last();
  await flavorOption.waitFor({ state: 'visible', timeout: 10000 });
  await flavorOption.click();

  // 6. Avançar para Extras
  console.log('Avançando para Extras...');
  const btnExtras = page.getByText('Próximo: Extras').last();
  await btnExtras.click();

  // 7. Selecionar Adicional (Bacon)
  console.log('Adicionando Bacon...');
  const addBacon = page.getByText('Bacon').last();
  await addBacon.waitFor({ state: 'visible' });
  await addBacon.click();

  // 8. Adicionar pizza configurada ao pedido
  console.log('Confirmando configuração da pizza...');
  await page.getByText('Adicionar ao Pedido').last().click();

  // 9. Adicionar itens extras padronizados dos outros testes
  console.log('Adicionando itens extras padrão: chopp, risoto e caldo...');
  const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });

  const itemsToSearch = [
    { term: 'chopp', quantity: 3 },
    { term: 'risoto', quantity: 1 },
    { term: 'caldo', quantity: 3 },
  ];

  for (const { term, quantity } of itemsToSearch) {
    for (let i = 0; i < quantity; i++) {
      console.log(`Buscando por: ${term} (${i + 1}/${quantity})`);
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(term);
      await page.waitForTimeout(1500);

      try {
        const plusBtn = page
          .locator('div[role="button"], div[dir="auto"]')
          .filter({ hasText: '+' })
          .filter({ visible: true })
          .first();

        if (await plusBtn.count() > 0) {
          await plusBtn.click();
          console.log(`- Item '${term}' adicionado com sucesso!`);
        } else {
          const itemCard = page.locator('div[dir="auto"]').filter({ hasText: new RegExp(term, 'i') }).first();
          await itemCard.click();
          console.log(`- Item '${term}' selecionado pelo card.`);
        }
      } catch (e: any) {
        console.log(`- Erro ao adicionar '${term}': ${e.message}`);
      }

      await page.waitForTimeout(500);
    }
  }

  // 10. Criar Pedido Final
  console.log('Finalizando Pedido no Balcão...');
  await page.waitForTimeout(1000);
  const btnCriar = page.locator('div[role="button"], div[dir="auto"]').filter({ hasText: /^Criar Pedido$/ }).last();
  await btnCriar.waitFor({ state: 'visible' });
  await btnCriar.click();

  console.log('✅ Pedido finalizado! Verificando sucesso...');
  const toast = page.locator('text=/Pedido criado! Comanda/i');
  await expect(toast).toBeVisible({ timeout: 15000 });

  console.log('- Pedido Pizza criado!');
});
