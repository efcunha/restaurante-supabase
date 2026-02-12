#!/usr/bin/env node

/**
 * Script para adicionar padding ao ícone para adaptive icons Android
 * 
 * Adaptive icons do Android usam apenas 66% da área central da imagem.
 * Este script adiciona padding para garantir que a imagem fique bem enquadrada.
 * 
 * Uso: node fix-icon-padding.js
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

const SOURCE_IMAGE = path.join(__dirname, '../imagem/icone-bak.png');
const OUTPUT_IMAGE = path.join(__dirname, '../imagem/icone.png');

async function addPaddingToIcon() {
  console.log('🎨 Adicionando padding ao ícone para adaptive icon...');
  console.log('');
  
  // Verificar se a imagem fonte existe
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('❌ Imagem fonte não encontrada:', SOURCE_IMAGE);
    console.error('');
    console.error('Certifique-se de que o arquivo icone-bak.png existe na pasta imagem/');
    process.exit(1);
  }

  try {
    // Ler metadados da imagem original
    const metadata = await sharp(SOURCE_IMAGE).metadata();
    console.log(`📏 Imagem original: ${metadata.width}x${metadata.height}`);
    
    // Calcular novo tamanho com padding
    // Adaptive icons usam 66% da área central, então precisamos de ~52% de padding
    // Para uma imagem de 1024x1024, vamos reduzir para ~680x680 e centralizar
    const originalSize = 1024;
    const safeZonePercent = 0.66; // 66% é a safe zone do adaptive icon
    const contentSize = Math.round(originalSize * safeZonePercent);
    
    console.log(`📐 Área segura (safe zone): ${contentSize}x${contentSize} (${Math.round(safeZonePercent * 100)}%)`);
    console.log('');
    console.log('🔄 Processando...');
    
    // Redimensionar a imagem para caber na safe zone e adicionar padding transparente
    await sharp(SOURCE_IMAGE)
      .resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fundo transparente
      })
      .extend({
        top: Math.round((originalSize - contentSize) / 2),
        bottom: Math.round((originalSize - contentSize) / 2),
        left: Math.round((originalSize - contentSize) / 2),
        right: Math.round((originalSize - contentSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fundo transparente
      })
      .png()
      .toFile(OUTPUT_IMAGE);
    
    console.log('✅ Ícone processado com sucesso!');
    console.log('');
    console.log(`📁 Arquivo gerado: ${OUTPUT_IMAGE}`);
    console.log(`📏 Tamanho final: ${originalSize}x${originalSize}`);
    console.log(`🎯 Conteúdo: ${contentSize}x${contentSize} (centralizado)`);
    console.log('');
    console.log('📱 Próximos passos:');
    console.log('1. Regenerar ícones Android: npm run generate-icons');
    console.log('2. Limpar cache: cd android && ./gradlew clean && cd ..');
    console.log('3. Reconstruir app: npx expo run:android');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error.message);
    process.exit(1);
  }
}

addPaddingToIcon().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
