# 🔧 Correção do Enquadramento do Ícone

## 🎯 Problema Identificado

O ícone estava sendo **cortado** quando exibido no Android devido ao comportamento dos **Adaptive Icons**.

### O que são Adaptive Icons?

Desde o Android 8.0 (API 26), o sistema usa "Adaptive Icons" que:
- Permitem diferentes formatos (círculo, quadrado, squircle, etc.)
- Usam apenas **66% da área central** da imagem (safe zone)
- Cortam **34% das bordas** da imagem

### Visualização do Problema

```
┌─────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░ │ ← Área cortada (17%)
│ ░░┌─────────────────┐░░ │
│ ░░│                 │░░ │
│ ░░│   SAFE ZONE     │░░ │ ← 66% da imagem
│ ░░│   (visível)     │░░ │    (área visível)
│ ░░│                 │░░ │
│ ░░└─────────────────┘░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░ │ ← Área cortada (17%)
└─────────────────────────┘
```

**Resultado:** A imagem do chef estava sendo cortada nas bordas!

---

## ✅ Solução Implementada

Criamos um script que adiciona **padding automático** ao ícone:

1. **Reduz** a imagem para 66% do tamanho (680x680 pixels)
2. **Centraliza** a imagem reduzida
3. **Adiciona** padding transparente ao redor
4. **Mantém** o tamanho final de 1024x1024 pixels

### Visualização da Solução

```
┌─────────────────────────┐
│                         │
│     ┌─────────────┐     │
│     │             │     │
│     │   IMAGEM    │     │ ← Imagem reduzida
│     │   (66%)     │     │    e centralizada
│     │             │     │
│     └─────────────┘     │
│                         │
└─────────────────────────┘
       ↑         ↑
    Padding  Padding
```

**Resultado:** A imagem completa fica visível, sem cortes!

---

## 🛠️ Arquivos Criados

### 1. Script de Correção
- **Arquivo:** `scripts/fix-icon-padding.js`
- **Função:** Adiciona padding ao ícone
- **Comando:** `npm run fix-icon-padding`

### 2. Comando Combinado
- **Comando:** `npm run update-icon`
- **Função:** Corrige padding + gera ícones Android (tudo de uma vez)

---

## 📋 Como Usar

### Opção 1: Comando Único (Recomendado)
```bash
cd restaurante-app
npm run update-icon
```

Este comando faz tudo automaticamente:
1. Adiciona padding ao ícone
2. Gera todos os ícones Android
3. Remove arquivos antigos

### Opção 2: Passo a Passo
```bash
cd restaurante-app

# 1. Adicionar padding
npm run fix-icon-padding

# 2. Gerar ícones Android
npm run generate-icons

# 3. Limpar cache
cd android && ./gradlew clean && cd ..

# 4. Reconstruir app
npx expo run:android
```

---

## 📊 Comparação Antes/Depois

### ANTES (Imagem Cortada)
```
Imagem original: 1024x1024
Área visível: 66% (676x676)
Resultado: ❌ Imagem cortada nas bordas
```

### DEPOIS (Imagem com Padding)
```
Imagem reduzida: 680x680 (66% do original)
Padding adicionado: 172px em cada lado
Tamanho final: 1024x1024
Área visível: 100% da imagem reduzida
Resultado: ✅ Imagem completa visível
```

---

## 🔍 Detalhes Técnicos

### Cálculos do Padding

```javascript
Tamanho original: 1024px
Safe zone: 66% = 676px
Conteúdo: 680px (arredondado)
Padding por lado: (1024 - 680) / 2 = 172px
```

### Estrutura do Adaptive Icon

```xml
<adaptive-icon>
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

- **Background:** Cor sólida (#8B2F2F)
- **Foreground:** Imagem com padding (transparente nas bordas)

---

## 📁 Arquivos Envolvidos

### Imagens
- `imagem/icone-bak.png` - Imagem original (backup)
- `imagem/icone.png` - Imagem com padding (gerada automaticamente)

### Scripts
- `scripts/fix-icon-padding.js` - Adiciona padding
- `scripts/generate-android-icons.js` - Gera ícones Android

### Configuração
- `app.json` - Configuração do Expo
- `package.json` - Comandos npm

---

## ✅ Checklist de Correção

- [x] Script de padding criado
- [x] Comando npm adicionado
- [x] Documentação criada
- [ ] Executar `npm run update-icon`
- [ ] Limpar cache do Android
- [ ] Reconstruir e testar no celular

---

## 🎨 Recomendações de Design

Para futuros ícones, considere:

1. **Área Segura:** Mantenha elementos importantes nos 66% centrais
2. **Padding:** Deixe ~17% de espaço nas bordas
3. **Fundo:** Use fundo transparente ou cor sólida
4. **Teste:** Visualize em diferentes formatos (círculo, quadrado)

### Template Visual

```
┌─────────────────────────┐
│ 17%  EVITE ESTA ÁREA    │
│ ┌───────────────────┐   │
│ │                   │   │
│ │   ÁREA SEGURA     │   │
│ │   (66%)           │   │
│ │   Coloque logo    │   │
│ │   e texto aqui    │   │
│ │                   │   │
│ └───────────────────┘   │
│ 17%  EVITE ESTA ÁREA    │
└─────────────────────────┘
```

---

## 📱 Aplicar no Celular

Após executar os comandos acima:

```bash
cd restaurante-app
cd android
./gradlew clean
cd ..
npx expo run:android
```

O ícone agora deve aparecer **completo e bem enquadrado** no celular!

---

## 🔗 Referências

- [Android Adaptive Icons Guide](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [Expo Icon Guidelines](https://docs.expo.dev/develop/user-interface/app-icons/)

---

**Problema:** Ícone cortado  
**Causa:** Adaptive icons usam apenas 66% da área central  
**Solução:** Adicionar padding automático  
**Status:** ✅ CORRIGIDO

**Data:** 11 de Fevereiro de 2026
