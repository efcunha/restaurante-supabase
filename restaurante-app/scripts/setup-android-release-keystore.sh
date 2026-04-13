#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"

ensure_secure_random_hex() {
    if command -v node >/dev/null 2>&1; then
        node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))"
        return 0
    fi

    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 24
        return 0
    fi

    return 1
}

upsert_env_file_value() {
    local file="$1"
    local var_name="$2"
    local value="$3"
    local tmp_file

    tmp_file="${file}.tmp.$$"
    touch "$file"

    awk -v var_name="$var_name" -v value="$value" '
        BEGIN {
            updated = 0
        }
        {
            sub(/\r$/, "")
            if ($0 ~ "^[[:space:]]*(export[[:space:]]+)?" var_name "=") {
                if (!updated) {
                    print var_name "=" value
                    updated = 1
                }
                next
            }
            print
        }
        END {
            if (!updated) {
                print var_name "=" value
            }
        }
    ' "$file" > "$tmp_file" && mv "$tmp_file" "$file"
}

read_env_file_value() {
    local file="$1"
    local var_name="$2"

    if [ ! -f "$file" ]; then
        return 1
    fi

    tr -d '\r' < "$file" | awk -F'=' -v key="$var_name" '
        $0 ~ "^[[:space:]]*(export[[:space:]]+)?" key "=" {
            value = substr($0, index($0, "=") + 1)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
            gsub(/^"|"$/, "", value)
            gsub(/^\047|\047$/, "", value)
            result = value
        }
        END {
            if (result != "") print result
        }
    '
}

if ! command -v keytool >/dev/null 2>&1; then
    echo "❌ keytool não encontrado no PATH."
    echo "   Instale/ative o JDK (Android Studio já inclui) e tente novamente."
    exit 1
fi

KEYSTORE_PATH="${KEYSTORE_PATH:-android/app/release.keystore}"
KEY_ALIAS="${KEY_ALIAS:-release-key}"
KEYSTORE_DNAME="${KEYSTORE_DNAME:-CN=RestaurantOS, OU=Mobile, O=RestaurantOS, L=Sao Paulo, S=SP, C=BR}"
FORCE_RECREATE_KEYSTORE="${FORCE_RECREATE_KEYSTORE:-false}"

RELEASE_STORE_PASSWORD="${RELEASE_STORE_PASSWORD:-}"
RELEASE_KEY_PASSWORD="${RELEASE_KEY_PASSWORD:-}"

if [ -z "$RELEASE_STORE_PASSWORD" ]; then
    RELEASE_STORE_PASSWORD="$(read_env_file_value "$ENV_FILE" "RELEASE_STORE_PASSWORD" || true)"
fi

if [ -z "$RELEASE_KEY_PASSWORD" ]; then
    RELEASE_KEY_PASSWORD="$(read_env_file_value "$ENV_FILE" "RELEASE_KEY_PASSWORD" || true)"
fi

# KeyStore PKCS12 (default no JDK moderno) usa a mesma senha para store e key.
if [ -n "$RELEASE_STORE_PASSWORD" ]; then
    RELEASE_KEY_PASSWORD="$RELEASE_STORE_PASSWORD"
fi

if [ -f "$KEYSTORE_PATH" ]; then
    if [ "$FORCE_RECREATE_KEYSTORE" = "true" ]; then
        echo "⚠️ Recriando keystore existente em $KEYSTORE_PATH"
        rm -f "$KEYSTORE_PATH"
    else
        if [ -z "$RELEASE_STORE_PASSWORD" ] || [ -z "$RELEASE_KEY_PASSWORD" ]; then
            echo "❌ Keystore existente detectado em $KEYSTORE_PATH, mas as senhas não foram informadas."
            echo "   Defina RELEASE_STORE_PASSWORD e RELEASE_KEY_PASSWORD corretas e rode novamente."
            echo "   Ou force recriação com FORCE_RECREATE_KEYSTORE=true"
            exit 1
        fi

        if ! keytool -list -keystore "$KEYSTORE_PATH" -storepass "$RELEASE_STORE_PASSWORD" -alias "$KEY_ALIAS" >/dev/null 2>&1; then
            echo "❌ Não foi possível validar o keystore existente com as credenciais informadas."
            echo "   Verifique RELEASE_STORE_PASSWORD/KEY_ALIAS ou force recriação: FORCE_RECREATE_KEYSTORE=true"
            exit 1
        fi

        echo "ℹ️ Keystore existente validado em $KEYSTORE_PATH"
    fi
fi

if [ ! -f "$KEYSTORE_PATH" ]; then
    if [ -z "$RELEASE_STORE_PASSWORD" ]; then
        RELEASE_STORE_PASSWORD=$(ensure_secure_random_hex)
    fi

    RELEASE_KEY_PASSWORD="$RELEASE_STORE_PASSWORD"

    if [ -z "$RELEASE_STORE_PASSWORD" ] || [ -z "$RELEASE_KEY_PASSWORD" ]; then
        echo "❌ Não foi possível gerar senhas automaticamente."
        echo "   Defina RELEASE_STORE_PASSWORD e RELEASE_KEY_PASSWORD no ambiente e rode novamente."
        exit 1
    fi

    mkdir -p "$(dirname "$KEYSTORE_PATH")"
    echo "🔐 Gerando keystore release em $KEYSTORE_PATH..."
    keytool -genkeypair \
        -v \
        -keystore "$KEYSTORE_PATH" \
        -storepass "$RELEASE_STORE_PASSWORD" \
        -keypass "$RELEASE_KEY_PASSWORD" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storetype PKCS12 \
        -dname "$KEYSTORE_DNAME" >/dev/null
else
    echo "ℹ️ Mantendo keystore existente sem alteração."
fi

upsert_env_file_value "$ENV_FILE" "RELEASE_STORE_FILE" "$KEYSTORE_PATH"
upsert_env_file_value "$ENV_FILE" "RELEASE_STORE_PASSWORD" "$RELEASE_STORE_PASSWORD"
upsert_env_file_value "$ENV_FILE" "RELEASE_KEY_ALIAS" "$KEY_ALIAS"
upsert_env_file_value "$ENV_FILE" "RELEASE_KEY_PASSWORD" "$RELEASE_KEY_PASSWORD"

echo "✅ Assinatura release configurada em $ENV_FILE"
echo "   RELEASE_STORE_FILE=$KEYSTORE_PATH"
echo "   RELEASE_KEY_ALIAS=$KEY_ALIAS"
echo ""
echo "Próximo passo: ./scripts/build-android.sh"
