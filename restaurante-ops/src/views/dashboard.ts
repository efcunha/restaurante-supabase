import type { OpsUser } from '../auth/supabase.js';

export function renderDashboardHtml(user: OpsUser): string {
  const initials = (user.full_name ?? user.email)
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>restaurante-ops | Dashboard</title>
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
        --success: #16a34a;
        --warn: #d97706;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: "Segoe UI", "Trebuchet MS", sans-serif;
        background: var(--surface-muted);
        color: var(--ink-900);
        min-height: 100vh;
      }

      /* --- Topbar --- */
      .topbar {
        background: var(--teal-700);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 56px;
        gap: 12px;
      }

      .topbar-brand {
        color: #fff;
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -0.2px;
      }

      .topbar-badge {
        font-size: 11px;
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 3px 10px;
        color: #d5f3fa;
        font-weight: 700;
        margin-left: 8px;
      }

      .topbar-user {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d5f3fa;
        font-size: 14px;
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255,255,255,0.22);
        border: 1.5px solid rgba(255,255,255,0.32);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        color: #fff;
      }

      .btn-logout {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.22);
        border-radius: 8px;
        padding: 5px 12px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }

      /* --- Layout --- */
      .shell {
        max-width: 1200px;
        margin: 28px auto;
        padding: 0 20px;
        display: grid;
        gap: 20px;
      }

      .welcome-bar {
        background: linear-gradient(135deg, #0b6780, #0e7d9b);
        border-radius: 18px;
        padding: 20px 22px;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }

      .welcome-text h1 {
        font-size: 22px;
        line-height: 1.2;
      }

      .welcome-text p {
        margin-top: 4px;
        font-size: 14px;
        color: #cef1f9;
      }

      .welcome-meta {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13px;
        color: #d5f3fa;
      }

      /* --- KPI grid --- */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
      }

      .kpi-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 16px 18px;
        box-shadow: 0 2px 8px rgba(7,47,59,0.06);
      }

      .kpi-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--ink-500);
      }

      .kpi-value {
        font-size: 28px;
        font-weight: 800;
        line-height: 1.15;
        margin-top: 6px;
        color: var(--ink-900);
      }

      .kpi-hint {
        margin-top: 4px;
        font-size: 12px;
        color: var(--ink-500);
      }

      .kpi-chip {
        display: inline-block;
        margin-top: 8px;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
      }

      .chip-pending { background: #fff7ed; color: #92400e; border: 1px solid #fde8c0; }
      .chip-ok { background: #f0fdf4; color: #14532d; border: 1px solid #bbf7d0; }
      .chip-warn { background: #fff7ed; color: #92400e; border: 1px solid #fde8c0; }

      /* --- Section grid --- */
      .section-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 14px;
      }

      .panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 2px 8px rgba(7,47,59,0.06);
      }

      .panel-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--ink-700);
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--line);
      }

      .table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .table th { text-align: left; color: var(--ink-500); font-weight: 600; font-size: 11px; text-transform: uppercase; padding-bottom: 8px; }
      .table td { padding: 10px 0; border-top: 1px solid #eef3f6; color: var(--ink-700); }
      .table td:last-child { text-align: right; }

      .status-pill {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
      }

      .pill-active { background: #f0fdf4; color: #14532d; border: 1px solid #bbf7d0; }
      .pill-trial { background: #eff8fc; color: #0a5063; border: 1px solid #b8e2f0; }
      .pill-overdue { background: #fff7ed; color: #92400e; border: 1px solid #fde8c0; }

      .quick-links { display: grid; gap: 8px; }

      .quick-link {
        display: block;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--line);
        font-size: 13px;
        color: var(--ink-700);
        font-weight: 600;
        text-decoration: none;
        background: var(--surface-muted);
      }

      .quick-link:hover { border-color: #0b6780; color: #0b6780; background: #eff8fc; }

      @media (max-width: 820px) {
        .section-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <!-- Topbar -->
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:4px;">
        <span class="topbar-brand">restaurante-ops</span>
        <span class="topbar-badge">Backoffice SaaS</span>
      </div>
      <div class="topbar-user">
        <div class="avatar">${initials}</div>
        <span>${user.email}</span>
        <a class="btn-logout" href="/auth/logout">Sair</a>
      </div>
    </header>

    <main class="shell">

      <!-- Boas-vindas -->
      <section class="welcome-bar">
        <div class="welcome-text">
          <h1>Bom dia, ${user.full_name ?? user.email}</h1>
          <p>Painel de operacao SaaS — clientes, billing e metricas em um lugar.</p>
        </div>
        <div class="welcome-meta">
          Role: <strong>${user.role ?? 'admin'}</strong>
        </div>
      </section>

      <!-- KPIs (placeholder — integrar com queries reais) -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Clientes ativos</div>
          <div class="kpi-value">—</div>
          <div class="kpi-hint">Empresas com assinatura ativa</div>
          <span class="kpi-chip chip-pending">Aguardando dados</span>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Em trial</div>
          <div class="kpi-value">—</div>
          <div class="kpi-hint">Trial ativos (30 dias)</div>
          <span class="kpi-chip chip-ok">Pipeline de conversao</span>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">MRR estimado</div>
          <div class="kpi-value">—</div>
          <div class="kpi-hint">Receita mensal recorrente</div>
          <span class="kpi-chip chip-pending">Aguardando dados</span>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Inadimplentes</div>
          <div class="kpi-value">—</div>
          <div class="kpi-hint">Assinaturas vencidas</div>
          <span class="kpi-chip chip-warn">Requer atencao</span>
        </div>
      </section>

      <!-- Tabelas -->
      <section class="section-grid">
        <div class="panel">
          <div class="panel-title">Clientes recentes</div>
          <table class="table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" style="text-align:center;color:#8aa0ab;padding:24px 0;font-size:13px;">
                  Conectar queries reais ao Supabase na proxima fase
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">Acoes rapidas</div>
          <nav class="quick-links">
            <a class="quick-link" href="/customers">Gerenciar clientes</a>
            <a class="quick-link" href="/billing">Faturamento e invoices</a>
            <a class="quick-link" href="/metrics">Metricas SaaS</a>
            <a class="quick-link" href="/healthz">Estado do servico</a>
            <a class="quick-link" href="/api/status">API status JSON</a>
          </nav>
        </div>
      </section>

    </main>
  </body>
</html>`;
}
