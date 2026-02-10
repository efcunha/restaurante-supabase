#!/bin/bash

# Script para limpar caches do Gradle de forma profunda
# Resolve erros de "Could not read workspace metadata" e corrupção de cache

echo "🧹 Iniciando limpeza PROFUNDA do Gradle..."

# 1. Limpar caches locais do projeto
echo "  - Limpando caches locais do projeto..."
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build

# 2. Limpar caches globais do Gradle (onde costuma ocorrer a corrupção)
# IMPORTANTE: Isso forçará o download das dependências no próximo build
echo "  - Limpando caches GLOBAIS (~/.gradle/caches)..."
rm -rf ~/.gradle/caches

echo "  - Limpando distribuições do Gradle (~/.gradle/wrapper/dists)..."
rm -rf ~/.gradle/wrapper/dists

echo "✅ Limpeza concluída!"
echo "🚀 Agora você pode tentar o build novamente com: ./scripts/build-android.sh"
echo "💡 Nota: O primeiro build após essa limpeza será mais demorado pois baixará as dependências novamente."
