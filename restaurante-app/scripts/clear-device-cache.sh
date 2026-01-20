#!/bin/bash

# Script para limpar completamente o cache do app no dispositivo Android
# Use este script quando o app não pedir login após desinstalar

echo "🧹 Limpando cache completo do dispositivo..."

# Nome do pacote do app
PACKAGE_NAME="com.felipebarcelospro.espetoapp"

echo "📱 Verificando dispositivos conectados..."
adb devices

echo "🗑️ Desinstalando app completamente..."
adb uninstall $PACKAGE_NAME 2>/dev/null || echo "App não estava instalado"

echo "🧹 Limpando dados do sistema..."
# Limpar dados do WebView (onde Firebase pode cachear)
adb shell pm clear com.android.webview 2>/dev/null || echo "WebView não encontrado"
adb shell pm clear com.google.android.webview 2>/dev/null || echo "Google WebView não encontrado"

# Limpar cache do sistema
adb shell pm trim-caches 1000000000 2>/dev/null || echo "Trim cache não suportado"

echo "🔄 Reiniciando dispositivo para limpeza completa..."
adb reboot

echo "⏳ Aguardando dispositivo reiniciar..."
adb wait-for-device

echo "✅ Limpeza completa finalizada!"
echo "📱 Agora instale o APK novamente:"
echo "   adb install build/espeto-latest.apk"
