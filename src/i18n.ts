import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Re-add static JSON imports so translations guaranteed to be present at init time
import ru from './pages/menu/locales/ru.json';
import en from './pages/menu/locales/en.json';
import kz from './pages/menu/locales/kz.json';

// Remove http backend (keep code minimal & deterministic)

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
      console.log('[i18n] Loaded. Sample:', i18n.t('menu.espresso.name'));
    });
}

export default i18n;
