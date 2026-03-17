import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';

/**
 * Bug Condition Exploration Test - Cross-marking items in delivery orders
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This property-based test explores the bug where clicking an item in one delivery order
 * marks it in a different delivery order instead. The test is EXPECTED TO FAIL on unfixed code.
 * 
 * Bug Condition: Multiple delivery orders exist with items having the same name
 * Expected Behavior: Clicking an item in one order should mark it only in that order
 * Actual Behavior (BUG): Clicking an item marks it in a different order
 */

test.describe('Bug Condition Exploration - Cross-marking Delivery Items', () => {
    const testCompanyCode = 'TEST_DELIVERY_BUG';

    test.beforeEach(async ({ page }) => {
        // Login to the system
        await page.goto('http://localhost:8081');
        await page.fill('input[placeholder="Código da Empresa"]', testCompanyCode);
        await page.fill('input[placeholder="Usuário"]', 'admin');
        await page.fill('input[placeholder="Senha"]', 'admin');
        await page.click('text=Entrar');
        await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 10000 });
    });

    /**
     * Property-Based Test: Clicking item in order N marks it only in order N
     * 
     * This test uses fast-check to generate different scenarios where we click
     * items in different orders and verify the marking behavior.
     * 
     * Strategy: Create 3 delivery orders with the same item, then test clicking
     * each order (0, 1, 2) to verify only that order gets marked.
     */
    test('Property: Clicking item in order N marks it only in order N (not in other orders)', async ({ page }) => {
        test.setTimeout(180000); // 3 minutes for property-based test

        // Property-based test: For each target order index (0, 1, 2),
        // verify that clicking that order marks only that order
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 2 }), // Which order to click (0, 1, or 2)
                async (targetOrderIndex) => {
                    console.log(`\n=== Testing: clicking item in order ${targetOrderIndex} ===`);

                    // Step 1: Create 3 delivery orders with the same item
                    for (let i = 0; i < 3; i++) {
                        await page.goto('http://localhost:8081');
                        await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 5000 });
                        
                        await page.click('text=Pedido Delivery');
                        await expect(page.getByPlaceholder('Rua, Número, Bairro, Referência...')).toBeVisible();

                        // Fill delivery form with unique data
                        const timestamp = Date.now();
                        await page.fill('input[placeholder="Nome do Cliente"]', `Cliente ${timestamp}-${i}`);
                        await page.fill('input[placeholder="(11) 99999-9999"]', `119999${String(timestamp).slice(-5)}${i}`);
                        await page.fill('input[placeholder="Rua, Número, Bairro, Referência..."]', `Rua ${i}`);

                        // Add the same item (Caldo 300ml) to all orders
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
                    }

                    // Step 2: Navigate to Montagem screen
                    await page.goto('http://localhost:8081');
                    await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 5000 });
                    await page.click('text=Montagem');
                    await page.waitForTimeout(2000);

                    // Step 3: Get the 3 most recent delivery cards
                    const allDeliveryCards = page.locator('.orderCard').filter({ hasText: 'Delivery' });
                    const totalCards = await allDeliveryCards.count();
                    expect(totalCards).toBeGreaterThanOrEqual(3);

                    // Get last 3 cards (most recent)
                    const recentCards = [
                        allDeliveryCards.nth(totalCards - 3),
                        allDeliveryCards.nth(totalCards - 2),
                        allDeliveryCards.nth(totalCards - 1)
                    ];

                    // Step 4: Verify all items start unchecked
                    for (let i = 0; i < 3; i++) {
                        const checkbox = recentCards[i].locator('.checkbox').first();
                        const isChecked = await checkbox.evaluate(el => 
                            el.className.includes('checkboxChecked')
                        );
                        expect(isChecked).toBe(false);
                    }

                    // Step 5: Click item in the target order
                    const targetCard = recentCards[targetOrderIndex];
                    const targetItem = targetCard.locator('.orderItem').first();
                    
                    console.log(`Clicking item in order ${targetOrderIndex}`);
                    await targetItem.click();
                    await page.waitForTimeout(1500);

                    // Step 6: CRITICAL PROPERTY ASSERTION
                    // Expected: Only the clicked order should be marked
                    // Bug: A different order gets marked instead
                    
                    const checkStates = [];
                    for (let i = 0; i < 3; i++) {
                        const checkbox = recentCards[i].locator('.checkbox').first();
                        const isChecked = await checkbox.evaluate(el => 
                            el.className.includes('checkboxChecked')
                        );
                        checkStates[i] = isChecked;
                        console.log(`Order ${i} checked: ${isChecked}`);
                    }

                    // PROPERTY: Only the clicked order should be marked
                    for (let i = 0; i < 3; i++) {
                        if (i === targetOrderIndex) {
                            expect(checkStates[i]).toBe(true); // Clicked order MUST be marked
                        } else {
                            expect(checkStates[i]).toBe(false); // Other orders MUST NOT be marked
                        }
                    }

                    console.log(`✓ Property verified for order ${targetOrderIndex}`);
                }
            ),
            {
                numRuns: 3, // Test all 3 scenarios: clicking order 0, 1, and 2
                verbose: true,
            }
        );
    });
});
