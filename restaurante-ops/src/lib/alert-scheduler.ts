import { buildEnv } from '../config/env.js';
import { logInfo } from './logger.js';
import { runAlertCycle } from './alerts-engine.js';

const env = buildEnv();

let alertTimer: ReturnType<typeof setInterval> | null = null;

export function startAlertScheduler(): void {
  if (alertTimer != null) return;

  const intervalMs = Math.max(10000, env.ALERT_CHECK_INTERVAL_MS);
  alertTimer = setInterval(() => {
    void runAlertCycle();
  }, intervalMs);
  alertTimer.unref();

  logInfo('alerts.scheduler_started', {
    message: `Alert scheduler started (interval: ${intervalMs}ms)`,
  });
}

export function stopAlertScheduler(): void {
  if (alertTimer == null) return;
  clearInterval(alertTimer);
  alertTimer = null;
}