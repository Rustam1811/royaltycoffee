// api-server/services/whatsapp.js
// Отправка OTP через WhatsApp Cloud API или мок в dev
const _fetch = typeof fetch === 'function' ? fetch : (...args) => import('node-fetch').then(m => m.default(...args));

exports.sendOtpWhatsApp = async function sendOtpWhatsApp(e164, code) {
  const mode = (process.env.WHATSAPP_MODE || 'MOCK').toUpperCase();
  const mock = mode === 'MOCK' || process.env.MOCK_OTP === '1';
  if (mock) {
    console.log(`📨 [MOCK OTP] Для ${e164}: ${code}`);
    return true;
  }

  if (mode === 'CLOUD_API') {
    const phoneId = process.env.WA_PHONE_NUMBER_ID;
    const token = process.env.WA_ACCESS_TOKEN;
    if (!phoneId || !token) throw new Error('Missing WA_PHONE_NUMBER_ID/WA_ACCESS_TOKEN');

    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to: e164.replace('+',''),
      type: 'text',
      text: { body: `Код подтверждения: ${code}` },
    };
    const r = await _fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`WhatsApp API error: ${t}`);
    }
    return true;
  }

  throw new Error('Invalid WHATSAPP_MODE');
};
