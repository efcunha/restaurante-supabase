# 🎬 Correção da Splash Screen (Tela de Abertura)

## 🎯 Problema Identificado

Ao clicar no ícone do app, aparece rapidamente a **imagem antiga** antes da tela de login.

### O que é Splash Screen?

A **splash screen** (tela de abertura) é a primeira tela que aparece quando você abre o aplicativo:
- Aparece por 1-3 segundos enquanto o app carrega
- Mostra o logo/ícone do aplicativo
- Dá uma impressão profissional ao app

### Onde estava o problema?

A configuração do splash screen ainda apontava para a imagem antiga:
```json
"splash": {
  "image": "./assets/icon.png"  ← Imagem antiga
}
```

---

## ✅ Solução Implementada

### 1. Atualização do app.json

**ANTES:**
```json
"splash": {
  "image": "./assets/icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#8B2F2F"
}
```

**DEPOIS:**
```json
"splash": {
  "image": "./imagem/icone.png",
  "resizeMode": "contain",
  "backgroundColor": "#8B2F2F"
}
```

### 2. Atualização dos Arquivos Nativos Android

O Android também tem arquivos nativos de splash screen que precisam ser atualizados:

```
android/app/src/main/res/
├── drawable-mdpi/splashscreen_logo.png (200x200)
├── drawable-hdpi/splashscreen_logo.png (300x300)
├── drawable-xhdpi/splashscreen_logo.png (400x400)
├── drawable-xxhdpi/splashscreen_logo.png (600x600)
└── drawable-xxxhdpi/splashscreen_logo.png (800x800)
```

---

## 🛠️ Script Criado

### update-splash-screen.js

Este script gera automaticamente os arquivos de splash screen em todas as densidades:

- **Entrada:** `imagem/icone.png`
- **Saída:** 5 arquivos `splashscreen_logo.png` (uma para cada densidade)
- **Tamanhos:** 200px a 800px (dependendo da densidade)

---

## 📋 Como Usar

### Opção 1: Atualizar Tudo (Recomendado)

```bash
cd restaurante-app
npm run update-all-icons
```

Este comando atualiza:
1. ✅ Ícone do app (com padding)
2. ✅ Ícones Android (todas as densidades)
3. ✅ Splash screen (todas as densidades)

### Opção 2: Apenas Splash Screen

```bash
cd restaurante-app
npm run update-splash
```

### Opção 3: Passo a Passo

```bash
cd restaurante-app

# 1. Atualizar splash screen
npm run update-splash

# 2. Limpar cache
cd android && ./gradlew clean && cd ..

# 3. Reconstruir app
npx expo run:android
```

---

## 📊 Comparação Antes/Depois

### ANTES
```
Ao abrir o app:
1. Clica no ícone ✅ (novo)
2. Splash screen ❌ (imagem antiga)
3. Tela de login ✅
```

### DEPOIS
```
Ao abrir o app:
1. Clica no ícone ✅ (novo)
2. Splash screen ✅ (novo)
3. Tela de login ✅
```

---

## 🎨 Configuração da Splash Screen

### Propriedades

```json
{
  "image": "./imagem/icone.png",      // Imagem a ser exibida
  "resizeMode": "contain",             // Como ajustar a imagem
  "backgroundColor": "#8B2F2F"         // Cor de fundo
}
```

### Opções de resizeMode

- **contain** (atual): Mantém proporções, adiciona espaço se necessário
- **cover**: Preenche toda a tela, pode cortar a imagem
- **native**: Usa o comportamento padrão do sistema

---

## 📁 Arquivos Modificados

### Configuração
- ✅ `app.json` - Atualizado para usar `./imagem/icone.png`

### Arquivos Nativos Android
- ✅ `drawable-mdpi/splashscreen_logo.png` (200x200)
- ✅ `drawable-hdpi/splashscreen_logo.png` (300x300)
- ✅ `drawable-xhdpi/splashscreen_logo.png` (400x400)
- ✅ `drawable-xxhdpi/splashscreen_logo.png` (600x600)
- ✅ `drawable-xxxhdpi/splashscreen_logo.png` (800x800)

### Scripts
- ✅ `scripts/update-splash-screen.js` - Gera splash screens

---

## ✅ Checklist de Correção

- [x] app.json atualizado
- [x] Script de splash screen criado
- [x] Comando npm adicionado
- [ ] Executar `npm run update-all-icons`
- [ ] Limpar cache do Android
- [ ] Reconstruir e testar no celular

---

## 📱 Aplicar no Celular

Após executar os comandos:

```bash
cd restaurante-app
npm run update-all-icons
cd android
./gradlew clean
cd ..
npx expo run:android
```

Agora ao abrir o app:
1. ✅ Ícone novo aparece na tela inicial
2. ✅ Splash screen com ícone novo
3. ✅ Tela de login

---

## 🔍 Verificação

Para verificar se funcionou:

1. Instale o app no celular
2. Feche o app completamente
3. Abra o app novamente
4. Observe a splash screen (deve mostrar o novo ícone)

---

## 📝 Comandos Disponíveis

```bash
# Atualizar apenas splash screen
npm run update-splash

# Atualizar ícone + splash screen (TUDO)
npm run update-all-icons

# Atualizar apenas ícone do app
npm run update-icon

# Verificar configuração
bash scripts/verificar-icone.sh
```

---

## 🎯 Resumo

**Problema:** Splash screen mostrava imagem antiga  
**Causa:** Configuração apontava para `./assets/icon.png`  
**Solução:** Atualizar para `./imagem/icone.png` + gerar arquivos nativos  
**Status:** ✅ CORRIGIDO

---

**Data:** 11 de Fevereiro de 2026  
**Arquivos atualizados:** app.json + 5 arquivos nativos Android
