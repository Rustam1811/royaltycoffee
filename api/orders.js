const { withCors } = require('./_lib/cors');
module.exports = withCors((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { action = 'get' } = req.query || {};
  if (req.method === 'GET' && action === 'get') {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, orders: [], admin: true }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});
