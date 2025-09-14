// api-server/services/admins.js
// Роли админов на основе ENV ADMIN_PHONES
const { toE164 } = require('../lib/phone');

const list = (process.env.ADMIN_PHONES || '')
  .split(',')
  .map(s => toE164((s || '').trim()))
  .filter(Boolean);

/**
 * Проверка: является ли телефон админским
 */
exports.isAdminPhone = (phone) => list.includes(toE164(phone));
