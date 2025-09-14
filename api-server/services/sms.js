// api-server/services/sms.js
// Simple SMSPM sender wrapper
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const endpoint = process.env.SMSPM_ENDPOINT;
const token = process.env.SMSPM_TOKEN;
const hash  = process.env.SMSPM_HASH;
const from  = process.env.SMSPM_FROM || 'smspm.com';

async function sendSms({ to, text }) {
  if (!endpoint || !token || !hash) {
    throw new Error('SMS provider not configured');
  }
  const toNumber = String(to).replace(/\D/g, '');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, toNumber, text, fromNumber: from, token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`SMS send failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

module.exports = { sendSms };
