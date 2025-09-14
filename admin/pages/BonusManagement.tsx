import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    CogIcon, 
    StarIcon, 
    CalculatorIcon,
    CurrencyDollarIcon,
    GiftIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import Button from '../../src/components/ui/Button';

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
        minOrders: number;
        bonusMultiplier: number;
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
                name: 'Новичок',
                minOrders: 0,
                bonusMultiplier: 1.0,
                benefits: ['Базовые бонусы']
            },
            {
                name: 'Любитель',
                minOrders: 10,
                bonusMultiplier: 1.2,
                benefits: ['+20% к бонусам', 'Персональные предложения']
            },
            {
                name: 'Эксперт',
                minOrders: 50,
                bonusMultiplier: 1.5,
                benefits: ['+50% к бонусам', 'Раннее уведомление о новинках', 'Бесплатная доставка']
            },
            {
                name: 'VIP',
                minOrders: 100,
                bonusMultiplier: 2.0,
                benefits: ['+100% к бонусам', 'Персональный менеджер', 'Эксклюзивные предложения']
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
            const response = await fetch('/api/bonus?action=settings');
            if (response.ok) {
                const data = await response.json();
                // Адаптируем данные из Firebase под формат админки
                if (data.percentage !== undefined) {
                    setSettings(prev => ({
                        ...prev,
                        baseRate: data.percentage
                    }));
                } else {
                    setSettings(data);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек бонусов:', error);
        }
    };

    const saveBonusSettings = async () => {
        setLoading(true);
        try {
            // Адаптируем данные под формат Firebase функции
            const firebaseSettings = {
                percentage: settings.baseRate,
                maxBonus: 1000,
                minOrderAmount: 100
            };

            const response = await fetch('/api/bonus?action=settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firebaseSettings)
            });

            if (response.ok) {
                alert('Настройки сохранены!');
            } else {
                alert('Ошибка сохранения настроек');
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения настроек');
        } finally {
            setLoading(false);
        }
    };

    const calculateBonus = (orderAmount: number, conditions: any = {}) => {
        let bonus = (orderAmount * settings.baseRate) / 100;

        // Применяем множители
        if (conditions.isMorning) bonus *= settings.multipliers.morningBonus;
        if (conditions.isEvening) bonus *= settings.multipliers.eveningBonus;
        if (conditions.isWeekend) bonus *= settings.multipliers.weekendBonus;
        if (conditions.isVip) bonus *= settings.multipliers.vipBonus;

        // Применяем множитель категории
        if (conditions.category && settings.categories[conditions.category]) {
            bonus *= settings.categories[conditions.category];
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
            className="bg-[var(--color-bg-base)] min-h-screen"
        >
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-0 z-10 -mx-6 mb-6 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]/80 backdrop-blur-md shadow-card rounded-2xl"
                >
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white font-[var(--font-family-heading)] flex items-center gap-2">
                            <StarIcon className="w-6 h-6 drop-shadow" />
                            Управление бонусной системой
                        </h1>
                        <Button
                            variant="accent"
                            className="bg-slate-900 hover:bg-black text-white font-bold"
                            onClick={saveBonusSettings}
                            disabled={loading}
                            loading={loading}
                        >
                            {loading ? 'Сохранение...' : 'Сохранить настройки'}
                        </Button>
                    </div>
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
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white border-transparent shadow-card'
                                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
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
                        <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 shadow-card border border-[var(--color-border)]">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
                                <CalculatorIcon className="w-5 h-5" />
                                Формула начисления бонусов
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Базовый процент (%)</label>
                                    <input
                                        type="number"
                                        value={settings.baseRate}
                                        onChange={(e) => setSettings(prev => ({ ...prev, baseRate: Number(e.target.value) }))}
                                        className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <h4 className="text-md font-semibold mt-6 mb-3 text-[var(--color-text-primary)]">Множители</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(settings.multipliers).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium mb-2 capitalize text-[var(--color-text-secondary)]">
                                            {key.replace('Bonus', ' бонус')}
                                        </label>
                                        <input
                                            type="number"
                                            value={value}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                multipliers: { ...prev.multipliers, [key]: Number(e.target.value) }
                                            }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                ))}
                            </div>

                            <h4 className="text-md font-semibold mt-6 mb-3 text-[var(--color-text-primary)]">Множители по категориям</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(settings.categories).map(([category, multiplier]) => (
                                    <div key={category}>
                                        <label className="block text-sm font-medium mb-2 capitalize text-[var(--color-text-secondary)]">{category}</label>
                                        <input
                                            type="number"
                                            value={multiplier}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                categories: { ...prev.categories, [category]: Number(e.target.value) }
                                            }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Калькулятор бонусов */}
                        <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 shadow-card border border-[var(--color-border)]">
                            <h3 className="text-lg font-bold mb-4 text-[var(--color-text-primary)]">Калькулятор бонусов</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Сумма заказа (₸)</label>
                                    <input type="number" placeholder="1000" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" id="order-amount" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Категория</label>
                                    <select className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]" id="category">
                                        {Object.keys(settings.categories).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="rounded-2xl p-3 text-center w-full bg-gradient-to-br from-[var(--color-accent-orange)]/10 via-[var(--color-accent-pink)]/10 to-transparent ring-1 ring-[var(--color-accent-orange)]/20">
                                        <div className="text-sm text-[var(--color-text-secondary)]">Бонусы к начислению</div>
                                        <div className="text-lg font-bold text-[var(--color-text-primary)]">
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
                            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Доступные награды</h3>
                            <button onClick={addNewReward} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg transition">
                                <PlusIcon className="w-4 h-4" />
                                Добавить награду
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {settings.rewards.map((reward) => (
                                <motion.div key={reward.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--color-bg-elevated)] rounded-2xl p-4 border border-[var(--color-border)] shadow-card">
                                    <div className="flex justify-between items-start mb-3">
                                        <input
                                            type="text"
                                            value={reward.name}
                                            onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, name: e.target.value } : r) }))}
                                            className="font-bold bg-transparent border-none text-[var(--color-text-primary)] text-lg outline-none"
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
                                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-secondary)] mb-3"
                                        rows={2}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-[var(--color-text-secondary)]">Стоимость (бонусы)</label>
                                            <input
                                                type="number"
                                                value={reward.cost}
                                                onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, cost: Number(e.target.value) } : r) }))}
                                                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[var(--color-text-secondary)]">Скидка</label>
                                            <input
                                                type="number"
                                                value={reward.discount}
                                                onChange={(e) => setSettings(prev => ({ ...prev, rewards: prev.rewards.map(r => r.id === reward.id ? { ...r, discount: Number(e.target.value) } : r) }))}
                                                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-[var(--color-text-primary)]">
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
                            <div key={index} className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 shadow-card border border-[var(--color-border)]">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Название уровня</label>
                                        <input
                                            type="text"
                                            value={level.name}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, name: e.target.value } : l) }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Мин. заказов</label>
                                        <input
                                            type="number"
                                            value={level.minOrders}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, minOrders: Number(e.target.value) } : l) }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Множитель бонусов</label>
                                        <input
                                            type="number"
                                            value={level.bonusMultiplier}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, bonusMultiplier: Number(e.target.value) } : l) }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-[var(--color-text-primary)]"
                                            step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Преимущества</label>
                                        <textarea
                                            value={level.benefits.join('\n')}
                                            onChange={(e) => setSettings(prev => ({ ...prev, levels: prev.levels.map((l, i) => i === index ? { ...l, benefits: e.target.value.split('\n').filter(b => b.trim()) } : l) }))}
                                            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-[var(--color-text-primary)] text-sm"
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
