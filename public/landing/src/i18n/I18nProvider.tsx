import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { I18nContext, Language, translations } from './index';

const STORAGE_KEY = 'brewly-lang';

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'ru';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ['ru', 'en', 'kz'].includes(stored)) {
    return stored as Language;
  }
  
  // Detect from browser
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('kk') || browserLang.startsWith('kz')) return 'kz';
  if (browserLang.startsWith('en')) return 'en';
  return 'ru';
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.lang = newLang === 'kz' ? 'kk' : newLang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'kz' ? 'kk' : lang;
  }, [lang]);

  const t = useMemo(() => translations[lang], [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
