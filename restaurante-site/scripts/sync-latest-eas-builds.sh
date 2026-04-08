#!/usr/bin/env bash
set -euo pipefail

# Baixa os últimos builds finalizados Android/iOS do EAS e publica em public/downloads.
# Uso recomendado: ambiente local com contexto de projeto Expo válido.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_DIR}/public/downloads"
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
let ext = "";

try {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  if (match) ext = match[1].toLowerCase();
} catch (_) {
  // Sem ext por URL; usa fallback por plataforma.
}

if (!ext) {
  ext = platform === "android" ? "apk" : "ipa";
}

const fileLatest = `${platform}-latest.${ext}`;
const fileVersioned = `${platform}-${id}.${ext}`;

const out = {
  platform,
  buildId: build.id || null,
  status: build.status || null,
  profile: build.profile || build.buildProfile || null,
  distribution: build.distribution || null,
  gitCommitHash: build.gitCommitHash || null,
  artifactUrl: url,
  ext,
  fileLatest,
  fileVersioned,
};

process.stdout.write(JSON.stringify(out));
' "$platform" <<<"$raw_json"
}

download_artifact() {
  local build_info_json="$1"

  local platform
  local artifact_url
  local file_latest
  local file_versioned

  platform="$(node -p "JSON.parse(process.argv[1]).platform" "$build_info_json")"
  artifact_url="$(node -p "JSON.parse(process.argv[1]).artifactUrl" "$build_info_json")"
  file_latest="$(node -p "JSON.parse(process.argv[1]).fileLatest" "$build_info_json")"
  file_versioned="$(node -p "JSON.parse(process.argv[1]).fileVersioned" "$build_info_json")"

  local latest_path="${OUTPUT_DIR}/${file_latest}"
  local versioned_path="${OUTPUT_DIR}/${file_versioned}"

  echo "Baixando ${platform}: ${artifact_url}"
  "$CURL_BIN" -fL "$artifact_url" -o "$versioned_path"
  cp "$versioned_path" "$latest_path"

  echo "Salvo em: ${versioned_path}"
  echo "Atualizado latest: ${latest_path}"
}

clean_old_artifacts() {
  find "$OUTPUT_DIR" -maxdepth 1 -type f \
    \( -name 'android-latest.*' -o -name 'ios-latest.*' -o -name 'android-*.apk' -o -name 'android-*.aab' -o -name 'ios-*.ipa' -o -name 'ios-*.app' \) \
    -delete
}

main() {
  require_cmd "$CURL_BIN"
  require_cmd node
  require_cmd npx

  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    echo "Aviso: EXPO_TOKEN nao definido. Em CI/Railway, configure EXPO_TOKEN para autenticar no EAS."
  fi

  mkdir -p "$OUTPUT_DIR"
  clean_old_artifacts

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

  download_artifact "$android_info"
  download_artifact "$ios_info"

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

  echo "Concluido. Downloads publicados em: ${OUTPUT_DIR}"
}

main "$@"
