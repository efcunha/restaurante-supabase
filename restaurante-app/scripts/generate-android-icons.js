#!/usr/bin/env node

/**
 * Script para gerar ícones Android em todos os tamanhos necessários
 * Usa sharp (biblioteca Node.js) para redimensionar imagens
 * 
 * Uso: node generate-android-icons.js
 */

const fs = require('fs');
const path = require('path');

// Verificar se sharp está instalado
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Biblioteca "sharp" não está instalada!');
  console.error('Instale com: npm install --save-dev sharp');
  process.exit(1);
}

const SOURCE_IMAGE = path.join(__dirname, '../imagem/icone.png');
const ANDROID_RES = path.join(__dirname, '../android/app/src/main/res');

// Tamanhos para cada densidade
const SIZES = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

async function generateIcons() {
  console.log('🎨 Gerando ícones Android a partir de', SOURCE_IMAGE);
  
  // Verificar se a imagem fonte existe
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('❌ Imagem fonte não encontrada:', SOURCE_IMAGE);
    process.exit(1);
  }

  for (const [density, size] of Object.entries(SIZES)) {
    const outputDir = path.join(ANDROID_RES, `mipmap-${density}`);
    
    // Criar diretório se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`  Gerando ícones ${size}x${size} para ${density}...`);
    
    try {
      // ic_launcher.png (ícone quadrado)
      await sharp(SOURCE_IMAGE)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(path.join(outputDir, 'ic_launcher.png'));
      
      // ic_launcher_round.png (ícone redondo com máscara circular)
      const roundMask = Buffer.from(
        `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`
      );
      
      await sharp(SOURCE_IMAGE)
        .resize(size, size, { fit: 'cover' })
        .composite([{
          input: roundMask,
          blend: 'dest-in'
        }])
        .png()
        .toFile(path.join(outputDir, 'ic_launcher_round.png'));
      
      // ic_launcher_foreground.png (para adaptive icon)
      // Adaptive icons usam 108dp, então calculamos proporcionalmente
      const foregroundSize = Math.round(size * 108 / 48);
      
      await sharp(SOURCE_IMAGE)
        .resize(foregroundSize, foregroundSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
      
      // Remover arquivos .webp antigos se existirem
      const webpFiles = ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp'];
      webpFiles.forEach(file => {
        const filePath = path.join(outputDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      
    } catch (error) {
      console.error(`❌ Erro ao gerar ícones para ${density}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('✅ Ícones gerados com sucesso!');
  console.log('');
  console.log('📱 Próximos passos:');
  console.log('1. Reconstrua o app: cd android && ./gradlew clean');
  console.log('2. Execute: npx expo run:android');
  console.log('');
}

generateIcons().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
