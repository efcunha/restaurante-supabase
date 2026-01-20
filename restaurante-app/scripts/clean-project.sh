#!/bin/bash

# Script para limpar arquivos desnecessários para build do APK
# Remove arquivos temporários, caches e builds antigos

echo "🧹 Iniciando limpeza do projeto..."

# Navegar para raiz do projeto
cd "$(dirname "$0")/.."

# Função para remover com confirmação de tamanho
remove_if_exists() {
    local path="$1"
    local description="$2"
    
    if [ -e "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | cut -f1)
        echo "🗑️  Removendo $description ($size): $path"
        rm -rf "$path"
    fi
}

# 1. Limpar builds e caches do Android
echo "📱 Limpando builds Android..."
remove_if_exists "android/.gradle" "cache do Gradle"
remove_if_exists "android/app/build" "build do app Android"
remove_if_exists "android/build" "build Android"

# 2. Limpar caches do Expo/Metro
echo "⚛️  Limpando caches Expo/Metro..."
remove_if_exists ".expo" "cache do Expo"
remove_if_exists "build-output" "build output antigo"
remove_if_exists "dist" "distribuição antiga"

# 3. Limpar logs e arquivos temporários
echo "📄 Limpando logs e temporários..."
remove_if_exists "firebase-debug.log" "log do Firebase"
remove_if_exists "*.log" "arquivos de log"

# 4. Limpar arquivos de desenvolvimento (opcionais)
echo "🔧 Limpando arquivos de desenvolvimento..."
remove_if_exists "migration-example.tsx" "exemplo de migração"
remove_if_exists "create-admin-web.sh" "script de admin web"
remove_if_exists ".vscode" "configurações do VS Code"
remove_if_exists ".github" "configurações do GitHub"

# 5. Limpar node_modules (será reinstalado se necessário)
read -p "❓ Remover node_modules (1.5G)? Será necessário npm install depois. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    remove_if_exists "node_modules" "dependências Node.js"
    remove_if_exists "package-lock.json" "lock do npm"
fi

# 6. Limpar arquivos de documentação (opcionais)
read -p "❓ Remover arquivos de documentação? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    remove_if_exists "TODO.md" "lista de tarefas"
    remove_if_exists "CONTEXT.md" "contexto do projeto"
    remove_if_exists "README.md" "documentação"
fi

# Mostrar espaço liberado
echo ""
echo "✅ Limpeza concluída!"
echo "📊 Espaço atual do projeto:"
du -sh . | cut -f1
echo ""
echo "💡 Para build do APK, você precisa apenas de:"
echo "   - src/ (código fonte)"
echo "   - android/ (configuração Android)"
echo "   - assets/ (recursos)"
echo "   - package.json (dependências)"
echo "   - app.json (configuração Expo)"
echo "   - scripts/ (scripts de build)"
