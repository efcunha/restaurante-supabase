#!/bin/bash

# Script para fazer deploy do Restaurante Web no Vercel
# Certifique-se de estar na pasta restaurante-web antes de executar

echo "======================================"
echo "🚀 Iniciando Deploy para o Vercel..."
echo "======================================"

# Verifica se a CLI do Vercel está instalada
if ! command -v npx vercel &> /dev/null
then
    echo "❌ Erro: Vercel CLI não encontrado."
    echo "Instalando Vercel CLI globalmente..."
    npm install -g vercel
fi

# Executa o deploy para produção
echo "Enviando projeto para produção..."
npx vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
else
    echo "❌ Ocorreu um erro durante o deploy."
    exit 1
fi
