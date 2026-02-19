/**
 * i18n Configuration
 * 
 * Configuração do sistema de internacionalização.
 * Português como idioma padrão.
 * 
 * Requirements: 26.3, 26.4
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt.json';
import en from './locales/en.json';

// Configuração do i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: {
        translation: pt
      },
      en: {
        translation: en
      }
    },
    lng: 'pt', // Português como idioma padrão
    fallbackLng: 'pt',
    debug: __DEV__, // Debug apenas em desenvolvimento
    
    interpolation: {
      escapeValue: false // React já faz escape
    },
    
    react: {
      useSuspense: false // Desabilita suspense para React Native
    }
  });

export default i18n;
