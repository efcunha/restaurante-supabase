#!/bin/bash

# Script para fazer deploy do Restaurante Site no Railway.
# Usa o modo monorepo com --path-as-root para evitar autodeteccao incorreta na raiz.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RAILWAY_WORKSPACE="${RAILWAY_WORKSPACE:-}"
RAILWAY_PROJECT="${RAILWAY_PROJECT:-}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-}"
RAILWAY_SERVICE="${RAILWAY_SERVICE:-restaurante-site}"

SITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_OUTPUT="${SITE_DIR}/public/downloads/android-latest.apk"
SKIP_BUILD="${SKIP_ANDROID_BUILD:-false}"

retry_railway_up() {
    local max_attempts="${RAILWAY_UP_MAX_ATTEMPTS:-3}"
    local base_delay_seconds="${RAILWAY_UP_BASE_DELAY_SECONDS:-4}"
    local attempt=1

    while (( attempt <= max_attempts )); do
        echo "[Railway] Tentativa ${attempt}/${max_attempts} de deploy..."

        if railway up --service "$RAILWAY_SERVICE" --path-as-root ./restaurante-site; then
            return 0
        fi

        if (( attempt == max_attempts )); then
            break
        fi

        local wait_seconds=$(( base_delay_seconds * attempt ))
        echo "[Railway] Falha transitória detectada. Nova tentativa em ${wait_seconds}s..."
        sleep "$wait_seconds"
        attempt=$(( attempt + 1 ))
    done

    return 1
}

get_latest_deployment_status() {
    railway deployment list --service "$RAILWAY_SERVICE" --environment "$RAILWAY_ENVIRONMENT" 2>/dev/null \
        | awk -F'|' '/\|/ { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2; exit }'
}

is_expected_railway_link() {
    local status_json

    if ! status_json="$(railway status --json 2>/dev/null)"; then
        return 1
    fi

    if [[ "$status_json" != *"\"name\": \"$RAILWAY_PROJECT\""* ]]; then
        return 1
    fi

    if [[ "$status_json" != *"\"workspace\": {"*"\"name\": \"$RAILWAY_WORKSPACE\""* ]]; then
        return 1
    fi

    if [[ "$status_json" != *"\"name\": \"$RAILWAY_ENVIRONMENT\""* ]]; then
        return 1
    fi

    if [[ "$status_json" != *"\"serviceName\": \"$RAILWAY_SERVICE\""* ]]; then
        return 1
    fi

    return 0
}

is_deployment_state_acceptable() {
    local status="$1"
    case "$status" in
        SUCCESS|QUEUED|BUILDING|DEPLOYING|INITIALIZING|PENDING)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

print_usage() {
    cat <<'EOF'
Uso: ./scripts/deploy-railway.sh [opcoes]

Opcoes:
    -h, --help            Exibe esta ajuda.
    --skip-android-build  Pula o build/sync local do APK Android (usa o existente).

Variaveis de ambiente obrigatorias:
    RAILWAY_WORKSPACE
    RAILWAY_PROJECT
    RAILWAY_ENVIRONMENT

Variaveis de ambiente opcionais:
    RAILWAY_SERVICE
    SKIP_ANDROID_BUILD=true   Equivalente a --skip-android-build
EOF
}

require_env_var() {
    local var_name="$1"
    local var_value="${!var_name:-}"

    if [ -z "$var_value" ]; then
        echo "Variavel obrigatoria ausente: $var_name"
        echo "Configure em seu ambiente local (ex.: .env.local) com seus valores proprios antes do deploy."
        exit 1
    fi
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        -h|--help)
            print_usage
            exit 0
            ;;
        --skip-android-build)
            SKIP_BUILD="true"
            ;;
        *)
            echo "Opcao invalida: $1"
            print_usage
            exit 1
            ;;
    esac
    shift
done

require_env_var "RAILWAY_WORKSPACE"
require_env_var "RAILWAY_PROJECT"
require_env_var "RAILWAY_ENVIRONMENT"

echo "======================================"
echo "Iniciando deploy do Restaurante Site"
echo "======================================"

# -------------------------------------------------------
# Etapa 1: Garantir APK Android local em public/downloads
# -------------------------------------------------------
if [[ "$SKIP_BUILD" == "true" ]]; then
    echo "[Android] --skip-android-build ativo. Verificando APK existente..."
    if [[ ! -f "$APK_OUTPUT" ]]; then
        echo "Erro: android-latest.apk nao encontrado em ${APK_OUTPUT}."
        echo "Execute sem --skip-android-build ou rode: npm run sync:android-local"
        exit 1
    fi
    echo "[Android] APK encontrado ($(du -sh "$APK_OUTPUT" | cut -f1)). Usando existente."
else
    echo "[Android] Gerando e publicando APK local..."
    if bash "${SITE_DIR}/scripts/sync-local-android-build.sh"; then
        if [[ ! -f "$APK_OUTPUT" ]]; then
            echo "Erro: sync-local-android-build.sh concluiu sem gerar ${APK_OUTPUT}."
            exit 1
        fi
        echo "[Android] APK pronto ($(du -sh "$APK_OUTPUT" | cut -f1))."
    else
        if [[ -f "$APK_OUTPUT" ]]; then
            echo "[Android] Falha no build local, mas APK existente será reutilizado ($(du -sh "$APK_OUTPUT" | cut -f1))."
            echo "[Android] Prosseguindo deploy do site com fallback seguro."
        else
            echo "Erro: build Android falhou e nao existe APK fallback em ${APK_OUTPUT}."
            echo "Dica: corrija o build local ou execute sync manual antes do deploy."
            exit 1
        fi
    fi
fi

# -------------------------------------------------------
# Etapa 2: Verificar CLI do Railway
# -------------------------------------------------------
if ! command -v railway &> /dev/null; then
    echo "Railway CLI nao encontrado. Instalando globalmente via npm..."
    npm install -g @railway/cli
fi

# Prevencao: limpa token de sessao potencialmente invalido com precedencia na CLI.
unset RAILWAY_TOKEN

cd "$ROOT_DIR"

echo "Vinculando ao projeto Railway..."
if is_expected_railway_link; then
    echo "[Railway] Vínculo já está correto."
else
    railway link \
        --workspace "$RAILWAY_WORKSPACE" \
        --project "$RAILWAY_PROJECT" \
        --environment "$RAILWAY_ENVIRONMENT" \
        --service "$RAILWAY_SERVICE"
fi

echo "Enviando restaurante-site para producao no Railway..."
if retry_railway_up; then
    echo "Deploy iniciado/concluido com sucesso no Railway!"
else
    latest_status="$(get_latest_deployment_status || true)"
    if [[ -n "$latest_status" ]] && is_deployment_state_acceptable "$latest_status"; then
        echo "[Railway] O comando retornou erro por timeout, mas o ultimo deployment esta em estado valido: $latest_status"
        echo "Deploy aceito no Railway (validacao por estado do deployment)."
        exit 0
    fi

    echo "Falha durante o deploy no Railway."
    if [[ -n "$latest_status" ]]; then
        echo "Ultimo status observado no Railway: $latest_status"
    fi
    echo "Dica: se o erro persistir com timeout, verifique conectividade/proxy e status do Railway."
    echo "Dica: rode 'railway login' e tente novamente."
    exit 1
fi
