import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { WorkshopSettings } from '@/types';

const SETTINGS_DOC = 'workshop_settings';
const SETTINGS_ID = 'main';

const DEFAULT_SETTINGS: Omit<WorkshopSettings, 'id'> = {
  orderCutoffTime: '17:00',
  minOrderAmount: 0,
  workingDays: [1, 2, 3, 4, 5, 6], // пн-сб
  contactPhone: '',
  contactEmail: '',
  bonusApprovalThreshold: 20000,
  ownOutletIds: [],
  showDeliveryTime: true,
};

/** Получить настройки цеха (создаёт дефолтные если нет) */
export async function getWorkshopSettings(): Promise<WorkshopSettings> {
  const docSnap = await getDoc(doc(db, SETTINGS_DOC, SETTINGS_ID));
  
  if (!docSnap.exists()) {
    // Документ ещё не создан — возвращаем дефолты без записи.
    // Запись сделает админ при первом сохранении настроек.
    return { id: SETTINGS_ID, ...DEFAULT_SETTINGS };
  }
  
  const data = docSnap.data();
  return {
    id: SETTINGS_ID,
    orderCutoffTime: data.orderCutoffTime ?? DEFAULT_SETTINGS.orderCutoffTime,
    minOrderAmount: data.minOrderAmount ?? DEFAULT_SETTINGS.minOrderAmount,
    workingDays: data.workingDays ?? DEFAULT_SETTINGS.workingDays,
    contactPhone: data.contactPhone ?? DEFAULT_SETTINGS.contactPhone,
    contactEmail: data.contactEmail ?? DEFAULT_SETTINGS.contactEmail,
    bonusApprovalThreshold: data.bonusApprovalThreshold ?? DEFAULT_SETTINGS.bonusApprovalThreshold,
    ownOutletIds: data.ownOutletIds ?? DEFAULT_SETTINGS.ownOutletIds,
    showDeliveryTime: data.showDeliveryTime ?? DEFAULT_SETTINGS.showDeliveryTime,
  };
}

/** Обновить настройки цеха */
export async function updateWorkshopSettings(
  updates: Partial<Omit<WorkshopSettings, 'id'>>
): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC, SETTINGS_ID), {
    ...updates,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/** Проверить можно ли сделать заказ сейчас */
export function isOrderingAllowed(cutoffTime: string): { allowed: boolean; message: string } {
  const now = new Date();
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  
  const cutoff = new Date();
  cutoff.setHours(hours, minutes, 0, 0);
  
  if (now > cutoff) {
    return {
      allowed: false,
      message: `Приём заказов закрыт. Заказы принимаются до ${cutoffTime}. Попробуйте завтра.`,
    };
  }
  
  return { allowed: true, message: '' };
}
