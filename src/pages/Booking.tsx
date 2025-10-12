// src/pages/Booking.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  UserIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

// ───────────────────────────────────────────────────────────
// Shared UI (light premium; использует твои утилиты: elev-card, glossy-pill)
const FormLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
    {icon}
    {text}
  </label>
);

const FormInput = ({
  error = null,
  className = '',
  ...props
}: {
  error?: string | null;
  className?: string;
  [key: string]: any;
}) => (
  <input
    {...props}
    className={[
      'w-full h-12 px-3 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all',
      // светлые поверхности + премиум тени/бордеры
      'bg-white border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300',
      'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      error ? 'ring-2 ring-red-400/70 border-transparent' : '',
      className,
    ].join(' ')}
  />
);

const TimeSlotButton = ({
  time,
  isActive,
  onClick,
  disabled,
}: {
  time: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      'h-11 rounded-xl text-[13px] font-semibold transition-all',
      disabled
        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
        : isActive
        ? // активный — как твои «чёрные таблетки»
          'bg-slate-900 text-white border border-slate-900 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]'
        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      'px-4',
    ].join(' ')}
  >
    {time}
  </button>
);

// ───────────────────────────────────────────────────────────
// Helpers
const TIME_SLOTS = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

const toLocalDateInput = (d: Date) => d.toISOString().split('T')[0];

const parseHHMM = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const phoneMask = (raw: string) => {
  // +7 (700) 123-45-67
  const digits = raw.replace(/\D/g, '').replace(/^8/, '7');
  let v = digits;
  if (!v.startsWith('7')) v = '7' + v;
  const p = v.slice(1);
  const a = p.slice(0, 3);
  const b = p.slice(3, 6);
  const c = p.slice(6, 8);
  const d = p.slice(8, 10);
  let out = '+7';
  if (a) out += ` (${a}`;
  if (a?.length === 3) out += ')';
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (d) out += `-${d}`;
  return out;
};

const normalizePhone = (masked: string) => masked.replace(/\D/g, '');

// ───────────────────────────────────────────────────────────
// Page
const Booking: React.FC = () => {
  const [name, setName] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [people, setPeople] = useState(1);

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showThankYou, setShowThankYou] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<null | {
    name: string;
    phone: string;
    date: string;
    time: string;
    people: number;
  }>(null);

  const today = useMemo(() => toLocalDateInput(new Date()), []);
  const phone = useMemo(() => normalizePhone(phoneMasked), [phoneMasked]);

  // Prefill + draft restore
  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const obj = JSON.parse(u);
        if (obj.name) setName(obj.name);
        if (obj.phone) setPhoneMasked(phoneMask(String(obj.phone)));
      }
      const draftRaw = localStorage.getItem('booking:draft');
      if (draftRaw) {
        const d = JSON.parse(draftRaw);
        if (d.name) setName(d.name);
        if (d.phoneMasked) setPhoneMasked(d.phoneMasked);
        if (d.date) setDate(d.date);
        if (d.time) setTime(d.time);
        if (d.people) setPeople(d.people);
      }
    } catch {}
  }, []);

  // Autosave draft
  useEffect(() => {
    const key = 'booking:draft';
    const data = { name, phoneMasked, date, time, people };
    localStorage.setItem(key, JSON.stringify(data));
  }, [name, phoneMasked, date, time, people]);

  const isSlotDisabled = (slot: string) => {
    if (!date) return true; // без даты — недоступно
    const chosen = parseHHMM(slot);
    const now = new Date();
    const isToday = date === toLocalDateInput(now);
    return isToday && chosen.getTime() < now.getTime() - 60 * 1000;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Имя обязательно';
    if (!phone || phone.length < 10) errors.phone = 'Укажите корректный телефон';
    if (!date) errors.date = 'Выберите дату';
    if (!time) errors.time = 'Выберите время';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const payload = {
      name: name.trim(),
      phone,
      date,
      time,
      people,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'bookings'), payload);
      setBookingDetails({ name: payload.name, phone: payload.phone, date, time, people });
      setShowThankYou(true);

      // reset
      setName('');
      setPhoneMasked('');
      setDate('');
      setTime('');
      setPeople(1);
      setFormErrors({});
      localStorage.removeItem('booking:draft');
    } catch (error) {
      console.error('Ошибка бронирования:', error);
      setFormErrors({ submit: 'Ошибка при бронировании. Попробуйте снова.' });
    } finally {
      setLoading(false);
    }
  };

  const downloadICS = () => {
    if (!bookingDetails) return;
    const start = new Date(`${bookingDetails.date}T${bookingDetails.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
        d.getMinutes(),
      )}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Coffee Addict//Booking//RU',
      'BEGIN:VEVENT',
      `UID:${crypto.randomUUID()}`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      'SUMMARY:Бронь столика — Coffee Addict',
      `DESCRIPTION:Имя: ${bookingDetails.name}\\nГостей: ${bookingDetails.people}\\nТел: +${bookingDetails.phone}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booking.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ───────────────────────────────────────────────────────────
  // Thank you (тот же светлый стиль, карточка с премиум-тенью)
  if (showThankYou && bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="w-full max-w-md"
        >
          <div className="glossy-pill w-24 h-24 mx-auto flex items-center justify-center shadow-[0_10px_26px_-14px_rgba(0,0,0,0.32)]">
            <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mt-6 text-center">Спасибо!</h1>
          <p className="text-slate-600 mt-2 text-center">Ваш столик успешно забронирован.</p>

          <div className="elev-card overflow-hidden rounded-3xl p-6 mt-8">
            <Row label="Имя" value={bookingDetails.name} />
            <Row label="Дата" value={bookingDetails.date} />
            <Row label="Время" value={bookingDetails.time} />
            <Row label="Гостей" value={String(bookingDetails.people)} />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={downloadICS}
              className="h-12 rounded-xl bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-slate-50 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              Добавить в календарь
            </button>
            <button
              onClick={() => setShowThankYou(false)}
              className="h-12 rounded-xl bg-slate-900 text-white font-semibold shadow-[0_12px_36px_-16px_rgba(0,0,0,0.65)] hover:bg-black transition-colors"
            >
              Забронировать ещё
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Main (хедер — стекло, карточка — elev-card/elev-card-strong)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-white font-sans text-slate-900">
      <header
        className="
          sticky top-0 z-30 px-4 py-3
          bg-white/65 backdrop-blur-md
          shadow-[0_10px_26px_-14px_rgba(0,0,0,0.32)]
          border-b border-white/40
        "
      >
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Бронь столика</h1>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="elev-card elev-card-strong overflow-hidden max-w-2xl mx-auto">
          <div className="relative p-6">
            {/* легкая аура как в hero */}
            <div className="pointer-events-none absolute -inset-px rounded-[26px] mix-blend-normal opacity-40" />

            <form onSubmit={handleBooking} className="space-y-6">
              {/* Имя */}
              <div>
                <FormLabel icon={<UserIcon className="w-5 h-5 text-slate-500" />} text="Ваше имя" />
                <FormInput
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Введите ваше имя"
                  error={formErrors.name}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              {/* Телефон */}
              <div>
                <FormLabel icon={<PhoneIcon className="w-5 h-5 text-slate-500" />} text="Контактный телефон" />
                <FormInput
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneMasked}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneMasked(phoneMask(e.target.value))}
                  placeholder="+7 (700) 123-45-67"
                  error={formErrors.phone}
                />
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              {/* Дата / Гости */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel icon={<CalendarDaysIcon className="w-5 h-5 text-slate-500" />} text="Дата" />
                  <FormInput
                    type="date"
                    value={date}
                    min={today}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setDate(e.target.value);
                      setTime('');
                    }}
                    error={formErrors.date}
                  />
                  {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                </div>
                <div>
                  <FormLabel icon={<UsersIcon className="w-5 h-5 text-slate-500" />} text="Гостей" />
                  <FormInput
                    type="number"
                    min={1}
                    value={people}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPeople(Math.max(1, parseInt(e.target.value || '1')))
                    }
                  />
                </div>
              </div>

              {/* Время */}
              <div>
                <FormLabel icon={<ClockIcon className="w-5 h-5 text-slate-500" />} text="Время" />
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <TimeSlotButton
                      key={slot}
                      time={slot}
                      isActive={time === slot}
                      onClick={() => setTime(slot)}
                      disabled={isSlotDisabled(slot)}
                    />
                  ))}
                </div>
                {formErrors.time && <p className="text-red-500 text-xs mt-1">{formErrors.time}</p>}
              </div>

              {/* CTA */}
              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="
                    w-full h-14 rounded-full
                    bg-slate-900 text-white font-bold text-lg
                    shadow-[0_16px_40px_-18px_rgba(0,0,0,0.55)] hover:bg-black active:shadow-none transition-colors btn-sweep
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/15
                    disabled:opacity-70
                  "
                  aria-label="Подтвердить бронь"
                >
                  <span className="inline-flex items-center justify-center gap-3">
                    {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : null}
                    {loading ? 'Отправляем…' : 'Забронировать'}
                  </span>
                </motion.button>
                {formErrors.submit && <p className="text-red-500 text-xs mt-2 text-center">{formErrors.submit}</p>}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

// маленькая строка показа данных
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1">
    <span className="text-slate-500">{label}:</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

export default Booking;
