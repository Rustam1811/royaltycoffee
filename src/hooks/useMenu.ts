/**
 * useMenu Hook - загрузка меню из Firestore с кешированием
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  loadFullMenu, 
  clearMenuCache,
  PremiumMenuItem, 
  PremiumCategory 
} from '../services/menu';

interface MenuData {
  items: PremiumMenuItem[];
  categories: PremiumCategory[];
}

interface UseMenuResult {
  drinks: MenuData;
  food: MenuData;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMenu(lang: string = 'ru'): UseMenuResult {
  const [drinks, setDrinks] = useState<MenuData>({ items: [], categories: [] });
  const [food, setFood] = useState<MenuData>({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await loadFullMenu(lang);
      setDrinks(data.drinks);
      setFood(data.food);
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Не удалось загрузить меню');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const refresh = useCallback(() => {
    clearMenuCache();
    fetchMenu();
  }, [fetchMenu]);

  return { drinks, food, loading, error, refresh };
}
