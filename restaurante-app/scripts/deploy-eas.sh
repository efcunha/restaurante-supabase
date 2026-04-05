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

if ! command -v eas >/dev/null 2>&1; then
  echo "[deploy-eas] EAS CLI nao encontrado no PATH."
  echo "[deploy-eas] Instale com: npm i -g eas-cli"
  exit 1
fi

COMMON_ARGS=(--profile "$PROFILE" --non-interactive)
if [[ "$WAIT_BUILD" == "false" ]]; then
  COMMON_ARGS+=(--no-wait)
fi

run_build() {
  local target_platform="$1"
  echo "[deploy-eas] Disparando build $target_platform (profile=$PROFILE, wait=$WAIT_BUILD)"
  EAS_NO_VCS=1 eas build --platform "$target_platform" "${COMMON_ARGS[@]}"
}

if [[ "$PLATFORM" == "all" ]]; then
  run_build android
  run_build ios
else
  run_build "$PLATFORM"
fi

echo "[deploy-eas] Comando concluido."
