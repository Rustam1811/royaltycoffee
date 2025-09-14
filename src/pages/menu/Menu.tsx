import React from 'react';
import { drinkCategories } from './data/drinksData';
import { PremiumMenu } from '../../features/menu/premium/PremiumMenu';
import { useTranslation } from 'react-i18next';

const humanize = (key: string) => key.split('.').pop()?.replace(/_/g,' ') || key;

const Menu: React.FC = () => {
  const { t } = useTranslation();
  const flatItems = drinkCategories.flatMap(cat =>
    cat.products.map(p => {
      const rawName = t(p.name);
      const name = rawName === p.name ? humanize(p.name) : rawName;
      return { id: p.id, name, price: p.price, image: p.image, energy: p.energy, protein: p.protein, fat: p.fat, carbs: p.carbs, badges: p.badges?.map(b => ({ type: b, label: b })) || [], categoryId: cat.id };
    }),
  );
  const categories = drinkCategories.map(c => { const raw = t(c.title); const label = raw === c.title ? humanize(c.title) : raw; return { key: String(c.id), label }; });
  return <PremiumMenu items={flatItems} categories={categories} />;
};

export default Menu;
