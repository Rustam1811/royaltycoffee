function ok(res, data = {}) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, ...data }));
}
function fail(res, error, code = 500) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error: String((error && error.message) || error) }));
}
module.exports = { ok, fail };
