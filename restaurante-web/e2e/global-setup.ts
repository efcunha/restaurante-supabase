import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup para testes E2E Playwright
 * Executa uma única vez antes de todos os testes
 */
async function globalSetup(config: FullConfig) {
  console.log('[GLOBAL SETUP] Iniciando setup global...');
  const projectBaseUrl = config.projects.find((project) => project.use?.baseURL)?.use?.baseURL;
  
  // Verifica se a aplicação está disponível
  const baseURL =
    process.env.PDV_E2E_START_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    projectBaseUrl ||
    'http://localhost:8081';
  console.log(`[GLOBAL SETUP] Base URL: ${baseURL}`);
  
  // Opcionalmente, executa uma verificação de conectividade
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('[GLOBAL SETUP] Verificando disponibilidade da aplicação...');
    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    
    if (response?.ok() || response?.status() === 200) {
      console.log('[GLOBAL SETUP] ✅ Aplicação está acessível');
    } else {
      console.log('[GLOBAL SETUP] ⚠️ Aplicação pode não estar 100% pronta, mas continuando...');
    }
    
    await page.close();
    await browser.close();
  } catch (error) {
    console.log('[GLOBAL SETUP] ⚠️ Erro ao verificar disponibilidade (não crítico):', (error as Error).message);
  }
  
  console.log('[GLOBAL SETUP] ✓ Setup global concluído');
}

export default globalSetup;
