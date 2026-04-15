#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const payloadPathDefault = path.resolve(repoRoot, 'docs/design-system/figma-dev-resources.payload.json');
const sharedNodeAllowlistPathDefault = path.resolve(
  repoRoot,
  'docs/design-system/figma-dev-resources.shared-node-allowlist.json',
);

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

function readSharedNodeAllowlist(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`[figma-dev-resources:validate] allowlist JSON inválido: ${String(error)}`);
    process.exit(1);
  }

  const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
  return entries
    .map((entry) => {
      const nodeId = typeof entry?.nodeId === 'string' ? entry.nodeId.trim() : '';
      const components = Array.isArray(entry?.components)
        ? entry.components
            .filter((value) => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

      return {
        nodeId,
        components: [...new Set(components)].sort(),
      };
    })
    .filter((entry) => isValidNodeId(entry.nodeId) && entry.components.length >= 2);
}

function main() {
  const payloadPath = path.resolve(repoRoot, readArg('--file', payloadPathDefault));
  const allowlistPath = path.resolve(
    repoRoot,
    readArg('--shared-node-allowlist', sharedNodeAllowlistPathDefault),
  );

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
  const componentsByNode = new Map();

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

      const componentName = String(component || '').trim();
      if (componentName) {
        const componentSet = componentsByNode.get(nodeId) || new Set();
        componentSet.add(componentName);
        componentsByNode.set(nodeId, componentSet);
      }
    }
  });

  const sharedNodeAllowlist = readSharedNodeAllowlist(allowlistPath);
  const allowlistByNode = new Map(
    sharedNodeAllowlist.map((entry) => [entry.nodeId, new Set(entry.components)]),
  );

  componentsByNode.forEach((componentSet, nodeId) => {
    if (componentSet.size <= 1) {
      return;
    }

    const actualComponents = [...componentSet].sort();
    const allowedComponents = allowlistByNode.get(nodeId);
    if (!allowedComponents) {
      pushIssue(
        issues,
        'duplicate-node-id-unexpected',
        -1,
        `nodeId compartilhado sem allowlist: ${nodeId} => ${actualComponents.join(' | ')}`,
      );
    }
  });

  allowlistByNode.forEach((allowedComponents, nodeId) => {
    const actualComponentsSet = componentsByNode.get(nodeId);
    if (!actualComponentsSet || actualComponentsSet.size <= 1) {
      pushIssue(
        issues,
        'duplicate-node-id-allowlist-orphan',
        -1,
        `allowlist órfã para nodeId ${nodeId}: nenhum compartilhamento ativo encontrado no payload`,
      );
      return;
    }

    const actualComponents = [...actualComponentsSet].sort();
    const isCovered =
      actualComponents.length === allowedComponents.size &&
      actualComponents.every((component) => allowedComponents.has(component));

    if (!isCovered) {
      pushIssue(
        issues,
        'duplicate-node-id-allowlist-mismatch',
        -1,
        `allowlist ${nodeId} difere do payload. atual=[${actualComponents.join(' | ')}] allowlist=[${[
          ...allowedComponents,
        ]
          .sort()
          .join(' | ')}]`,
      );
    }
  });

  const summary = {
    file: path.relative(repoRoot, payloadPath).replace(/\\/g, '/'),
    totalEntries: entries.length,
    sharedNodeIds: [...componentsByNode.values()].filter((componentSet) => componentSet.size > 1).length,
    sharedNodeAllowlistEntries: sharedNodeAllowlist.length,
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
