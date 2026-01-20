#!/bin/bash

# Script para copiar APKs já gerados para a pasta build
# Use este script quando os APKs já foram gerados e você só quer organizá-los

echo "📦 Copiando APKs existentes para pasta build..."

# Navegar para raiz do projeto
cd "$(dirname "$0")/.."

# Criar pasta build se não existir
mkdir -p build

# Gerar timestamp para versionamento
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSION_FILE="build/version.txt"

# Incrementar número da versão
if [ -f "$VERSION_FILE" ]; then
    BUILD_NUMBER=$(cat "$VERSION_FILE")
    BUILD_NUMBER=$((BUILD_NUMBER + 1))
else
    BUILD_NUMBER=1
fi
echo $BUILD_NUMBER > "$VERSION_FILE"

# Verificar quais APKs existem
APK_DIR="android/app/build/outputs/apk/release"

if [ -f "$APK_DIR/app-arm64-v8a-release.apk" ] && [ -f "$APK_DIR/app-armeabi-v7a-release.apk" ]; then
    echo ""
    echo "✅ APKs encontrados!"
    echo "📦 Copiando APKs por arquitetura:"
    
    # Copiar APK arm64-v8a (recomendado)
    APK_ARM64="espeto-arm64-v${BUILD_NUMBER}_${TIMESTAMP}.apk"
    APK_ARM64_DEST="build/$APK_ARM64"
    cp "$APK_DIR/app-arm64-v8a-release.apk" "$APK_ARM64_DEST"
    
    # Copiar APK armeabi-v7a (compatibilidade)
    APK_ARM32="espeto-arm32-v${BUILD_NUMBER}_${TIMESTAMP}.apk"
    APK_ARM32_DEST="build/$APK_ARM32"
    cp "$APK_DIR/app-armeabi-v7a-release.apk" "$APK_ARM32_DEST"
    
    # Criar links simbólicos para os APKs mais recentes
    ln -sf "$APK_ARM64" "build/espeto-latest-arm64.apk"
    ln -sf "$APK_ARM32" "build/espeto-latest-arm32.apk"
    ln -sf "$APK_ARM64" "build/espeto-latest.apk"  # arm64 como padrão
    
    echo "   📱 ARM64 (recomendado): $APK_ARM64_DEST"
    ls -lh "$APK_ARM64_DEST" | awk '{print "      📏 Tamanho:", $5}'
    
    echo "   📱 ARM32 (compatibilidade): $APK_ARM32_DEST"
    ls -lh "$APK_ARM32_DEST" | awk '{print "      📏 Tamanho:", $5}'
    
    echo ""
    echo "🔗 Links simbólicos criados:"
    echo "   build/espeto-latest.apk -> $APK_ARM64 (padrão)"
    echo "   build/espeto-latest-arm64.apk -> $APK_ARM64"
    echo "   build/espeto-latest-arm32.apk -> $APK_ARM32"
    
    echo ""
    echo "📊 Versão: $BUILD_NUMBER"
    echo ""
    echo "📱 Instalação:"
    echo "   Dispositivos modernos (2017+): adb install $APK_ARM64_DEST"
    echo "   Dispositivos antigos:          adb install $APK_ARM32_DEST"
    echo "   Automático (recomendado):      adb install build/espeto-latest.apk"
    
elif [ -f "$APK_DIR/app-release.apk" ]; then
    # Fallback para APK unificado
    echo ""
    echo "✅ APK unificado encontrado!"
    
    APK_NAME="espeto-v${BUILD_NUMBER}_${TIMESTAMP}.apk"
    APK_DEST="build/$APK_NAME"
    
    cp "$APK_DIR/app-release.apk" "$APK_DEST"
    ln -sf "$APK_NAME" "build/espeto-latest.apk"
    
    echo "📦 APK: $APK_DEST"
    echo "🔗 Link: build/espeto-latest.apk"
    echo "📊 Versão: $BUILD_NUMBER"
    ls -lh "$APK_DEST" | awk '{print "📏 Tamanho:", $5}'
    echo ""
    echo "📱 Instale no celular: adb install $APK_DEST"
    
else
    echo "❌ Nenhum APK encontrado em $APK_DIR"
    echo "📋 Arquivos disponíveis:"
    ls -la "$APK_DIR/" 2>/dev/null || echo "   Diretório não existe"
    echo ""
    echo "💡 Execute primeiro: bash scripts/build-android.sh"
    exit 1
fi

echo ""
echo "✅ APKs copiados com sucesso!"