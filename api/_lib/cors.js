function wildcardToRegex(pattern) {
  // escape regex special chars except '*', then replace '*' with '.*'
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$');
}

module.exports.withCors = (handler) => (req, res) => {
  const origin = req.headers.origin || '';
  const allow = (process.env.ALLOWED_ORIGINS || '*').trim();
  const list = allow === '*' ? ['*'] : allow.split(',').map(s => s.trim()).filter(Boolean);
  const hasWildcardAll = list.includes('*');

  const isAllowed = (o) => {
    if (!o) return false;
    for (const p of list) {
      if (p === '*') return true;
      if (p.includes('*')) {
        if (wildcardToRegex(p).test(o)) return true;
      } else if (p === o) {
        return true;
      }
    }
    return false;
  };

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (!origin || hasWildcardAll) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 403;
    return res.end(JSON.stringify({ ok: false, error: 'CORS: origin not allowed' }));
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  return handler(req, res);
};
