import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'intercity_driver_language';

export const SUPPORTED_LANGUAGES = ['fr', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
  if (stored === 'ar') i18n.changeLanguage('ar');
});

export async function setStoredLanguage(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  i18n.changeLanguage(language);
}

export default i18n;
