const express = require('express');

let moduleExports;
try {
  // Используем простую обёртку для разработки
  const legacy = require('../../api/orders-unified-simple');
  console.log('✅ Simple orders-unified.js loaded');

  if (typeof legacy === 'function') {
    const router = express.Router();
    router.all('*', legacy); // проксируем все методы/пути внутрь обработчика
    moduleExports = router;
  } else {
    moduleExports = legacy;
  }
} catch (e) {
  console.error('❌ Cannot load ../../api/orders-unified-simple:', e.message);
  const r = express.Router();
  r.all('*', (_req, res) => res.status(404).json({ error: 'orders-unified simple not found' }));
  moduleExports = r;
}

module.exports = moduleExports;
