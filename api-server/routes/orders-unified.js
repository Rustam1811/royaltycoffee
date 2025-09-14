const express = require('express');

let moduleExports;
try {
  // Подключаем старый обработчик из репо: ../../api/orders-unified.js
  const legacy = require('../../api/orders-unified');
  console.log('✅ Legacy orders-unified.js loaded');

  if (typeof legacy === 'function') {
    const router = express.Router();
    router.all('*', legacy); // проксируем все методы/пути внутрь обработчика
    moduleExports = router;
  } else {
    moduleExports = legacy;
  }
} catch (e) {
  console.error('❌ Cannot load ../../api/orders-unified:', e.message);
  const r = express.Router();
  r.all('*', (_req, res) => res.status(404).json({ error: 'orders-unified legacy not found' }));
  moduleExports = r;
}

module.exports = moduleExports;
