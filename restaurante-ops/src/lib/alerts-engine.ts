/**
 * alerts-engine.ts
 * Engine de avaliação de alertas e notificações de disparo.
 * Verifica condições configuradas na tabela ops_alerts e dispara notificações
 * via webhook (Slack/Discord) ou registra o firing no banco isolado.
 */

import { buildEnv } from '../config/env.js';
import {
  listAlerts,
  countLogsInWindow,
  insertAlertFiring,
  type AlertRow,
  type AlertCondition,
} from './log-storage.js';
import { logError, logInfo, logWarn } from './logger.js';

const env = buildEnv();

// Mantém controle de quando cada alerta disparou pela última vez para evitar
// notificações repetidas na mesma janela de avaliação.
const lastFiredAt = new Map<number, number>();

function shouldFire(alertId: number, cooldownMs: number): boolean {
  const last = lastFiredAt.get(alertId);
  if (last == null) return true;
  return Date.now() - last > cooldownMs;
}

async function evaluateCondition(condition: AlertCondition): Promise<boolean> {
  const windowMinutes = Math.max(1, condition.window_minutes ?? 5);
  const threshold = Math.max(0, condition.threshold ?? 1);

  if (condition.type === 'error_rate') {
    const errors = await countLogsInWindow(windowMinutes, {
      level: 'error',
      event: condition.event,
      service: condition.service,
    });
    return errors > threshold;
  }

  if (condition.type === 'event_count') {
    const total = await countLogsInWindow(windowMinutes, {
      level: condition.level,
      event: condition.event,
      service: condition.service,
    });
    return total > threshold;
  }

  if (condition.type === 'no_events') {
    const total = await countLogsInWindow(windowMinutes, {
      level: condition.level,
      event: condition.event,
      service: condition.service,
    });
    return total === 0;
  }

  return false;
}

async function sendWebhookNotification(
  alert: AlertRow,
  context: Record<string, unknown>,
): Promise<void> {
  const channelConfig = alert.channel_config ?? {};
  const webhookUrl = typeof channelConfig.url === 'string' ? channelConfig.url : null;

  if (!webhookUrl) {
    logWarn('alerts.missing_webhook_url', {
      message: `Alert "${alert.name}" has no webhook URL configured`,
      metadata: { alert_id: alert.id },
    });
    return;
  }

  // Validação básica: apenas https
  if (!webhookUrl.startsWith('https://')) {
    logWarn('alerts.insecure_webhook_url', {
      message: `Alert "${alert.name}" webhook URL must use HTTPS`,
      metadata: { alert_id: alert.id },
    });
    return;
  }

  const payload = {
    text: `*[restaurante-ops] Alerta disparado: ${alert.name}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Alerta:* ${alert.name}\n*Descrição:* ${alert.description ?? 'N/A'}\n*Canal:* ${alert.channel}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Contexto:*\`\`\`${JSON.stringify(context, null, 2)}\`\`\``,
        },
      },
    ],
  };

  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    env.ALERT_WEBHOOK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      logWarn('alerts.webhook_send_failed', {
        message: `Webhook returned ${response.status} for alert "${alert.name}"`,
        metadata: { alert_id: alert.id, status: response.status },
      });
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function evaluateAlert(alert: AlertRow): Promise<void> {
  if (!alert.enabled || alert.id == null) return;

  try {
    const fired = await evaluateCondition(alert.condition as AlertCondition);
    if (!fired) return;

    // Cooldown: não disparar novamente na mesma janela de avaliação
    const cooldownMs = (alert.condition as AlertCondition).window_minutes * 60 * 1000;
    if (!shouldFire(alert.id, cooldownMs)) return;

    lastFiredAt.set(alert.id, Date.now());

    const context: Record<string, unknown> = {
      condition_type: (alert.condition as AlertCondition).type,
      window_minutes: (alert.condition as AlertCondition).window_minutes,
      threshold: (alert.condition as AlertCondition).threshold,
      evaluated_at: new Date().toISOString(),
    };

    // Registra o firing no banco
    await insertAlertFiring({ alert_id: alert.id, context, notified: false });

    // Envia notificação
    if (alert.channel === 'webhook' || alert.channel === 'slack') {
      await sendWebhookNotification(alert, context);
    }

    logInfo('alerts.fired', {
      message: `Alert fired: ${alert.name}`,
      metadata: { alert_id: alert.id, channel: alert.channel, context },
    });
  } catch (err) {
    logError('alerts.evaluation_error', {
      message: `Error evaluating alert "${alert.name}"`,
      error: err instanceof Error ? err.message : String(err),
      metadata: { alert_id: alert.id },
    });
  }
}

export async function runAlertCycle(): Promise<void> {
  try {
    const alerts = await listAlerts();
    const enabled = alerts.filter((a) => a.enabled);
    await Promise.allSettled(enabled.map(evaluateAlert));
  } catch (err) {
    logError('alerts.cycle_error', {
      message: 'Failed to run alert evaluation cycle',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

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
  if (alertTimer != null) {
    clearInterval(alertTimer);
    alertTimer = null;
  }
}
