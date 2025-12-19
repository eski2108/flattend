import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import en from './i18n/en.json';
import es from './i18n/es.json';
import fr from './i18n/fr.json';
import de from './i18n/de.json';
import it from './i18n/it.json';
import pt from './i18n/pt.json';
import ru from './i18n/ru.json';
import zh from './i18n/zh.json';
import ja from './i18n/ja.json';
import ko from './i18n/ko.json';
import ar from './i18n/ar.json';
import hi from './i18n/hi.json';
import tr from './i18n/tr.json';
import nl from './i18n/nl.json';
import pl from './i18n/pl.json';
import sv from './i18n/sv.json';
import no from './i18n/no.json';
import da from './i18n/da.json';
import fi from './i18n/fi.json';
import cs from './i18n/cs.json';
import el from './i18n/el.json';
import th from './i18n/th.json';
import vi from './i18n/vi.json';
import id from './i18n/id.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  ru: { translation: ru },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
  tr: { translation: tr },
  nl: { translation: nl },
  pl: { translation: pl },
  sv: { translation: sv },
  no: { translation: no },
  da: { translation: da },
  fi: { translation: fi },
  cs: { translation: cs },
  el: { translation: el },
  th: { translation: th },
  vi: { translation: vi },
  id: { translation: id },
};

// Safe localStorage access for WebView compatibility
const getSavedLanguage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('language') || 'en';
    }
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
  return 'en';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: getSavedLanguage(),
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
