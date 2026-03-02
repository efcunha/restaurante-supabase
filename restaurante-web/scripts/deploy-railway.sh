#!/bin/bash

# Script para fazer deploy do Restaurante Web no Railway
# Certifique-se de estar na pasta restaurante-web antes de executar

echo "======================================"
echo "🚀 Iniciando Deploy para o Railway..."
echo "======================================"

# Verifica se a CLI do Railway está instalada
if ! command -v railway &> /dev/null
then
    echo "❌ Erro: Railway CLI não encontrado."
    echo "Instalando Railway CLI globalmente via npm..."
    npm install -g @railway/cli
fi

# Prevenção: Limpa a variável RAILWAY_TOKEN caso exista na sessão 
# (pois ela tem precedência e pode causar erros de proxy/unauthorized se estiver inválida).
# O CLI usará a RAILWAY_API_TOKEN ou o cache de login nativo (railway login).
unset RAILWAY_TOKEN

# Vincula o diretório ao projeto do Railway caso não esteja vinculado.
echo "Verificando vínculo com o projeto..."
railway link

# Executa o deploy para a nuvem
echo "Enviando projeto para produção no Railway..."
railway up

if [ $? -eq 0 ]; then
    echo "✅ Deploy iniciado/concluído com sucesso no Railway!"
else
    echo "❌ Ocorreu um erro durante o deploy."
    echo "Dica: Verifique se você está autenticado usando 'railway login' e vinculado ao projeto usando 'railway link'."
    exit 1
fi
