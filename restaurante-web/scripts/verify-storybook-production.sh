#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${STORYBOOK_PUBLIC_BASE_URL:-https://restaurante-web-storybook-production.up.railway.app}"
BASE_URL="${BASE_URL%/}"
HEALTH_URL="$BASE_URL/healthz-internal"

BASIC_USER="${STORYBOOK_PUBLIC_BASIC_AUTH_USER:-}"
BASIC_PASS="${STORYBOOK_PUBLIC_BASIC_AUTH_PASS:-}"

fail() {
  echo "[storybook:verify:prod] ERRO: $1" >&2
  exit 1
}

http_status() {
  local url="$1"
  shift || true
  curl -sS -o /dev/null -w "%{http_code}" "$@" "$url"
}

health_body="$(curl -sS "$HEALTH_URL")"
health_status="$(http_status "$HEALTH_URL")"

if [[ "$health_status" != "200" ]]; then
  fail "healthz-internal retornou $health_status (esperado 200)"
fi

if ! grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' <<<"$health_body"; then
  fail "healthz-internal sem status=ok: $health_body"
fi

root_status="$(http_status "$BASE_URL/")"

if [[ "$root_status" != "200" && "$root_status" != "401" ]]; then
  fail "root retornou $root_status (esperado 200 ou 401)"
fi

if [[ -n "$BASIC_USER" || -n "$BASIC_PASS" ]]; then
  if [[ -z "$BASIC_USER" || -z "$BASIC_PASS" ]]; then
    fail "credenciais incompletas: defina STORYBOOK_PUBLIC_BASIC_AUTH_USER e STORYBOOK_PUBLIC_BASIC_AUTH_PASS"
  fi

  auth_status="$(http_status "$BASE_URL/" -u "$BASIC_USER:$BASIC_PASS")"
  if [[ "$auth_status" != "200" ]]; then
    fail "root com Basic Auth retornou $auth_status (esperado 200)"
  fi
  echo "[storybook:verify:prod] root com credenciais: 200"
else
  if [[ "$root_status" == "401" ]]; then
    echo "[storybook:verify:prod] root sem credenciais: 401 (protegido por Basic Auth, esperado)"
  else
    echo "[storybook:verify:prod] root sem credenciais: 200 (publico)"
  fi
fi

echo "[storybook:verify:prod] healthz-internal: 200"
echo "[storybook:verify:prod] URL validada: $BASE_URL"
echo "[storybook:verify:prod] verificacao concluida com sucesso"
