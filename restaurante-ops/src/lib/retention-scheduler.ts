import { cleanupOldLogs } from './log-storage.js';
import { logError, logInfo } from './logger.js';
import { getOpsObservabilitySettings } from '../modules/ops-observability-settings.js';

const RETENTION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

let retentionTimer: ReturnType<typeof setInterval> | null = null;
let retentionCycleRunning = false;

export interface RetentionCleanupResult {
  deletedCount: number;
  retentionDays: number;
  source: 'panel' | 'env';
}

export async function runRetentionCleanupCycle(companyId: string): Promise<RetentionCleanupResult> {
  if (retentionCycleRunning) {
    return {
      deletedCount: 0,
      retentionDays: 0,
      source: 'env',
    };
  }

  retentionCycleRunning = true;
  try {
    const settings = await getOpsObservabilitySettings(companyId);
    const deletedCount = await cleanupOldLogs(settings.logRetentionDays);

    logInfo('observability.retention_cleanup_completed', {
      metadata: {
        deleted_count: deletedCount,
        retention_days: settings.logRetentionDays,
        source: settings.source,
      },
      message: `Retention cleanup completed for logs older than ${settings.logRetentionDays} day(s).`,
    });

    return {
      deletedCount,
      retentionDays: settings.logRetentionDays,
      source: settings.source,
    };
  } catch (error) {
    logError('observability.retention_cleanup_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    retentionCycleRunning = false;
  }
}

export function startRetentionScheduler(companyId: string): void {
  if (retentionTimer != null) return;

  void runRetentionCleanupCycle(companyId).catch(() => {
    // logging handled inside runRetentionCleanupCycle
  });

  retentionTimer = setInterval(() => {
    void runRetentionCleanupCycle(companyId).catch(() => {
      // logging handled inside runRetentionCleanupCycle
    });
  }, RETENTION_CLEANUP_INTERVAL_MS);
  retentionTimer.unref();

  logInfo('observability.retention_scheduler_started', {
    message: `Retention scheduler started (interval: ${RETENTION_CLEANUP_INTERVAL_MS}ms)`,
  });
}

export function stopRetentionScheduler(): void {
  if (retentionTimer == null) return;
  clearInterval(retentionTimer);
  retentionTimer = null;
}