const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8081');
  await page.locator('input[placeholder="seu@email.com"]').fill('lu@m.com');
  await page.locator('input[placeholder="••••••••"]').fill('mudar123');
  await page.locator('text=ENTRAR').click();
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
     let keys = [];
     for(let i=0; i<localStorage.length; i++) keys.push(localStorage.key(i));
     return keys.map(k => ({key: k, value: localStorage.getItem(k)}));
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
