#!/bin/bash

# Script para limpar caches do Gradle de forma profunda
# Resolve erros de "Could not read workspace metadata" e corrupção de cache

echo "🧹 Iniciando limpeza PROFUNDA do Gradle..."

# 0. Parar Daemons do Gradle (Crucial para liberar arquivos travados)
echo "  - Parando processos do Gradle (daemons)..."
if [ -f "android/gradlew" ]; then
    cd android && ./gradlew --stop && cd ..
fi
pkill -f gradle || true

# 1. Limpar caches locais do projeto
echo "  - Limpando caches locais do projeto..."
rm -rf .gradle
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build

# 2. Diagnóstico de Sistema
echo "  - Verificando espaço em disco..."
df -h . | tail -1
echo "  - Verificando versão do Java..."
java -version 2>&1 | head -n 1

# 3. Limpar caches globais do Gradle
echo "  - Limpando caches GLOBAIS (~/.gradle/caches)..."
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/daemon
rm -rf ~/.gradle/wrapper/dists

echo "✅ Limpeza completa concluída!"
echo "🚀 Tente novamente agora: ./scripts/build-android.sh"
echo "💡 Se o erro persistir, tente rodar com stacktrace para diagnóstico: "
echo "   cd android && ./gradlew assembleRelease --stacktrace"

