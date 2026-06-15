/**
 * IikoSettingsPage — настройка интеграции с iiko CRM.
 * Доступно только для superowner.
 *
 * Позволяет:
 *  - связать iiko organizationId с нашими outlet'ами
 *  - сгенерировать / обновить webhook secret
 *  - скопировать готовый URL для вставки в iiko
 */

import React, { useEffect, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  CloudArrowDownIcon,
} from '@heroicons/react/24/outline';
import { getIikoSettings, saveIikoSettings, IikoOrganization } from '@/services/iikoSettings';
import { locationService } from '@/services/locationService';
import { Location } from '@/types/location';

// ─── Base URL нашего API для iiko ───
const IIKO_API_ROOT =
  'https://us-central1-royal-coffee-b1ce9.cloudfunctions.net/app/api';
const IIKO_LOYALTY_BASE = `${IIKO_API_ROOT}/iiko-loyalty`;
const IIKO_SYNC_BASE = `${IIKO_API_ROOT}/iiko-sync`;

// ─── Генерация случайного секрета ───
function generateSecret(len = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Hook: copy to clipboard с анимацией ───
function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), timeout);
  }, [timeout]);
  return { copied, copy };
}

// ─── Компонент строки маппинга ───
interface RowProps {
  org: IikoOrganization;
  locations: Location[];
  onChange: (updated: IikoOrganization) => void;
  onDelete: () => void;
  rowIdx: number;
}

const OrgRow: React.FC<RowProps> = ({ org, locations, onChange, onDelete, rowIdx }) => {
  const uid = useId();
  const isValid = org.iikoOrgId.trim().length > 0 && org.outletId.trim().length > 0;

  const handleLocationChange = (outletId: string) => {
    const loc = locations.find(l => l.id === outletId);
    onChange({ ...org, outletId, outletName: loc?.name ?? outletId });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={`p-4 rounded-2xl border transition-colors ${
        isValid ? 'bg-white border-slate-200' : 'bg-amber-50/60 border-amber-200'
      }`}
    >
     <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
      {/* iiko Organization ID */}
      <div>
        <label htmlFor={`${uid}-org`} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          iiko Organization ID
        </label>
        <input
          id={`${uid}-org`}
          type="text"
          value={org.iikoOrgId}
          onChange={e => onChange({ ...org, iikoOrgId: e.target.value })}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          spellCheck={false}
          className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-slate-300"
        />
        {org.iikoOrgId && !/^[0-9a-f-]{36}$/i.test(org.iikoOrgId.trim()) && (
          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3 h-3" />
            Ожидается UUID формат
          </p>
        )}
      </div>

      {/* Наша точка */}
      <div>
        <label htmlFor={`${uid}-outlet`} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Наша точка
        </label>
        <select
          id={`${uid}-outlet`}
          value={org.outletId}
          onChange={e => handleLocationChange(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        >
          <option value="">— выберите точку —</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* Заметка (опционально) */}
      <div>
        <label htmlFor={`${uid}-note`} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Заметка <span className="normal-case font-normal">(необязательно)</span>
        </label>
        <input
          id={`${uid}-note`}
          type="text"
          value={org.note ?? ''}
          onChange={e => onChange({ ...org, note: e.target.value })}
          placeholder="Напр.: Алматы ТРЦ Мега"
          className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-slate-300"
        />
      </div>

      {/* Удалить */}
      <div className="pt-5">
        <button
          onClick={onDelete}
          aria-label={`Удалить строку ${rowIdx + 1}`}
          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
     </div>

     {/* apiLogin для этой точки (опционально — если у каждой свой ключ) */}
     <div className="mt-3">
       <label htmlFor={`${uid}-login`} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
         apiLogin Cloud API <span className="normal-case font-normal">(необязательно — если у точки свой ключ)</span>
       </label>
       <input
         id={`${uid}-login`}
         type="text"
         value={org.apiLogin ?? ''}
         onChange={e => onChange({ ...org, apiLogin: e.target.value })}
         placeholder="Оставьте пустым — будет использован общий ключ сети"
         spellCheck={false}
         className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-slate-300"
       />
     </div>
    </motion.div>
  );
};

// ─── Главная страница ───
const IikoSettingsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<IikoOrganization[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [secret, setSecret] = useState('');
  const [apiLogin, setApiLogin] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Состояние синхронизаций: ключ → 'idle' | 'running' | результат
  const [syncState, setSyncState] = useState<Record<string, string>>({});
  const { copied, copy } = useCopy();

  // ─── Загрузка ───
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getIikoSettings(),
      locationService.getLocations().catch(() => [] as Location[]),
    ]).then(([settings, locs]) => {
      if (cancelled) return;
      setOrgs(settings.organizations.length > 0 ? settings.organizations : []);
      setSecret(settings.webhookSecret ?? '');
      setApiLogin(settings.apiLogin ?? '');
      setLocations(locs);
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Запуск синхронизации ───
  const runSync = async (kind: 'orders' | 'menu' | 'stoplist', body: Record<string, unknown> = {}) => {
    setSyncState(prev => ({ ...prev, [kind]: 'running' }));
    try {
      const res = await fetch(`${IIKO_SYNC_BASE}/${kind}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-iiko-secret': secret } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const summary =
        kind === 'orders' ? `Заказов: ${data.total}`
        : kind === 'menu' ? `Товаров: ${data.products}, групп: ${data.groups}`
        : `Точек: ${data.outlets}`;
      setSyncState(prev => ({ ...prev, [kind]: `✓ ${summary}` }));
    } catch (err) {
      setSyncState(prev => ({ ...prev, [kind]: `✗ ${err instanceof Error ? err.message : 'Ошибка'}` }));
    }
  };

  // ─── Добавить пустую строку ───
  const addRow = () => {
    setOrgs(prev => [
      ...prev,
      { iikoOrgId: '', outletId: '', outletName: '', note: '' },
    ]);
  };

  // ─── Изменить строку ───
  const updateRow = (idx: number, updated: IikoOrganization) => {
    setOrgs(prev => prev.map((o, i) => (i === idx ? updated : o)));
  };

  // ─── Удалить строку ───
  const deleteRow = (idx: number) => {
    setOrgs(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Сохранить ───
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveIikoSettings(orgs, secret || undefined, apiLogin || undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const hasInvalidRows = orgs.some(
    o => (o.iikoOrgId.trim() || o.outletId.trim()) &&
         (!o.iikoOrgId.trim() || !o.outletId.trim()),
  );

  // ─── Render ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Заголовок */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BuildingStorefrontIcon className="w-7 h-7 text-violet-500" />
            Интеграция с iiko
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Свяжите организации iiko с точками сети. После сохранения кассиры смогут сканировать QR клиентов прямо в iiko.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || hasInvalidRows}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200 transition-all active:scale-95"
        >
          {saving ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckIcon className="w-4 h-4" />
          ) : null}
          {saving ? 'Сохранение…' : saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Блок 1: URL для вставки в iiko ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <LinkIcon className="w-5 h-5 text-violet-500" />
          <h2 className="font-bold text-slate-900">URL для iiko</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            Вставьте этот URL в настройки каждой организации iiko → <strong>Внешние программы лояльности</strong>.
          </p>
          {[
            { label: 'Base URL',        value: IIKO_LOYALTY_BASE },
            { label: 'Resolve card',    value: `${IIKO_LOYALTY_BASE}/couponinfo` },
            { label: 'Calculate check', value: `${IIKO_LOYALTY_BASE}/calculatecheque` },
            { label: 'Create order',    value: `${IIKO_LOYALTY_BASE}/createorder` },
            { label: 'Cancel order',    value: `${IIKO_LOYALTY_BASE}/cancelorder` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-32 flex-shrink-0 text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-0">
                <code className="text-xs text-slate-700 truncate flex-1 font-mono">{value}</code>
                <button
                  onClick={() => copy(value, label)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Скопировать"
                >
                  {copied === label
                    ? <CheckIcon className="w-4 h-4 text-emerald-500" />
                    : <ClipboardDocumentIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Блок 2: Webhook secret ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <ShieldCheckIcon className="w-5 h-5 text-violet-500" />
          <h2 className="font-bold text-slate-900">Секретный ключ</h2>
          <span className="ml-auto text-xs text-slate-400 font-normal">необязательно, но рекомендуется</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            iiko будет отправлять этот ключ в заголовке <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">x-iiko-secret</code>. Наш API отклонит запросы без него.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Не задан — защита отключена"
                className="flex-1 px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none placeholder-slate-300"
              />
              <button
                onClick={() => setShowSecret(v => !v)}
                className="px-3 py-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label={showSecret ? 'Скрыть' : 'Показать'}
              >
                {showSecret ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setSecret(generateSecret())}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Сгенерировать
            </button>
            {secret && (
              <button
                onClick={() => copy(secret, 'secret')}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label="Скопировать секрет"
              >
                {copied === 'secret'
                  ? <CheckIcon className="w-4 h-4 text-emerald-500" />
                  : <ClipboardDocumentIcon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Блок 2.5: Cloud API ключ (apiLogin) ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <KeyIcon className="w-5 h-5 text-violet-500" />
          <h2 className="font-bold text-slate-900">Ключ Cloud API (apiLogin)</h2>
          <span className="ml-auto text-xs text-slate-400 font-normal">для синхронизации заказов / меню / стоп-листа</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            Общий <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">apiLogin</code> аккаунта iiko (одного на всю сеть достаточно).
            Если у каждой точки свой ключ — оставьте это поле пустым и впишите ключ в строке точки ниже.
          </p>
          <input
            type="text"
            value={apiLogin}
            onChange={e => setApiLogin(e.target.value)}
            placeholder="apiLogin из iikoWeb → Настройки → API"
            spellCheck={false}
            className="w-full font-mono text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-slate-300"
          />
        </div>
      </section>

      {/* ── Блок 3: Маппинг организаций ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BuildingStorefrontIcon className="w-5 h-5 text-violet-500" />
            <h2 className="font-bold text-slate-900">Организации iiko → точки сети</h2>
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
              {orgs.length}
            </span>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Добавить
          </button>
        </div>

        <div className="px-5 py-4">
          {orgs.length === 0 ? (
            <div className="text-center py-10">
              <BuildingStorefrontIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Нет организаций. Нажмите «Добавить» чтобы связать первую точку.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Шапка колонок */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-4">
                {['iiko Organization ID', 'Наша точка', 'Заметка', ''].map((h, i) => (
                  <span key={i} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {orgs.map((org, idx) => (
                  <OrgRow
                    key={idx}
                    org={org}
                    locations={locations}
                    rowIdx={idx}
                    onChange={updated => updateRow(idx, updated)}
                    onDelete={() => deleteRow(idx)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {hasInvalidRows && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm px-1">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
              Заполните или удалите незавершённые строки перед сохранением.
            </div>
          )}
        </div>
      </section>

      {/* ── Блок 4: Синхронизация (Cloud API → наша база) ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <CloudArrowDownIcon className="w-5 h-5 text-violet-500" />
          <h2 className="font-bold text-slate-900">Синхронизация из iiko</h2>
          <span className="ml-auto text-xs text-slate-400 font-normal">требует apiLogin выше</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            Запустите вручную. Сначала сохраните настройки (ключи), затем нажмите нужную кнопку.
          </p>
          {([
            { kind: 'orders' as const,   label: 'Заказы (за 1 день)', body: { days: 1 }, desc: 'Подтянет заказы из iiko в раздел «Заказы».' },
            { kind: 'menu' as const,     label: 'Меню (номенклатура)', body: {},        desc: 'Загрузит товары и группы из iiko.' },
            { kind: 'stoplist' as const, label: 'Стоп-лист',           body: {},         desc: 'Отметит недоступные позиции по точкам.' },
          ]).map(({ kind, label, body, desc }) => {
            const st = syncState[kind];
            const running = st === 'running';
            return (
              <div key={kind} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{label}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                  {st && st !== 'running' && (
                    <div className={`text-xs mt-1 font-medium ${st.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                      {st}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => runSync(kind, body)}
                  disabled={running}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95"
                >
                  {running ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CloudArrowDownIcon className="w-4 h-4" />}
                  {running ? 'Синхр…' : 'Запустить'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Инструкция ── */}
      <section className="bg-violet-50 rounded-2xl border border-violet-100 px-5 py-4 space-y-2">
        <h3 className="font-bold text-violet-900 text-sm">Как найти Organization ID в iiko?</h3>
        <ol className="text-sm text-violet-800 space-y-1 list-decimal list-inside">
          <li>Зайдите в <strong>iikoOffice</strong> или <strong>iikoWeb</strong>.</li>
          <li>Откройте <strong>Администрирование → Настройки торгового предприятия</strong>.</li>
          <li>В поле «Идентификатор» скопируйте UUID вида <code className="bg-violet-100 px-1 rounded font-mono text-xs">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>.</li>
          <li>Повторите для каждой из точек.</li>
        </ol>
      </section>

      {/* Нижняя кнопка сохранения (удобство на длинных страницах) */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleSave}
          disabled={saving || hasInvalidRows}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200 transition-all active:scale-95"
        >
          {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : saved ? <CheckIcon className="w-4 h-4" /> : null}
          {saving ? 'Сохранение…' : saved ? 'Сохранено!' : 'Сохранить настройки'}
        </button>
      </div>

    </div>
  );
};

export default IikoSettingsPage;
