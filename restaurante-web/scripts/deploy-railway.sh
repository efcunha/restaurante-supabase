#!/bin/bash

# Script para fazer deploy do Restaurante Web no Railway
# Executa pre-check de migrations Supabase e aplica migrations incrementais pendentes
# antes de seguir com o deploy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_BACKUP_DIR="$ROOT_DIR/database-backup"
MIGRATIONS_DIR="$DB_BACKUP_DIR/migrations"
CHECK_SYNC_SCRIPT="$DB_BACKUP_DIR/check-migration-sync.sh"
RAILWAY_SERVICE_WEB="${RAILWAY_SERVICE_WEB:-restaurante-web}"

echo "======================================"
echo "🚀 Iniciando Deploy para o Railway..."
echo "======================================"

CHECK_ONLY="false"
SKIP_SYNC="false"

print_usage() {
    cat <<'EOF'
Uso: ./scripts/deploy-railway.sh [opcoes]

Opcoes:
    --check-only   Executa apenas a checagem de sync de migrations e encerra.
    --skip-sync    Pula a etapa de sync de migrations e segue direto para o deploy.
    -h, --help     Exibe esta ajuda.

Comportamento padrao (sem flags):
    1) Checa sync
    2) Tenta sync incremental quando possivel
    3) Executa deploy no Railway
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --check-only)
            CHECK_ONLY="true"
            ;;
        --skip-sync)
            SKIP_SYNC="true"
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo "❌ Opção inválida: $1"
            print_usage
            exit 1
            ;;
    esac
    shift
done

if [ "$CHECK_ONLY" = "true" ] && [ "$SKIP_SYNC" = "true" ]; then
    echo "❌ As opções --check-only e --skip-sync não podem ser usadas juntas."
    exit 1
fi

resolve_psql_bin() {
    if command -v psql >/dev/null 2>&1; then
        command -v psql
        return 0
    fi

    if [ -x "$HOME/scoop/apps/postgresql/current/bin/psql.exe" ]; then
        echo "$HOME/scoop/apps/postgresql/current/bin/psql.exe"
        return 0
    fi

    return 1
}

run_check_sync() {
    (
        cd "$DB_BACKUP_DIR"
        ./check-migration-sync.sh
    )
}

cleanup_tmp_dir() {
    local dir_path="${1:-}"
    if [ -n "$dir_path" ] && [ -d "$dir_path" ]; then
        rm -rf "$dir_path"
    fi
}

retry_command() {
    local attempts="$1"
    shift
    local delay_seconds="$1"
    shift
    local attempt=1

    while true; do
        if "$@"; then
            return 0
        fi

        if [ "$attempt" -ge "$attempts" ]; then
            return 1
        fi

        echo "⚠ Tentativa $attempt falhou. Repetindo em ${delay_seconds}s..."
        sleep "$delay_seconds"
        attempt=$((attempt + 1))
    done
}

ensure_railway_auth() {
    echo ""
    echo "🔐 Validando autenticação da Railway CLI..."

    if railway whoami >/dev/null 2>&1; then
        echo "✅ Sessão Railway válida."
        return 0
    fi

    echo "❌ Falha na autenticação da Railway CLI."
    echo "Dica: execute 'unset RAILWAY_TOKEN RAILWAY_API_TOKEN' e depois 'railway login'."
    exit 1
}

apply_web_feature_flags() {
    echo ""
    echo "⚙ Aplicando feature flags de producao para restaurante-web..."

    if ! retry_command 3 5 railway variables --service "$RAILWAY_SERVICE_WEB" \
        --set "EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT=true" \
        --set "EXPO_PUBLIC_FEATURE_PDV_ENABLED=true" \
        --set "EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT=true" \
        --set "EXPO_PUBLIC_FEATURE_PDV_SCALE=true" \
        --set "EXPO_PUBLIC_FEATURE_BILLING=true" \
        --set "EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=true" \
        --set "EXPO_PUBLIC_FEATURE_BILLING_SCREEN=true" \
        --set "EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK=false"; then
        echo "❌ Falha ao aplicar feature flags no Railway após múltiplas tentativas."
        echo "Dica: valide 'railway whoami' e a conectividade com https://backboard.railway.com antes de tentar novamente."
        exit 1
    fi

    echo "✅ Feature flags de producao aplicadas no servico $RAILWAY_SERVICE_WEB."
}

sync_forward_migrations_if_needed() {
    echo ""
    echo "🔎 Verificando sincronização de migrations antes do deploy..."

    if [ ! -f "$CHECK_SYNC_SCRIPT" ]; then
        echo "❌ Script de verificação não encontrado: $CHECK_SYNC_SCRIPT"
        exit 1
    fi

    chmod +x "$CHECK_SYNC_SCRIPT"

    if run_check_sync; then
        echo "✅ Migrations já sincronizadas."
        return 0
    fi

    echo "⚠ Drift detectado. Tentando sincronizar migrations incrementais pendentes..."

    if [ ! -f "$DB_BACKUP_DIR/.env.local" ]; then
        echo "❌ Arquivo não encontrado: $DB_BACKUP_DIR/.env.local"
        echo "Dica: copie .env.example para .env.local e configure as credenciais."
        exit 1
    fi

    # shellcheck disable=SC1091
    set -a
    source "$DB_BACKUP_DIR/.env.local"
    set +a

    if [ -z "${SOURCE_DB_PASSWORD:-}" ] || [ "$SOURCE_DB_PASSWORD" = "CHANGE_ME_SOURCE_DB_PASSWORD" ]; then
        echo "❌ SOURCE_DB_PASSWORD inválida em .env.local"
        exit 1
    fi

    if [ -z "${SOURCE_DB_HOST:-}" ] || [ -z "${SOURCE_DB_USER:-}" ] || [ -z "${SOURCE_DB_NAME:-}" ]; then
        echo "❌ Variáveis SOURCE_DB_* incompletas em .env.local"
        exit 1
    fi

    local psql_bin
    if ! psql_bin="$(resolve_psql_bin)"; then
        echo "❌ psql não encontrado. Instale PostgreSQL client tools para auto-sync."
        exit 1
    fi

    local tmp_dir
    tmp_dir="$(mktemp -d)"
    trap 'cleanup_tmp_dir "${tmp_dir:-}"' EXIT

    local local_versions_file="$tmp_dir/local_versions.txt"
    local remote_versions_file="$tmp_dir/remote_versions.txt"
    local only_local_file="$tmp_dir/only_local.txt"
    local forward_pending_file="$tmp_dir/forward_pending.txt"
    local backfill_pending_file="$tmp_dir/backfill_pending.txt"

    find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' \
        | sed -E 's#^.*/##' \
        | sed -nE 's/^([0-9]{14})_.+\.sql$/\1/p' \
        | sort -u > "$local_versions_file"

    export PGPASSWORD="$SOURCE_DB_PASSWORD"
    if ! "$psql_bin" \
        -h "$SOURCE_DB_HOST" \
        -p "${SOURCE_DB_PORT:-5432}" \
        -U "$SOURCE_DB_USER" \
        -d "$SOURCE_DB_NAME" \
        -At \
        -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version" \
        > "$remote_versions_file"; then
        unset PGPASSWORD
        echo "⚠ Falha ao autenticar/consultar banco remoto para sync automático de migrations."
        echo "⚠ Verifique SOURCE_DB_HOST/SOURCE_DB_USER/SOURCE_DB_PASSWORD em database-backup/.env.local."
        echo "⚠ Deploy seguirá sem auto-sync. Para bypass explícito, use --skip-sync."
        return 0
    fi
    unset PGPASSWORD

    tr -d '\r' < "$remote_versions_file" > "$remote_versions_file.cleaned"
    mv "$remote_versions_file.cleaned" "$remote_versions_file"
    sort -u -o "$remote_versions_file" "$remote_versions_file"

    comm -23 "$local_versions_file" "$remote_versions_file" > "$only_local_file"

    local remote_max
    remote_max="$(tail -n 1 "$remote_versions_file" || true)"

    if [ -z "$remote_max" ]; then
        cp "$only_local_file" "$forward_pending_file"
        : > "$backfill_pending_file"
    else
        awk -v max="$remote_max" '$1 > max {print $1}' "$only_local_file" > "$forward_pending_file"
        awk -v max="$remote_max" '$1 <= max {print $1}' "$only_local_file" > "$backfill_pending_file"
    fi

    if [ ! -s "$forward_pending_file" ] && [ ! -s "$backfill_pending_file" ]; then
        echo "ℹ Não há migrations pendentes para sincronização automática."
        return 0
    fi

    while IFS= read -r version; do
        migration_file="$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name "${version}_*.sql" | head -n 1)"

        if [ -z "$migration_file" ]; then
            echo "❌ Arquivo da migration não encontrado para versão: $version"
            exit 1
        fi

        echo "➡ Aplicando migration: $(basename "$migration_file")"

        export PGPASSWORD="$SOURCE_DB_PASSWORD"
        "$psql_bin" \
            -h "$SOURCE_DB_HOST" \
            -p "${SOURCE_DB_PORT:-5432}" \
            -U "$SOURCE_DB_USER" \
            -d "$SOURCE_DB_NAME" \
            -v ON_ERROR_STOP=1 \
            -f "$migration_file"

        "$psql_bin" \
            -h "$SOURCE_DB_HOST" \
            -p "${SOURCE_DB_PORT:-5432}" \
            -U "$SOURCE_DB_USER" \
            -d "$SOURCE_DB_NAME" \
            -v ON_ERROR_STOP=1 \
            -c "INSERT INTO supabase_migrations.schema_migrations (version, name, created_by, statements) SELECT '$version', '$(basename "$migration_file" .sql)', 'deploy-railway.sh', ARRAY['-- registered by deploy pre-sync']::text[] WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '$version');"
        unset PGPASSWORD

        echo "✅ Migration registrada: $version"
    done < "$forward_pending_file"

    if [ -s "$backfill_pending_file" ]; then
        echo ""
        echo "🧩 Registrando versões históricas ausentes no remoto (sem executar SQL)..."

        while IFS= read -r version; do
            migration_file="$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name "${version}_*.sql" | head -n 1)"

            if [ -z "$migration_file" ]; then
                echo "❌ Arquivo da migration não encontrado para versão: $version"
                exit 1
            fi

            echo "➡ Registrando histórico: $(basename "$migration_file")"

            export PGPASSWORD="$SOURCE_DB_PASSWORD"
            "$psql_bin" \
                -h "$SOURCE_DB_HOST" \
                -p "${SOURCE_DB_PORT:-5432}" \
                -U "$SOURCE_DB_USER" \
                -d "$SOURCE_DB_NAME" \
                -v ON_ERROR_STOP=1 \
                -c "INSERT INTO supabase_migrations.schema_migrations (version, name, created_by, statements) SELECT '$version', '$(basename "$migration_file" .sql)', 'deploy-railway.sh/backfill', ARRAY['-- historical backfill registration only; SQL execution intentionally skipped']::text[] WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '$version');"
            unset PGPASSWORD

            echo "✅ Histórico registrado: $version"
        done < "$backfill_pending_file"
    fi

    echo ""
    echo "🔁 Revalidando sincronização após auto-sync..."
    run_check_sync || echo "⚠ Ainda há drift histórico não-bloqueante (sem pendência incremental nova)."
}

if [ "$CHECK_ONLY" = "true" ]; then
    echo ""
    echo "🧪 Modo check-only: executando apenas verificação de migrations..."

    if [ ! -f "$CHECK_SYNC_SCRIPT" ]; then
        echo "❌ Script de verificação não encontrado: $CHECK_SYNC_SCRIPT"
        exit 1
    fi

    chmod +x "$CHECK_SYNC_SCRIPT"

    if run_check_sync; then
        echo "✅ Check concluído sem drift. Deploy não executado (--check-only)."
        exit 0
    fi

    echo "❌ Drift detectado. Deploy não executado (--check-only)."
    exit 1
fi

if [ "$SKIP_SYNC" = "true" ]; then
    echo ""
    echo "⚠ Modo emergencial ativo: sync de migrations foi desabilitado (--skip-sync)."
    echo "⚠ Prosseguindo para deploy sem aplicar migrations automaticamente."
else
    sync_forward_migrations_if_needed
fi

# Verifica se a CLI do Railway está instalada
if ! command -v railway &> /dev/null; then
    echo "❌ Erro: Railway CLI não encontrado."
    echo "Instalando Railway CLI globalmente via npm..."
    npm install -g @railway/cli
fi

# Prevenção: Limpa a variável RAILWAY_TOKEN caso exista na sessão
# (pois ela tem precedência e pode causar erros de proxy/unauthorized se estiver inválida).
# O script também limpa RAILWAY_API_TOKEN para forçar o uso da sessão autenticada no CLI.
unset RAILWAY_TOKEN
unset RAILWAY_API_TOKEN

ensure_railway_auth

# Vincula o diretório ao projeto do Railway caso não esteja vinculado.
echo ""
echo "Verificando vínculo com o projeto Railway..."
cd "$ROOT_DIR/restaurante-web"
railway link

apply_web_feature_flags

# Executa o deploy para a nuvem
echo "Enviando projeto para produção no Railway..."
if railway up; then
    echo "✅ Deploy iniciado/concluído com sucesso no Railway!"
else
    echo "❌ Ocorreu um erro durante o deploy."
    echo "Dica: Verifique se você está autenticado usando 'railway login' e vinculado ao projeto usando 'railway link'."
    exit 1
fi
