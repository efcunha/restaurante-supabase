#!/bin/bash

# Script para fazer deploy do Restaurante Site no Railway.
# Usa o modo monorepo com --path-as-root para evitar autodeteccao incorreta na raiz.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RAILWAY_WORKSPACE="${RAILWAY_WORKSPACE:-Machado & Cunha Soft House}"
RAILWAY_PROJECT="${RAILWAY_PROJECT:-restaurante}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
RAILWAY_SERVICE="${RAILWAY_SERVICE:-restaurante-site}"

SITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_OUTPUT="${SITE_DIR}/public/downloads/android-latest.apk"
SKIP_BUILD="${SKIP_ANDROID_BUILD:-false}"

print_usage() {
    cat <<'EOF'
Uso: ./scripts/deploy-railway.sh [opcoes]

Opcoes:
    -h, --help            Exibe esta ajuda.
    --skip-android-build  Pula o build/sync local do APK Android (usa o existente).

Variaveis de ambiente opcionais:
    RAILWAY_WORKSPACE
    RAILWAY_PROJECT
    RAILWAY_ENVIRONMENT
    RAILWAY_SERVICE
    SKIP_ANDROID_BUILD=true   Equivalente a --skip-android-build
EOF
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
    bash "${SITE_DIR}/scripts/sync-local-android-build.sh"
    if [[ ! -f "$APK_OUTPUT" ]]; then
        echo "Erro: sync-local-android-build.sh concluiu sem gerar ${APK_OUTPUT}."
        exit 1
    fi
    echo "[Android] APK pronto ($(du -sh "$APK_OUTPUT" | cut -f1))."
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
railway link \
    --workspace "$RAILWAY_WORKSPACE" \
    --project "$RAILWAY_PROJECT" \
    --environment "$RAILWAY_ENVIRONMENT" \
    --service "$RAILWAY_SERVICE"

echo "Enviando restaurante-site para producao no Railway..."
if railway up --service "$RAILWAY_SERVICE" --path-as-root ./restaurante-site; then
    echo "Deploy iniciado/concluido com sucesso no Railway!"
else
    echo "Falha durante o deploy no Railway."
    echo "Dica: rode 'railway login' e tente novamente."
    exit 1
fi
