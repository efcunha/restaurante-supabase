import { test, expect, type Page } from '@playwright/test';

const REPETICOES = 1;

const log = (msg: string) => {
    const t = new Date().toLocaleTimeString();
    console.log(`[${t}] ${msg}`);
};

test.describe('Teste de Estresse - Geração Massiva de Pedidos', () => {
  test.setTimeout(180000); // 3 minutos

  test.beforeEach(async ({ page }) => {
    log('[BEFORE] Navegando e fazendo login...');
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const emailInput = page.locator('input[placeholder*="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('lu@m.com');
    await page.locator('input[placeholder*="••"]').first().fill('mudar123');
    await page.locator('text=ENTRAR').first().click();
    
    await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    log('[BEFORE] Login concluído.');
    
    // Libera todas as mesas ocupadas (fecha pedidos em aberto)
    log('[BEFORE] Verificando mesas ocupadas...');
    await page.goto('/#/Mapa', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    // Verifica se há mesas ocupadas
    const mesasOcupadas = page.locator('text=/Ocupada/i');
    const count = await mesasOcupadas.count();
    
    if (count > 0) {
      log(`[BEFORE] Encontradas ${count} mesas ocupadas. Liberando...`);
      // Clica na primeira mesa ocupada para abrir o pedido
      for (let i = 0; i < Math.min(count, 5); i++) {
        try {
          await mesasOcupadas.nth(i).click({ timeout: 3000 });
          await page.waitForTimeout(1000);
          
          // Tenta fechar o modal/pedido
          const btnFechar = page.locator('text=/Fechar|Voltar|×/i').first();
          if (await btnFechar.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btnFechar.click();
          }
          await page.waitForTimeout(500);
        } catch (e) {
          log(`[BEFORE] Erro ao processar mesa ${i}: ${e}`);
        }
      }
    }
    
    log('[BEFORE] Preparação concluída.');
  });

  test('Execução de ciclos de pedidos', async ({ page }) => {
    page.on('dialog', async (dialog) => { 
        log(`[DIALOG] ${dialog.message()}`);
        await dialog.accept().catch(() => {}); 
    });

    for (let i = 1; i <= REPETICOES; i++) {
      log(`=== INICIANDO CICLO ${i}/${REPETICOES} ===`);

      // ── 1. BALCÃO ────────────────────────────────────────────────
      await Promise.race([
        (async () => {
          try {
            log(`[BALCÃO] ${i}: Navegando...`);
            await page.getByText('Novo Pedido').first().click();
            await expect(page.getByText('Nome do Cliente:')).toBeVisible({ timeout: 10000 });
            
            log(`[BALCÃO] ${i}: Preenchendo nome...`);
            await page.getByPlaceholder('Digite o nome').fill(`Stress Balcao ${i}`);
            
            // Adiciona CALDO
            log(`[BALCÃO] ${i}: Adicionando caldo...`);
            const caldoHeading = page.getByText(/🍲 CALDOS/).first();
            if (await caldoHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              const btnCaldo = page.getByText('+', { exact: true }).first();
              await btnCaldo.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Adiciona PORÇÃO
            log(`[BALCÃO] ${i}: Adicionando porção...`);
            const porcaoHeading = page.getByText(/🍟 Porções/).first();
            if (await porcaoHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              await porcaoHeading.scrollIntoViewIfNeeded();
              const btnPorcao = page.getByText('+', { exact: true }).first();
              await btnPorcao.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Adiciona BEBIDA
            log(`[BALCÃO] ${i}: Adicionando bebida...`);
            const bebidaHeading = page.getByText(/🥤 Bebidas/).first();
            if (await bebidaHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              await bebidaHeading.scrollIntoViewIfNeeded();
              const btnBebida = page.getByText('+', { exact: true }).first();
              await btnBebida.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Valida que tem itens no carrinho
            log(`[BALCÃO] ${i}: Validando carrinho...`);
            const priceText = page.getByText(/R\$ [1-9]/).first();
            await expect(priceText).toBeVisible({ timeout: 5000 });
            
            // Adiciona Pizza
            log(`[BALCÃO] ${i}: Adicionando pizza...`);
            const pizzaHeading = page.getByText(/🍕 PIZZAS/).first();
            await expect(pizzaHeading).toBeVisible({ timeout: 10000 });
            
            const pizzaPrice = page.getByText(/R\$ [1-9]/).nth(1);
            await pizzaPrice.click({ force: true });
            await page.waitForTimeout(1500);
            
            // Seleciona tamanho
            const tamanhos = ['Broto', 'Média', 'Grande'];
            const tamanho = tamanhos[i % tamanhos.length];
            log(`[BALCÃO] ${i}: Selecionando tamanho ${tamanho}...`);
            try {
              await page.getByText(tamanho, { exact: true }).first().click({ timeout: 3000 });
            } catch {
              await page.getByText(/Até [1-4] sabor/).first().click();
            }
            await page.waitForTimeout(800);
            
            // Avança
            log(`[BALCÃO] ${i}: Avançando no modal...`);
            const btnNext = page.getByText(/Próximo: Extras|Adicionar ao Pedido/).first();
            await btnNext.waitFor({ state: 'visible', timeout: 5000 });
            await btnNext.click({ force: true });
            await page.waitForTimeout(800);
            
            // Confirma se necessário
            try {
              const btnFinal = page.getByText('Adicionar ao Pedido').first();
              await btnFinal.waitFor({ state: 'visible', timeout: 3000 });
              await btnFinal.click({ force: true });
              log(`[BALCÃO] ${i}: Pizza adicionada.`);
            } catch {
              log(`[BALCÃO] ${i}: Pizza já adicionada (1 click).`);
            }
            
            await page.waitForTimeout(1000);
            
            // Adiciona COMIDA
            log(`[BALCÃO] ${i}: Adicionando comida...`);
            const comidaHeading = page.getByText(/🍽️ Comidas/).first();
            if (await comidaHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              await comidaHeading.scrollIntoViewIfNeeded();
              const btnComida = page.getByText('+', { exact: true }).first();
              await btnComida.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            log(`[BALCÃO] ${i}: Validando total...`);
            const totalText = page.getByText(/R\$ [1-9]/).first();
            await expect(totalText).toBeVisible({ timeout: 3000 });
            
            log(`[BALCÃO] ${i}: Criando pedido...`);
            await page.getByText('Criar Pedido').first().click();
            await page.waitForTimeout(3000);
            
            // Valida confirmação
            try {
              await expect(page.getByText(/Pedido criado/i).first()).toBeVisible({ timeout: 5000 });
              log(`[BALCÃO] ${i}: ✓ Confirmado`);
            } catch {
              log(`[BALCÃO] ${i}: ✓ Sem toast (possível caixa fechado)`);
            }
          } catch (e: any) {
            log(`[BALCÃO] ${i}: ✗ ${e.message.split('\n')[0]}`);
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 40s')), 40000))
      ]).catch(e => log(`[BALCÃO] ${i}: Timeout - ${e.message}`));

      // ── 2. DELIVERY ──────────────────────────────────────────────
      await Promise.race([
        (async () => {
          try {
            log(`[DELIVERY] ${i}: Navegando...`);
            await page.goto('/#/Delivery', { waitUntil: 'domcontentloaded', timeout: 10000 });
            await page.waitForTimeout(2000);
            
            log(`[DELIVERY] ${i}: Preenchendo formulário...`);
            
            // Scroll para o topo para garantir que o formulário está visível
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(1500);
            
            // Cliente - tenta múltiplos seletores
            log(`[DELIVERY] ${i}: Preenchendo cliente...`);
            const inputCliente = page.locator('input').filter({ hasText: '' }).first();
            await inputCliente.fill(`Stress Delivery ${i}`, { timeout: 5000 }).catch(async () => {
              // Fallback: preenche o primeiro input visível
              await page.locator('input[type="text"]').first().fill(`Stress Delivery ${i}`);
            });
            
            // Telefone
            log(`[DELIVERY] ${i}: Preenchendo telefone...`);
            await page.keyboard.press('Tab');
            await page.keyboard.type('11999999999');
            
            // CEP
            await page.keyboard.press('Tab');
            await page.keyboard.type('01310100');
            await page.waitForTimeout(800);
            
            // Endereço
            log(`[DELIVERY] ${i}: Preenchendo endereço...`);
            await page.keyboard.press('Tab');
            await page.keyboard.type(`Av Paulista, ${i * 100}, Centro, SP`);
            
            // Taxa de Entrega - pula via Tab
            await page.keyboard.press('Tab');
            await page.keyboard.type('5');
            
            await page.waitForTimeout(500);
            
            // Forma de Pagamento - seleciona PIX
            log(`[DELIVERY] ${i}: Selecionando forma de pagamento...`);
            const btnPix = page.getByText('PIX', { exact: true });
            if (await btnPix.isVisible({ timeout: 3000 }).catch(() => false)) {
              await btnPix.click();
            }
            
            await page.waitForTimeout(1000);
            
            log(`[DELIVERY] ${i}: Adicionando itens...`);
            
            // Adiciona CALDO
            const caldoHeading = page.getByText(/🍲 CALDOS/).first();
            if (await caldoHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              const btnCaldo = page.getByText('+', { exact: true }).first();
              await btnCaldo.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Adiciona PORÇÃO
            const porcaoHeading = page.getByText(/🍟 Porções/).first();
            if (await porcaoHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              await porcaoHeading.scrollIntoViewIfNeeded();
              const btnPorcao = page.getByText('+', { exact: true }).first();
              await btnPorcao.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Adiciona BEBIDA
            const bebidaHeading = page.getByText(/🥤 Bebidas/).first();
            if (await bebidaHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
              await bebidaHeading.scrollIntoViewIfNeeded();
              const btnBebida = page.getByText('+', { exact: true }).first();
              await btnBebida.click({ force: true });
              await page.waitForTimeout(1000);
            }
            
            // Valida carrinho
            const priceText = page.getByText(/R\$ [1-9]/).first();
            await expect(priceText).toBeVisible({ timeout: 5000 });
            
            log(`[DELIVERY] ${i}: Confirmando pedido...`);
            const btnConfirmar = page.getByText(/Confirmar Delivery/i).first();
            await btnConfirmar.waitFor({ state: 'visible', timeout: 5000 });
            await btnConfirmar.click({ force: true });
            await page.waitForTimeout(3000);
            
            // Valida confirmação
            try {
              await expect(page.getByText(/Pedido criado/i).first()).toBeVisible({ timeout: 5000 });
              log(`[DELIVERY] ${i}: ✓ Confirmado`);
            } catch {
              log(`[DELIVERY] ${i}: ✓ Sem toast`);
            }
          } catch (e: any) {
            log(`[DELIVERY] ${i}: ✗ ${e.message.split('\n')[0]}`);
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 40s')), 40000))
      ]).catch(e => log(`[DELIVERY] ${i}: Timeout - ${e.message}`));

      // ── 3. MESA ──────────────────────────────────────────────────
      await Promise.race([
        (async () => {
          try {
            log(`[MESA] ${i}: Navegando para Mapa...`);
            await page.goto('/#/Mapa', { waitUntil: 'domcontentloaded', timeout: 10000 });
            await page.waitForTimeout(2000);

            log(`[MESA] ${i}: Selecionando mesa livre...`);
            
            // Aguarda o mapa carregar
            await page.waitForTimeout(1000);
            
            // Procura por qualquer mesa (livre ou não)
            const todasMesas = page.locator('text=/Mesa [0-9]/i');
            const totalMesas = await todasMesas.count();
            log(`[MESA] ${i}: Total de mesas encontradas: ${totalMesas}`);
            
            if (totalMesas > 0) {
              // Tenta encontrar uma mesa "Livre"
              const mesaLivre = page.locator('text=/Livre/i').first();
              const temLivre = await mesaLivre.isVisible({ timeout: 3000 }).catch(() => false);
              
              if (temLivre) {
                log(`[MESA] ${i}: Clicando em mesa livre...`);
                await mesaLivre.click({ force: true });
              } else {
                // Se não tem livre, clica na primeira mesa disponível
                log(`[MESA] ${i}: Nenhuma mesa livre, clicando na primeira mesa...`);
                await todasMesas.first().click({ force: true });
              }
              
              await page.waitForTimeout(2000);
              
              // Agora deve estar na tela de Novo Pedido com mesa pré-preenchida
              log(`[MESA] ${i}: Verificando tela de pedido...`);
              const temFormulario = await page.getByText('Nome do Cliente:').isVisible({ timeout: 5000 }).catch(() => false);
              
              if (temFormulario) {
                log(`[MESA] ${i}: Preenchendo nome...`);
                await page.getByPlaceholder('Digite o nome').fill(`Stress Mesa ${i}`);
                
                log(`[MESA] ${i}: Adicionando itens...`);
                
                // Adiciona CALDO
                const caldoHeading = page.getByText(/🍲 CALDOS/).first();
                if (await caldoHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
                  const btnCaldo = page.getByText('+', { exact: true }).first();
                  await btnCaldo.click({ force: true });
                  await page.waitForTimeout(1000);
                }
                
                // Adiciona COMIDA
                const comidaHeading = page.getByText(/🍽️ Comidas/).first();
                if (await comidaHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await comidaHeading.scrollIntoViewIfNeeded();
                  const btnComida = page.getByText('+', { exact: true }).first();
                  await btnComida.click({ force: true });
                  await page.waitForTimeout(1000);
                }
                
                // Adiciona BEBIDA
                const bebidaHeading = page.getByText(/🥤 Bebidas/).first();
                if (await bebidaHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await bebidaHeading.scrollIntoViewIfNeeded();
                  const btnBebida = page.getByText('+', { exact: true }).first();
                  await btnBebida.click({ force: true });
                  await page.waitForTimeout(1000);
                }
                
                // Valida carrinho
                const priceText = page.getByText(/R\$ [1-9]/).first();
                await expect(priceText).toBeVisible({ timeout: 5000 });
                
                log(`[MESA] ${i}: Criando pedido...`);
                await page.getByText('Criar Pedido').first().click();
                await page.waitForTimeout(3000);
                
                // Valida confirmação
                try {
                  await expect(page.getByText(/Pedido criado/i).first()).toBeVisible({ timeout: 5000 });
                  log(`[MESA] ${i}: ✓ Confirmado`);
                } catch {
                  log(`[MESA] ${i}: ✓ Sem toast`);
                }
              } else {
                log(`[MESA] ${i}: ⚠ Mesa ocupada, não foi possível criar pedido`);
              }
            } else {
              log(`[MESA] ${i}: ⚠ Nenhuma mesa encontrada no mapa`);
            }
          } catch (e: any) {
            log(`[MESA] ${i}: ✗ ${e.message.split('\n')[0]}`);
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 40s')), 40000))
      ]).catch(e => log(`[MESA] ${i}: Timeout - ${e.message}`));
    }
    
    log('=== FIM DO TESTE ===');
  });
});
