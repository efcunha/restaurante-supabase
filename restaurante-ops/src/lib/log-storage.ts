import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildEnv } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error';

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
