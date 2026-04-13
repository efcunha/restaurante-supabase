#!/usr/bin/env node
/**
 * Figma Bootstrap
 *
 * Automates setup from a Figma URL:
 * 1) Extract FIGMA_FILE_KEY from URL
 * 2) Run scripts/figma-sync.mjs
 *
 * Usage:
 *   node scripts/figma-bootstrap.mjs --url "https://www.figma.com/design/FILE_KEY/Name?node-id=1-1"
 *   node scripts/figma-bootstrap.mjs --url "..." --token "figd_xxx"
 *   node scripts/figma-bootstrap.mjs --url "..." --node-map docs/design-system/figma-node-map.example.json
 *   node scripts/figma-bootstrap.mjs --url "..." --skip-parse
 */

import { spawnSync } from 'child_process';

function parseArgs(argv) {
  const out = {
    url: '',
    token: '',
    nodeMap: '',
    runParse: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--help' || current === '-h') out.help = true;
    else if (current === '--skip-parse') out.runParse = false;
    else if (current === '--url') out.url = argv[i + 1] || '';
    else if (current.startsWith('--url=')) out.url = current.split('=')[1] || '';
    else if (current === '--token') out.token = argv[i + 1] || '';
    else if (current.startsWith('--token=')) out.token = current.split('=')[1] || '';
    else if (current === '--node-map') out.nodeMap = argv[i + 1] || '';
    else if (current.startsWith('--node-map=')) out.nodeMap = current.split('=')[1] || '';
  }

  return out;
}

function usage() {
  console.log('Usage:');
  console.log('  node scripts/figma-bootstrap.mjs --url "https://www.figma.com/design/FILE_KEY/Name?node-id=1-1"');
  console.log('  node scripts/figma-bootstrap.mjs --url "..." --token "figd_xxx"');
  console.log('  node scripts/figma-bootstrap.mjs --url "..." --node-map docs/design-system/figma-node-map.example.json');
  console.log('  node scripts/figma-bootstrap.mjs --url "..." --skip-parse');
}

function isLikelyFigmaToken(value) {
  return typeof value === 'string' && /^figd_[A-Za-z0-9_-]{10,}$/.test(value);
}

function extractFileKey(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // /design/:fileKey/:fileName
    const designIdx = parts.indexOf('design');
    if (designIdx >= 0 && parts[designIdx + 1]) return parts[designIdx + 1];
    // /file/:fileKey/:fileName (legacy)
    const fileIdx = parts.indexOf('file');
    if (fileIdx >= 0 && parts[fileIdx + 1]) return parts[fileIdx + 1];
    // /board/:fileKey/:fileName (figjam)
    const boardIdx = parts.indexOf('board');
    if (boardIdx >= 0 && parts[boardIdx + 1]) return parts[boardIdx + 1];
    // /make/:fileKey/:fileName
    const makeIdx = parts.indexOf('make');
    if (makeIdx >= 0 && parts[makeIdx + 1]) return parts[makeIdx + 1];
    return '';
  } catch {
    return '';
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  if (!args.url) {
    console.error('ERROR: missing --url');
    usage();
    process.exit(1);
  }

  const fileKey = extractFileKey(args.url);
  if (!fileKey) {
    console.error('ERROR: could not extract FIGMA_FILE_KEY from URL');
    process.exit(1);
  }

  if (args.token && !isLikelyFigmaToken(args.token)) {
    console.error('ERROR: invalid --token value. Expected a Figma personal access token starting with "figd_".');
    console.error('Hint: if you passed a FILE_KEY by mistake, remove --token and keep only --url.');
    process.exit(1);
  }

  console.log(`Figma URL parsed successfully.`);
  console.log(`FIGMA_FILE_KEY=${fileKey}`);

  const syncArgs = ['scripts/figma-sync.mjs', '--file-key', fileKey];
  if (args.token) syncArgs.push('--token', args.token);
  if (args.nodeMap) syncArgs.push('--node-map', args.nodeMap);
  if (!args.runParse) syncArgs.push('--skip-parse');

  const result = spawnSync('node', syncArgs, { stdio: 'inherit', shell: true });
  process.exit(result.status ?? 1);
}

main();
