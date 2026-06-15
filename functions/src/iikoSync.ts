/**
 * iiko Cloud API → Firebase синхронизация.
 *
 * Направление: МЫ тянем данные из iiko и кладём в наш Firestore, чтобы
 * админка/приложение работали на привычных коллекциях.
 *
 * Эндпоинты (admin-triggered, защищены тем же x-iiko-secret что и лояльность):
 *   POST /api/iiko-sync/orders     — заказы за период по всем точкам
 *   POST /api/iiko-sync/stoplist   — стоп-лист → пометка недоступности в меню
 *   POST /api/iiko-sync/menu       — номенклатура iiko → наша коллекция menu
 *
 * Каждая ручка проходит по всем настроенным организациям (settings/iikoOrganizations)
 * и резолвит apiLogin через iikoCloud.getAllOrgLogins().
 */

import * as admin from 'firebase-admin';
import { Router, Request, Response } from 'express';
import {
  getAllOrgLogins,
  fetchOrdersByDate,
  fetchStopLists,
  fetchNomenclature,
  IikoApiError,
} from './iikoCloud';

const db = admin.firestore();

// ─── Тот же секрет, что и у внешней лояльности ───
function validateSecret(req: Request): boolean {
  const secret = process.env.IIKO_WEBHOOK_SECRET;
  if (!secret) return true; // не настроен — открыто (настроить перед продом)
  const header = req.headers['x-iiko-secret'] ?? req.headers['authorization'];
  return header === secret || header === `Bearer ${secret}`;
}

// ─── Маппинг iikoOrgId → наш outletId ───
async function loadOrgToOutlet(): Promise<Record<string, string>> {
  const snap = await db.collection('settings').doc('iikoOrganizations').get();
  if (!snap.exists) return {};
  const data = snap.data() as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== '_updatedAt') out[k] = v;
  }
  return out;
}

// ─── Формат даты для iiko: 'yyyy-MM-dd HH:mm:ss.fff' ───
function iikoDate(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

export const iikoSyncRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-sync/orders  { days?: number }
// Тянет заказы за последние N дней (по умолчанию 1) по всем точкам.
// Пишет в коллекцию orders с id = "iiko_<orderId>", source='iiko' — без
// коллизий с заказами приложения. Идемпотентно (merge по id).
// ─────────────────────────────────────────────────────────────────────────────
iikoSyncRouter.post('/orders', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const days = Math.min(31, Math.max(1, Number(req.body?.days) || 1));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const [orgLogins, orgToOutlet] = await Promise.all([getAllOrgLogins(), loadOrgToOutlet()]);
    if (orgLogins.length === 0) {
      return res.status(400).json({ ok: false, error: 'Не настроены организации/apiLogin (settings/iikoMeta)' });
    }

    const results: Array<{ org: string; synced: number; error?: string }> = [];

    for (const { iikoOrgId, apiLogin } of orgLogins) {
      try {
        const orders = await fetchOrdersByDate(apiLogin, iikoOrgId, iikoDate(from), iikoDate(to));
        const outletId = orgToOutlet[iikoOrgId] ?? iikoOrgId;

        let synced = 0;
        // Firestore batch — максимум 500 операций
        for (let i = 0; i < orders.length; i += 450) {
          const slice = orders.slice(i, i + 450);
          const batch = db.batch();
          for (const o of slice) {
            const order = o.order ?? {};
            const ref = db.collection('orders').doc(`iiko_${o.id}`);
            batch.set(ref, {
              source: 'iiko',
              iikoOrderId: o.id,
              iikoOrgId,
              locationId: outletId,
              orderNumber: order.number ?? null,
              orderNumberFormatted: order.number ? `#${order.number}` : `#${o.id.slice(-6)}`,
              customerName: order.customer?.name ?? null,
              customerPhone: order.customer?.phone ?? order.phone ?? null,
              amount: order.sum ?? 0,
              totalPrice: order.sum ?? 0,
              status: mapIikoStatus(order.status ?? o.creationStatus),
              items: (order.items ?? []).map(it => ({
                productId: it.productId ?? null,
                name: it.name ?? '',
                amount: it.amount ?? 1,
                sum: it.sum ?? 0,
              })),
              createdAt: parseIikoTs(order.whenCreated) ?? admin.firestore.FieldValue.serverTimestamp(),
              syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            synced++;
          }
          await batch.commit();
        }
        results.push({ org: iikoOrgId, synced });
      } catch (err) {
        const msg = err instanceof IikoApiError ? err.message : String(err);
        console.error(`[iiko-sync/orders] org ${iikoOrgId}`, msg);
        results.push({ org: iikoOrgId, synced: 0, error: msg });
      }
    }

    const total = results.reduce((s, r) => s + r.synced, 0);
    return res.json({ ok: true, total, period: { from: iikoDate(from), to: iikoDate(to) }, results });
  } catch (err) {
    console.error('[iiko-sync/orders]', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-sync/stoplist
// Тянет стоп-лист и пишет в settings/iikoStopList → { [outletId]: { [productId]: balance } }
// Меню в приложении/админке читает это и помечает позиции недоступными.
// ─────────────────────────────────────────────────────────────────────────────
iikoSyncRouter.post('/stoplist', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const [orgLogins, orgToOutlet] = await Promise.all([getAllOrgLogins(), loadOrgToOutlet()]);
    if (orgLogins.length === 0) {
      return res.status(400).json({ ok: false, error: 'Не настроены организации/apiLogin' });
    }

    // Группируем orgIds по apiLogin (один запрос покрывает несколько орг под одним логином)
    const byLogin = new Map<string, string[]>();
    for (const { iikoOrgId, apiLogin } of orgLogins) {
      const arr = byLogin.get(apiLogin) ?? [];
      arr.push(iikoOrgId);
      byLogin.set(apiLogin, arr);
    }

    const stopByOutlet: Record<string, Record<string, number>> = {};
    const results: Array<{ org: string; stopped: number; error?: string }> = [];

    for (const [apiLogin, orgIds] of byLogin.entries()) {
      try {
        const lists = await fetchStopLists(apiLogin, orgIds);
        for (const entry of lists) {
          const outletId = orgToOutlet[entry.organizationId] ?? entry.organizationId;
          const map: Record<string, number> = {};
          for (const it of entry.items) map[it.productId] = it.balance;
          stopByOutlet[outletId] = map;
          results.push({ org: entry.organizationId, stopped: entry.items.length });
        }
      } catch (err) {
        const msg = err instanceof IikoApiError ? err.message : String(err);
        console.error('[iiko-sync/stoplist]', msg);
        for (const o of orgIds) results.push({ org: o, stopped: 0, error: msg });
      }
    }

    await db.collection('settings').doc('iikoStopList').set({
      byOutlet: stopByOutlet,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, outlets: Object.keys(stopByOutlet).length, results });
  } catch (err) {
    console.error('[iiko-sync/stoplist]', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/iiko-sync/menu  { orgId?: string }
// Тянет номенклатуру. По умолчанию — первая настроенная орг (меню обычно
// единое для сети). Пишет в settings/iikoMenu (сырой снимок) для маппинга.
// ─────────────────────────────────────────────────────────────────────────────
iikoSyncRouter.post('/menu', async (req: Request, res: Response) => {
  if (!validateSecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const orgLogins = await getAllOrgLogins();
    if (orgLogins.length === 0) {
      return res.status(400).json({ ok: false, error: 'Не настроены организации/apiLogin' });
    }

    const target = req.body?.orgId
      ? orgLogins.find(o => o.iikoOrgId === req.body.orgId)
      : orgLogins[0];
    if (!target) return res.status(404).json({ ok: false, error: 'Организация не найдена' });

    const nom = await fetchNomenclature(target.apiLogin, target.iikoOrgId);

    const products = (nom.products ?? [])
      .filter(p => !p.isDeleted)
      .map(p => ({
        iikoId: p.id,
        name: p.name,
        groupId: p.parentGroup ?? null,
        price: p.price ?? p.sizePrices?.[0]?.price?.currentPrice ?? 0,
        image: p.imageLinks?.[0] ?? null,
        type: p.type ?? null,
      }));

    const groups = (nom.groups ?? [])
      .filter(g => !g.isDeleted)
      .map(g => ({ iikoId: g.id, name: g.name, parentId: g.parentGroup ?? null }));

    // Снимок храним в settings/iikoMenu (большие меню — отдельная стратегия позже)
    await db.collection('settings').doc('iikoMenu').set({
      orgId: target.iikoOrgId,
      groups,
      products,
      productCount: products.length,
      revision: nom.revision ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, orgId: target.iikoOrgId, groups: groups.length, products: products.length });
  } catch (err) {
    console.error('[iiko-sync/menu]', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── Хелперы ───
function mapIikoStatus(status?: string): string {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s.includes('closed') || s.includes('delivered') || s === 'success') return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('cook') || s.includes('progress') || s.includes('onway')) return 'processing';
  return 'pending';
}

function parseIikoTs(ts?: string): Date | null {
  if (!ts) return null;
  const d = new Date(ts.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
