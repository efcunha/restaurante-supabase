/**
 * evolution-logger.ts
 * Handler de webhook da Evolution API (WhatsApp).
 * Autentica via X-Webhook-Secret e loga eventos de WhatsApp no storage isolado.
 * Número de telefone é mascarado antes de ser persistido.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildEnv } from '../config/env.js';
import { enqueueLog } from './log-storage.js';
import { logInfo, logWarn, logError } from './logger.js';

const env = buildEnv();

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; id?: string };
    message?: { messageType?: string };
    messageType?: string;
    pushName?: string;
    status?: string;
    error?: string;
  };
  phone_number?: string;
  message_id?: string;
  message_type?: string;
  status?: string;
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

/**
 * Mascara número de telefone: mantém apenas os 4 últimos dígitos.
 * Ex: "5583999991234" → "***1234"
 */
function maskPhoneNumber(phone: string): string {
  if (!phone) return '[REDACTED]';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***' + digits;
  return '***' + digits.slice(-4);
}

function extractPhoneFromJid(jid: string | undefined): string {
  if (!jid) return '';
  // jid formato: 5583999991234@s.whatsapp.net
  const match = jid.split('@')[0];
  return match || '';
}

function mapEvolutionEventToOpsEvent(
  evolutionEvent: string,
  status?: string,
  error?: string,
): string {
  const lowerEvent = evolutionEvent.toLowerCase();

  if (lowerEvent.includes('messages.upsert') || lowerEvent.includes('send_message')) {
    return status === 'failed' || Boolean(error) ? 'whatsapp_failed' : 'whatsapp_sent';
  }

  if (
    lowerEvent.includes('messages.update') ||
    lowerEvent.includes('connection') ||
    lowerEvent.includes('qrcode') ||
    lowerEvent.includes('instance')
  ) {
    return 'whatsapp_webhook';
  }

  return 'whatsapp_webhook';
}

export async function handleEvolutionWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
): Promise<void> {
  const secret = env.EVOLUTION_WEBHOOK_SECRET;

  if (!secret) {
    logError('evolution.webhook_misconfigured', {
      request_id: requestId,
      message: 'EVOLUTION_WEBHOOK_SECRET is not configured',
    });
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Webhook endpoint not available.' }));
    return;
  }

  const rawSecret = req.headers['x-webhook-secret'];
  const inbound = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret;

  if (typeof inbound !== 'string' || inbound.trim() !== secret) {
    logWarn('evolution.webhook_unauthorized', {
      request_id: requestId,
      message: 'Invalid or missing X-Webhook-Secret for Evolution API webhook',
    });
    res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Unauthorized.' }));
    return;
  }

  try {
    const rawBody = await readBody(req);
    const payload = parseJsonBody<EvolutionWebhookPayload>(rawBody);

    const evolutionEvent = sanitize(payload.event) || 'unknown';
    const instance = sanitize(payload.instance);
    const status = sanitize(payload.status ?? payload.data?.status);
    const errorMsg = sanitize(payload.error ?? payload.data?.error);

    // Extrai telefone — pode vir no campo phone_number ou dentro de data.key.remoteJid
    const rawPhone =
      payload.phone_number ||
      extractPhoneFromJid(payload.data?.key?.remoteJid);
    const maskedPhone = maskPhoneNumber(rawPhone);

    const rawMessageId = payload.message_id || payload.data?.key?.id || '';
    const messageId = sanitize(rawMessageId).slice(0, 64);

    const messageType = sanitize(
      payload.message_type ||
      payload.data?.message?.messageType ||
      payload.data?.messageType,
    );

    const opsEvent = mapEvolutionEventToOpsEvent(evolutionEvent, status, errorMsg);
    const isFailed = opsEvent === 'whatsapp_failed';
    const level = isFailed ? 'error' : 'info';

    enqueueLog({
      timestamp: new Date().toISOString(),
      level,
      service: 'evolution',
      event: opsEvent,
      message: isFailed
        ? `WhatsApp message failed (${instance || 'unknown instance'})`
        : `WhatsApp event: ${evolutionEvent} (${instance || 'unknown instance'})`,
      request_id: requestId,
      metadata: {
        phone_number: maskedPhone || undefined,
        message_id: messageId || undefined,
        instance: instance || undefined,
        message_type: messageType || undefined,
        evolution_event: evolutionEvent,
        status: status || undefined,
        error: errorMsg || undefined,
      },
    });

    logInfo('evolution.webhook_received', {
      request_id: requestId,
      message: `Evolution API event "${evolutionEvent}" received`,
      metadata: { instance, event: opsEvent, phone: maskedPhone },
    });

    res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    logError('evolution.webhook_error', {
      request_id: requestId,
      message: 'Error processing Evolution API webhook payload',
      error: err instanceof Error ? err.message : String(err),
    });
    res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Invalid payload.' }));
  }
}
