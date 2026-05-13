// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { buildCorsPreflightResponse } from '../_shared/cors.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'content-type, x-client-info, apikey';

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = (Deno.env.get('CONTACT_CORS_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
  };

  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

function jsonResponse(status: number, body: Record<string, unknown>, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(req),
    },
  });
}

interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  establishment: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertMaxLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new Error(`${field} excede o limite permitido.`);
  }
}

function validatePayload(body: unknown): ContactPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Corpo da requisição inválido.');
  }

  const obj = body as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const email = typeof obj.email === 'string' ? obj.email.trim() : '';
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  const phone = typeof obj.phone === 'string' ? obj.phone.trim() : '';
  const establishment = typeof obj.establishment === 'string' ? obj.establishment.trim() : '';

  if (!name || name.length < 2) {
    throw new Error('Nome é obrigatório (mínimo 2 caracteres).');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('E-mail válido é obrigatório.');
  }
  if (!message || message.length < 5) {
    throw new Error('Mensagem é obrigatória (mínimo 5 caracteres).');
  }
  if (!establishment || establishment.length < 2) {
    throw new Error('Nome do estabelecimento é obrigatório.');
  }

  assertMaxLength(name, 120, 'Nome');
  assertMaxLength(email, 160, 'E-mail');
  assertMaxLength(phone, 32, 'Telefone');
  assertMaxLength(establishment, 160, 'Estabelecimento');
  assertMaxLength(message, 4000, 'Mensagem');

  return { name, email, phone, establishment, message };
}

function buildEmailHtml(data: ContactPayload): string {
  const rows = [
    ['Nome', escapeHtml(data.name)],
    ['E-mail', escapeHtml(data.email)],
    ['Telefone', escapeHtml(data.phone || 'Não informado')],
    ['Estabelecimento', escapeHtml(data.establishment)],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">${label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${value}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #d4a853; margin-bottom: 4px;">Nova mensagem do site</h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">Machado &amp; Cunha Soft House — contato via restaurante-web.app.br</p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
        ${tableRows}
      </table>
      <div style="margin-top: 16px;">
        <p style="color: #374151; font-weight: 600; margin-bottom: 4px;">Mensagem:</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; color: #111827; white-space: pre-wrap;">${escapeHtml(data.message)}</div>
      </div>
    </div>
  `;
}

async function sendEmail(data: ContactPayload): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('CONTACT_FROM_EMAIL') || 'contato@restaurante-web.app.br';
  const toEmail = Deno.env.get('CONTACT_TO_EMAIL') || 'contato@restaurante-web.app.br';

  if (resendApiKey) {
    // ── Send via Resend ─────────────────────────────────────
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Machado & Cunha Soft House <${fromEmail}>`,
        to: [toEmail],
        subject: `Contato do site: ${data.name} — ${data.establishment}`,
        html: buildEmailHtml(data),
        reply_to: data.email,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[SEND-CONTACT] Resend error', { status: res.status, body: errText });
      throw new Error('Falha ao enviar e-mail pelo provedor.');
    }

    return;
  }

  // ── Fallback: log to console (dev mode without RESEND_API_KEY) ──
  console.log('[SEND-CONTACT] RESEND_API_KEY not configured. Message received:', JSON.stringify(data, null, 2));
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = (Deno.env.get('CONTACT_CORS_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (req.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403, headers: getCorsHeaders(req) });
    }

    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!origin || !allowedOrigins.includes(origin)) {
    return jsonResponse(403, { error: 'Origin não permitida.' }, req);
  }

  const contentType = req.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonResponse(415, { error: 'Content-Type deve ser application/json.' }, req);
  }

  try {
    const body = await req.json().catch(() => null);
    const data = validatePayload(body);

    await sendEmail(data);

    return jsonResponse(200, {
      status: 'ok',
      message: 'Mensagem enviada com sucesso.',
    }, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro inesperado.';
    const isValidation = msg.includes('obrigatório') || msg.includes('inválido');

    return jsonResponse(isValidation ? 400 : 500, {
      error: msg,
    }, req);
  }
});
