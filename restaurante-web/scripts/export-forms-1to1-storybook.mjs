#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'scripts', 'forms-1to1.config.json');
const outRoot = path.resolve(projectRoot, '..', 'docs', 'design-system', 'figma-1to1');
const outDir = path.join(outRoot, 'storybook');

const viewport = {
  width: Number(process.env.FORMS_1TO1_WIDTH || 1440),
  height: Number(process.env.FORMS_1TO1_HEIGHT || 2200),
};

const baseUrl = process.env.STORYBOOK_PUBLIC_BASE_URL || 'https://restaurante-web-storybook-production.up.railway.app';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuracao nao encontrado: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.forms)) {
    throw new Error('forms-1to1.config.json invalido: campo forms ausente.');
  }
  return parsed;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: node scripts/export-forms-1to1-storybook.mjs');
    console.log('Env opcionais: STORYBOOK_PUBLIC_BASE_URL, FORMS_1TO1_WIDTH, FORMS_1TO1_HEIGHT');
    return;
  }

  ensureDir(outDir);
  const cfg = loadConfig();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'storybook',
    baseUrl,
    viewport,
    total: cfg.forms.length,
    files: [],
  };

  for (const form of cfg.forms) {
    const storyId = form.storyId;
    const url = `${baseUrl}/iframe.html?id=${storyId}&viewMode=story`;
    const outputPath = path.join(outDir, `${form.name}.png`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });

    // Aguarda a pagina canvas renderizar e captura full page para preservar fidelidade visual.
    await page.waitForSelector('body', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: outputPath, fullPage: true });

    manifest.files.push({
      name: form.name,
      storyId,
      url,
      output: path.relative(path.resolve(projectRoot, '..'), outputPath).replace(/\\/g, '/'),
    });

    console.log(`[forms-1to1] storybook exportado: ${form.name}`);
  }

  await browser.close();

  const manifestPath = path.join(outRoot, 'storybook.manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[forms-1to1] concluido. ${manifest.total} telas em ${outDir}`);
}

main().catch((error) => {
  console.error(`[forms-1to1] erro: ${error.message}`);
  process.exit(1);
});
