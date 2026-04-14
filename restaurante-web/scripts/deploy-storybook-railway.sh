#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$WEB_DIR/.." && pwd)"
SERVICE_DIR="$ROOT_DIR/restaurante-web-storybook"
SOURCE_STATIC_DIR="$WEB_DIR/storybook-static"
TARGET_STATIC_DIR="$SERVICE_DIR/storybook-static"
SERVICE_NAME="${RAILWAY_SERVICE_STORYBOOK:-restaurante-web-storybook}"

PREPARE_ONLY="false"
SKIP_BUILD="false"

print_usage() {
  cat <<'EOF'
Uso: ./scripts/deploy-storybook-railway.sh [opcoes]

Opcoes:
    --prepare-only   Faz build e prepara o payload do servico sem publicar.
    --skip-build     Reutiliza o storybook-static ja gerado localmente.
    -h, --help       Exibe esta ajuda.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --prepare-only)
      PREPARE_ONLY="true"
      ;;
    --skip-build)
      SKIP_BUILD="true"
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "❌ Opcao invalida: $1"
      print_usage
      exit 1
      ;;
  esac
  shift
done

if [ ! -d "$SERVICE_DIR" ]; then
  echo "❌ Diretório do servico nao encontrado: $SERVICE_DIR"
  exit 1
fi

if [ "$SKIP_BUILD" != "true" ]; then
  echo "📦 Gerando storybook-static atualizado..."
  (
    cd "$WEB_DIR"
    npm run storybook:build -- --disable-telemetry
  )
fi

if [ ! -f "$SOURCE_STATIC_DIR/index.json" ]; then
  echo "❌ Build invalido: $SOURCE_STATIC_DIR/index.json nao encontrado"
  exit 1
fi

echo "🧹 Limpando payload anterior do servico..."
rm -rf "$TARGET_STATIC_DIR"

echo "📁 Copiando storybook-static para o servico versionado..."
mkdir -p "$TARGET_STATIC_DIR"
cp -R "$SOURCE_STATIC_DIR"/. "$TARGET_STATIC_DIR"/

cat > "$SERVICE_DIR/deploy-metadata.json" <<EOF
{
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source": "restaurante-web/storybook-static",
  "service": "$SERVICE_NAME"
}
EOF

echo "✅ Payload pronto em $SERVICE_DIR"

if [ "$PREPARE_ONLY" = "true" ]; then
  echo "ℹ Modo prepare-only ativo; deploy nao executado."
  exit 0
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "❌ Railway CLI nao encontrado. Instale e autentique antes do deploy."
  exit 1
fi

unset RAILWAY_TOKEN

echo "🚀 Publicando Storybook UI no Railway..."
(
  cd "$ROOT_DIR"
  railway up --service "$SERVICE_NAME" --path-as-root ./restaurante-web-storybook --ci
)

echo "✅ Deploy solicitado com sucesso para $SERVICE_NAME"