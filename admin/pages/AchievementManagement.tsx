import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    TrophyIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    StarIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { API_BASE } from '../src/config/api';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: string;
    reward: number;
    category: string;
    isActive: boolean;
    createdAt?: string;
}

const AchievementManagement: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        icon: '🏆',
        condition: '',
        reward: 0,
        category: 'general',
        isActive: true
    });

    const categories = [
        { value: 'general', label: 'Общие' },
        { value: 'orders', label: 'Заказы' },
        { value: 'bonus', label: 'Бонусы' },
        { value: 'loyalty', label: 'Лояльность' },
        { value: 'social', label: 'Социальные' }
    ];

    const conditionTypes = [
        'orders_count_5', 'orders_count_10', 'orders_count_25', 'orders_count_50',
        'bonus_earned_1000', 'bonus_earned_5000', 'bonus_earned_10000',
        'first_order', 'weekend_order', 'morning_order', 'evening_order',
        'large_order_5000', 'large_order_10000'
    ];

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/promo?action=achievements`);
            if (response.ok) {
                const data = await response.json();
                setAchievements(data.achievements || []);
            }
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = `${API_BASE}/promo?action=achievements`;
            const method = editingAchievement ? 'PUT' : 'POST';
            const body = editingAchievement 
                ? { id: editingAchievement.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchAchievements();
                setShowModal(false);
                setEditingAchievement(null);
                setFormData({
                    title: '',
                    description: '',
                    icon: '🏆',
                    condition: '',
                    reward: 0,
                    category: 'general',
                    isActive: true
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения достижения:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (achievement: Achievement) => {
        setEditingAchievement(achievement);
        setFormData({
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            condition: achievement.condition,
            reward: achievement.reward,
            category: achievement.category,
            isActive: achievement.isActive
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить это достижение?')) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/promo?action=achievements&id=${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                await fetchAchievements();
            }
        } catch (error) {
            console.error('Ошибка удаления достижения:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--color-bg-base)] min-h-screen">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 -mx-6 mb-6 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]/80 backdrop-blur-md shadow-card rounded-2xl">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white font-[var(--font-family-heading)] flex items-center gap-2">
                            <TrophyIcon className="w-7 h-7 drop-shadow" />
                            Управление достижениями
                        </h1>
                        <button onClick={() => setShowModal(true)} className="bg-white/90 text-[var(--color-accent-orange)] px-5 py-3 rounded-2xl font-semibold shadow-card hover:bg-white transition-all duration-200 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Добавить достижение
                        </button>
                    </div>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {achievements.map((achievement) => (
                        <motion.div key={achievement.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="bg-[var(--color-bg-elevated)] rounded-2xl shadow-card p-6 border border-[var(--color-border)]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-3xl">{achievement.icon}</span>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-lg text-[var(--color-text-primary)] truncate">{achievement.title}</h3>
                                        <span className="text-sm text-[var(--color-text-secondary)] capitalize">{achievement.category}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(achievement)} className="p-2 rounded-xl bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(achievement.id)} className="p-2 rounded-xl bg-[var(--color-bg-hover)] text-red-600 hover:text-red-700">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[var(--color-text-secondary)] text-sm mb-4">{achievement.description}</p>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                    <StarIcon className="w-4 h-4 text-[var(--color-accent-orange)]" />
                                    <span>+{achievement.reward} бонусов</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {achievement.isActive ? (
                                        <CheckCircleIcon className="w-4 h-4 text-[var(--color-accent-green)]" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-[var(--color-bg-hover)]" />
                                    )}
                                    <span className={achievement.isActive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-secondary)]'}>
                                        {achievement.isActive ? 'Активно' : 'Неактивно'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                <span className="text-xs text-[var(--color-text-secondary)]">Условие: {achievement.condition}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-md shadow-card border border-[var(--color-border)]">
                            <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">{editingAchievement ? 'Редактировать достижение' : 'Новое достижение'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Название</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Описание</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" rows={3} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Иконка</label>
                                        <input type="text" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" placeholder="🏆" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Награда (бонусы)</label>
                                        <input type="number" value={formData.reward} onChange={(e) => setFormData({...formData, reward: parseInt(e.target.value) || 0})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" min="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Категория</label>
                                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]">
                                        {categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Условие</label>
                                    <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" required>
                                        <option value="">Выберите условие</option>
                                        {conditionTypes.map(condition => (<option key={condition} value={condition}>{condition}</option>))}
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="mr-2" />
                                    <label htmlFor="isActive" className="text-sm text-[var(--color-text-secondary)]">Активно</label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setShowModal(false); setEditingAchievement(null); }} className="flex-1 px-4 py-2 rounded-2xl bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover]">
                                        Отмена
                                    </button>
                                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white shadow-card disabled:opacity-60">
                                        {loading ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Add Achievement Section - Background Card */}
                <div className="mt-6">
                    <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Новое достижение
                        </h3>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium shadow hover:bg-emerald-700 transition"
                        >
                            Добавить достижение
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AchievementManagement;
