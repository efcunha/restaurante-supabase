#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapPath = path.join(__dirname, 'figma-node-map.generated.json');
const operationsGuidePath = 'docs/design-system/STORYBOOK_OPERATIONS_GUIDE.md';
const expectedBase = (process.env.STORYBOOK_PUBLIC_BASE_URL || 'https://restaurante-web-storybook-production.up.railway.app').replace(/\/$/, '');
const authUser = process.env.STORYBOOK_PUBLIC_BASIC_AUTH_USER || '';
const authPass = process.env.STORYBOOK_PUBLIC_BASIC_AUTH_PASS || '';
const strictAuth = (process.env.STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH || 'false').toLowerCase() === 'true';

function fail(message) {
  console.error(`[storybook-smoke] ${message}`);
  process.exit(1);
}

function buildHeaders() {
  if (!authUser && !authPass) {
    return undefined;
  }

  const token = Buffer.from(`${authUser}:${authPass}`, 'utf8').toString('base64');
  return {
    Authorization: `Basic ${token}`,
  };
}

async function checkPublicUrl() {
  let res;
  try {
    res = await fetch(expectedBase, {
      method: 'GET',
      redirect: 'follow',
      headers: buildHeaders(),
    });
  } catch (error) {
    fail(`falha ao acessar URL publica: ${expectedBase} (${String(error)})`);
  }

  if (res.status === 401) {
    if (!authUser && !authPass) {
      if (strictAuth) {
        fail(
          'URL publica retornou 401 sem credenciais e o modo estrito esta ativo. Configure STORYBOOK_PUBLIC_BASIC_AUTH_USER/PASS ou desative STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH.',
        );
      }
      console.log('[storybook-smoke] URL publica protegida por Basic Auth (401) sem credenciais configuradas; endpoint acessivel e protegido.');
      return;
    }
    fail('URL publica retornou 401 mesmo com Basic Auth configurado. Verifique as credenciais.');
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
  console.log(`[storybook-smoke] runbook: ${operationsGuidePath}`);
}

await main();
