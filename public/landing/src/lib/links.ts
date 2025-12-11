const GREETING = 'Здравствуйте! Хочу демо.';

const waNumber = import.meta.env.VITE_WA_NUMBER?.trim();
const tgUsername = import.meta.env.VITE_TG_USERNAME?.trim();

export const whatsappLink = waNumber
  ? `https://wa.me/${waNumber}?text=${encodeURIComponent(GREETING)}`
  : '#';

export const telegramLink = tgUsername ? `https://t.me/${tgUsername}` : '#';

export const contactLinks = {
  whatsapp: whatsappLink,
  telegram: telegramLink,
  email: 'care@brewly.app'
};
