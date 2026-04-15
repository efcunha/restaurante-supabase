#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'scripts', 'forms-1to1.config.json');
const outRoot = path.resolve(projectRoot, '..', 'docs', 'design-system', 'figma-1to1');
const outDir = path.join(outRoot, 'figma');

const token = process.env.FIGMA_ACCESS_TOKEN;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuracao nao encontrado: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.figmaFileKey) {
    throw new Error('forms-1to1.config.json invalido: figmaFileKey ausente.');
  }
  if (!Array.isArray(parsed.forms)) {
    throw new Error('forms-1to1.config.json invalido: forms ausente.');
  }
  return parsed;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Falha ${response.status} em ${url}`);
  }
  return response.json();
}

async function download(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Download falhou ${response.status}: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: node scripts/pull-forms-1to1-from-figma.mjs');
    console.log('Env obrigatoria: FIGMA_ACCESS_TOKEN');
    return;
  }

  if (!token) {
    throw new Error('Defina FIGMA_ACCESS_TOKEN para baixar telas 1:1 do Figma.');
  }

  ensureDir(outDir);
  const cfg = loadConfig();

  const mapped = cfg.forms.filter((f) => typeof f.figmaNodeId === 'string' && f.figmaNodeId.trim().length > 0);
  if (mapped.length === 0) {
    throw new Error('Nenhum figmaNodeId configurado em forms-1to1.config.json.');
  }

  const nodeIds = mapped.map((f) => f.figmaNodeId.trim());
  const idsParam = encodeURIComponent(nodeIds.join(','));

  const headers = { 'X-Figma-Token': token };
  const imagesUrl = `https://api.figma.com/v1/images/${cfg.figmaFileKey}?ids=${idsParam}&format=png&scale=2`;
  const images = await fetchJson(imagesUrl, headers);

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'figma',
    figmaFileKey: cfg.figmaFileKey,
    total: mapped.length,
    files: [],
  };

  for (const form of mapped) {
    const url = images.images?.[form.figmaNodeId];
    if (!url) {
      console.warn(`[forms-1to1] sem imagem para node ${form.figmaNodeId} (${form.name})`);
      continue;
    }

    const buffer = await download(url, headers);
    const outputPath = path.join(outDir, `${form.name}.png`);
    fs.writeFileSync(outputPath, buffer);

    manifest.files.push({
      name: form.name,
      figmaNodeId: form.figmaNodeId,
      output: path.relative(path.resolve(projectRoot, '..'), outputPath).replace(/\\/g, '/'),
    });

    console.log(`[forms-1to1] figma baixado: ${form.name}`);
  }

  const manifestPath = path.join(outRoot, 'figma.manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[forms-1to1] concluido. ${manifest.files.length} telas baixadas para ${outDir}`);
}

main().catch((error) => {
  console.error(`[forms-1to1] erro: ${error.message}`);
  process.exit(1);
});
