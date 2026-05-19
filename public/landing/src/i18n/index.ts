import { createContext, useContext } from 'react';
import { ru } from './ru';
import { en } from './en';
import { kz } from './kz';

export type Language = 'ru' | 'en' | 'kz';

export const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
];

export type Translations = typeof ru;

export const translations: Record<Language, Translations> = { ru, en, kz };

export interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
