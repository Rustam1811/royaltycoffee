import { useCallback, useState } from 'react';

export const useToggle = <T extends string>(values: readonly T[], initial?: T) => {
  const fallback = initial && values.includes(initial) ? initial : values[0];
  const [value, setValue] = useState<T>(fallback);

  const handleChange = useCallback(
    (next: T) => {
      if (values.includes(next)) {
        setValue(next);
      }
    },
    [values]
  );

  return {
    value,
    setValue: handleChange
  } as const;
};

