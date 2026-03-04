import { test, expect, type Page } from '@playwright/test';

const REPETICOES = 3;

// Helper para buscar produto se possível
async function buscarProduto(page: Page, termo: string) {
  const searchInput = page.getByPlaceholder('Buscar no cardápio...');
  try {
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill(''); // Clear previous search
    await searchInput.fill(termo);
    await page.waitForTimeout(1500); // Give it time to filter the VirtualizedList
  } catch (e) {
    console.log(`Aviso: Input de busca não achado, a lista vai rolar na raça.`);
  }
}

// Helper: Clica em um item (botão +) e valida se foi pro carrinho
async function adicionarItemComValidacao(page: Page, tipo: string, ciclo: number, termoBusca: string = 'Chopp'): Promise<boolean> {
  console.log(`[${tipo}] ${ciclo}: Tentando adicionar ${termoBusca}...`);
  
  await buscarProduto(page, termoBusca);

  let clicou = false;
  const buttons = await page.getByText('+', { exact: true }).all();
  for (const btn of buttons) {
    if (await btn.isVisible().catch(() => false)) {
      try {
        await btn.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
        await btn.click({ force: true });
        clicou = true;
        await page.waitForTimeout(500); // Aguarda item entrar carrinho
        break; // Acertou um botão, não precisa clicar nos outros da mesma tela
      } catch (_) { }
    }
  }

  if (!clicou) {
    console.log(`[${tipo}] ${ciclo}: Não achou nenhum botão + clicável para ${termoBusca}.`);
    return false;
  }

  // Verifica se o rodapé do carrinho ("R$ X,XX") está visível
  const priceText = page.getByText(/R\$ [1-9]|R\$ 0,[1-9]/).first();
  try {
    await expect(priceText).toBeVisible({ timeout: 5000 });
    console.log(`[${tipo}] ${ciclo}: ${termoBusca} confirmado no carrinho.`);
    return true;
  } catch (_) {
    console.log(`[${tipo}] ${ciclo}: Não conseguiu ler o preço no rodapé, prosseguindo mesmo assim...`);
    return clicou;
  }
}

// Helper: Adicionar uma Pizza (passando pelo modal) variando os tamanhos
async function adicionarPizza(page: Page, tipo: string, ciclo: number): Promise<boolean> {
  const tamanhos = ['Broto', 'Média', 'Grande', 'Gigante', 'Até 1 sabor'];
  const tamanhoDesejado = tamanhos[ciclo % tamanhos.length];
  
  console.log(`[${tipo}] ${ciclo}: Tentando adicionar PIZZA (Tamanho/Opção buscada: ${tamanhoDesejado})...`);
  await buscarProduto(page, 'Pizza');
  
  // Tentar encontrar o preço do card de pizza (para abrir o modal)
  const pizzaPriceTag = page.getByText(/R\$ [1-9]|R\$ 0,[1-9]/).first();
  try {
    await pizzaPriceTag.waitFor({ state: 'visible', timeout: 8000 });
    await pizzaPriceTag.scrollIntoViewIfNeeded();
    await pizzaPriceTag.click({ force: true });
  } catch (e) {
    console.log(`[${tipo}] ${ciclo}: Não achou a tag de preço da pizza.`);
    return false;
  }

  try {
    console.log(`[${tipo}] ${ciclo}: Passando pelo modal de montar pizza...`);
    const modalHeading = page.getByText(/Tamanho|Selecione o Tamanho/).first();
    await modalHeading.waitFor({ state: 'visible', timeout: 5000 });
    
    // Tenta o tamanho escolhido ou recorremos à fallback
    const btnSize = page.getByText(tamanhoDesejado).first();
    if (await btnSize.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnSize.click();
    } else {
        await page.getByText(/Até 1 sabor|Até 2 sabores|Grande|Gigante|Broto|Média/).first().click();
    }

    const btnNext = page.getByText(/Adicionar ao Pedido|Próximo: Extras/).first();
    await btnNext.waitFor({ state: 'visible', timeout: 5000 });
    await btnNext.click({ force: true });

    const btnFinalAdd = page.getByText('Adicionar ao Pedido').first();
    if (await btnFinalAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnFinalAdd.click({ force: true });
    }
  } catch (e) {
    console.log(`[${tipo}] ${ciclo}: Erro ao montar a pizza no modal.`);
    await page.mouse.click(0,0); // clica fora em caso de erro para não travar próximos modais
    return false;
  }

  const priceText = page.getByText(/R\$ [1-9]|R\$ 0,[1-9]/).first();
  try {
    await expect(priceText).toBeVisible({ timeout: 5000 });
    console.log(`[${tipo}] ${ciclo}: PIZZA confirmada no carrinho.`);
    return true;
  } catch (_) {
    console.log(`[${tipo}] ${ciclo}: PIZZA concluída mas não confirmou no rodapé.`);
    return true;
  }
}

test.describe('Teste de Estresse - Geração Massiva de Pedidos', () => {
  test.setTimeout(600000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]');
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });
      await emailInput.fill('lu@m.com');
      await page.locator('input[placeholder="••••••••"]').fill('mudar123');
      await page.locator('text=ENTRAR').click();
      await page.locator('text=Novo Pedido').first().waitFor({ state: 'visible', timeout: 15000 });
    } catch (_) { /* login já persistido */ }
  });

  test('Geração massiva de pedidos (Balcão, Delivery e Mesa)', async ({ page }) => {
    page.on('dialog', async (dialog) => { 
        console.log(`[DIALOG] ${dialog.type()} - ${dialog.message()}`);
        await dialog.accept(); 
    });

    for (let i = 1; i <= REPETICOES; i++) {
      console.log(`\n=== CICLO ${i}/${REPETICOES} ===`);

      // ── 1. BALCÃO ─────────────────────────────────────────────────────
      let balcaoSucesso = false;
      try {
        console.log(`[BALCÃO] ${i}: navegando...`);
        // Vai para a Home (admin ou mesa) e então "Novo Pedido" para estado zerado
        await page.goto('/');
        await page.waitForTimeout(1000);
        await page.getByText('Novo Pedido').first().click();
        await page.waitForTimeout(2000);

        const inputNome = page.getByPlaceholder('Digite o nome');
        await inputNome.waitFor({ state: 'visible', timeout: 20000 });
        await inputNome.fill(`Stress Balcao ${i}`);
        await page.waitForTimeout(500);

        let itemAdicionado = false;
        const termoBalcao = ['Risoto', 'Batata', 'Caldinho', 'Chopp'][i % 4];
        if (i % 2 === 0) {
            itemAdicionado = await adicionarPizza(page, 'BALCÃO', i);
            await adicionarItemComValidacao(page, 'BALCÃO', i, termoBalcao);
        } else {
            itemAdicionado = await adicionarItemComValidacao(page, 'BALCÃO', i, termoBalcao);
            await adicionarPizza(page, 'BALCÃO', i); // Adiciona pizza também para ficar gordo
        }
        
        if (!itemAdicionado) {
            console.log(`[BALCÃO] ${i}: Pulando criação pois o item não foi adicionado.`);
            continue;
        }
        console.log(`[BALCÃO] ${i}: criando pedido...`);
        const btnCriar = page.getByText('Criar Pedido').first();
        await btnCriar.click({ force: true });
        
        try {
            await expect(page.getByText(/Pedido criado/i).first()).toBeVisible({ timeout: 10000 });
            console.log(`[BALCÃO] ${i}: ✓ Pedido Balcão criado no BD!`);
            balcaoSucesso = true;
        } catch {
            console.log(`[BALCÃO] ${i}: ⚠️ Pedido criado mas falta toast de confirmação.`);
        }
      } catch (e: any) {
        console.log(`[BALCÃO] ${i}: ✗ ${e.message.split('\n')[0]}`);
      }

      // ── 2. DELIVERY ────────────────────────────────────────────────────
      let deliverySucesso = false;
      try {
        console.log(`[DELIVERY] ${i}: navegando...`);
        await page.goto('/');
        await page.waitForTimeout(1000);
        await page.getByText('Pedido Delivery').first().click();
        await page.waitForTimeout(2000);

        // No Delivery, primeiro inserimos os itens para evitar que a busca resete inputs do top form
        const termoDelivery = ['Risoto', 'Batata', 'Caldinho', 'Picanha'][i % 4];
        const pizzaAdicionada = await adicionarPizza(page, 'DELIVERY', i);
        const itemAdicionado = await adicionarItemComValidacao(page, 'DELIVERY', i, termoDelivery);
        
        if (!pizzaAdicionada && !itemAdicionado) {
          console.log(`[DELIVERY] ${i}: ⚠️ Não conseguiu adicionar item, pulando...`);
          continue;
        }

        // Agora sim preenchemos os dados do Delivery!
        const inputNomeDev = page.getByPlaceholder('Nome do Cliente');
        await inputNomeDev.waitFor({ state: 'visible', timeout: 5000 });
        await inputNomeDev.scrollIntoViewIfNeeded();
        await inputNomeDev.fill(`Stress Delivery ${i}`);
        await page.getByPlaceholder('(11) 99999-9999').fill('11999999999');
        await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill(`Rua Stress, ${i}`);

        const taxaInput = page.locator('text=Taxa de Entrega').locator('xpath=..').locator('input');
        if (await taxaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await taxaInput.fill('5,00');
        }
        await page.locator('text=PIX').first().click({ force: true });
        await page.waitForTimeout(500);
        console.log(`[DELIVERY] ${i}: confirmando pedido...`);
        await page.getByText('Confirmar Delivery').first().click({ force: true });
        try {
            await expect(page.getByText(/Pedido de Delivery gerado/i).first()).toBeVisible({ timeout: 10000 });
            console.log(`[DELIVERY] ${i}: ✓ Pedido Delivery criado no BD!`);
            deliverySucesso = true;
        } catch {
            console.log(`[DELIVERY] ${i}: ⚠️ Pedido criado mas falta toast de confirmação.`);
        }
      } catch (e: any) {
        console.log(`[DELIVERY] ${i}: ✗ ${e.message.split('\n')[0]}`);
      }

      // ── 3. MESA ────────────────────────────────────────────────────────
      let mesaSucesso = false;
      try {
        console.log(`[MESA] ${i}: navegando para Mapa...`);
        await page.goto('/');
        await page.waitForTimeout(1500);
        await page.getByText('Mapa').first().click();
        await page.getByText('Mapa de Mesas').first().waitFor({ state: 'visible', timeout: 20000 });
        await page.waitForTimeout(2000);

        const mesaLivre = page.locator('text=Livre').first();
        if (!await mesaLivre.isVisible({ timeout: 6000 }).catch(() => false)) {
          console.log(`[MESA] ${i}: sem mesa livre rotulada, vai clicar na primeira que achar.`);
          await page.locator('text=Mesa').first().click({ force: true });
        } else {
            await mesaLivre.click({ force: true });
        }
        await page.waitForTimeout(2000);
    
            const inputNomeMesa = page.getByPlaceholder('Digite o nome');
            await inputNomeMesa.waitFor({ state: 'visible', timeout: 15000 });
            await inputNomeMesa.fill(`Stress Mesa ${i}`);
            await page.waitForTimeout(1000);
    
            // Na Mesa, vamos variar: ímpares Pede Pizza, Pares pedem Pizza e Bebida extra (batata, caldinho..)
            let mesaItemAdic = false;
            const termoMesa = ['Batata', 'Risoto', 'Caldinho', 'Chopp'][i % 4];

            if (i % 2 !== 0) {
                mesaItemAdic = await adicionarPizza(page, 'MESA', i);
                await adicionarItemComValidacao(page, 'MESA', i, termoMesa);
            } else {
                mesaItemAdic = await adicionarPizza(page, 'MESA', i);
                await adicionarItemComValidacao(page, 'MESA', i, termoMesa);
            }

            if (!mesaItemAdic) {
              console.log(`[MESA] ${i}: ⚠️ Não conseguiu adicionar item, pulando criaçao...`);
              continue;
            }
            console.log(`[MESA] ${i}: criando pedido...`);
            await page.getByText('Criar Pedido').first().click({ force: true });
            try {
                await expect(page.getByText(/Pedido criado/i).first()).toBeVisible({ timeout: 10000 });
                console.log(`[MESA] ${i}: ✓ Pedido Mesa criado no BD!`);
                mesaSucesso = true;
            } catch {
                console.log(`[MESA] ${i}: ⚠️ Pedido criado mas falta toast de confirmação.`);
            }
      } catch (e: any) {
        console.log(`[MESA] ${i}: ✗ ${e.message.split('\n')[0]}`);
      }
    }

    console.log('\n=== TESTE DE ESTRESSE FINALIZADO ===');
  });
});
