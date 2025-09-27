const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    const a = req.query?.action || 'orders';
    if (a !== 'orders') return fail(res, 'Invalid action', 400);

    const gran = req.query?.granularity || 'day';
    const fromISO = req.query?.from;
    const toISO = req.query?.to;

    if (!db) return ok(res, { series: [], totals: { orders: 0, revenue: 0 } });

    let q = db.collection('orders');
    if (fromISO) q = q.where('createdAt', '>=', new Date(fromISO));
    if (toISO)   q = q.where('createdAt', '<=', new Date(toISO));
    const snap = await q.get();

    const bucket = {};
    const weekKey = (dt) => {
      const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
      const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
      d.setUTCDate(d.getUTCDate() - day);
      const year = d.getUTCFullYear();
      const onejan = new Date(Date.UTC(year, 0, 1));
      const week = Math.ceil((((d - onejan) / 86400000) + 1) / 7);
      return `${year}-W${String(week).padStart(2, '0')}`;
    };

    snap.forEach(d => {
      const x = d.data();
      const dt = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : new Date(x.createdAt);
      const key = gran === 'month'
        ? `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
        : gran === 'week'
        ? weekKey(dt)
        : dt.toISOString().slice(0, 10);
      bucket[key] ??= { t: key, orders: 0, revenue: 0 };
      bucket[key].orders += 1;
      bucket[key].revenue += Number(x.total || 0);
    });
    const series = Object.values(bucket).sort((a, b) => a.t.localeCompare(b.t));
    const totals = series.reduce((acc, x) => ({ orders: acc.orders + x.orders, revenue: acc.revenue + x.revenue }), { orders: 0, revenue: 0 });
    return ok(res, { series, totals });
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
