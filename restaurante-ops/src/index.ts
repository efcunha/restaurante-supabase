import { createServer } from 'node:http';
import { buildEnv } from './config/env.js';

const env = buildEnv();

function renderBaseLayout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
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

function renderLoginHtml(): string {
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

      <form method="post" action="/auth/login">
        <div class="field">
          <label class="label" for="email">Email</label>
          <input class="input" id="email" name="email" type="email" placeholder="seu@email.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="label" for="password">Senha</label>
          <input class="input" id="password" name="password" type="password" placeholder="********" autocomplete="current-password" required />
        </div>
        <button class="btn-primary" type="submit">ENTRAR</button>
      </form>

      <button class="btn-secondary" type="button" onclick="window.location.href='/register'">Criar acesso administrativo</button>
      <p class="helper">Precisa recuperar acesso? Integrar fluxo em <a href="/api/status">/api/status</a> e provider de auth.</p>
      <div class="billing-note">Onboarding de empresas em trial de 30 dias com regularizacao antes do vencimento para evitar bloqueio operacional.</div>
    </div>
    <div class="footer-note">Machado & Cunha Soft House</div>
  </section>
</section>`;

  return renderBaseLayout('restaurante-ops | login', body);
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
          <input class="input" readonly value="${env.OPS_ENV}" />
        </div>
        <div class="field">
          <span class="label">Porta</span>
          <input class="input" readonly value="${env.OPS_PORT}" />
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

function startServer() {
  const server = createServer((req, res) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;

    if (req.method === 'POST' && (path === '/auth/login' || path === '/auth/register')) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          message: 'Auth endpoint scaffolded. Integrate Supabase Auth flow in next phase.',
          endpoint: path,
        }),
      );
      return;
    }

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

    if (path === '/login') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderLoginHtml());
      return;
    }

    if (path === '/register') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderRegisterHtml());
      return;
    }

    if (path === '/' || path === '/dashboard') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderHomeHtml());
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(env.OPS_PORT, () => {
    console.log('[ops] web online', {
      port: env.OPS_PORT,
      env: env.OPS_ENV,
      baseUrl: env.OPS_PUBLIC_BASE_URL || `http://localhost:${env.OPS_PORT}`,
    });
  });
}

startServer();
