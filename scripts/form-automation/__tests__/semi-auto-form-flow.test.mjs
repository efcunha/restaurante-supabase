import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  loadApprovalFile,
  parseArgs,
  parseWebFormsCatalog,
} from '../semi-auto-form-flow.mjs';

function testParseArgs() {
  const parsed = parseArgs([
    'node',
    'semi-auto-form-flow.mjs',
    'plan',
    '--change-file',
    'docs/forms/requests/change-request.example.json',
    '--apply',
    '--approve-critical',
    'NovoPedidoScreen',
    '--approve-pii',
    'RegisterCompanyScreen',
    '--approve-sensitive',
    'RegisterCompanyScreen',
    '--approval-file',
    'docs/forms/requests/approval.example.json',
    '--strict-targets',
    '--run-validation',
  ]);

  assert.equal(parsed.mode, 'plan');
  assert.equal(parsed.changeFile, 'docs/forms/requests/change-request.example.json');
  assert.equal(parsed.apply, true);
  assert.equal(parsed.runValidation, true);
  assert.deepEqual(parsed.approveCritical, ['NovoPedidoScreen']);
  assert.deepEqual(parsed.approvePii, ['RegisterCompanyScreen']);
  assert.deepEqual(parsed.approveSensitive, ['RegisterCompanyScreen']);
  assert.equal(parsed.approvalFile, 'docs/forms/requests/approval.example.json');
  assert.equal(parsed.strictTargets, true);
}

function testParseWebCatalog() {
  const sample = `
    export const webFormScreens = [
      { name: 'LoginScreen', path: 'src/screens/LoginScreen.tsx', group: 'auth' },
      { name: 'NovoPedidoScreen', path: 'src/screens/NovoPedidoScreen.tsx', group: 'menu' },
    ];
  `;

  const parsed = parseWebFormsCatalog(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'LoginScreen');
  assert.equal(parsed[1].path, 'src/screens/NovoPedidoScreen.tsx');
}

function testOutputFolderCanBeCreated() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'form-flow-test-'));
  const out = path.join(root, 'tmp', 'form-automation');
  fs.mkdirSync(out, { recursive: true });
  assert.equal(fs.existsSync(out), true);
  fs.rmSync(root, { recursive: true, force: true });
}

function testLoadApprovalFileStrictValidation() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'form-flow-approval-'));
  const approvalPath = path.join(root, 'approval.json');

  fs.writeFileSync(
    approvalPath,
    JSON.stringify({
      approver: 'qa.reviewer@restaurante-web.app.br',
      approvedAt: '2026-04-15T17:00:00.000Z',
      approvedCritical: ['NovoPedidoScreen'],
      approvedPii: ['RegisterCompanyScreen'],
      approvedSensitive: ['RegisterCompanyScreen'],
    }),
    'utf8'
  );

  const parsed = loadApprovalFile(approvalPath, { strictAudit: true });
  assert.equal(parsed.approver, 'qa.reviewer@restaurante-web.app.br');
  assert.equal(parsed.approvedAt, '2026-04-15T17:00:00.000Z');
  assert.deepEqual(parsed.approvedCritical, ['NovoPedidoScreen']);

  const invalidPath = path.join(root, 'approval-invalid.json');
  fs.writeFileSync(
    invalidPath,
    JSON.stringify({ approver: 'qa.reviewer@restaurante-web.app.br' }),
    'utf8'
  );

  assert.throws(() => loadApprovalFile(invalidPath, { strictAudit: true }));
  fs.rmSync(root, { recursive: true, force: true });
}

function run() {
  testParseArgs();
  testParseWebCatalog();
  testOutputFolderCanBeCreated();
  testLoadApprovalFileStrictValidation();
  console.log('semi-auto-form-flow tests passed');
}

run();
