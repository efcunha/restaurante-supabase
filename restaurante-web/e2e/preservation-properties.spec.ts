import { test, expect } from '@playwright/test';

/**
 * Preservation Property Tests - Non-delivery order marking behavior
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These tests verify that existing functionality continues to work correctly
 * after fixing the cross-marking bug. They test non-buggy scenarios that should
 * remain unchanged.
 * 
 * IMPORTANT: These tests are EXPECTED TO PASS on unfixed code - they capture
 * baseline behavior that must be preserved.
 */

test.describe('Preservation Properties - Non-buggy Order Marking', () => {
    test.beforeEach(async ({ page }) => {
        // Login to the system
        await page.goto('http://localhost:8081');
        
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

    /**
     * Property 1: Mesa orders - marking items works correctly
     * **Validates: Requirement 3.1**
     * 
     * Test Strategy:
     * 1. Create multiple mesa orders with items
     * 2. Mark an item in a specific mesa order
     * 3. Verify only that mesa order's item is marked
     */
    test('Property: Mesa order marking works correctly', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Mesa order marking ===');

        // Step 1: Create 2 mesa orders with items
        for (let i = 0; i < 2; i++) {
            await page.goto('http://localhost:8081');
            await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
            
            // Navigate to Mapa (table map)
            await page.click('text=Mapa');
            await page.waitForTimeout(1000);

            // Click on a table to create order
            const tableNumber = i + 1;
            const tableBtn = page.locator(`text=Mesa ${tableNumber}`).first();
            await tableBtn.click();
            await page.waitForTimeout(500);

            // Add item to order
            await page.fill('input[placeholder="Buscar produtos..."]', 'Caldo');
            await page.waitForTimeout(1000);
            
            const firstItemBtn = page.locator('.caldoCard').first()
                .filter({ hasText: '300ml' })
                .locator('.roundBtn')
                .filter({ hasText: '+' })
                .first();
            await firstItemBtn.click();

            // Confirm order
            await page.click('text=Lançar Pedido');
            await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
            await page.click('text=OK');
        }

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Find mesa cards
        const mesaCards = page.locator('.orderCard').filter({ hasText: 'Mesa' });
        const mesaCount = await mesaCards.count();
        expect(mesaCount).toBeGreaterThanOrEqual(2);

        // Get last 2 mesa cards
        const recentMesaCards = [
            mesaCards.nth(mesaCount - 2),
            mesaCards.nth(mesaCount - 1)
        ];

        // Step 4: Verify items start unchecked
        for (let i = 0; i < 2; i++) {
            const checkbox = recentMesaCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            expect(isChecked).toBe(false);
        }

        // Step 5: Click item in first mesa order
        const targetCard = recentMesaCards[0];
        const targetItem = targetCard.locator('.orderItem').first();
        
        console.log('Clicking item in first mesa order');
        await targetItem.click();
        await page.waitForTimeout(1500);

        // Step 6: PROPERTY ASSERTION - Only first mesa should be marked
        const checkStates = [];
        for (let i = 0; i < 2; i++) {
            const checkbox = recentMesaCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            checkStates[i] = isChecked;
            console.log(`Mesa order ${i} checked: ${isChecked}`);
        }

        expect(checkStates[0]).toBe(true);  // First mesa should be marked
        expect(checkStates[1]).toBe(false); // Second mesa should NOT be marked

        console.log('✓ Mesa order marking property verified');
    });

    /**
     * Property 2: Comanda orders - marking items works correctly
     * **Validates: Requirement 3.2**
     * 
     * Test Strategy:
     * 1. Create multiple comanda orders (comanda_number != 0)
     * 2. Mark an item in a specific comanda order
     * 3. Verify only that comanda order's item is marked
     */
    test('Property: Comanda order marking works correctly', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Comanda order marking ===');

        // Step 1: Create 2 comanda orders with items
        for (let i = 0; i < 2; i++) {
            await page.goto('http://localhost:8081');
            await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
            
            // Navigate to Balcão (counter)
            await page.click('text=Balcão');
            await page.waitForTimeout(1000);

            // Create comanda order
            const comandaNumber = `${Date.now()}${i}`.slice(-6);
            await page.fill('input[placeholder="Número da Comanda"]', comandaNumber);

            // Add item to order
            await page.fill('input[placeholder="Buscar produtos..."]', 'Caldo');
            await page.waitForTimeout(1000);
            
            const firstItemBtn = page.locator('.caldoCard').first()
                .filter({ hasText: '300ml' })
                .locator('.roundBtn')
                .filter({ hasText: '+' })
                .first();
            await firstItemBtn.click();

            // Confirm order
            await page.click('text=Lançar Pedido Balcão');
            await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
            await page.click('text=OK');
        }

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Find comanda cards (not mesa, not delivery)
        const allCards = page.locator('.orderCard');
        const cardCount = await allCards.count();
        
        // Find last 2 comanda cards (cards that have "Comanda" but not "Mesa" or "Delivery")
        const comandaCards = [];
        for (let i = cardCount - 1; i >= 0 && comandaCards.length < 2; i--) {
            const card = allCards.nth(i);
            const text = await card.textContent();
            if (text?.includes('Comanda') && !text?.includes('Mesa') && !text?.includes('Delivery')) {
                comandaCards.unshift(card);
            }
        }

        expect(comandaCards.length).toBeGreaterThanOrEqual(2);

        // Step 4: Verify items start unchecked
        for (let i = 0; i < 2; i++) {
            const checkbox = comandaCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            expect(isChecked).toBe(false);
        }

        // Step 5: Click item in first comanda order
        const targetCard = comandaCards[0];
        const targetItem = targetCard.locator('.orderItem').first();
        
        console.log('Clicking item in first comanda order');
        await targetItem.click();
        await page.waitForTimeout(1500);

        // Step 6: PROPERTY ASSERTION - Only first comanda should be marked
        const checkStates = [];
        for (let i = 0; i < 2; i++) {
            const checkbox = comandaCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            checkStates[i] = isChecked;
            console.log(`Comanda order ${i} checked: ${isChecked}`);
        }

        expect(checkStates[0]).toBe(true);  // First comanda should be marked
        expect(checkStates[1]).toBe(false); // Second comanda should NOT be marked

        console.log('✓ Comanda order marking property verified');
    });

    /**
     * Property 3: Delivery orders with different items - marking works correctly
     * **Validates: Requirement 3.3**
     * 
     * Test Strategy:
     * 1. Create multiple delivery orders with DIFFERENT items
     * 2. Mark an item in a specific delivery order
     * 3. Verify only that delivery order's item is marked
     */
    test('Property: Delivery orders with different items mark correctly', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Delivery orders with different items ===');

        // Step 1: Create 2 delivery orders with DIFFERENT items
        const items = ['Caldo', 'Chopp'];
        
        for (let i = 0; i < 2; i++) {
            await page.goto('http://localhost:8081');
            await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
            
            await page.click('text=Pedido Delivery');
            await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

            // Fill delivery form
            const timestamp = Date.now();
            await page.fill('input[placeholder="Nome do Cliente"]', `Cliente ${timestamp}-${i}`);
            await page.fill('input[placeholder="(11) 99999-9999"]', `119999${String(timestamp).slice(-5)}${i}`);
            await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua ${i}`);

            // Add DIFFERENT item for each order
            await page.fill('input[placeholder="Buscar produtos..."]', items[i]);
            await page.waitForTimeout(1000);
            
            const firstItemBtn = page.locator('.caldoCard').first()
                .filter({ hasText: '300ml' })
                .locator('.roundBtn')
                .filter({ hasText: '+' })
                .first();
            await firstItemBtn.click();

            // Confirm order
            await page.click('text=Lançar Pedido Delivery');
            await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
            await page.click('text=OK');
        }

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Get the 2 most recent delivery cards
        const allDeliveryCards = page.locator('.orderCard').filter({ hasText: 'Delivery' });
        const totalCards = await allDeliveryCards.count();
        expect(totalCards).toBeGreaterThanOrEqual(2);

        const recentCards = [
            allDeliveryCards.nth(totalCards - 2),
            allDeliveryCards.nth(totalCards - 1)
        ];

        // Step 4: Verify items start unchecked
        for (let i = 0; i < 2; i++) {
            const checkbox = recentCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            expect(isChecked).toBe(false);
        }

        // Step 5: Click item in first delivery order
        const targetCard = recentCards[0];
        const targetItem = targetCard.locator('.orderItem').first();
        
        console.log('Clicking item in first delivery order (different items)');
        await targetItem.click();
        await page.waitForTimeout(1500);

        // Step 6: PROPERTY ASSERTION - Only first delivery should be marked
        const checkStates = [];
        for (let i = 0; i < 2; i++) {
            const checkbox = recentCards[i].locator('.checkbox').first();
            const isChecked = await checkbox.evaluate(el => 
                el.className.includes('checkboxChecked')
            );
            checkStates[i] = isChecked;
            console.log(`Delivery order ${i} checked: ${isChecked}`);
        }

        expect(checkStates[0]).toBe(true);  // First delivery should be marked
        expect(checkStates[1]).toBe(false); // Second delivery should NOT be marked

        console.log('✓ Delivery orders with different items property verified');
    });

    /**
     * Property 4: Visual grouping - multiple units display correct count
     * **Validates: Requirement 3.5**
     * 
     * Test Strategy:
     * 1. Create a delivery order with multiple units of the same item
     * 2. Verify the visual grouping shows correct count
     * 3. Mark the grouped item
     * 4. Verify all units are marked together
     */
    test('Property: Visual grouping displays correct count', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Visual grouping of multiple units ===');

        // Step 1: Create delivery order with 3 units of same item
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        
        await page.click('text=Pedido Delivery');
        await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

        const timestamp = Date.now();
        await page.fill('input[placeholder="Nome do Cliente"]', `Cliente ${timestamp}`);
        await page.fill('input[placeholder="(11) 99999-9999"]', `119999${String(timestamp).slice(-5)}`);
        await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua Test`);

        // Add same item 3 times
        await page.fill('input[placeholder="Buscar produtos..."]', 'Caldo');
        await page.waitForTimeout(1000);
        
        const itemBtn = page.locator('.caldoCard').first()
            .filter({ hasText: '300ml' })
            .locator('.roundBtn')
            .filter({ hasText: '+' })
            .first();
        
        for (let i = 0; i < 3; i++) {
            await itemBtn.click();
            await page.waitForTimeout(300);
        }

        // Confirm order
        await page.click('text=Lançar Pedido Delivery');
        await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
        await page.click('text=OK');

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Find the most recent delivery card
        const allDeliveryCards = page.locator('.orderCard').filter({ hasText: 'Delivery' });
        const totalCards = await allDeliveryCards.count();
        const targetCard = allDeliveryCards.nth(totalCards - 1);

        // Step 4: Verify visual grouping shows count (e.g., "3x Caldo 300ml")
        const itemText = await targetCard.locator('.orderItem').first().textContent();
        console.log('Item text:', itemText);
        
        // The grouped item should show quantity indicator
        expect(itemText).toMatch(/3x|×3|\(3\)/i);

        // Step 5: Click the grouped item
        const targetItem = targetCard.locator('.orderItem').first();
        await targetItem.click();
        await page.waitForTimeout(1500);

        // Step 6: PROPERTY ASSERTION - Item should be marked
        const checkbox = targetCard.locator('.checkbox').first();
        const isChecked = await checkbox.evaluate(el => 
            el.className.includes('checkboxChecked')
        );
        expect(isChecked).toBe(true);

        console.log('✓ Visual grouping property verified');
    });

    /**
     * Property 5: Rapid sequential marking - all markings processed
     * **Validates: Requirement 3.6**
     * 
     * Test Strategy:
     * 1. Create a delivery order with multiple different items
     * 2. Rapidly mark multiple items in sequence
     * 3. Verify all markings are processed without data loss
     */
    test('Property: Rapid sequential marking processes all markings', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Rapid sequential marking ===');

        // Step 1: Create delivery order with 3 different items
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        
        await page.click('text=Pedido Delivery');
        await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

        const timestamp = Date.now();
        await page.fill('input[placeholder="Nome do Cliente"]', `Cliente ${timestamp}`);
        await page.fill('input[placeholder="(11) 99999-9999"]', `119999${String(timestamp).slice(-5)}`);
        await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua Test`);

        // Add 3 different items
        const items = ['Caldo', 'Chopp', 'Cerveja'];
        for (const item of items) {
            await page.fill('input[placeholder="Buscar produtos..."]', item);
            await page.waitForTimeout(800);
            
            const itemBtn = page.locator('.caldoCard').first()
                .filter({ hasText: '300ml' })
                .locator('.roundBtn')
                .filter({ hasText: '+' })
                .first();
            await itemBtn.click();
            await page.waitForTimeout(300);
        }

        // Confirm order
        await page.click('text=Lançar Pedido Delivery');
        await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
        await page.click('text=OK');

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Find the most recent delivery card
        const allDeliveryCards = page.locator('.orderCard').filter({ hasText: 'Delivery' });
        const totalCards = await allDeliveryCards.count();
        const targetCard = allDeliveryCards.nth(totalCards - 1);

        // Step 4: Get all items in the card
        const orderItems = targetCard.locator('.orderItem');
        const itemCount = await orderItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(3);

        // Step 5: Rapidly click all items in sequence
        console.log('Rapidly marking items...');
        for (let i = 0; i < Math.min(3, itemCount); i++) {
            await orderItems.nth(i).click();
            await page.waitForTimeout(200); // Very short delay to simulate rapid clicking
        }

        // Wait for all updates to process
        await page.waitForTimeout(2000);

        // Step 6: PROPERTY ASSERTION - All clicked items should be marked
        const checkboxes = targetCard.locator('.checkbox');
        const checkedCount = await checkboxes.evaluateAll(elements => 
            elements.filter(el => el.className.includes('checkboxChecked')).length
        );

        console.log(`Checked items: ${checkedCount} out of ${Math.min(3, itemCount)}`);
        expect(checkedCount).toBe(Math.min(3, itemCount));

        console.log('✓ Rapid sequential marking property verified');
    });

    /**
     * Property 6: Single delivery order - marking works correctly
     * **Validates: Requirement 3.3 (subset case)**
     * 
     * Test Strategy:
     * 1. Create a single delivery order
     * 2. Mark an item in that order
     * 3. Verify the item is marked correctly
     */
    test('Property: Single delivery order marking works correctly', async ({ page }) => {
        test.setTimeout(120000);

        console.log('\n=== Testing: Single delivery order marking ===');

        // Step 1: Create single delivery order
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        
        await page.click('text=Pedido Delivery');
        await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

        const timestamp = Date.now();
        await page.fill('input[placeholder="Nome do Cliente"]', `Cliente ${timestamp}`);
        await page.fill('input[placeholder="(11) 99999-9999"]', `119999${String(timestamp).slice(-5)}`);
        await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua Test`);

        // Add item
        await page.fill('input[placeholder="Buscar produtos..."]', 'Caldo');
        await page.waitForTimeout(1000);
        
        const firstItemBtn = page.locator('.caldoCard').first()
            .filter({ hasText: '300ml' })
            .locator('.roundBtn')
            .filter({ hasText: '+' })
            .first();
        await firstItemBtn.click();

        // Confirm order
        await page.click('text=Lançar Pedido Delivery');
        await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 5000 });
        await page.click('text=OK');

        // Step 2: Navigate to Montagem screen
        await page.goto('http://localhost:8081');
        await expect(page.getByText('Pedido Delivery').first()).toBeVisible({ timeout: 5000 });
        await page.click('text=Montagem');
        await page.waitForTimeout(2000);

        // Step 3: Find the most recent delivery card
        const allDeliveryCards = page.locator('.orderCard').filter({ hasText: 'Delivery' });
        const totalCards = await allDeliveryCards.count();
        const targetCard = allDeliveryCards.nth(totalCards - 1);

        // Step 4: Verify item starts unchecked
        const checkbox = targetCard.locator('.checkbox').first();
        const initialChecked = await checkbox.evaluate(el => 
            el.className.includes('checkboxChecked')
        );
        expect(initialChecked).toBe(false);

        // Step 5: Click item
        const targetItem = targetCard.locator('.orderItem').first();
        console.log('Clicking item in single delivery order');
        await targetItem.click();
        await page.waitForTimeout(1500);

        // Step 6: PROPERTY ASSERTION - Item should be marked
        const finalChecked = await checkbox.evaluate(el => 
            el.className.includes('checkboxChecked')
        );
        expect(finalChecked).toBe(true);

        console.log('✓ Single delivery order marking property verified');
    });
});
