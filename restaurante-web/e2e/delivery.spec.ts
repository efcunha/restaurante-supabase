import { test, expect } from '@playwright/test';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-env';

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
      await loginEmail.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
      await page.getByPlaceholder('••••••••').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
      await page.getByText('ENTRAR', { exact: true }).click();
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
    // Sidebar web usa Pressable com role="button"; mantemos fallback para link.
    console.log('STEP 1: click Pedido Delivery');
    const deliveryNavButton = page.getByRole('button', { name: /Pedido Delivery|Delivery/i }).first();
    const deliveryNavLink = page.getByRole('link', { name: /Pedido Delivery|Delivery/i }).first();

    if (await deliveryNavButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliveryNavButton.click();
    } else {
      await deliveryNavLink.click();
    }

    // 2. Aguarda o formulário carregar
    console.log('STEP 2: wait form');
    await expect(page.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });

    // 3. Preenche os campos obrigatórios
    console.log('STEP 3: fill form fields');
    const uniqueId = Date.now() + Math.round(Math.random() * 1000);
    const clientName = `Delivery PW ${uniqueId}`;
    await page.getByPlaceholder('Nome do Cliente').fill(clientName);
    await page.getByPlaceholder('(11) 99999-9999').fill('65999471346');
    await page.getByPlaceholder('00000-000').fill('58046310');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill('Arina Alves de Melo, 41, Cabo Branco Altiplano');

    // 4. Adiciona pizza e os demais itens padrão
    console.log('STEP 4: search and add common items');
    const searchBox = page.getByPlaceholder(/Buscar no card(a|á)pio\.\.\./ as any);

    // Pizza Grande/Família: 1/2 Calabresa + 1/2 Chocolate com Morango + Bacon
    // Na tela de delivery o elemento de texto interno do card é "hidden" para o Playwright
    // (padrão React Native Web). dispatchEvent('click') contorna as checagens de visibilidade.
    console.log('Adicionando Pizza Grande/Família (1/2 Calabresa, 1/2 Chocolate com Morango) + Bacon...');
    await searchBox.fill('');
    await searchBox.fill('calabresa');
    await page.waitForTimeout(1500);
    const pizzaCard = page
      .locator('[data-testid="pizza-card-calabresa"]')
      .filter({ hasText: /Calabresa/i })
      .filter({ visible: true })
      .first();

    const clickedVisibleCard = await pizzaCard.count();
    if (clickedVisibleCard > 0) {
      await pizzaCard.click();
    } else {
      const fallbackClicked = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('[data-testid="pizza-card-calabresa"]')) as HTMLElement[];
        const visibleNode = nodes.find((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        });
        if (!visibleNode) return false;
        visibleNode.click();
        return true;
      });
      expect(fallbackClicked).toBeTruthy();
    }

    await expect(page.getByText('Escolha o Tamanho').first()).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);
    const sizeGrande = page.getByText('Grande/Família').filter({ visible: true }).first();
    await sizeGrande.waitFor({ state: 'visible', timeout: 8000 });
    await sizeGrande.click();
    await page.waitForTimeout(500);
    const chocMorango = page.getByText('Chocolate com Morango').filter({ visible: true }).last();
    await chocMorango.waitFor({ state: 'visible', timeout: 8000 });
    await chocMorango.click();
    await page.waitForTimeout(500);
    const btnExtras = page.getByText('Próximo: Extras').filter({ visible: true }).last();
    await btnExtras.waitFor({ state: 'visible', timeout: 8000 });
    await btnExtras.click();
    await page.waitForTimeout(500);
    const bacon = page.getByText('Bacon').filter({ visible: true }).last();
    await bacon.waitFor({ state: 'visible', timeout: 8000 });
    await bacon.click();
    await page.waitForTimeout(500);
    const addPizzaBtn = page.getByText('Adicionar ao Pedido').filter({ visible: true }).last();
    await addPizzaBtn.waitFor({ state: 'visible', timeout: 8000 });
    await addPizzaBtn.click();
    console.log('   ✓ Pizza Grande/Família adicionada');
    await page.waitForTimeout(500);

    const itemsToSearch = [
      { term: 'chopp', quantity: 3 },
      { term: 'risoto', quantity: 1 },
      { term: 'caldo', quantity: 3 },
    ];

    const incrementTestIds: Record<string, string> = {
      chopp: 'delivery-inc-chopp-300-ml',
      risoto: 'delivery-inc-risoto-de-camarao-cebolinha-e-coentro',
      caldo: 'delivery-inc-caldo-de-camarao-300ml-cebolinha-e-coentro',
    };

    for (const { term, quantity } of itemsToSearch) {
      for (let i = 0; i < quantity; i++) {
        console.log(`Buscando por: ${term} (${i + 1}/${quantity})`);
        await searchBox.click();
        await searchBox.fill('');
        await searchBox.fill(term);
        await page.waitForTimeout(1000);

        try {
          const incBtn = page
            .locator(`[data-testid="${incrementTestIds[term]}"]`)
            .filter({ visible: true })
            .first();

          await incBtn.waitFor({ state: 'attached', timeout: 8000 });
          await incBtn.dispatchEvent('click');
          console.log(`- Item '${term}' adicionado com sucesso!`);
        } catch (e: any) {
          console.log(`- Erro ao adicionar '${term}': ${e.message}`);
        }

        await page.waitForTimeout(500);
      }
    }

    // 7. Limpa a busca
    console.log('STEP 7: clear search');
    await searchBox.fill('');
    await page.waitForTimeout(500);

    // 8. Verifica que os itens foram adicionados ao carrinho
    console.log('STEP 8: verify items in cart');
    await page.waitForTimeout(1000);

    // Validação forte no carrinho: a pizza configurada precisa existir no resumo do pedido.
    // Em RN Web o nó de texto pode estar "hidden" para o Playwright mesmo estando renderizado.
    const pizzaInCart = page.locator('div[dir="auto"]').filter({ hasText: /Pizza Grande\/Família.*Calabresa.*Chocolate com Morango.*Bacon/i });
    await expect(pizzaInCart).toHaveCount(1, { timeout: 10000 });

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
    // Verifica a toast ou dialog de sucesso: em React Native Web o Alert.alert vira um dialog, ou se mudar para Toast:
    // "page.on('dialog')" dismissed it, BUT let's assert the expected result.
    // wait for form reset or visual clue (the UI clears the client name)
    const clientNameInput = page.getByPlaceholder('Nome do Cliente');
    await expect(clientNameInput).toHaveValue('', { timeout: 15000 });

    // 11. Validação no banco: garante que a pizza e os itens obrigatórios foram persistidos
    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const accessToken = authDataRaw ? JSON.parse(authDataRaw).access_token : '';

    if (!accessToken) {
      throw new Error('Não foi possível obter access token para validar pedido no banco.');
    }

    const ordersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?client_name=eq.${encodeURIComponent(clientName)}&status=neq.cancelled&status=neq.cancelada&select=id,client_name,items_with_status,items,created_at&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    expect(ordersRes.ok).toBeTruthy();
    const createdOrders = await ordersRes.json();
    expect(Array.isArray(createdOrders)).toBeTruthy();
    expect(createdOrders.length).toBe(1);

    const createdOrder = createdOrders[0];
    const itemNames: string[] = Array.isArray(createdOrder.items_with_status)
      ? createdOrder.items_with_status.map((it: any) => String(it?.name || ''))
      : Array.isArray(createdOrder.items)
        ? createdOrder.items.map((it: any) => String(it || ''))
        : [];

    const normalized = itemNames.join(' | ');
    console.log(`[DELIVERY][DB] Itens persistidos: ${normalized}`);
    expect(/Pizza Grande\/Família.*Calabresa.*Chocolate com Morango.*Bacon/i.test(normalized)).toBeTruthy();

    const choppCount = itemNames.filter(name => /Chopp\s*300\s*ML/i.test(name)).length;
    const risotoCount = itemNames.filter(name => /Risoto/i.test(name)).length;
    const caldoCount = itemNames.filter(name => /Caldo de Camarão\s*300ml/i.test(name)).length;

    expect(choppCount).toBe(3);
    expect(risotoCount).toBe(1);
    expect(caldoCount).toBe(3);

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
