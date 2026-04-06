/**
 * observability.ts
 * Dashboard de observabilidade — Log Viewer, Métricas, Trace, Alertas, Estado do Serviço e API Status.
 * Renderizado server-side seguindo o padrão de templates HTML do restaurante-ops.
 */

import type { LogEntry, LogMetrics, AlertRow } from '../lib/log-storage.js';
import type { SaasMetrics, BillingOpsMetrics } from '../modules/data.js';
import type { ServiceStatus, MonitoredServiceConfig } from '../modules/service-status.js';
import type { OpsObservabilitySettingsPayload } from '../modules/ops-observability-settings.js';

export interface SupabaseMetrics {
  status: 'online' | 'offline' | 'unknown';
  activeConnections?: number;
  databaseSize?: string;
  responseTime?: number;
  detail?: string;
  error?: string;
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

function levelPill(level: string): string {
  const map: Record<string, string> = {
    info: 'pill-info',
    warn: 'pill-warn',
    error: 'pill-error',
  };
  const cls = map[level] ?? 'pill-info';
  return `<span class="pill ${cls}">${escapeHtml(level)}</span>`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtMoneyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function renderObsStyles(): string {
  return `
    :root {
      --teal-700: #0c7a96;
      --teal-900: #073a49;
      --ink-900: #1d2a35;
      --ink-700: #2f4353;
      --ink-500: #516675;
      --line: #c8d7e1;
      --surface: #ffffff;
      --surface-muted: #f4f8fb;
      --red: #dc2626;
      --amber: #d97706;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", "Trebuchet MS", sans-serif;
      background: var(--surface-muted);
      color: var(--ink-900);
      min-height: 100vh;
    }
    .topbar {
      background: var(--teal-700);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 58px;
      gap: 12px;
    }
    .topbar-brand { color: #fff; font-size: 20px; font-weight: 800; }
    .topbar-badge {
      font-size: 11px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 999px;
      padding: 3px 10px;
      color: #ecfbff;
      font-weight: 700;
      margin-left: 8px;
    }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }
    .btn-logout {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 8px;
      padding: 6px 12px;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
    .shell {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px 20px 32px;
      display: grid;
      gap: 16px;
    }
    .nav-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 2px solid var(--line);
      padding-bottom: 0;
    }
    .nav-tab {
      padding: 8px 18px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 14px;
      font-weight: 700;
      color: var(--ink-500);
      cursor: pointer;
      margin-bottom: -2px;
      text-decoration: none;
    }
    .nav-tab.active {
      color: var(--teal-700);
      border-bottom-color: var(--teal-700);
    }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 16px;
    }
    .panel h2 { font-size: 17px; color: var(--ink-700); margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; }
    .metric {
      border: 1px solid #dbe7ee;
      border-radius: 10px;
      padding: 12px;
      background: #fbfdff;
    }
    .metric-label { font-size: 12px; color: var(--ink-500); font-weight: 700; text-transform: uppercase; }
    .metric-value { font-size: 26px; color: var(--ink-900); font-weight: 800; margin-top: 4px; }
    .metric-hint { font-size: 12px; color: var(--ink-700); margin-top: 2px; }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
      padding: 12px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
    }
    .filter-bar label { font-size: 12px; font-weight: 700; color: var(--ink-700); display: block; margin-bottom: 4px; }
    .filter-bar input,
    .filter-bar select {
      border: 1px solid #c8d7e1;
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 13px;
      background: var(--surface-muted);
      color: var(--ink-900);
      outline: none;
    }
    .filter-bar input:focus,
    .filter-bar select:focus { border-color: var(--teal-700); background: #fff; }
    .btn-primary {
      padding: 8px 18px;
      background: var(--teal-700);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--ink-500);
      padding: 0 8px 8px;
    }
    .table td { padding: 8px; border-top: 1px solid #e5eef4; color: var(--ink-700); vertical-align: top; }
    .table tr:hover td { background: #f7fbfe; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .pill-info { background: #eff8fc; color: #0a5063; border: 1px solid #b8e2f0; }
    .pill-warn { background: #fff7ed; color: #92400e; border: 1px solid #fde8c0; }
    .pill-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .pill-ok { background: #f0fdf4; color: #14532d; border: 1px solid #bbf7d0; }
    .mono {
      font-family: Consolas, "Courier New", monospace;
      font-size: 11px;
      word-break: break-all;
      max-width: 280px;
    }
    .empty-state {
      text-align: center;
      color: var(--ink-500);
      padding: 32px;
      font-size: 14px;
    }
    .pagination { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
    .pagination a {
      padding: 6px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--teal-700);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
    .pagination a.disabled { color: var(--ink-500); pointer-events: none; }
    .pagination span { font-size: 13px; color: var(--ink-500); }
    .trace-row { background: #f7fbfe !important; }
    .trace-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      margin-right: 4px;
    }
    @media (max-width: 780px) {
      .topbar { height: auto; padding: 10px 14px; flex-wrap: wrap; }
      .filter-bar { flex-direction: column; }
    }
  `;
}

function renderTopbar(userEmail: string): string {
  return `<header class="topbar">
    <div style="display:flex;align-items:center;gap:4px;">
      <span class="topbar-brand">restaurante-ops</span>
      <span class="topbar-badge">Observabilidade</span>
    </div>
    <div class="topbar-actions">
      <span style="color:#ecfbff;font-size:13px;">${escapeHtml(userEmail)}</span>
      <a class="btn-logout" href="/dashboard">Dashboard</a>
      <a class="btn-logout" href="/auth/logout">Sair</a>
    </div>
  </header>`;
}

function renderNavTabs(activeTab: string): string {
  const tabs = [
    { id: 'logs', label: 'Logs', href: '/observability' },
    { id: 'metrics', label: 'Métricas', href: '/observability?tab=metrics' },
    { id: 'trace', label: 'Trace', href: '/observability?tab=trace' },
    { id: 'alerts', label: 'Alertas', href: '/observability?tab=alerts' },
    { id: 'service-status', label: 'Estado do Serviço', href: '/observability?tab=service-status' },
    { id: 'api-status', label: 'API Status', href: '/observability?tab=api-status' },
  ];

  return `<nav class="nav-tabs">
    ${tabs.map((t) => `<a class="nav-tab${activeTab === t.id ? ' active' : ''}" href="${t.href}">${t.label}</a>`).join('')}
  </nav>`;
}

function buildFilterHref(
  base: Record<string, string>,
  overrides: Record<string, string | number>,
): string {
  const params = new URLSearchParams({ ...base, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) });
  return `/observability?tab=logs&${params.toString()}`;
}

// ────────────────────────────────────────────────────────────
// TAB: LOGS
// ────────────────────────────────────────────────────────────
function renderLogsTab(
  logs: LogEntry[],
  total: number,
  filters: Record<string, string>,
): string {
  const limit = Number(filters.limit ?? 50);
  const offset = Number(filters.offset ?? 0);
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < total;

  const filterBar = `<form method="get" action="/observability" class="filter-bar">
    <input type="hidden" name="tab" value="logs" />
    <div>
      <label>Serviço</label>
      <select name="service">
        <option value="">Todos</option>
        ${['ops', 'web', 'app', 'supabase', 'activepieces', 'evolution'].map(
          (s) => `<option value="${s}"${filters.service === s ? ' selected' : ''}>${s}</option>`,
        ).join('')}
      </select>
    </div>
    <div>
      <label>Nível</label>
      <select name="level">
        <option value="">Todos</option>
        ${['info', 'warn', 'error'].map(
          (l) => `<option value="${l}"${filters.level === l ? ' selected' : ''}>${l}</option>`,
        ).join('')}
      </select>
    </div>
    <div>
      <label>Evento</label>
      <input type="text" name="event" value="${escapeHtml(filters.event)}" placeholder="ex: order_created" style="width:160px;" />
    </div>
    <div>
      <label>Request ID</label>
      <input type="text" name="request_id" value="${escapeHtml(filters.request_id)}" placeholder="UUID" style="width:200px;" />
    </div>
    <div>
      <label>Order ID</label>
      <input type="text" name="order_id" value="${escapeHtml(filters.order_id)}" placeholder="UUID" style="width:180px;" />
    </div>
    <div>
      <label>De (ISO)</label>
      <input type="text" name="from" value="${escapeHtml(filters.from)}" placeholder="2026-04-01T00:00:00Z" style="width:200px;" />
    </div>
    <div>
      <label>Até (ISO)</label>
      <input type="text" name="to" value="${escapeHtml(filters.to)}" placeholder="2026-04-30T23:59:59Z" style="width:200px;" />
    </div>
    <div>
      <label>Limite</label>
      <select name="limit">
        ${[25, 50, 100, 200].map((n) => `<option value="${n}"${limit === n ? ' selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>
    <div style="padding-top:18px;">
      <button type="submit" class="btn-primary">Filtrar</button>
    </div>
  </form>`;

  const baseFilters: Record<string, string> = {};
  ['service', 'level', 'event', 'request_id', 'order_id', 'from', 'to', 'limit'].forEach((k) => {
    if (filters[k]) baseFilters[k] = filters[k];
  });

  const rows =
    logs.length === 0
      ? `<tr><td colspan="7" class="empty-state">Nenhum log encontrado com os filtros aplicados.</td></tr>`
      : logs.map((log) => `
          <tr>
            <td class="mono" style="white-space:nowrap;font-size:11px;">${escapeHtml(fmtDate(log.timestamp))}</td>
            <td>${levelPill(log.level)}</td>
            <td><span class="trace-badge">${escapeHtml(log.service)}</span></td>
            <td class="mono">${escapeHtml(log.event)}</td>
            <td style="max-width:320px;">${escapeHtml(log.message)}</td>
            <td class="mono" style="font-size:10px;">${log.request_id ? `<a href="${buildFilterHref(baseFilters, { request_id: log.request_id, offset: 0 })}" style="color:#0c7a96;">${escapeHtml(log.request_id.slice(0, 8))}…</a>` : '—'}</td>
            <td style="font-size:12px;">${log.duration_ms != null ? log.duration_ms + 'ms' : '—'}</td>
          </tr>`).join('');

  const pagination = `<div class="pagination">
    <a href="${buildFilterHref(baseFilters, { offset: prevOffset })}" class="${hasPrev ? '' : 'disabled'}">← Anterior</a>
    <span>Mostrando ${offset + 1}–${Math.min(offset + limit, total)} de ${total}</span>
    <a href="${buildFilterHref(baseFilters, { offset: nextOffset })}" class="${hasNext ? '' : 'disabled'}">Próxima →</a>
  </div>`;

  return `${filterBar}
  <div class="panel">
    <h2>Logs (${total} total)</h2>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Timestamp</th><th>Nível</th><th>Serviço</th><th>Evento</th><th>Mensagem</th><th>Request ID</th><th>Duração</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${pagination}
  </div>`;
}

// ────────────────────────────────────────────────────────────
// TAB: MÉTRICAS
// ────────────────────────────────────────────────────────────
function renderMetricsTab(
  metrics: LogMetrics | null,
  saasMetrics: SaasMetrics | null,
  billingOpsMetrics: BillingOpsMetrics | null,
): string {
  if (!metrics) {
    return `<div class="panel"><p class="empty-state">Métricas indisponíveis. Verifique a conexão com o banco de observabilidade.</p></div>`;
  }

  const errorRatePct = (metrics.error_rate * 100).toFixed(2);
  const topErrorRows =
    metrics.top_errors.length === 0
      ? `<tr><td colspan="3" class="empty-state">Nenhum erro registrado no período.</td></tr>`
      : metrics.top_errors.map((e) => `
          <tr>
            <td class="mono">${escapeHtml(e.event)}</td>
            <td><strong>${e.count}</strong></td>
            <td class="mono" style="font-size:11px;">${escapeHtml(fmtDate(e.last_seen))}</td>
          </tr>`).join('');

  const byServiceRows = Object.entries(metrics.by_service)
    .sort(([, a], [, b]) => b - a)
    .map(([svc, count]) => `<tr><td><span class="trace-badge">${escapeHtml(svc)}</span></td><td><strong>${count}</strong></td></tr>`)
    .join('');

  const saasSection = saasMetrics
    ? `
  <div class="panel">
    <h2>Métricas SaaS (painel central)</h2>
    <div class="grid">
      <div class="metric">
        <div class="metric-label">MRR estimado</div>
        <div class="metric-value">${fmtMoneyBRL(saasMetrics.mrr)}</div>
        <div class="metric-hint">Assinaturas ativas</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total de empresas</div>
        <div class="metric-value">${saasMetrics.totalCompanies.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Base cadastrada</div>
      </div>
      <div class="metric">
        <div class="metric-label">Empresas pagantes</div>
        <div class="metric-value">${saasMetrics.activeCompanies.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Status active</div>
      </div>
      <div class="metric">
        <div class="metric-label">Cancelados no mês</div>
        <div class="metric-value" style="color:#d97706;">${saasMetrics.cancelledThisMonth.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Churn do ciclo atual</div>
      </div>
      <div class="metric">
        <div class="metric-label">Conversão trial</div>
        <div class="metric-value">${escapeHtml(saasMetrics.conversionRate)}</div>
        <div class="metric-hint">Indicador comercial</div>
      </div>
    </div>
  </div>`
    : '';

  const billingSection = billingOpsMetrics
    ? `
  <div class="panel">
    <h2>Billing Ops (resumo operacional)</h2>
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Pendentes</div>
        <div class="metric-value">${billingOpsMetrics.pendingCount.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">${fmtMoneyBRL(billingOpsMetrics.pendingAmount)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Vencidas</div>
        <div class="metric-value" style="color:#dc2626;">${billingOpsMetrics.overdueCount.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">${fmtMoneyBRL(billingOpsMetrics.overdueAmount)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">A vencer (7 dias)</div>
        <div class="metric-value">${billingOpsMetrics.dueSoonCount.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Acompanhamento proativo</div>
      </div>
      <div class="metric">
        <div class="metric-label">Falhas de cobrança</div>
        <div class="metric-value" style="color:#d97706;">${billingOpsMetrics.failedCount.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">failed/cancelled</div>
      </div>
      <div class="metric">
        <div class="metric-label">Coletado no mês</div>
        <div class="metric-value">${fmtMoneyBRL(billingOpsMetrics.collectedThisMonth)}</div>
        <div class="metric-hint">Receita confirmada</div>
      </div>
    </div>
  </div>`
    : '';

  return `
  <div class="panel">
    <h2>Resumo — últimas ${escapeHtml(metrics.period)}</h2>
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Total de logs</div>
        <div class="metric-value">${metrics.total_logs.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Período: ${escapeHtml(metrics.period)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Erros</div>
        <div class="metric-value" style="color:#dc2626;">${metrics.by_level.error.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Taxa: ${errorRatePct}%</div>
      </div>
      <div class="metric">
        <div class="metric-label">Avisos</div>
        <div class="metric-value" style="color:#d97706;">${metrics.by_level.warn.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Nível warn</div>
      </div>
      <div class="metric">
        <div class="metric-label">Info</div>
        <div class="metric-value">${metrics.by_level.info.toLocaleString('pt-BR')}</div>
        <div class="metric-hint">Nível info</div>
      </div>
      <div class="metric">
        <div class="metric-label">Latência média</div>
        <div class="metric-value">${metrics.avg_duration_ms}ms</div>
        <div class="metric-hint">p95: ${metrics.p95_duration_ms}ms</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <h2>Top erros no período</h2>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Evento</th><th>Ocorrências</th><th>Último visto</th></tr></thead>
        <tbody>${topErrorRows}</tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <h2>Volume por serviço</h2>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Serviço</th><th>Logs</th></tr></thead>
        <tbody>${byServiceRows || '<tr><td colspan="2" class="empty-state">Sem dados.</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  ${saasSection}

  ${billingSection}

  <div style="text-align:right;font-size:12px;color:var(--ink-500);margin-top:4px;">
    <a href="/observability?tab=metrics&hours=1" style="margin-right:8px;color:#0c7a96;">1h</a>
    <a href="/observability?tab=metrics&hours=6" style="margin-right:8px;color:#0c7a96;">6h</a>
    <a href="/observability?tab=metrics" style="margin-right:8px;color:#0c7a96;">24h</a>
    <a href="/observability?tab=metrics&hours=72" style="margin-right:8px;color:#0c7a96;">72h</a>
    <a href="/observability?tab=metrics&hours=168" style="color:#0c7a96;">7d</a>
  </div>`;
}

// ────────────────────────────────────────────────────────────
// TAB: TRACE
// ────────────────────────────────────────────────────────────
function renderTraceTab(
  timeline: LogEntry[],
  traceId: string,
  traceType: 'request' | 'order',
): string {
  const formHtml = `
  <form method="get" action="/observability" class="filter-bar">
    <input type="hidden" name="tab" value="trace" />
    <div>
      <label>Tipo</label>
      <select name="trace_type">
        <option value="request"${traceType === 'request' ? ' selected' : ''}>Request ID</option>
        <option value="order"${traceType === 'order' ? ' selected' : ''}>Order ID</option>
      </select>
    </div>
    <div>
      <label>ID (UUID)</label>
      <input type="text" name="trace_id" value="${escapeHtml(traceId)}" placeholder="UUID" style="width:280px;" />
    </div>
    <div style="padding-top:18px;">
      <button type="submit" class="btn-primary">Rastrear</button>
    </div>
  </form>`;

  if (!traceId) {
    return `${formHtml}<div class="panel"><p class="empty-state">Informe um ${traceType === 'order' ? 'Order ID' : 'Request ID'} para rastrear.</p></div>`;
  }

  const rows =
    timeline.length === 0
      ? `<tr><td colspan="6" class="empty-state">Nenhum evento encontrado para este ID.</td></tr>`
      : timeline.map((log) => `
          <tr class="trace-row">
            <td class="mono" style="white-space:nowrap;font-size:11px;">${escapeHtml(fmtDate(log.timestamp))}</td>
            <td>${levelPill(log.level)}</td>
            <td><span class="trace-badge">${escapeHtml(log.service)}</span></td>
            <td class="mono">${escapeHtml(log.event)}</td>
            <td style="max-width:360px;">${escapeHtml(log.message)}</td>
            <td style="font-size:12px;">${log.duration_ms != null ? log.duration_ms + 'ms' : '—'}</td>
          </tr>`).join('');

  return `${formHtml}
  <div class="panel">
    <h2>Timeline de ${traceType === 'order' ? 'pedido' : 'request'}: <span class="mono">${escapeHtml(traceId)}</span></h2>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:10px;">${timeline.length} eventos encontrados</p>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Timestamp</th><th>Nível</th><th>Serviço</th><th>Evento</th><th>Mensagem</th><th>Duração</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────
// TAB: ALERTAS
// ────────────────────────────────────────────────────────────
function renderAlertsTab(alerts: AlertRow[]): string {
  const rows =
    alerts.length === 0
      ? `<tr><td colspan="8" class="empty-state">Nenhum alerta configurado ainda.</td></tr>`
      : alerts.map((a) => {
        const cfg = (a.channel_config ?? {}) as Record<string, unknown>;
        const webhookUrl = typeof cfg.url === 'string' ? cfg.url : '';
        const condition = (a.condition ?? {}) as unknown as Record<string, unknown>;
        const condType = typeof condition.type === 'string' ? condition.type : 'error_rate';
        const condWindow = Number.isFinite(Number(condition.window_minutes)) ? Number(condition.window_minutes) : 5;
        const condThreshold = Number.isFinite(Number(condition.threshold)) ? Number(condition.threshold) : 1;
        const condLevel = typeof condition.level === 'string' ? condition.level : '';
        const condEvent = typeof condition.event === 'string' ? condition.event : '';
        const condService = typeof condition.service === 'string' ? condition.service : '';
        const alertId = a.id ?? 0;

        return `
          <tr data-alert-id="${alertId}">
            <td>
              <input data-field="name" type="text" value="${escapeHtml(a.name)}" style="width:220px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
              <div style="margin-top:6px;font-size:11px;color:#516675;">ID: ${alertId || 'n/a'}</div>
            </td>
            <td>
              <input data-field="description" type="text" value="${escapeHtml(a.description ?? '')}" placeholder="Descrição" style="width:220px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
            </td>
            <td>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
                <input data-field="enabled" type="checkbox" ${a.enabled ? 'checked' : ''} />
                ${a.enabled ? 'Ativo' : 'Inativo'}
              </label>
            </td>
            <td>
              <select data-field="channel" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;">
                <option value="webhook"${a.channel === 'webhook' ? ' selected' : ''}>webhook</option>
                <option value="slack"${a.channel === 'slack' ? ' selected' : ''}>slack</option>
                <option value="internal"${a.channel === 'internal' ? ' selected' : ''}>internal</option>
              </select>
              <input data-field="webhook_url" type="url" value="${escapeHtml(webhookUrl)}" placeholder="https://..." style="display:block;width:220px;margin-top:6px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
            </td>
            <td>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:280px;">
                <select data-field="cond_type" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;">
                  <option value="error_rate"${condType === 'error_rate' ? ' selected' : ''}>error_rate</option>
                  <option value="event_count"${condType === 'event_count' ? ' selected' : ''}>event_count</option>
                  <option value="no_events"${condType === 'no_events' ? ' selected' : ''}>no_events</option>
                  <option value="service_offline"${condType === 'service_offline' ? ' selected' : ''}>service_offline</option>
                </select>
                <input data-field="cond_window" type="number" min="1" max="1440" value="${condWindow}" placeholder="janela" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
                <input data-field="cond_threshold" type="number" min="0" value="${condThreshold}" placeholder="limiar" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
                <select data-field="cond_level" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;">
                  <option value=""${condLevel === '' ? ' selected' : ''}>todos</option>
                  <option value="error"${condLevel === 'error' ? ' selected' : ''}>error</option>
                  <option value="warn"${condLevel === 'warn' ? ' selected' : ''}>warn</option>
                  <option value="info"${condLevel === 'info' ? ' selected' : ''}>info</option>
                </select>
                <input data-field="cond_event" type="text" value="${escapeHtml(condEvent)}" placeholder="evento" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
                <input data-field="cond_service" type="text" value="${escapeHtml(condService)}" placeholder="${condType === 'service_offline' ? 'service_key (ex: restaurante-web)' : 'serviço log'}" style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;" />
              </div>
            </td>
            <td style="font-size:11px;">${escapeHtml(fmtDate(a.created_at))}</td>
            <td style="font-size:11px;">${escapeHtml(fmtDate(a.updated_at))}</td>
            <td>
              <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-width:110px;">
                <button type="button" class="btn-primary alert-save-btn" style="padding:6px 10px;">Salvar</button>
                <button type="button" class="btn-primary alert-toggle-btn" style="padding:6px 10px;background:#0f766e;">${a.enabled ? 'Desativar' : 'Ativar'}</button>
                <button type="button" class="btn-primary alert-delete-btn" style="padding:6px 10px;background:#b91c1c;">Excluir</button>
                <div class="alert-row-msg" style="font-size:11px;color:#516675;"></div>
              </div>
            </td>
          </tr>`;
      }).join('');

  return `
  <div class="panel">
    <h2>Alertas configurados</h2>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nome</th><th>Descrição</th><th>Status</th><th>Canal</th><th>Condição</th><th>Criado em</th><th>Atualizado em</th><th>Ações</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <h2>Criar alerta</h2>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:12px;">
      Alertas são disparados automaticamente quando a condição é satisfeita. 
      Notificações via webhook Slack/Discord ou registro interno.
    </p>
    <form id="alert-form" style="display:grid;gap:12px;max-width:600px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-name">Nome</label>
          <input id="alert-name" type="text" placeholder="Ex: Erros críticos" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-channel">Canal</label>
          <select id="alert-channel" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;">
            <option value="webhook">Webhook (Slack/Discord)</option>
            <option value="internal">Somente registro interno</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-desc">Descrição (opcional)</label>
        <input id="alert-desc" type="text" placeholder="Descrição do alerta" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
      </div>
      <div id="webhook-url-field">
        <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-webhook-url">URL do Webhook (https://)</label>
        <input id="alert-webhook-url" type="url" placeholder="https://hooks.slack.com/..." style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-cond-type">Tipo</label>
          <select id="alert-cond-type" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;">
            <option value="error_rate">error_rate</option>
            <option value="event_count">event_count</option>
            <option value="no_events">no_events</option>
            <option value="service_offline">service_offline</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-window">Janela (min)</label>
          <input id="alert-window" type="number" min="1" max="1440" value="5" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-threshold">Limiar</label>
          <input id="alert-threshold" type="number" min="0" value="5" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-level">Nível</label>
          <select id="alert-level" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;">
            <option value="">Todos</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-event">Evento (opcional)</label>
          <input id="alert-event" type="text" placeholder="ex: order_created" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="alert-service" id="alert-service-label">Serviço (opcional)</label>
          <input id="alert-service" type="text" list="alert-service-list" placeholder="" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;" />
          <datalist id="alert-service-list">
            <option value="ops">ops (log)</option>
            <option value="web">web (log)</option>
            <option value="app">app (log)</option>
            <option value="supabase">supabase (log)</option>
            <option value="activepieces">activepieces (log)</option>
            <option value="evolution">evolution (log)</option>
            <option value="restaurante-ops">restaurante-ops (service_key)</option>
            <option value="restaurante-web">restaurante-web (service_key)</option>
            <option value="evolution-api">evolution-api (service_key)</option>
          </datalist>
          <div id="alert-service-hint" style="font-size:11px;color:#516675;margin-top:4px;"></div>
        </div>
      </div>
      <div id="alert-form-msg" style="display:none;padding:10px;border-radius:8px;font-size:13px;font-weight:700;"></div>
      <div>
        <button id="alert-submit-btn" type="submit" class="btn-primary">Criar alerta</button>
      </div>
    </form>
    <script>
      (function() {
        const channelSel = document.getElementById('alert-channel');
        const webhookField = document.getElementById('webhook-url-field');
        channelSel.addEventListener('change', function() {
          webhookField.style.display = this.value === 'webhook' ? 'block' : 'none';
        });
        channelSel.dispatchEvent(new Event('change'));

        const condTypeSel = document.getElementById('alert-cond-type');
        const serviceInput = document.getElementById('alert-service');
        const serviceLabel = document.getElementById('alert-service-label');
        const serviceHint = document.getElementById('alert-service-hint');
        function updateServiceField() {
          const t = condTypeSel.value;
          if (t === 'service_offline') {
            serviceLabel.textContent = 'Service Key (opcional — vazio = todos)';
            serviceInput.placeholder = 'ex: restaurante-web';
            serviceHint.textContent = 'Use o service_key cadastrado em Estado do Serviço.';
          } else {
            serviceLabel.textContent = 'Serviço (opcional)';
            serviceInput.placeholder = 'ex: web, ops, app';
            serviceHint.textContent = 'Nome do serviço no log (campo service).';
          }
        }
        condTypeSel.addEventListener('change', updateServiceField);
        updateServiceField();

        const form = document.getElementById('alert-form');
        const msg = document.getElementById('alert-form-msg');
        const btn = document.getElementById('alert-submit-btn');

        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          const name = document.getElementById('alert-name').value.trim();
          const description = document.getElementById('alert-desc').value.trim();
          const channel = document.getElementById('alert-channel').value;
          const webhookUrl = document.getElementById('alert-webhook-url').value.trim();
          const condType = document.getElementById('alert-cond-type').value;
          const windowMin = parseInt(document.getElementById('alert-window').value, 10);
          const threshold = parseInt(document.getElementById('alert-threshold').value, 10);
          const level = document.getElementById('alert-level').value;
          const event = document.getElementById('alert-event').value.trim();
          const service = document.getElementById('alert-service').value.trim();

          if (!name) { showMsg('error', 'Nome é obrigatório.'); return; }
          if (channel === 'webhook' && !webhookUrl.startsWith('https://')) {
            showMsg('error', 'URL do webhook deve começar com https://'); return;
          }

          btn.disabled = true;
          btn.textContent = 'Criando...';

          const body = {
            name,
            description: description || undefined,
            channel: channel === 'internal' ? 'internal' : 'webhook',
            channel_config: channel === 'webhook' ? { url: webhookUrl } : undefined,
            enabled: true,
            condition: {
              type: condType,
              window_minutes: isNaN(windowMin) ? 5 : windowMin,
              threshold: isNaN(threshold) ? 5 : threshold,
              level: level || undefined,
              event: event || undefined,
              service: service || undefined,
            },
          };

          try {
            const resp = await fetch('/api/logs/alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await resp.json();
            if (resp.ok && (data.ok || data.id)) {
              showMsg('ok', 'Alerta criado com sucesso! Recarregando...');
              setTimeout(() => window.location.reload(), 1500);
            } else {
              showMsg('error', data.error || 'Erro ao criar alerta.');
            }
          } catch {
            showMsg('error', 'Erro de rede. Tente novamente.');
          } finally {
            btn.disabled = false;
            btn.textContent = 'Criar alerta';
          }
        });

        function showMsg(type, text) {
          msg.style.display = 'block';
          msg.style.background = type === 'ok' ? '#f0fdf4' : '#fef2f2';
          msg.style.color = type === 'ok' ? '#14532d' : '#991b1b';
          msg.style.border = type === 'ok' ? '1px solid #bbf7d0' : '1px solid #fecaca';
          msg.textContent = text;
        }

        function rowField(row, field) {
          return row.querySelector('[data-field="' + field + '"]');
        }

        function rowPayload(row) {
          const channel = String(rowField(row, 'channel').value || 'internal');
          const webhookUrl = String(rowField(row, 'webhook_url').value || '').trim();
          const level = String(rowField(row, 'cond_level').value || '').trim();
          const event = String(rowField(row, 'cond_event').value || '').trim();
          const service = String(rowField(row, 'cond_service').value || '').trim();
          return {
            name: String(rowField(row, 'name').value || '').trim(),
            description: String(rowField(row, 'description').value || '').trim(),
            enabled: Boolean(rowField(row, 'enabled').checked),
            channel,
            channel_config: channel === 'internal' ? undefined : { url: webhookUrl },
            condition: {
              type: String(rowField(row, 'cond_type').value || 'error_rate'),
              window_minutes: Number.parseInt(String(rowField(row, 'cond_window').value || '5'), 10),
              threshold: Number.parseInt(String(rowField(row, 'cond_threshold').value || '1'), 10),
              level: level || undefined,
              event: event || undefined,
              service: service || undefined,
            },
          };
        }

        async function updateRow(row, patch) {
          const alertId = row.getAttribute('data-alert-id');
          const msgEl = row.querySelector('.alert-row-msg');
          if (!alertId || !msgEl) return;

          msgEl.style.color = '#516675';
          msgEl.textContent = 'Salvando...';

          try {
            const resp = await fetch('/api/logs/alerts/' + encodeURIComponent(alertId), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch),
            });
            const data = await resp.json();
            if (!resp.ok) {
              msgEl.style.color = '#991b1b';
              msgEl.textContent = data && data.error ? data.error : 'Falha ao salvar.';
              return;
            }
            msgEl.style.color = '#14532d';
            msgEl.textContent = 'Salvo com sucesso.';
            setTimeout(() => window.location.reload(), 700);
          } catch {
            msgEl.style.color = '#991b1b';
            msgEl.textContent = 'Erro de rede ao salvar.';
          }
        }

        async function deleteRow(row) {
          const alertId = row.getAttribute('data-alert-id');
          const msgEl = row.querySelector('.alert-row-msg');
          if (!alertId || !msgEl) return;
          if (!confirm('Confirma exclusão deste alerta?')) return;

          msgEl.style.color = '#516675';
          msgEl.textContent = 'Excluindo...';

          try {
            const resp = await fetch('/api/logs/alerts/' + encodeURIComponent(alertId), {
              method: 'DELETE',
            });
            const data = await resp.json();
            if (!resp.ok) {
              msgEl.style.color = '#991b1b';
              msgEl.textContent = data && data.error ? data.error : 'Falha ao excluir.';
              return;
            }
            msgEl.style.color = '#14532d';
            msgEl.textContent = 'Excluído com sucesso.';
            setTimeout(() => window.location.reload(), 400);
          } catch {
            msgEl.style.color = '#991b1b';
            msgEl.textContent = 'Erro de rede ao excluir.';
          }
        }

        document.querySelectorAll('.alert-save-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const row = btn.closest('tr[data-alert-id]');
            if (!row) return;
            const payload = rowPayload(row);
            if (!payload.name) {
              const msgEl = row.querySelector('.alert-row-msg');
              if (msgEl) {
                msgEl.style.color = '#991b1b';
                msgEl.textContent = 'Nome é obrigatório.';
              }
              return;
            }
            if ((payload.channel === 'webhook' || payload.channel === 'slack') && (!payload.channel_config || !payload.channel_config.url || !String(payload.channel_config.url).startsWith('https://'))) {
              const msgEl = row.querySelector('.alert-row-msg');
              if (msgEl) {
                msgEl.style.color = '#991b1b';
                msgEl.textContent = 'Webhook deve iniciar com https://';
              }
              return;
            }
            void updateRow(row, payload);
          });
        });

        document.querySelectorAll('.alert-toggle-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const row = btn.closest('tr[data-alert-id]');
            if (!row) return;
            const enabledInput = rowField(row, 'enabled');
            const nextEnabled = !Boolean(enabledInput.checked);
            enabledInput.checked = nextEnabled;
            void updateRow(row, { enabled: nextEnabled });
          });
        });

        document.querySelectorAll('.alert-delete-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const row = btn.closest('tr[data-alert-id]');
            if (!row) return;
            void deleteRow(row);
          });
        });
      })();
    </script>
  </div>`;
}

// ────────────────────────────────────────────────────────────
// TAB: ESTADO DO SERVIÇO
// ────────────────────────────────────────────────────────────
function renderServiceStatusTab(
  services: ServiceStatus[],
  supabaseMetrics: SupabaseMetrics,
  monitoredServices: MonitoredServiceConfig[],
  canManageMonitoredServices: boolean,
  observabilitySettings: OpsObservabilitySettingsPayload,
  canManageObservabilitySettings: boolean,
): string {
  const serviceRows = services
    .map(
      (svc) =>
        `<tr>
          <td>${escapeHtml(svc.name)}</td>
          <td>${svc.status === 'online' ? '<span class="pill pill-ok">Online</span>' : svc.status === 'offline' ? '<span class="pill pill-error">Offline</span>' : '<span class="pill pill-warn">Unknown</span>'}</td>
          <td>${svc.responseTime ? svc.responseTime + 'ms' : '—'}</td>
          <td>${svc.url ? `<a href="${escapeHtml(svc.url)}" target="_blank" rel="noreferrer" style="color:#0c7a96;">Check</a>` : '—'}</td>
          <td>${escapeHtml(svc.detail ?? '—')}</td>
        </tr>`,
    )
    .join('');

  const supabaseStatus = supabaseMetrics.status === 'online' ? '<span class="pill pill-ok">Online</span>' : '<span class="pill pill-error">Offline</span>';
  const supabaseConnections = supabaseMetrics.activeConnections !== undefined ? `${supabaseMetrics.activeConnections} conexões` : '—';
  const supabaseSize = supabaseMetrics.databaseSize ?? '—';
  const supabaseTime = supabaseMetrics.responseTime ? `${supabaseMetrics.responseTime}ms` : '—';
  const statusByKey = new Map(services.map((svc) => [svc.key || svc.name, svc]));

  const configRows = monitoredServices.length === 0
    ? `<tr><td colspan="9" class="empty-state">Nenhuma configuração encontrada.</td></tr>`
    : monitoredServices.map((cfg) => {
      const live = statusByKey.get(cfg.service_key);
      const liveStatus = live?.status === 'online'
        ? '<span class="pill pill-ok">Online</span>'
        : live?.status === 'offline'
          ? '<span class="pill pill-error">Offline</span>'
          : '<span class="pill pill-warn">Unknown</span>';
      return `<tr data-service-key="${escapeHtml(cfg.service_key)}">
        <td><strong>${escapeHtml(cfg.service_name)}</strong><div class="mono" style="margin-top:4px;">${escapeHtml(cfg.service_key)}</div></td>
        <td>${liveStatus}</td>
        <td><input type="url" data-field="base_url" value="${escapeHtml(cfg.base_url)}" ${canManageMonitoredServices ? '' : 'disabled'} style="width:260px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;" /></td>
        <td><input type="text" data-field="health_path" value="${escapeHtml(cfg.health_path)}" ${canManageMonitoredServices ? '' : 'disabled'} style="width:130px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;" /></td>
        <td>
          <select data-field="method" ${canManageMonitoredServices ? '' : 'disabled'} style="padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;">
            <option value="GET"${cfg.method === 'GET' ? ' selected' : ''}>GET</option>
            <option value="HEAD"${cfg.method === 'HEAD' ? ' selected' : ''}>HEAD</option>
          </select>
        </td>
        <td><input type="number" data-field="timeout_ms" min="500" max="30000" value="${cfg.timeout_ms}" ${canManageMonitoredServices ? '' : 'disabled'} style="width:100px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;" /></td>
        <td><input type="number" data-field="expected_status_min" min="100" max="599" value="${cfg.expected_status_min}" ${canManageMonitoredServices ? '' : 'disabled'} style="width:80px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;" />
            <input type="number" data-field="expected_status_max" min="100" max="599" value="${cfg.expected_status_max}" ${canManageMonitoredServices ? '' : 'disabled'} style="width:80px;padding:6px 8px;border:1px solid #c8d7e1;border-radius:8px;background:#fff;margin-left:4px;" /></td>
        <td><input type="checkbox" data-field="enabled" ${cfg.enabled ? 'checked' : ''} ${canManageMonitoredServices ? '' : 'disabled'} /></td>
        <td>
          ${canManageMonitoredServices
            ? '<button type="button" class="btn-primary save-service-btn" style="padding:6px 10px;">Salvar</button><div class="save-msg" style="font-size:11px;margin-top:6px;color:#516675;"></div>'
            : '<span style="font-size:12px;color:#516675;">Somente leitura</span>'}
        </td>
      </tr>`;
    }).join('');

  const editorPanel = `<section class="panel">
    <h2>Retencao de logs</h2>
    <div class="grid" style="margin-bottom:14px;">
      <article class="metric">
        <div class="metric-label">Retencao efetiva</div>
        <div class="metric-value">${observabilitySettings.logRetentionDays}</div>
        <div class="metric-hint">dias em hot storage</div>
      </article>
      <article class="metric">
        <div class="metric-label">Origem atual</div>
        <div class="metric-value" style="font-size:18px;">${observabilitySettings.source === 'panel' ? 'Painel ops' : 'Variavel de ambiente'}</div>
        <div class="metric-hint">fallback deploy: ${observabilitySettings.envDefaultDays} dias</div>
      </article>
    </div>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:12px;">
      Ajuste manual da janela de retencao para o pipeline de observabilidade. O valor fica salvo no painel ops e pode ser consumido por rotina agendada de limpeza sem redeploy.
    </p>
    ${canManageObservabilitySettings
      ? `<form id="retention-form" style="display:grid;gap:12px;max-width:420px;margin-bottom:18px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#2f4353;" for="retention-days">Retencao de logs (dias)</label>
          <input id="retention-days" type="number" min="1" max="3650" value="${observabilitySettings.logRetentionDays}" style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #c8d7e1;border-radius:8px;font-size:14px;background:#fff;" />
        </div>
        <div id="retention-form-msg" style="display:none;padding:10px;border-radius:8px;font-size:13px;font-weight:700;"></div>
        <div>
          <button id="retention-submit-btn" type="submit" class="btn-primary">Salvar retencao</button>
        </div>
      </form>
      <script>
      (function () {
        const form = document.getElementById('retention-form');
        const msg = document.getElementById('retention-form-msg');
        const btn = document.getElementById('retention-submit-btn');
        const input = document.getElementById('retention-days');
        if (!form || !msg || !btn || !input) return;

        function showMsg(type, text) {
          msg.style.display = 'block';
          msg.style.background = type === 'ok' ? '#f0fdf4' : '#fef2f2';
          msg.style.color = type === 'ok' ? '#14532d' : '#991b1b';
          msg.style.border = type === 'ok' ? '1px solid #bbf7d0' : '1px solid #fecaca';
          msg.textContent = text;
        }

        form.addEventListener('submit', async function (event) {
          event.preventDefault();
          const retentionDays = Number.parseInt(String(input.value || ''), 10);
          if (!Number.isFinite(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
            showMsg('error', 'Informe um valor entre 1 e 3650 dias.');
            return;
          }

          btn.disabled = true;
          btn.textContent = 'Salvando...';

          try {
            const resp = await fetch('/api/observability/settings/retention', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ retention_days: retentionDays }),
            });
            const data = await resp.json();
            if (!resp.ok) {
              showMsg('error', data && data.error ? data.error : 'Falha ao salvar retencao.');
              return;
            }
            if (data && data.settings && Number.isFinite(Number(data.settings.logRetentionDays))) {
              input.value = String(data.settings.logRetentionDays);
            }
            showMsg('ok', 'Retencao salva com sucesso.');
          } catch (_err) {
            showMsg('error', 'Erro de rede ao salvar retencao.');
          } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar retencao';
          }
        });
      })();
      </script>`
      : `<p style="color:#516675;font-size:12px;margin-bottom:18px;"><strong>Somente administradores</strong> podem ajustar a retencao manualmente.</p>`}
  </section>

  <section class="panel">
    <h2>Configuração dos endpoints monitorados</h2>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:10px;">
      Endereços e paths são persistidos no banco em <strong>ops_monitored_services</strong>. Alterações aqui entram em vigor sem redeploy.
    </p>
    <div style="overflow-x:auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Status</th>
            <th>Base URL</th>
            <th>Path</th>
            <th>Método</th>
            <th>Timeout (ms)</th>
            <th>HTTP esperado (min/max)</th>
            <th>Ativo</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>${configRows}</tbody>
      </table>
    </div>
    ${canManageMonitoredServices
      ? `<script>
      (function () {
        function getField(row, field) {
          return row.querySelector('[data-field="' + field + '"]');
        }

        async function saveRow(row, button) {
          const serviceKey = row.getAttribute('data-service-key');
          const msg = row.querySelector('.save-msg');
          if (!serviceKey || !msg) return;

          const body = {
            base_url: String(getField(row, 'base_url').value || '').trim(),
            health_path: String(getField(row, 'health_path').value || '/').trim(),
            method: String(getField(row, 'method').value || 'GET').toUpperCase(),
            timeout_ms: Number.parseInt(String(getField(row, 'timeout_ms').value || '5000'), 10),
            expected_status_min: Number.parseInt(String(getField(row, 'expected_status_min').value || '200'), 10),
            expected_status_max: Number.parseInt(String(getField(row, 'expected_status_max').value || '399'), 10),
            enabled: Boolean(getField(row, 'enabled').checked),
          };

          button.disabled = true;
          msg.style.color = '#516675';
          msg.textContent = 'Salvando...';

          try {
            const resp = await fetch('/api/observability/monitored-services/' + encodeURIComponent(serviceKey), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await resp.json();
            if (!resp.ok) {
              msg.style.color = '#991b1b';
              msg.textContent = data && data.error ? data.error : 'Falha ao salvar.';
              return;
            }

            const service = data && data.service ? data.service : null;
            if (service) {
              getField(row, 'base_url').value = String(service.base_url || body.base_url || '');
              getField(row, 'health_path').value = String(service.health_path || body.health_path || '/');
              getField(row, 'method').value = String(service.method || body.method || 'GET').toUpperCase();
              getField(row, 'timeout_ms').value = String(service.timeout_ms || body.timeout_ms || 5000);
              getField(row, 'expected_status_min').value = String(service.expected_status_min || body.expected_status_min || 200);
              getField(row, 'expected_status_max').value = String(service.expected_status_max || body.expected_status_max || 399);
              getField(row, 'enabled').checked = Boolean(service.enabled);
            }

            msg.style.color = '#14532d';
            msg.textContent = 'Salvo com sucesso. Recarregue para atualizar o status HTTP.';
          } catch (_err) {
            msg.style.color = '#991b1b';
            msg.textContent = 'Erro de rede ao salvar.';
          } finally {
            button.disabled = false;
          }
        }

        document.querySelectorAll('.save-service-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const row = btn.closest('tr[data-service-key]');
            if (!row) return;
            void saveRow(row, btn);
          });
        });
      })();
      </script>`
      : '<p style="color:#516675;font-size:12px;margin-top:10px;">Somente usuários admin podem editar endpoints monitorados.</p>'}
  </section>`;

  return `
  <section class="panel">
    <h2>Saude operacional</h2>
    <div class="grid">
      <article class="metric">
        <div class="metric-label">Servicos online</div>
        <div class="metric-value">${services.filter((s) => s.status === 'online').length}/${services.length}</div>
        <div class="metric-hint">Disponibilidade</div>
      </article>
      <article class="metric">
        <div class="metric-label">Banco de dados</div>
        <div class="metric-value">${supabaseStatus}</div>
        <div class="metric-hint">Supabase Postgres</div>
      </article>
    </div>
  </section>

  <section class="panel">
    <h2>Status de servicos HTTP</h2>
    <table class="table">
      <thead>
        <tr><th>Servico</th><th>Status</th><th>Tempo de resposta</th><th>Endpoint</th><th>Detalhe</th></tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>Metricas do banco de dados</h2>
    <table class="table">
      <thead>
        <tr><th>Metrica</th><th>Valor</th><th>Tempo de resposta</th></tr>
      </thead>
      <tbody>
        <tr><td>Status da conexao</td><td>${supabaseStatus}</td><td>${supabaseTime}</td></tr>
        <tr><td>Conexoes ativas</td><td>${supabaseConnections}</td><td>—</td></tr>
        <tr><td>Tamanho do banco</td><td>${escapeHtml(supabaseSize)}</td><td>—</td></tr>
      </tbody>
    </table>
    ${supabaseMetrics.detail ? `<p style="color:#516675;font-size:13px;margin-top:8px;">Detalhe: ${escapeHtml(supabaseMetrics.detail)}</p>` : ''}
    ${supabaseMetrics.error ? `<p style="color:#dc2626;font-size:13px;margin-top:8px;">Erro: ${escapeHtml(supabaseMetrics.error)}</p>` : ''}
  </section>

  ${editorPanel}`;
}

// ────────────────────────────────────────────────────────────
// TAB: API STATUS
// ────────────────────────────────────────────────────────────
function renderApiStatusTab(): string {
  const payload = {
    service: 'restaurante-ops',
    modules: ['customers', 'billing', 'metrics'],
    status: 'operational',
  };

  return `
  <section class="panel">
    <h2>Payload atual</h2>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:8px;">Este JSON é o retorno do endpoint público <strong>/api/status</strong>.</p>
    <pre class="mono" style="background:#f7fbfe;padding:12px;border-radius:8px;overflow-x:auto;border:1px solid #e5eef4;">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
  </section>

  <section class="panel">
    <h2>Acoes rapidas de diagnostico</h2>
    <p style="color:var(--ink-500);font-size:13px;margin-bottom:8px;">Use os comandos abaixo para monitoramento basico.</p>
    <pre class="mono" style="background:#f7fbfe;padding:12px;border-radius:8px;overflow-x:auto;border:1px solid #e5eef4;">curl -sS https://ops.restaurante-web.app.br/healthz
curl -sS https://ops.restaurante-web.app.br/api/status</pre>
    <p style="margin-top:8px;">Status sugerido: <span class="pill pill-ok">Operacional</span></p>
  </section>`;
}

// ────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ────────────────────────────────────────────────────────────
export interface ObsDashboardOptions {
  tab: string;
  userEmail: string;
  // logs tab
  logs?: LogEntry[];
  logsTotal?: number;
  logsFilters?: Record<string, string>;
  // metrics tab
  metrics?: LogMetrics | null;
  saasMetrics?: SaasMetrics | null;
  billingOpsMetrics?: BillingOpsMetrics | null;
  // trace tab
  timeline?: LogEntry[];
  traceId?: string;
  traceType?: 'request' | 'order';
  // alerts tab
  alerts?: AlertRow[];
  // service-status tab
  services?: ServiceStatus[];
  supabaseMetrics?: SupabaseMetrics;
  monitoredServices?: MonitoredServiceConfig[];
  canManageMonitoredServices?: boolean;
  observabilitySettings?: OpsObservabilitySettingsPayload;
  canManageObservabilitySettings?: boolean;
}

export function renderObservabilityHtml(opts: ObsDashboardOptions): string {
  const {
    tab,
    userEmail,
    logs = [],
    logsTotal = 0,
    logsFilters = {},
    metrics = null,
    saasMetrics = null,
    billingOpsMetrics = null,
    timeline = [],
    traceId = '',
    traceType = 'request',
    alerts = [],
    services = [],
    supabaseMetrics = { status: 'unknown' } as SupabaseMetrics,
    monitoredServices = [],
    canManageMonitoredServices = false,
    observabilitySettings = { logRetentionDays: 30, source: 'env', envDefaultDays: 30 } as OpsObservabilitySettingsPayload,
    canManageObservabilitySettings = false,
  } = opts;

  let tabContent: string;
  if (tab === 'metrics') {
    tabContent = renderMetricsTab(metrics, saasMetrics, billingOpsMetrics);
  } else if (tab === 'trace') {
    tabContent = renderTraceTab(timeline, traceId, traceType);
  } else if (tab === 'alerts') {
    tabContent = renderAlertsTab(alerts);
  } else if (tab === 'service-status') {
    tabContent = renderServiceStatusTab(
      services,
      supabaseMetrics,
      monitoredServices,
      canManageMonitoredServices,
      observabilitySettings,
      canManageObservabilitySettings,
    );
  } else if (tab === 'api-status') {
    tabContent = renderApiStatusTab();
  } else {
    tabContent = renderLogsTab(logs, logsTotal, logsFilters);
  }

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>restaurante-ops | Observabilidade</title>
    <style>${renderObsStyles()}</style>
  </head>
  <body>
    ${renderTopbar(userEmail)}
    <main class="shell">
      ${renderNavTabs(tab)}
      ${tabContent}
    </main>
  </body>
</html>`;
}
