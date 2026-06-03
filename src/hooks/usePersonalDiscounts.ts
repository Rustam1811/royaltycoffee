/**
 * usePersonalDiscounts — клиентский хук для чтения персональных скидок текущего юзера.
 *
 * Структура `users/{uid}.personalDiscounts`:
 *   { [outletId|'*']: { percent, grantedBy, grantedAt, comment? } }
 */

import { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface PersonalDiscountEntry {
  percent: number;
  grantedBy: string;
  grantedAt: string;
  comment?: string;
}

export type PersonalDiscountsMap = Record<string, PersonalDiscountEntry>;

/** Подписка на персональные скидки текущего залогиненного юзера. */
export function usePersonalDiscounts(): {
  discounts: PersonalDiscountsMap;
  maxPercent: number;
  loading: boolean;
} {
  const [discounts, setDiscounts] = useState<PersonalDiscountsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        setDiscounts((data?.personalDiscounts || {}) as PersonalDiscountsMap);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const maxPercent = Object.values(discounts).reduce(
    (max, entry) => Math.max(max, entry?.percent || 0),
    0
  );

  return { discounts, maxPercent, loading };
}
