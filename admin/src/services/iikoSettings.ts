import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface IikoOrganization {
  iikoOrgId: string;   // UUID из iiko
  outletId: string;    // наш Firestore location id
  outletName: string;  // человекочитаемое название (для отображения)
  note?: string;
  apiLogin?: string;   // apiLogin Cloud API для этой точки (если у каждой свой)
}

export interface IikoSettings {
  organizations: IikoOrganization[];
  webhookSecret?: string;
  apiLogin?: string;   // общий apiLogin на всю сеть (если аккаунт один)
  updatedAt?: string;
}

const SETTINGS_DOC = () => doc(db, 'settings', 'iikoOrganizations');
const META_DOC    = () => doc(db, 'settings', 'iikoMeta');

/** Загрузить маппинг iiko orgId → outletId */
export async function getIikoSettings(): Promise<IikoSettings> {
  const [mappingSnap, metaSnap] = await Promise.all([
    getDoc(SETTINGS_DOC()),
    getDoc(META_DOC()),
  ]);

  // mappingSnap хранит плоский объект { [iikoOrgId]: outletId }
  // плюс мета: outletNames, notes
  const mappingData = mappingSnap.exists() ? mappingSnap.data() : {};
  const metaData    = metaSnap.exists()    ? metaSnap.data()    : {};

  const orgNames: Record<string, string> = metaData.orgNames ?? {};
  const orgNotes: Record<string, string> = metaData.orgNotes ?? {};
  const outletNamesByOutletId: Record<string, string> = metaData.outletNames ?? {};
  const apiLogins: Record<string, string> = metaData.apiLogins ?? {};

  const organizations: IikoOrganization[] = Object.entries(mappingData)
    .filter(([k]) => k !== '_updatedAt')
    .map(([iikoOrgId, outletId]) => ({
      iikoOrgId,
      outletId: outletId as string,
      outletName: outletNamesByOutletId[outletId as string] ?? (outletId as string),
      note: orgNotes[iikoOrgId],
      apiLogin: apiLogins[iikoOrgId],
    }));

  return {
    organizations,
    webhookSecret: metaData.webhookSecret,
    apiLogin: metaData.apiLogin,
    updatedAt: metaData.updatedAt,
  };
}

/** Сохранить полный маппинг */
export async function saveIikoSettings(
  organizations: IikoOrganization[],
  webhookSecret: string | undefined,
  apiLogin?: string | undefined,
): Promise<void> {
  // Плоский маппинг для Functions: { [iikoOrgId]: outletId }
  const mapping: Record<string, string> = {};
  const orgNames: Record<string, string> = {};
  const orgNotes: Record<string, string> = {};
  const outletNames: Record<string, string> = {};
  const apiLogins: Record<string, string> = {};

  for (const org of organizations) {
    if (!org.iikoOrgId.trim() || !org.outletId.trim()) continue;
    mapping[org.iikoOrgId.trim()]  = org.outletId.trim();
    orgNames[org.iikoOrgId.trim()] = org.outletName;
    if (org.note) orgNotes[org.iikoOrgId.trim()] = org.note;
    if (org.apiLogin?.trim()) apiLogins[org.iikoOrgId.trim()] = org.apiLogin.trim();
    outletNames[org.outletId.trim()] = org.outletName;
  }

  await Promise.all([
    // Документ который читают Functions
    setDoc(SETTINGS_DOC(), { ...mapping, _updatedAt: serverTimestamp() }),
    // Мета для отображения в UI + ключи Cloud API
    setDoc(META_DOC(), {
      orgNames,
      orgNotes,
      outletNames,
      apiLogins,
      apiLogin: apiLogin?.trim() || null,
      webhookSecret: webhookSecret ?? null,
      updatedAt: new Date().toISOString(),
    }),
  ]);
}
