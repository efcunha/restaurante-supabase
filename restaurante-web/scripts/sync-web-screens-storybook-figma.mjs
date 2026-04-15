#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');
const screensRoot = path.join(webRoot, 'src', 'screens');
const registryPath = path.join(screensRoot, 'storybook', 'screensRegistry.generated.ts');
const storiesPath = path.join(screensRoot, 'storybook', 'ScreensCatalogByScreen.generated.stories.tsx');
const mapPath = path.join(repoRoot, 'docs', 'design-system', 'figma-node-map.generated.json');

const BASE_STORYBOOK_DOCS = 'https://restaurante-web-storybook-production.up.railway.app';
const FIGMA_FILE_URL = 'https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System';
const CHECK_ONLY = process.argv.includes('--check');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relDir = toPosixRelative(path.dirname(absolute), screensRoot);
    if (relDir.startsWith('storybook')) {
      continue;
    }
    if (entry.isDirectory()) {
      result.push(...walk(absolute));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith('.tsx')) {
      continue;
    }
    if (entry.name.endsWith('.stories.tsx') || entry.name.endsWith('.figma.tsx')) {
      continue;
    }
    result.push(absolute);
  }
  return result;
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function toPosixRelative(absolutePath, basePath) {
  return normalizeSlashes(path.relative(basePath, absolutePath));
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function classifyGroup(relPath, screenName) {
  if (screenName === 'LoginScreen' || screenName === 'RegisterCompanyScreen' || screenName === 'ResetPasswordScreen' || screenName === 'AboutScreen') {
    return 'auth';
  }
  if (relPath.includes('/admin/menu/')) {
    return 'admin-menu';
  }
  if (screenName.includes('Admin') || screenName.includes('Configuracoes') || screenName === 'ConfiguracoesWhatsApp') {
    return 'admin';
  }
  if (
    screenName.includes('Caixa') ||
    screenName.includes('Finance') ||
    screenName.includes('CashFlow') ||
    screenName.includes('Billing') ||
    screenName.includes('Pagamento') ||
    screenName.includes('CancellationReport')
  ) {
    return 'finance';
  }
  if (screenName.includes('Delivery') || screenName.includes('Rotas')) {
    return 'delivery';
  }
  if (
    screenName.includes('Pedido') ||
    screenName.includes('Comanda') ||
    screenName.includes('Cardapio') ||
    screenName.includes('Estoque') ||
    screenName.includes('Cozinha') ||
    screenName.includes('Montagem') ||
    screenName.includes('MapaMesas') ||
    screenName.includes('Reservas') ||
    screenName.includes('Printer') ||
    screenName.includes('Operational') ||
    screenName.includes('PublicMenu')
  ) {
    return 'operations';
  }
  return 'other';
}

function buildRegistry(screenFiles) {
  const rows = screenFiles.map((absolutePath) => {
    const relFromScreens = toPosixRelative(absolutePath, screensRoot);
    const screenName = path.basename(absolutePath, '.tsx');
    const pathFromSrc = `src/screens/${relFromScreens}`;
    return {
      name: screenName,
      path: pathFromSrc,
      group: classifyGroup(pathFromSrc, screenName),
    };
  });

  rows.sort((a, b) => a.path.localeCompare(b.path));
  return rows;
}

function renderRegistryFile(rows) {
  const items = rows
    .map((row) => `  { name: '${row.name}', path: '${row.path}', group: '${row.group}' },`)
    .join('\n');

  return `export type WebScreenEntry = {\n  name: string;\n  path: string;\n  group: 'auth' | 'admin' | 'admin-menu' | 'finance' | 'delivery' | 'operations' | 'other';\n};\n\nexport const webScreenEntries: WebScreenEntry[] = [\n${items}\n];\n\nexport const webScreenEntriesTotal = webScreenEntries.length;\n`;
}

function renderStoriesFile(rows) {
  const storyExports = rows
    .map((row) => `export const ${row.name}: Story = { args: { onlyScreenName: '${row.name}' } };`)
    .join('\n');

  return `import type { Meta, StoryObj } from '@storybook/react-webpack5';\nimport { ScreensCatalog } from './ScreensCatalog';\n\nconst meta: Meta<typeof ScreensCatalog> = {\n  title: 'Screens/RestauranteWeb/ByScreen',\n  component: ScreensCatalog,\n  tags: ['autodocs'],\n  parameters: {\n    layout: 'fullscreen',\n  },\n};\n\nexport default meta;\n\ntype Story = StoryObj<typeof ScreensCatalog>;\n\n${storyExports}\n`;
}

function updateNodeMap(rows) {
  const raw = fs.readFileSync(mapPath, 'utf8');
  const data = JSON.parse(raw);

  data.entries = data.entries.filter(
    (entry) => !(entry.project === 'restaurante-web' && String(entry.component || '').startsWith('Screen:')),
  );

  const additions = rows.map((row, idx) => {
    const nodePart = idx + 1;
    const figmaNodeId = `99:${nodePart}`;
    const storyId = `screens-restaurante-web-by-screen--${toKebabCase(row.name)}`;
    return {
      project: 'restaurante-web',
      component: `Screen:${row.name}`,
      codePath: 'restaurante-web/src/screens/storybook/ScreensCatalog.figma.tsx',
      figmaNodeId,
      figmaUrl: `${FIGMA_FILE_URL}?node-id=99-${nodePart}`,
      docsUrl: `${BASE_STORYBOOK_DOCS}/?path=/story/${storyId}`,
      owner: 'frontend-team',
      status: 'active',
    };
  });

  data.entries.push(...additions);
  return JSON.stringify(data, null, 2) + '\n';
}

function writeIfChanged(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (existing === content) {
    return false;
  }
  if (!CHECK_ONLY) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return true;
}

function main() {
  const screenFiles = walk(screensRoot);
  const registry = buildRegistry(screenFiles);

  const registryContent = renderRegistryFile(registry);
  const storiesContent = renderStoriesFile(registry);
  const mapContent = updateNodeMap(registry);

  const registryChanged = writeIfChanged(registryPath, registryContent);
  const storiesChanged = writeIfChanged(storiesPath, storiesContent);
  const mapChanged = writeIfChanged(mapPath, mapContent);

  const changed = [registryChanged, storiesChanged, mapChanged].some(Boolean);

  if (CHECK_ONLY) {
    if (changed) {
      console.error('[screens-sync] Arquivos desatualizados. Execute: npm run screens:sync');
      process.exit(1);
    }
    console.log(`[screens-sync] OK. ${registry.length} telas sincronizadas.`);
    return;
  }

  console.log(`[screens-sync] Sync concluido. ${registry.length} telas mapeadas.`);
}

main();
