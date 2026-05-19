import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Импортируем локали клиента
import ru from '../../src/pages/menu/locales/ru.json';
import en from '../../src/pages/menu/locales/en.json';
import kz from '../../src/pages/menu/locales/kz.json';

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
      console.log('[i18n Admin] Loaded. Sample:', i18n.t('menu.espresso.name'));
    });
}

export default i18n;
