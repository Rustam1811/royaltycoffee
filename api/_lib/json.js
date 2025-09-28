function send(res, status, payload) {
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(payload);
  }
  if (!res) return undefined;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
  return undefined;
}

function ok(res, data = {}) {
  return send(res, 200, { ok: true, ...data });
}

function fail(res, error, status = 500) {
  const message = typeof error === 'string' ? error : (error && error.message) || 'Server error';
  return send(res, status, { ok: false, error: message });
}

module.exports = { ok, fail, send };
