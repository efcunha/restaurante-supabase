import { test, expect } from '@playwright/test';

test('Pedido de Pizza - Estável Final', async ({ page }) => {
  test.setTimeout(180000); // Aumentado para 3 minutos

  // 1. Login
  console.log('Realizando login...');
  await page.goto('https://restaurante-web-production-eacb.up.railway.app/');
  await page.getByPlaceholder('seu@email.com').fill('lu@m.com');
  await page.getByPlaceholder('••••••••').fill('mudar123');
  await page.getByText('ENTRAR').first().click();

  // 2. Dash e Identificação
  console.log('Aguardando Home...');
  await expect(page.getByText('Novo Pedido').first()).toBeVisible({ timeout: 20000 });
  
  console.log('Preenchendo identificação (Mesa 10)...');
  await page.getByPlaceholder('Digite o nome').fill('PEDIDO PLAYWRIGHT');
  await page.getByPlaceholder('Nº').fill('10');

  // 3. Seleção da Pizza (Principal)
  console.log('Selecionando Calabresa no cardápio...');
  await page.locator('div').filter({ hasText: /^Calabresa/ }).nth(1).click();
  
  // 4. Seleção de Tamanho
  console.log('Selecionando tamanho Grande/Família...');
  const sizeOption = page.getByText('Grande/Família').first();
  await sizeOption.waitFor({ state: 'visible' });
  await sizeOption.click();

  // 5. Seleção de Sabores
  // Segundo o subagent, o seletor mais seguro para o sabor na lista é o que contém o preço
  console.log('Selecionando sabor Chocolate com Morango...');
  // Aguarda a lista de sabores carregar
  const flavorOption = page.locator('div').filter({ hasText: /^Chocolate com Morango/ }).first();
  await flavorOption.waitFor({ state: 'visible' });
  await flavorOption.click();

  // 6. Avançar para Extras
  console.log('Avançando para Extras...');
  const btnExtras = page.getByText('Próximo: Extras');
  await btnExtras.waitFor({ state: 'visible' });
  await btnExtras.click();
  
  // 7. Selecionar Adicional (Bacon)
  console.log('Adicionando Bacon...');
  const addBacon = page.getByText('Bacon').first();
  await addBacon.waitFor({ state: 'visible' });
  await addBacon.click();

  // 8. Adicionar ao Pedido (Carrinho)
  console.log('Adicionando ao carrinho...');
  await page.getByText('Adicionar ao Pedido').click();

  // Pausa para processamento do modal e garantir que o botão de Criar Pedido esteja clicável
  await page.waitForTimeout(2000);

  // 9. Criar Pedido Final
  console.log('Finalizando Pedido...');
  // O botão de "Criar Pedido" fica no rodapé da página principal
  const btnCriar = page.getByText('Criar Pedido').last();
  await btnCriar.waitFor({ state: 'visible' });
  await btnCriar.click();

  // Validação visual final
  await page.waitForTimeout(4000);
  console.log('Pedido enviado com sucesso! Verifique a Mesa 10 na Cozinha/Montagem.');
});
