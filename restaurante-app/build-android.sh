#!/bin/bash

# Script de Build Automatizado - APK Android Assinado
# Restaurante App v1.0.1

set -e  # Para em caso de erro

echo "🚀 Iniciando build do APK Android..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretórios
ANDROID_DIR="android"
APK_DIR="android/app/build/outputs/apk/release"
KEYSTORE_PATH="android/app/restaurante-release-key.keystore"

# Verificar se está no diretório correto
if [ ! -d "$ANDROID_DIR" ]; then
    echo -e "${RED}❌ Erro: Diretório android/ não encontrado!${NC}"
    echo "Execute este script na raiz do projeto restaurante-app/"
    exit 1
fi

# Verificar se keystore existe
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${RED}❌ Erro: Keystore não encontrado!${NC}"
    echo "Esperado em: $KEYSTORE_PATH"
    exit 1
fi

# Build do APK Release (sem clean para evitar problemas com codegen)
cd $ANDROID_DIR
echo ""
echo -e "${YELLOW}🔨 Compilando APK Release (isso pode levar alguns minutos)...${NC}"
echo -e "${YELLOW}   Memória alocada: 4GB RAM + 1GB Metaspace${NC}"
./gradlew assembleRelease --no-daemon

# Verificar se APKs foram gerados
cd ..
APK_COUNT=$(ls "$APK_DIR"/*.apk 2>/dev/null | wc -l)
if [ "$APK_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Erro: APK não foi gerado!${NC}"
    exit 1
fi

# APKs já estão assinados pelo Gradle
echo ""
echo -e "${GREEN}✅ APKs assinados pelo Gradle${NC}"

# Informações dos APKs
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ BUILD CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Criar pasta build e copiar APKs com versionamento
BUILD_OUTPUT="build"
mkdir -p "$BUILD_OUTPUT"

# Extrair versão do app.json
VERSION=$(grep -o '"version": "[^"]*"' app.json | head -n 1 | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
    VERSION="1.0.0"
fi
TIMESTAMP=$(date +%Y%m%d_%H%M)

echo "📦 Copiando APKs com versão v$VERSION..."

for apk in "$APK_DIR"/*.apk; do
    if [ -f "$apk" ]; then
        # Novo nome: Restaurante_v1.0.1_20250121_1200.apk
        # Se houver múltiplos APKs (splits), manter o sufixo original seria bom, mas para single apk:
        NEW_NAME="Restaurante_v${VERSION}_${TIMESTAMP}.apk"
        
        cp "$apk" "$BUILD_OUTPUT/$NEW_NAME"
    fi
done

echo "📦 APKs gerados e copiados:"
echo ""
ls -lh "$BUILD_OUTPUT"/*.apk | awk '{printf "   %s - %s\n", $9, $5}'
echo ""
echo "📍 Localizações:"
echo "   Original: $APK_DIR/"
echo "   Cópia: $BUILD_OUTPUT/"
echo ""
echo -e "${YELLOW}📱 Próximos passos:${NC}"
echo "   1. Instalar via USB: adb install $BUILD_OUTPUT/<nome-do-apk>.apk"
echo "   2. Ou transferir o APK para o celular e instalar manualmente"
echo ""
echo -e "${GREEN}🎉 Pronto para testar!${NC}"
