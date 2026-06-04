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
  /** На что распространяется скидка. По умолчанию 'all'. */
  category?: 'drinks' | 'food' | 'all';
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
  comment?: string,
  category: 'drinks' | 'food' | 'all' = 'all'
): Promise<void> {
  if (!uid) throw new Error('uid is required');
  if (!outletId) throw new Error('outletId is required');
  const pct = Math.max(0, Math.min(50, Math.round(Number(percent) || 0)));
  const granter = auth.currentUser?.uid || auth.currentUser?.email || 'unknown';

  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const current: PersonalDiscountsMap = (existing.data()?.personalDiscounts || {}) as PersonalDiscountsMap;

  // Ключ скидки = outletId:category, чтобы можно было хранить отдельно drinks и food для одной точки
  const key = `${outletId}:${category}`;

  const next: PersonalDiscountsMap = {
    ...current,
    [key]: {
      percent: pct,
      grantedBy: granter,
      grantedAt: new Date().toISOString(),
      category,
      ...(comment ? { comment } : {}),
    },
  };

  await updateDoc(userRef, {
    personalDiscounts: next,
    personalDiscountUpdatedAt: serverTimestamp(),
  });
}

/** Снять скидку (key = outletId:category или legacy outletId). */
export async function removeUserDiscount(uid: string, key: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const current: PersonalDiscountsMap = (existing.data()?.personalDiscounts || {}) as PersonalDiscountsMap;
  if (!(key in current)) return;
  const next = { ...current };
  delete next[key];
  await updateDoc(userRef, {
    personalDiscounts: next,
    personalDiscountUpdatedAt: serverTimestamp(),
  });
}

/**
 * Определить персональную скидку клиента в точке для конкретной категории.
 * Ищет в порядке приоритета:
 *   1) outletId:category   (точная скидка на категорию в точке)
 *   2) outletId:all        (общая на точку)
 *   3) *:category          (категория во всех точках)
 *   4) *:all               (всеобщая)
 *   5) outletId / *        (legacy без категории — считаем как 'all')
 */
export function resolveDiscountForOutlet(
  discounts: PersonalDiscountsMap | null | undefined,
  outletId: string | null | undefined,
  category: 'drinks' | 'food' | 'all' = 'all'
): number {
  if (!discounts) return 0;
  const candidates: number[] = [];
  if (outletId) {
    candidates.push(discounts[`${outletId}:${category}`]?.percent || 0);
    candidates.push(discounts[`${outletId}:all`]?.percent || 0);
    candidates.push(discounts[outletId]?.percent || 0); // legacy
  }
  candidates.push(discounts[`*:${category}`]?.percent || 0);
  candidates.push(discounts[`*:all`]?.percent || 0);
  candidates.push(discounts['*']?.percent || 0); // legacy
  return Math.max(0, ...candidates);
}

/**
 * Проверить: должна ли покупка засчитываться в накопительную лояльность?
 * Правило: если в этой точке клиенту уже выдана персональная скидка на напитки
 * (категория drinks или all), то накопления НЕ идут — он и так получает фикс.
 */
export function shouldAccrueDrinks(
  discounts: PersonalDiscountsMap | null | undefined,
  outletId: string | null | undefined
): boolean {
  if (!discounts || !outletId) return true;
  const blocked =
    (discounts[`${outletId}:drinks`]?.percent || 0) > 0 ||
    (discounts[`${outletId}:all`]?.percent || 0) > 0 ||
    (discounts[outletId]?.percent || 0) > 0 || // legacy
    (discounts[`*:drinks`]?.percent || 0) > 0 ||
    (discounts[`*:all`]?.percent || 0) > 0 ||
    (discounts['*']?.percent || 0) > 0;
  return !blocked;
}
