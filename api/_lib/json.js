// Safe async JSON body parser for Node (serverless-friendly)
// Usage: const parseJson = require('./json'); const body = await parseJson(req, res)
// - Returns parsed object
// - On invalid JSON, responds 422 with an error message

module.exports = async function parseJson(req, res) {
  try {
    if (req.body && typeof req.body === 'object') {
      return req.body; // already parsed by framework/middleware
    }

    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', resolve);
      req.on('error', reject);
    });

    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch (e) {
      res.status(422).json({ ok: false, error: 'Invalid JSON', details: e.message });
      return undefined;
    }
  } catch (err) {
    res.status(422).json({ ok: false, error: 'Invalid JSON', details: err.message });
    return undefined;
  }
};
