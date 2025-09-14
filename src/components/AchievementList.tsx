// src/components/AchievementList.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, CheckIcon } from '@heroicons/react/24/solid';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  condition:
    | {
        type: 'orders_count' | 'total_spent' | 'items_ordered' | 'login_streak';
        value: number;
      }
    | string;
  reward:
    | {
        type: 'points' | 'discount';
        value: number;
      }
    | number;
  icon?: string;
  isActive: boolean;
  createdAt: any;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: any;
  claimed: boolean;
}

interface AchievementListProps {
  className?: string;
}

// —————————————————————————————————————————————————————————
// UI helpers (премиум-палитра без бордеров)
const cardBase =
  'rounded-2xl bg-surface shadow-card p-4 transition-[transform,box-shadow] will-change-transform';
const cardHover = 'hover:shadow-float hover:-translate-y-[1px]';
const pillBase =
  'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold';
const pillMuted = 'bg-black/5 text-slate-700';
const pillStrong = 'bg-black text-white';
const progressTrack = 'w-20 h-1.5 rounded-full bg-black/10 overflow-hidden';
const progressBar = 'h-full rounded-full bg-black';

// category → emoji (без внешних иконок)
const categoryEmoji = (category: string) => {
  switch (category) {
    case 'orders':
      return '🛒';
    case 'loyalty':
      return '❤️';
    case 'social':
      return '👥';
    case 'special':
      return '⭐';
    default:
      return '🏆';
  }
};

export const AchievementList: React.FC<AchievementListProps> = ({
  className = '',
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    []
  );
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) =>
      setCurrentUser(user?.uid || null)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    loadAchievements();
    if (currentUser) {
      loadUserAchievements();
      loadUserProgress();
    } else {
      // даже без авторизации показываем общий список
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // —————————————————————————————————————————————————————————
  // Data loaders

  const loadAchievements = async () => {
    try {
      const baseRes = await fetch(`/api/promo?action=achievements`);
      if (!baseRes.ok) throw new Error('Failed to fetch achievements');
      const baseJson = await baseRes.json();
      const list: Achievement[] = baseJson.achievements || [];

      // форматируем под единый тип
      const normalize = (a: Achievement) => ({
        ...a,
        condition:
          typeof a.condition === 'string'
            ? { type: 'orders_count' as const, value: 1 }
            : a.condition,
        reward:
        typeof a.reward === 'number'
            ? { type: 'points' as const, value: a.reward }
            : a.reward,
      });

      // если хотим подсветить разблокировки — подтянем userId из localStorage
      const userLS = localStorage.getItem('user');
      const userId = userLS ? JSON.parse(userLS).id : null;

      if (userId) {
        const userRes = await fetch(
          `/api/promo?action=achievements&userId=${userId}`
        );
        const userJson = userRes.ok ? await userRes.json() : { achievements: [] };
        const unlocked: any[] = userJson.achievements || [];
        const fmt = list.map((a) => ({
          ...normalize(a),
          // мягко добавляем флаги
          isUnlocked: unlocked.some((ua) => ua.achievementId === a.id),
          unlockedAt:
            unlocked.find((ua) => ua.achievementId === a.id)?.unlockedAt ||
            null,
        }));
        setAchievements(fmt as any);
      } else {
        setAchievements(list.map(normalize) as any);
      }
    } catch (e) {
      console.error('Ошибка загрузки достижений:', e);
    }
  };

  const loadUserAchievements = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(
        `https://us-central1-coffeeaddict-c9d70.cloudfunctions.net/achievements/${currentUser}`
      );
      if (res.ok) {
        const j = await res.json();
        setUserAchievements(j.userAchievements || []);
      }
    } catch (e) {
      console.error('Ошибка загрузки пользовательских достижений:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(
        `/api/bonus?action=user&userId=${currentUser}`
      );
      if (res.ok) {
        const b = await res.json();
        setUserProgress({
          orders_count: b.ordersCount || 0,
          total_spent: b.totalSpent || 0,
          items_ordered: b.itemsOrdered || 0,
          login_streak: b.loginStreak || 0,
        });
      }
    } catch (e) {
      console.error('Ошибка загрузки прогресса пользователя:', e);
    }
  };

  const claimAchievement = async (achievementId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(
        `https://us-central1-coffeeaddict-c9d70.cloudfunctions.net/achievements`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser, achievementId, action: 'claim' }),
        }
      );
      if (res.ok) await loadUserAchievements();
    } catch (e) {
      console.error('Ошибка при получении награды:', e);
    }
  };

  // —————————————————————————————————————————————————————————
  // Presentation helpers

  const getStatus = (a: Achievement) => {
    const ua = userAchievements.find((x) => x.achievementId === a.id);

    const condObj =
      typeof a.condition === 'object' && a.condition
        ? a.condition
        : { type: 'orders_count', value: 1 };
    const progress = userProgress[condObj.type] || 0;
    const required = condObj.value || 1;

    if (ua?.claimed) return { key: 'claimed' as const, pct: 100 };
    if (ua && !ua.claimed) return { key: 'unlocked' as const, pct: 100 };
    if (progress >= required) return { key: 'completed' as const, pct: 100 };
    return { key: 'in_progress' as const, pct: Math.min((progress / required) * 100, 100) };
  };

  const rewardText = (r: Achievement['reward']) => {
    if (typeof r === 'number') return `+${r} бонусов`;
    if (r?.type === 'points') return `+${r.value} бонусов`;
    if (r?.type === 'discount') return `${r.value}% скидка`;
    return 'Награда';
  };

  // —————————————————————————————————————————————————————————
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 bg-black/5 rounded animate-pulse" />
          <div className="h-6 w-6 rounded-full bg-black/5 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${cardBase} animate-pulse`}>
              <div className="h-16 rounded-xl bg-black/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = achievements.filter((a) => a.isActive);

  return (
    <section className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Достижения</h2>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]">
          <TrophyIcon className="w-5 h-5" />
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {active.map((a) => {
            const { key, pct } = getStatus(a);
            const isClaimed = key === 'claimed';
            const isUnlocked = key === 'unlocked';
            const isCompleted = key === 'completed';
            const inProgress = key === 'in_progress';

            // легкая подсветка состояния — без бордеров
            const glow =
              isClaimed
                ? 'shadow-[0_18px_40px_-18px_rgba(16,185,129,0.55)]'
                : isUnlocked
                ? 'shadow-[0_18px_40px_-18px_rgba(245,158,11,0.55)]'
                : isCompleted
                ? 'shadow-[0_18px_40px_-18px_rgba(59,130,246,0.55)]'
                : '';

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={`${cardBase} ${cardHover} ${glow}`}
              >
                <div className="flex gap-3">
                  {/* Emoji badge */}
                  <div className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center text-lg">
                      {a.icon || categoryEmoji(a.category)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {a.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      </div>

                      {isClaimed && (
                        <span
                          className={`${pillBase} ${pillStrong} shadow-[0_10px_30px_-14px_rgba(0,0,0,0.5)]`}
                          title="Получено"
                        >
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Получено
                        </span>
                      )}
                    </div>

                    {/* reward + progress */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`${pillBase} ${pillMuted}`}>{rewardText(a.reward)}</span>

                      {!isClaimed && (
                        <div className="flex items-center gap-2">
                          <div className={progressTrack}>
                            <motion.div
                              className={progressBar}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-600 tabular-nums">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    {isUnlocked && (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => claimAchievement(a.id)}
                        className="mt-3 w-full h-10 rounded-xl bg-black text-white text-sm font-semibold shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] active:shadow-none"
                      >
                        Получить награду
                      </motion.button>
                    )}
                    {isCompleted && !isUnlocked && (
                      <div className="mt-2 text-[11px] text-slate-600">
                        Готово к получению — откроется автоматически.
                      </div>
                    )}
                    {inProgress && (
                      <div className="mt-2 text-[11px] text-slate-500">
                        Продолжай в том же духе!
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {active.length === 0 && (
        <div className={`${cardBase} text-center`}>
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-black/5 flex items-center justify-center">
            <TrophyIcon className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-600 text-sm">Достижения скоро появятся</p>
        </div>
      )}
    </section>
  );
};
