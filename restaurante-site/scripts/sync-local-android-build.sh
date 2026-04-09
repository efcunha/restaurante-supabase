#!/usr/bin/env bash
set -euo pipefail

# Gera APK Android local via restaurante-app/scripts/build-android.sh
# e publica como public/downloads/android-latest.apk no restaurante-site.

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "${SITE_DIR}/.." && pwd)"
APP_DIR="${ROOT_DIR}/restaurante-app"
APP_BUILD_DIR="${APP_DIR}/build"
OUTPUT_DIR="${SITE_DIR}/public/downloads"
LATEST_APK="${OUTPUT_DIR}/android-latest.apk"
MANIFEST_PATH="${OUTPUT_DIR}/latest-builds.json"
DATE_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erro: comando obrigatorio nao encontrado: $cmd" >&2
    exit 1
  fi
}

build_local_android() {
  if [[ ! -f "${APP_DIR}/scripts/build-android.sh" ]]; then
    echo "Erro: script de build local nao encontrado em ${APP_DIR}/scripts/build-android.sh" >&2
    exit 1
  fi

  echo "Gerando APK local via restaurante-app/scripts/build-android.sh..."
  (
    cd "${APP_DIR}"
    bash ./scripts/build-android.sh
  )
}

find_latest_local_apk() {
  if [[ ! -d "${APP_BUILD_DIR}" ]]; then
    echo "Erro: pasta de build nao encontrada: ${APP_BUILD_DIR}" >&2
    exit 1
  fi

  # Prioridade: arm64-v8a mais recente; fallback para qualquer APK mais recente
  local latest_apk
  latest_apk="$(find "${APP_BUILD_DIR}" -maxdepth 1 -type f -name '*arm64-v8a*.apk' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"

  if [[ -z "${latest_apk}" ]]; then
    latest_apk="$(find "${APP_BUILD_DIR}" -maxdepth 1 -type f -name '*.apk' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
  fi

  if [[ -z "${latest_apk}" ]]; then
    echo "Erro: nenhum APK encontrado em ${APP_BUILD_DIR}" >&2
    exit 1
  fi

  printf '%s' "${latest_apk}"
}

update_manifest() {
  local source_apk="$1"
  local source_name
  source_name="$(basename "${source_apk}")"

  require_cmd node

  node -e '
const fs = require("fs");
const manifestPath = process.argv[1];
const nowUtc = process.argv[2];
const sourceFile = process.argv[3];

let manifest = {};
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    manifest = {};
  }
}

manifest.generatedAtUtc = nowUtc;
manifest.android = {
  platform: "android",
  source: "local",
  fileLatest: "android-latest.apk",
  fileVersioned: sourceFile,
  ext: "apk",
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
' "${MANIFEST_PATH}" "${DATE_UTC}" "${source_name}"
}

main() {
  require_cmd bash
  require_cmd cp
  require_cmd mkdir
  require_cmd find
  require_cmd sort
  require_cmd head
  require_cmd cut

  mkdir -p "${OUTPUT_DIR}"

  build_local_android

  local source_apk
  source_apk="$(find_latest_local_apk)"

  cp "${source_apk}" "${LATEST_APK}"
  update_manifest "${source_apk}"

  echo "APK local publicado com sucesso: ${LATEST_APK}"
}

main "$@"
