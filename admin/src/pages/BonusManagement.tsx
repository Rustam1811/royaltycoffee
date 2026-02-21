import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/services/api';
import { 
    CogIcon, 
    StarIcon, 
    CalculatorIcon,
    GiftIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface BonusSettings {
    baseRate: number; // Базовый процент начисления (например, 5%)
    multipliers: {
        morningBonus: number; // Множитель для утренних заказов
        eveningBonus: number; // Множитель для вечерних заказов
        weekendBonus: number; // Множитель для выходных
        vipBonus: number; // Множитель для VIP клиентов
    };
    categories: {
        [key: string]: number; // Множители для категорий товаров
    };
    rewards: Array<{
        id: string;
        name: string;
        description: string;
        cost: number; // Стоимость в бонусах
        discount: number; // Размер скидки в тенге или процентах
        type: 'fixed' | 'percentage'; // Тип скидки
        category?: string; // Категория товаров для скидки
        isActive: boolean;
    }>;
    levels: Array<{
        name: string;
        minSpent: number;
        cashbackPercent: number;
        benefits: string[];
    }>;
}

const BonusManagement: React.FC = () => {
    const [settings, setSettings] = useState<BonusSettings>({
        baseRate: 5,
        multipliers: {
            morningBonus: 1.5,
            eveningBonus: 1.2,
            weekendBonus: 2.0,
            vipBonus: 1.5
        },
        categories: {
            'coffee': 1.0,
            'desserts': 1.2,
            'breakfast': 0.8,
            'special': 2.0
        },
        rewards: [
            {
                id: '1',
                name: 'Скидка 200₸',
                description: 'Скидка 200 тенге на любой заказ',
                cost: 100,
                discount: 200,
                type: 'fixed',
                isActive: true
            },
            {
                id: '2',
                name: 'Скидка 15% на кофе',
                description: 'Скидка 15% на все кофейные напитки',
                cost: 150,
                discount: 15,
                type: 'percentage',
                category: 'coffee',
                isActive: true
            }
        ],
        levels: [
            {
                name: 'Бронза',
                minSpent: 0,
                cashbackPercent: 5,
                benefits: ['5% кешбэк с каждого заказа']
            },
            {
                name: 'Серебро',
                minSpent: 5000,
                cashbackPercent: 10,
                benefits: ['10% кешбэк', 'Персональные предложения']
            },
            {
                name: 'Золото',
                minSpent: 15000,
                cashbackPercent: 15,
                benefits: ['15% кешбэк', 'Раннее уведомление о новинках', 'Бесплатная доставка']
            },
            {
                name: 'Платинум',
                minSpent: 25000,
                cashbackPercent: 20,
                benefits: ['20% кешбэк', 'Персональный менеджер', 'Эксклюзивные предложения']
            }
        ]
    });

    const [activeTab, setActiveTab] = useState<'general' | 'rewards' | 'levels'>('general');
    const [loading, setLoading] = useState(false);

    // Загрузка настроек из API
    useEffect(() => {
        fetchBonusSettings();
    }, []);

    const fetchBonusSettings = async () => {
        try {
            type BonusSettingsAPI = {
                percentage?: number;
                pointsPerRuble?: number;
                multipliers?: Record<string, number>;
                categories?: Record<string, { multiplier: number; name: string }>;
                rewards?: Array<{ points: number; reward: string }>;
                levels?: Array<{ level: number; name: string; minPoints: number; benefits: string }>;
                settings?: {
                    percentage?: number;
                    pointsPerRuble?: number;
                    multipliers?: Record<string, number>;
                    categories?: Record<string, { multiplier: number; name: string }>;
                    rewards?: Array<{ points: number; reward: string }>;
                    levels?: Array<{ level: number; name: string; minPoints: number; benefits: string }>;
                };
            };
            const raw = await api.get<BonusSettingsAPI>('bonus?action=settings');
            const data = raw?.settings ? raw.settings as BonusSettingsAPI : raw;
            // Адаптируем данные из Firebase под формат админки
            setSettings(prev => ({
                ...prev,
                baseRate:
                    (typeof data?.percentage === 'number' ? data.percentage : undefined) ??
                    (typeof data?.pointsPerRuble === 'number' ? data.pointsPerRuble : undefined) ??
                    prev.baseRate ?? 0,
                multipliers: {
                    morningBonus: data?.multipliers?.morningBonus ?? prev.multipliers?.morningBonus ?? 1.5,
                    eveningBonus: data?.multipliers?.eveningBonus ?? prev.multipliers?.eveningBonus ?? 1.2,
                    weekendBonus: data?.multipliers?.weekendBonus ?? prev.multipliers?.weekendBonus ?? 2.0,
                    vipBonus: data?.multipliers?.vipBonus ?? prev.multipliers?.vipBonus ?? 1.5
                },
                categories: Object.fromEntries(
                    Object.entries(prev.categories).map(([key]) => [
                        key, 
                        prev.categories[key] ?? 1
                    ])
                ),
                rewards: prev.rewards,
                levels: prev.levels,
            }));
        } catch (error) {
            console.error('Ошибка загрузки настроек бонусов:', error);
        }
    };

    const saveBonusSettings = async () => {
        setLoading(true);
        try {
            // Отправляем все настройки в Firestore
            const firebaseSettings = {
                baseRate: settings.baseRate, // Базовый процент начисления
                pointsPerRuble: 1,
                minOrderForBonus: 200,
                multipliers: {
                    weekend: settings.multipliers.weekendBonus,
                    morning: settings.multipliers.morningBonus,
                    evening: settings.multipliers.eveningBonus,
                    vip: settings.multipliers.vipBonus
                },
                categories: Object.fromEntries(
                    Object.entries(settings.categories).map(([key, value]) => [
                        key,
                        { multiplier: value, name: key }
                    ])
                ),
                rewards: settings.rewards.map(r => ({
                    id: r.id,
                    points: r.cost,
                    reward: r.name,
                    description: r.description,
                    discount: r.discount,
                    type: r.type,
                    category: r.category,
                    isActive: r.isActive
                })),
                levels: settings.levels.map((l, idx) => ({
                    level: idx + 1,
                    name: l.name,
                    minSpent: l.minSpent,
                    benefits: l.benefits.join(', '),
                    cashbackPercent: l.cashbackPercent
                }))
            };

            console.log('💾 Сохранение настроек бонусов:', firebaseSettings);
            await api.post('bonus?action=settings', firebaseSettings);
            console.log('✅ Настройки бонусов успешно сохранены');
            alert('Настройки успешно сохранены!');
        } catch (error) {
            console.error('❌ Ошибка сохранения настроек:', error);
            alert('Ошибка сохранения настроек');
        } finally {
            setLoading(false);
        }
    };

    const calculateBonus = (orderAmount: number, conditions: {
        isMorning?: boolean;
        isEvening?: boolean;
        isWeekend?: boolean;
        isVip?: boolean;
        category?: string;
    } = {}) => {
        let bonus = (orderAmount * settings.baseRate) / 100;

        // Применяем множители
        if (conditions.isMorning) bonus *= (settings.multipliers?.morningBonus ?? 1);
        if (conditions.isEvening) bonus *= (settings.multipliers?.eveningBonus ?? 1);
        if (conditions.isWeekend) bonus *= (settings.multipliers?.weekendBonus ?? 1);
        if (conditions.isVip) bonus *= (settings.multipliers?.vipBonus ?? 1);

        // Применяем множитель категории
        if (conditions.category && (settings.categories?.[conditions.category])) {
            bonus *= (settings.categories?.[conditions.category] ?? 1);
        }

        return Math.floor(bonus);
    };

    const addNewReward = () => {
        const newReward = {
            id: Date.now().toString(),
            name: 'Новая награда',
            description: 'Описание награды',
            cost: 100,
            discount: 10,
            type: 'percentage' as const,
            isActive: true
        };
        setSettings(prev => ({
            ...prev,
            rewards: [...prev.rewards, newReward]
        }));
    };

    const removeReward = (id: string) => {
        setSettings(prev => ({
            ...prev,
            rewards: prev.rewards.filter(r => r.id !== id)
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ opacity: 1 }}
            className="bg-gradient-to-b from-slate-100 via-slate-100 to-white min-h-screen pb-20"
        >
            <div className="px-4 py-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                            <StarIcon className="w-6 h-6" />
                            Бонусная система
                        </h1>
                        <p className="text-sm text-slate-600">Управление настройками и наградами</p>
                    </div>
                    <Button
                        variant="accent"
                        className="bg-slate-900 hover:bg-black text-white font-bold rounded-full shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]"
                        onClick={saveBonusSettings}
                        disabled={loading}
                        loading={loading}
                    >
                        {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                    {[
                        { id: 'general', name: 'Общие настройки', icon: CogIcon },
                        { id: 'rewards', name: 'Награды', icon: GiftIcon },
                        { id: 'levels', name: 'Уровни', icon: StarIcon }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'general' | 'rewards' | 'levels')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)]'
                                    : 'bg-white text-slate-700 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="whitespace-nowrap">{tab.name}</span>
                        </button>
                    ))}
                </div>

                {/* Общие настройки */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-4 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)]">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                                <CalculatorIcon className="w-5 h-5" />
                                Формула начисления бонусов
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Базовый процент (%)</label>
                                    <input
                                        type="number"
                                        value={String(settings.baseRate || '')}
                                        onChange={(e) => setSettings(prev => ({ ...prev, baseRate: Number(e.target.value) }))}
                                        className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <h4 className="text-md font-semibold mt-6 mb-3 text-slate-900">Множители</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(settings.multipliers || {}).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium mb-2 capitalize text-slate-600">
                                            {key.replace('Bonus', ' бонус')}
                                        </label>
                                        <input
                                            type="number"
                                            value={value}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                multipliers: { ...prev.multipliers, [key]: Number(e.target.value) }
                                            }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                ))}
                            </div>

                            <h4 className="text-md font-semibold mt-6 mb-3 text-slate-900">Множители по категориям</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(settings.categories || {}).map(([category, multiplier]) => (
                                    <div key={category}>
                                        <label className="block text-sm font-medium mb-2 capitalize text-slate-600">{category}</label>
                                        <input
                                            type="number"
                                            value={multiplier}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                categories: { ...prev.categories, [category]: Number(e.target.value) }
                                            }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Калькулятор бонусов */}
                        <div className="bg-white rounded-3xl p-4 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] border border-slate-200">
                            <h3 className="text-lg font-bold mb-4 text-slate-900">Калькулятор бонусов</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Сумма заказа (₸)</label>
                                    <input type="number" placeholder="1000" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" id="order-amount" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Категория</label>
                                    <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" id="category">
                                        {Object.keys(settings.categories || {}).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="rounded-3xl p-3 text-center w-full bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200">
                                        <div className="text-sm text-slate-600">Бонусы к начислению</div>
                                        <div className="text-lg font-bold text-slate-900">
                                            {(() => {
                                                const amount = Number((document.getElementById('order-amount') as HTMLInputElement)?.value || 1000);
                                                const category = (document.getElementById('category') as HTMLSelectElement)?.value || 'coffee';
                                                return calculateBonus(amount, { category });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Награды */}
                {activeTab === 'rewards' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Доступные награды</h3>
                            <button onClick={addNewReward} className="px-4 py-2 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg transition">
                                <PlusIcon className="w-4 h-4" />
                                Добавить награду
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {settings.rewards.map((reward) => (
                                <motion.div key={reward.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)]">
                                    <div className="flex justify-between items-start mb-3">
                                        <input
                                            type="text"
                                            value={reward.name}
                                            onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, name: e.target.value } : r) }))}
                                            className="font-bold bg-transparent border-none text-slate-900 text-lg outline-none"
                                        />
                                        <button
                                            onClick={() => removeReward(reward.id)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <textarea
                                        value={reward.description}
                                        onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, description: e.target.value } : r) }))}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 mb-3"
                                        rows={2}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-600">Стоимость (бонусы)</label>
                                            <input
                                                type="number"
                                                value={String(reward.cost || '')}
                                                onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, cost: Number(e.target.value) } : r) }))}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600">Скидка</label>
                                            <input
                                                type="number"
                                                value={String(reward.discount || '')}
                                                onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, discount: Number(e.target.value) } : r) }))}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-slate-900">
                                            <input
                                                type="checkbox"
                                                checked={reward.isActive}
                                                onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, isActive: e.target.checked } : r) }))}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Активна</span>
                                        </label>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Уровни */}
                {activeTab === 'levels' && (
                    <div className="space-y-4">
                        {settings.levels.map((level, index) => (
                            <div key={index} className="bg-white rounded-3xl p-4 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] border border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Название уровня</label>
                                        <input
                                            type="text"
                                            value={level.name}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, name: e.target.value } : l) }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Мин. сумма покупок (₸)</label>
                                        <input
                                            type="number"
                                            value={String(level.minSpent || '')}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, minSpent: Number(e.target.value) } : l) }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Кешбэк (%)</label>
                                        <input
                                            type="number"
                                            value={String(level.cashbackPercent || '')}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, cashbackPercent: Number(e.target.value) } : l) }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                                            step="1"
                                            min="1"
                                            max="50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-600">Преимущества</label>
                                        <textarea
                                            value={level.benefits.join('\n')}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, benefits: e.target.value.split('\n').filter(b => b.trim()) } : l) }))}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-sm"
                                            rows={3}
                                            placeholder="Каждое преимущество с новой строки"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default BonusManagement;
