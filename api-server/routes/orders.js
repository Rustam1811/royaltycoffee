const express = require('express');
const path = require('path');

function createOrdersRouter() {
  let legacy;
  try {
    // Правильный путь к legacy файлу orders.js
    const legacyPath = path.resolve(__dirname, '../../api/orders.js');
    legacy = require(legacyPath);
    console.log('✅ Legacy orders.js loaded from:', legacyPath);
  } catch (e) {
    console.error('❌ Cannot load legacy orders.js:', e.message);
    console.error('❌ Attempted path:', path.resolve(__dirname, '../../api/orders.js'));
    
    const r = express.Router();
    r.all('*', (_req, res) => res.status(500).json({ 
      error: 'orders legacy not found',
      details: e.message,
      attemptedPath: path.resolve(__dirname, '../../api/orders.js')
    }));
    return r;
  }

  if (typeof legacy === 'function') {
    const router = express.Router();
    router.all('*', legacy); // пробрасываем всё внутрь
    return router;
  } else {
    return legacy;
  }
}

module.exports = createOrdersRouter();
