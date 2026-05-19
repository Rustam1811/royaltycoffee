/**
 * useDebounce Hook
 * 
 * Debounces a value to reduce rapid updates.
 * Useful for search inputs, API calls, etc.
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 500)
 * @returns Debounced value
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
