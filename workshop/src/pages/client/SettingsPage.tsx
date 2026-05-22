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
    await signOut(auth);
    window.location.href = '/login';
  };

  const links = [
    { icon: ShieldCheckIcon, label: 'Политика конфиденциальности', href: '/privacy.html' },
    { icon: DocumentTextIcon, label: 'Условия использования', href: '/terms.html' },
  ];

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '40px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Cog6ToothIcon style={{ width: 28, height: 28 }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Настройки</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 }}>Профиль и информация</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: 512, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Аккаунт</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginTop: 4, marginBottom: 0 }}>
              {user?.companyName || user?.email || '—'}
            </p>
          </div>
        </motion.div>

        {/* Legal Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            {links.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}
              >
                <link.icon style={{ width: 20, height: 20, color: '#94a3b8', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{link.label}</span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', cursor: 'pointer' }}
          >
            <ArrowRightOnRectangleIcon style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#dc2626' }}>Выйти из аккаунта</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
