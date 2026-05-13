import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildEnv } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error';

export interface AlertRow {
  id?: number;
  name: string;
  description?: string;
  condition: AlertCondition;
  channel: string;
  channel_config?: Record<string, unknown>;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AlertCondition {
  /** Tipo de condição: 'error_rate' | 'event_count' | 'no_events' */
  type: string;
  /** Nível de log alvo (opcional) */
  level?: LogLevel;
  /** Evento específico a monitorar (opcional) */
  event?: string;
  /** Serviço alvo (opcional) */
  service?: string;
  /** Janela de tempo em minutos */
  window_minutes: number;
  /** Limiar numérico */
  threshold: number;
}

export interface AlertFiringRow {
  id?: number;
  alert_id: number;
  fired_at?: string;
  context?: Record<string, unknown>;
  notified?: boolean;
}

export interface LogQueryFilter {
  service?: string;
  level?: LogLevel;
  event?: string;
  request_id?: string;
  order_id?: string;
  user_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface LogQueryResult {
  total: number;
  logs: LogEntry[];
}

export interface LogMetrics {
  period: string;
  total_logs: number;
  by_level: Record<LogLevel, number>;
  by_service: Record<string, number>;
  error_rate: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  top_errors: Array<{ event: string; count: number; last_seen: string }>;
}

export interface LogTimelinePoint {
  bucket_start: string;
  total: number;
  errors: number;
  warns: number;
  infos: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  message: string;
  request_id?: string;
  user_id?: string;
  order_id?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

const env = buildEnv();

const bufferMax = Math.max(100, env.LOG_INGEST_BUFFER_MAX);
const batchSize = Math.max(10, env.LOG_INGEST_BATCH_SIZE);
const flushIntervalMs = Math.max(250, env.LOG_INGEST_FLUSH_INTERVAL_MS);
const isEnabled = Boolean(env.OBS_SUPABASE_URL && env.OBS_SUPABASE_SERVICE_ROLE_KEY);

const primarySupabase = createClient(String(env.SUPABASE_URL), String(env.SUPABASE_SERVICE_ROLE_KEY), {
  auth: { persistSession: false },
});

let supabase: SupabaseClient | null = null;
let warnedMissingEnv = false;
let isFlushing = false;
const queue: LogEntry[] = [];

if (isEnabled) {
  supabase = createClient(String(env.OBS_SUPABASE_URL), String(env.OBS_SUPABASE_SERVICE_ROLE_KEY), {
    auth: { persistSession: false },
  });
}

function dropOldestInfoLog(): boolean {
  const infoIndex = queue.findIndex((entry) => entry.level === 'info');
  if (infoIndex < 0) {
    return false;
  }

  queue.splice(infoIndex, 1);
  return true;
}

function requireClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Observability storage is disabled. Configure OBS_SUPABASE_URL and OBS_SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabase;
}

function getAlertsClient(): SupabaseClient {
  if (env.OBS_READ_FROM_ISOLATED) {
    return requireClient();
  }
  return primarySupabase;
}

async function flushBatch(): Promise<void> {
  if (!supabase || queue.length === 0 || isFlushing) {
    return;
  }

  isFlushing = true;
  const batch = queue.splice(0, Math.min(batchSize, queue.length));

  const { error } = await supabase.from('ops_logs').insert(batch);
  if (error) {
    // Requeue once at front to avoid loss on transient failures.
    queue.unshift(...batch);
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        service: 'ops',
        event: 'observability.flush_failed',
        message: 'Failed to flush log batch to isolated observability store',
        metadata: { error: error.message, queued: queue.length },
      }),
    );
  }

  isFlushing = false;
}

const flushTimer = setInterval(() => {
  void flushBatch();
}, flushIntervalMs);
flushTimer.unref();

process.on('beforeExit', () => {
  void flushBatch();
});

export function enqueueLog(log: LogEntry): void {
  if (!isEnabled) {
    if (!warnedMissingEnv && env.OBS_DUAL_WRITE) {
      warnedMissingEnv = true;
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          service: 'ops',
          event: 'observability.storage_disabled',
          message: 'OBS_DUAL_WRITE enabled but OBS_SUPABASE_URL/OBS_SUPABASE_SERVICE_ROLE_KEY are missing',
        }),
      );
    }
    return;
  }

  queue.push(log);

  // Backpressure: keep errors, shed older info logs first.
  while (queue.length > bufferMax) {
    if (!dropOldestInfoLog()) {
      queue.shift();
    }
  }

  if (queue.length >= batchSize) {
    void flushBatch();
  }
}

export async function queryLogs(filter: LogQueryFilter): Promise<LogQueryResult> {
  const client = requireClient();
  const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
  const offset = Math.max(0, filter.offset ?? 0);

  let query = client
    .from('ops_logs')
    .select(
      'timestamp, level, service, event, message, request_id, user_id, order_id, duration_ms, metadata',
      { count: 'exact' },
    )
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter.service) query = query.eq('service', filter.service);
  if (filter.level) query = query.eq('level', filter.level);
  if (filter.event) query = query.eq('event', filter.event);
  if (filter.request_id) query = query.eq('request_id', filter.request_id);
  if (filter.order_id) query = query.eq('order_id', filter.order_id);
  if (filter.user_id) query = query.eq('user_id', filter.user_id);
  if (filter.from) query = query.gte('timestamp', filter.from);
  if (filter.to) query = query.lte('timestamp', filter.to);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to query logs: ${error.message}`);
  }

  return {
    total: count ?? 0,
    logs: (data ?? []) as LogEntry[],
  };
}

export async function traceRequest(requestId: string): Promise<LogEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('ops_logs')
    .select('timestamp, level, service, event, message, request_id, user_id, order_id, duration_ms, metadata')
    .eq('request_id', requestId)
    .order('timestamp', { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to trace request: ${error.message}`);
  }

  return (data ?? []) as LogEntry[];
}

export async function traceOrder(orderId: string): Promise<LogEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('ops_logs')
    .select('timestamp, level, service, event, message, request_id, user_id, order_id, duration_ms, metadata')
    .eq('order_id', orderId)
    .order('timestamp', { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to trace order: ${error.message}`);
  }

  return (data ?? []) as LogEntry[];
}

export async function getMetrics(periodHours = 24, serviceFilter?: string): Promise<LogMetrics> {
  const client = requireClient();
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();

  let query = client
    .from('ops_logs')
    .select('timestamp, level, service, event, duration_ms')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(5000);

  if (serviceFilter) {
    query = query.eq('service', serviceFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to build log metrics: ${error.message}`);
  }

  const rows = data ?? [];
  const byLevel: Record<LogLevel, number> = { info: 0, warn: 0, error: 0 };
  const byService: Record<string, number> = {};
  const durations: number[] = [];
  const errorEvents = new Map<string, { count: number; lastSeen: string }>();

  for (const row of rows) {
    const level = String(row.level || 'info') as LogLevel;
    if (level === 'info' || level === 'warn' || level === 'error') {
      byLevel[level] += 1;
    }

    const service = String(row.service || 'unknown');
    byService[service] = (byService[service] || 0) + 1;

    if (typeof row.duration_ms === 'number' && Number.isFinite(row.duration_ms) && row.duration_ms >= 0) {
      durations.push(row.duration_ms);
    }

    if (level === 'error') {
      const event = String(row.event || 'unknown_error');
      const current = errorEvents.get(event);
      const seen = String(row.timestamp || new Date().toISOString());
      if (!current) {
        errorEvents.set(event, { count: 1, lastSeen: seen });
      } else {
        current.count += 1;
        if (seen > current.lastSeen) current.lastSeen = seen;
      }
    }
  }

  durations.sort((a, b) => a - b);
  const totalLogs = rows.length;
  const totalErrors = byLevel.error;
  const avgDuration = durations.length > 0 ? durations.reduce((acc, n) => acc + n, 0) / durations.length : 0;
  const p95Index = durations.length > 0 ? Math.min(durations.length - 1, Math.floor(durations.length * 0.95)) : -1;
  const p95Duration = p95Index >= 0 ? durations[p95Index] : 0;

  const topErrors = [...errorEvents.entries()]
    .map(([event, value]) => ({ event, count: value.count, last_seen: value.lastSeen }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    period: `${periodHours}h`,
    total_logs: totalLogs,
    by_level: byLevel,
    by_service: byService,
    error_rate: totalLogs > 0 ? totalErrors / totalLogs : 0,
    avg_duration_ms: Number(avgDuration.toFixed(2)),
    p95_duration_ms: p95Duration,
    top_errors: topErrors,
  };
}

export async function getMetricsTimeline(periodHours = 24, serviceFilter?: string): Promise<LogTimelinePoint[]> {
  const client = requireClient();
  const now = new Date();
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
  since.setMinutes(0, 0, 0);

  let query = client
    .from('ops_logs')
    .select('timestamp, level, duration_ms, service')
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: true })
    .limit(10000);

  if (serviceFilter) {
    query = query.eq('service', serviceFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to build log timeline: ${error.message}`);
  }

  const buckets = new Map<string, {
    total: number;
    errors: number;
    warns: number;
    infos: number;
    durations: number[];
  }>();

  const cursor = new Date(since);
  const end = new Date(now);
  end.setMinutes(0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString();
    buckets.set(key, { total: 0, errors: 0, warns: 0, infos: 0, durations: [] });
    cursor.setHours(cursor.getHours() + 1);
  }

  for (const row of data ?? []) {
    const ts = new Date(String(row.timestamp || ''));
    if (Number.isNaN(ts.getTime())) continue;
    ts.setMinutes(0, 0, 0);
    const key = ts.toISOString();
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.total += 1;
    const level = String(row.level || 'info');
    if (level === 'error') bucket.errors += 1;
    else if (level === 'warn') bucket.warns += 1;
    else bucket.infos += 1;

    if (typeof row.duration_ms === 'number' && Number.isFinite(row.duration_ms) && row.duration_ms >= 0) {
      bucket.durations.push(row.duration_ms);
    }
  }

  return [...buckets.entries()].map(([bucket_start, bucket]) => {
    const sorted = bucket.durations.slice().sort((a, b) => a - b);
    const avg = sorted.length > 0 ? sorted.reduce((acc, value) => acc + value, 0) / sorted.length : 0;
    const p95Index = sorted.length > 0 ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : -1;
    const p95 = p95Index >= 0 ? sorted[p95Index] : 0;

    return {
      bucket_start,
      total: bucket.total,
      errors: bucket.errors,
      warns: bucket.warns,
      infos: bucket.infos,
      avg_duration_ms: Number(avg.toFixed(2)),
      p95_duration_ms: p95,
    };
  });
}

export async function listKnownServices(periodHours = 168): Promise<string[]> {
  const client = requireClient();
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('ops_logs')
    .select('service')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(10000);

  if (error) {
    throw new Error(`Failed to list known services: ${error.message}`);
  }

  const unique = new Set<string>();
  for (const row of data ?? []) {
    const service = String((row as { service?: unknown }).service || '').trim();
    if (!service) continue;
    unique.add(service);
  }

  return [...unique].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function cleanupOldLogs(olderThanDays: number): Promise<number> {
  const client = requireClient();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await client
    .from('ops_logs')
    .delete({ count: 'exact' })
    .lt('timestamp', cutoff);

  if (error) {
    throw new Error(`Failed to cleanup old logs: ${error.message}`);
  }
  return count ?? 0;
}

export async function listAlerts(enabled?: boolean): Promise<AlertRow[]> {
  const client = getAlertsClient();
  let query = client
    .from('ops_alerts')
    .select('id, name, description, condition, channel, channel_config, enabled, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (enabled !== undefined) {
    query = query.eq('enabled', enabled);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list alerts: ${error.message}`);
  }
  return (data ?? []) as AlertRow[];
}

export async function createAlert(alert: Omit<AlertRow, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRow> {
  const client = getAlertsClient();
  const { data, error } = await client
    .from('ops_alerts')
    .insert({
      name: alert.name,
      description: alert.description,
      condition: alert.condition,
      channel: alert.channel,
      channel_config: alert.channel_config,
      enabled: alert.enabled,
    })
    .select('id, name, description, condition, channel, channel_config, enabled, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`Failed to create alert: ${error.message}`);
  }
  return data as AlertRow;
}

export async function updateAlert(id: number, patch: Partial<Omit<AlertRow, 'id' | 'created_at'>>): Promise<AlertRow> {
  const client = getAlertsClient();
  const { data, error } = await client
    .from('ops_alerts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, description, condition, channel, channel_config, enabled, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`Failed to update alert: ${error.message}`);
  }
  return data as AlertRow;
}

export async function deleteAlert(id: number): Promise<void> {
  const client = getAlertsClient();
  const { error } = await client
    .from('ops_alerts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete alert: ${error.message}`);
  }
}

export async function insertAlertFiring(firing: Omit<AlertFiringRow, 'id' | 'fired_at'>): Promise<void> {
  const client = getAlertsClient();
  const { error } = await client.from('ops_alert_firings').insert({
    alert_id: firing.alert_id,
    context: firing.context,
    notified: firing.notified ?? false,
  });

  if (error) {
    throw new Error(`Failed to insert alert firing: ${error.message}`);
  }
}

export async function countLogsInWindow(
  windowMinutes: number,
  filter?: { level?: LogLevel; event?: string; service?: string },
): Promise<number> {
  const client = requireClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  let query = client
    .from('ops_logs')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', since);

  if (filter?.level) query = query.eq('level', filter.level);
  if (filter?.event) query = query.eq('event', filter.event);
  if (filter?.service) query = query.eq('service', filter.service);

  const { error, count } = await query;
  if (error) {
    throw new Error(`Failed to count logs: ${error.message}`);
  }
  return count ?? 0;
}
