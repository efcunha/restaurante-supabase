#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapPath = path.join(__dirname, 'figma-node-map.generated.json');
const expectedBase = (process.env.STORYBOOK_PUBLIC_BASE_URL || 'https://restaurante-web-storybook-production.up.railway.app').replace(/\/$/, '');

function fail(message) {
  console.error(`[storybook-smoke] ${message}`);
  process.exit(1);
}

async function checkPublicUrl() {
  let res;
  try {
    res = await fetch(expectedBase, { method: 'GET', redirect: 'follow' });
  } catch (error) {
    fail(`falha ao acessar URL publica: ${expectedBase} (${String(error)})`);
  }

  if (!res.ok) {
    fail(`URL publica respondeu status nao esperado: ${res.status} ${res.statusText}`);
  }

  console.log(`[storybook-smoke] URL publica OK: ${expectedBase} (${res.status})`);
}

function checkNodeMap() {
  if (!fs.existsSync(mapPath)) {
    fail(`arquivo nao encontrado: ${mapPath}`);
  }

  const raw = fs.readFileSync(mapPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.entries)) {
    fail('campo entries ausente/invalido no node map');
  }

  const invalid = [];
  for (const [index, entry] of data.entries.entries()) {
    const docsUrl = String(entry.docsUrl || '');
    if (!docsUrl.startsWith(expectedBase)) {
      invalid.push(`entries[${index}] docsUrl fora da base esperada: ${docsUrl}`);
    }
  }

  if (invalid.length > 0) {
    fail(`drift de docsUrl detectado (${invalid.length} item(ns)). Primeiro erro: ${invalid[0]}`);
  }

  console.log(`[storybook-smoke] node map OK: ${data.entries.length} entradas usando ${expectedBase}`);
}

async function main() {
  await checkPublicUrl();
  checkNodeMap();
  console.log('[storybook-smoke] smoke concluido com sucesso.');
}

await main();
