import React, { useMemo } from 'react';
import { drinkCategories } from '../menu/data/drinksData';
import { PremiumMenu } from '../../features/menu/premium/PremiumMenu';
import { useTranslation } from 'react-i18next';

export default function Drinks() {
  const { t } = useTranslation();
  
  const items = useMemo(
    () =>
      drinkCategories.flatMap(cat =>
        cat.products.map(p => ({
          id: p.id,
          name: t(p.name),
          price: p.price,
          image: p.image,
          energy: p.energy,
          protein: p.protein,
          fat: p.fat,
          carbs: p.carbs,
          badges: p.badges?.map(b => ({ type: b, label: b })) || [],
          categoryId: cat.id,
        })),
      ),
    [t],
  );
  const categories = useMemo(
    () => drinkCategories.map(c => ({ key: String(c.id), label: t(c.title) })),
    [t],
  );
  return <PremiumMenu items={items} categories={categories} />;
}