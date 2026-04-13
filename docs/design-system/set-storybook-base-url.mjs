#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapPath = path.join(__dirname, 'figma-node-map.generated.json');

function usage() {
  console.error('Uso: node docs/design-system/set-storybook-base-url.mjs <baseUrl>');
  console.error('Exemplo: node docs/design-system/set-storybook-base-url.mjs https://storybook.exemplo.com');
}

function normalizeBaseUrl(baseUrlRaw) {
  let parsed;
  try {
    parsed = new URL(baseUrlRaw);
  } catch {
    throw new Error(`baseUrl invalida: ${baseUrlRaw}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`baseUrl deve usar http/https: ${baseUrlRaw}`);
  }

  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function main() {
  const baseUrlArg = process.argv[2];
  if (!baseUrlArg) {
    usage();
    process.exit(1);
  }

  if (!fs.existsSync(mapPath)) {
    console.error(`Arquivo nao encontrado: ${mapPath}`);
    process.exit(1);
  }

  const baseUrl = normalizeBaseUrl(baseUrlArg);
  const raw = fs.readFileSync(mapPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.entries)) {
    console.error('Campo entries ausente/invalido em figma-node-map.generated.json');
    process.exit(1);
  }

  let changed = 0;
  for (const entry of data.entries) {
    const current = String(entry.docsUrl || '');
    try {
      const currentUrl = new URL(current);
      const next = `${baseUrl}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (next !== current) {
        entry.docsUrl = next;
        changed += 1;
      }
    } catch {
      console.error(`docsUrl invalido encontrado, sem alteracao: ${current}`);
      process.exit(1);
    }
  }

  data.generatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(mapPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.log(`[figma-node-map] docsUrl base atualizada para ${baseUrl} em ${changed} entradas.`);
}

main();
