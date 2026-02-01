#!/bin/bash

echo "🔥 Deploying Firestore Indexes..."
echo ""

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado!"
    echo ""
    echo "📦 Instalando Firebase CLI..."
    npm install -g firebase-tools
fi

echo "🔐 Fazendo login no Firebase..."
firebase login

echo ""
echo "📋 Deploying indexes para o projeto..."
firebase deploy --only firestore:indexes --project restaurante-dabf3

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "⏳ Os índices podem levar alguns minutos para serem criados."
echo "📊 Verifique o status em: https://console.firebase.google.com/project/restaurante-dabf3/firestore/indexes"
