#!/usr/bin/env bash
set -euo pipefail

# Baixa o ultimo build finalizado de Android e iOS no EAS e salva em docs/builds.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="${ROOT_DIR}/restaurante-app"
OUTPUT_DIR="${ROOT_DIR}/docs/builds"
CURL_BIN="${CURL_BIN:-curl}"
DATE_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erro: comando obrigatorio nao encontrado: $cmd" >&2
    exit 1
  fi
}

run_eas_build_list() {
  local platform="$1"
  local ios_profile="${EAS_IOS_BUILD_PROFILE:-production}"

  if command -v eas >/dev/null 2>&1; then
    (
      cd "$PROJECT_DIR"
      eas build:list \
        --platform "$platform" \
        --status finished \
        --limit 1 \
        $([[ "$platform" == "ios" ]] && echo "--build-profile $ios_profile") \
        --non-interactive \
        --json
    )
    return 0
  fi

  (
    cd "$PROJECT_DIR"
    npx --yes eas-cli build:list \
      --platform "$platform" \
      --status finished \
      --limit 1 \
      $([[ "$platform" == "ios" ]] && echo "--build-profile $ios_profile") \
      --non-interactive \
      --json
  )
}

extract_build_info() {
  local platform="$1"
  local raw_json="$2"

  node -e '
const fs = require("fs");
const platform = process.argv[1];
const input = fs.readFileSync(0, "utf8").trim();

if (!input) {
  console.error(`Sem retorno do EAS para ${platform}.`);
  process.exit(2);
}

let data;
try {
  data = JSON.parse(input);
} catch (err) {
  console.error(`Falha ao interpretar JSON para ${platform}: ${err.message}`);
  process.exit(2);
}

if (!Array.isArray(data) || data.length === 0) {
  console.error(`Nenhum build finalizado encontrado para ${platform}.`);
  process.exit(2);
}

const build = data[0];
const artifacts = build.artifacts || {};
const candidateUrls = [
  artifacts.applicationArchiveUrl,
  artifacts.buildUrl,
  build.artifactUrl,
  build.buildArtifactUrl,
].filter(Boolean);

const url = candidateUrls[0];
if (!url) {
  console.error(`Build ${build.id || "desconhecido"} sem URL de artefato para ${platform}.`);
  process.exit(2);
}

const id = (build.id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
let extGuess = "";

try {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  if (match) extGuess = match[1].toLowerCase();
} catch (_) {
  // Sem ext por URL; segue sem palpite.
}

const out = {
  platform,
  buildId: build.id || null,
  status: build.status || null,
  profile: build.profile || build.buildProfile || null,
  distribution: build.distribution || null,
  gitCommitHash: build.gitCommitHash || null,
  artifactUrl: url,
  extGuess,
  fileStem: `${platform}-${id}`,
};

process.stdout.write(JSON.stringify(out));
' "$platform" <<<"$raw_json"
}

ensure_output_dir() {
  mkdir -p "$OUTPUT_DIR"
}

download_artifact() {
  local build_info_json="$1"

  local platform
  local artifact_url
  local file_stem
  local ext_guess

  platform="$(node -p "JSON.parse(process.argv[1]).platform" "$build_info_json")"
  artifact_url="$(node -p "JSON.parse(process.argv[1]).artifactUrl" "$build_info_json")"
  file_stem="$(node -p "JSON.parse(process.argv[1]).fileStem" "$build_info_json")"
  ext_guess="$(node -p "JSON.parse(process.argv[1]).extGuess || ''" "$build_info_json")"

  local tmp_file
  local tmp_dir
  local selected_file
  local selected_app_dir
  local selected_ext
  local latest_path
  local versioned_path

  tmp_file="$(mktemp)"
  tmp_dir="$(mktemp -d)"

  cleanup_artifact_tmp() {
    rm -f "$tmp_file"
    rm -rf "$tmp_dir"
  }

  trap cleanup_artifact_tmp RETURN

  echo "Baixando ${platform}: ${artifact_url}" >&2
  "$CURL_BIN" -fL "$artifact_url" -o "$tmp_file"

  selected_file=""
  selected_app_dir=""
  selected_ext=""

  # EAS pode retornar tar.gz contendo APK/IPA/App.
  if [[ "$artifact_url" == *.tar.gz || "$artifact_url" == *.tgz ]]; then
    tar -xzf "$tmp_file" -C "$tmp_dir"

    if [[ "$platform" == "android" ]]; then
      selected_file="$(find "$tmp_dir" -type f \( -iname '*.apk' -o -iname '*.aab' \) | head -n 1 || true)"
    else
      selected_file="$(find "$tmp_dir" -type f -iname '*.ipa' | head -n 1 || true)"
      if [[ -z "$selected_file" ]]; then
        selected_app_dir="$(find "$tmp_dir" -type d -iname '*.app' | head -n 1 || true)"
      fi
    fi

    if [[ -z "$selected_file" && -z "$selected_app_dir" ]]; then
      selected_file="$(find "$tmp_dir" -type f \( -iname '*.apk' -o -iname '*.aab' -o -iname '*.ipa' -o -iname '*.app' \) | head -n 1 || true)"
    fi

    if [[ -z "$selected_file" && -z "$selected_app_dir" ]]; then
      echo "Erro: archive do EAS nao contem artifact instalavel conhecido para ${platform}." >&2
      exit 1
    fi

    if [[ -n "$selected_app_dir" ]]; then
      selected_ext="app.tar.gz"
    else
      selected_ext="${selected_file##*.}"
      selected_ext="${selected_ext,,}"
    fi
  else
    if [[ -n "$ext_guess" ]]; then
      selected_ext="$ext_guess"
    else
      selected_ext="$([[ "$platform" == "android" ]] && echo "apk" || echo "ipa")"
    fi

    selected_file="$tmp_file"
  fi

  latest_path="${OUTPUT_DIR}/${platform}-latest.${selected_ext}"
  versioned_path="${OUTPUT_DIR}/${file_stem}.${selected_ext}"

  if [[ -n "$selected_app_dir" ]]; then
    tar -czf "$versioned_path" -C "$(dirname "$selected_app_dir")" "$(basename "$selected_app_dir")"
  else
    cp "$selected_file" "$versioned_path"
  fi
  cp "$versioned_path" "$latest_path"

  echo "Artifact resolvido (${platform}): ${selected_ext}" >&2
  echo "Salvo em: ${versioned_path}" >&2
  echo "Atualizado latest: ${latest_path}" >&2

  node -e '
const info = JSON.parse(process.argv[1]);
const ext = process.argv[2];
const platform = process.argv[3];

const out = {
  ...info,
  ext,
  fileLatest: `${platform}-latest.${ext}`,
  fileVersioned: `${info.fileStem}.${ext}`,
};

process.stdout.write(JSON.stringify(out));
' "$build_info_json" "$selected_ext" "$platform"
}

main() {
  require_cmd "$CURL_BIN"
  require_cmd node
  require_cmd npx

  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    echo "Aviso: EXPO_TOKEN nao definido. Em CI/Railway, configure EXPO_TOKEN para autenticar no EAS."
  fi

  ensure_output_dir

  local android_json
  local ios_json
  local android_info
  local ios_info

  echo "Consultando ultimo build Android no EAS..."
  android_json="$(run_eas_build_list "android")"
  android_info="$(extract_build_info "android" "$android_json")"

  echo "Consultando ultimo build iOS no EAS..."
  ios_json="$(run_eas_build_list "ios")"
  ios_info="$(extract_build_info "ios" "$ios_json")"

  android_info="$(download_artifact "$android_info")"
  ios_info="$(download_artifact "$ios_info")"

  node -e '
const fs = require("fs");
const outputDir = process.argv[1];
const nowUtc = process.argv[2];
const androidInfo = JSON.parse(process.argv[3]);
const iosInfo = JSON.parse(process.argv[4]);
const outPath = `${outputDir}/latest-builds.json`;

const payload = {
  generatedAtUtc: nowUtc,
  android: androidInfo,
  ios: iosInfo,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Metadados atualizados: ${outPath}`);
' "$OUTPUT_DIR" "$DATE_UTC" "$android_info" "$ios_info"

  echo "Concluido. Artefatos em: ${OUTPUT_DIR}"
}

main "$@"
