import React, { useMemo, useState, memo } from 'react';
import { drinkCategories } from './data/drinksData';
import { foodCategories } from './data/foodData';
import { PremiumMenu } from '../../features/menu/premium/PremiumMenu';
import { useTranslation } from 'react-i18next';

const humanize = (key: string) => key.split('.').pop()?.replace(/_/g,' ') || key;

const Menu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'drinks' | 'food'>('drinks');
  
  const drinksItems = useMemo(() => 
    drinkCategories.flatMap(cat =>
      cat.products.map(p => {
        const rawName = t(p.name);
        const name = rawName === p.name ? humanize(p.name) : rawName;
        return { 
          id: p.id, 
          name, 
          price: p.price, 
          image: p.image, 
          energy: p.energy, 
          protein: p.protein, 
          fat: p.fat, 
          carbs: p.carbs, 
          badges: p.badges?.map(b => ({ type: b, label: b })) || [], 
          categoryId: cat.id 
        };
      })
    ),
    [t]
  );
  
  const drinksCategories = useMemo(() => 
    drinkCategories.map(c => { 
      const raw = t(c.title); 
      const label = raw === c.title ? humanize(c.title) : raw; 
      return { key: String(c.id), label }; 
    }),
    [t]
  );

  const foodItems = useMemo(() => 
    foodCategories.flatMap(cat =>
      cat.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        energy: p.energy,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        badges: p.badges?.map(b => ({ type: b, label: b })) || [],
        categoryId: cat.id
      }))
    ),
    []
  );

  const foodCategoriesFormatted = useMemo(() =>
    foodCategories.map(c => ({
      key: String(c.id),
      label: c.title
    })),
    []
  );

  const changeLang = () => {
    const order: string[] = ['ru','en','kz'];
    const idx = order.indexOf(i18n.language as string);
    const next = order[(idx+1)%order.length];
    i18n.changeLanguage(next);
  };
  
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Header с переключателем Напитки/Еда, Меню и языком */}
      <div className="sticky top-0 z-30 bg-white/90 border-b border-slate-200 px-4 py-2" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          {/* Переключатель Напитки/Еда слева - только иконки */}
          <div className="flex-shrink-0">
            <div className="flex justify-between rounded-full bg-gray-100 p-1 gap-1">
              <button
                onClick={() => setActiveTab('drinks')}
                className={`
                  flex items-center justify-center rounded-full
                  transition-all duration-300 ease-in-out
                  ${activeTab === 'drinks'
                    ? 'bg-white text-black shadow-md w-20 h-14'
                    : 'bg-transparent text-gray-600 hover:text-gray-900 w-14 h-12'
                  }
                `}
              >
                <span className="text-2xl">☕</span>
              </button>
              <button
                onClick={() => setActiveTab('food')}
                className={`
                  flex items-center justify-center rounded-full
                  transition-all duration-300 ease-in-out
                  ${activeTab === 'food'
                    ? 'bg-white text-black shadow-md w-20 h-14'
                    : 'bg-transparent text-gray-600 hover:text-gray-900 w-14 h-12'
                  }
                `}
              >
                <span className="text-2xl">🍔</span>
              </button>
            </div>
          </div>

          {/* Меню по центру */}
          <h1 className="text-lg font-semibold tracking-tight">Меню</h1>

          {/* Кнопка языка справа */}
          <button 
            onClick={changeLang} 
            className="px-3 h-9 rounded-full bg-gray-100 text-sm font-medium active:scale-95 shadow-sm hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {i18n.language.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Контент */}
      {activeTab === 'drinks' ? (
        <PremiumMenu items={drinksItems} categories={drinksCategories} type="drinks" />
      ) : (
        <PremiumMenu items={foodItems} categories={foodCategoriesFormatted} type="food" />
      )}
    </div>
  );
};

export default memo(Menu);
