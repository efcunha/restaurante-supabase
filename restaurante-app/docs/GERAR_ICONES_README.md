# Gerar Ícones Android

Este guia explica como gerar os ícones do aplicativo Android a partir da imagem `icone.png`.

## Pré-requisitos

Instale a biblioteca `sharp` (necessária apenas uma vez):

```bash
cd restaurante-app
npm install --save-dev sharp
```

## Gerar os Ícones

Execute o script de geração:

```bash
cd restaurante-app
node scripts/generate-android-icons.js
```

O script irá:
- Ler a imagem `imagem/icone.png` (1024x1024)
- Gerar ícones em todos os tamanhos necessários (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Criar 3 variações para cada tamanho:
  - `ic_launcher.png` - Ícone quadrado
  - `ic_launcher_round.png` - Ícone redondo
  - `ic_launcher_foreground.png` - Camada frontal para adaptive icon
- Remover os arquivos `.webp` antigos

## Reconstruir o App

Após gerar os ícones, reconstrua o aplicativo:

```bash
cd restaurante-app/android
./gradlew clean
cd ..
npx expo run:android
```

## Alternativa: Usar ImageMagick

Se preferir usar ImageMagick em vez do Node.js:

1. Instale o ImageMagick:
   - Linux: `sudo apt-get install imagemagick`
   - Mac: `brew install imagemagick`
   - Windows: Baixe de https://imagemagick.org/

2. Execute o script bash:
   ```bash
   cd restaurante-app
   bash scripts/generate-android-icons.sh
   ```

## Verificar os Ícones

Os ícones serão gerados em:
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

## Configuração Atualizada

O arquivo `app.json` foi atualizado para usar a nova imagem:
- `icon`: `./imagem/icone.png`
- `android.adaptiveIcon.foregroundImage`: `./imagem/icone.png`
