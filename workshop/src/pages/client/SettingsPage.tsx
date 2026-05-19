import React from 'react';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const SettingsPage: React.FC = () => {
  const { user } = useUser();

  const handleLogout = async () => {
    localStorage.setItem('workshop_just_logged_out', '1');
    await signOut(auth);
    window.location.href = '/app/login';
  };

  const links = [
    {
      icon: ShieldCheckIcon,
      label: 'Политика конфиденциальности',
      href: '/privacy.html',
    },
    {
      icon: DocumentTextIcon,
      label: 'Условия использования',
      href: '/terms.html',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Cog6ToothIcon className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold">Настройки</h1>
            <p className="text-white/60 text-sm mt-0.5">Профиль и информация</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Аккаунт</p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              {user?.companyName || user?.email || '—'}
            </p>
          </div>
        </motion.div>

        {/* Legal Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <link.icon className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{link.label}</span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-red-50 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">Выйти из аккаунта</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
