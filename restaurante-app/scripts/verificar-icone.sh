#!/bin/bash

# Script para verificar se o ícone foi alterado corretamente

# Ir para o diretório raiz do projeto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "🔍 VERIFICAÇÃO DO ÍCONE DO APLICATIVO"
echo "======================================"
echo "Diretório: $(pwd)"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se as imagens existem
echo "1️⃣  Verificando existência dos arquivos..."
if [ -f "imagem/icone.png" ]; then
    echo -e "${GREEN}✅ imagem/icone.png existe${NC}"
else
    echo -e "${RED}❌ imagem/icone.png NÃO encontrado${NC}"
    exit 1
fi

if [ -f "assets/icon.png" ]; then
    echo -e "${GREEN}✅ assets/icon.png existe${NC}"
else
    echo -e "${YELLOW}⚠️  assets/icon.png NÃO encontrado${NC}"
fi

echo ""

# Comparar MD5
echo "2️⃣  Comparando imagens (MD5 hash)..."
MD5_NOVA=$(md5sum imagem/icone.png | awk '{print $1}')
MD5_ANTIGA=$(md5sum assets/icon.png 2>/dev/null | awk '{print $1}')

echo "   Nova (imagem/): $MD5_NOVA"
echo "   Antiga (assets/): $MD5_ANTIGA"

if [ "$MD5_NOVA" != "$MD5_ANTIGA" ]; then
    echo -e "${GREEN}✅ As imagens são DIFERENTES (correto)${NC}"
else
    echo -e "${YELLOW}⚠️  As imagens são IGUAIS${NC}"
fi

echo ""

# Verificar app.json
echo "3️⃣  Verificando configuração do app.json..."
if grep -q '"icon": "./imagem/icone.png"' app.json; then
    echo -e "${GREEN}✅ icon aponta para ./imagem/icone.png${NC}"
else
    echo -e "${RED}❌ icon NÃO aponta para ./imagem/icone.png${NC}"
fi

if grep -q '"foregroundImage": "./imagem/icone.png"' app.json; then
    echo -e "${GREEN}✅ adaptiveIcon aponta para ./imagem/icone.png${NC}"
else
    echo -e "${RED}❌ adaptiveIcon NÃO aponta para ./imagem/icone.png${NC}"
fi

echo ""

# Verificar ícones Android
echo "4️⃣  Verificando ícones nativos Android..."
ICON_COUNT=$(find android/app/src/main/res/mipmap-* -name "ic_launcher*.png" 2>/dev/null | wc -l)
WEBP_COUNT=$(find android/app/src/main/res/mipmap-* -name "*.webp" 2>/dev/null | wc -l)

echo "   Ícones PNG encontrados: $ICON_COUNT"
echo "   Ícones WEBP encontrados: $WEBP_COUNT"

if [ "$ICON_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✅ Ícones PNG gerados (mínimo 10)${NC}"
else
    echo -e "${YELLOW}⚠️  Poucos ícones PNG encontrados${NC}"
fi

if [ "$WEBP_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum arquivo WEBP antigo (correto)${NC}"
else
    echo -e "${YELLOW}⚠️  Ainda existem $WEBP_COUNT arquivos WEBP${NC}"
fi

echo ""

# Verificar data de modificação dos ícones
echo "5️⃣  Data de geração dos ícones Android..."
NEWEST_ICON=$(find android/app/src/main/res/mipmap-* -name "ic_launcher.png" -type f -printf '%T+ %p\n' 2>/dev/null | sort -r | head -1)
if [ -n "$NEWEST_ICON" ]; then
    echo "   $NEWEST_ICON"
    
    # Verificar se foi gerado hoje
    TODAY=$(date +%Y-%m-%d)
    ICON_DATE=$(echo "$NEWEST_ICON" | cut -d' ' -f1 | cut -d'T' -f1)
    
    if [ "$ICON_DATE" == "$TODAY" ]; then
        echo -e "${GREEN}✅ Ícones gerados HOJE${NC}"
    else
        echo -e "${YELLOW}⚠️  Ícones gerados em: $ICON_DATE${NC}"
    fi
else
    echo -e "${RED}❌ Nenhum ícone encontrado${NC}"
fi

echo ""

# Verificar adaptive icon
echo "6️⃣  Verificando adaptive icon..."
if [ -f "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml" ]; then
    echo -e "${GREEN}✅ ic_launcher.xml existe${NC}"
    
    if grep -q "ic_launcher_foreground" android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml; then
        echo -e "${GREEN}✅ Referência ao foreground correta${NC}"
    fi
    
    if grep -q "iconBackground" android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml; then
        echo -e "${GREEN}✅ Referência ao background correta${NC}"
    fi
else
    echo -e "${RED}❌ ic_launcher.xml NÃO encontrado${NC}"
fi

echo ""

# Resumo final
echo "======================================"
echo "📊 RESUMO"
echo "======================================"
echo ""
echo "Configuração do Expo (app.json):"
if grep -q '"icon": "./imagem/icone.png"' app.json && grep -q '"foregroundImage": "./imagem/icone.png"' app.json; then
    echo -e "${GREEN}✅ CONFIGURADO CORRETAMENTE${NC}"
else
    echo -e "${RED}❌ PRECISA SER CORRIGIDO${NC}"
fi

echo ""
echo "Ícones nativos Android:"
if [ "$ICON_COUNT" -ge 10 ] && [ "$WEBP_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ GERADOS CORRETAMENTE${NC}"
else
    echo -e "${YELLOW}⚠️  PRECISAM SER REGENERADOS${NC}"
    echo "   Execute: npm run generate-icons"
fi

echo ""
echo "======================================"
echo "Para aplicar as mudanças no celular:"
echo "  cd android && ./gradlew clean && cd .."
echo "  npx expo run:android"
echo "======================================"
