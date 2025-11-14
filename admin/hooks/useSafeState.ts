import { useCallback, useEffect, useRef, useState } from "react";

/**
 * React state hook that automatically ignores updates after the host component unmounts.
 * Prevents "setState on unmounted component" warnings without sprinkling isMounted flags everywhere.
 */
export function useSafeState<T>(initialValue: T) {
  const isMountedRef = useRef(false);
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    (value: React.SetStateAction<T>) => {
      if (isMountedRef.current) {
        setState(value);
      }
    },
    []
  );

  return [state, safeSetState] as const;
}
