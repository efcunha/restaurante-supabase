#!/usr/bin/env node

/**
 * Script para atualizar a splash screen do Android
 * Gera os arquivos splashscreen_logo.png em todas as densidades
 * 
 * Uso: node update-splash-screen.js
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

// Tamanhos para splash screen (geralmente menores que os ícones)
const SPLASH_SIZES = {
  'mdpi': 200,
  'hdpi': 300,
  'xhdpi': 400,
  'xxhdpi': 600,
  'xxxhdpi': 800
};

async function generateSplashScreens() {
  console.log('🎨 Gerando splash screens Android...');
  console.log('');
  
  // Verificar se a imagem fonte existe
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('❌ Imagem fonte não encontrada:', SOURCE_IMAGE);
    process.exit(1);
  }

  for (const [density, size] of Object.entries(SPLASH_SIZES)) {
    const outputDir = path.join(ANDROID_RES, `drawable-${density}`);
    
    // Criar diretório se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`  Gerando splash screen ${size}x${size} para ${density}...`);
    
    try {
      // Gerar splash screen com fundo transparente
      await sharp(SOURCE_IMAGE)
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 0, g: 0, b: 0, alpha: 0 } 
        })
        .png()
        .toFile(path.join(outputDir, 'splashscreen_logo.png'));
      
    } catch (error) {
      console.error(`❌ Erro ao gerar splash screen para ${density}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('');
  console.log('✅ Splash screens gerados com sucesso!');
  console.log('');
  console.log('📱 Próximos passos:');
  console.log('1. Limpar cache: cd android && ./gradlew clean && cd ..');
  console.log('2. Reconstruir app: npx expo run:android');
  console.log('');
}

generateSplashScreens().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
