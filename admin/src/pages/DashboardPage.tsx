// admin/src/pages/DashboardPage.tsx
// Main dashboard showing overview analytics for all locations (owner only)

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { useLocation } from "@/contexts/LocationContext";
import { locationService } from "@/services/locationService";
import { LocationAnalytics } from "@/types/location";
import { formatCurrency } from "@/utils/format";

export const DashboardPage: React.FC = () => {
  const { isOwner, loading: locationsLoading } = useLocation();
  const [analytics, setAnalytics] = useState<LocationAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!isOwner || locationsLoading) return;

      try {
        setLoading(true);
        setError(null);
        const data = await locationService.getAllLocationsAnalytics();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        console.error("[Dashboard] Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isOwner, locationsLoading]);

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Доступ запрещен</h1>
          <p className="text-gray-600 mt-2">
            Только владелец может просматривать общую аналитику
          </p>
        </div>
      </div>
    );
  }

  if (loading || locationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Ошибка</h1>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const totalRevenue = analytics.reduce((sum, loc) => sum + loc.stats.revenue, 0);
  const totalOrders = analytics.reduce((sum, loc) => sum + loc.stats.orders, 0);
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const sortedByRevenue = [...analytics].sort(
    (a, b) => b.stats.revenue - a.stats.revenue
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Аналитика сети
          </h1>
          <p className="text-gray-600 mt-2">
            Общая статистика по всем {analytics.length} точкам
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard
            icon={<CurrencyDollarIcon className="h-8 w-8" />}
            title="Общая выручка"
            value={formatCurrency(totalRevenue)}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <SummaryCard
            icon={<ShoppingBagIcon className="h-8 w-8" />}
            title="Всего заказов"
            value={totalOrders.toString()}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <SummaryCard
            icon={<ChartBarIcon className="h-8 w-8" />}
            title="Средний чек"
            value={formatCurrency(avgCheck)}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Locations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Рейтинг точек по выручке
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {sortedByRevenue.map((location, index) => (
              <LocationRow
                key={location.id}
                location={location}
                rank={index + 1}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  iconBg: string;
  iconColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  title,
  value,
  iconBg,
  iconColor,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center gap-4">
        <div className={`${iconBg} ${iconColor} rounded-lg p-3`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface LocationRowProps {
  location: LocationAnalytics;
  rank: number;
}

const LocationRow: React.FC<LocationRowProps> = ({ location, rank }) => {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-600 bg-yellow-100";
    if (rank === 2) return "text-gray-600 bg-gray-100";
    if (rank === 3) return "text-orange-600 bg-orange-100";
    return "text-gray-500 bg-gray-50";
  };

  return (
    <div className="px-6 py-4 hover:bg-white transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getRankColor(
            rank
          )}`}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {location.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{location.address}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(location.stats.revenue)}
          </p>
          <p className="text-sm text-gray-600">
            {location.stats.orders} заказов
          </p>
          {location.stats.growth !== 0 && (
            <div
              className={`flex items-center justify-end gap-1 mt-1 text-sm ${
                location.stats.growth > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              <ArrowTrendingUpIcon
                className={`h-4 w-4 ${
                  location.stats.growth < 0 ? "rotate-180" : ""
                }`}
              />
              <span>{Math.abs(location.stats.growth)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
