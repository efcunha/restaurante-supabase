#!/usr/bin/env node
/**
 * Figma Code Connect runner (cross-platform)
 *
 * Actions:
 * - parse: run parse for all projects
 * - publish: run dry-run + attempt real publish; if token lacks scope, fallback to dry-run-only
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const projects = ['restaurante-app', 'restaurante-web', 'restaurante-site'];

function parseArgs(argv) {
  const args = {
    action: 'parse',
    fileKey: '',
    token: '',
  };

  if (argv[0] && !argv[0].startsWith('--')) {
    args.action = argv[0];
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--file-key') args.fileKey = argv[i + 1] || '';
    else if (current.startsWith('--file-key=')) args.fileKey = current.split('=')[1] || '';
    else if (current === '--token') args.token = argv[i + 1] || '';
    else if (current.startsWith('--token=')) args.token = current.split('=')[1] || '';
  }

  return args;
}

function readEnvValue(envPath, key) {
  if (!existsSync(envPath)) return '';
  const content = readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${key}=(.*)$`, 'm');
  const match = content.match(re);
  return match ? match[1].trim() : '';
}

function runCommand(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = `${stdout}\n${stderr}`;

  return {
    code: result.status ?? 1,
    stdout,
    stderr,
    combined,
  };
}

function logHeader(action, fileKey) {
  console.log('============================================');
  console.log(`  Figma Code Connect - ${action}`);
  console.log('============================================');
  if (fileKey) {
    console.log(`  File Key: ${fileKey}`);
  }
  console.log('');
}

function printProjectHeader(project) {
  console.log('--------------------------------------------');
  console.log(`  ${project}`);
  console.log('--------------------------------------------');
}

function runParse(project, token) {
  return runCommand(
    'npx',
    ['figma', 'connect', 'parse', '-c', 'figma.config.json'],
    join(root, project),
    { FIGMA_ACCESS_TOKEN: token }
  );
}

function runPublishDry(project, token) {
  return runCommand(
    'npx',
    ['figma', 'connect', 'publish', '--dry-run', '-c', 'figma.config.json'],
    join(root, project),
    { FIGMA_ACCESS_TOKEN: token }
  );
}

function runPublishReal(project, token) {
  return runCommand(
    'npx',
    ['figma', 'connect', 'publish', '-c', 'figma.config.json'],
    join(root, project),
    { FIGMA_ACCESS_TOKEN: token }
  );
}

function hasScopeError(output) {
  return /invalid scope\(s\)|code connect write|file read/i.test(output);
}

function saveStatusReport(rows) {
  const outputPath = join(root, 'docs', 'design-system', 'figma-publish-status.json');
  const payload = {
    generated_at: new Date().toISOString(),
    projects: rows,
  };
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  return outputPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const webEnvPath = join(root, 'restaurante-web', '.env.local');
  const token = args.token || readEnvValue(webEnvPath, 'FIGMA_TOKEN');
  const fileKey = args.fileKey || readEnvValue(webEnvPath, 'FIGMA_FILE_KEY');

  if (!token) {
    console.error('ERROR: FIGMA_TOKEN not found.');
    process.exit(1);
  }

  const action = args.action === 'publish' ? 'publish' : 'parse';
  logHeader(action, fileKey);

  const rows = [];
  let hardFailures = 0;

  for (const project of projects) {
    printProjectHeader(project);

    if (action === 'parse') {
      const parseResult = runParse(project, token);
      process.stdout.write(parseResult.stdout);
      process.stderr.write(parseResult.stderr);

      const ok = parseResult.code === 0;
      rows.push({ project, action: 'parse', status: ok ? 'ok' : 'failed' });
      if (!ok) hardFailures += 1;
      console.log('');
      continue;
    }

    const dry = runPublishDry(project, token);
    process.stdout.write(dry.stdout);
    process.stderr.write(dry.stderr);

    if (dry.code !== 0) {
      rows.push({ project, action: 'publish', status: 'failed-dry-run' });
      hardFailures += 1;
      console.log('');
      continue;
    }

    const real = runPublishReal(project, token);
    process.stdout.write(real.stdout);
    process.stderr.write(real.stderr);

    if (real.code === 0) {
      rows.push({ project, action: 'publish', status: 'published' });
      console.log('');
      continue;
    }

    if (hasScopeError(real.combined)) {
      rows.push({
        project,
        action: 'publish',
        status: 'dry-run-only',
        reason: 'missing-token-scope',
      });
      console.log('INFO: scope de token insuficiente para publish real; fallback para dry-run-only aplicado.');
      console.log('');
      continue;
    }

    rows.push({ project, action: 'publish', status: 'failed-real-publish' });
    hardFailures += 1;
    console.log('');
  }

  console.log('============================================');
  console.log('  Summary');
  console.log('============================================');
  for (const row of rows) {
    const reason = row.reason ? ` (${row.reason})` : '';
    console.log(`- ${row.project}: ${row.status}${reason}`);
  }

  const reportPath = saveStatusReport(rows);
  console.log(`Status report: ${reportPath}`);

  if (hardFailures > 0) process.exit(1);
  process.exit(0);
}

main();
