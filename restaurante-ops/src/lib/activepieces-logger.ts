/**
 * activepieces-logger.ts
 * Handler de webhook do Activepieces.
 * Autentica via X-Webhook-Secret e loga eventos de automação no storage isolado.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildEnv } from '../config/env.js';
import { enqueueLog } from './log-storage.js';
import { logInfo, logWarn, logError } from './logger.js';

const env = buildEnv();

interface ActivepiecesWebhookPayload {
  workflow_id?: string;
  execution_id?: string;
  workflow_name?: string;
  duration_ms?: number;
  status?: string;
  result?: unknown;
  error?: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > 65_536) return reject(new Error('Payload too large'));
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function parseJsonBody<T>(raw: string): T {
  if (!raw || raw.trim() === '') return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Invalid JSON payload');
  }
}

function sanitize(value: string | undefined): string {
  if (!value) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 280);
}

export async function handleActivepiecesWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
): Promise<void> {
  const secret = env.ACTIVEPIECES_WEBHOOK_SECRET;

  if (!secret) {
    logError('activepieces.webhook_misconfigured', {
      request_id: requestId,
      message: 'ACTIVEPIECES_WEBHOOK_SECRET is not configured',
    });
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Webhook endpoint not available.' }));
    return;
  }

  const rawSecret = req.headers['x-webhook-secret'];
  const inbound = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret;

  if (typeof inbound !== 'string' || inbound.trim() !== secret) {
    logWarn('activepieces.webhook_unauthorized', {
      request_id: requestId,
      message: 'Invalid or missing X-Webhook-Secret for Activepieces webhook',
    });
    res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Unauthorized.' }));
    return;
  }

  try {
    const rawBody = await readBody(req);
    const payload = parseJsonBody<ActivepiecesWebhookPayload>(rawBody);

    const workflowId = sanitize(payload.workflow_id);
    const executionId = sanitize(payload.execution_id);
    const workflowName = sanitize(payload.workflow_name);
    const status = sanitize(payload.status) || 'unknown';
    const errorMsg = sanitize(payload.error);

    const durationCandidate = typeof payload.duration_ms === 'number' ? payload.duration_ms : undefined;
    const durationMs =
      typeof durationCandidate === 'number' &&
      Number.isFinite(durationCandidate) &&
      durationCandidate >= 0
        ? Math.floor(durationCandidate)
        : undefined;

    const isFailed = status === 'failed' || status === 'error' || Boolean(errorMsg);
    const event = isFailed ? 'automation_failed' : 'automation_executed';
    const level = isFailed ? 'error' : 'info';

    enqueueLog({
      timestamp: new Date().toISOString(),
      level,
      service: 'activepieces',
      event,
      message: isFailed
        ? `Activepieces workflow failed: ${workflowName || workflowId || 'unknown'}`
        : `Activepieces workflow executed: ${workflowName || workflowId || 'unknown'}`,
      request_id: requestId,
      duration_ms: durationMs,
      metadata: {
        workflow_id: workflowId || undefined,
        execution_id: executionId || undefined,
        workflow_name: workflowName || undefined,
        status,
        error: errorMsg || undefined,
      },
    });

    logInfo('activepieces.webhook_received', {
      request_id: requestId,
      message: `Activepieces ${event} for workflow "${workflowName || workflowId}"`,
      metadata: { workflow_id: workflowId, execution_id: executionId, status },
    });

    res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    logError('activepieces.webhook_error', {
      request_id: requestId,
      message: 'Error processing Activepieces webhook payload',
      error: err instanceof Error ? err.message : String(err),
    });
    res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Invalid payload.' }));
  }
}
