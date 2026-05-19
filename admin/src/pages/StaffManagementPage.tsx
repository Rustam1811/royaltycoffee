// admin/src/pages/StaffManagementPage.tsx
// Full staff management page for superowner:
// - List all staff with roles & locations
// - Create new staff (email + password + role + location)
// - Edit role / location
// - Change password
// - Remove role

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { staffService, StaffMember, StaffRole, CreateStaffRequest } from '@/services/staffService';
import { useLocation } from '@/contexts/LocationContext';

// ============================================================================
// Constants
// ============================================================================

const ROLE_OPTIONS: { value: StaffRole; label: string; emoji: string; color: string }[] = [
  { value: 'superowner', label: 'Супервладелец', emoji: '👑', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'owner', label: 'Владелец', emoji: '🏪', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'admin', label: 'Администратор', emoji: '👔', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'barista', label: 'Бариста', emoji: '☕', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'courier', label: 'Курьер', emoji: '🛵', color: 'bg-green-100 text-green-700 border-green-200' },
];

const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  superowner: { label: 'Супервладелец', emoji: '👑', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  owner: { label: 'Владелец', emoji: '🏪', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  admin: { label: 'Администратор', emoji: '👔', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  barista: { label: 'Бариста', emoji: '☕', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  courier: { label: 'Курьер', emoji: '🛵', color: 'bg-green-100 text-green-700 border-green-200' },
  workshop_owner: { label: 'Владелец цеха', emoji: '🏭', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  workshop_admin: { label: 'Админ цеха', emoji: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  workshop_client: { label: 'Клиент цеха', emoji: '📦', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  user: { label: 'Пользователь', emoji: '👤', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

// ============================================================================
// Sub-components
// ============================================================================

/** Create / Edit Staff Modal */
const StaffFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStaffRequest) => Promise<void>;
  editingStaff: StaffMember | null;
  locations: { id: string; name: string }[];
  saving: boolean;
}> = ({ isOpen, onClose, onSave, editingStaff, locations, saving }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<StaffRole>('barista');
  const [locationId, setLocationId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingStaff) {
      setEmail(editingStaff.email || '');
      setDisplayName(editingStaff.displayName || '');
      setRole((editingStaff.role as StaffRole) || 'barista');
      setLocationId(editingStaff.locationId || '');
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('barista');
      setLocationId(locations[0]?.id || '');
    }
    setError('');
    setShowPassword(false);
  }, [editingStaff, isOpen, locations]);

  const needsLocation = ['owner', 'admin', 'barista', 'courier'].includes(role);
  const isEditing = !!editingStaff;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    if (!isEditing && password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }
    if (needsLocation && !locationId) {
      setError('Выберите точку для этой роли');
      return;
    }

    try {
      await onSave({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim() || email.split('@')[0],
        role,
        ...(needsLocation ? { locationId } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditing ? '✏️ Изменить роль' : '➕ Новый сотрудник'}
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isEditing}
                    required
                    placeholder="barista@royal.com"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* Password — only for new users */}
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Пароль *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Минимум 6 символов"
                        className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Display name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Имя сотрудника"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Роль *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          role === opt.value
                            ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location — only for staff roles */}
                {needsLocation && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Точка *</label>
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Выберите точку...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                    {isEditing ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/** Password change modal */
const PasswordModal: React.FC<{
  isOpen: boolean;
  staff: StaffMember | null;
  onClose: () => void;
  onSave: (uid: string, newPassword: string) => Promise<void>;
  saving: boolean;
}> = ({ isOpen, staff, onClose, onSave, saving }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNewPassword('');
    setError('');
    setShowPassword(false);
    setCopied(false);
  }, [isOpen]);

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
  };

  const copyCredentials = () => {
    if (!staff) return;
    const text = `Email: ${staff.email}\nПароль: ${newPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setError('');

    if (newPassword.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      await onSave(staff.uid, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && staff && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">🔑 Сменить пароль</h2>
                <p className="text-sm text-slate-500 mt-1">{staff.email}</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Минимум 6 символов"
                      className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="flex-1 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition"
                  >
                    🎲 Сгенерировать
                  </button>
                  {newPassword && (
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      {copied ? '✅ Скопировано' : 'Копировать'}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Main Page
// ============================================================================

const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [passwordStaff, setPasswordStaff] = useState<StaffMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Locations from context
  const { locations } = useLocation();

  const locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]));

  // ————— Load staff —————
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await staffService.listStaff();
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ————— Toast helper —————
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ————— Handlers —————
  const handleCreate = async (data: CreateStaffRequest) => {
    setSaving(true);
    try {
      const result = await staffService.createStaff(data);
      showToast('success', result.isNewUser
        ? `✅ Сотрудник ${data.email} создан как ${ROLE_LABELS[data.role]?.label}`
        : `✅ Роль ${ROLE_LABELS[data.role]?.label} назначена для ${data.email}`
      );
      setShowCreateModal(false);
      setEditingStaff(null);
      await fetchStaff();
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async (data: CreateStaffRequest) => {
    setSaving(true);
    try {
      await staffService.updateRole({
        targetEmail: data.email,
        role: data.role,
        locationId: data.locationId,
      });
      showToast('success', `✅ Роль обновлена: ${data.email} → ${ROLE_LABELS[data.role]?.label}`);
      setEditingStaff(null);
      await fetchStaff();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (member: StaffMember) => {
    if (confirmDelete !== member.uid) {
      setConfirmDelete(member.uid);
      return;
    }

    setSaving(true);
    try {
      await staffService.removeRole(member.uid);
      showToast('success', `Роль снята: ${member.email}`);
      setConfirmDelete(null);
      await fetchStaff();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (uid: string, newPassword: string) => {
    setSaving(true);
    try {
      await staffService.updatePassword(uid, newPassword);
      showToast('success', `🔑 Пароль обновлён для ${passwordStaff?.email}`);
      setPasswordStaff(null);
    } finally {
      setSaving(false);
    }
  };

  // ————— Filtered staff —————
  const filtered = staff.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.email?.toLowerCase().includes(q)) ||
      (s.displayName?.toLowerCase().includes(q)) ||
      (s.role?.toLowerCase().includes(q)) ||
      (s.locationId?.toLowerCase().includes(q))
    );
  });

  // ————— Render —————
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Управление персоналом</h1>
              <p className="text-sm text-slate-500">
                {staff.length} сотрудник{staff.length === 1 ? '' : staff.length < 5 ? 'а' : 'ов'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditingStaff(null); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-200 transition"
          >
            <PlusIcon className="h-5 w-5" />
            Новый сотрудник
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email или роли..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            {error}
            <button onClick={fetchStaff} className="ml-auto text-sm font-medium underline">Повторить</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <ArrowPathIcon className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
        )}

        {/* Staff list */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <UserGroupIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">
              {search ? 'Никого не найдено' : 'Нет сотрудников'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {search ? 'Попробуйте другой запрос' : 'Создайте первого сотрудника'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((member) => {
              const roleMeta = ROLE_LABELS[member.role] || ROLE_LABELS.user;
              const locName = member.locationId ? (locationMap[member.locationId] || member.locationId) : null;
              const isDeleting = confirmDelete === member.uid;

              return (
                <motion.div
                  key={member.uid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          {roleMeta.emoji}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">
                          {member.displayName || member.email?.split('@')[0] || '—'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${roleMeta.color}`}>
                          {roleMeta.emoji} {roleMeta.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate mt-0.5">{member.email || '—'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {locName && (
                          <span className="inline-flex items-center gap-1">
                            📍 {locName}
                          </span>
                        )}
                        {member.lastSignIn && (
                          <span>
                            Вход: {new Date(member.lastSignIn).toLocaleDateString('ru')}
                          </span>
                        )}
                        {member.createdAt && (
                          <span>
                            Создан: {new Date(member.createdAt).toLocaleDateString('ru')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingStaff(member); setShowCreateModal(true); }}
                        title="Изменить роль"
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setPasswordStaff(member)}
                        title="Сменить пароль"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <KeyIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveRole(member)}
                        disabled={saving}
                        title={isDeleting ? 'Подтвердить удаление' : 'Снять роль'}
                        className={`p-2 rounded-lg transition ${
                          isDeleting
                            ? 'text-white bg-red-500 hover:bg-red-600'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Refresh button */}
        {!loading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={fetchStaff}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl border border-slate-200 transition"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Обновить
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-medium text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <StaffFormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingStaff(null); }}
        onSave={editingStaff ? handleEditRole : handleCreate}
        editingStaff={editingStaff}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        saving={saving}
      />

      <PasswordModal
        isOpen={!!passwordStaff}
        staff={passwordStaff}
        onClose={() => setPasswordStaff(null)}
        onSave={handlePasswordChange}
        saving={saving}
      />
    </div>
  );
};

export default StaffManagementPage;
