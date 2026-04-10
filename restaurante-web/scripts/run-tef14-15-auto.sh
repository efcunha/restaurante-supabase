#!/bin/bash

# Runner zero-to-run para TEF-14/TEF-15 em INT_REAL.
# Resolve automaticamente token, company_id e comanda valida via .env.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$WEB_ROOT/.." && pwd)"

MODE="all"
BASE_URL="https://restaurante-web.app.br"
OPS_URL="https://ops.restaurante-web.app.br"
COMANDA_OVERRIDE=""
MIN_BALANCE_REAIS="100"
TEST_EMAIL_OVERRIDE=""
TEST_PASSWORD_OVERRIDE=""
JSON_OUT=""
SUMMARY_MD=""

usage() {
  cat <<'EOF'
Uso:
  bash scripts/run-tef14-15-auto.sh [--all|--tef14|--tef15] [--comanda N] [--min-balance-reais N] [--json-out caminho] [--summary-md caminho]

Opcoes:
  --all                 Executa TEF-14 + TEF-15 (padrao)
  --tef14               Executa apenas TEF-14
  --tef15               Executa apenas TEF-15
  --comanda <numero>    Forca comanda especifica (se omitido, seleciona automaticamente)
  --min-balance-reais   Saldo minimo para selecao automatica da comanda (padrao: 100)
  --base-url <url>      Base URL do restaurante-web (padrao producao)
  --ops-url <url>       Base URL do restaurante-ops (padrao producao)
  --email <email>       Sobrescreve usuario de login para gerar token
  --password <senha>    Sobrescreve senha de login para gerar token
  --json-out <arquivo>  Salva resultado Playwright em JSON
  --summary-md <arquivo> Salva resumo da execucao em Markdown (requer --json-out)
  --help                Mostra ajuda
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      MODE="all"
      shift
      ;;
    --tef14)
      MODE="tef14"
      shift
      ;;
    --tef15)
      MODE="tef15"
      shift
      ;;
    --comanda)
      COMANDA_OVERRIDE="${2:-}"
      shift 2
      ;;
    --min-balance-reais)
      MIN_BALANCE_REAIS="${2:-}"
      shift 2
      ;;
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --ops-url)
      OPS_URL="${2:-}"
      shift 2
      ;;
    --email)
      TEST_EMAIL_OVERRIDE="${2:-}"
      shift 2
      ;;
    --password)
      TEST_PASSWORD_OVERRIDE="${2:-}"
      shift 2
      ;;
    --json-out)
      JSON_OUT="${2:-}"
      shift 2
      ;;
    --summary-md)
      SUMMARY_MD="${2:-}"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Opcao desconhecida: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Erro: node nao encontrado no PATH."
  exit 1
fi

if [[ ! -f "$WEB_ROOT/.env" ]]; then
  echo "Erro: arquivo $WEB_ROOT/.env nao encontrado."
  exit 1
fi

if [[ ! -f "$REPO_ROOT/restaurante-ops/.env" ]]; then
  echo "Erro: arquivo $REPO_ROOT/restaurante-ops/.env nao encontrado."
  exit 1
fi

set +H
set -a
source "$WEB_ROOT/.env"
[[ -f "$WEB_ROOT/.env.local" ]] && source "$WEB_ROOT/.env.local"
source "$REPO_ROOT/restaurante-ops/.env"
[[ -f "$REPO_ROOT/restaurante-ops/.env.local" ]] && source "$REPO_ROOT/restaurante-ops/.env.local"
set +a

if [[ -n "$TEST_EMAIL_OVERRIDE" ]]; then
  export PLAYWRIGHT_TEST_EMAIL_ADMIN="$TEST_EMAIL_OVERRIDE"
fi
if [[ -n "$TEST_PASSWORD_OVERRIDE" ]]; then
  export PLAYWRIGHT_TEST_PASSWORD_ADMIN="$TEST_PASSWORD_OVERRIDE"
fi

required_vars=(
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  PLAYWRIGHT_TEST_EMAIL_ADMIN
  PLAYWRIGHT_TEST_PASSWORD_ADMIN
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Erro: variavel obrigatoria ausente: $name"
    exit 1
  fi
done

AUTO_JSON="$WEB_ROOT/tmp/tef14_15_auto_context.json"

export COMANDA_OVERRIDE
export MIN_BALANCE_REAIS

node <<'NODE' > "$AUTO_JSON"
(async () => {
  const comandaOverride = process.env.COMANDA_OVERRIDE || '';
  const minBalanceReais = Number(process.env.MIN_BALANCE_REAIS || '100');

  const authRes = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: process.env.PLAYWRIGHT_TEST_EMAIL_ADMIN,
      password: process.env.PLAYWRIGHT_TEST_PASSWORD_ADMIN,
    }),
  });

  if (!authRes.ok) {
    const txt = await authRes.text();
    throw new Error(`Falha ao gerar token de teste: ${authRes.status} ${txt.slice(0, 200)}`);
  }

  const auth = await authRes.json();
  const token = String(auth.access_token || '');
  if (!token) {
    throw new Error('Access token ausente na resposta do Supabase Auth.');
  }

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  const userId = String(payload.sub || '');
  if (!userId) {
    throw new Error('Sub ausente no JWT.');
  }

  const profileUrl = new URL(`${process.env.SUPABASE_URL}/rest/v1/profiles`);
  profileUrl.searchParams.set('select', 'company_id');
  profileUrl.searchParams.set('id', `eq.${userId}`);

  const profileRes = await fetch(profileUrl, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!profileRes.ok) {
    const txt = await profileRes.text();
    throw new Error(`Falha ao buscar company_id no profile: ${profileRes.status} ${txt.slice(0, 200)}`);
  }

  const profiles = await profileRes.json();
  const companyId = String(profiles?.[0]?.company_id || '');
  if (!companyId) {
    throw new Error('company_id nao encontrado no profile do usuario de teste.');
  }

  let comanda = comandaOverride;
  if (!comanda) {
    const comandaUrl = new URL(`${process.env.SUPABASE_URL}/rest/v1/comandas`);
    comandaUrl.searchParams.set('select', 'comanda_number,open_balance');
    comandaUrl.searchParams.set('company_id', `eq.${companyId}`);
    comandaUrl.searchParams.set('status', 'eq.aberta');
    comandaUrl.searchParams.set('open_balance', `gte.${minBalanceReais}`);
    comandaUrl.searchParams.set('order', 'open_balance.desc,created_at.desc');
    comandaUrl.searchParams.set('limit', '1');

    const comandaRes = await fetch(comandaUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!comandaRes.ok) {
      const txt = await comandaRes.text();
      throw new Error(`Falha ao selecionar comanda automatica: ${comandaRes.status} ${txt.slice(0, 200)}`);
    }

    const comandas = await comandaRes.json();
    const selected = comandas?.[0];
    if (!selected?.comanda_number) {
      throw new Error(`Nenhuma comanda aberta com saldo >= ${minBalanceReais} encontrada para o tenant.`);
    }

    comanda = String(selected.comanda_number);
  }

  process.stdout.write(JSON.stringify({ token, companyId, comanda }));
})().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
NODE

E2E_TEST_TOKEN="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(p.token);" "$AUTO_JSON")"
E2E_TEST_COMPANY_ID="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(p.companyId);" "$AUTO_JSON")"
E2E_TEST_COMANDA="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.comanda));" "$AUTO_JSON")"

rm -f "$AUTO_JSON"

if [[ -z "$E2E_TEST_TOKEN" || -z "$E2E_TEST_COMPANY_ID" || -z "$E2E_TEST_COMANDA" ]]; then
  echo "Erro: contexto de execucao incompleto (token/company/comanda)."
  exit 1
fi

cd "$WEB_ROOT"

echo "Configuracao automatica resolvida:"
echo "  Base URL: $BASE_URL"
echo "  Ops URL: $OPS_URL"
echo "  Company ID: $E2E_TEST_COMPANY_ID"
echo "  Comanda: $E2E_TEST_COMANDA"
echo "  Token: [MASKED]"

env_cmd=(
  E2E_TEST_TOKEN="$E2E_TEST_TOKEN"
  E2E_TEST_COMPANY_ID="$E2E_TEST_COMPANY_ID"
  E2E_TEST_COMANDA="$E2E_TEST_COMANDA"
  PLAYWRIGHT_BASE_URL="$BASE_URL"
  PLAYWRIGHT_OPS_BASE_URL="$OPS_URL"
  PDV_E2E_INT_REAL="true"
)

PLAYWRIGHT_ARGS=("e2e/pdv-maquininha-validacao.spec.ts" "--workers=1")

case "$MODE" in
  all)
    :
    ;;
  tef14)
    PLAYWRIGHT_ARGS+=("--grep" "TEF-14")
    ;;
  tef15)
    PLAYWRIGHT_ARGS+=("--grep" "TEF-15")
    ;;
  *)
    echo "Modo invalido: $MODE"
    exit 1
    ;;
esac

TEST_EXIT=0

if [[ -n "$SUMMARY_MD" && -z "$JSON_OUT" ]]; then
  echo "Erro: --summary-md requer --json-out para gerar o resumo a partir do reporter JSON."
  exit 1
fi

if [[ -n "$JSON_OUT" ]]; then
  if [[ "$JSON_OUT" = /* || "$JSON_OUT" =~ ^[A-Za-z]:[/\\] ]]; then
    JSON_OUT_PATH="$JSON_OUT"
  else
    JSON_OUT_PATH="$WEB_ROOT/$JSON_OUT"
  fi

  mkdir -p "$(dirname "$JSON_OUT_PATH")"
  echo "Executando Playwright com reporter JSON..."
  set +e
  env "${env_cmd[@]}" npx playwright test "${PLAYWRIGHT_ARGS[@]}" --reporter=json > "$JSON_OUT_PATH"
  TEST_EXIT=$?
  set -e

  export JSON_OUT_PATH
  if [[ -n "$SUMMARY_MD" ]]; then
    if [[ "$SUMMARY_MD" = /* || "$SUMMARY_MD" =~ ^[A-Za-z]:[/\\] ]]; then
      SUMMARY_MD_PATH="$SUMMARY_MD"
    else
      SUMMARY_MD_PATH="$WEB_ROOT/$SUMMARY_MD"
    fi
    mkdir -p "$(dirname "$SUMMARY_MD_PATH")"
  else
    SUMMARY_MD_PATH=""
  fi

  export SUMMARY_MD_PATH
  export MODE
  export BASE_URL
  export OPS_URL
  export E2E_TEST_COMPANY_ID
  export E2E_TEST_COMANDA

  node <<'NODE'
const fs = require('fs');

const p = process.env.JSON_OUT_PATH;
const summaryPath = process.env.SUMMARY_MD_PATH || '';
const mode = process.env.MODE || 'all';
const baseUrl = process.env.BASE_URL || '';
const opsUrl = process.env.OPS_URL || '';
const companyId = process.env.E2E_TEST_COMPANY_ID || '';
const comanda = process.env.E2E_TEST_COMANDA || '';

const raw = fs.readFileSync(p, 'utf8');
const marker = '"config"';
const markerPos = raw.indexOf(marker);
if (markerPos < 0) {
  throw new Error('Objeto JSON do Playwright nao encontrado.');
}

const start = raw.lastIndexOf('{', markerPos);
const end = raw.lastIndexOf('}');
if (start < 0 || end < start) {
  throw new Error('Delimitadores JSON invalidos no arquivo.');
}

const jsonText = raw.slice(start, end + 1);
const data = JSON.parse(jsonText);

let total = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
const scenario = [];

const walk = (suite) => {
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      total += 1;
      let status = 'unknown';

      for (const r of t.results || []) {
        if (r.status === 'passed') status = 'passed';
        if (r.status === 'failed' || r.status === 'timedOut' || r.status === 'interrupted') status = 'failed';
        if (r.status === 'skipped' && status === 'unknown') status = 'skipped';
      }

      if (status === 'passed') passed += 1;
      if (status === 'failed') failed += 1;
      if (status === 'skipped') skipped += 1;

      scenario.push({
        title: String(t.title || spec.title || '(sem titulo)'),
        status,
      });
    }
  }

  for (const child of suite.suites || []) {
    walk(child);
  }
};

for (const suite of data.suites || []) {
  walk(suite);
}

fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

console.log(`Resumo JSON: total=${total} passed=${passed} failed=${failed} skipped=${skipped}`);
console.log(`Arquivo JSON: ${p}`);

if (summaryPath) {
  const statusEmoji = failed === 0 ? 'OK' : 'FAIL';
  const now = new Date().toISOString();
  const lines = [];

  lines.push('# Evidencia INT_REAL TEF-14/15');
  lines.push('');
  lines.push(`- Timestamp UTC: ${now}`);
  lines.push(`- Modo: ${mode}`);
  lines.push(`- Base URL: ${baseUrl}`);
  lines.push(`- Ops URL: ${opsUrl}`);
  lines.push(`- Company ID: ${companyId}`);
  lines.push(`- Comanda: ${comanda}`);
  lines.push(`- Resultado: ${statusEmoji} total=${total} passed=${passed} failed=${failed} skipped=${skipped}`);
  lines.push(`- Arquivo JSON: ${p}`);
  lines.push('');
  lines.push('## Cenarios');

  for (const item of scenario) {
    const mark = item.status === 'passed' ? 'OK' : item.status === 'failed' ? 'FAIL' : 'SKIP';
    lines.push(`- ${mark} ${item.title} (${item.status})`);
  }

  lines.push('');
  lines.push('## Criterios-chave');

  const tef14 = scenario.find((s) => s.title.includes('TEF-14'));
  const tef15a = scenario.find((s) => s.title.includes('TEF-15a'));
  const tef15b = scenario.find((s) => s.title.includes('TEF-15b'));

  lines.push(`- TEF-14 (idempotencia): ${tef14 ? tef14.status : 'nao encontrado'}`);
  lines.push(`- TEF-15a (comanda invalida 400): ${tef15a ? tef15a.status : 'nao encontrado'}`);
  lines.push(`- TEF-15b (saldo insuficiente 400): ${tef15b ? tef15b.status : 'nao encontrado'}`);
  lines.push('');

  fs.writeFileSync(summaryPath, lines.join('\n'), 'utf8');
  console.log(`Resumo Markdown: ${summaryPath}`);
}
NODE
else
  echo "Executando Playwright com reporter line..."
  case "$MODE" in
    all)
      env "${env_cmd[@]}" npx playwright test "${PLAYWRIGHT_ARGS[@]}" --reporter=line
      ;;
    tef14)
      env "${env_cmd[@]}" npx playwright test "${PLAYWRIGHT_ARGS[@]}" --reporter=line
      ;;
    tef15)
      env "${env_cmd[@]}" npx playwright test "${PLAYWRIGHT_ARGS[@]}" --reporter=line
      ;;
  esac
fi
echo "Testes TEF-14/15 concluídos."

if [[ $TEST_EXIT -ne 0 ]]; then
  exit $TEST_EXIT
fi
