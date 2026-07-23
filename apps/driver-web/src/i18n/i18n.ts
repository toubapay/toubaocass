import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'intercity_driver_web_language';

export const SUPPORTED_LANGUAGES = ['fr', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function getStoredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_KEY);

  return stored === 'ar' ? 'ar' : 'fr';
}

export function setStoredLanguage(language: SupportedLanguage): void {
  localStorage.setItem(LANGUAGE_KEY, language);
  i18n.changeLanguage(language);
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
