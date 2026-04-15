#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const configPath = path.join(projectRoot, 'scripts', 'forms-1to1.config.json');

const storybookDir = path.join(workspaceRoot, 'docs', 'design-system', 'figma-1to1', 'storybook');
const inboxDir = path.join(workspaceRoot, 'docs', 'design-system', 'figma-1to1', 'inbox');
const figmaDir = path.join(workspaceRoot, 'docs', 'design-system', 'figma-1to1', 'figma');
const manifestPath = path.join(workspaceRoot, 'docs', 'design-system', 'figma-1to1', 'figma.seed.manifest.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadForms() {
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.forms)) {
    throw new Error('forms-1to1.config.json invalido: forms ausente.');
  }
  return parsed.forms.map((form) => form.name);
}

function copyFile(sourcePath, targetPath) {
  const sourceBuffer = fs.readFileSync(sourcePath);
  if (fs.existsSync(targetPath)) {
    const targetBuffer = fs.readFileSync(targetPath);
    if (sourceBuffer.equals(targetBuffer)) {
      return false;
    }
  }
  fs.writeFileSync(targetPath, sourceBuffer);
  return true;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  if (hasFlag('--help')) {
    console.log('Uso: node scripts/seed-figma-1to1-from-storybook.mjs');
    console.log('Sem flags: copia para inbox e figma.');
    console.log('Flags opcionais: --only-inbox, --only-figma');
    return;
  }

  const onlyInbox = hasFlag('--only-inbox');
  const onlyFigma = hasFlag('--only-figma');

  if (onlyInbox && onlyFigma) {
    throw new Error('Use apenas uma flag de alvo por execucao.');
  }

  const copyToInbox = !onlyFigma;
  const copyToFigma = !onlyInbox;

  ensureDir(inboxDir);
  ensureDir(figmaDir);

  const forms = loadForms();

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'storybook-seed',
    targets: {
      inbox: copyToInbox,
      figma: copyToFigma,
    },
    total: forms.length,
    copied: 0,
    unchanged: 0,
    missing: [],
    files: [],
  };

  for (const name of forms) {
    const fileName = `${name}.png`;
    const sourcePath = path.join(storybookDir, fileName);

    if (!fs.existsSync(sourcePath)) {
      manifest.missing.push(fileName);
      continue;
    }

    const item = {
      name,
      source: path.relative(workspaceRoot, sourcePath).replace(/\\/g, '/'),
    };

    if (copyToInbox) {
      const inboxPath = path.join(inboxDir, fileName);
      const changed = copyFile(sourcePath, inboxPath);
      item.inbox = {
        output: path.relative(workspaceRoot, inboxPath).replace(/\\/g, '/'),
        updated: changed,
      };
      if (changed) {
        manifest.copied += 1;
      } else {
        manifest.unchanged += 1;
      }
    }

    if (copyToFigma) {
      const figmaPath = path.join(figmaDir, fileName);
      const changed = copyFile(sourcePath, figmaPath);
      item.figma = {
        output: path.relative(workspaceRoot, figmaPath).replace(/\\/g, '/'),
        updated: changed,
      };
      if (changed) {
        manifest.copied += 1;
      } else {
        manifest.unchanged += 1;
      }
    }

    manifest.files.push(item);
    console.log(`[forms-1to1] seed aplicado: ${name}`);
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (manifest.missing.length > 0) {
    console.warn('[forms-1to1] arquivos ausentes no storybook:');
    for (const missing of manifest.missing) {
      console.warn(`- ${missing}`);
    }
  }

  console.log(`[forms-1to1] seed concluido. copied=${manifest.copied} unchanged=${manifest.unchanged}`);
}

main().catch((error) => {
  console.error(`[forms-1to1] erro: ${error.message}`);
  process.exit(1);
});