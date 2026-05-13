#!/usr/bin/env node

const API_BASE = 'https://api.cloudflare.com/client/v4';

const requiredEnv = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_NAME'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[ERROR] Missing required env: ${key}`);
    process.exit(2);
  }
}

const cfg = {
  token: process.env.CLOUDFLARE_API_TOKEN,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  zoneName: process.env.CLOUDFLARE_ZONE_NAME,
  lookbackHours: Number(process.env.CLOUDFLARE_AUDIT_LOOKBACK_HOURS || '1'),
  allowedCnames: new Set(
    (
      process.env.CLOUDFLARE_ALLOWED_CNAMES ||
      [
        'restaurante-web.app.br=xy9xiv5i.up.railway.app',
        'www.restaurante-web.app.br=mjaqusj2.up.railway.app',
        'ops.restaurante-web.app.br=etb2td77.up.railway.app',
      ].join(',')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  allowedWorkerRoutes: new Set(
    (process.env.CLOUDFLARE_ALLOWED_WORKER_ROUTES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  allowedWorkerScripts: new Set(
    (process.env.CLOUDFLARE_ALLOWED_WORKER_SCRIPTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
};

const state = {
  alerts: [],
  info: [],
};

async function cf(path, query = undefined) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    const err = body?.errors?.map((e) => `${e.code}:${e.message}`).join('; ') || `${res.status}`;
    throw new Error(`Cloudflare API failed on ${path}: ${err}`);
  }
  return body;
}

function pushAlert(msg) {
  state.alerts.push(msg);
}

function pushInfo(msg) {
  state.info.push(msg);
}

async function getZone() {
  const data = await cf('/zones', { name: cfg.zoneName, per_page: 1, page: 1 });
  const zone = Array.isArray(data.result) ? data.result[0] : null;
  if (!zone) throw new Error(`Zone not found: ${cfg.zoneName}`);
  return zone;
}

async function getDnsRecords(zoneId, type) {
  const data = await cf(`/zones/${zoneId}/dns_records`, { type, per_page: 100, page: 1 });
  return Array.isArray(data.result) ? data.result : [];
}

async function checkDns(zone) {
  const [aRecords, cnameRecords, nsRecords] = await Promise.all([
    getDnsRecords(zone.id, 'A'),
    getDnsRecords(zone.id, 'CNAME'),
    getDnsRecords(zone.id, 'NS'),
  ]);

  pushInfo(`DNS A count: ${aRecords.length}`);
  pushInfo(`DNS CNAME count: ${cnameRecords.length}`);
  pushInfo(`DNS NS count: ${nsRecords.length}`);

  if (aRecords.length > 0) {
    pushAlert(
      `Unexpected A records found: ${aRecords.map((r) => `${r.name}=${r.content}`).join(', ')}`,
    );
  }

  if (nsRecords.length > 0) {
    pushAlert(
      `Unexpected NS records found in zone: ${nsRecords.map((r) => `${r.name}=${r.content}`).join(', ')}`,
    );
  }

  const seen = new Set(cnameRecords.map((r) => `${r.name}=${r.content}`));
  for (const pair of seen) {
    if (!cfg.allowedCnames.has(pair)) {
      pushAlert(`Unexpected CNAME target: ${pair}`);
    }
  }

  for (const expected of cfg.allowedCnames) {
    if (!seen.has(expected)) {
      pushAlert(`Expected CNAME missing: ${expected}`);
    }
  }
}

async function checkWorkers(zone) {
  const [routesRes, scriptsRes] = await Promise.all([
    cf(`/zones/${zone.id}/workers/routes`),
    cf(`/accounts/${cfg.accountId}/workers/scripts`),
  ]);

  const routes = Array.isArray(routesRes.result) ? routesRes.result : [];
  const scripts = Array.isArray(scriptsRes.result) ? scriptsRes.result : [];

  pushInfo(`Worker routes count: ${routes.length}`);
  pushInfo(`Worker scripts count: ${scripts.length}`);

  for (const route of routes) {
    const fingerprint = `${route.pattern}=>${route.script || ''}`;
    if (!cfg.allowedWorkerRoutes.has(fingerprint)) {
      pushAlert(`Unexpected Worker route: ${fingerprint}`);
    }
  }

  for (const script of scripts) {
    const scriptId = script.id;
    if (!cfg.allowedWorkerScripts.has(scriptId)) {
      pushAlert(`Unexpected Worker script present: ${scriptId}`);
    }
  }
}

async function checkAudit() {
  const now = Date.now();
  const minTs = now - cfg.lookbackHours * 60 * 60 * 1000;
  const data = await cf(`/accounts/${cfg.accountId}/audit_logs`, { per_page: 100, page: 1 });
  const logs = Array.isArray(data.result) ? data.result : [];

  const sensitiveTypes = new Set([
    'route_create',
    'route_update',
    'route_delete',
    'script_create',
    'script_update',
    'script_delete',
    'script_deploy',
    'dns_record_create',
    'dns_record_update',
    'dns_record_delete',
  ]);

  const recentSensitive = logs.filter((entry) => {
    const when = Date.parse(entry.when || '');
    if (Number.isNaN(when) || when < minTs) return false;
    const type = entry?.action?.type;
    return sensitiveTypes.has(type);
  });

  pushInfo(`Recent sensitive audit events (${cfg.lookbackHours}h): ${recentSensitive.length}`);

  const suspicious = recentSensitive.filter((entry) => {
    const type = entry?.action?.type;
    if (type === 'route_delete' || type === 'script_delete') return false;
    return true;
  });

  if (suspicious.length > 0) {
    const compact = suspicious
      .slice(0, 10)
      .map((e) => `${e.when} ${e.action?.type} ${e.action?.info || ''}`)
      .join(' | ');
    pushAlert(`Recent sensitive changes detected in audit logs: ${compact}`);
  }
}

async function main() {
  const zone = await getZone();
  pushInfo(`Zone found: ${zone.name} (${zone.id}) status=${zone.status}`);
  await checkDns(zone);
  await checkWorkers(zone);
  await checkAudit();

  for (const line of state.info) console.log(`[INFO] ${line}`);

  if (state.alerts.length > 0) {
    for (const line of state.alerts) console.error(`[ALERT] ${line}`);
    process.exit(1);
  }

  console.log('[OK] Cloudflare integrity check passed.');
}

main().catch((err) => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(2);
});
