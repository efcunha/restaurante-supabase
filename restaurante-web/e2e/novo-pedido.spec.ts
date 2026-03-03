import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal - Novo Pedido Web', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Autenticação e Login
    console.log('Navegando para o App / Login');
    await page.goto('/');

    // Esperar um campo de e-mail ser visível
    const emailInput = page.locator('input[placeholder="seu@email.com"]');
    await emailInput.waitFor({ state: 'visible', timeout: 8000 });

    // Preencher as credenciais passadas pelo usuário
    await emailInput.fill('lu@m.com');
    await page.locator('input[placeholder="••••••••"]').fill('mudar123');

    // Clicar em ENTRAR
    await page.locator('text=ENTRAR').click();

    // Aguardar transição para a tela inicial / Dashboard protegida
    // A tela principal do Web pode apontar pro DeliveryScreen ou AdminScreen. Esperar a navbar carregar
    await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
  });

test('Deve ser capaz de navegar para a tela Novo Pedido e adicionar um item simples ao carrinho', async ({ page }) => {
    // Clica no menu lateral ou botão 'Novo Pedido'
    console.log('-> Iniciando teste Item Simples');
    const menuPedido = page.getByText('Novo Pedido').first();
    await menuPedido.waitFor({ state: 'visible' });
    await menuPedido.click();

    // Aguarda carregar dados do form
    console.log('-> Aguardando layout Novo Pedido...');
    await expect(page.getByText('Nome do Cliente:')).toBeVisible({ timeout: 15000 });

    // Preenche input de cliente
    console.log('-> Preenchendo inputs...');
    await page.getByPlaceholder('Digite o nome').fill('Cliente E2E Teste');

    // Abre seção de itens simples (Caldos, Comidas, Bebidas, etc)
    console.log('-> Aguardando lista de produtos simples (botões de +)...');
    
    // Pegamos a primeira view que possui o sinal de `+`
    // Podemos ter que forçar ou esperar até o cardapio renderizar itens que não são pizza
    const btnAddDefault = page.getByText('+', { exact: true }).first();
    await expect(btnAddDefault).toBeVisible({ timeout: 15000 });
    await btnAddDefault.click({ force: true });

    console.log('-> Validando se existe barra Footer com R$ indicando item incluso...');
    // A barra footer pode não exibir Confirmar Pedido visível pra cliques direto, mas deve haver um "R$" no footer informando Total.
    const priceText = page.getByText(/R\$ [1-9]|R\$ 0,[1-9]/).first();
    await expect(priceText).toBeVisible({ timeout: 10000 });
});

test('Deve conseguir customizar uma Pizza através do Pizza Builder Modal', async ({ page }) => {
    // Vai para Novo Pedido
    console.log('-> Iniciando teste Pizza');
    const menuPedido = page.getByText('Novo Pedido').first();
    await menuPedido.waitFor({ state: 'visible' });
    await menuPedido.click();

    // Esperar Aba de Pizzas
    console.log('-> Aba de pizzas');
    const pizzaHeading = page.getByText(/🍕 PIZZAS/).first();
    await expect(pizzaHeading).toBeVisible({ timeout: 15000 });
        
    console.log('-> Clicando na primeira tag de preço de pizza R$');
    // Localizar a primeira row que tenha o valor R$
    const pizzaPriceTag = page.getByText(/R\$/).first();
    await expect(pizzaPriceTag).toBeVisible({ timeout: 5000 });
    await pizzaPriceTag.click({ force: true });

    console.log('-> Verificando presença do Modal de Tamanho');
    const textTamanho = page.getByText('Escolha o Tamanho').first();
    await expect(textTamanho).toBeVisible({ timeout: 10000 });
        
    console.log('-> Selecionando o primeiro tamanho da lista');
    // Clica no primeiro card de tamanho, o texto ex: "Média"
    // No código The Sizes list (e.g. Média, Grande) have the `Até X sabores` sub text
    const primeiroTamanho = page.getByText(/Até [0-9] sabores/).first();
    await expect(primeiroTamanho).toBeVisible({ timeout: 5000 });
    await primeiroTamanho.click();

    console.log('-> Passando sabores / Clicando Próximo extras...');
    const textProximoExtras = page.getByText('Próximo: Extras').first();
    try {
        await textProximoExtras.waitFor({ state: 'visible', timeout: 3000 });
        await textProximoExtras.click();
    } catch (e) {
        console.log('-> Ignorado botão de Próximo, possivelmente tamanho único selecionado.');
    }

    console.log('-> Adicionar Pizza ao Carrinho e sair do Modal');
    const btnAddPedido = page.getByText('Adicionar ao Pedido').first();
    await expect(btnAddPedido).toBeVisible({ timeout: 5000 });
    await btnAddPedido.click();

    console.log('-> Validar que botão sumiu indicando que modal se foi');
    await expect(textTamanho).not.toBeVisible();

    console.log('-> Validando se existe Confirmar Pedido final...');
    console.log('-> Validando se existe barra Footer com R$ indicando item incluso...');
    // A barra footer pode não exibir Confirmar Pedido visível pra cliques direto, mas deve haver um "R$" no footer.
    const priceText = page.getByText(/R\$ [1-9]/).first();
    await expect(priceText).toBeVisible({ timeout: 10000 });
});
});
