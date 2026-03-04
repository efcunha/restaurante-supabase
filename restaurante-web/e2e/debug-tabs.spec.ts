import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('Dump tab bar DOM', async ({ page }) => {
  test.setTimeout(90000);
  
  console.log('Navegando para o App / Login');
  await page.goto('/');

  try {
    await page.waitForSelector('text=Faça login na sua conta', { timeout: 10000 });
    console.log('Preenchendo credenciais...');
    await page.getByPlaceholder('Email').fill('lu@m.com');
    await page.getByPlaceholder('Senha').fill('mudar123');
    await page.getByRole('button', { name: 'Entrar' }).click();
  } catch (e) {
    console.log('Login falhou ou já está logado', e);
  }

  console.log('Aguardando página carregar / Novo Pedido...');
  try {
      await page.waitForTimeout(5000); // just generic wait for everything
      // Try to find the tab bar
      const html = await page.content();
      fs.writeFileSync('dom_dump.html', html);
      console.log('Dump do HTML salvo em dom_dump.html');
      
      // Let's also print some specific elements
      const links = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.textContent, ariaLabel: a.getAttribute('aria-label'), href: a.getAttribute('href') })));
      console.log('Todos as âncoras na página (prováveis abas):', links);
  } catch (e) {
      console.error(e);
  }
});
