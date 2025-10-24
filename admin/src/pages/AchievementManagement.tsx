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
import { api } from '@/services/api';
import { useImageUpload } from '../hooks/useImageUpload';
import { ImageUploader } from '../components/ImageUploader';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    image?: string;
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

    // Image upload hook
    const { uploading, progress, error: uploadError, upload, reset: resetUpload } = useImageUpload();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        icon: '🏆',
        image: '',
        condition: '',
        reward: 0,
        category: 'beginner',
        isActive: true
    });

    const categories = [
        { value: 'beginner', label: '🌱 Новичок' },
        { value: 'regular', label: '☕ Любитель кофе' },
        { value: 'expert', label: '⭐ Эксперт' },
        { value: 'master', label: '👑 Мастер' },
        { value: 'legend', label: '🏆 Легенда' },
        { value: 'special', label: '🎁 Специальные' },
        { value: 'social', label: '👥 Социальные' }
    ];

    const conditionTypes = [
        // Новичок (первые шаги)
        { value: 'first_order', label: 'Первый заказ', category: 'beginner' },
        { value: 'orders_3', label: '3 заказа', category: 'beginner' },
        { value: 'orders_5', label: '5 заказов', category: 'beginner' },
        { value: 'bonus_100', label: '100 бонусов накоплено', category: 'beginner' },
        
        // Любитель кофе
        { value: 'orders_10', label: '10 заказов', category: 'regular' },
        { value: 'orders_15', label: '15 заказов', category: 'regular' },
        { value: 'bonus_500', label: '500 бонусов накоплено', category: 'regular' },
        { value: 'total_spent_5000', label: 'Потрачено 5000₸', category: 'regular' },
        
        // Эксперт
        { value: 'orders_25', label: '25 заказов', category: 'expert' },
        { value: 'orders_50', label: '50 заказов', category: 'expert' },
        { value: 'bonus_1000', label: '1000 бонусов накоплено', category: 'expert' },
        { value: 'total_spent_10000', label: 'Потрачено 10 000₸', category: 'expert' },
        
        // Мастер
        { value: 'orders_75', label: '75 заказов', category: 'master' },
        { value: 'orders_100', label: '100 заказов', category: 'master' },
        { value: 'bonus_5000', label: '5000 бонусов накоплено', category: 'master' },
        { value: 'total_spent_25000', label: 'Потрачено 25 000₸', category: 'master' },
        
        // Легенда
        { value: 'orders_200', label: '200 заказов', category: 'legend' },
        { value: 'orders_365', label: '365 заказов (год кофе)', category: 'legend' },
        { value: 'bonus_10000', label: '10 000 бонусов накоплено', category: 'legend' },
        { value: 'total_spent_50000', label: 'Потрачено 50 000₸', category: 'legend' },
        
        // Специальные
        { value: 'weekend_warrior', label: 'Любитель выходных (10 заказов)', category: 'special' },
        { value: 'morning_person', label: 'Ранняя пташка (10 утренних заказов)', category: 'special' },
        { value: 'night_owl', label: 'Сова (10 вечерних заказов)', category: 'special' },
        { value: 'big_spender', label: 'Крупный заказ 10 000₸', category: 'special' },
        
        // Социальные
        { value: 'invite_5', label: '5 приглашённых друзей', category: 'social' },
        { value: 'invite_10', label: '10 приглашённых друзей', category: 'social' },
        { value: 'review_first', label: 'Первый отзыв', category: 'social' },
        { value: 'reviews_10', label: '10 отзывов', category: 'social' }
    ];

    useEffect(() => {
        fetchAchievements();
    }, []);

    const handleImageUpload = async (file: File) => {
        const result = await upload(file);
        if (result) {
            setFormData({ ...formData, image: result.url });
        }
    };

    const fetchAchievements = async () => {
        setLoading(true);
        try {
            const data = await api.get<{ achievements: Achievement[] }>('promo?action=achievements');
            setAchievements(data.achievements || []);
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
            if (error instanceof Error && error.message === 'NON_JSON_RESPONSE') {
                console.error('API misconfigured: received HTML instead of JSON');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = editingAchievement 
                ? { id: editingAchievement.id, ...formData }
                : formData;

            if (editingAchievement) {
                await api.post('promo?action=achievements', body);
            } else {
                await api.post('promo?action=achievements', body);
            }

            await fetchAchievements();
            setShowModal(false);
            setEditingAchievement(null);
            setFormData({
                title: '',
                description: '',
                icon: '🏆',
                image: '',
                condition: '',
                reward: 0,
                category: 'beginner',
                isActive: true
            });
            resetUpload();
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
            image: achievement.image || '',
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
            await api.delete(`promo?action=achievements&id=${id}`);
            await fetchAchievements();
        } catch (error) {
            console.error('Ошибка удаления достижения:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-b from-slate-100 via-slate-100 to-white min-h-screen pb-20">
            <div className="max-w-7xl mx-auto p-3 sm:p-4">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 -mx-6 mb-6 px-6 py-4 bg-transparent shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] rounded-3xl">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-slate-900 font-sans flex items-center gap-2">
                            <TrophyIcon className="w-7 h-7 drop-shadow" />
                            Управление достижениями
                        </h1>
                        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-5 py-3 rounded-3xl font-semibold shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] hover:bg-white transition-all duration-200 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Добавить достижение
                        </button>
                    </div>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {achievements.map((achievement) => (
                        <motion.div key={achievement.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="bg-white rounded-3xl shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] p-4 border border-slate-200">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-3xl">{achievement.icon}</span>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-lg text-slate-900 truncate">{achievement.title}</h3>
                                        <span className="text-sm text-slate-600 capitalize">{achievement.category}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(achievement)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(achievement.id)} className="p-2 rounded-xl bg-slate-100 text-red-600 hover:text-red-700">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">{achievement.description}</p>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <StarIcon className="w-4 h-4 text-amber-600" />
                                    <span>+{achievement.reward} бонусов</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {achievement.isActive ? (
                                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-slate-100" />
                                    )}
                                    <span className={achievement.isActive ? 'text-green-600' : 'text-slate-600'}>
                                        {achievement.isActive ? 'Активно' : 'Неактивно'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <span className="text-xs text-slate-600">Условие: {achievement.condition}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] border border-slate-200">
                            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900">{editingAchievement ? 'Редактировать достижение' : 'Новое достижение'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Название</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Описание</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900" rows={3} required />
                                </div>
                                
                                {/* Image uploader */}
                                <ImageUploader
                                    imageUrl={formData.image}
                                    onImageChange={(url) => setFormData({ ...formData, image: url })}
                                    uploading={uploading}
                                    progress={progress}
                                    error={uploadError}
                                    onUpload={handleImageUpload}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Иконка (эмодзи)</label>
                                        <input type="text" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="🏆" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Награда (бонусы)</label>
                                        <input type="number" value={String(formData.reward || '')} onChange={(e) => setFormData({...formData, reward: parseInt(e.target.value) || 0})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900" min="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Категория</label>
                                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900">
                                        {categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Условие</label>
                                    <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900" required>
                                        <option value="">Выберите условие</option>
                                        {/* Группировка по категориям */}
                                        <optgroup label="🌱 Новичок">
                                            {conditionTypes.filter(c => c.category === 'beginner').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="☕ Любитель кофе">
                                            {conditionTypes.filter(c => c.category === 'regular').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="⭐ Эксперт">
                                            {conditionTypes.filter(c => c.category === 'expert').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="👑 Мастер">
                                            {conditionTypes.filter(c => c.category === 'master').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="🏆 Легенда">
                                            {conditionTypes.filter(c => c.category === 'legend').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="🎁 Специальные">
                                            {conditionTypes.filter(c => c.category === 'special').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="👥 Социальные">
                                            {conditionTypes.filter(c => c.category === 'social').map(condition => (
                                                <option key={condition.value} value={condition.value}>{condition.label}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="mr-2" />
                                    <label htmlFor="isActive" className="text-sm text-slate-600">Активно</label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setShowModal(false); setEditingAchievement(null); }} className="flex-1 px-4 py-2 rounded-3xl bg-white text-slate-900 border border-slate-200 hover:bg-[var(--color-bg-hover]">
                                        Отмена
                                    </button>
                                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-3xl bg-slate-900 text-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] disabled:opacity-60">
                                        {loading ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Add Achievement Section - Background Card */}
                <div className="mt-6">
                    <div className="bg-white/90 backdrop-blur rounded-3xl p-5 shadow">
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
