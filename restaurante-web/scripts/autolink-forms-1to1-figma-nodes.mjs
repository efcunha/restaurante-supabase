#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'scripts', 'forms-1to1.config.json');

const token = process.env.FIGMA_ACCESS_TOKEN;

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo nao encontrado: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.figmaFileKey || !Array.isArray(parsed.forms)) {
    throw new Error('forms-1to1.config.json invalido.');
  }
  return parsed;
}

async function fetchFigmaFile(fileKey) {
  const url = `https://api.figma.com/v1/files/${fileKey}`;
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar Figma (${response.status}).`);
  }

  return response.json();
}

function collectNodes(root) {
  const out = [];

  function walk(node, pageName = '') {
    if (!node) {
      return;
    }

    const currentPage = node.type === 'CANVAS' ? node.name : pageName;

    const candidateTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP']);
    if (candidateTypes.has(node.type)) {
      out.push({
        id: node.id,
        name: node.name,
        type: node.type,
        pageName: currentPage,
      });
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child, currentPage);
      }
    }
  }

  walk(root, '');
  return out;
}

function chooseBestMatch(matches) {
  if (matches.length === 1) {
    return matches[0];
  }

  const pagePreferred = matches.filter((m) => /1to1|1:1|forms|formularios/i.test(m.pageName || ''));
  if (pagePreferred.length === 1) {
    return pagePreferred[0];
  }

  return null;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: node scripts/autolink-forms-1to1-figma-nodes.mjs');
    console.log('Env obrigatoria: FIGMA_ACCESS_TOKEN');
    return;
  }

  if (!token) {
    throw new Error('Defina FIGMA_ACCESS_TOKEN para autolink dos node IDs.');
  }

  const cfg = loadConfig();
  const fileData = await fetchFigmaFile(cfg.figmaFileKey);
  const nodes = collectNodes(fileData.document);

  let linked = 0;
  const unresolved = [];

  for (const form of cfg.forms) {
    const target = normalizeName(form.name);

    const exactMatches = nodes.filter((n) => normalizeName(n.name) === target);
    const chosen = chooseBestMatch(exactMatches);

    if (chosen) {
      form.figmaNodeId = chosen.id;
      linked += 1;
    } else {
      unresolved.push(form.name);
    }
  }

  fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');

  console.log(`[forms-1to1] autolink concluido. linked=${linked}/${cfg.forms.length}`);
  if (unresolved.length > 0) {
    console.log('[forms-1to1] sem match unico para:');
    for (const name of unresolved) {
      console.log(`- ${name}`);
    }
  }
}

main().catch((error) => {
  console.error(`[forms-1to1] erro: ${error.message}`);
  process.exit(1);
});
