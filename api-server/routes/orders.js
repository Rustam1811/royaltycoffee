const express = require('express');
const path = require('path');

function createOrdersRouter() {
  let legacy;
  try {
    // Используем простую обёртку для разработки
    const legacyPath = path.resolve(__dirname, '../../api/orders-simple.js');
    legacy = require(legacyPath);
    console.log('✅ Simple orders.js loaded from:', legacyPath);
  } catch (e) {
    console.error('❌ Cannot load simple orders.js:', e.message);
    console.error('❌ Attempted path:', path.resolve(__dirname, '../../api/orders-simple.js'));
    
    const r = express.Router();
    r.all('*', (_req, res) => res.status(500).json({ 
      error: 'orders simple not found',
      details: e.message,
      attemptedPath: path.resolve(__dirname, '../../api/orders-simple.js')
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
