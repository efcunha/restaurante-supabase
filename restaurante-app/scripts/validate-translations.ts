/**
 * Translation Validation Script
 * 
 * Valida que todas as traduções estão completas e consistentes.
 * Executa no CI/CD para garantir qualidade.
 * 
 * Requirements: 26.5
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

/**
 * Obtém todas as chaves de um objeto de tradução recursivamente
 */
function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
  return Object.keys(obj).reduce((keys: string[], key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      return [...keys, ...getAllKeys(value as TranslationObject, fullKey)];
    }
    
    return [...keys, fullKey];
  }, []);
}

/**
 * Carrega arquivo de tradução
 */
function loadTranslation(locale: string): TranslationObject {
  const filePath = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Translation file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Valida completude de traduções
 */
function validateTranslations() {
  console.log('🔍 Validating translations...\n');
  
  const locales = ['pt', 'en'];
  const translations: Record<string, TranslationObject> = {};
  const allKeys: Record<string, string[]> = {};
  
  // Carrega todas as traduções
  for (const locale of locales) {
    try {
      translations[locale] = loadTranslation(locale);
      allKeys[locale] = getAllKeys(translations[locale]);
      console.log(`✅ Loaded ${locale}: ${allKeys[locale].length} keys`);
    } catch (error) {
      console.error(`❌ Error loading ${locale}:`, error);
      process.exit(1);
    }
  }
  
  console.log('');
  
  // Valida consistência entre locales
  let hasErrors = false;
  const baseLocale = 'pt'; // Português como referência
  const baseKeys = allKeys[baseLocale];
  
  for (const locale of locales) {
    if (locale === baseLocale) continue;
    
    const localeKeys = allKeys[locale];
    
    // Chaves faltando no locale
    const missingKeys = baseKeys.filter(key => !localeKeys.includes(key));
    if (missingKeys.length > 0) {
      console.error(`❌ Missing keys in ${locale}:`);
      missingKeys.forEach(key => console.error(`   - ${key}`));
      console.error('');
      hasErrors = true;
    }
    
    // Chaves extras no locale (não existem no base)
    const extraKeys = localeKeys.filter(key => !baseKeys.includes(key));
    if (extraKeys.length > 0) {
      console.warn(`⚠️  Extra keys in ${locale} (not in ${baseLocale}):`);
      extraKeys.forEach(key => console.warn(`   - ${key}`));
      console.warn('');
    }
  }
  
  // Valida valores vazios
  for (const locale of locales) {
    const emptyValues = findEmptyValues(translations[locale]);
    if (emptyValues.length > 0) {
      console.error(`❌ Empty values in ${locale}:`);
      emptyValues.forEach(key => console.error(`   - ${key}`));
      console.error('');
      hasErrors = true;
    }
  }
  
  // Resultado final
  if (hasErrors) {
    console.error('❌ Translation validation failed!\n');
    process.exit(1);
  } else {
    console.log('✅ All translations are complete and consistent!\n');
    
    // Estatísticas
    console.log('📊 Statistics:');
    for (const locale of locales) {
      console.log(`   ${locale}: ${allKeys[locale].length} keys`);
    }
    console.log('');
  }
}

/**
 * Encontra valores vazios em um objeto de tradução
 */
function findEmptyValues(obj: TranslationObject, prefix = ''): string[] {
  return Object.keys(obj).reduce((empty: string[], key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      return [...empty, ...findEmptyValues(value as TranslationObject, fullKey)];
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return [...empty, fullKey];
    }
    
    return empty;
  }, []);
}

/**
 * Gera relatório de cobertura
 */
function generateCoverageReport() {
  console.log('📈 Generating coverage report...\n');
  
  const locales = ['pt', 'en'];
  const translations: Record<string, TranslationObject> = {};
  
  for (const locale of locales) {
    translations[locale] = loadTranslation(locale);
  }
  
  const baseKeys = getAllKeys(translations['pt']);
  const coverage: Record<string, number> = {};
  
  for (const locale of locales) {
    const localeKeys = getAllKeys(translations[locale]);
    const coveredKeys = baseKeys.filter(key => localeKeys.includes(key));
    coverage[locale] = (coveredKeys.length / baseKeys.length) * 100;
  }
  
  console.log('Coverage by locale:');
  for (const locale of locales) {
    const percent = coverage[locale].toFixed(2);
    const bar = '█'.repeat(Math.floor(coverage[locale] / 2));
    console.log(`   ${locale}: ${bar} ${percent}%`);
  }
  console.log('');
}

// Executa validação
try {
  validateTranslations();
  generateCoverageReport();
} catch (error) {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}
