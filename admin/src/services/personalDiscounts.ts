/**
 * Personal Discounts service
 *
 * Сохраняет персональные скидки клиента в Firestore по точкам.
 *
 * Структура `users/{uid}.personalDiscounts`:
 *   { [outletId]: { percent: number, grantedBy: string, grantedAt: ISO, comment?: string } }
 *   ключ '*' — действует на всех точках.
 *
 * Доступ к записи защищён firestore.rules: разрешено super_owner / owner / admin / barista.
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export interface PersonalDiscountEntry {
  percent: number;
  grantedBy: string;
  grantedAt: string;
  comment?: string;
}

export type PersonalDiscountsMap = Record<string, PersonalDiscountEntry>;

/** Получить все персональные скидки юзера. */
export async function getUserDiscounts(uid: string): Promise<PersonalDiscountsMap> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  const data = snap.data();
  return (data.personalDiscounts || {}) as PersonalDiscountsMap;
}

/**
 * Назначить (или перезаписать) персональную скидку клиенту для одной точки.
 *
 * @param uid          UID клиента
 * @param outletId     ID точки. Передайте '*' для всех точек.
 * @param percent      Процент скидки (0–50)
 * @param comment      Опциональный комментарий
 */
export async function setUserDiscount(
  uid: string,
  outletId: string,
  percent: number,
  comment?: string
): Promise<void> {
  if (!uid) throw new Error('uid is required');
  if (!outletId) throw new Error('outletId is required');
  const pct = Math.max(0, Math.min(50, Math.round(Number(percent) || 0)));
  const granter = auth.currentUser?.uid || auth.currentUser?.email || 'unknown';

  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const current: PersonalDiscountsMap = (existing.data()?.personalDiscounts || {}) as PersonalDiscountsMap;

  const next: PersonalDiscountsMap = {
    ...current,
    [outletId]: {
      percent: pct,
      grantedBy: granter,
      grantedAt: new Date().toISOString(),
      ...(comment ? { comment } : {}),
    },
  };

  await updateDoc(userRef, {
    personalDiscounts: next,
    personalDiscountUpdatedAt: serverTimestamp(),
  });
}

/** Снять скидку с одной точки (или со всех при outletId='*'). */
export async function removeUserDiscount(uid: string, outletId: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const current: PersonalDiscountsMap = (existing.data()?.personalDiscounts || {}) as PersonalDiscountsMap;
  if (!(outletId in current)) return;
  const next = { ...current };
  delete next[outletId];
  await updateDoc(userRef, {
    personalDiscounts: next,
    personalDiscountUpdatedAt: serverTimestamp(),
  });
}

/** Определить итоговую персональную скидку клиента в конкретной точке. */
export function resolveDiscountForOutlet(
  discounts: PersonalDiscountsMap | null | undefined,
  outletId: string | null | undefined
): number {
  if (!discounts) return 0;
  const direct = outletId ? discounts[outletId]?.percent : undefined;
  const allOutlets = discounts['*']?.percent;
  return Math.max(direct || 0, allOutlets || 0);
}
