// src/pages/menu/Eats.tsx
import React, { useMemo } from 'react';
import { eatsCategories } from './data/eatsData';
import { PremiumMenu } from '../../features/menu/premium/PremiumMenu';

export default function Eats() {
  const items = useMemo(
    () =>
      eatsCategories.flatMap(cat =>
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
          categoryId: cat.id,
        })),
      ),
    [],
  );

  const categories = useMemo(
    () => eatsCategories.map(c => ({ key: String(c.id), label: c.title })),
    [],
  );

  return <PremiumMenu items={items} categories={categories} type="food" />;
}