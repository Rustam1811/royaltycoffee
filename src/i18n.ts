import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { logger } from './lib/logger';
import ru from './pages/menu/locales/ru.json';
import en from './pages/menu/locales/en.json';
import kz from './pages/menu/locales/kz.json';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ru: { translation: ru },
        en: { translation: en },
        kz: { translation: kz },
      },
      supportedLngs: ['ru', 'en', 'kz'],
      lng: 'ru',
      fallbackLng: 'ru',
      debug: false,
      interpolation: { escapeValue: false },
      keySeparator: '.',
      ns: ['translation'],
      defaultNS: 'translation',
    })
    .then(() => {
      logger.debug('i18n initialized', { languages: ['ru', 'en', 'kz'] });
    })
    .catch((error) => {
      logger.error('Failed to initialize i18n', error);
    });
}

export default i18n;
