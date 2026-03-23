import { test, expect } from '@playwright/test';

test.describe('Stress Test - Fluxos Combinados', () => {
    test.setTimeout(300000); // 5 minutos por teste

    test.beforeEach(async ({ page }) => {
        await page.waitForTimeout(Math.random() * 5000);
        await page.goto('/');

        try {
            const loginEmail = page.getByPlaceholder('seu@email.com');
            const loginPass = page.getByPlaceholder('••••••••');
            const loginBtn = page.getByText('ENTRAR').first();

            await loginEmail.waitFor({ state: 'visible', timeout: 5000 });
            await loginEmail.fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
            await loginPass.fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
            await loginBtn.click();
            await page.waitForLoadState('networkidle');
        } catch (e) {
            // Sessão ativa
        }
    });

    test('Stress - Balcão', async ({ page }) => {
        const uniqueId = Date.now() + Math.round(Math.random() * 1000);
        const name = `Stress Balcao ${uniqueId}`;
        console.log(`[Balcao] Starting: ${name}`);

        await page.getByText('Novo Pedido').first().click();
        await page.getByPlaceholder('Digite o nome').fill(name);

        const searchInput = page.getByPlaceholder('Buscar item do cardápio...');
        await searchInput.fill('chopp');
        await page.waitForTimeout(1500);
        await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();

        await page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last().click();
        await expect(page.getByText(/pedido criado|sucesso/i).first()).toBeVisible({ timeout: 20000 });
        console.log(`✓ [Balcao] Finished: ${name}`);
    });

    test('Stress - Mesa', async ({ page }) => {
        const uniqueId = Date.now() + Math.round(Math.random() * 1000);
        const name = `Stress Mesa ${uniqueId}`;
        console.log(`[Mesa] Starting: ${name}`);

        await page.getByText('Mapa').first().click();
        await page.waitForTimeout(3000);

        // Selecionar uma mesa aleatória disponível
        const availableMesas = page.locator('div[dir="auto"]').filter({ hasText: /lug./i });
        const count = await availableMesas.count();
        if (count > 0) {
            const index = Math.floor(Math.random() * count);
            await availableMesas.nth(index).click();
        } else {
            // Se não houver livre, tenta pegar a primeira disponível de qualquer forma (ou falha)
            await page.locator('div[dir="auto"]').filter({ hasText: /mesa/i }).first().click();
        }
        await page.waitForTimeout(1500);

        await page.getByPlaceholder('Digite o nome').fill(name);

        await page.getByPlaceholder('Buscar item do cardápio...').fill('chopp');
        await page.waitForTimeout(1500);
        await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();

        await page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last().click();
        await expect(page.getByText(/pedido criado|sucesso/i).first()).toBeVisible({ timeout: 20000 });
        console.log(`✓ [Mesa] Finished: ${name}`);
    });

    test('Stress - Pizza', async ({ page }) => {
        const uniqueId = Date.now() + Math.round(Math.random() * 1000);
        const name = `Stress Pizza ${uniqueId}`;
        console.log(`[Pizza] Starting: ${name}`);

        await page.getByText('Novo Pedido').first().click();
        await page.getByPlaceholder('Digite o nome').fill(name);

        await page.getByPlaceholder('Buscar item do cardápio...').fill('Calabresa');
        await page.waitForTimeout(2000);

        // Clica no card da Calabresa
        await page.locator('div[dir="auto"]').filter({ hasText: /^Calabresa$/ }).first().click({ force: true });
        await page.waitForTimeout(2000);

        // Modal Pizza
        await page.getByText('Grande/Família').first().click();
        await page.getByText('Confirmar Escolha').first().click();

        await page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last().click();
        await expect(page.getByText(/pedido criado|sucesso/i).first()).toBeVisible({ timeout: 20000 });
        console.log(`✓ [Pizza] Finished: ${name}`);
    });

    test('Stress - Delivery', async ({ page }) => {
        const uniqueId = Date.now() + Math.round(Math.random() * 1000);
        const name = `Stress Delivery ${uniqueId}`;
        console.log(`[Delivery] Starting: ${name}`);

        await page.getByText('Pedido Delivery').first().click();
        await page.waitForTimeout(3000);

        await page.getByPlaceholder('Nome do Cliente').fill(name);
        await page.getByPlaceholder(/Telefone/i).first().fill('1199999999');
        await page.getByPlaceholder(/Endereço/i).first().fill('Rua Stress, 123');

        await page.getByPlaceholder('Buscar no cardápio...').fill('chopp');
        await page.waitForTimeout(2000);

        // No Delivery, o '+' está dentro do item. Vamos tentar o primeiro '+' visível.
        const plusBtn = page.locator('div[dir="auto"]').filter({ hasText: '+' }).first();
        await plusBtn.click({ force: true });

        // Verifica se o total mudou de 0.00
        await expect(page.locator('div[dir="auto"]').filter({ hasText: /Total/i }).last()).not.toHaveText(/R\$ 0.00/);

        await page.locator('div[dir="auto"]').filter({ hasText: 'Confirmar Pedido' }).last().click();
        await expect(page.getByText(/pedido criado|sucesso/i).first()).toBeVisible({ timeout: 20000 });
        console.log(`✓ [Delivery] Finished: ${name}`);
    });
});
