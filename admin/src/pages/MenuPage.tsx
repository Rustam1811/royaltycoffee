/**
 * MenuPage — Единая страница меню (читает из menuCategories / menuItems)
 * Синхронизирована с MenuEditorPageNew и клиентским приложением
 */

import React, { useEffect, useState, useMemo, useContext } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MenuService,
  MenuCategory,
  MenuItem,
} from "@/services/menuService";
import { UserContext } from "@/contexts/UserContext";
import {
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  Squares2X2Icon,
  SparklesIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

/* ─── Helpers ────────────────────────────────────── */

const badgeColors: Record<string, string> = {
  HIT: "bg-red-500 text-white",
  NEW: "bg-emerald-500 text-white",
  SALE: "bg-amber-500 text-white",
  PROMO: "bg-violet-500 text-white",
};

/* ─── Component ──────────────────────────────────── */

const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "popular">("name");
  const [filterAvailable, setFilterAvailable] = useState<"all" | "yes" | "no">("all");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const { user, loading: authLoading } = useContext(UserContext);
  const prefersReduced = useReducedMotion();

  /* ── Data subscriptions ── */
  useEffect(() => {
    if (authLoading) return;
    const unsubCats = MenuService.listenCategories(setCategories);
    const unsubItems = MenuService.listenItems(setItems);
    setLoading(false);
    return () => { unsubCats(); unsubItems(); };
  }, [authLoading]);

  /* ── Derived data ── */
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; available: number }> = {};
    items.forEach(item => {
      if (!map[item.categoryId]) map[item.categoryId] = { total: 0, available: 0 };
      map[item.categoryId].total++;
      if (item.isAvailable) map[item.categoryId].available++;
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = selectedCategory === "all"
      ? [...items]
      : items.filter(i => i.categoryId === selectedCategory);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.nameEn || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q)
      );
    }

    if (filterAvailable === "yes") list = list.filter(i => i.isAvailable);
    if (filterAvailable === "no") list = list.filter(i => !i.isAvailable);

    list.sort((a, b) => {
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "popular") return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
      return a.name.localeCompare(b.name, "ru");
    });

    return list;
  }, [items, selectedCategory, search, filterAvailable, sortBy]);

  /* ── Handlers ── */
  const handleToggle = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await MenuService.toggleAvailability(id, !current);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить "${name}"? Это действие необратимо.`)) return;
    await MenuService.deleteItem(id);
  };

  /* ── Loading / Auth ── */
  if (loading || authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Загрузка меню…</p>
        </div>
      </div>
    );
  }

  const anim = prefersReduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <motion.div {...anim} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Squares2X2Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Меню</h1>
            <p className="text-sm text-slate-500">
              {categories.length} категорий · {items.length} позиций ·{" "}
              <span className="text-green-600">{items.filter(i => i.isAvailable).length} доступно</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── Search + Filters ─── */}
      <motion.div {...anim} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по меню…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition"
          />
        </div>
        <div className="relative">
          <ArrowsUpDownIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="name">По названию</option>
            <option value="price">По цене</option>
            <option value="popular">Популярные</option>
          </select>
        </div>
        <div className="relative">
          <FunnelIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filterAvailable}
            onChange={e => setFilterAvailable(e.target.value as typeof filterAvailable)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="all">Все статусы</option>
            <option value="yes">✅ Доступные</option>
            <option value="no">❌ Скрытые</option>
          </select>
        </div>
      </motion.div>

      {/* ─── Categories horizontal scroll ─── */}
      <motion.div {...anim} transition={{ delay: 0.1 }}>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
              selectedCategory === "all"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span className="text-base">📋</span>
            <span>Все</span>
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              selectedCategory === "all" ? "bg-white/20" : "bg-slate-100"
            }`}>
              {items.length}
            </span>
          </button>

          {categories.map(cat => {
            const stats = categoryStats[cat.id] || { total: 0, available: 0 };
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <span className="text-base">{cat.icon || "☕"}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20" : "bg-slate-100"
                }`}>
                  {stats.available}/{stats.total}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Items Grid ─── */}
      {filteredItems.length === 0 ? (
        <motion.div {...anim} className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            {search ? (
              <MagnifyingGlassIcon className="w-10 h-10 text-slate-300" />
            ) : (
              <SparklesIcon className="w-10 h-10 text-orange-300" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {search ? "Ничего не найдено" : "Пока нет позиций"}
          </h3>
          <p className="text-sm text-slate-500">
            {search
              ? `По запросу «${search}» ничего не найдено`
              : "Добавьте первую позицию через Редактор меню"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const cat = categories.find(c => c.id === item.categoryId);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className={`group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
                    !item.isAvailable ? "opacity-60 grayscale-[30%]" : ""
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-50 to-pink-50 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-14 h-14 text-orange-200" />
                      </div>
                    )}

                    {/* Badges top-left */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {item.isPopular && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm">
                          <FireIcon className="w-3 h-3" /> Хит
                        </span>
                      )}
                      {item.badges?.map(b => (
                        <span key={b} className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${badgeColors[b] || "bg-slate-500 text-white"}`}>
                          {b}
                        </span>
                      ))}
                      {!item.isAvailable && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-white shadow-sm">
                          Скрыто
                        </span>
                      )}
                    </div>

                    {/* Category badge top-right */}
                    {cat && (
                      <span className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white/80 backdrop-blur text-[10px] font-medium text-slate-700 shadow-sm">
                        {cat.icon} {cat.name}
                      </span>
                    )}

                    {/* Quick actions on hover */}
                    <div className="absolute bottom-0 inset-x-0 p-2 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/30 to-transparent">
                      <button
                        onClick={() => handleToggle(item.id, item.isAvailable)}
                        disabled={toggling === item.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow transition-colors ${
                          item.isAvailable
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-white hover:bg-slate-100 text-slate-500"
                        }`}
                        title={item.isAvailable ? "Скрыть" : "Показать"}
                      >
                        {toggling === item.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : item.isAvailable ? (
                          <EyeIcon className="w-4 h-4" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow transition-colors"
                        title="Удалить"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 mb-0.5 line-clamp-1 leading-tight">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                        {item.price.toLocaleString("ru")} ₸
                      </span>
                      <div className="flex items-center gap-1">
                        {item.isAvailable ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-slate-400" />
                        )}
                        {item.energy ? (
                          <span className="text-[10px] text-slate-400 ml-1">{item.energy} ккал</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MenuPage;