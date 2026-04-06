import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModule(cacheKey: string) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
  process.env.LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || '30';
  return import(`./ops-observability-settings.js?case=${cacheKey}`);
}

test('normalizeRetentionDays aplica fallback e limites seguros', async () => {
  const mod = await loadModule('normalize');

  assert.equal(mod.normalizeRetentionDays(undefined, 30), 30);
  assert.equal(mod.normalizeRetentionDays('abc', 30), 30);
  assert.equal(mod.normalizeRetentionDays('0', 30), 1);
  assert.equal(mod.normalizeRetentionDays('15.9', 30), 15);
  assert.equal(mod.normalizeRetentionDays('999999', 30), 3650);
});

test('extractOpsObservabilitySettings usa fallback do ambiente quando painel nao configurou valor', async () => {
  process.env.LOG_RETENTION_DAYS = '45';
  const mod = await loadModule('fallback-env');

  const extracted = mod.extractOpsObservabilitySettings(null);
  assert.equal(extracted.logRetentionDays, 45);
  assert.equal(extracted.source, 'env');
  assert.equal(extracted.envDefaultDays, 45);
});