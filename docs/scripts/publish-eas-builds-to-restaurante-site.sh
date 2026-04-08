#!/usr/bin/env bash
set -euo pipefail

# Publica artifacts mais recentes (docs/builds) no site estatico (restaurante-site/public/downloads).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="${ROOT_DIR}/docs/builds"
TARGET_DIR="${ROOT_DIR}/restaurante-site/public/downloads"

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Erro: arquivo nao encontrado: $path" >&2
    exit 1
  fi
}

copy_latest_by_pattern() {
  local pattern="$1"
  local label="$2"

  local src
  src="$(find "$SOURCE_DIR" -maxdepth 1 -type f -name "$pattern" | head -n 1 || true)"

  if [[ -z "$src" ]]; then
    echo "Aviso: nenhum arquivo encontrado para ${label} com padrao ${pattern}."
    return 0
  fi

  local base
  base="$(basename "$src")"

  cp "$src" "$TARGET_DIR/$base"
  echo "Publicado ${label}: $TARGET_DIR/$base"
}

main() {
  mkdir -p "$TARGET_DIR"

  require_file "$SOURCE_DIR/latest-builds.json"

  # Limpa apenas arquivos de artefato antigos mantendo docs auxiliares.
  find "$TARGET_DIR" -maxdepth 1 -type f \
    \( -name 'android-latest.*' -o -name 'ios-latest.*' -o -name 'android-*.apk' -o -name 'android-*.aab' -o -name 'ios-*.ipa' -o -name 'ios-*.app' -o -name 'ios-*.app.tar.gz' \) \
    -delete

  cp "$SOURCE_DIR/latest-builds.json" "$TARGET_DIR/latest-builds.json"

  copy_latest_by_pattern 'android-latest.*' 'Android latest'
  copy_latest_by_pattern 'ios-latest.*' 'iOS latest'

  echo "Concluido. Downloads publicados em: $TARGET_DIR"
}

main "$@"
