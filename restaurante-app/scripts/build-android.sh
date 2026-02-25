#!/bin/bash

# Script para build Android RELEASE do projeto Espeto App
# Gera APK de produção (não precisa de servidor Metro)

echo "🚀 Iniciando build Android RELEASE..."

# Configurar variáveis de ambiente
export NODE_ENV=production
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Verificar se Android SDK está configurado
if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Android SDK não encontrado em $ANDROID_HOME"
    exit 1
fi

# Navegar para raiz do projeto
cd "$(dirname "$0")/.."

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
cd android && ./gradlew assembleRelease --quiet

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
