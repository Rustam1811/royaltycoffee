// Simple Express-like server for API testing
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import and mount API handlers
function loadHandler(relPath) {
  const p = path.resolve(__dirname, relPath);
  delete require.cache[require.resolve(p)];
  return require(p);
}

app.use('/api/promo', (req, res) => {
  try {
    const handler = loadHandler('api/promo.js');
    return handler.default(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/auth', (req, res) => {
  try {
    const handler = loadHandler('api/auth.js');
    return handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alias without /api for backward compatibility / misconfigured bases
app.use('/auth', (req, res) => {
  try {
    const handler = loadHandler('api/auth.js');
    return handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/bonus', (req, res) => {
  try {
    const handler = loadHandler('api/bonus.js');
    return handler.default(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/orders', (req, res) => {
  try {
    const handler = loadHandler('api/orders-unified.js');
    return handler.default(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/stories', (req, res) => {
  try {
    const handler = loadHandler('api/stories-unified.js');
    return handler.default(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New: users endpoint
app.use('/api/users', (req, res) => {
  try {
    const handler = loadHandler('api/users.js');
    return handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/promo?action=promotions`);
});
