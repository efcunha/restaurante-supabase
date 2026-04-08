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

print_usage() {
    cat <<'EOF'
Uso: ./scripts/deploy-railway.sh [opcoes]

Opcoes:
    -h, --help     Exibe esta ajuda.

Variaveis de ambiente opcionais:
    RAILWAY_WORKSPACE
    RAILWAY_PROJECT
    RAILWAY_ENVIRONMENT
    RAILWAY_SERVICE
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        -h|--help)
            print_usage
            exit 0
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

# Verifica se a CLI do Railway esta instalada.
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
