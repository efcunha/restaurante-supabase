#!/bin/bash

echo "🧹 Limpando cache completo do Firebase Auth..."

# Limpar cache do AsyncStorage
echo "📱 Limpando AsyncStorage..."
adb shell pm clear com.donacida.espeto 2>/dev/null || echo "App não instalado ou ADB não disponível"

# Limpar dados do app (se instalado)
echo "🗑️ Limpando dados do app..."
adb shell pm clear com.donacida.espeto 2>/dev/null || echo "App não instalado"

# Limpar cache do sistema
echo "🔄 Limpando cache do sistema..."
adb shell pm trim-caches 1000000000 2>/dev/null || echo "Comando trim-caches não disponível"

echo "✅ Limpeza completa finalizada!"
echo "📋 Próximos passos:"
echo "   1. Desinstalar o APK atual"
echo "   2. Instalar o novo APK"
echo "   3. Testar o login"
