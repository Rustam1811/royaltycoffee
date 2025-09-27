const { withCors } = require('./_lib/cors');
const { ok, fail } = require('./_lib/json');
const { getDb, requireAdminRole, ADMIN_ON } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  try {
    await requireAdminRole(req);
    if (res.writableEnded) return;
    const db = await getDb();
    if (!db) return ok(res, { today: { ordersCount: 0, revenue: 0, avgCheck: 0 }, week: { ordersCount: 0, revenue: 0, avgCheck: 0 }, month: { ordersCount: 0, revenue: 0, avgCheck: 0 } });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayNum = (startOfDay.getDay() + 6) % 7; // Mon=0
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - dayNum);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all since start of month and aggregate locally for day/week/month
    const snap = await db.collection('orders').where('createdAt', '>=', startOfMonth).get();
    const bucket = { today: { orders: 0, revenue: 0 }, week: { orders: 0, revenue: 0 }, month: { orders: 0, revenue: 0 } };
    snap.forEach(d => {
      const x = d.data();
      const dt = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : new Date(x.createdAt);
      const rev = Number(x.total || 0);
      if (dt >= startOfMonth) { bucket.month.orders += 1; bucket.month.revenue += rev; }
      if (dt >= startOfWeek)  { bucket.week.orders  += 1; bucket.week.revenue  += rev; }
      if (dt >= startOfDay)   { bucket.today.orders += 1; bucket.today.revenue += rev; }
    });

    const fmt = (x) => ({ ordersCount: x.orders, revenue: x.revenue, avgCheck: x.orders ? +(x.revenue / x.orders).toFixed(2) : 0 });
    return ok(res, { today: fmt(bucket.today), week: fmt(bucket.week), month: fmt(bucket.month) });
  } catch (e) { return fail(res, e, e.code === 'ENV_MISSING' ? 500 : 500); }
});
