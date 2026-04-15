#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const payloadPathDefault = path.resolve(repoRoot, 'docs/design-system/figma-dev-resources.payload.json');

const args = process.argv.slice(2);

function readArg(name, fallback = '') {
  const idx = args.findIndex((item) => item === name);
  if (idx === -1 || idx + 1 >= args.length) {
    return fallback;
  }
  return args[idx + 1];
}

function isValidNodeId(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /^\d+:\d+$/.test(value.trim());
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function pushIssue(collection, kind, index, message) {
  collection.push({ kind, index, message });
}

function main() {
  const payloadPath = path.resolve(repoRoot, readArg('--file', payloadPathDefault));

  if (!fs.existsSync(payloadPath)) {
    console.error(`[figma-dev-resources:validate] payload not found: ${payloadPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(payloadPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`[figma-dev-resources:validate] invalid JSON: ${String(error)}`);
    process.exit(1);
  }

  const entries = Array.isArray(parsed?.entries) ? parsed.entries : null;
  if (!entries) {
    console.error('[figma-dev-resources:validate] payload.entries must be an array');
    process.exit(1);
  }

  const issues = [];
  const nodeDocsPairs = new Set();
  const resourceNameByNode = new Map();

  entries.forEach((entry, index) => {
    const nodeId = entry?.nodeId;
    const component = entry?.component;
    const docsUrl = entry?.docsUrl;
    const codePath = entry?.codePath;

    if (!isValidNodeId(nodeId)) {
      pushIssue(issues, 'invalid-node-id', index, `nodeId inválido: ${String(nodeId)}`);
    }

    if (!component || typeof component !== 'string' || !component.trim()) {
      pushIssue(issues, 'invalid-component', index, 'component ausente ou inválido');
    }

    if (!isValidHttpUrl(docsUrl)) {
      pushIssue(issues, 'invalid-docs-url', index, `docsUrl inválido: ${String(docsUrl)}`);
    }

    if (!codePath || typeof codePath !== 'string' || !codePath.trim()) {
      pushIssue(issues, 'invalid-code-path', index, 'codePath ausente ou inválido');
    }

    const pairKey = `${nodeId}::${docsUrl}`;
    if (nodeId && docsUrl) {
      if (nodeDocsPairs.has(pairKey)) {
        pushIssue(issues, 'duplicate-node-docs', index, `duplicado nodeId+docsUrl: ${pairKey}`);
      }
      nodeDocsPairs.add(pairKey);
    }

    const resourceName = `Storybook Docs: ${String(component || '').trim()}`;
    if (isValidNodeId(nodeId) && resourceName.trim()) {
      const byNode = resourceNameByNode.get(nodeId) || new Set();
      if (byNode.has(resourceName)) {
        pushIssue(issues, 'duplicate-resource-name-per-node', index, `nome de recurso duplicado no mesmo node: ${resourceName}`);
      }
      byNode.add(resourceName);
      resourceNameByNode.set(nodeId, byNode);
    }
  });

  const summary = {
    file: path.relative(repoRoot, payloadPath).replace(/\\/g, '/'),
    totalEntries: entries.length,
    issues: issues.length,
  };

  console.log('[figma-dev-resources:validate] summary');
  console.log(JSON.stringify(summary, null, 2));

  if (issues.length > 0) {
    console.log('[figma-dev-resources:validate] issues');
    console.log(JSON.stringify(issues.slice(0, 200), null, 2));
    process.exit(1);
  }

  console.log('[figma-dev-resources:validate] payload OK');
}

main();
