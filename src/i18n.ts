import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { logger } from './lib/logger';
import ru from './pages/menu/locales/ru.json';
import en from './pages/menu/locales/en.json';
import kz from './pages/menu/locales/kz.json';

const SUPPORTED = ['ru', 'en', 'kz'] as const;
const STORAGE_KEY = 'app-language';

/** Restore the user's previously chosen language, falling back to the device/browser language. */
function detectInitialLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED as readonly string[]).includes(saved)) return saved;
  } catch {
    // localStorage unavailable (private mode / old WebView) — ignore
  }
  // kk is the ISO code for Kazakh; the app uses "kz"
  const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  if (nav === 'kk' || nav === 'kz') return 'kz';
  if (nav === 'en') return 'en';
  return 'ru';
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ru: { translation: ru },
        en: { translation: en },
        kz: { translation: kz },
      },
      supportedLngs: [...SUPPORTED],
      lng: detectInitialLanguage(),
      fallbackLng: 'ru',
      debug: false,
      interpolation: { escapeValue: false },
      keySeparator: '.',
      ns: ['translation'],
      defaultNS: 'translation',
    })
    .then(() => {
      logger.debug('i18n initialized', { language: i18n.language });
    })
    .catch((error) => {
      logger.error('Failed to initialize i18n', error);
    });

  // Persist the choice so it survives reloads / app restarts
  i18n.on('languageChanged', (lng) => {
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // ignore persistence failures
    }
  });
}

export default i18n;
