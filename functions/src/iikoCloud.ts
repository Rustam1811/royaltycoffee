/**
 * iiko Cloud API client (api-ru.iiko.services).
 *
 * Направление: МЫ → iiko. Используется для синхронизации заказов, меню,
 * стоп-листа, аналитики и смен персонала.
 *
 * Авторизация: POST /api/1/access_token { apiLogin } → { token }.
 * Токен живёт ~1 час; кэшируем в памяти инстанса с запасом.
 *
 * Конфигурация ключей хранится в Firestore: settings/iikoMeta
 *   {
 *     apiLogin: "<chain-wide default apiLogin>",   // опционально
 *     apiLogins: { [iikoOrgId]: "<apiLogin>" },     // опционально, override на точку
 *   }
 * Если у сети один аккаунт iiko на все 13 точек — достаточно поля apiLogin.
 * Если у каждой точки свой логин — заполняется apiLogins по orgId.
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

const IIKO_BASE = 'https://api-ru.iiko.services';
const TOKEN_TTL_MS = 55 * 60 * 1000; // токен живёт ~60 мин, обновляем за 5 мин до

// ─── In-memory token cache (per apiLogin, per warm instance) ───
interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

export class IikoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'IikoApiError';
  }
}

/** Получить (с кэшем) access token для apiLogin. */
export async function getAccessToken(apiLogin: string): Promise<string> {
  const cached = tokenCache.get(apiLogin);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const res = await fetch(`${IIKO_BASE}/api/1/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiLogin }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new IikoApiError(
      `access_token failed: ${res.status} ${text}`,
      res.status,
      '/api/1/access_token',
    );
  }

  const data = (await res.json()) as { token: string };
  if (!data.token) {
    throw new IikoApiError('access_token: empty token', 502, '/api/1/access_token', data);
  }

  tokenCache.set(apiLogin, { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return data.token;
}

/**
 * Базовый запрос к iiko Cloud API.
 * При 401 (протух токен) — один автоматический ретрай с новым токеном.
 */
export async function iikoRequest<T = unknown>(
  apiLogin: string,
  path: string,
  body: Record<string, unknown> = {},
  retryOn401 = true,
): Promise<T> {
  const token = await getAccessToken(apiLogin);

  const res = await fetch(`${IIKO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 && retryOn401) {
    tokenCache.delete(apiLogin); // выкинуть протухший
    return iikoRequest<T>(apiLogin, path, body, false);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new IikoApiError(`${path} failed: ${res.status} ${text}`, res.status, path, text);
  }

  return (await res.json()) as T;
}

// ─── Загрузка apiLogin из настроек ───
interface IikoMeta {
  apiLogin?: string;
  apiLogins?: Record<string, string>;
}

let metaCache: { data: IikoMeta; expiresAt: number } | null = null;
const META_TTL_MS = 60 * 1000; // 1 мин — настройки меняются редко

async function loadMeta(): Promise<IikoMeta> {
  if (metaCache && metaCache.expiresAt > Date.now()) return metaCache.data;
  const snap = await db.collection('settings').doc('iikoMeta').get();
  const data = (snap.exists ? snap.data() : {}) as IikoMeta;
  metaCache = { data, expiresAt: Date.now() + META_TTL_MS };
  return data;
}

/**
 * Вернуть apiLogin для конкретной организации iiko.
 * Приоритет: per-org override → chain-wide default.
 */
export async function getApiLoginForOrg(iikoOrgId: string): Promise<string> {
  const meta = await loadMeta();
  const login = meta.apiLogins?.[iikoOrgId] || meta.apiLogin;
  if (!login) {
    throw new IikoApiError(
      `No apiLogin configured for org ${iikoOrgId} (settings/iikoMeta)`,
      400,
      'config',
    );
  }
  return login;
}

/** Список всех настроенных пар (iikoOrgId, apiLogin) для прохода по всем точкам. */
export async function getAllOrgLogins(): Promise<Array<{ iikoOrgId: string; apiLogin: string }>> {
  const [meta, mappingSnap] = await Promise.all([
    loadMeta(),
    db.collection('settings').doc('iikoOrganizations').get(),
  ]);

  const mapping = (mappingSnap.exists ? mappingSnap.data() : {}) as Record<string, unknown>;
  const orgIds = Object.keys(mapping).filter(k => k !== '_updatedAt');

  // Если маппинг точек ещё не заполнен — берём ключи из apiLogins
  const fromLogins = meta.apiLogins ? Object.keys(meta.apiLogins) : [];
  const allOrgIds = Array.from(new Set([...orgIds, ...fromLogins]));

  return allOrgIds
    .map(iikoOrgId => {
      const apiLogin = meta.apiLogins?.[iikoOrgId] || meta.apiLogin || '';
      return { iikoOrgId, apiLogin };
    })
    .filter(x => x.apiLogin);
}

// ─────────────────────────────────────────────────────────────────────────────
// Типизированные методы Cloud API
// ─────────────────────────────────────────────────────────────────────────────

export interface IikoOrganization {
  id: string;
  name: string;
}

/** Список организаций, доступных под данным apiLogin. */
export async function fetchOrganizations(apiLogin: string): Promise<IikoOrganization[]> {
  const data = await iikoRequest<{ organizations: IikoOrganization[] }>(
    apiLogin,
    '/api/1/organizations',
    { returnAdditionalInfo: false, includeDisabled: false },
  );
  return data.organizations ?? [];
}

export interface IikoNomenclature {
  groups: Array<{ id: string; name: string; parentGroup?: string | null; isDeleted?: boolean }>;
  products: Array<{
    id: string;
    name: string;
    parentGroup?: string | null;
    price?: number;
    sizePrices?: Array<{ price?: { currentPrice?: number } }>;
    isDeleted?: boolean;
    imageLinks?: string[];
    productCategoryId?: string | null;
    type?: string;
  }>;
  revision?: number;
}

/** Номенклатура (меню) организации. */
export async function fetchNomenclature(
  apiLogin: string,
  organizationId: string,
): Promise<IikoNomenclature> {
  return iikoRequest<IikoNomenclature>(apiLogin, '/api/1/nomenclature', {
    organizationId,
    startRevision: 0,
  });
}

export interface IikoStopListItem {
  organizationId: string;
  items: Array<{ balance: number; productId: string; sku?: string }>;
}

/** Стоп-лист (нет в наличии) по организациям. */
export async function fetchStopLists(
  apiLogin: string,
  organizationIds: string[],
): Promise<IikoStopListItem[]> {
  const data = await iikoRequest<{ terminalGroupStopLists: Array<{ organizationId: string; items: Array<{ productId: string; balance: number; sku?: string }> }> }>(
    apiLogin,
    '/api/1/stop_lists',
    { organizationIds },
  );
  // iiko группирует стоп-листы по терминальным группам — схлопываем в плоский список по организации
  const byOrg = new Map<string, Map<string, number>>();
  for (const tg of data.terminalGroupStopLists ?? []) {
    const m = byOrg.get(tg.organizationId) ?? new Map<string, number>();
    for (const it of tg.items ?? []) {
      // если товар встречается в нескольких терминалах — берём минимальный баланс
      const prev = m.get(it.productId);
      m.set(it.productId, prev == null ? it.balance : Math.min(prev, it.balance));
    }
    byOrg.set(tg.organizationId, m);
  }
  return Array.from(byOrg.entries()).map(([organizationId, m]) => ({
    organizationId,
    items: Array.from(m.entries()).map(([productId, balance]) => ({ productId, balance })),
  }));
}

export interface IikoDeliveryOrder {
  id: string;
  externalNumber?: string;
  organizationId?: string;
  creationStatus?: string;
  order?: {
    sum?: number;
    number?: number;
    completeBefore?: string;
    whenCreated?: string;
    status?: string;
    items?: Array<{ productId?: string; name?: string; amount?: number; sum?: number }>;
    customer?: { name?: string; phone?: string };
    phone?: string;
  };
}

/**
 * Заказы организации за период (по дате создания).
 * dateFrom/dateTo в формате 'yyyy-MM-dd HH:mm:ss.fff'.
 */
export async function fetchOrdersByDate(
  apiLogin: string,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<IikoDeliveryOrder[]> {
  const data = await iikoRequest<{ ordersByOrganizations: Array<{ organizationId: string; orders: IikoDeliveryOrder[] }> }>(
    apiLogin,
    '/api/1/deliveries/by_delivery_date_and_status',
    {
      organizationIds: [organizationId],
      deliveryDateFrom: dateFrom,
      deliveryDateTo: dateTo,
    },
  );
  const flat: IikoDeliveryOrder[] = [];
  for (const group of data.ordersByOrganizations ?? []) {
    for (const o of group.orders ?? []) {
      flat.push({ ...o, organizationId: group.organizationId });
    }
  }
  return flat;
}

/**
 * OLAP-отчёт (аналитика выручки/чеков).
 * Возвращает сырой ответ iiko — агрегацию делаем на стороне вызова.
 */
export async function fetchOlapReport(
  apiLogin: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return iikoRequest(apiLogin, '/api/2/reports/olap', body);
}
