#!/bin/bash

# Diretório do SDK
SDK_DIR="$HOME/Android/Sdk"
# Using a known recent version of command line tools
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

echo "🚀 Iniciando reinstalação do Android SDK..."

echo "🗑️  Limpando instalação anterior em $SDK_DIR..."
rm -rf "$SDK_DIR"
mkdir -p "$SDK_DIR/cmdline-tools"

echo "📥 Baixando Command Line Tools..."
wget -q "$CMDLINE_TOOLS_URL" -O cmdline-tools.zip

if [ $? -ne 0 ]; then
    echo "❌ Erro ao baixar ferramentas. Verifique sua conexão."
    exit 1
fi

echo "📦 Extraindo..."
unzip -q cmdline-tools.zip -d "$SDK_DIR/cmdline-tools"
rm cmdline-tools.zip

# Estrutura necessária: cmdline-tools/latest/bin
echo "📂 Organizando pastas..."
mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"

# Definir variáveis para esta sessão
export ANDROID_HOME="$SDK_DIR"
export PATH="$PATH:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools"

echo "📜 Aceitando licenças (isso pode demorar um pouco)..."
yes | sdkmanager --licenses > /dev/null 2>&1

echo "🛠️  Instalando Platform-Tools, Android 35 (Vanilla Ice Cream), Build-Tools e NDK..."
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "ndk;27.1.12297006"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Android SDK reinstalado com sucesso!"
    echo "📍 Local: $SDK_DIR"
    echo "📦 Pacotes: Android 34, Build-Tools 34.0.0"
else
    echo "❌ Erro ao instalar pacotes via sdkmanager."
    exit 1
fi
