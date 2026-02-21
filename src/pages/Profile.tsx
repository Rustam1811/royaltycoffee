import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PencilIcon,
  GlobeAltIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { EditProfileModal } from '../components/EditProfileModal';
import { useAuth } from '../auth/AuthContext';
import { RoyalLayout } from '../components/RoyalLayout';

/* ─── constants ─── */
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=300&h=300&q=80';
const MANAGER_PHONE = '77075553322'; // номер менеджера

const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
] as const;

/* ─── Legal pages content ─── */
const legalPages = {
  offer: {
    title: 'Публичная оферта',
    content: `ПУБЛИЧНАЯ ОФЕРТА
о предоставлении услуг общественного питания

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Настоящий документ является официальным предложением (публичной офертой) компании Royal Coffee (далее — «Компания») и содержит все существенные условия предоставления услуг общественного питания.
1.2. В соответствии с пунктом 2 статьи 395 Гражданского кодекса Республики Казахстан, в случае принятия изложенных ниже условий, лицо, акцептовавшее оферту, становится Заказчиком.
1.3. Акцептом оферты является оформление заказа через мобильное приложение или на кассе заведения.

2. ПРЕДМЕТ ОФЕРТЫ
2.1. Компания обязуется предоставить Заказчику услуги общественного питания, а Заказчик обязуется оплатить эти услуги.
2.2. Ассортимент, описание и стоимость продукции представлены в меню приложения.

3. ОПЛАТА
3.1. Оплата производится в тенге (₸) наличными, банковской картой или бонусами.
3.2. Цены могут быть изменены Компанией в одностороннем порядке без предварительного уведомления.

4. ОТВЕТСТВЕННОСТЬ
4.1. Компания гарантирует качество продукции в соответствии с законодательством РК.
4.2. Компания не несёт ответственности за ненадлежащее использование приложения Заказчиком.

5. ПРОЧИЕ УСЛОВИЯ
5.1. Компания вправе в одностороннем порядке изменять условия настоящей оферты.
5.2. Все споры решаются путём переговоров, а при невозможности — в судебном порядке по законодательству РК.`,
  },
  privacy: {
    title: 'Политика конфиденциальности',
    content: `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
Royal Coffee

Дата вступления в силу: 1 января 2025 г.

1. СБОР ИНФОРМАЦИИ
1.1. Мы собираем следующие персональные данные:
— Имя, номер телефона, email (при регистрации)
— История заказов и предпочтения
— Данные геолокации (с вашего согласия) для определения ближайшей точки

2. ИСПОЛЬЗОВАНИЕ ИНФОРМАЦИИ
2.1. Персональные данные используются для:
— Обработки и выполнения заказов
— Начисления бонусов и кешбэка
— Отправки уведомлений о статусе заказа
— Персонализации предложений и акций
— Улучшения качества обслуживания

3. ЗАЩИТА ДАННЫХ
3.1. Мы применяем современные технические и организационные меры для защиты персональных данных.
3.2. Данные хранятся на защищённых серверах Firebase (Google Cloud).
3.3. Доступ к персональным данным имеют только уполномоченные сотрудники.

4. ПЕРЕДАЧА ДАННЫХ ТРЕТЬИМ ЛИЦАМ
4.1. Мы не продаём и не передаём персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством РК.

5. ПРАВА ПОЛЬЗОВАТЕЛЯ
5.1. Вы вправе запросить удаление своих персональных данных, обратившись к менеджеру.
5.2. Вы можете отказаться от получения уведомлений в настройках приложения.

6. КОНТАКТЫ
По вопросам конфиденциальности обращайтесь к менеджеру через WhatsApp или Telegram.`,
  },
  bonus: {
    title: 'Правила бонусной системы',
    content: `ПРАВИЛА БОНУСНОЙ СИСТЕМЫ
Royal Coffee

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Бонусная система действует для всех зарегистрированных пользователей приложения Royal Coffee.
1.2. Бонусы начисляются автоматически при каждом заказе.

2. УРОВНИ И КЕШБЭК
Уровень определяется общей суммой покупок:

  Бронза — от 0 ₸ — кешбэк 5%
  Серебро — от 5 000 ₸ — кешбэк 10%
  Золото — от 15 000 ₸ — кешбэк 15%
  Платинум — от 25 000 ₸ — кешбэк 20%

3. НАЧИСЛЕНИЕ БОНУСОВ
3.1. Бонусы начисляются в размере текущего процента кешбэка от суммы заказа.
3.2. Начисление происходит автоматически после оплаты заказа.
3.3. Бонусы доступны для списания сразу после начисления.

4. СПИСАНИЕ БОНУСОВ
4.1. Бонусами можно оплатить до 100% стоимости заказа.
4.2. 1 бонус = 1 ₸.

5. СГОРАНИЕ БОНУСОВ
5.1. Бонусы не сгорают при регулярном использовании приложения.
5.2. При отсутствии активности более 6 месяцев Компания вправе аннулировать накопленные бонусы.

6. ПРОЧИЕ УСЛОВИЯ
6.1. Компания вправе изменять условия бонусной программы с уведомлением через приложение.
6.2. Бонусы не подлежат обмену на денежные средства.`,
  },
  terms: {
    title: 'Условия использования',
    content: `УСЛОВИЯ ИСПОЛЬЗОВАНИЯ МОБИЛЬНОГО ПРИЛОЖЕНИЯ
Royal Coffee

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Настоящие Условия регулируют использование мобильного приложения Royal Coffee.
1.2. Используя приложение, вы соглашаетесь с настоящими Условиями.

2. РЕГИСТРАЦИЯ
2.1. Для использования приложения необходимо пройти регистрацию по номеру телефона.
2.2. Вы несёте ответственность за сохранность учётных данных.

3. ИСПОЛЬЗОВАНИЕ ПРИЛОЖЕНИЯ
3.1. Приложение предназначено для:
— Просмотра меню и оформления заказов
— Участия в бонусной программе
— Получения персональных предложений и акций
— Отслеживания истории заказов

4. ОГРАНИЧЕНИЯ
4.1. Запрещено использовать приложение для любых незаконных целей.
4.2. Запрещено попытки несанкционированного доступа к системе.
4.3. Запрещено создание множественных аккаунтов.

5. ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ
5.1. Все права на приложение, дизайн, контент и товарные знаки принадлежат компании Royal Coffee.

6. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ
6.1. Приложение предоставляется «как есть».
6.2. Компания не гарантирует бесперебойную работу приложения.
6.3. Компания не несёт ответственности за убытки, связанные с использованием приложения.

7. ИЗМЕНЕНИЕ УСЛОВИЙ
7.1. Компания вправе изменять настоящие Условия в любое время.
7.2. Продолжение использования приложения после изменений означает согласие с новыми Условиями.

8. ПРИМЕНИМОЕ ПРАВО
8.1. Настоящие Условия регулируются законодательством Республики Казахстан.`,
  },
} as const;

type LegalKey = keyof typeof legalPages;

/* ─── Menu item component ─── */
interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, label, sublabel, onClick, danger }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.14] active:scale-[0.98] transition-all"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-white/10'}`}>
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
      {sublabel && <p className="text-xs text-white/50 mt-0.5">{sublabel}</p>}
    </div>
    <ChevronRightIcon className={`w-4 h-4 ${danger ? 'text-red-400/50' : 'text-white/30'}`} />
  </button>
);

/* ─── Legal Bottom Sheet ─── */
const LegalSheet: React.FC<{ page: LegalKey | null; onClose: () => void }> = ({ page, onClose }) => (
  <AnimatePresence>
    {page && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{legalPages[page].title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
            <pre className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
              {legalPages[page].content}
            </pre>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

/* ─── Language Sheet ─── */
const LanguageSheet: React.FC<{ open: boolean; current: string; onChange: (code: string) => void; onClose: () => void }> = ({
  open, current, onChange, onClose,
}) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 bg-[#1a1a1a] rounded-t-3xl border-t border-white/10"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Язык приложения</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <div className="p-4 space-y-2 pb-8">
            {LANGUAGES.map((lang) => {
              const active = current === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => { onChange(lang.code); onClose(); }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                    active ? 'bg-[#D4AF37]/20 ring-1 ring-[#D4AF37]/40' : 'bg-white/[0.06] hover:bg-white/[0.12]'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`flex-1 text-left text-sm font-medium ${active ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {lang.label}
                  </span>
                  {active && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

/* ═══════════════════════════ PAGE ═══════════════════════════ */
const ProfilePage: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, signOut, updateProfile } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalKey | null>(null);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'Русский';

  return (
    <RoyalLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/40 backdrop-blur-md p-4 border-b border-white/10">
        <h1 className="text-2xl font-extrabold text-white text-center">Профиль</h1>
      </header>

      <main className="p-4 space-y-6 pb-36">
        {/* ─── User card ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-white/[0.08] backdrop-blur-sm rounded-3xl border border-white/10 p-5">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar || DEFAULT_AVATAR}
                alt="Аватар"
                className="w-16 h-16 rounded-full object-cover shadow-lg ring-2 ring-[#D4AF37]/40"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{user?.name || 'Пользователь'}</h2>
                <p className="text-white/50 text-sm mt-0.5 truncate">{user?.phone || 'Нет номера'}</p>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-[#D4AF37] hover:bg-[#C9A632] text-black p-2.5 rounded-xl transition-colors shadow-lg flex-shrink-0"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* ─── Settings ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37]/70 uppercase tracking-[0.15em] mb-3 px-1">Настройки</p>
          <div className="space-y-2">
            <MenuRow
              icon={<GlobeAltIcon className="w-5 h-5 text-white/70" />}
              label="Язык приложения"
              sublabel={currentLangLabel}
              onClick={() => setShowLang(true)}
            />
          </div>
        </motion.section>

        {/* ─── Feedback ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37]/70 uppercase tracking-[0.15em] mb-3 px-1">Обратная связь</p>
          <div className="space-y-2">
            <MenuRow
              icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-green-400" />}
              label="Написать в WhatsApp"
              sublabel="Отзыв или вопрос менеджеру"
              onClick={() => window.open(`https://wa.me/${MANAGER_PHONE}?text=${encodeURIComponent('Здравствуйте! Пишу из приложения Royal Coffee.')}`, '_blank')}
            />
            <MenuRow
              icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-400" />}
              label="Написать в Telegram"
              sublabel="Быстрая связь с менеджером"
              onClick={() => window.open(`https://t.me/+${MANAGER_PHONE}`, '_blank')}
            />
          </div>
        </motion.section>

        {/* ─── Legal ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37]/70 uppercase tracking-[0.15em] mb-3 px-1">Юридическая информация</p>
          <div className="space-y-2">
            <MenuRow
              icon={<DocumentTextIcon className="w-5 h-5 text-white/70" />}
              label="Публичная оферта"
              onClick={() => setLegalPage('offer')}
            />
            <MenuRow
              icon={<ShieldCheckIcon className="w-5 h-5 text-white/70" />}
              label="Политика конфиденциальности"
              onClick={() => setLegalPage('privacy')}
            />
            <MenuRow
              icon={<SparklesIcon className="w-5 h-5 text-[#D4AF37]" />}
              label="Правила бонусной системы"
              onClick={() => setLegalPage('bonus')}
            />
            <MenuRow
              icon={<DevicePhoneMobileIcon className="w-5 h-5 text-white/70" />}
              label="Условия использования"
              onClick={() => setLegalPage('terms')}
            />
          </div>
        </motion.section>

        {/* ─── Sign out ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />
          <div className="space-y-2">
            <MenuRow
              icon={<ArrowRightOnRectangleIcon className="w-5 h-5 text-red-400" />}
              label="Выйти из аккаунта"
              onClick={() => signOut()}
              danger
            />
          </div>
        </motion.section>

        {/* ─── App version ─── */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-white/25">Royal Coffee v1.0</p>
        </div>
      </main>

      {/* Sheets */}
      <LanguageSheet open={showLang} current={i18n.language} onChange={handleLanguageChange} onClose={() => setShowLang(false)} />
      <LegalSheet page={legalPage} onClose={() => setLegalPage(null)} />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={updateProfile}
      />
    </RoyalLayout>
  );
};

export default ProfilePage;