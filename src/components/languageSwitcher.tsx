import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => i18n.changeLanguage('ru')}
        className={`p-2 rounded ${i18n.language === 'ru' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Рус
      </button>
      <button
        onClick={() => i18n.changeLanguage('kz')}
        className={`p-2 rounded ${i18n.language === 'kz' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Каз
      </button>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`p-2 rounded ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Eng
      </button>
    </div>
  );
};

export default LanguageSwitcher;
