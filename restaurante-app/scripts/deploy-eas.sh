#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  bash scripts/deploy-eas.sh [profile] [wait] [--platform <all|android|ios>]

Parametros:
  profile   nome do profile EAS   (padrao: preview)
  wait      true | false          (padrao: false)
  --platform all | android | ios  (opcional, padrao: all)

Exemplos:
  bash scripts/deploy-eas.sh
  bash scripts/deploy-eas.sh preview false
  bash scripts/deploy-eas.sh production true --platform ios
  bash scripts/deploy-eas.sh preview false --platform android
EOF
}

PROFILE="${1:-preview}"
WAIT_BUILD="${2:-false}"
PLATFORM="all"

if [[ "${3:-}" == "--platform" ]]; then
  PLATFORM="${4:-all}"
fi

if [[ "$PROFILE" == "-h" || "$PROFILE" == "--help" ]]; then
  usage
  exit 0
fi

case "$PLATFORM" in
  all|android|ios) ;;
  *)
    echo "[deploy-eas] Plataforma invalida: $PLATFORM"
    usage
    exit 1
    ;;
esac

case "$WAIT_BUILD" in
  true|false) ;;
  *)
    echo "[deploy-eas] Parametro wait invalido: $WAIT_BUILD (use true ou false)"
    exit 1
    ;;
esac

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

EAS_CMD=()

if command -v eas >/dev/null 2>&1; then
  EAS_CMD=(eas)
elif [[ -x "$APP_DIR/node_modules/.bin/eas" ]]; then
  EAS_CMD=("$APP_DIR/node_modules/.bin/eas")
elif command -v npx >/dev/null 2>&1; then
  # Fallback para ambientes sem instalacao global/local do EAS CLI.
  EAS_CMD=(npx --yes eas-cli@latest)
  echo "[deploy-eas] EAS CLI nao encontrado no PATH. Usando fallback via npx."
else
  echo "[deploy-eas] EAS CLI nao encontrado e npx indisponivel."
  echo "[deploy-eas] Opcoes de instalacao:"
  echo "[deploy-eas]   1) npm i -g eas-cli"
  echo "[deploy-eas]   2) npm i -D eas-cli (em restaurante-app)"
  exit 1
fi

COMMON_ARGS=(--profile "$PROFILE" --non-interactive)
if [[ "$WAIT_BUILD" == "false" ]]; then
  COMMON_ARGS+=(--no-wait)
fi

run_build() {
  local target_platform="$1"
  echo "[deploy-eas] Disparando build $target_platform (profile=$PROFILE, wait=$WAIT_BUILD)"
  EAS_NO_VCS=1 "${EAS_CMD[@]}" build --platform "$target_platform" "${COMMON_ARGS[@]}"
}

if [[ "$PLATFORM" == "all" ]]; then
  run_build android
  run_build ios
else
  run_build "$PLATFORM"
fi

echo "[deploy-eas] Comando concluido."
