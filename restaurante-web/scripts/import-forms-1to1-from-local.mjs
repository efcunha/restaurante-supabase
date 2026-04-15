#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'scripts', 'forms-1to1.config.json');
const outRoot = path.resolve(projectRoot, '..', 'docs', 'design-system', 'figma-1to1');
const inputDir = process.env.FIGMA_LOCAL_EXPORT_DIR
  ? path.resolve(process.env.FIGMA_LOCAL_EXPORT_DIR)
  : path.join(outRoot, 'inbox');
const outDir = path.join(outRoot, 'figma');

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

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
    throw new Error('forms-1to1.config.json invalido: forms ausente.');
  }
  return parsed;
}

function listPngFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.png')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    files.push({
      fileName: entry.name,
      fullPath,
      normalized: normalizeName(path.parse(entry.name).name),
    });
  }
  return files;
}

function copyIfNeeded(source, target) {
  const sourceBuffer = fs.readFileSync(source);
  if (fs.existsSync(target)) {
    const targetBuffer = fs.readFileSync(target);
    if (sourceBuffer.equals(targetBuffer)) {
      return false;
    }
  }

  fs.writeFileSync(target, sourceBuffer);
  return true;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: node scripts/import-forms-1to1-from-local.mjs');
    console.log('Padrao de entrada: docs/design-system/figma-1to1/inbox/*.png');
    console.log('Env opcional: FIGMA_LOCAL_EXPORT_DIR');
    return;
  }

  ensureDir(outDir);
  const cfg = loadConfig();
  const localPngs = listPngFiles(inputDir);

  if (localPngs.length === 0) {
    throw new Error(
      `Nenhum PNG encontrado em ${inputDir}. Exporte os frames do Figma para essa pasta e rode novamente o comando.`
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'figma-local-export',
    inputDir: path.relative(path.resolve(projectRoot, '..'), inputDir).replace(/\\/g, '/'),
    total: cfg.forms.length,
    imported: 0,
    files: [],
    missing: [],
  };

  for (const form of cfg.forms) {
    const wanted = normalizeName(form.name);
    const match = localPngs.find((item) => item.normalized === wanted);

    if (!match) {
      manifest.missing.push(form.name);
      continue;
    }

    const outputPath = path.join(outDir, `${form.name}.png`);
    const changed = copyIfNeeded(match.fullPath, outputPath);
    manifest.imported += 1;
    manifest.files.push({
      name: form.name,
      inputFile: path.relative(path.resolve(projectRoot, '..'), match.fullPath).replace(/\\/g, '/'),
      output: path.relative(path.resolve(projectRoot, '..'), outputPath).replace(/\\/g, '/'),
      updated: changed,
    });
    console.log(`[forms-1to1] importado local: ${form.name}`);
  }

  const manifestPath = path.join(outRoot, 'figma.manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (manifest.missing.length > 0) {
    console.warn('[forms-1to1] sem PNG correspondente para:');
    for (const name of manifest.missing) {
      console.warn(`- ${name}`);
    }
  }

  console.log(`[forms-1to1] concluido. importados=${manifest.imported}/${manifest.total}`);
}

main().catch((error) => {
  console.error(`[forms-1to1] erro: ${error.message}`);
  process.exit(1);
});