// admin/hooks/useAsyncOperation.ts
// Production-level hook for async operations with AbortController

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAsyncOperationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for handling async operations with automatic cleanup
 * Prevents state updates on unmounted components
 * 
 * @returns Object with execute function, loading state, and error
 */
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  options: UseAsyncOperationOptions = {}
) {
  const { onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (!isMountedRef.current) return;

      // Create new AbortController for this operation
      abortControllerRef.current = new AbortController();

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await asyncFn(...args);
        
        if (isMountedRef.current) {
          setLoading(false);
          onSuccess?.();
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (isMountedRef.current) {
          setError(error);
          setLoading(false);
        }
        
        onError?.(error);
        throw error;
      }
    },
    [asyncFn, onSuccess, onError]
  );

  return { execute, loading, error };
}
