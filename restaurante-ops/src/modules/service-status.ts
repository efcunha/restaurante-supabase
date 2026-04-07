import { buildEnv } from '../config/env.js';
import { supabase } from '../auth/supabase.js';

const env = buildEnv();

type HealthMethod = 'GET' | 'HEAD';

export interface MonitoredServiceConfig {
  service_key: string;
  service_name: string;
  base_url: string;
  health_path: string;
  method: HealthMethod;
  timeout_ms: number;
  enabled: boolean;
  display_order: number;
  expected_status_min: number;
  expected_status_max: number;
}

export interface ServiceStatus {
  name: string;
  key?: string;
  status: 'online' | 'offline' | 'unknown';
  responseTime?: number;
  url?: string;
  statusCode?: number;
  detail?: string;
}

function normalizeBaseUrl(url: string | undefined): string {
  const raw = String(url || '').trim();
  return raw.replace(/\/+$/, '');
}

function normalizeHealthPath(path: string | undefined): string {
  const raw = String(path || '/').trim();
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function normalizeMonitoredEndpointInput(baseUrl: string, healthPath: string): { baseUrl: string; healthPath: string } {
  const rawBase = normalizeBaseUrl(baseUrl);
  const rawHealth = normalizeHealthPath(healthPath);

  // Permite que o usuário informe URL completa com path no campo base_url
  // (ex: https://host/manager/) e converte para base_url=origin + health_path=/manager.
  try {
    const parsed = new URL(rawBase);
    const origin = parsed.origin;
    const parsedPath = normalizeHealthPath(parsed.pathname || '/');

    if (parsedPath !== '/') {
      if (rawHealth === '/') {
        return { baseUrl: origin, healthPath: parsedPath };
      }

      // Evita duplicacao quando o path ja foi informado em ambos os campos.
      if (rawHealth === parsedPath || rawHealth.startsWith(`${parsedPath}/`)) {
        return { baseUrl: origin, healthPath: rawHealth };
      }

      const mergedPath = normalizeHealthPath(`${parsedPath}${rawHealth}`);
      return { baseUrl: origin, healthPath: mergedPath };
    }

    return { baseUrl: origin, healthPath: rawHealth };
  } catch {
    // Mantém comportamento anterior quando a URL não é parseável.
    return { baseUrl: rawBase, healthPath: rawHealth };
  }
}

const LEGACY_EVOLUTION_HOSTS = new Set([
  'evolution-api-production-9ac1.up.railway.app',
]);

const FALLBACK_EVOLUTION_CANONICAL_BASE_URL = 'https://evolution-api-production-203d4.up.railway.app/manager';

function resolveCanonicalEvolutionBaseUrl(): string {
  const envValue = String(env.EVOLUTION_API_BASE_URL || '').trim();
  if (!envValue) {
    return FALLBACK_EVOLUTION_CANONICAL_BASE_URL;
  }

  try {
    const parsed = new URL(envValue);
    if (LEGACY_EVOLUTION_HOSTS.has(parsed.host.toLowerCase())) {
      return FALLBACK_EVOLUTION_CANONICAL_BASE_URL;
    }
  } catch {
    // Se a env estiver invalida, mantemos fallback canonico seguro.
    return FALLBACK_EVOLUTION_CANONICAL_BASE_URL;
  }

  return envValue;
}

function applyEvolutionLegacyHostGuard(
  serviceKey: string,
  baseUrl: string,
  healthPath: string,
): { baseUrl: string; healthPath: string } {
  if (serviceKey !== 'evolution-api') {
    return { baseUrl, healthPath };
  }

  try {
    const parsed = new URL(baseUrl);
    if (!LEGACY_EVOLUTION_HOSTS.has(parsed.host.toLowerCase())) {
      return { baseUrl, healthPath };
    }

    const canonicalRawBaseUrl = resolveCanonicalEvolutionBaseUrl();
    return normalizeMonitoredEndpointInput(canonicalRawBaseUrl, '/');
  } catch {
    return { baseUrl, healthPath };
  }
}

function buildHealthUrl(baseUrl: string, healthPath: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = normalizeHealthPath(healthPath);
  if (!normalizedBase) return '';
  return `${normalizedBase}${normalizedPath}`;
}

function getDefaultMonitoredServices(): MonitoredServiceConfig[] {
  const defaults: MonitoredServiceConfig[] = [
    {
      service_key: 'restaurante-ops',
      service_name: 'restaurante-ops',
      base_url: normalizeBaseUrl(env.OPS_PUBLIC_BASE_URL),
      health_path: '/healthz',
      method: 'GET',
      timeout_ms: 5000,
      enabled: true,
      display_order: 10,
      expected_status_min: 200,
      expected_status_max: 399,
    },
    {
      service_key: 'restaurante-web',
      service_name: 'restaurante-web',
      base_url: normalizeBaseUrl(env.WEB_BASE_URL),
      // Expo web serve arquivos estáticos — não há /healthz; usar raiz que retorna 200.
      health_path: '/',
      method: 'GET',
      timeout_ms: 5000,
      enabled: true,
      display_order: 20,
      expected_status_min: 200,
      expected_status_max: 399,
    },
    {
      service_key: 'activepieces',
      service_name: 'activepieces',
      base_url: normalizeBaseUrl(env.ACTIVEPIECES_BASE_URL),
      health_path: '/health',
      method: 'GET',
      timeout_ms: 5000,
      enabled: true,
      display_order: 30,
      expected_status_min: 200,
      expected_status_max: 399,
    },
    {
      service_key: 'evolution-api',
      service_name: 'evolution-api',
      base_url: normalizeBaseUrl(resolveCanonicalEvolutionBaseUrl()),
      health_path: '/',
      method: 'GET',
      timeout_ms: 5000,
      enabled: true,
      display_order: 40,
      expected_status_min: 200,
      expected_status_max: 399,
    },
  ];

  return defaults.filter((item) => item.base_url);
}

function normalizeConfigRow(row: Record<string, unknown>): MonitoredServiceConfig | null {
  const serviceKey = String(row.service_key || '').trim();
  const serviceName = String(row.service_name || '').trim();
  const baseUrl = normalizeBaseUrl(String(row.base_url || ''));
  const healthPath = normalizeHealthPath(String(row.health_path || '/'));
  const guardedEndpoint = applyEvolutionLegacyHostGuard(serviceKey, baseUrl, healthPath);
  const methodRaw = String(row.method || 'GET').toUpperCase();
  const method: HealthMethod = methodRaw === 'HEAD' ? 'HEAD' : 'GET';
  const timeoutMs = Number(row.timeout_ms ?? 5000);
  const enabled = row.enabled !== false;
  const displayOrder = Number(row.display_order ?? 100);
  const expectedMin = Number(row.expected_status_min ?? 200);
  const expectedMax = Number(row.expected_status_max ?? 399);

  if (!serviceKey || !serviceName || !guardedEndpoint.baseUrl) {
    return null;
  }

  return {
    service_key: serviceKey,
    service_name: serviceName,
    base_url: guardedEndpoint.baseUrl,
    health_path: guardedEndpoint.healthPath,
    method,
    timeout_ms: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000,
    enabled,
    display_order: Number.isFinite(displayOrder) ? displayOrder : 100,
    expected_status_min: Number.isFinite(expectedMin) ? expectedMin : 200,
    expected_status_max: Number.isFinite(expectedMax) ? expectedMax : 399,
  };
}

async function loadMonitoredServicesConfig(): Promise<MonitoredServiceConfig[]> {
  const defaults = getDefaultMonitoredServices();

  const { data, error } = await supabase
    .from('ops_monitored_services')
    .select(
      'service_key, service_name, base_url, health_path, method, timeout_ms, enabled, display_order, expected_status_min, expected_status_max',
    )
    .eq('enabled', true)
    .order('display_order', { ascending: true });

  if (error || !data) {
    return defaults;
  }

  const normalized = data
    .map((row) => normalizeConfigRow(row as Record<string, unknown>))
    .filter((row): row is MonitoredServiceConfig => row != null);

  return normalized.length > 0 ? normalized : defaults;
}

export async function listMonitoredServicesConfig(): Promise<MonitoredServiceConfig[]> {
  const defaults = getDefaultMonitoredServices();

  const { data, error } = await supabase
    .from('ops_monitored_services')
    .select(
      'service_key, service_name, base_url, health_path, method, timeout_ms, enabled, display_order, expected_status_min, expected_status_max',
    )
    .order('display_order', { ascending: true });

  if (error || !data) {
    return defaults;
  }

  const normalized = data
    .map((row) => normalizeConfigRow(row as Record<string, unknown>))
    .filter((row): row is MonitoredServiceConfig => row != null);

  return normalized.length > 0 ? normalized : defaults;
}

export interface UpdateMonitoredServiceInput {
  service_key: string;
  base_url: string;
  health_path: string;
  method: HealthMethod;
  timeout_ms: number;
  expected_status_min: number;
  expected_status_max: number;
  enabled: boolean;
}

export async function updateMonitoredServiceConfig(input: UpdateMonitoredServiceInput): Promise<MonitoredServiceConfig> {
  const serviceKey = String(input.service_key || '').trim();
  if (!serviceKey) {
    throw new Error('service_key obrigatorio.');
  }

  const method: HealthMethod = input.method === 'HEAD' ? 'HEAD' : 'GET';
  const timeoutMs = Number.isFinite(input.timeout_ms)
    ? Math.min(30000, Math.max(500, Math.trunc(input.timeout_ms)))
    : 5000;
  const expectedMin = Number.isFinite(input.expected_status_min)
    ? Math.min(599, Math.max(100, Math.trunc(input.expected_status_min)))
    : 200;
  const expectedMax = Number.isFinite(input.expected_status_max)
    ? Math.min(599, Math.max(100, Math.trunc(input.expected_status_max)))
    : 399;
  if (expectedMin > expectedMax) {
    throw new Error('Faixa de status invalida: min maior que max.');
  }

  const normalizedEndpoint = normalizeMonitoredEndpointInput(input.base_url, input.health_path);
  const guardedEndpoint = applyEvolutionLegacyHostGuard(
    serviceKey,
    normalizedEndpoint.baseUrl,
    normalizedEndpoint.healthPath,
  );

  const payload = {
    base_url: guardedEndpoint.baseUrl,
    health_path: guardedEndpoint.healthPath,
    method,
    timeout_ms: timeoutMs,
    expected_status_min: expectedMin,
    expected_status_max: expectedMax,
    enabled: input.enabled,
  };

  if (!payload.base_url) {
    throw new Error('base_url obrigatoria.');
  }

  const defaultConfig = getDefaultMonitoredServices().find((cfg) => cfg.service_key === serviceKey);

  const { data, error } = await supabase
    .from('ops_monitored_services')
    .upsert(
      {
        service_key: serviceKey,
        service_name: defaultConfig?.service_name ?? serviceKey,
        display_order: defaultConfig?.display_order ?? 100,
        ...payload,
      },
      { onConflict: 'service_key' },
    )
    .select(
      'service_key, service_name, base_url, health_path, method, timeout_ms, enabled, display_order, expected_status_min, expected_status_max',
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao atualizar configuracao do servico monitorado.');
  }

  const normalized = normalizeConfigRow(data as Record<string, unknown>);
  if (!normalized) {
    throw new Error('Configuracao retornada invalida apos update.');
  }

  return normalized;
}

async function checkServiceHealth(config: MonitoredServiceConfig): Promise<ServiceStatus> {
  const url = buildHealthUrl(config.base_url, config.health_path);
  const name = config.service_name;

  if (!url) return { name, status: 'unknown', url };

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);
    
    const res = await fetch(url, { method: config.method, signal: controller.signal });
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - start;
    const status = res.status >= config.expected_status_min && res.status <= config.expected_status_max
      ? 'online'
      : 'offline';
    const detail = res.ok
      ? `HTTP ${res.status}`
      : `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
    return {
      key: config.service_key,
      name,
      status,
      responseTime,
      url,
      statusCode: res.status,
      detail,
    };
  } catch (_err) {
    const detail = _err instanceof Error && _err.name === 'AbortError'
      ? `Timeout apos ${config.timeout_ms}ms`
      : _err instanceof Error
        ? _err.message
        : 'Falha desconhecida';
    return { key: config.service_key, name, status: 'offline', url, detail };
  }
}

export async function checkAllServices(): Promise<ServiceStatus[]> {
  const services = await loadMonitoredServicesConfig();
  if (services.length === 0) {
    return [];
  }

  return Promise.all(services.map((service) => checkServiceHealth(service)));
}

export type AggregatedServiceStatus = 'operational' | 'degraded' | 'down';

export interface ApiStatusPayload {
  service: string;
  env: string;
  status: AggregatedServiceStatus;
  lastChecked: string;
  services: Array<{
    name: string;
    key?: string;
    status: 'online' | 'offline' | 'unknown';
    url?: string;
    responseTime?: number;
    statusCode?: number;
    detail?: string;
  }>;
}

export async function getApiStatus(): Promise<ApiStatusPayload> {
  const serviceStatuses = await checkAllServices();
  
  // Agregacao: operational se todos online, degraded se mistura, down se nenhum essencial online
  const onlineCount = serviceStatuses.filter((s) => s.status === 'online').length;
  const offlineCount = serviceStatuses.filter((s) => s.status === 'offline').length;
  
  let aggregatedStatus: AggregatedServiceStatus = 'operational';
  if (offlineCount > 0 && onlineCount > 0) {
    aggregatedStatus = 'degraded';
  } else if (offlineCount > 0 && onlineCount === 0) {
    aggregatedStatus = 'down';
  }

  return {
    service: 'restaurante-ops',
    env: env.OPS_ENV,
    status: aggregatedStatus,
    lastChecked: new Date().toISOString(),
    services: serviceStatuses.map((s) => ({
      name: s.name,
      key: s.key,
      status: s.status,
      url: s.url,
      responseTime: s.responseTime,
      statusCode: s.statusCode,
      detail: s.detail,
    })),
  };
}
