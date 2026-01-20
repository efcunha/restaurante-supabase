#!/bin/bash

# Script para limpar cache do Firebase Auth e forçar logout
# Uso: ./scripts/clear-auth-cache.sh

echo "🧹 Limpando cache do Firebase Auth..."

# Limpar cache do AsyncStorage (se houver)
echo "📱 Limpando AsyncStorage..."
adb shell pm clear com.donacida.espeto 2>/dev/null || echo "⚠️ App não instalado ou ADB não conectado"

# Limpar dados do app no dispositivo
echo "🗑️ Limpando dados do aplicativo..."
adb shell am force-stop com.donacida.espeto 2>/dev/null || echo "⚠️ App não está rodando"

echo "✅ Cache limpo! Reinstale o APK para testar o login."
echo "📱 Comando: adb install build/espeto-latest.apk"
