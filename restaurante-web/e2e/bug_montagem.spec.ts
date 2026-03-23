import { test, expect } from '@playwright/test';

test.describe('Bug Marcação Cruzada Delivery Montagem', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Fazer o Login
        await page.goto('http://localhost:8081');
        await page.fill('input[placeholder="seu@email.com"]', (process.env.PLAYWRIGHT_TEST_EMAIL || ''));
        await page.fill('input[placeholder="••••••••"]', (process.env.PLAYWRIGHT_TEST_PASSWORD || ''));
        await page.click('text=ENTRAR');
        await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 10000 });
    });

    test('Deve criar 3 pedidos delivery iguais e verificar se marcam cruzado', async ({ page }) => {
        // 2. Criar 3 pedidos Delivery iguais
        for (let i = 1; i <= 3; i++) {
            await page.click('text=Pedido Delivery');

            // Wait for the delivery form to be ready
            await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

            // 3. Preencher formulário de delivery
            await page.fill('input[placeholder="Nome do Cliente"]', `Cliente Bug ${i}`);
            await page.fill('input[placeholder="(11) 99999-9999"]', `1199999999${i}`);
            await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua Teste Bug, ${i}`);

            // 4. Buscar e adicionar item. Vamos usar "Caldo"
            await page.fill('input[placeholder="Buscar produtos..."]', 'Caldo');
            // Espere os cards de caldos aparecerem
            await expect(page.locator('.caldoCard').first()).toBeVisible();

            // Clica no botão + do primeiro item de 300ml (Caldinho de Macaxeira...)
            const firstCaldinhoBtn = page.locator('.caldoCard').first().filter({ hasText: '300ml' }).locator('.roundBtn').filter({ hasText: '+' }).first();
            await firstCaldinhoBtn.click();

            // 5. Confirmar Pedido
            await page.click('text=Lançar Pedido Delivery');
            await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
            await page.click('text=OK');

            // Go back to main
            await page.goto('http://localhost:8081');
            await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 10000 });
        }

        // 6. Ir para Montagem
        await page.click('text=Montagem');
        await expect(page.locator('text=Nenhum pedido para montar').or(page.locator('.orderCard'))).toBeVisible({ timeout: 5000 });

        // Localizar as 3 comandas Delivery (e focar nos itens Caldo)
        const deliveryCards = page.locator('text=Delivery').locator('..').locator('..'); // Find the cards themselves
        await expect(deliveryCards).toHaveCount(3);

        // Check initial state
        const firstDeliveryCard = deliveryCards.nth(0);
        const middleDeliveryCard = deliveryCards.nth(1);
        const lastDeliveryCard = deliveryCards.nth(2);

        const firstCardItemCheckbox = firstDeliveryCard.locator('.checkbox');
        const middleCardItemCheckbox = middleDeliveryCard.locator('.checkbox');
        const lastCardItemCheckbox = lastDeliveryCard.locator('.checkbox');

        // Make sure none are checked initially
        const hasUncheckedFirst = await firstCardItemCheckbox.evaluate(el => el.style.backgroundColor !== 'rgb(139, 47, 47)'); // is not our red color
        expect(hasUncheckedFirst).toBeTruthy();

        // Now click the ONE item on the MIDDLE delivery card
        await middleDeliveryCard.locator('.orderItem').first().click();

        // Wait a brief moment for optimistic update to settle
        await page.waitForTimeout(1000);

        // Get the styles to see what actually checked
        const firstStyle = await firstCardItemCheckbox.evaluate(el => el.className);
        const middleStyle = await middleCardItemCheckbox.evaluate(el => el.className);
        const lastStyle = await lastCardItemCheckbox.evaluate(el => el.className);

        console.log('--- ESTADO DOS ITENS APÓS CLIQUE NA COMANDA DO MEIO ---');
        console.log('Primeira Comanda (NÃO CLICADA): ', firstStyle);
        console.log('Comanda do Meio (CLICADA): ', middleStyle);
        console.log('Última Comanda (NÃO CLICADA): ', lastStyle);

        // Expect the clicked one to have checked style, and the OTHERS to NOT have checked style
        expect(middleStyle).toContain('checkboxChecked');
        expect(firstStyle).not.toContain('checkboxChecked');
        expect(lastStyle).not.toContain('checkboxChecked');
    });
});
