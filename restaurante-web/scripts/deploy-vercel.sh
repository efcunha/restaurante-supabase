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

# Garante que o build mais recente seja gerado
echo "Gerando build da aplicação (Expo Web)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro: O processo de build falhou. Abortando o deploy."
    exit 1
fi

# Executa o deploy para produção
echo "Enviando projeto para produção no Vercel..."
npx vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
else
    echo "❌ Ocorreu um erro durante o deploy."
    exit 1
fi
