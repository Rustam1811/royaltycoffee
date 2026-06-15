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
const MANAGER_PHONE = '77080008777'; // номер менеджера

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
    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-cream-card border border-cream-border hover:bg-cream-muted active:scale-[0.98] transition-all shadow-sm"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-500/15' : 'bg-white/10'}`}>
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
      {sublabel && <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>}
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
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] bg-cream-card rounded-t-3xl border-t border-cream-border flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-cream-border flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{legalPages[page].title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream-skel flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-white/50" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
            <pre className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap font-sans">
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
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-[60] bg-cream-card rounded-t-3xl border-t border-cream-border"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-cream-border">
            <h2 className="text-lg font-bold text-white">Язык приложения</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream-skel flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-white/50" />
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
                    active ? 'bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40' : 'bg-cream-muted border border-cream-border hover:bg-cream-skel'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`flex-1 text-left text-sm font-medium ${active ? 'text-[#D4AF37]' : 'text-white/70'}`}>
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
  const { t, i18n } = useTranslation();
  const { user, signOut, updateProfile, deleteAccount } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalKey | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('Для удаления аккаунта необходимо выйти и снова войти, затем повторить попытку.');
      } else {
        setDeleteError('Не удалось удалить аккаунт. Попробуйте позже.');
      }
      setDeleting(false);
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'Русский';

  return (
    <RoyalLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] px-4 pb-3 pt-safe">
        <h1 className="text-2xl font-extrabold text-white text-center">{t('screen.profile.title')}</h1>
      </header>

      <main className="p-4 space-y-6 pb-36">
        {/* ─── User card ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-cream-card backdrop-blur-sm rounded-3xl border border-cream-border p-5 shadow-royal-sm">
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
          <div className="h-px bg-gradient-to-r from-transparent via-[#3D0A11]/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3 px-1">Настройки</p>
          <div className="space-y-2">
            <MenuRow
              icon={<GlobeAltIcon className="w-5 h-5 text-white/50" />}
              label="Язык приложения"
              sublabel={currentLangLabel}
              onClick={() => setShowLang(true)}
            />
          </div>
        </motion.section>

        {/* ─── Feedback ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-[#3D0A11]/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3 px-1">Обратная связь</p>
          <div className="space-y-2">
            <MenuRow
              icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-green-400" />}
              label="Написать в WhatsApp"
              sublabel="Отзыв или вопрос менеджеру"
              onClick={() => window.open(`https://wa.me/${MANAGER_PHONE}?text=${encodeURIComponent('Здравствуйте! Пишу из приложения Royalty Coffee.')}`, '_blank')}
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
          <div className="h-px bg-gradient-to-r from-transparent via-[#3D0A11]/10 to-transparent mb-5" />
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mb-3 px-1">Юридическая информация</p>
          <div className="space-y-2">
            <MenuRow
              icon={<DocumentTextIcon className="w-5 h-5 text-white/50" />}
              label="Публичная оферта"
              onClick={() => setLegalPage('offer')}
            />
            <MenuRow
              icon={<ShieldCheckIcon className="w-5 h-5 text-white/50" />}
              label="Политика конфиденциальности"
              onClick={() => setLegalPage('privacy')}
            />
            <MenuRow
              icon={<SparklesIcon className="w-5 h-5 text-[#D4AF37]" />}
              label="Правила бонусной системы"
              onClick={() => setLegalPage('bonus')}
            />
            <MenuRow
              icon={<DevicePhoneMobileIcon className="w-5 h-5 text-white/50" />}
              label="Условия использования"
              onClick={() => setLegalPage('terms')}
            />
          </div>
        </motion.section>

        {/* ─── Sign out ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-[#3D0A11]/10 to-transparent mb-5" />
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
          <p className="text-xs text-[#3D0A11]/30">Royalty Coffee v1.0</p>
        </div>

        {/* ─── Danger zone ─── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
          <div className="h-px bg-gradient-to-r from-transparent via-red-900/20 to-transparent mb-5" />
          <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-4">
            <p className="text-xs text-red-400/60 mb-3">Опасная зона</p>
            <MenuRow
              icon={<XMarkIcon className="w-5 h-5 text-red-400" />}
              label="Удалить аккаунт"
              sublabel="Все данные будут удалены безвозвратно"
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </div>
        </motion.section>
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

      {/* Delete Account Confirmation Sheet */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!deleting) { setShowDeleteConfirm(false); setDeleteError(null); } }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #3D0A11 0%, #4D0E16 60%, #5A0D17 100%)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
            >
              <div className="flex flex-col items-center px-6 pt-6 pb-2">
                <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center mb-4">
                  <XMarkIcon className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Удалить аккаунт?</h2>
                <p className="text-sm text-white/60 text-center mb-1">Вы уверены, что хотите удалить аккаунт?</p>
                <p className="text-sm text-red-400/80 text-center mb-6">Все данные, бонусы и история заказов будут удалены безвозвратно.</p>

                {deleteError && (
                  <div className="w-full bg-red-900/40 border border-red-700/40 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-red-300 text-center">{deleteError}</p>
                  </div>
                )}

                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-red-700 active:bg-red-800 disabled:opacity-50 mb-3 transition-all"
                >
                  {deleting ? 'Удаление...' : 'Да, удалить аккаунт'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                  disabled={deleting}
                  className="w-full py-4 rounded-2xl font-bold text-[#D4AF37] bg-white/5 border border-[#D4AF37]/20 active:bg-white/10 disabled:opacity-50 transition-all"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </RoyalLayout>
  );
};

export default ProfilePage;