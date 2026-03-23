import { test, expect } from '@playwright/test';

test('Read DB visually via Montagem', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.fill('input[placeholder="seu@email.com"]', (process.env.PLAYWRIGHT_TEST_EMAIL || ''));
    await page.fill('input[placeholder="••••••••"]', (process.env.PLAYWRIGHT_TEST_PASSWORD || ''));
    await page.click('text=ENTRAR');
    await expect(page.locator('text=Configurações')).toBeVisible({ timeout: 10000 });

    await page.click('text=Montagem');
    await page.waitForTimeout(3000);

    // Just pause to let me see what's on screen, but I guess I can't see the interactive browser.
    // I will just dump the HTML of the first card.
    const cards = page.locator('.orderCard');
    const count = await cards.count();
    console.log(`FOUND ${count} CARDS`);

    for (let i = 0; i < count; i++) {
        const text = await cards.nth(i).innerText();
        console.log(`CARD ${i}:\n${text}\n---`);
    }
});
