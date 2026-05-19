const GREETING = 'Здравствуйте! Хочу демо.';

const waNumber = import.meta.env.VITE_WA_NUMBER?.trim() || '87053096206';
const tgUsername = import.meta.env.VITE_TG_USERNAME?.trim() || 'rustmdev';

export const whatsappLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(GREETING)}`;

export const telegramLink = `https://t.me/${tgUsername}`;

export const contactLinks = {
  whatsapp: whatsappLink,
  telegram: telegramLink,
  email: 'care@brewly.app'
};
