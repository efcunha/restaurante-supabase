#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const inputPath = path.resolve(repoRoot, 'docs/design-system/figma-node-map.generated.json');
const outputPath = path.resolve(repoRoot, 'docs/design-system/figma-dev-resources.payload.json');

const args = process.argv.slice(2);

function readArg(name, fallback = '') {
  const index = args.findIndex((item) => item === name);
  if (index === -1 || index + 1 >= args.length) {
    return fallback;
  }
  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function normalizeNodeId(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/-/g, ':');
}

function buildPayload(entries) {
  return {
    generatedAt: new Date().toISOString(),
    source: 'docs/design-system/figma-node-map.generated.json',
    entries,
  };
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`[dev-resources-export] input not found: ${inputPath}`);
    process.exit(1);
  }

  const onlyProject = readArg('--project', '').trim();
  const includeInactive = hasFlag('--include-inactive');
  const dryRun = hasFlag('--dry-run');

  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const sourceEntries = Array.isArray(parsed.entries) ? parsed.entries : [];

  const filtered = sourceEntries.filter((entry) => {
    if (onlyProject && entry.project !== onlyProject) {
      return false;
    }

    if (!includeInactive && entry.status && entry.status !== 'active') {
      return false;
    }

    return true;
  });

  const mapped = filtered
    .map((entry) => ({
      nodeId: normalizeNodeId(entry.figmaNodeId || ''),
      component: String(entry.component || ''),
      project: String(entry.project || ''),
      docsUrl: String(entry.docsUrl || ''),
      codePath: String(entry.codePath || ''),
      status: String(entry.status || ''),
    }))
    .filter((entry) => entry.nodeId && entry.docsUrl);

  const payload = buildPayload(mapped);
  const content = JSON.stringify(payload, null, 2) + '\n';

  if (!dryRun) {
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[dev-resources-export] payload written: ${outputPath}`);
  }

  console.log(`[dev-resources-export] total entries: ${sourceEntries.length}`);
  console.log(`[dev-resources-export] filtered entries: ${filtered.length}`);
  console.log(`[dev-resources-export] exported entries: ${mapped.length}`);

  if (dryRun) {
    console.log('[dev-resources-export] dry-run enabled, no file written.');
  }
}

main();
