// admin/hooks/useFirestoreListener.ts
// Production-level custom hook for Firestore listeners with automatic cleanup

import { useEffect, useRef } from 'react';
import { useSafeState } from './useSafeState';

interface UseFirestoreListenerOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Generic hook for Firestore listeners that handles cleanup automatically
 * Prevents memory leaks and state updates on unmounted components
 * 
 * @param subscribe - Function that returns an unsubscribe function
 * @param options - Configuration options
 * @returns Object with data, loading state, and error
 */
export function useFirestoreListener<T>(
  subscribe: ((callback: (data: T) => void) => (() => void)) | null,
  options: UseFirestoreListenerOptions = {}
) {
  const { enabled = true, onError } = options;
  const [data, setData] = useSafeState<T | null>(null);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!enabled || !subscribe) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return () => {
        isMountedRef.current = false;
      };
    }

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribe((newData) => {
        if (isMountedRef.current) {
          setData(newData);
          setLoading(false);
          setError(null);
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (isMountedRef.current) {
        setError(error);
        setLoading(false);
      }
      onError?.(error);
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe?.();
    };
  }, [subscribe, enabled, onError, setData, setLoading, setError]);

  return { data, loading, error };
}
