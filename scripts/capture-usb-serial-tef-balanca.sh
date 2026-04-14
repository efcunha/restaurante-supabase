#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUT_DIR="${OUT_DIR:-$ROOT_DIR/tmp/evidencias}"
mkdir -p "$OUT_DIR"

STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_FILE="$(date -u +"%Y%m%dT%H%M%SZ")"
ENVIRONMENT="${ENVIRONMENT:-production}"

SCALE_URL="${SCALE_URL:-http://localhost:3031}"
API_KEY="${API_KEY:-}"

OPS_URL="${OPS_URL:-https://ops.restaurante-web.app.br}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
COMPANY_ID="${COMPANY_ID:-}"
COMANDA_NUMBER="${COMANDA_NUMBER:-}"
AMOUNT_CENTS="${AMOUNT_CENTS:-1000}"
PAYMENT_METHOD="${PAYMENT_METHOD:-cartao_credito}"

resolve_auth_context_if_missing() {
  if [[ -n "$AUTH_TOKEN" && -n "$COMPANY_ID" ]]; then
    return 0
  fi

  local web_env="$ROOT_DIR/restaurante-web/.env"
  local web_env_local="$ROOT_DIR/restaurante-web/.env.local"
  local ops_env="$ROOT_DIR/restaurante-ops/.env"
  local ops_env_local="$ROOT_DIR/restaurante-ops/.env.local"

  if [[ ! -f "$web_env" || ! -f "$ops_env" ]]; then
    return 0
  fi

  set +H
  set -a
  # shellcheck disable=SC1090
  source "$web_env"
  [[ -f "$web_env_local" ]] && source "$web_env_local"
  # shellcheck disable=SC1090
  source "$ops_env"
  [[ -f "$ops_env_local" ]] && source "$ops_env_local"
  set +a

  local required=(
    EXPO_PUBLIC_SUPABASE_URL
    EXPO_PUBLIC_SUPABASE_ANON_KEY
    PLAYWRIGHT_TEST_EMAIL_ADMIN
    PLAYWRIGHT_TEST_PASSWORD_ADMIN
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
  )

  local miss=0
  for name in "${required[@]}"; do
    if [[ -z "${!name:-}" ]]; then
      miss=1
      break
    fi
  done

  if [[ "$miss" -eq 1 ]]; then
    return 0
  fi

  local auto_json="$OUT_DIR/tef-auto-context-$STAMP_FILE.json"
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi

  AMOUNT_CENTS="$AMOUNT_CENTS" COMANDA_NUMBER="$COMANDA_NUMBER" node <<'NODE' > "$auto_json"
(async () => {
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
    throw new Error(`Falha ao gerar token: ${authRes.status} ${txt.slice(0, 200)}`);
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
    throw new Error(`Falha ao buscar company_id: ${profileRes.status} ${txt.slice(0, 200)}`);
  }

  const profiles = await profileRes.json();
  const companyId = String(profiles?.[0]?.company_id || '');
  if (!companyId) {
    throw new Error('company_id nao encontrado para o usuario autenticado.');
  }

  let comandaNumber = String(process.env.COMANDA_NUMBER || '');
  if (!comandaNumber) {
    const minBalance = Math.max(1, Number(process.env.AMOUNT_CENTS || '1000') / 100);
    const comandaUrl = new URL(`${process.env.SUPABASE_URL}/rest/v1/comandas`);
    comandaUrl.searchParams.set('select', 'comanda_number,open_balance');
    comandaUrl.searchParams.set('company_id', `eq.${companyId}`);
    comandaUrl.searchParams.set('status', 'eq.aberta');
    comandaUrl.searchParams.set('open_balance', `gte.${minBalance}`);
    comandaUrl.searchParams.set('order', 'open_balance.desc,created_at.desc');
    comandaUrl.searchParams.set('limit', '1');

    const comandaRes = await fetch(comandaUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (comandaRes.ok) {
      const comandas = await comandaRes.json();
      const selected = comandas?.[0]?.comanda_number;
      if (selected !== undefined && selected !== null) {
        comandaNumber = String(selected);
      }
    }
  }

  process.stdout.write(JSON.stringify({ token, companyId, comandaNumber }));
})().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
NODE

  if [[ -f "$auto_json" ]]; then
    AUTH_TOKEN="${AUTH_TOKEN:-$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.token||''));" "$auto_json")}" || true
    COMPANY_ID="${COMPANY_ID:-$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.companyId||''));" "$auto_json")}" || true
    COMANDA_NUMBER="${COMANDA_NUMBER:-$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.comandaNumber||''));" "$auto_json")}" || true
    rm -f "$auto_json"
  fi
}

STATUS_JSON="$OUT_DIR/bridge-status-$STAMP_FILE.json"
PESO_JSON="$OUT_DIR/bridge-peso-$STAMP_FILE.json"
PESO_ESTAVEL_JSON="$OUT_DIR/bridge-peso-estavel-$STAMP_FILE.json"
TARA_JSON="$OUT_DIR/bridge-tara-$STAMP_FILE.json"
SUMMARY_MD="$OUT_DIR/homologacao-usb-serial-tef-balanca-$STAMP_FILE.md"
SUMMARY_JSON="$OUT_DIR/homologacao-usb-serial-tef-balanca-$STAMP_FILE.json"

TEF_INIT_1_JSON="$OUT_DIR/tef-init-1-$STAMP_FILE.json"
TEF_INIT_2_JSON="$OUT_DIR/tef-init-2-$STAMP_FILE.json"
TEF_STATUS_JSON="$OUT_DIR/tef-status-$STAMP_FILE.json"
COMANDA_BEFORE_JSON="$OUT_DIR/comanda-before-$STAMP_FILE.json"
COMANDA_AFTER_JSON="$OUT_DIR/comanda-after-$STAMP_FILE.json"

API_HEADERS=()
if [[ -n "$API_KEY" ]]; then
  API_HEADERS=(-H "x-api-key: $API_KEY")
fi

curl_http_json() {
  local method="$1"
  local url="$2"
  local output_file="$3"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "${API_HEADERS[@]}" -H "Content-Type: application/json" -d "$body" "$url"
  else
    curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "${API_HEADERS[@]}" "$url"
  fi
}

fetch_comanda_snapshot() {
  local output_file="$1"
  if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "$COMPANY_ID" || -z "$COMANDA_NUMBER" ]]; then
    return 0
  fi

  local comanda_url
  comanda_url="$SUPABASE_URL/rest/v1/comandas?select=id,comanda_number,status,open_balance,updated_at&company_id=eq.$COMPANY_ID&comanda_number=eq.$COMANDA_NUMBER&order=updated_at.desc&limit=1"

  curl -sS -o "$output_file" -w "%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$comanda_url"
}

echo "[1/4] Coletando bridge status..."
STATUS_HTTP="$(curl_http_json "GET" "$SCALE_URL/status" "$STATUS_JSON")"

echo "[2/4] Coletando bridge peso..."
PESO_HTTP="$(curl_http_json "GET" "$SCALE_URL/peso" "$PESO_JSON")"

echo "[3/4] Coletando bridge peso estavel..."
PESO_ESTAVEL_HTTP="$(curl_http_json "GET" "$SCALE_URL/peso/estavel" "$PESO_ESTAVEL_JSON")"

echo "[4/4] Enviando tara no bridge..."
TARA_HTTP="$(curl_http_json "POST" "$SCALE_URL/tara" "$TARA_JSON")"

resolve_auth_context_if_missing

COMANDA_BEFORE_HTTP=""
COMANDA_AFTER_HTTP=""
if [[ -n "$COMPANY_ID" && -n "$COMANDA_NUMBER" && -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  COMANDA_BEFORE_HTTP="$(fetch_comanda_snapshot "$COMANDA_BEFORE_JSON")"
fi

TEF_ENABLED="false"
TEF_INIT_1_HTTP=""
TEF_INIT_2_HTTP=""
TEF_STATUS_HTTP=""
TEF_IDEMPOTENCY_OK=""
TEF_TRANSACTION_ID=""

if [[ -n "$OPS_URL" && -n "$AUTH_TOKEN" && -n "$COMPANY_ID" ]]; then
  TEF_ENABLED="true"
  IDEMP_KEY="tef-$STAMP_FILE"

  TEF_BODY="{\"companyId\":\"$COMPANY_ID\",\"comandaNumber\":\"$COMANDA_NUMBER\",\"amount\":$AMOUNT_CENTS,\"paymentMethod\":\"$PAYMENT_METHOD\",\"idempotencyKey\":\"$IDEMP_KEY\"}"

  echo "[TEF] Iniciando pagamento (1a chamada)..."
  TEF_INIT_1_HTTP="$(curl -sS -o "$TEF_INIT_1_JSON" -w "%{http_code}" -X POST "$OPS_URL/payments/initiate" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$TEF_BODY")"

  echo "[TEF] Iniciando pagamento (2a chamada mesma idempotencyKey)..."
  TEF_INIT_2_HTTP="$(curl -sS -o "$TEF_INIT_2_JSON" -w "%{http_code}" -X POST "$OPS_URL/payments/initiate" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$TEF_BODY")"

  if command -v node >/dev/null 2>&1; then
    TX1="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.transactionId||''));}catch{process.stdout.write('');}" "$TEF_INIT_1_JSON")"
    TX2="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.transactionId||''));}catch{process.stdout.write('');}" "$TEF_INIT_2_JSON")"

    if [[ -n "$TX1" && "$TX1" == "$TX2" ]]; then
      TEF_IDEMPOTENCY_OK="true"
    else
      TEF_IDEMPOTENCY_OK="false"
    fi

    TEF_TRANSACTION_ID="$TX1"
  fi

  if [[ -n "$TEF_TRANSACTION_ID" ]]; then
    echo "[TEF] Consultando status da transacao..."
    TEF_STATUS_HTTP="$(curl -sS -o "$TEF_STATUS_JSON" -w "%{http_code}" -X GET "$OPS_URL/payments/$TEF_TRANSACTION_ID/status" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json")"
  fi

  if [[ -n "$COMPANY_ID" && -n "$COMANDA_NUMBER" && -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    COMANDA_AFTER_HTTP="$(fetch_comanda_snapshot "$COMANDA_AFTER_JSON")"
  fi
else
  echo "[TEF] Variaveis OPS_URL/AUTH_TOKEN/COMPANY_ID ausentes. Coleta TEF sera ignorada."
fi

SERIAL_ABERTA=""
BAUD_VALUE=""
PROTOCOLO_VALUE=""

if command -v node >/dev/null 2>&1; then
  SERIAL_ABERTA="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.serial_aberta));}catch{process.stdout.write('');}" "$STATUS_JSON")"
  BAUD_VALUE="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.baud ?? ''));}catch{process.stdout.write('');}" "$STATUS_JSON")"
  PROTOCOLO_VALUE="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.protocolo ?? ''));}catch{process.stdout.write('');}" "$STATUS_JSON")"

  node -e "const fs=require('fs');
const out=process.argv[1];
const payload={
  timestamp_utc: process.argv[2],
    environment: process.argv[25] || '',
  scale: {
    base_url: process.argv[3],
    status_http: process.argv[4],
    peso_http: process.argv[5],
    peso_estavel_http: process.argv[6],
    tara_http: process.argv[7],
    serial_aberta: process.argv[8],
    baud: process.argv[9],
    protocolo: process.argv[10],
    artifacts: {
      status: process.argv[11],
      peso: process.argv[12],
      peso_estavel: process.argv[13],
      tara: process.argv[14]
    }
  },
  tef: {
    enabled: process.argv[15] === 'true',
    ops_url: process.argv[16] || null,
    company_id: process.argv[26] || null,
    init_1_http: process.argv[17] || null,
    init_2_http: process.argv[18] || null,
    idempotency_ok: process.argv[19] === '' ? null : process.argv[19] === 'true',
    transaction_id: process.argv[20] || null,
    status_http: process.argv[21] || null,
    artifacts: {
      init_1: process.argv[22] || null,
      init_2: process.argv[23] || null,
      status: process.argv[24] || null
    }
  }
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2));" \
  "$SUMMARY_JSON" "$STAMP_UTC" "$SCALE_URL" "$STATUS_HTTP" "$PESO_HTTP" "$PESO_ESTAVEL_HTTP" "$TARA_HTTP" "$SERIAL_ABERTA" "$BAUD_VALUE" "$PROTOCOLO_VALUE" "$STATUS_JSON" "$PESO_JSON" "$PESO_ESTAVEL_JSON" "$TARA_JSON" "$TEF_ENABLED" "$OPS_URL" "$TEF_INIT_1_HTTP" "$TEF_INIT_2_HTTP" "$TEF_IDEMPOTENCY_OK" "$TEF_TRANSACTION_ID" "$TEF_STATUS_HTTP" "$TEF_INIT_1_JSON" "$TEF_INIT_2_JSON" "$TEF_STATUS_JSON" "$ENVIRONMENT" "$COMPANY_ID"

  node -e "const fs=require('fs');
const summaryPath=process.argv[1];
const beforePath=process.argv[2];
const afterPath=process.argv[3];
const beforeHttp=process.argv[4] || null;
const afterHttp=process.argv[5] || null;
const comandaNumber=process.argv[6] || null;

const readJson=(p)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const firstRow=(obj)=>Array.isArray(obj)&&obj.length>0?obj[0]:null;

const summary=readJson(summaryPath) || {};
const beforeRaw=readJson(beforePath);
const afterRaw=readJson(afterPath);
const before=firstRow(beforeRaw);
const after=firstRow(afterRaw);
const tefStatus=readJson(summary?.tef?.artifacts?.status || '');

const beforeStatus=before?.status || null;
const afterStatus=after?.status || null;
const beforeBalance=before?.open_balance ?? null;
const afterBalance=after?.open_balance ?? null;
const tefProcessing=String(tefStatus?.status || '').toLowerCase() === 'processing';

const int02Ok = String(summary?.tef?.init_1_http || '') === '202' && String(summary?.tef?.init_2_http || '') === '202' && summary?.tef?.idempotency_ok === true;
const int03Ok = tefProcessing && beforeStatus === 'aberta' && afterStatus === 'aberta';

summary.integrated_checks = {
  comanda_number: comandaNumber,
  comanda_before_http: beforeHttp,
  comanda_after_http: afterHttp,
  comanda_before_status: beforeStatus,
  comanda_after_status: afterStatus,
  comanda_before_open_balance: beforeBalance,
  comanda_after_open_balance: afterBalance,
  tef_status: tefStatus?.status || null,
  int02_ok: int02Ok,
  int03_ok: int03Ok,
};

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));" \
  "$SUMMARY_JSON" "$COMANDA_BEFORE_JSON" "$COMANDA_AFTER_JSON" "$COMANDA_BEFORE_HTTP" "$COMANDA_AFTER_HTTP" "$COMANDA_NUMBER"
fi

cat > "$SUMMARY_MD" <<EOF
# Evidencia USB/Serial - TEF + Balanca

- timestamp_utc: $STAMP_UTC
- environment: $ENVIRONMENT
- scale_url: $SCALE_URL
- bridge_status_http: $STATUS_HTTP
- bridge_peso_http: $PESO_HTTP
- bridge_peso_estavel_http: $PESO_ESTAVEL_HTTP
- bridge_tara_http: $TARA_HTTP
- bridge_serial_aberta: ${SERIAL_ABERTA:-n/a}
- bridge_baud: ${BAUD_VALUE:-n/a}
- bridge_protocolo: ${PROTOCOLO_VALUE:-n/a}

## TEF

- tef_enabled: $TEF_ENABLED
- ops_url: ${OPS_URL:-n/a}
- tef_init_1_http: ${TEF_INIT_1_HTTP:-n/a}
- tef_init_2_http: ${TEF_INIT_2_HTTP:-n/a}
- tef_idempotency_ok: ${TEF_IDEMPOTENCY_OK:-n/a}
- tef_transaction_id: ${TEF_TRANSACTION_ID:-n/a}
- tef_status_http: ${TEF_STATUS_HTTP:-n/a}

## Artefatos

- $(basename "$STATUS_JSON")
- $(basename "$PESO_JSON")
- $(basename "$PESO_ESTAVEL_JSON")
- $(basename "$TARA_JSON")
- $(basename "$TEF_INIT_1_JSON")
- $(basename "$TEF_INIT_2_JSON")
- $(basename "$TEF_STATUS_JSON")
- $(basename "$SUMMARY_JSON")
- $(basename "$SUMMARY_MD")
EOF

echo "Coleta concluida com sucesso."
echo "Resumo markdown: $SUMMARY_MD"
echo "Resumo json: $SUMMARY_JSON"
