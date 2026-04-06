import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { buildEnv } from './config/env.js';
import { signInWithPassword } from './auth/supabase.js';
import { setSessionCookie, clearSessionCookie } from './auth/session.js';
import { requireAuth } from './auth/middleware.js';
import { renderDashboardHtml } from './views/dashboard.js';
import type { OpsUser } from './auth/supabase.js';
import {
  getOpsSecuritySettings,
  listOpsMfaUsers,
  resetUserMfaFactors,
  updateOpsRequireMfa,
  userHasVerifiedMfa,
} from './modules/ops-security.js';
import {
  getOpsObservabilitySettings,
  updateOpsLogRetentionDays,
} from './modules/ops-observability-settings.js';
import {
  fetchRecentCompanies,
  fetchInvoiceStats,
  fetchRecentInvoices,
  fetchBillingOpsMetrics,
  fetchSaasMetrics,
  fetchRevenueSeries,
  fetchSubscriptionBreakdown,
  fetchKpiCounts,
  brl,
  type CompanyRow,
  type InvoiceRow,
  type InvoiceStats,
  type BillingOpsMetrics,
  type SaasMetrics,
  type RevenuePoint,
  type SubscriptionBreakdown,
  type KpiCounts,
} from './modules/data.js';
import {
  checkAllServices,
  listMonitoredServicesConfig,
  updateMonitoredServiceConfig,
  type ServiceStatus,
} from './modules/service-status.js';
import { getSupabaseMetrics, type SupabaseMetrics } from './modules/supabase-metrics.js';
import { logError, logInfo, logWarn } from './lib/logger.js';
import { initRedis, checkRedisHealth } from './lib/redis.js';
import { checkRateLimit, resetRateLimit } from './lib/rate-limiter.js';
import {
  BillingOperationError,
  fetchBillingAudit,
  fetchBillingSnapshot,
  reconcileBillingEvent,
  regularizeByCard,
  regularizeByPix,
  checkInvoiceAmountDivergence,
  type ReconcileInput,
} from './modules/billing-operations.js';
import {
  PlanConfigOperationError,
  fetchActivePlanConfig,
  fetchPlanConfigHistory,
  fetchPlanConfigAudit,
  activatePlanConfig,
  validateActivatePlanConfigInput,
  type ActivatePlanConfigInput,
} from './modules/billing-plan-config-operations.js';
import { createOpsHttpServer } from './lib/httpServer.js';
import {
  enqueueLog,
  getMetrics as getLogMetrics,
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  queryLogs,
  traceOrder,
  traceRequest,
  type LogEntry,
  type AlertCondition,
} from './lib/log-storage.js';
import { startAlertScheduler } from './lib/alert-scheduler.js';
import { runRetentionCleanupCycle, startRetentionScheduler } from './lib/retention-scheduler.js';
import { handleActivepiecesWebhook } from './lib/activepieces-logger.js';
import { handleEvolutionWebhook } from './lib/evolution-logger.js';
import { renderObservabilityHtml } from './views/observability.js';
import { attachRequestTracking } from './lib/request-tracker.js';

const env = buildEnv();
const opsCompanyId = env.OPS_ALLOWED_COMPANY_ID || 'f85bfdc2-982a-4cf7-b176-bce68426f861';

function getRequestIp(req: IncomingMessage): string {
  if (!env.OPS_TRUST_PROXY_HEADERS) {
    return req.socket.remoteAddress || 'unknown';
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = sanitizePlainText(forwarded.split(',')[0]).replace(/[^A-Fa-f0-9:.,]/g, '');
    return first || req.socket.remoteAddress || 'unknown';
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = sanitizePlainText(forwarded[0].split(',')[0]).replace(/[^A-Fa-f0-9:.,]/g, '');
    return first || req.socket.remoteAddress || 'unknown';
  }

  return req.socket.remoteAddress || 'unknown';
}

function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function sanitizeRequestTarget(value: string | undefined): string {
  const raw = sanitizePlainText(value || '/');
  if (!raw.startsWith('/')) return '/';

  const [pathPart, queryPart] = raw.split('?', 2);
  if (!/^[A-Za-z0-9\-._~!$&'()*+,;=:@/%]*$/.test(pathPart)) {
    return '/';
  }

  if (queryPart != null && !/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]*$/.test(queryPart)) {
    return pathPart || '/';
  }

  return queryPart != null ? `${pathPart}?${queryPart}` : pathPart;
}

function sanitizeQueryMessage(value: string | null | undefined): string | null {
  if (!value) return null;
  const safe = sanitizePlainText(value)
    .replace(/[<>"'`]/g, '')
    .slice(0, 280);
  return safe.length > 0 ? safe : null;
}

function sanitizeOpsUserForHtml(user: OpsUser): OpsUser {
  return {
    id: sanitizePlainText(user.id),
    email: sanitizePlainText(user.email),
    full_name: user.full_name ? sanitizePlainText(user.full_name) : null,
    role: user.role ? sanitizePlainText(user.role) : null,
    company_id: user.company_id ? sanitizePlainText(user.company_id) : null,
  };
}

function isSecureTransport(req: IncomingMessage): boolean {
  if (!env.OPS_TRUST_PROXY_HEADERS) {
    return Boolean((req.socket as import('node:tls').TLSSocket).encrypted);
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const firstProto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto;

  if (typeof firstProto === 'string' && firstProto.length > 0) {
    return sanitizePlainText(firstProto.split(',')[0]).toLowerCase() === 'https';
  }

  return Boolean((req.socket as import('node:tls').TLSSocket).encrypted);
}

function enforceHttpsInProduction(
  req: IncomingMessage,
  res: import('node:http').ServerResponse,
  path: string,
  search: string,
): boolean {
  if (env.OPS_ENV !== 'production' || env.OPS_ALLOW_PLAINTEXT_HTTP || isSecureTransport(req)) {
    return false;
  }

  const baseUrl = (env.OPS_PUBLIC_BASE_URL ?? '').trim();
  if (!baseUrl.toLowerCase().startsWith('https://')) {
    logWarn('http.insecure_transport_rejected', {
      method: req.method,
      path,
      statusCode: 426,
      reason: 'OPS_PUBLIC_BASE_URL must be https in production',
    });
    res.writeHead(426, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'HTTPS requerido em producao.' }));
    return true;
  }

  const target = `${baseUrl.replace(/\/$/, '')}${path}${search}`;
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.writeHead(308, {
      Location: target,
      'content-type': 'text/plain; charset=utf-8',
    });
    res.end('Use HTTPS');
    return true;
  }

  res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Requisicao insegura bloqueada. Use HTTPS.' }));
  return true;
}

function enforceCanonicalHost(
  req: IncomingMessage,
  res: import('node:http').ServerResponse,
  path: string,
  search: string,
): boolean {
  if (env.OPS_ENV !== 'production') {
    return false;
  }

  if (path === '/healthz' || path === '/api/status') {
    return false;
  }

  const baseUrl = (env.OPS_PUBLIC_BASE_URL ?? '').trim();
  if (!baseUrl) {
    return false;
  }

  let canonicalUrl: URL;
  try {
    canonicalUrl = new URL(baseUrl);
  } catch {
    return false;
  }

  const hostHeader = req.headers.host;
  const requestHost = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? '').trim().toLowerCase();
  const canonicalHost = canonicalUrl.host.trim().toLowerCase();

  if (!requestHost || requestHost === canonicalHost) {
    return false;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const target = `${canonicalUrl.origin}${path}${search}`;
  res.writeHead(308, {
    Location: target,
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end('Use canonical host');
  return true;
}

function applySecurityHeaders(res: import('node:http').ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (env.OPS_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePlainText(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([key, entry]) => [key, sanitizeJsonValue(entry)]));
  }

  return value;
}

function respondJson(
  res: import('node:http').ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  const safePayload = sanitizeJsonValue(payload);
  const responseBody = JSON.stringify(safePayload);
  const responseBuffer = Buffer.from(responseBody, 'utf-8');
  res.write(responseBuffer);
  res.end();
}

function respondHtml(
  res: import('node:http').ServerResponse,
  statusCode: number,
  html: string,
): void {
  res.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
  });
  res.end(html);
}

function renderBaseLayout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --teal-700: #0c7a96;
        --teal-800: #0a5063;
        --teal-900: #073a49;
        --amber-500: #f1b24b;
        --ink-900: #1d2a35;
        --ink-700: #2f4353;
        --ink-500: #6f808d;
        --line: #d5e1e8;
        --surface: #ffffff;
        --surface-muted: #f4f8fb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Segoe UI", "Trebuchet MS", sans-serif;
        color: var(--ink-900);
        background: var(--teal-700);
        min-height: 100vh;
      }

      .bg-orb {
        position: fixed;
        border-radius: 999px;
        opacity: 0.28;
        pointer-events: none;
      }

      .bg-orb.top {
        width: 360px;
        height: 360px;
        top: -120px;
        left: -90px;
        background: var(--amber-500);
      }

      .bg-orb.bottom {
        width: 460px;
        height: 460px;
        bottom: -180px;
        right: -130px;
        background: var(--teal-900);
      }

      .veil {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.02);
        pointer-events: none;
      }

      .page {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 34px 18px;
      }

      .shell {
        width: 100%;
        max-width: 1220px;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 22px;
        align-items: stretch;
      }

      .hero-panel {
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.1);
        border-radius: 26px;
        color: #edf9fc;
        padding: 34px;
        backdrop-filter: blur(4px);
      }

      .hero-badge {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.4px;
        margin-bottom: 16px;
      }

      .hero-title {
        margin: 0 0 10px;
        font-size: 34px;
        line-height: 1.15;
      }

      .hero-subtitle {
        margin: 0;
        color: #d9f0f5;
        font-size: 16px;
        line-height: 1.5;
      }

      .highlight-grid {
        margin-top: 24px;
        display: grid;
        gap: 10px;
      }

      .highlight-card {
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 14px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.08);
      }

      .highlight-title {
        margin: 0 0 6px;
        font-size: 14px;
        font-weight: 700;
      }

      .highlight-text {
        margin: 0;
        color: #dbedf3;
        font-size: 13px;
        line-height: 1.45;
      }

      .auth-column {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .form-card {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface);
        box-shadow: 0 22px 48px rgba(7, 47, 59, 0.2);
        padding: 26px;
      }

      .form-eyebrow {
        margin: 0;
        font-size: 12px;
        color: #0f6f87;
        font-weight: 800;
        letter-spacing: 0.45px;
        text-transform: uppercase;
      }

      .form-title {
        margin: 6px 0 8px;
        font-size: 30px;
        line-height: 1.15;
      }

      .form-subtitle {
        margin: 0 0 16px;
        color: var(--ink-700);
        font-size: 14px;
        line-height: 1.45;
      }

      .field {
        margin-top: 12px;
      }

      .label {
        font-size: 13px;
        color: #314856;
        font-weight: 600;
        margin-bottom: 6px;
        display: block;
      }

      .input,
      .select {
        width: 100%;
        border: 1px solid #d4e1e7;
        border-radius: 12px;
        padding: 12px 12px;
        font-size: 14px;
        background: var(--surface-muted);
        color: var(--ink-900);
        outline: none;
      }

      .input:focus,
      .select:focus {
        border-color: #0b6780;
        background: #fff;
      }

      .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .btn-primary {
        width: 100%;
        margin-top: 16px;
        border: 0;
        border-radius: 12px;
        padding: 13px 14px;
        background: linear-gradient(135deg, #0b6780, #0e7d9b);
        color: #fff;
        font-weight: 800;
        letter-spacing: 0.4px;
        cursor: pointer;
      }

      .btn-secondary {
        width: 100%;
        margin-top: 10px;
        border: 1px solid #c7dae4;
        border-radius: 12px;
        padding: 12px 14px;
        background: #fff;
        color: #0b6780;
        font-weight: 700;
        cursor: pointer;
      }

      .helper {
        margin-top: 12px;
        font-size: 13px;
        color: var(--ink-500);
      }

      .helper a {
        color: #0b6780;
        text-decoration: none;
        font-weight: 700;
      }

      .billing-note {
        margin-top: 12px;
        border: 1px solid #cce2ea;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.45;
        color: #285060;
        background: #eff8fc;
      }

      .footer-note {
        margin-top: 10px;
        color: #cbe5eb;
        font-size: 12px;
      }

      @media (max-width: 960px) {
        .shell {
          grid-template-columns: 1fr;
          max-width: 700px;
        }

        .hero-panel {
          order: 2;
          padding: 20px;
        }

        .auth-column {
          order: 1;
        }

        .form-card {
          padding: 18px;
        }

        .field-row {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 560px) {
        .page {
          padding: 20px 12px;
        }

        .form-title {
          font-size: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div class="bg-orb top"></div>
    <div class="bg-orb bottom"></div>
    <div class="veil"></div>
    <main class="page">
      ${body}
    </main>
  </body>
</html>`;
}

function renderLoginHtml(requireMfa: boolean, errorMsg?: string): string {
  const errorBlock = errorMsg
    ? `<div style="margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fde8c0;color:#92400e;font-size:13px;font-weight:600;">${escapeHtml(errorMsg)}</div>`
    : '';
  const mfaField = requireMfa
    ? `<div class="field">
          <label class="label" for="mfa_code">Codigo MFA (TOTP)</label>
          <input class="input" id="mfa_code" name="mfa_code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="000000" autocomplete="one-time-code" required />
        </div>`
    : '';

  const body = `<section class="shell">
  <aside class="hero-panel">
    <span class="hero-badge">Acesso do ecossistema</span>
    <h1 class="hero-title">Entrar no restaurante-ops</h1>
    <p class="hero-subtitle">Interface web de operacao SaaS para clientes, contratos e metricas de uso.</p>

    <div class="highlight-grid">
      <article class="highlight-card">
        <h3 class="highlight-title">Operacao centralizada</h3>
        <p class="highlight-text">Acompanhe empresas, status de assinatura e saude operacional em um unico painel.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Controle financeiro</h3>
        <p class="highlight-text">Monitore trial, inadimplencia e regularizacao com base nos eventos de billing.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Fluxo alinhado ao restaurante-web</h3>
        <p class="highlight-text">Padrao visual e narrativa de onboarding espelhados para manter consistencia.</p>
      </article>
    </div>
  </aside>

  <section class="auth-column">
    <div class="form-card">
      <p class="form-eyebrow">Acesso restrito</p>
      <h2 class="form-title">Login do time interno</h2>
      <p class="form-subtitle">Use credenciais administrativas para acessar a operacao SaaS do ambiente.</p>

      ${errorBlock}
      <form method="post" action="/auth/login">
        <div class="field">
          <label class="label" for="email">Email</label>
          <input class="input" id="email" name="email" type="email" placeholder="seu@email.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="label" for="password">Senha</label>
          <input class="input" id="password" name="password" type="password" placeholder="********" autocomplete="current-password" required />
        </div>
        ${mfaField}
        <button class="btn-primary" type="submit">ENTRAR</button>
      </form>

      <p class="helper">Precisa recuperar acesso? Contate o administrador do ecossistema.</p>
    </div>
    <div class="footer-note">Machado & Cunha Soft House</div>
  </section>
</section>`;

  return renderBaseLayout('restaurante-ops | login', body);
}

function buildDashboardRedirect(notice?: string, error?: string): string {
  const params = new URLSearchParams();
  if (notice) params.set('notice', notice);
  if (error) params.set('error', error);
  const query = params.toString();
  return query ? `/dashboard?${query}` : '/dashboard';
}

function mapOpsLoginErrorMessage(message: string, requireMfa: boolean): string {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid_credentials')) {
    return 'Email ou senha incorretos.';
  }

  if (normalized.includes('perfil do usuario nao encontrado') || normalized.includes('usuario sem permissao') || normalized.includes('empresa autorizada')) {
    return 'Seu usuario nao tem permissao para acessar o painel ops.';
  }

  if (normalized.includes('configure o autenticador') || normalized.includes('mfa obrigatorio no ops')) {
    return 'Este usuario ainda nao cadastrou um autenticador. Cadastre o MFA no app ou web antes de entrar no ops.';
  }

  if (normalized.includes('codigo mfa obrigatorio')) {
    return 'Informe o codigo do Google Authenticator ou Microsoft Authenticator para entrar.';
  }

  if (normalized.includes('codigo mfa invalido') || normalized.includes('mfa invalido') || normalized.includes('expirado')) {
    return 'Codigo do autenticador invalido ou expirado. Gere um novo codigo e tente novamente.';
  }

  if (normalized.includes('falha ao validar mfa')) {
    return 'Nao foi possivel validar o autenticador agora. Tente novamente em instantes.';
  }

  if (normalized.includes('sessao nao criada')) {
    return 'Nao foi possivel iniciar a sessao. Tente novamente.';
  }

  if (requireMfa) {
    return 'Nao foi possivel concluir o login com MFA. Revise seus dados e tente novamente.';
  }

  return 'Nao foi possivel concluir o login. Revise seus dados e tente novamente.';
}

function renderRegisterHtml(): string {
  const body = `<section class="shell">
  <aside class="hero-panel">
    <span class="hero-badge">Cadastro da plataforma</span>
    <h1 class="hero-title">Criar acesso no restaurante-ops</h1>
    <p class="hero-subtitle">Estrutura voltada para operacao SaaS com trilha de clientes, contratos e suporte.</p>

    <div class="highlight-grid">
      <article class="highlight-card">
        <h3 class="highlight-title">Cadastro orientado</h3>
        <p class="highlight-text">Dados da empresa e do operador interno organizados em blocos claros.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Base pronta para monitoramento</h3>
        <p class="highlight-text">Conta preparada para acompanhar MRR, trial pipeline e carteira de clientes.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Convergencia com billing</h3>
        <p class="highlight-text">Fluxo preparado para sincronizar assinatura, invoices e reconciliacao.</p>
      </article>
    </div>
  </aside>

  <section class="auth-column">
    <div class="form-card">
      <p class="form-eyebrow">Novo acesso</p>
      <h2 class="form-title">Cadastro administrativo</h2>
      <p class="form-subtitle">Crie um usuario interno para operar clientes, contratos e alertas do backoffice SaaS.</p>

      <form method="post" action="/auth/register">
        <div class="field">
          <label class="label" for="full_name">Nome completo</label>
          <input class="input" id="full_name" name="full_name" type="text" placeholder="Nome do administrador" required />
        </div>

        <div class="field-row">
          <div class="field">
            <label class="label" for="company_name">Empresa</label>
            <input class="input" id="company_name" name="company_name" type="text" placeholder="Razao social" required />
          </div>
          <div class="field">
            <label class="label" for="document_type">Documento</label>
            <select class="select" id="document_type" name="document_type">
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label class="label" for="email">Email</label>
            <input class="input" id="email" name="email" type="email" placeholder="ops@empresa.com" required />
          </div>
          <div class="field">
            <label class="label" for="phone">Telefone</label>
            <input class="input" id="phone" name="phone" type="tel" placeholder="(83) 99999-9999" />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label class="label" for="password">Senha</label>
            <input class="input" id="password" name="password" type="password" placeholder="Minimo de 8 caracteres" required />
          </div>
          <div class="field">
            <label class="label" for="confirm_password">Confirmar senha</label>
            <input class="input" id="confirm_password" name="confirm_password" type="password" placeholder="Repita a senha" required />
          </div>
        </div>

        <button class="btn-primary" type="submit">CRIAR ACESSO</button>
      </form>

      <button class="btn-secondary" type="button" onclick="window.location.href='/login'">Voltar para login</button>
      <p class="helper">Esta tela segue o padrao visual do restaurante-web e pode ser conectada ao Supabase Auth.</p>
      <div class="billing-note">Trial de 30 dias, com regularizacao obrigatoria antes do vencimento para evitar bloqueio de operacao.</div>
    </div>
    <div class="footer-note">Machado & Cunha Soft House</div>
  </section>
</section>`;

  return renderBaseLayout('restaurante-ops | register', body);
}

function renderHomeHtml(): string {
  const body = `<section class="shell">
  <aside class="hero-panel">
    <span class="hero-badge">Backoffice SaaS</span>
    <h1 class="hero-title">restaurante-ops</h1>
    <p class="hero-subtitle">Painel web de operacao SaaS para clientes, billing e metricas.</p>

    <div class="highlight-grid">
      <article class="highlight-card">
        <h3 class="highlight-title">Clientes</h3>
        <p class="highlight-text">Lifecycle de empresas e acompanhamento de saude da carteira.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Billing</h3>
        <p class="highlight-text">Assinatura, invoices, reconciliacao e auditoria operacional.</p>
      </article>
      <article class="highlight-card">
        <h3 class="highlight-title">Metricas</h3>
        <p class="highlight-text">Visao de MRR, churn e engajamento por empresa e ambiente.</p>
      </article>
    </div>
  </aside>

  <section class="auth-column">
    <div class="form-card">
      <p class="form-eyebrow">Ambiente ativo</p>
      <h2 class="form-title">Servico online</h2>
      <p class="form-subtitle">Entradas iniciais de autenticacao e observabilidade prontas para Railway.</p>
      <div class="field-row">
        <div class="field">
          <span class="label">Ambiente</span>
          <input class="input" readonly value="${escapeHtml(String(env.OPS_ENV ?? ''))}" />
        </div>
        <div class="field">
          <span class="label">Porta</span>
          <input class="input" readonly value="${escapeHtml(String(env.OPS_PORT ?? ''))}" />
        </div>
      </div>
      <button class="btn-primary" type="button" onclick="window.location.href='/login'">Abrir Login</button>
      <button class="btn-secondary" type="button" onclick="window.location.href='/register'">Abrir Cadastro</button>
      <p class="helper">Healthcheck: <a href="/healthz">/healthz</a> | API status: <a href="/api/status">/api/status</a></p>
    </div>
    <div class="footer-note">Machado & Cunha Soft House</div>
  </section>
</section>`;

  return renderBaseLayout('restaurante-ops', body);
}

function renderQuickActionPanel(
  title: string,
  subtitle: string,
  body: string,
): string {
  const initials = 'OP';
  const operatorLabel = 'Operador autenticado';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>restaurante-ops | ${escapeHtml(title)}</title>
    <style>
      :root {
        --teal-700: #0c7a96;
        --teal-900: #073a49;
        --ink-900: #1d2a35;
        --ink-700: #2f4353;
        --ink-500: #516675;
        --line: #c8d7e1;
        --surface: #ffffff;
        --surface-muted: #f4f8fb;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: "Segoe UI", "Trebuchet MS", sans-serif;
        background: var(--surface-muted);
        color: var(--ink-900);
        min-height: 100vh;
        line-height: 1.45;
      }

      .topbar {
        background: var(--teal-700);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 64px;
        gap: 12px;
      }

      .topbar-brand {
        color: #fff;
        font-size: 22px;
        font-weight: 800;
      }

      .topbar-badge {
        font-size: 12px;
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 999px;
        padding: 4px 12px;
        color: #ecfbff;
        font-weight: 700;
        margin-left: 8px;
      }

      .topbar-user {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ecfbff;
        font-size: 15px;
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.22);
        border: 1.5px solid rgba(255,255,255,0.32);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        color: #fff;
      }

      .btn-logout {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.22);
        border-radius: 8px;
        padding: 7px 14px;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }

      .shell {
        max-width: 1200px;
        margin: 28px auto;
        padding: 0 20px 24px;
        display: grid;
        gap: 16px;
      }

      .title-card {
        background: linear-gradient(135deg, #0b6780, #0e7d9b);
        color: #fff;
        border-radius: 16px;
        padding: 18px 20px;
      }

      .title-card h1 {
        font-size: 30px;
        line-height: 1.2;
      }

      .title-card p {
        margin-top: 4px;
        color: #ecfbff;
        font-size: 16px;
      }

      .nav-links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
      }

      .nav-link {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px 12px;
        text-decoration: none;
        color: var(--ink-700);
        font-size: 14px;
        font-weight: 700;
      }

      .nav-link:hover { border-color: #0b6780; color: #0b6780; }

      .panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 2px 8px rgba(7,47,59,0.06);
      }

      .panel h2 {
        font-size: 20px;
        color: var(--ink-700);
        margin-bottom: 10px;
      }

      .panel p {
        font-size: 15px;
        color: var(--ink-700);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .metric {
        border: 1px solid #dbe7ee;
        border-radius: 12px;
        padding: 12px;
        background: #fbfdff;
      }

      .metric-label { font-size: 13px; color: var(--ink-500); font-weight: 700; }
      .metric-value { font-size: 24px; color: var(--ink-900); font-weight: 800; margin-top: 4px; }
      .metric-hint { font-size: 13px; color: var(--ink-700); margin-top: 2px; }

      .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px; }
      .table th { text-align: left; font-size: 12px; text-transform: uppercase; color: var(--ink-500); padding-bottom: 8px; }
      .table td { padding: 10px 0; border-top: 1px solid #e5eef4; color: var(--ink-700); }

      .pill {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }

      .ok { background: #f0fdf4; color: #14532d; border: 1px solid #bbf7d0; }
      .warn { background: #fff7ed; color: #92400e; border: 1px solid #fde8c0; }
      .info { background: #eff8fc; color: #0a5063; border: 1px solid #b8e2f0; }
      .error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

      .mono {
        margin-top: 10px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #dbe7ee;
        background: #f7fbfe;
        font-family: Consolas, "Courier New", monospace;
        font-size: 13px;
        overflow: auto;
      }

      @media (max-width: 780px) {
        .topbar { height: auto; padding: 10px 14px; flex-wrap: wrap; }
        .title-card h1 { font-size: 24px; }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:4px;">
        <span class="topbar-brand">restaurante-ops</span>
        <span class="topbar-badge">Backoffice SaaS</span>
      </div>
      <div class="topbar-user">
        <div class="avatar">${escapeHtml(initials)}</div>
        <span>${escapeHtml(operatorLabel)}</span>
        <a class="btn-logout" href="/auth/logout">Sair</a>
      </div>
    </header>

    <main class="shell">
      <section class="title-card">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </section>

      <nav class="nav-links">
        <a class="nav-link" href="/dashboard">Voltar ao dashboard</a>
        <a class="nav-link" href="/customers">Gerenciar clientes</a>
        <a class="nav-link" href="/billing">Faturamento e invoices</a>
        <a class="nav-link" href="/billing/plan-config">Preço do plano</a>
      </nav>

      ${body}
    </main>
  </body>
</html>`;
}

function statusPill(status: string | null): string {
  if (!status) return '<span class="pill info">sem plano</span>';
  const map: Record<string, string> = {
    active: 'ok',
    trialing: 'info',
    past_due: 'warn',
    grace_period: 'warn',
    suspended: 'warn',
    reactivated: 'ok',
    cancelled: 'warn',
  };
  const cls = map[status] ?? 'info';
  return `<span class="pill ${cls}">${escapeHtml(status)}</span>`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderCustomersPanel(
  kpis: KpiCounts,
  companies: CompanyRow[],
): string {
  const rows = companies.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#516675;">Nenhuma empresa encontrada.</td></tr>'
    : companies.map((c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.plan ?? '—')}</td>
          <td>${statusPill(c.subscription_status)}</td>
          <td>${fmtDate(c.trial_ends_at)}</td>
          <td>${fmtDate(c.created_at)}</td>
        </tr>`).join('');

  return renderQuickActionPanel(
    'Gerenciar clientes',
    'Lifecycle de contas e acompanhamento comercial.',
    `<section class="panel">
      <h2>Resumo da carteira</h2>
      <div class="grid">
        <article class="metric">
          <div class="metric-label">Clientes ativos</div>
          <div class="metric-value">${kpis.active}</div>
          <div class="metric-hint">Assinatura ativa</div>
        </article>
        <article class="metric">
          <div class="metric-label">Em trial</div>
          <div class="metric-value">${kpis.trialing}</div>
          <div class="metric-hint">Trial de 30 dias</div>
        </article>
        <article class="metric">
          <div class="metric-label">Em atraso / suspensos</div>
          <div class="metric-value">${kpis.pastDue}</div>
          <div class="metric-hint">past_due + suspended</div>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>Empresas cadastradas</h2>
      <table class="table">
        <thead>
          <tr><th>Empresa</th><th>Plano</th><th>Status</th><th>Trial ate</th><th>Criada em</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`,
  );
}

function renderBillingPanel(
  stats: InvoiceStats,
  ops: BillingOpsMetrics,
  invoices: InvoiceRow[],
): string {
  const invPill = (s: string) => {
    const map: Record<string, string> = { paid: 'ok', pending: 'info', failed: 'warn', cancelled: 'warn' };
    return `<span class="pill ${map[s] ?? 'info'}">${escapeHtml(s)}</span>`;
  };

  const rows = invoices.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#516675;">Nenhuma invoice encontrada.</td></tr>'
    : invoices.map((inv) => `
        <tr>
          <td>${escapeHtml(inv.company_name)}</td>
          <td>${brl(inv.amount)}</td>
          <td>${invPill(inv.status)}</td>
          <td>${fmtDate(inv.due_date)}</td>
          <td>${inv.paid_at ? fmtDate(inv.paid_at) : '—'}</td>
        </tr>`).join('');

  return renderQuickActionPanel(
    'Faturamento e invoices',
    'Visao operacional de pagamentos, invoices e conciliacao de assinaturas.',
    `<section class="panel">
      <h2>Visao de cobranca</h2>
      <div class="grid">
        <article class="metric">
          <div class="metric-label">Invoices abertas</div>
          <div class="metric-value">${stats.pending}</div>
          <div class="metric-hint">Faturas pendentes no ciclo atual</div>
        </article>
        <article class="metric">
          <div class="metric-label">Pagas hoje</div>
          <div class="metric-value">${stats.paidToday}</div>
          <div class="metric-hint">Pagamentos confirmados</div>
        </article>
        <article class="metric">
          <div class="metric-label">Atrasadas</div>
          <div class="metric-value">${stats.overdue}</div>
          <div class="metric-hint">Vencimento expirado</div>
        </article>
        <article class="metric">
          <div class="metric-label">A vencer em 7 dias</div>
          <div class="metric-value">${ops.dueSoonCount}</div>
          <div class="metric-hint">Prevencao de inadimplencia</div>
        </article>
        <article class="metric">
          <div class="metric-label">Eventos de falha</div>
          <div class="metric-value">${ops.failedCount}</div>
          <div class="metric-hint">failed + cancelled</div>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>Exposicao financeira</h2>
      <div class="grid">
        <article class="metric">
          <div class="metric-label">Valor pendente</div>
          <div class="metric-value">${brl(ops.pendingAmount)}</div>
          <div class="metric-hint">Saldo em aberto</div>
        </article>
        <article class="metric">
          <div class="metric-label">Valor em atraso</div>
          <div class="metric-value">${brl(ops.overdueAmount)}</div>
          <div class="metric-hint">Risco imediato</div>
        </article>
        <article class="metric">
          <div class="metric-label">Recebido no mes</div>
          <div class="metric-value">${brl(ops.collectedThisMonth)}</div>
          <div class="metric-hint">Faturas pagas no ciclo atual</div>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>Invoices recentes</h2>
      <table class="table">
        <thead>
          <tr><th>Empresa</th><th>Valor</th><th>Status</th><th>Vencimento</th><th>Pago em</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`,
  );
}

function renderPlanConfigPanel(
  canManagePlanConfig: boolean,
  active: import('./modules/billing-plan-config-operations.js').ActivePlanConfig | null,
  history: import('./modules/billing-plan-config-operations.js').ActivePlanConfig[],
  audit: import('./modules/billing-plan-config-operations.js').PlanConfigAuditEntry[],
): string {
  const isAdmin = canManagePlanConfig;

  const activeBrl = active
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(active.amount_cents / 100)
    : '—';

  const histRows = history.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#516675;">Sem histórico disponível.</td></tr>'
    : history.map((row) => `
        <tr>
          <td>${brl(row.amount_cents)}</td>
          <td>${escapeHtml(row.currency)}</td>
          <td>${row.trial_days} dias</td>
          <td>${fmtDate(row.effective_from)}</td>
        </tr>`).join('');

  const auditRows = audit.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#516675;">Sem eventos de auditoria.</td></tr>'
    : audit.map((a) => `
        <tr>
          <td>${escapeHtml(a.action)}</td>
          <td>${brl((a.after_snapshot as any)?.amount_cents ?? 0)}</td>
          <td>${escapeHtml(a.changed_by)}</td>
          <td>${fmtDate(a.created_at)}</td>
        </tr>`).join('');

  const formHtml = isAdmin ? `
    <section class="panel">
      <h2>Alterar preço do plano</h2>
      <p style="margin-bottom:14px;color:#516675;font-size:14px;">
        Somente administradores podem alterar o preço. A alteração tem efeito imediato nas próximas cobranças.
        O histórico completo é mantido para auditoria.
      </p>
      <form id="plan-config-form" style="display:grid;gap:12px;max-width:520px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:13px;font-weight:700;color:#2f4353;" for="amount_brl">Valor (R$)</label>
            <input id="amount_brl" name="amount_brl" type="number" min="1" max="100000" step="0.01"
              placeholder="Ex: 149.00"
              style="display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:15px;" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:700;color:#2f4353;" for="trial_days">Dias de trial</label>
            <input id="trial_days" name="trial_days" type="number" min="0" max="365" value="30"
              style="display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:15px;" />
          </div>
        </div>
        <div>
          <label style="font-size:13px;font-weight:700;color:#2f4353;" for="effective_from">Vigência a partir de (ISO 8601)</label>
          <input id="effective_from" name="effective_from" type="datetime-local"
            style="display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:15px;" />
        </div>
        <div>
          <label style="font-size:13px;font-weight:700;color:#2f4353;" for="change_reason">Motivo da alteração (5–500 caracteres)</label>
          <textarea id="change_reason" name="change_reason" rows="2" placeholder="Ex: Reajuste de tabela — Jan/2026"
            style="display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:15px;resize:vertical;"></textarea>
        </div>
        <div id="plan-form-msg" style="display:none;padding:10px;border-radius:8px;font-size:14px;font-weight:700;"></div>
        <button id="plan-submit-btn" type="submit"
          style="align-self:start;padding:10px 24px;background:#0c7a96;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">
          Confirmar alteração
        </button>
      </form>
      <script>
        (function () {
          const form = document.getElementById('plan-config-form');
          const msg = document.getElementById('plan-form-msg');
          const btn = document.getElementById('plan-submit-btn');

          // Default effective_from to now — must use LOCAL time string for datetime-local input.
          // toISOString() returns UTC; datetime-local inputs without timezone are parsed as LOCAL
          // time by the browser on submit, which would shift the value by the UTC offset (e.g. -3h
          // for Brasília), causing effective_from to land in the future and the config to be inactive.
          const now = new Date();
          now.setSeconds(0, 0);
          const pad = function(n) { return String(n).padStart(2, '0'); };
          const localIso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
            + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
          document.getElementById('effective_from').value = localIso;

          form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const amountBrl = parseFloat(document.getElementById('amount_brl').value);
            const trialDays = parseInt(document.getElementById('trial_days').value, 10);
            const effectiveFrom = document.getElementById('effective_from').value;
            const changeReason = document.getElementById('change_reason').value.trim();

            if (!amountBrl || amountBrl <= 0) {
              showMsg('error', 'Informe um valor válido (maior que zero).');
              return;
            }
            if (!changeReason || changeReason.length < 5) {
              showMsg('error', 'Informe o motivo da alteração (mínimo 5 caracteres).');
              return;
            }

            btn.disabled = true;
            btn.textContent = 'Enviando...';

            try {
              const resp = await fetch('/ops/billing/plan-config/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  plan_code: 'default_monthly',
                  amount_cents: Math.round(amountBrl * 100),
                  currency: 'BRL',
                  trial_days: isNaN(trialDays) ? 30 : trialDays,
                  effective_from: new Date(effectiveFrom).toISOString(),
                  change_reason: changeReason,
                }),
              });
              const data = await resp.json();
              if (resp.ok && data.ok) {
                showMsg('ok', 'Plano atualizado com sucesso. Recarregando em 2s...');
                setTimeout(() => window.location.reload(), 2000);
              } else {
                showMsg('error', data.error || 'Erro desconhecido ao ativar configuração.');
              }
            } catch (err) {
              showMsg('error', 'Erro de rede. Verifique a conexão e tente novamente.');
            } finally {
              btn.disabled = false;
              btn.textContent = 'Confirmar alteração';
            }
          });

          function showMsg(type, text) {
            msg.style.display = 'block';
            msg.className = 'pill ' + (type === 'ok' ? 'ok' : 'error');
            msg.style.padding = '10px';
            msg.textContent = text;
          }
        })();
      </script>
    </section>` : `
    <section class="panel">
      <p style="color:#516675;font-size:14px;">
        <strong>Somente administradores</strong> podem alterar o preço do plano. Entre em contato com um admin para solicitar alterações.
      </p>
    </section>`;

  return renderQuickActionPanel(
    'Configuração de Preço do Plano',
    'Gerencie o valor do plano mensal cobrado aos restaurantes. Alterações têm efeito imediato nas próximas cobranças.',
    `<section class="panel">
      <h2>Configuração ativa</h2>
      <div class="grid">
        <article class="metric">
          <div class="metric-label">Valor atual</div>
          <div class="metric-value">${activeBrl}</div>
          <div class="metric-hint">${active ? `${active.currency} — ${active.amount_cents} centavos` : 'Nenhuma configuração ativa'}</div>
        </article>
        <article class="metric">
          <div class="metric-label">Trial padrão</div>
          <div class="metric-value">${active?.trial_days ?? '—'} dias</div>
          <div class="metric-hint">Período de avaliação gratuita</div>
        </article>
        <article class="metric">
          <div class="metric-label">Vigente desde</div>
          <div class="metric-value" style="font-size:18px;">${active ? fmtDate(active.effective_from) : '—'}</div>
          <div class="metric-hint">Data de ativação da configuração atual</div>
        </article>
      </div>
    </section>

    ${formHtml}

    <section class="panel">
      <h2>Histórico de preços</h2>
      <table class="table">
        <thead>
          <tr><th>Valor</th><th>Moeda</th><th>Trial</th><th>Vigente desde</th></tr>
        </thead>
        <tbody>${histRows}</tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Auditoria de alterações</h2>
      <table class="table">
        <thead>
          <tr><th>Ação</th><th>Novo valor</th><th>Alterado por</th><th>Data</th></tr>
        </thead>
        <tbody>${auditRows}</tbody>
      </table>
    </section>`,
  );
}

function renderMetricsPanel(
  metrics: SaasMetrics,
  breakdown: SubscriptionBreakdown,
  revenueSeries: RevenuePoint[],
): string {
  const mrrFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr);
  const revenueRows = revenueSeries.length === 0
    ? '<tr><td colspan="2" style="text-align:center;color:#516675;">Sem dados de receita no periodo.</td></tr>'
    : revenueSeries
      .map((point) => `<tr><td>${escapeHtml(point.label)}</td><td>${brl(point.amount)}</td></tr>`)
      .join('');

  return renderQuickActionPanel(
    'Metricas SaaS',
    'Indicadores de crescimento, receita e saude da base.',
    `<section class="panel">
      <h2>KPIs principais</h2>
      <div class="grid">
        <article class="metric">
          <div class="metric-label">MRR estimado</div>
          <div class="metric-value">${mrrFmt}</div>
          <div class="metric-hint">Soma de assinaturas ativas</div>
        </article>
        <article class="metric">
          <div class="metric-label">Cancelados no mes</div>
          <div class="metric-value">${metrics.cancelledThisMonth}</div>
          <div class="metric-hint">Churn do ciclo atual</div>
        </article>
        <article class="metric">
          <div class="metric-label">Conversao trial</div>
          <div class="metric-value">${metrics.conversionRate}</div>
          <div class="metric-hint">Trials ativos convertidos</div>
        </article>
        <article class="metric">
          <div class="metric-label">Total de empresas</div>
          <div class="metric-value">${metrics.totalCompanies}</div>
          <div class="metric-hint">Ativas no cadastro</div>
        </article>
        <article class="metric">
          <div class="metric-label">Pagantes</div>
          <div class="metric-value">${metrics.activeCompanies}</div>
          <div class="metric-hint">Status active</div>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>Distribuicao de assinaturas</h2>
      <table class="table">
        <thead>
          <tr><th>Status</th><th>Quantidade</th></tr>
        </thead>
        <tbody>
          <tr><td>active</td><td>${breakdown.active}</td></tr>
          <tr><td>trialing</td><td>${breakdown.trialing}</td></tr>
          <tr><td>past_due</td><td>${breakdown.pastDue}</td></tr>
          <tr><td>suspended</td><td>${breakdown.suspended}</td></tr>
          <tr><td>cancelled</td><td>${breakdown.cancelled}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Receita confirmada (ultimos 6 meses)</h2>
      <table class="table">
        <thead>
          <tr><th>Mes</th><th>Valor recebido</th></tr>
        </thead>
        <tbody>${revenueRows}</tbody>
      </table>
    </section>`,
  );
}

/** Coleta o body de um POST como string (limite 64 KB). */
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

/** Parseia application/x-www-form-urlencoded simples. */
function parseFormBody(raw: string): Record<string, string> {
  if (!raw || raw.trim() === '') {
    return {};
  }

  const entries: Array<[string, string]> = [];

  for (const pair of raw.split('&')) {
    if (!pair) continue;

    const eqIndex = pair.indexOf('=');
    const keyPart = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    const valuePart = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);

    try {
      const key = decodeURIComponent(keyPart.replace(/\+/g, '%20'));
      const value = decodeURIComponent(valuePart.replace(/\+/g, '%20'));
      entries.push([key, value]);
    } catch {
      throw new Error('Form body invalido no corpo da requisicao.');
    }
  }

  return Object.fromEntries(entries);
}

function parseJsonBody<T>(raw: string): T {
  if (!raw || raw.trim() === '') return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('JSON invalido no corpo da requisicao.');
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseIntegerQuery(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const EXTERNAL_LOG_SERVICES = new Set(['ops', 'web', 'app', 'supabase', 'activepieces', 'evolution']);
const EXTERNAL_LOG_LEVELS = new Set(['info', 'warn', 'error']);
const EXTERNAL_LOG_MAX_BATCH_SIZE = 500;
const EXTERNAL_LOG_SENSITIVE_KEY_FRAGMENTS = [
  'token',
  'secret',
  'password',
  'cookie',
  'authorization',
  'api_key',
  'apikey',
  'service_role',
  'mp_payment',
  'card',
  'cvv',
  'pix_qr',
  'cpf',
  'phone',
];

function sanitizeExternalString(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, '[REDACTED]')
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_]+/g, '[REDACTED]')
    .trim();
}

function isExternalSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return EXTERNAL_LOG_SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function sanitizeExternalValue(value: unknown, keyHint?: string): unknown {
  if (value == null) return value;

  if (keyHint && isExternalSensitiveKey(keyHint)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return sanitizeExternalString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeExternalValue(entry, keyHint));
  }

  if (typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      obj[key] = sanitizeExternalValue(entry, key);
    }
    return obj;
  }

  return value;
}

function normalizeIncomingLog(entry: unknown, fallbackRequestId: string): LogEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry as Record<string, unknown>;

  const level = sanitizePlainText(String(raw.level || '')).toLowerCase();
  if (!EXTERNAL_LOG_LEVELS.has(level)) return null;

  const service = sanitizePlainText(String(raw.service || '')).toLowerCase();
  if (!EXTERNAL_LOG_SERVICES.has(service)) return null;

  const event = sanitizeExternalString(String(raw.event || ''));
  if (!event) return null;

  const message = sanitizeExternalString(String(raw.message || event));
  if (!message) return null;

  const tsRaw = sanitizePlainText(String(raw.timestamp || ''));
  let timestamp = new Date().toISOString();
  if (tsRaw) {
    const parsed = new Date(tsRaw);
    if (!Number.isNaN(parsed.getTime())) {
      timestamp = parsed.toISOString();
    }
  }
  const request_id_raw = sanitizePlainText(String(raw.request_id || ''));
  const request_id = isUuid(request_id_raw) ? request_id_raw : fallbackRequestId;
  const user_id = sanitizePlainText(String(raw.user_id || '')) || undefined;
  const order_id = sanitizePlainText(String(raw.order_id || '')) || undefined;
  const durationCandidate =
    typeof raw.duration_ms === 'number'
      ? raw.duration_ms
      : typeof raw.durationMs === 'number'
        ? raw.durationMs
        : undefined;
  const duration_ms =
    typeof durationCandidate === 'number' && Number.isFinite(durationCandidate) && durationCandidate >= 0
      ? Math.floor(durationCandidate)
      : undefined;

  const metadataRaw = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  const metadata = sanitizeExternalValue(metadataRaw, 'metadata') as Record<string, unknown>;

  return {
    timestamp,
    level: level as 'info' | 'warn' | 'error',
    service,
    event,
    message,
    request_id,
    user_id,
    order_id,
    duration_ms,
    metadata,
  };
}

function extractExternalLogsPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { logs?: unknown[] }).logs)) {
    return (payload as { logs: unknown[] }).logs;
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

const BILLING_COMPANY_PATH_FRAGMENT = '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})';
const BILLING_AUDIT_PATH_RE = new RegExp(`^/ops/billing/company/${BILLING_COMPANY_PATH_FRAGMENT}/audit$`);
const BILLING_SNAPSHOT_PATH_RE = new RegExp(`^/ops/billing/company/${BILLING_COMPANY_PATH_FRAGMENT}$`);
const BILLING_CARD_PATH_RE = new RegExp(`^/ops/billing/company/${BILLING_COMPANY_PATH_FRAGMENT}/regularize/card$`);
const BILLING_PIX_PATH_RE = new RegExp(`^/ops/billing/company/${BILLING_COMPANY_PATH_FRAGMENT}/regularize/pix$`);

function validateReconcileInput(input: Partial<ReconcileInput>): string | null {
  if (!input.companyId || !input.idempotencyKey || !input.eventType || !input.paymentStatus) {
    return 'Campos obrigatorios: companyId, idempotencyKey, eventType, paymentStatus';
  }

  if (!isUuid(input.companyId)) {
    return 'companyId invalido. Informe UUID valido.';
  }

  if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 120) {
    return 'idempotencyKey deve ter entre 8 e 120 caracteres.';
  }

  if (input.paymentStatus !== 'paid' && input.paymentStatus !== 'failed') {
    return 'paymentStatus deve ser "paid" ou "failed".';
  }

  if (input.paymentMethodType && input.paymentMethodType !== 'card' && input.paymentMethodType !== 'pix') {
    return 'paymentMethodType deve ser "card" ou "pix".';
  }

  if (input.invoiceId && !isUuid(input.invoiceId)) {
    return 'invoiceId invalido. Informe UUID valido.';
  }

  return null;
}

/** Valida que o código de erro só contém caracteres seguros antes de incluir na resposta. */
function safeBillingCode(code: string, fallback: string): string {
  return /^[A-Z][A-Z0-9_]{2,49}$/.test(code) ? code : fallback;
}

function respondBillingError(res: import('node:http').ServerResponse, err: unknown): void {
  if (err instanceof BillingOperationError) {
    const safeMessage = err.message
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/eyJ[A-Za-z0-9._-]{10,}/g, '[REDACTED]')
      .replace(/sb_(publishable|secret)_[A-Za-z0-9_]+/g, '[REDACTED]');

    logWarn('billing.operation_error_detail', { message: safeMessage, code: err.code });
    respondJson(res, err.statusCode, {
      code: safeBillingCode(err.code, 'BILLING_OPERATION_ERROR'),
    });
    return;
  }

  respondJson(res, 500, {
    error: 'Erro interno no billing. Tente novamente em instantes.',
    code: 'BILLING_INTERNAL_ERROR',
  });
}

function respondInternalError(
  req: IncomingMessage,
  res: import('node:http').ServerResponse,
  safePath: string,
  requestId?: string,
): void {
  logError('http.unhandled_error', {
    method: req.method,
    path: safePath,
    statusCode: 500,
    request_id: requestId,
  });

  if (res.headersSent) {
    res.end();
    return;
  }

  const accept = sanitizePlainText(Array.isArray(req.headers.accept) ? req.headers.accept[0] : req.headers.accept ?? '');
  if (accept.includes('text/html')) {
    res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderBaseLayout('Erro interno', `
      <section class="form-card" style="max-width:720px;margin:0 auto;">
        <p class="form-eyebrow">restaurante-ops</p>
        <h1 class="form-title">Erro interno</h1>
        <p class="form-subtitle">Nao foi possivel concluir a solicitacao. Revise os logs do servidor para diagnostico.</p>
      </section>
    `));
    return;
  }

  respondJson(res, 500, { error: 'Internal Server Error' });
}

function startServer() {
  // Initialize Redis before starting server
  initRedis(env.REDIS_URL)
    .then(async () => {
      const redisHealth = await checkRedisHealth();
      logInfo('redis.initialized', { detail: `${redisHealth.status}: ${redisHealth.message}` });
    })
    .catch((err) => {
      logWarn('redis.init_failed', { detail: err instanceof Error ? err.message : String(err) });
    });

  startAlertScheduler();
  startRetentionScheduler(opsCompanyId);

  const server = createOpsHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const safeRequestUrl = sanitizeRequestTarget(req.url);
    const safePathForLog = sanitizePlainText(safeRequestUrl.split('?')[0] || '/');
    const { requestId } = attachRequestTracking(req, res, safePathForLog);

    try {
      applySecurityHeaders(res);
      const url = new URL(safeRequestUrl, 'https://localhost');
      const path = url.pathname;

      if (enforceHttpsInProduction(req, res, path, url.search)) {
        return;
      }

      if (enforceCanonicalHost(req, res, path, url.search)) {
        return;
      }

      // ---- Healthcheck / API status (publicos) ----
      if (path === '/healthz') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, service: 'restaurante-ops', env: env.OPS_ENV }));
        return;
      }

      if (path === '/api/status') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            service: 'restaurante-ops',
            modules: ['customers', 'billing', 'metrics'],
            env: env.OPS_ENV,
          }),
        );
        return;
      }

      if (req.method === 'POST' && path === '/api/logs') {
        const inboundApiKeyRaw = req.headers['x-log-api-key'];
        const inboundApiKey = Array.isArray(inboundApiKeyRaw) ? inboundApiKeyRaw[0] : inboundApiKeyRaw;
        const expectedApiKey = env.OPS_LOG_API_KEY;

        if (!expectedApiKey) {
          logError('observability.external_logs_misconfigured', {
            request_id: requestId,
            statusCode: 503,
            reason: 'OPS_LOG_API_KEY not configured',
          });
          respondJson(res, 503, { error: 'Servico de ingestao indisponivel.' });
          return;
        }

        if (typeof inboundApiKey !== 'string' || inboundApiKey.trim() !== expectedApiKey) {
          logWarn('observability.external_logs_unauthorized', {
            request_id: requestId,
            statusCode: 401,
          });
          respondJson(res, 401, { error: 'Nao autorizado.' });
          return;
        }

        const rateKey = `logs:${Buffer.from(inboundApiKey).toString('base64').slice(0, 32)}`;
        const rateLimitResult = await checkRateLimit(
          rateKey,
          env.OPS_LOG_RATE_LIMIT_MAX_ATTEMPTS,
          env.OPS_LOG_RATE_LIMIT_WINDOW_MS,
          { allowMemoryFallback: env.RATE_LIMIT_FALLBACK_ENABLED },
        );

        if (rateLimitResult.unavailableReason) {
          logError('observability.external_logs_rate_limit_unavailable', {
            request_id: requestId,
            statusCode: 503,
            reason: rateLimitResult.unavailableReason,
          });
          respondJson(res, 503, { error: 'Servico temporariamente indisponivel.' });
          return;
        }

        if (!rateLimitResult.allowed) {
          const retryAfter = Math.max(1, Math.floor(Number(rateLimitResult.retryAfterSeconds) || 1));
          res.setHeader('Retry-After', String(retryAfter));
          res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
          res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());
          logWarn('observability.external_logs_rate_limited', {
            request_id: requestId,
            statusCode: 429,
            reason: `retry_after=${retryAfter}`,
          });
          respondJson(res, 429, { error: 'Muitas requisicoes de logs.', retryAfter });
          return;
        }

        let accepted = 0;
        let rejected = 0;

        try {
          const rawBody = await readBody(req);
          const parsedBody = parseJsonBody<unknown>(rawBody);
          const incoming = extractExternalLogsPayload(parsedBody).slice(0, EXTERNAL_LOG_MAX_BATCH_SIZE);

          for (const entry of incoming) {
            const normalized = normalizeIncomingLog(entry, requestId);
            if (!normalized) {
              rejected += 1;
              continue;
            }
            enqueueLog(normalized);
            accepted += 1;
          }

          logInfo('observability.external_logs_ingested', {
            request_id: requestId,
            statusCode: 202,
            accepted,
            rejected,
            metadata: { total_received: incoming.length },
          });

          respondJson(res, 202, {
            ok: true,
            accepted,
            rejected,
            total: accepted + rejected,
          });
        } catch (err) {
          logError('observability.external_logs_invalid_payload', {
            request_id: requestId,
            statusCode: 400,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 400, { error: 'Payload de logs invalido.' });
        }
        return;
      }

      // ---- Telas publicas de auth ----
      if (req.method === 'GET' && path === '/login') {
        // EMERGENCY: Always false on fetch failure to prevent lockout
        const securitySettings = await getOpsSecuritySettings(opsCompanyId).catch(() => ({ requireMfa: false }));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(renderLoginHtml(securitySettings.requireMfa));
        return;
      }

      if (req.method === 'GET' && path === '/register') {
        logWarn('http.scaffold_route_blocked', {
          method: req.method,
          path,
          statusCode: 302,
          reason: 'register_ui_disabled',
        });
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }

      // ---- POST /auth/login — autenticacao real via Supabase ----
      if (req.method === 'POST' && path === '/auth/login') {
        let rateKey = '';
        try {
          const securitySettings = await getOpsSecuritySettings(opsCompanyId).catch(() => ({ requireMfa: false }));
          const requireMfa = securitySettings.requireMfa;
          const raw = await readBody(req);
          const body = parseFormBody(raw);
          const { email, password, mfa_code } = body;
          const normalizedEmail = String(email || '').toLowerCase().trim();
          const normalizedMfaCode = String(mfa_code || '').trim();
          const clientIp = getRequestIp(req);
          rateKey = `login:${clientIp}:${normalizedEmail}`;

          // Check rate limit
          const rateLimitResult = await checkRateLimit(
            rateKey,
            env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
            env.AUTH_RATE_LIMIT_WINDOW_MS,
            { allowMemoryFallback: env.RATE_LIMIT_FALLBACK_ENABLED },
          );

          if (rateLimitResult.unavailableReason) {
            logError('auth.rate_limit_unavailable', {
              method: req.method,
              path,
              statusCode: 503,
              reason: rateLimitResult.unavailableReason,
              request_id: requestId,
            });
            res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' });
            res.end(renderLoginHtml(requireMfa, 'Servico temporariamente indisponivel. Tente novamente em instantes.'));
            return;
          }

          if (!rateLimitResult.allowed) {
            const retryAfter = Math.max(1, Math.floor(Number(rateLimitResult.retryAfterSeconds) || 1));
            logWarn('auth.login_rate_limited', {
              method: req.method,
              path,
              statusCode: 429,
              reason: `retry_after=${retryAfter}`,
              request_id: requestId,
            });
            res.setHeader('Retry-After', String(retryAfter));
            res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
            res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());
            res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' });
            res.end(renderLoginHtml(requireMfa, 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'));
            return;
          }

          if (!email || !password || (requireMfa && !normalizedMfaCode)) {
            res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
            res.end(renderLoginHtml(requireMfa,
              requireMfa
              ? 'Email, senha e codigo MFA sao obrigatorios.'
              : 'Email e senha sao obrigatorios.'));
            return;
          }

          const { token } = await signInWithPassword(
            normalizedEmail,
            String(password),
            requireMfa,
            requireMfa ? normalizedMfaCode : undefined,
          );

          // Reset rate limit on successful login
          await resetRateLimit(rateKey);

          logInfo('auth.login_success', {
            method: req.method,
            path,
            email: normalizedEmail,
            statusCode: 302,
            request_id: requestId,
          });

          setSessionCookie(res, token);
          res.writeHead(302, { Location: '/dashboard' });
          res.end();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
          const securitySettings = await getOpsSecuritySettings(opsCompanyId).catch(() => ({ requireMfa: false }));
          const safeLoginMessage = mapOpsLoginErrorMessage(msg, securitySettings.requireMfa);
          logWarn('auth.login_failed', {
            method: req.method,
            path,
            statusCode: 401,
            reason: msg,
            request_id: requestId,
          });
          res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
          res.end(renderLoginHtml(securitySettings.requireMfa, safeLoginMessage));
        }
        return;
      }

      // ---- POST /auth/register — scaffold (integracao completa na proxima fase) ----
      if (req.method === 'POST' && path === '/auth/register') {
        logWarn('http.scaffold_route_blocked', {
          method: req.method,
          path,
          statusCode: 404,
          reason: 'register_endpoint_disabled',
        });
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            error: 'Not Found',
          }),
        );
        return;
      }

      // ---- GET /auth/logout ----
      if (path === '/auth/logout') {
        logInfo('auth.logout', {
          method: req.method,
          path,
          statusCode: 302,
        });
        clearSessionCookie(res);
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }

      // ---- GET / raiz — redireciona para dashboard (middleware valida sessao) ----
      if (path === '/') {
        res.writeHead(302, { Location: '/dashboard' });
        res.end();
        return;
      }

      // ---- GET /dashboard — protegido ----
      if (path === '/dashboard') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const safeUser = sanitizeOpsUserForHtml(user);
        const [kpis, companies, securitySettings, mfaUsers, currentUserMfaVerified] = await Promise.all([
          fetchKpiCounts(),
          fetchRecentCompanies(8),
          getOpsSecuritySettings(opsCompanyId).catch(() => ({ requireMfa: false })),
          listOpsMfaUsers(opsCompanyId).catch(() => []),
          userHasVerifiedMfa(user.id).catch(() => false),
        ]);
        const notice = sanitizeQueryMessage(url.searchParams.get('notice'));
        const error = sanitizeQueryMessage(url.searchParams.get('error'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(renderDashboardHtml(safeUser, {
          kpis,
          companies,
          opsRequireMfa: securitySettings.requireMfa,
          mfaUsers,
          currentUserMfaVerified,
          securityNotice: notice,
          securityError: error,
          canManageSecurity: safeUser.role === 'admin',
        }));
        return;
      }

      if (req.method === 'POST' && path === '/security/mfa/toggle') {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (user.role !== 'admin') {
          res.writeHead(302, { Location: buildDashboardRedirect(undefined, 'Somente administradores podem alterar a exigencia de MFA do painel ops.') });
          res.end();
          return;
        }

        try {
          const raw = await readBody(req);
          const body = parseFormBody(raw);
          const requireMfa = String(body.require_mfa || 'false') === 'true';
          await updateOpsRequireMfa(opsCompanyId, requireMfa);
          res.writeHead(302, { Location: buildDashboardRedirect(requireMfa ? 'Exigencia de MFA habilitada com sucesso no painel ops.' : 'Exigencia de MFA desabilitada com sucesso no painel ops.') });
          res.end();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a configuracao de MFA do painel ops.';
          res.writeHead(302, { Location: buildDashboardRedirect(undefined, message) });
          res.end();
        }
        return;
      }

      if (req.method === 'POST' && path === '/security/mfa/reset-user') {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (user.role !== 'admin') {
          res.writeHead(302, { Location: buildDashboardRedirect(undefined, 'Somente administradores podem remover autenticadores MFA de usuarios.') });
          res.end();
          return;
        }

        try {
          const raw = await readBody(req);
          const body = parseFormBody(raw);
          const targetUserId = String(body.target_user_id || '').trim();
          if (!targetUserId) {
            res.writeHead(302, { Location: buildDashboardRedirect(undefined, 'Selecione um usuario valido para remover os autenticadores MFA.') });
            res.end();
            return;
          }

          const removedCount = await resetUserMfaFactors(opsCompanyId, targetUserId);
          const notice = removedCount > 0
            ? `Autenticadores MFA removidos com sucesso (${removedCount} item(ns) removido(s)).`
            : 'O usuario selecionado nao possui autenticadores MFA cadastrados.';
          res.writeHead(302, { Location: buildDashboardRedirect(notice) });
          res.end();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nao foi possivel remover os autenticadores MFA do usuario.';
          res.writeHead(302, { Location: buildDashboardRedirect(undefined, message) });
          res.end();
        }
        return;
      }

      // ---- GET /security/mfa-setup — configurar MFA pessoal do admin ----
      if (req.method === 'GET' && path === '/security/mfa-setup') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const webBaseUrl = env.WEB_BASE_URL || 'https://restaurante-web.app.br';
        const safeMfaBaseUrl = /^https:\/\/[a-zA-Z0-9]/.test(webBaseUrl)
          ? webBaseUrl
          : 'https://restaurante-web.app.br';
        const mfaSetupUrl = escapeHtml(`${safeMfaBaseUrl}/admin?tab=mfa-setup`);

        const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Configurar MFA - Restaurante Ops</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #0c7a96 0%, #0a5063 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        max-width: 500px;
        width: 100%;
        padding: 40px;
        text-align: center;
      }
      .icon {
        width: 80px;
        height: 80px;
        background: #0c7a96;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        font-size: 40px;
      }
      h1 {
        color: #1d2a35;
        margin-bottom: 10px;
        font-size: 28px;
      }
      p {
        color: #6f808d;
        margin-bottom: 20px;
        line-height: 1.6;
      }
      .step {
        background: #f5f7fa;
        border-left: 4px solid #0c7a96;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
        text-align: left;
      }
      .step-number {
        display: inline-block;
        background: #0c7a96;
        color: white;
        width: 28px;
        height: 28px;
        line-height: 28px;
        border-radius: 50%;
        font-weight: bold;
        margin-right: 10px;
        text-align: center;
      }
      .step-text {
        color: #1d2a35;
        font-weight: 500;
        margin-top: 10px;
      }
      .button {
        display: inline-block;
        background: #0c7a96;
        color: white;
        padding: 12px 30px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        margin-top: 20px;
        border: none;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s;
      }
      .button:hover {
        background: #0a5063;
      }
      .secondary {
        background: transparent;
        color: #0c7a96;
        border: 2px solid #0c7a96;
        margin-left: 10px;
      }
      .secondary:hover {
        background: #f5f7fa;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">🔐</div>
      <h1>Configurar Autenticação de Dois Fatores</h1>
      <p>Para ativar MFA com Google/Microsoft Authenticator, acesse o painel de configurações no App ou Web.</p>
      
      <div class="step">
        <div><span class="step-number">1</span><strong>Clique no botão abaixo</strong></div>
        <div class="step-text">Você será redirecionado para o painel web.</div>
      </div>
      
      <div class="step">
        <div><span class="step-number">2</span><strong>Acesse Admin → Configurar MFA (2FA)</strong></div>
        <div class="step-text">Clique em "Começar Configuração".</div>
      </div>
      
      <div class="step">
        <div><span class="step-number">3</span><strong>Escaneie o QR Code</strong></div>
        <div class="step-text">Use Google Authenticator ou Microsoft Authenticator no seu celular.</div>
      </div>
      
      <div class="step">
        <div><span class="step-number">4</span><strong>Confirme com o código gerado</strong></div>
        <div class="step-text">Voltará para o restaurante-ops automaticamente.</div>
      </div>

      <a href="${mfaSetupUrl}" class="button">Ir para Configurar MFA no App/Web</a>
      <a href="/dashboard" class="button secondary">Voltar ao Painel</a>
    </div>
  </body>
</html>`;

        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // ---- Endpoints JSON administrativos (protegidos) ----
      if (req.method === 'GET' && path === '/api/logs') {
        const user = await requireAuth(req, res);
        if (!user) return;

        try {
          const limit = parseIntegerQuery(url.searchParams.get('limit'), 50, 1, 200);
          const offset = parseIntegerQuery(url.searchParams.get('offset'), 0, 0, 100000);
          const service = sanitizePlainText(url.searchParams.get('service') || '');
          const level = sanitizePlainText(url.searchParams.get('level') || '') as 'info' | 'warn' | 'error' | '';
          const event = sanitizePlainText(url.searchParams.get('event') || '');
          const from = sanitizePlainText(url.searchParams.get('from') || '');
          const to = sanitizePlainText(url.searchParams.get('to') || '');
          const request_id = sanitizePlainText(url.searchParams.get('request_id') || '');
          const order_id = sanitizePlainText(url.searchParams.get('order_id') || '');
          const user_id = sanitizePlainText(url.searchParams.get('user_id') || '');

          const result = await queryLogs({
            limit,
            offset,
            service: service || undefined,
            level: level || undefined,
            event: event || undefined,
            from: from || undefined,
            to: to || undefined,
            request_id: request_id || undefined,
            order_id: order_id || undefined,
            user_id: user_id || undefined,
          });

          respondJson(res, 200, result);
        } catch (err) {
          logError('observability.logs_query_failed', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel consultar logs.' });
        }
        return;
      }

      if (req.method === 'GET' && path.startsWith('/api/logs/trace/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        const traceRequestId = sanitizePlainText(path.replace('/api/logs/trace/', ''));
        if (!isUuid(traceRequestId)) {
          respondJson(res, 400, { error: 'requestId invalido. Informe UUID valido.' });
          return;
        }

        try {
          const timeline = await traceRequest(traceRequestId);
          respondJson(res, 200, {
            request_id: traceRequestId,
            timeline,
          });
        } catch (err) {
          logError('observability.trace_request_failed', {
            request_id: requestId,
            trace_request_id: traceRequestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel rastrear request_id.' });
        }
        return;
      }

      if (req.method === 'GET' && path.startsWith('/api/logs/order/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        const traceOrderId = sanitizePlainText(path.replace('/api/logs/order/', ''));
        if (!isUuid(traceOrderId)) {
          respondJson(res, 400, { error: 'orderId invalido. Informe UUID valido.' });
          return;
        }

        try {
          const timeline = await traceOrder(traceOrderId);
          respondJson(res, 200, { timeline });
        } catch (err) {
          logError('observability.trace_order_failed', {
            request_id: requestId,
            order_id: traceOrderId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel rastrear order_id.' });
        }
        return;
      }

      if (req.method === 'GET' && path === '/api/logs/metrics') {
        const user = await requireAuth(req, res);
        if (!user) return;

        try {
          const periodHours = parseIntegerQuery(url.searchParams.get('hours'), 24, 1, 168);
          const metrics = await getLogMetrics(periodHours);
          respondJson(res, 200, metrics);
        } catch (err) {
          logError('observability.metrics_failed', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel calcular metricas de logs.' });
        }
        return;
      }

      // ---- Observabilidade — alertas ----
      if (req.method === 'GET' && path === '/api/logs/alerts') {
        const user = await requireAuth(req, res);
        if (!user) return;

        try {
          const enabled = url.searchParams.get('enabled');
          const alerts = await listAlerts(enabled === 'true' ? true : enabled === 'false' ? false : undefined);
          respondJson(res, 200, { ok: true, alerts });
        } catch (err) {
          logError('observability.alerts_list_failed', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel listar alertas.' });
        }
        return;
      }

      if (req.method === 'POST' && path === '/api/logs/alerts') {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (user.role !== 'admin') {
          respondJson(res, 403, { error: 'Acesso negado. Somente admin pode criar alertas.' });
          return;
        }

        try {
          const rawBody = await readBody(req);
          const body = parseJsonBody<{
            name?: unknown;
            description?: unknown;
            enabled?: unknown;
            channel?: unknown;
            channel_config?: unknown;
            condition?: unknown;
          }>(rawBody);

          const name = sanitizePlainText(String(body?.name ?? ''));
          if (!name) {
            respondJson(res, 400, { error: 'Campo name e obrigatorio.' });
            return;
          }

          const alert = await createAlert({
            name,
            description: body?.description != null ? sanitizePlainText(String(body.description)) : undefined,
            enabled: body?.enabled !== false,
            channel: (body?.channel === 'webhook' || body?.channel === 'slack' ? body.channel : 'internal') as 'webhook' | 'slack' | 'internal',
            channel_config: body?.channel_config as Record<string, string> | undefined,
            condition: body?.condition as AlertCondition,
          });

          respondJson(res, 201, { ok: true, alert });
        } catch (err) {
          logError('observability.alert_create_failed', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel criar o alerta.' });
        }
        return;
      }

      if (req.method === 'PUT' && path.startsWith('/api/logs/alerts/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (user.role !== 'admin') {
          respondJson(res, 403, { error: 'Acesso negado. Somente admin pode editar alertas.' });
          return;
        }

        const alertIdRaw = sanitizePlainText(path.replace('/api/logs/alerts/', ''));
        const alertId = Number.parseInt(alertIdRaw, 10);
        if (Number.isNaN(alertId) || alertId <= 0) {
          respondJson(res, 400, { error: 'ID de alerta invalido.' });
          return;
        }

        try {
          const rawBody = await readBody(req);
          const body = parseJsonBody<Record<string, unknown>>(rawBody);

          const updates: Record<string, unknown> = {};
          if (body?.name != null) updates.name = sanitizePlainText(String(body.name));
          if (body?.description != null) updates.description = sanitizePlainText(String(body.description));
          if (typeof body?.enabled === 'boolean') updates.enabled = body.enabled;
          if (body?.channel != null) updates.channel = body.channel;
          if (body?.channel_config != null) updates.channel_config = body.channel_config;
          if (body?.condition != null) updates.condition = body.condition;

          await updateAlert(alertId, updates);
          respondJson(res, 200, { ok: true });
        } catch (err) {
          logError('observability.alert_update_failed', {
            request_id: requestId,
            alert_id: alertId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel atualizar o alerta.' });
        }
        return;
      }

      if (req.method === 'DELETE' && path.startsWith('/api/logs/alerts/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (user.role !== 'admin') {
          respondJson(res, 403, { error: 'Acesso negado. Somente admin pode excluir alertas.' });
          return;
        }

        const alertIdRaw = sanitizePlainText(path.replace('/api/logs/alerts/', ''));
        const alertId = Number.parseInt(alertIdRaw, 10);
        if (Number.isNaN(alertId) || alertId <= 0) {
          respondJson(res, 400, { error: 'ID de alerta invalido.' });
          return;
        }

        try {
          await deleteAlert(alertId);
          respondJson(res, 200, { ok: true });
        } catch (err) {
          logError('observability.alert_delete_failed', {
            request_id: requestId,
            alert_id: alertId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Nao foi possivel excluir o alerta.' });
        }
        return;
      }

      if (req.method === 'PUT' && path.startsWith('/api/observability/monitored-services/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (user.role !== 'admin') {
          respondJson(res, 403, { error: 'Acesso negado. Somente admin pode editar endpoints monitorados.' });
          return;
        }

        const serviceKey = sanitizePlainText(path.replace('/api/observability/monitored-services/', ''));
        if (!serviceKey) {
          respondJson(res, 400, { error: 'service_key obrigatorio.' });
          return;
        }

        try {
          const rawBody = await readBody(req);
          const body = parseJsonBody<Record<string, unknown>>(rawBody);

          const baseUrl = sanitizePlainText(String(body.base_url ?? ''));
          const healthPath = sanitizePlainText(String(body.health_path ?? '/'));
          const method = sanitizePlainText(String(body.method ?? 'GET')).toUpperCase();
          const timeoutMs = Number.parseInt(String(body.timeout_ms ?? '5000'), 10);
          const expectedStatusMin = Number.parseInt(String(body.expected_status_min ?? '200'), 10);
          const expectedStatusMax = Number.parseInt(String(body.expected_status_max ?? '399'), 10);
          const enabled = body.enabled !== false;

          const updated = await updateMonitoredServiceConfig({
            service_key: serviceKey,
            base_url: baseUrl,
            health_path: healthPath,
            method: method === 'HEAD' ? 'HEAD' : 'GET',
            timeout_ms: Number.isNaN(timeoutMs) ? 5000 : timeoutMs,
            expected_status_min: Number.isNaN(expectedStatusMin) ? 200 : expectedStatusMin,
            expected_status_max: Number.isNaN(expectedStatusMax) ? 399 : expectedStatusMax,
            enabled,
          });

          logInfo('observability.monitored_service_updated', {
            request_id: requestId,
            service_key: serviceKey,
            user_id: user.id,
            metadata: {
              method: updated.method,
              health_path: updated.health_path,
              timeout_ms: updated.timeout_ms,
              expected_status_min: updated.expected_status_min,
              expected_status_max: updated.expected_status_max,
              enabled: updated.enabled,
            },
          });

          respondJson(res, 200, { ok: true, service: updated });
        } catch (err) {
          logError('observability.monitored_service_update_failed', {
            request_id: requestId,
            service_key: serviceKey,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 400, {
            error: err instanceof Error ? err.message : 'Nao foi possivel atualizar servico monitorado.',
          });
        }
        return;
      }

      if (req.method === 'PUT' && path === '/api/observability/settings/retention') {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (user.role !== 'admin') {
          respondJson(res, 403, { error: 'Acesso negado. Somente admin pode editar a retencao de logs.' });
          return;
        }

        try {
          const rawBody = await readBody(req);
          const body = parseJsonBody<Record<string, unknown>>(rawBody);
          const retentionDays = Number.parseInt(String(body.retention_days ?? ''), 10);

          if (Number.isNaN(retentionDays)) {
            respondJson(res, 400, { error: 'retention_days obrigatorio.' });
            return;
          }

          const settings = await updateOpsLogRetentionDays(opsCompanyId, retentionDays);
          let cleanup: { deletedCount: number; retentionDays: number; source: 'panel' | 'env' } | null = null;

          try {
            cleanup = await runRetentionCleanupCycle(opsCompanyId);
          } catch {
            cleanup = null;
          }

          logInfo('observability.retention_updated', {
            request_id: requestId,
            user_id: user.id,
            metadata: {
              log_retention_days: settings.logRetentionDays,
              source: settings.source,
              env_default_days: settings.envDefaultDays,
            },
          });

          respondJson(res, 200, { ok: true, settings, cleanup });
        } catch (err) {
          logError('observability.retention_update_failed', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 400, {
            error: err instanceof Error ? err.message : 'Nao foi possivel atualizar a retencao de logs.',
          });
        }
        return;
      }

      // ---- Webhooks de integracao (Activepieces + Evolution) ----
      if (req.method === 'POST' && path === '/webhooks/activepieces') {
        await handleActivepiecesWebhook(req, res, requestId);
        return;
      }

      if (req.method === 'POST' && path === '/webhooks/evolution') {
        await handleEvolutionWebhook(req, res, requestId);
        return;
      }

      // ---- Dashboard de Observabilidade ----
      if (req.method === 'GET' && path === '/observability') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const tab = sanitizePlainText(url.searchParams.get('tab') || 'logs');
        const filters: Record<string, string> = {};
        for (const key of ['service', 'level', 'event', 'request_id', 'order_id', 'from', 'to', 'limit', 'offset']) {
          const v = sanitizePlainText(url.searchParams.get(key) || '');
          if (v) filters[key] = v;
        }

        try {
          const opts: Parameters<typeof renderObservabilityHtml>[0] = {
            tab,
            userEmail: user.email,
          };

          if (tab === 'logs') {
            const limit = parseIntegerQuery(url.searchParams.get('limit'), 50, 1, 200);
            const offset = parseIntegerQuery(url.searchParams.get('offset'), 0, 0, 100000);
            filters.limit = String(limit);
            filters.offset = String(offset);
            const result = await queryLogs({
              limit,
              offset,
              service: filters.service || undefined,
              level: (filters.level as 'info' | 'warn' | 'error' | undefined) || undefined,
              event: filters.event || undefined,
              from: filters.from || undefined,
              to: filters.to || undefined,
              request_id: filters.request_id || undefined,
              order_id: filters.order_id || undefined,
            });
            opts.logs = result.logs;
            opts.logsTotal = result.total;
            opts.logsFilters = filters;
          } else if (tab === 'metrics') {
            const hours = parseIntegerQuery(url.searchParams.get('hours'), 24, 1, 168);
            const [logMetrics, saasMetrics, billingOpsMetrics] = await Promise.all([
              getLogMetrics(hours),
              fetchSaasMetrics(),
              fetchBillingOpsMetrics(),
            ]);
            opts.metrics = logMetrics;
            opts.saasMetrics = saasMetrics;
            opts.billingOpsMetrics = billingOpsMetrics;
          } else if (tab === 'trace') {
            const traceId = sanitizePlainText(url.searchParams.get('trace_id') || '');
            const traceType = url.searchParams.get('trace_type') === 'order' ? 'order' : 'request';
            opts.traceId = traceId;
            opts.traceType = traceType;
            if (traceId) {
              opts.timeline = traceType === 'order'
                ? await traceOrder(traceId)
                : await traceRequest(traceId);
            } else {
              opts.timeline = [];
            }
          } else if (tab === 'alerts') {
            opts.alerts = await listAlerts();
          } else if (tab === 'service-status') {
            const [services, supabaseMetrics, monitoredServices, observabilitySettings] = await Promise.all([
              checkAllServices(),
              getSupabaseMetrics(),
              listMonitoredServicesConfig(),
              getOpsObservabilitySettings(opsCompanyId),
            ]);
            opts.services = services;
            opts.supabaseMetrics = supabaseMetrics;
            opts.monitoredServices = monitoredServices;
            opts.canManageMonitoredServices = user.role === 'admin';
            opts.observabilitySettings = observabilitySettings;
            opts.canManageObservabilitySettings = user.role === 'admin';
          } else if (tab === 'api-status') {
            // API status não requer dados externos, renderização fixa
          }

          respondHtml(res, 200, renderObservabilityHtml(opts));
        } catch (err) {
          logError('observability.dashboard_failed', {
            request_id: requestId,
            tab,
            error: err instanceof Error ? err.message : String(err),
          });
          respondJson(res, 500, { error: 'Erro ao renderizar dashboard de observabilidade.' });
        }
        return;
      }

      if (req.method === 'GET' && path === '/ops/customers') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const [kpis, companies] = await Promise.all([
          fetchKpiCounts(),
          fetchRecentCompanies(50),
        ]);

        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          generatedAt: new Date().toISOString(),
          kpis,
          companies,
        }));
        return;
      }

      if (req.method === 'GET' && path.startsWith('/ops/billing/company/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        const auditMatch = path.match(BILLING_AUDIT_PATH_RE);
        if (auditMatch) {
          const companyId = auditMatch[1];
          if (!isUuid(companyId)) {
            respondJson(res, 400, { error: 'companyId invalido. Informe UUID valido.' });
            return;
          }
          const safeCompanyId = companyId.toLowerCase();

          const limitRaw = url.searchParams.get('limit');
          const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 30;
          const entries = await fetchBillingAudit(safeCompanyId, Number.isNaN(limit) ? 30 : limit);

          respondJson(res, 200, {
            ok: true,
            generatedAt: new Date().toISOString(),
            count: entries.length,
            entries,
          });
          return;
        }

        const snapshotMatch = path.match(BILLING_SNAPSHOT_PATH_RE);
        if (snapshotMatch) {
          const companyId = snapshotMatch[1];
          if (!isUuid(companyId)) {
            respondJson(res, 400, { error: 'companyId invalido. Informe UUID valido.' });
            return;
          }
          const safeCompanyId = companyId.toLowerCase();

          const snapshot = await fetchBillingSnapshot(safeCompanyId);
          respondJson(res, 200, {
            ok: true,
            generatedAt: new Date().toISOString(),
            snapshot: {
              ...snapshot,
              companyId: safeCompanyId,
            },
          });
          return;
        }
      }

      if (req.method === 'POST' && path.startsWith('/ops/billing/company/')) {
        const user = await requireAuth(req, res);
        if (!user) return;

        // Apply rate limiting to billing operations
        const billingRateKey = `billing:${user.id}`;
        const billingRateLimit = await checkRateLimit(
          billingRateKey,
          env.RATE_LIMIT_BILLING_MAX_ATTEMPTS,
          env.RATE_LIMIT_BILLING_WINDOW_MS,
          { allowMemoryFallback: env.RATE_LIMIT_FALLBACK_ENABLED },
        );

        if (billingRateLimit.unavailableReason) {
          logError('billing.rate_limit_unavailable', {
            method: req.method,
            path,
            statusCode: 503,
            reason: billingRateLimit.unavailableReason,
          });
          respondJson(res, 503, {
            error: 'Servico temporariamente indisponivel. Tente novamente em instantes.',
          });
          return;
        }

        if (!billingRateLimit.allowed) {
          const retryAfter = Math.max(1, Math.floor(Number(billingRateLimit.retryAfterSeconds) || 1));
          logWarn('billing.operation_rate_limited', {
            method: req.method,
            path,
            statusCode: 429,
            reason: `billing_rate_limit_exceeded for ${user.id}`,
          });
          res.setHeader('Retry-After', String(retryAfter));
          res.setHeader('X-RateLimit-Remaining', String(billingRateLimit.remaining));
          res.setHeader('X-RateLimit-Reset', billingRateLimit.resetAt.toISOString());
          res.writeHead(429, { 'content-type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              error: 'Muitas operacoes de cobranca. Aguarde um minuto e tente novamente.',
              retryAfter,
            }),
          );
          return;
        }

        const cardMatch = path.match(BILLING_CARD_PATH_RE);
        if (cardMatch) {
          const companyId = cardMatch[1];
          if (!isUuid(companyId)) {
            respondJson(res, 400, { error: 'companyId invalido. Informe UUID valido.' });
            return;
          }
          const safeCompanyId = companyId.toLowerCase();

          const body = parseJsonBody<{ invoiceId?: string }>(await readBody(req));
          if (body.invoiceId && !isUuid(body.invoiceId)) {
            respondJson(res, 400, { error: 'invoiceId invalido. Informe UUID valido.' });
            return;
          }

          try {
            const result = await regularizeByCard(safeCompanyId, user.id, body.invoiceId);
            respondJson(res, 200, result);
          } catch (err) {
            respondBillingError(res, err);
          }
          return;
        }

        const pixMatch = path.match(BILLING_PIX_PATH_RE);
        if (pixMatch) {
          const companyId = pixMatch[1];
          if (!isUuid(companyId)) {
            respondJson(res, 400, { error: 'companyId invalido. Informe UUID valido.' });
            return;
          }
          const safeCompanyId = companyId.toLowerCase();

          const body = parseJsonBody<{ invoiceId?: string }>(await readBody(req));
          if (body.invoiceId && !isUuid(body.invoiceId)) {
            respondJson(res, 400, { error: 'invoiceId invalido. Informe UUID valido.' });
            return;
          }

          try {
            const result = await regularizeByPix(safeCompanyId, user.id, body.invoiceId);
            respondJson(res, 200, result);
          } catch (err) {
            respondBillingError(res, err);
          }
          return;
        }
      }

      if (req.method === 'POST' && path === '/ops/billing/reconcile') {
        const user = await requireAuth(req, res);
        if (!user) return;

        // Apply rate limiting to billing operations
        const billingRateKey = `billing:${user.id}`;
        const billingRateLimit = await checkRateLimit(
          billingRateKey,
          env.RATE_LIMIT_BILLING_MAX_ATTEMPTS,
          env.RATE_LIMIT_BILLING_WINDOW_MS,
          { allowMemoryFallback: env.RATE_LIMIT_FALLBACK_ENABLED },
        );

        if (billingRateLimit.unavailableReason) {
          logError('billing.rate_limit_unavailable', {
            method: req.method,
            path,
            statusCode: 503,
            reason: billingRateLimit.unavailableReason,
          });
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              error: 'Servico temporariamente indisponivel. Tente novamente em instantes.',
            }),
          );
          return;
        }

        if (!billingRateLimit.allowed) {
          const retryAfter = Math.max(1, Math.floor(Number(billingRateLimit.retryAfterSeconds) || 1));
          logWarn('billing.operation_rate_limited', {
            method: req.method,
            path,
            statusCode: 429,
            reason: `billing_rate_limit_exceeded for ${user.id}`,
          });
          res.setHeader('Retry-After', String(retryAfter));
          res.setHeader('X-RateLimit-Remaining', String(billingRateLimit.remaining));
          res.setHeader('X-RateLimit-Reset', billingRateLimit.resetAt.toISOString());
          res.writeHead(429, { 'content-type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              error: 'Muitas operacoes de cobranca. Aguarde um minuto e tente novamente.',
              retryAfter,
            }),
          );
          return;
        }

        const body = parseJsonBody<Partial<ReconcileInput>>(await readBody(req));
        const validationError = validateReconcileInput(body);
        if (validationError) {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            error: validationError,
          }));
          return;
        }

        try {
          const result = await reconcileBillingEvent(user.id, {
            companyId: body.companyId as string,
            idempotencyKey: body.idempotencyKey as string,
            eventType: body.eventType as string,
            paymentStatus: body.paymentStatus as 'paid' | 'failed',
            invoiceId: body.invoiceId,
            mpPaymentId: body.mpPaymentId,
            paymentMethodType: body.paymentMethodType,
            errorCode: body.errorCode,
            payload: body.payload,
          });

          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
        } catch (err) {
          respondBillingError(res, err);
        }
        return;
      }

      // ---- Billing Invoice Divergence Check ----
      if (req.method === 'POST' && path === '/ops/billing/invoice-divergence') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const body = parseJsonBody<{ companyId?: string; invoiceId?: string }>(await readBody(req));
        if (!body.companyId || !body.invoiceId) {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'companyId e invoiceId sao obrigatorios.' }));
          return;
        }

        try {
          const result = await checkInvoiceAmountDivergence(body.companyId, body.invoiceId, user.id);
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, ...result }));
        } catch (err) {
          respondBillingError(res, err);
        }
        return;
      }

      // ---- Billing Plan Config — GET active / history / audit ----
      if (req.method === 'GET' && path === '/ops/billing/plan-config') {
        const user = await requireAuth(req, res);
        if (!user) return;

        try {
          const [active, history, audit] = await Promise.all([
            fetchActivePlanConfig(),
            fetchPlanConfigHistory('default_monthly', 20),
            fetchPlanConfigAudit('default_monthly', 30),
          ]);

          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            ok: true,
            generatedAt: new Date().toISOString(),
            active,
            history,
            audit,
          }));
        } catch (err) {
          if (err instanceof PlanConfigOperationError) {
            logWarn('billing.plan_config_activate_error', { message: err.message, code: err.code });
            res.writeHead(err.statusCode, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: safeBillingCode(err.code, 'PLAN_CONFIG_ERROR') }));
          } else {
            res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Erro ao carregar configuração de plano.' }));
          }
        }
        return;
      }

      // ---- Billing Plan Config — POST activate (admin only) ----
      if (req.method === 'POST' && path === '/ops/billing/plan-config/activate') {
        const user = await requireAuth(req, res);
        if (!user) return;

        // RBAC: only 'admin' role may change plan pricing (not gerente)
        if (user.role !== 'admin') {
          logWarn('billing.plan_config.unauthorized_attempt', {
            actor_id: user.id,
            actor_role: user.role,
            path,
          });
          res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            error: 'Acesso negado. Alteracao de preco exige perfil admin.',
            code: 'PLAN_CONFIG_FORBIDDEN',
          }));
          return;
        }

        // Rate limiting — reuse billing rate limit bucket
        const rlKey = `billing:${user.id}`;
        const rl = await checkRateLimit(
          rlKey,
          env.RATE_LIMIT_BILLING_MAX_ATTEMPTS,
          env.RATE_LIMIT_BILLING_WINDOW_MS,
          { allowMemoryFallback: env.RATE_LIMIT_FALLBACK_ENABLED },
        );

        if (rl.unavailableReason) {
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Servico temporariamente indisponivel.' }));
          return;
        }

        if (!rl.allowed) {
          const retryAfter = Math.max(1, Math.floor(Number(rl.retryAfterSeconds) || 1));
          res.setHeader('Retry-After', String(retryAfter));
          res.writeHead(429, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Muitas tentativas. Aguarde e tente novamente.', retryAfter }));
          return;
        }

        const raw = await readBody(req);
        const body = parseJsonBody<Partial<ActivatePlanConfigInput>>(raw);

        const validationError = validateActivatePlanConfigInput(body);
        if (validationError) {
          respondJson(res, 400, { error: validationError, code: 'PLAN_CONFIG_INVALID_INPUT' });
          return;
        }

        logInfo('billing.plan_config.activate_requested', {
          actor_id: user.id,
          plan_code: body.plan_code,
          amount_cents: body.amount_cents,
          currency: body.currency,
          trial_days: body.trial_days,
          effective_from: body.effective_from,
        });

        try {
          const result = await activatePlanConfig({
            plan_code: body.plan_code as string,
            amount_cents: body.amount_cents as number,
            currency: body.currency as string,
            trial_days: body.trial_days as number,
            effective_from: body.effective_from as string,
            change_reason: body.change_reason as string,
            changed_by: user.id,
          });

          logInfo('billing.plan_config.activated', {
            actor_id: user.id,
            new_config_id: result.new_config_id,
            amount_cents: body.amount_cents,
            effective_from: body.effective_from,
          });

          respondJson(res, 200, {
            ok: true,
            new_config_id: result.new_config_id,
            message: 'Nova configuração de plano ativada com sucesso. Efeito imediato nas proximas cobranças.',
          });
        } catch (err) {
          if (err instanceof PlanConfigOperationError) {
            logWarn('billing.plan_config_operation_error', { message: err.message, code: err.code });
            respondJson(res, err.statusCode, { code: safeBillingCode(err.code, 'PLAN_CONFIG_ERROR') });
          } else {
            logError('billing.plan_config.activate_error', {
              actor_id: user.id,
              error: err instanceof Error ? err.message : String(err),
            });
            respondJson(res, 500, { error: 'Erro interno ao ativar configuração de plano.' });
          }
        }
        return;
      }

      if (req.method === 'GET' && path === '/ops/billing/summary') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const [stats, ops, recentInvoices] = await Promise.all([
          fetchInvoiceStats(),
          fetchBillingOpsMetrics(),
          fetchRecentInvoices(20),
        ]);

        respondJson(res, 200, {
          ok: true,
          generatedAt: new Date().toISOString(),
          stats,
          ops,
          recentInvoices,
        });
        return;
      }

      if (req.method === 'GET' && path === '/ops/metrics/portfolio') {
        const user = await requireAuth(req, res);
        if (!user) return;

        const [metrics, breakdown, revenueSeries] = await Promise.all([
          fetchSaasMetrics(),
          fetchSubscriptionBreakdown(),
          fetchRevenueSeries(6),
        ]);

        respondJson(res, 200, {
          ok: true,
          generatedAt: new Date().toISOString(),
          metrics,
          breakdown,
          revenueSeries,
        });
        return;
      }

      // ---- Rotas filhas protegidas (paineis de acoes rapidas) ----
      if (path === '/customers') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const [kpis, companies] = await Promise.all([
          fetchKpiCounts(),
          fetchRecentCompanies(20),
        ]);
        respondHtml(res, 200, renderCustomersPanel(kpis, companies));
        return;
      }

      if (path === '/billing') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const [stats, ops, invoices] = await Promise.all([
          fetchInvoiceStats(),
          fetchBillingOpsMetrics(),
          fetchRecentInvoices(15),
        ]);
        respondHtml(res, 200, renderBillingPanel(stats, ops, invoices));
        return;
      }

      if (path === '/billing/plan-config') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const canManagePlanConfig = user.role === 'admin';
        try {
          const [active, history, audit] = await Promise.all([
            fetchActivePlanConfig(),
            fetchPlanConfigHistory('default_monthly', 20),
            fetchPlanConfigAudit('default_monthly', 50),
          ]);
          respondHtml(res, 200, renderPlanConfigPanel(canManagePlanConfig, active, history, audit));
        } catch (err) {
          respondHtml(res, 200, renderPlanConfigPanel(canManagePlanConfig, null, [], []));
        }
        return;
      }

      if (path === '/metrics') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const [metrics, breakdown, revenueSeries] = await Promise.all([
          fetchSaasMetrics(),
          fetchSubscriptionBreakdown(),
          fetchRevenueSeries(6),
        ]);
        respondHtml(res, 200, renderMetricsPanel(metrics, breakdown, revenueSeries));
        return;
      }



      // ---- Modo legacy: homepage publica ----
      if (path === '/home') {
        logWarn('http.scaffold_route_blocked', {
          method: req.method,
          path,
          statusCode: 302,
          reason: 'legacy_home_disabled',
        });
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }

      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      logWarn('http.not_found', {
        method: req.method,
        path,
        statusCode: 404,
        request_id: requestId,
      });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err) {
      logError('http.route_failed', {
        method: req.method,
        path: safePathForLog,
        statusCode: 500,
        error: err instanceof Error ? err.message : 'Unknown error',
        request_id: requestId,
      });
      respondInternalError(req, res, safePathForLog, requestId);
    }
  }, env);

  server.on('clientError', (err: Error, socket: Socket) => {
    logError('http.client_error', {
      error: err.message,
    });
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  server.listen(env.OPS_PORT, () => {
    logInfo('server.started', {
      statusCode: 200,
      detail: env.OPS_PUBLIC_BASE_URL || `http://localhost:${env.OPS_PORT}`,
    });
  });
}

startServer();
