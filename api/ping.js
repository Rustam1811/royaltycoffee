const { withCors } = require('./_lib/cors');

module.exports = withCors((_req, res) => {
  return res.status(200).json({ ok: true, timestamp: Date.now() });
});
