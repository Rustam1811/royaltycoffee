const { withCors } = require('./_lib/cors');
module.exports = withCors((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, name: 'health' }));
});
