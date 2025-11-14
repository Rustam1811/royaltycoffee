// admin/hooks/useCategoriesListener.ts
// Production-level hook for listening to categories collection

import { useCallback } from 'react';
import { listenCategories } from '../services/categoryService';
import { DrinkCategoryLocal } from '../types/types';
import { useFirestoreListener } from './useFirestoreListener';

/**
 * Hook that subscribes to Firestore categories collection
 * Automatically handles cleanup and prevents memory leaks
 * 
 * @param enabled - Whether to start listening (default: true)
 * @returns Object with categories, loading state, and error
 */
export function useCategoriesListener(enabled = true) {
  const subscribe = useCallback(
    (callback: (cats: DrinkCategoryLocal[]) => void) => {
      return listenCategories(callback);
    },
    []
  );

  return useFirestoreListener<DrinkCategoryLocal[]>(
    enabled ? subscribe : null,
    {
      onError: (error) => {
        console.error('Categories listener error:', error);
      },
    }
  );
}
