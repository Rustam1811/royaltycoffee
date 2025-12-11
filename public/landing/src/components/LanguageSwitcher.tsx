import { useState, useRef, useEffect } from 'react';
import { useI18n, languages, Language } from '@/i18n';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find(l => l.code === lang) || languages[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 hover:bg-white border border-[#E8DDD4] text-sm font-medium text-[#2C1810] transition-all duration-200 shadow-sm hover:shadow"
        aria-label="Change language"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 py-2 bg-white rounded-xl border border-[#E8DDD4] shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setLang(language.code as Language);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 ${
                lang === language.code 
                  ? 'bg-[#FFF8F0] text-[#6B4423] font-medium' 
                  : 'text-[#4A2C2A]/70 hover:bg-[#FFF8F0]/50'
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.label}</span>
              {lang === language.code && (
                <span className="ml-auto text-[#C68B59]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
