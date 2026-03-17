import { test, expect } from '@playwright/test';

/**
 * Race Condition Test - Cross-Marking Bug in MontagemScreen
 * 
 * This test validates that clicking to mark an item as "ready" in one delivery order
 * does NOT mark the item in a different delivery order.
 * 
 * Expected Behavior: Clicking item in Order A marks item in Order A
 * Bug Behavior: Clicking item in Order A marks item in Order B or C
 * 
 * Run with: npx playwright test e2e/race-condition-cross-marking.spec.ts
 */

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

// Helper to get today's date key
const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function cancelDeliveryOrders(accessToken: string) {
  try {
    // Cancel all open delivery orders
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_type=eq.delivery&status=neq.cancelado&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (res.ok) {
      const orders = await res.json();
      if (orders.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?order_type=eq.delivery&status=neq.cancelado`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelado' }),
        });
        console.log(`[DB] ${orders.length} pedidos delivery foram cancelados`);
      }
    }
  } catch (e) {
    console.warn(`[DB] Falha ao limpar pedidos delivery:`, e);
  }
}

test.describe('Race Condition - Cross-Marking Bug', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

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

    // Cleanup existing delivery orders
    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const accessToken = authDataRaw ? JSON.parse(authDataRaw).access_token : '';
    if (accessToken) {
      await cancelDeliveryOrders(accessToken);
    }
  });

  test('Property: Marking item in Order A should NOT mark item in Order B or C', async ({ page }) => {
    console.log('\n=== Creating 3 delivery orders with same item ===');

    // Helper function to create a delivery order
    async function createDeliveryOrder(clientName: string, phone: string) {
      console.log(`\n[${clientName}] Creating order...`);
      
      await page.getByRole('link', { name: 'Pedido Delivery' }).click();
      await expect(page.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });

      await page.getByPlaceholder('Nome do Cliente').fill(clientName);
      await page.getByPlaceholder('(11) 99999-9999').fill(phone);
      await page.getByPlaceholder('00000-000').fill('01310100');
      await page.waitForTimeout(1000);
      await page.getByPlaceholder('Rua, Número, Bairro, Referência...').fill('Av Paulista, 1000');

      // Add Chopp 300 ML
      const searchBox = page.getByPlaceholder('Buscar no cardápio...');
      await searchBox.fill('chopp');
      await page.waitForTimeout(1500);
      
      // Click the + button to add item
      await page.locator('div[dir="auto"]').filter({ hasText: '+' }).first().click();
      await page.waitForTimeout(500);

      // Clear search
      await searchBox.fill('');
      await page.waitForTimeout(500);

      // Confirm order
      console.log(`[${clientName}] Confirming order...`);
      await page.getByText('Confirmar Delivery').click();
      await page.waitForTimeout(6000); // Increased wait time

      // Wait for form reset
      const clientNameInput = page.getByPlaceholder('Nome do Cliente');
      await expect(clientNameInput).toHaveValue('', { timeout: 20000 });
      
      console.log(`[${clientName}] ✅ Order created`);
    }

    // Create 3 orders with same item
    await createDeliveryOrder('Cliente A', '11987654321');
    await createDeliveryOrder('Cliente B', '11987654322');
    await createDeliveryOrder('Cliente C', '11987654323');

    console.log('\n=== Navigating to Rotas Delivery to move orders to Montagem ===');
    
    // Navigate to Rotas Delivery (where delivery orders appear initially)
    await page.getByRole('link', { name: /Rotas Delivery/i }).click();
    await page.waitForTimeout(3000);
    
    console.log('Waiting for orders to appear in Rotas Delivery...');
    
    // Wait for at least one delivery order to appear
    await expect(page.locator('text=/Cliente [ABC]/').first()).toBeVisible({ timeout: 20000 });
    console.log('✓ Orders visible in Rotas Delivery');
    
    // Find all "Preparando" buttons for our test orders
    const preparandoButtons = page.getByText('Preparando');
    const buttonCount = await preparandoButtons.count();
    console.log(`Found ${buttonCount} "Preparando" buttons`);
    
    // Click all "Preparando" buttons to move orders to Montagem
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      await preparandoButtons.nth(i).click();
      await page.waitForTimeout(500);
    }
    
    console.log('✓ Moved orders to Montagem via Rotas Delivery screen');
    await page.waitForTimeout(2000);
    
    // Now navigate to Montagem
    console.log('\n=== Navigating to Montagem screen ===');
    await page.getByRole('link', { name: /Montagem/i }).click();
    await page.waitForTimeout(3000);
    
    console.log('Waiting for orders to appear in Montagem...');
    await expect(page.locator('text=/Delivery/i').first()).toBeVisible({ timeout: 20000 });
    console.log('✓ Orders visible in Montagem')

    console.log('\n=== Validating initial state ===');

    // Find all delivery order cards (they show "Delivery" as title, not client name)
    const orderCards = page.locator('[class*="orderCard"]');
    const cardCount = await orderCards.count();
    console.log(`Found ${cardCount} order cards in Montagem`);

    if (cardCount < 3) {
      await page.screenshot({ path: `montagem-insufficient-cards-${Date.now()}.png`, fullPage: true });
      throw new Error(`Expected 3 order cards, found ${cardCount}`);
    }

    // Take screenshot before clicking
    await page.screenshot({ path: `montagem-before-click-${Date.now()}.png`, fullPage: true });

    console.log('\n=== Clicking item in first order ===');

    // Find the first order card
    const firstCard = orderCards.first();
    
    // Find the Chopp item checkbox in the first card and click it
    const firstCheckbox = firstCard.locator('[class*="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10000 });
    
    console.log('[First Card] Clicking Chopp item checkbox...');
    await firstCheckbox.click();
    await page.waitForTimeout(2000);

    // Take screenshot after clicking
    await page.screenshot({ path: `montagem-after-click-${Date.now()}.png`, fullPage: true });

    console.log('\n=== Validating marking state ===');

    // Get auth token to query database
    const authDataRaw = await page.evaluate(() => localStorage.getItem('sb-ykalocfhnetxenvmtlcn-auth-token'));
    const accessToken = authDataRaw ? JSON.parse(authDataRaw).access_token : '';

    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Query all delivery orders
    const today = getLocalDateKey();
    const ordersResAfterClick = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_type=eq.delivery&date_key=eq.${today}&status=neq.cancelado&select=id,client_name,items_with_status&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    const orders = await ordersResAfterClick.json();
    
    if (!Array.isArray(orders)) {
      console.error('❌ Erro ao buscar pedidos:', orders);
      throw new Error(`Failed to fetch orders: ${JSON.stringify(orders)}`);
    }

    console.log(`\nFound ${orders.length} delivery orders in database`);

    // Find our 3 test orders
    const orderA = orders.find((o: any) => o.client_name === 'Cliente A');
    const orderB = orders.find((o: any) => o.client_name === 'Cliente B');
    const orderC = orders.find((o: any) => o.client_name === 'Cliente C');

    if (!orderA || !orderB || !orderC) {
      console.error('Orders found:', orders.map((o: any) => o.client_name));
      throw new Error('Could not find all 3 test orders');
    }

    console.log('\n=== Checking items_with_status for each order ===');

    // Helper to check if item is marked
    function isItemMarked(order: any): boolean {
      const items = order.items_with_status || [];
      if (items.length === 0) {
        console.log(`  [${order.client_name}] No items found`);
        return false;
      }
      
      const choppItem = items.find((item: any) => 
        item.name?.toLowerCase().includes('chopp')
      );
      
      if (!choppItem) {
        console.log(`  [${order.client_name}] Chopp item not found in items:`, items);
        return false;
      }

      // Check the 'checked' field which is what MontagemScreen uses
      const isMarked = choppItem.checked === true;
      console.log(`  [${order.client_name}] Chopp item marked: ${isMarked}`, choppItem);
      return isMarked;
    }

    const aMarked = isItemMarked(orderA);
    const bMarked = isItemMarked(orderB);
    const cMarked = isItemMarked(orderC);

    console.log('\n=== RESULTS ===');
    console.log(`Cliente A (clicked): ${aMarked ? '✅ MARKED' : '❌ NOT MARKED'}`);
    console.log(`Cliente B: ${bMarked ? '❌ MARKED (BUG!)' : '✅ NOT MARKED'}`);
    console.log(`Cliente C: ${cMarked ? '❌ MARKED (BUG!)' : '✅ NOT MARKED'}`);

    // PROPERTY ASSERTIONS
    // 1. The clicked item (Order A) SHOULD be marked
    expect(aMarked).toBe(true);

    // 2. Other items (Order B and C) should NOT be marked
    if (bMarked) {
      throw new Error('BUG DETECTED: Item in Order B was marked when clicking Order A');
    }
    if (cMarked) {
      throw new Error('BUG DETECTED: Item in Order C was marked when clicking Order A');
    }

    console.log('\n✅ Test passed: No cross-marking detected');
  });
});
