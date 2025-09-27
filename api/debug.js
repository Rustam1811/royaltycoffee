const { withCors } = require('./_lib/cors');
const { ok } = require('./_lib/json');
const { hasCreds, ADMIN_ON, getDb, __debug } = require('./_lib/admin');

module.exports = withCors(async (req, res) => {
  const db = await getDb();
  const dbg = __debug ? __debug() : {};
  ok(res, {
    service: 'api',
    now: Date.now(),
    adminAuthEnabled: ADMIN_ON,
    hasFirebaseCreds: hasCreds(),
    dbReady: !!db,
    initError: dbg.initError || null,
    allowedOrigins: process.env.ALLOWED_ORIGINS || '',
  });
});
