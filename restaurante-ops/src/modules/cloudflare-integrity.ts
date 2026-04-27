/**
 * cloudflare-integrity.ts
 * Módulo de verificação de integridade da zona Cloudflare.
 * Valida DNS, Worker routes/scripts e audit logs recentes.
 * Chamado pelo endpoint GET /api/security/cloudflare-check.
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareIntegrityConfig {
  token: string;
  accountId: string;
  zoneName: string;
  lookbackHours: number;
  allowedCnames: Set<string>;
  allowedWorkerRoutes: Set<string>;
  allowedWorkerScripts: Set<string>;
}

export interface CloudflareIntegrityResult {
  ok: boolean;
  alerts: string[];
  info: string[];
  checked_at: string;
}

interface CfApiResponse<T> {
  success: boolean;
  result: T;
  errors?: { code: number; message: string }[];
}

interface CfZone {
  id: string;
  name: string;
  status: string;
}

interface CfDnsRecord {
  name: string;
  content: string;
  type: string;
}

interface CfWorkerRoute {
  pattern: string;
  script?: string;
}

interface CfWorkerScript {
  id: string;
}

interface CfAuditLog {
  when?: string;
  action?: { type?: string; info?: string };
}

async function cfGet<T>(path: string, token: string, query?: Record<string, string>): Promise<T> {
  const url = new URL(`${CF_API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = (await res.json()) as CfApiResponse<T>;
  if (!res.ok || !body.success) {
    const errMsg =
      body.errors?.map((e) => `${e.code}:${e.message}`).join('; ') ?? String(res.status);
    throw new Error(`Cloudflare API error on ${path}: ${errMsg}`);
  }
  return body.result;
}

async function resolveZone(cfg: CloudflareIntegrityConfig): Promise<CfZone> {
  const zones = await cfGet<CfZone[]>('/zones', cfg.token, {
    name: cfg.zoneName,
    per_page: '1',
    page: '1',
  });
  const zone = Array.isArray(zones) ? zones[0] : null;
  if (!zone) throw new Error(`Cloudflare zone not found: ${cfg.zoneName}`);
  return zone;
}

async function checkDns(
  cfg: CloudflareIntegrityConfig,
  zone: CfZone,
  alerts: string[],
  info: string[],
): Promise<void> {
  const [aRecords, cnameRecords, nsRecords] = await Promise.all([
    cfGet<CfDnsRecord[]>(`/zones/${zone.id}/dns_records`, cfg.token, {
      type: 'A',
      per_page: '100',
      page: '1',
    }),
    cfGet<CfDnsRecord[]>(`/zones/${zone.id}/dns_records`, cfg.token, {
      type: 'CNAME',
      per_page: '100',
      page: '1',
    }),
    cfGet<CfDnsRecord[]>(`/zones/${zone.id}/dns_records`, cfg.token, {
      type: 'NS',
      per_page: '100',
      page: '1',
    }),
  ]);

  info.push(`DNS A count: ${aRecords.length}`);
  info.push(`DNS CNAME count: ${cnameRecords.length}`);
  info.push(`DNS NS count: ${nsRecords.length}`);

  if (aRecords.length > 0) {
    alerts.push(
      `Unexpected A records: ${aRecords.map((r) => `${r.name}=${r.content}`).join(', ')}`,
    );
  }

  if (nsRecords.length > 0) {
    alerts.push(
      `Unexpected NS records: ${nsRecords.map((r) => `${r.name}=${r.content}`).join(', ')}`,
    );
  }

  const seen = new Set(cnameRecords.map((r) => `${r.name}=${r.content}`));
  for (const pair of seen) {
    if (!cfg.allowedCnames.has(pair)) {
      alerts.push(`Unexpected CNAME target: ${pair}`);
    }
  }
  for (const expected of cfg.allowedCnames) {
    if (!seen.has(expected)) {
      alerts.push(`Expected CNAME missing: ${expected}`);
    }
  }
}

async function checkWorkers(
  cfg: CloudflareIntegrityConfig,
  zone: CfZone,
  alerts: string[],
  info: string[],
): Promise<void> {
  const [routes, scripts] = await Promise.all([
    cfGet<CfWorkerRoute[]>(`/zones/${zone.id}/workers/routes`, cfg.token),
    cfGet<CfWorkerScript[]>(`/accounts/${cfg.accountId}/workers/scripts`, cfg.token),
  ]);

  info.push(`Worker routes count: ${routes.length}`);
  info.push(`Worker scripts count: ${scripts.length}`);

  for (const route of routes) {
    const fingerprint = `${route.pattern}=>${route.script ?? ''}`;
    if (!cfg.allowedWorkerRoutes.has(fingerprint)) {
      alerts.push(`Unexpected Worker route: ${fingerprint}`);
    }
  }

  for (const script of scripts) {
    if (!cfg.allowedWorkerScripts.has(script.id)) {
      alerts.push(`Unexpected Worker script: ${script.id}`);
    }
  }
}

async function checkAuditLogs(
  cfg: CloudflareIntegrityConfig,
  alerts: string[],
  info: string[],
): Promise<void> {
  const now = Date.now();
  const minTs = now - cfg.lookbackHours * 60 * 60 * 1000;

  const logs = await cfGet<CfAuditLog[]>(`/accounts/${cfg.accountId}/audit_logs`, cfg.token, {
    per_page: '100',
    page: '1',
  });

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

  const recentSensitive = (Array.isArray(logs) ? logs : []).filter((entry) => {
    const when = Date.parse(entry.when ?? '');
    if (Number.isNaN(when) || when < minTs) return false;
    return sensitiveTypes.has(entry.action?.type ?? '');
  });

  info.push(`Recent sensitive audit events (${cfg.lookbackHours}h): ${recentSensitive.length}`);

  // Exclude delete events (our own containment actions); flag any creates/updates
  const suspicious = recentSensitive.filter((e) => {
    const t = e.action?.type ?? '';
    return t !== 'route_delete' && t !== 'script_delete' && t !== 'dns_record_delete';
  });

  if (suspicious.length > 0) {
    const compact = suspicious
      .slice(0, 10)
      .map((e) => `${e.when ?? '?'} ${e.action?.type ?? '?'} ${e.action?.info ?? ''}`)
      .join(' | ');
    alerts.push(`Sensitive changes detected in Cloudflare audit logs: ${compact}`);
  }
}

export async function runCloudflareIntegrityCheck(
  cfg: CloudflareIntegrityConfig,
): Promise<CloudflareIntegrityResult> {
  const alerts: string[] = [];
  const info: string[] = [];

  const zone = await resolveZone(cfg);
  info.push(`Zone: ${zone.name} (${zone.id}) status=${zone.status}`);

  await Promise.all([
    checkDns(cfg, zone, alerts, info),
    checkWorkers(cfg, zone, alerts, info),
    checkAuditLogs(cfg, alerts, info),
  ]);

  return {
    ok: alerts.length === 0,
    alerts,
    info,
    checked_at: new Date().toISOString(),
  };
}

/**
 * Constrói o config a partir das env vars do OpsEnv.
 * Retorna null se as credenciais não estiverem configuradas.
 */
export function buildCloudflareIntegrityCfg(env: {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_NAME?: string;
  CLOUDFLARE_AUDIT_LOOKBACK_HOURS?: number;
  CLOUDFLARE_ALLOWED_CNAMES?: string;
  CLOUDFLARE_ALLOWED_WORKER_ROUTES?: string;
  CLOUDFLARE_ALLOWED_WORKER_SCRIPTS?: string;
}): CloudflareIntegrityConfig | null {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_ZONE_NAME) {
    return null;
  }

  const parseSet = (raw: string | undefined): Set<string> =>
    new Set(
      (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

  return {
    token: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneName: env.CLOUDFLARE_ZONE_NAME,
    lookbackHours: env.CLOUDFLARE_AUDIT_LOOKBACK_HOURS ?? 6,
    allowedCnames: parseSet(env.CLOUDFLARE_ALLOWED_CNAMES),
    allowedWorkerRoutes: parseSet(env.CLOUDFLARE_ALLOWED_WORKER_ROUTES),
    allowedWorkerScripts: parseSet(env.CLOUDFLARE_ALLOWED_WORKER_SCRIPTS),
  };
}
