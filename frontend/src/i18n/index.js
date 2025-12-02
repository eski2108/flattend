import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './en.json';
import pt from './pt.json';
import hi from './hi.json';
import ar from './ar.json';

// Country to language mapping
const countryToLanguage = {
  BR: 'pt', // Brazil
  PT: 'pt', // Portugal
  IN: 'hi', // India
  SA: 'ar', // Saudi Arabia
  AE: 'ar', // UAE
  EG: 'ar', // Egypt
  JO: 'ar', // Jordan
  KW: 'ar', // Kuwait
  QA: 'ar', // Qatar
  BH: 'ar', // Bahrain
  OM: 'ar', // Oman
  LB: 'ar', // Lebanon
  SY: 'ar', // Syria
  IQ: 'ar', // Iraq
  YE: 'ar', // Yemen
};

// Detect country by IP (simplified - in production use a proper IP geolocation service)
const detectCountry = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code;
  } catch (error) {
    console.log('Could not detect country:', error);
    return null;
  }
};

// Custom language detector
const customLanguageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    // 1. Check localStorage first
    const savedLanguage = localStorage.getItem('userLanguage');
    if (savedLanguage) {
      callback(savedLanguage);
      return;
    }

    // 2. Check user preference from backend (if logged in)
    const user = localStorage.getItem('cryptobank_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.language_preference) {
          callback(userData.language_preference);
          return;
        }
      } catch (e) {}
    }

    // 3. Detect by country IP
    const country = await detectCountry();
    if (country && countryToLanguage[country]) {
      callback(countryToLanguage[country]);
      return;
    }

    // 4. Detect by browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const lang = browserLang.split('-')[0];
      if (['en', 'pt', 'hi', 'ar'].includes(lang)) {
        callback(lang);
        return;
      }
    }

    // 5. Default to English
    callback('en');
  },
  init: () => {},
  cacheUserLanguage: (lng) => {
    localStorage.setItem('userLanguage', lng);
  }
};

i18n
  .use(customLanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      hi: { translation: hi },
      ar: { translation: ar }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['customDetector'],
      caches: ['localStorage']
    }
  });

// Apply RTL for Arabic
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;
