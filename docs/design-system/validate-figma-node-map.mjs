#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const mapPath = path.join(__dirname, 'figma-node-map.generated.json');

const REQUIRED_FIELDS = [
  'project',
  'component',
  'codePath',
  'figmaNodeId',
  'figmaUrl',
  'docsUrl',
  'owner',
  'status',
];

const NODE_ID_REGEX = /^\d+:\d+$/;
const VALID_STATUS = new Set(['active', 'deprecated']);
const REQUIRE_PUBLIC_DOCS_URL = process.env.REQUIRE_PUBLIC_DOCS_URL === 'true';

function fail(messages) {
  for (const message of messages) {
    console.error(`[figma-node-map] ${message}`);
  }
  process.exit(1);
}

function validate() {
  if (!fs.existsSync(mapPath)) {
    fail([`Arquivo nao encontrado: ${mapPath}`]);
  }

  const raw = fs.readFileSync(mapPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.entries)) {
    fail(['Campo entries deve ser um array.']);
  }

  const errors = [];
  const seenKeys = new Set();

  for (const [index, entry] of data.entries.entries()) {
    for (const field of REQUIRED_FIELDS) {
      if (!entry[field] || String(entry[field]).trim().length === 0) {
        errors.push(`entries[${index}] sem campo obrigatorio: ${field}`);
      }
    }

    if (!NODE_ID_REGEX.test(entry.figmaNodeId || '')) {
      errors.push(`entries[${index}] figmaNodeId invalido: ${entry.figmaNodeId}`);
    }

    if (!VALID_STATUS.has(entry.status)) {
      errors.push(`entries[${index}] status invalido: ${entry.status}`);
    }

    try {
      const docs = new URL(entry.docsUrl || '');
      const isHttp = docs.protocol === 'http:' || docs.protocol === 'https:';
      if (!isHttp) {
        errors.push(`entries[${index}] docsUrl deve usar http/https: ${entry.docsUrl}`);
      }
      if (REQUIRE_PUBLIC_DOCS_URL && (docs.hostname === 'localhost' || docs.hostname === '127.0.0.1')) {
        errors.push(`entries[${index}] docsUrl local nao permitido com REQUIRE_PUBLIC_DOCS_URL=true: ${entry.docsUrl}`);
      }
    } catch {
      errors.push(`entries[${index}] docsUrl invalido: ${entry.docsUrl}`);
    }

    const key = `${entry.project}::${entry.component}`;
    if (seenKeys.has(key)) {
      errors.push(`Duplicidade project+component: ${key}`);
    }
    seenKeys.add(key);

    const absoluteCodePath = path.resolve(repoRoot, entry.codePath);
    if (!fs.existsSync(absoluteCodePath)) {
      errors.push(`codePath inexistente: ${entry.codePath}`);
    }
  }

  if (errors.length > 0) {
    fail(errors);
  }

  console.log(`[figma-node-map] OK: ${data.entries.length} entradas validadas.`);
}

validate();
