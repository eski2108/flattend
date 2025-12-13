import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import pt from './pt.json';
import ru from './ru.json';
import ja from './ja.json';
import ko from './ko.json';
import zh from './zh.json';
import hi from './hi.json';
import ar from './ar.json';
import tr from './tr.json';
import nl from './nl.json';
import pl from './pl.json';
import vi from './vi.json';
import th from './th.json';
import id from './id.json';
import sv from './sv.json';
import no from './no.json';
import da from './da.json';
import fi from './fi.json';
import el from './el.json';
import cs from './cs.json';
import ro from './ro.json';
import hu from './hu.json';
import uk from './uk.json';
import he from './he.json';
import bn from './bn.json';
import ms from './ms.json';

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
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      pt: { translation: pt },
      ru: { translation: ru },
      ja: { translation: ja },
      ko: { translation: ko },
      zh: { translation: zh },
      hi: { translation: hi },
      ar: { translation: ar },
      tr: { translation: tr },
      nl: { translation: nl },
      pl: { translation: pl },
      vi: { translation: vi },
      th: { translation: th },
      id: { translation: id },
      sv: { translation: sv },
      no: { translation: no },
      da: { translation: da },
      fi: { translation: fi },
      el: { translation: el },
      cs: { translation: cs },
      ro: { translation: ro },
      hu: { translation: hu },
      uk: { translation: uk },
      he: { translation: he },
      bn: { translation: bn },
      ms: { translation: ms }
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
