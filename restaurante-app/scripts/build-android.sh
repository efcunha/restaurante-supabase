#!/bin/bash

# Script para build Android RELEASE do projeto Espeto App
# Gera APK de produção (não precisa de servidor Metro)

echo "🚀 Iniciando build Android RELEASE..."

# Detectar Android SDK automaticamente dependendo do S.O.
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$LOCALAPPDATA/Android/Sdk" ]; then
        export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
    elif [ -d "$HOME/AppData/Local/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
    elif [ -d "/c/Users/$USER/AppData/Local/Android/Sdk" ]; then
        export ANDROID_HOME="/c/Users/$USER/AppData/Local/Android/Sdk"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "/d/Android" ]; then
        export ANDROID_HOME="/d/Android"
    elif [ -d "D:/Android" ]; then
        export ANDROID_HOME="D:/Android"
    fi
fi

export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Verificar se Android SDK está configurado
if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Android SDK não encontrado. Por favor, verifique se o Android Studio está instalado"
    echo "   e defina a variável de ambiente ANDROID_HOME."
    exit 1
fi

# Navegar para raiz do projeto
cd "$(dirname "$0")/.."

ENV_FILES=(".env.local" ".env.production" ".env.staging" ".env")
SIGNING_FILES=(".env.local" ".env.production" ".env.staging" ".env" "android/gradle.properties")

sanitize_env_value() {
    printf '%s' "$1" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

load_var_from_files() {
    local var_name="$1"
    shift
    local files=("$@")
    local file

    # Respeita prioridade de variável já exportada no shell
    if [ -n "${!var_name}" ]; then
        return 0
    fi

    if [ ${#files[@]} -eq 0 ]; then
        files=("${ENV_FILES[@]}")
    fi

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            local line
            local value
            line=$(tr -d '\r' < "$file" | grep -E "^[[:space:]]*(export[[:space:]]+)?${var_name}=" | tail -n 1)
            value="${line#*=}"
            value=$(sanitize_env_value "$value")
            if [ -n "$value" ]; then
                export "$var_name=$value"
                echo "🔎 ${var_name} carregado de $file"
                return 0
            fi
        fi
    done

    return 1
}

load_env_var_from_files() {
    load_var_from_files "$1" "${ENV_FILES[@]}"
}

load_signing_var_from_files() {
    load_var_from_files "$1" "${SIGNING_FILES[@]}"
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

generate_secure_hex_secret() {
    if command -v node >/dev/null 2>&1; then
        node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
        return 0
    fi

    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
        return 0
    fi

    return 1
}

ensure_cursor_secret() {
    load_env_var_from_files "CURSOR_SECRET"

    if [ -n "$CURSOR_SECRET" ] && [ "$CURSOR_SECRET" != "generate_with_openssl_rand_hex_32" ]; then
        return 0
    fi

    local generated_secret
    generated_secret=$(generate_secure_hex_secret)
    if [ -z "$generated_secret" ]; then
        echo "❌ Não foi possível gerar CURSOR_SECRET automaticamente."
        echo "   Instale Node.js ou OpenSSL, ou defina CURSOR_SECRET manualmente em .env.local."
        return 1
    fi

    upsert_env_file_value ".env.local" "CURSOR_SECRET" "$generated_secret"
    export CURSOR_SECRET="$generated_secret"
    echo "🔐 CURSOR_SECRET gerado automaticamente em .env.local"
    return 0
}

# Garantir CURSOR_SECRET no ambiente do bundling local
# Prioridade: variavel de ambiente atual > arquivos locais nao versionados > arquivos de ambiente
ensure_cursor_secret

if [ -z "$CURSOR_SECRET" ] || [ "$CURSOR_SECRET" = "generate_with_openssl_rand_hex_32" ]; then
    echo "❌ CURSOR_SECRET não pôde ser resolvido para build local."
    echo "   Defina CURSOR_SECRET no ambiente ou em um dos arquivos: .env.local, .env.production, .env.staging, .env"
    echo "   Exemplo imediato: CURSOR_SECRET=<hex64> ./scripts/build-android.sh"
    exit 1
fi

echo "🔐 CURSOR_SECRET carregado no ambiente do build (valor mascarado)."

# Garantir variáveis de assinatura release para tasks de produção
load_signing_var_from_files "RELEASE_STORE_FILE"
load_signing_var_from_files "RELEASE_STORE_PASSWORD"
load_signing_var_from_files "RELEASE_KEY_ALIAS"
load_signing_var_from_files "RELEASE_KEY_PASSWORD"

# Compatibilidade com aliases de assinatura usados em setups antigos/CI
if [ -z "$RELEASE_STORE_FILE" ]; then
    load_signing_var_from_files "MYAPP_UPLOAD_STORE_FILE"
    load_signing_var_from_files "UPLOAD_STORE_FILE"
    if [ -n "$MYAPP_UPLOAD_STORE_FILE" ]; then
        export RELEASE_STORE_FILE="$MYAPP_UPLOAD_STORE_FILE"
    elif [ -n "$UPLOAD_STORE_FILE" ]; then
        export RELEASE_STORE_FILE="$UPLOAD_STORE_FILE"
    fi
fi

if [ -z "$RELEASE_STORE_PASSWORD" ]; then
    load_signing_var_from_files "MYAPP_UPLOAD_STORE_PASSWORD"
    load_signing_var_from_files "UPLOAD_STORE_PASSWORD"
    if [ -n "$MYAPP_UPLOAD_STORE_PASSWORD" ]; then
        export RELEASE_STORE_PASSWORD="$MYAPP_UPLOAD_STORE_PASSWORD"
    elif [ -n "$UPLOAD_STORE_PASSWORD" ]; then
        export RELEASE_STORE_PASSWORD="$UPLOAD_STORE_PASSWORD"
    fi
fi

if [ -z "$RELEASE_KEY_ALIAS" ]; then
    load_signing_var_from_files "MYAPP_UPLOAD_KEY_ALIAS"
    load_signing_var_from_files "UPLOAD_KEY_ALIAS"
    if [ -n "$MYAPP_UPLOAD_KEY_ALIAS" ]; then
        export RELEASE_KEY_ALIAS="$MYAPP_UPLOAD_KEY_ALIAS"
    elif [ -n "$UPLOAD_KEY_ALIAS" ]; then
        export RELEASE_KEY_ALIAS="$UPLOAD_KEY_ALIAS"
    fi
fi

if [ -z "$RELEASE_KEY_PASSWORD" ]; then
    load_signing_var_from_files "MYAPP_UPLOAD_KEY_PASSWORD"
    load_signing_var_from_files "UPLOAD_KEY_PASSWORD"
    if [ -n "$MYAPP_UPLOAD_KEY_PASSWORD" ]; then
        export RELEASE_KEY_PASSWORD="$MYAPP_UPLOAD_KEY_PASSWORD"
    elif [ -n "$UPLOAD_KEY_PASSWORD" ]; then
        export RELEASE_KEY_PASSWORD="$UPLOAD_KEY_PASSWORD"
    fi
fi

if [ -n "$RELEASE_STORE_FILE" ]; then
    case "$RELEASE_STORE_FILE" in
        [A-Za-z]:/*|/*)
            # Já absoluto
            ;;
        *)
            # Normaliza relativo para absoluto a partir da raiz do restaurante-app
            export RELEASE_STORE_FILE="$(pwd)/$RELEASE_STORE_FILE"
            ;;
    esac
fi

if [ -z "$RELEASE_STORE_FILE" ] || [ -z "$RELEASE_STORE_PASSWORD" ] || [ -z "$RELEASE_KEY_ALIAS" ] || [ -z "$RELEASE_KEY_PASSWORD" ]; then
    echo "❌ Configuração de assinatura RELEASE incompleta."
    echo "   Defina RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS e RELEASE_KEY_PASSWORD"
    echo "   (ou aliases MYAPP_UPLOAD_* / UPLOAD_*)."
    echo "   Configure via variáveis de ambiente, android/gradle.properties ou arquivos .env locais."
    exit 1
fi

if [ ! -f "$RELEASE_STORE_FILE" ]; then
    echo "❌ RELEASE_STORE_FILE inválido: $RELEASE_STORE_FILE"
    echo "   Informe o caminho absoluto do keystore ou um caminho relativo válido dentro de restaurante-app."
    exit 1
fi

release_store_basename=$(basename "$RELEASE_STORE_FILE")
if [ "$release_store_basename" = "debug.keystore" ] && [ "$ALLOW_DEBUG_KEYSTORE_RELEASE" != "true" ]; then
    echo "❌ Assinatura release usando debug.keystore foi bloqueada."
    echo "   Para loja/produção, gere um keystore próprio de release."
    echo "   Execute: ./scripts/setup-android-release-keystore.sh"
    echo "   (Apenas para testes locais, force com ALLOW_DEBUG_KEYSTORE_RELEASE=true)"
    exit 1
fi

echo "🔐 Assinatura RELEASE carregada (segredos mascarados)."

# Criar pasta build se não existir
mkdir -p build

# Limpar cache do build anterior
echo "🧹 Limpando cache..."
rm -rf android/app/build
rm -rf android/.gradle

# Verificar se splits já está configurado
if ! grep -q "splits {" android/app/build.gradle; then
    echo "⚙️ Configurando splits por arquitetura..."
    python3 << 'EOF'
import re

# Ler o arquivo build.gradle
with open('android/app/build.gradle', 'r') as f:
    content = f.read()

# Encontrar o final do bloco buildTypes e adicionar splits
splits_config = '''    
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "arm64-v8a", "armeabi-v7a"
        }
    }'''

# Inserir após o fechamento do bloco buildTypes
pattern = r'(\s+}\s+packagingOptions\s+{)'
replacement = r'    }' + splits_config + r'\n    packagingOptions {'

content = re.sub(pattern, replacement, content)

# Salvar o arquivo modificado
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
EOF
else
    echo "✅ Splits já configurado"
fi

echo "🔨 Gerando APK RELEASE..."
cd android && ./gradlew assembleRelease --quiet --no-parallel -PreactNativeArchitectures=arm64-v8a,armeabi-v7a

if [ $? -eq 0 ]; then
    cd ..
    
    # Copiar todos os APKs gerados para a pasta build com versionamento
    APK_DIR="android/app/build/outputs/apk/release"
    
    if [ -d "$APK_DIR" ]; then
        # Extrair versão do app.json
        VERSION=$(grep -o '"version": "[^"]*"' app.json | head -n 1 | cut -d'"' -f4)
        if [ -z "$VERSION" ]; then
            VERSION="1.0.0"
        fi
        TIMESTAMP=$(date +%Y%m%d_%H%M)
        
        echo "📦 Copiando APKs (v$VERSION)..."
        
        for apk in "$APK_DIR"/*.apk; do
            if [ -f "$apk" ]; then
                base_name=$(basename "$apk")
                # Tentar extrair arquitetura do nome (ex: restaurante-arm64-v8a-release.apk)
                if [[ "$base_name" == *"arm64-v8a"* ]]; then
                    ARCH="arm64-v8a"
                elif [[ "$base_name" == *"armeabi-v7a"* ]]; then
                    ARCH="armeabi-v7a"
                elif [[ "$base_name" == *"universal"* ]]; then
                    ARCH="universal"
                else
                    ARCH="standard"
                fi
                
                NEW_NAME="Restaurante_v${VERSION}_${TIMESTAMP}_${ARCH}.apk"
                cp "$apk" "build/$NEW_NAME"
            fi
        done
        
        if [ $? -eq 0 ]; then
            echo "✅ Build RELEASE concluído!"
            echo "📦 APKs gerados:"
            ls -lh build/Restaurante_v${VERSION}_${TIMESTAMP}*.apk | awk '{print "  -", $9, "(" $5 ")"}'
            echo ""
            echo "📱 Instale no celular:"
            echo "  ARM64: adb install build/Restaurante_v${VERSION}_${TIMESTAMP}_arm64-v8a.apk"
            echo "  ARM32: adb install build/Restaurante_v${VERSION}_${TIMESTAMP}_armeabi-v7a.apk"
        else
            echo "❌ Erro ao copiar APKs"
            exit 1
        fi
    else
        echo "❌ Pasta de APKs não encontrada"
        exit 1
    fi
else
    echo "❌ Erro no build"
    exit 1
fi
