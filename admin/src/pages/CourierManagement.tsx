/**
 * Courier Management Page (Admin)
 * 
 * Manage courier profiles, availability, and performance
 * Senior-level clean code with comprehensive features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlusIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { CourierInfo, CreateCourierData, CourierStats } from '../services/courierService';

const CourierManagement: React.FC = () => {
  const [couriers, setCouriers] = useState<CourierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState<CourierStats | null>(null);
  
  useEffect(() => {
    loadCouriers();
  }, []);
  
  const loadCouriers = async () => {
    try {
      // TODO: Replace with actual API call to get real couriers from Firestore
      // const data = await courierService.getAllCouriers();
      
      setCouriers([]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load couriers:', error);
      setLoading(false);
    }
  };
  
  const handleAddCourier = async (data: CreateCourierData) => {
    try {
      // TODO: API call
      // const newCourier = await courierService.createCourier(data);
      // setCouriers(prev => [...prev, newCourier]);
      
      console.log('Adding courier:', data);
      setShowAddModal(false);
      loadCouriers();
    } catch (error) {
      console.error('Failed to add courier:', error);
    }
  };
  
  const handleToggleAvailability = async (courierId: string, isAvailable: boolean) => {
    try {
      // TODO: API call
      // await courierService.updateCourierAvailability(courierId, isAvailable);
      
      setCouriers(prev =>
        prev.map(c => (c.id === courierId ? { ...c, isAvailable } : c))
      );
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };
  
  const handleDeleteCourier = async (courierId: string) => {
    if (!confirm('Удалить курьера? Это действие нельзя отменить.')) return;
    
    try {
      // TODO: API call
      // await courierService.deleteCourier(courierId);
      
      setCouriers(prev => prev.filter(c => c.id !== courierId));
    } catch (error) {
      console.error('Failed to delete courier:', error);
    }
  };
  
  const handleViewStats = async () => {
    try {
      // TODO: API call
      // const stats = await courierService.getCourierStats(courierId);
      
      // Mock stats
      const mockStats: CourierStats = {
        totalDeliveries: 156,
        completedToday: 12,
        averageRating: 4.8,
        averageDeliveryTime: 28,
        totalEarnings: 234000,
      };
      
      setStats(mockStats);
      setShowStatsModal(true);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-600">Загрузка курьеров...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление курьерами</h1>
            <p className="text-gray-600">Всего курьеров: {couriers.length}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
          >
            <UserPlusIcon className="w-5 h-5" />
            Добавить курьера
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Всего курьеров</p>
                <p className="text-3xl font-bold text-gray-900">{couriers.length}</p>
              </div>
              <UserIcon className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Доступны</p>
                <p className="text-3xl font-bold text-green-600">
                  {couriers.filter(c => c.isAvailable).length}
                </p>
              </div>
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">На доставке</p>
                <p className="text-3xl font-bold text-orange-600">
                  {couriers.filter(c => !c.isAvailable && c.activeOrders.length > 0).length}
                </p>
              </div>
              <TruckIcon className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Средний рейтинг</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {(
                    couriers.reduce((sum, c) => sum + (c.rating || 0), 0) / couriers.length
                  ).toFixed(1)}
                </p>
              </div>
              <span className="text-4xl">⭐</span>
            </div>
          </div>
        </div>
        
        {/* Couriers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {couriers.map(courier => (
            <CourierCard
              key={courier.id}
              courier={courier}
              onToggleAvailability={handleToggleAvailability}
              onDelete={handleDeleteCourier}
              onViewStats={handleViewStats}
            />
          ))}
        </div>
      </div>
      
      {/* Add Courier Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCourierModal
            onSubmit={handleAddCourier}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Stats Modal */}
      <AnimatePresence>
        {showStatsModal && stats && (
          <StatsModal stats={stats} onClose={() => setShowStatsModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Courier Card Component
const CourierCard: React.FC<{
  courier: CourierInfo;
  onToggleAvailability: (id: string, available: boolean) => void;
  onDelete: (id: string) => void;
  onViewStats: () => void;
}> = ({ courier, onToggleAvailability, onDelete, onViewStats }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {courier.photo ? (
          <img
            src={courier.photo}
            alt={courier.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-3xl">
            👤
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{courier.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {courier.isAvailable ? (
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircleIcon className="w-4 h-4" />
                Доступен
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <XCircleIcon className="w-4 h-4" />
                Занят ({courier.activeOrders.length})
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <PhoneIcon className="w-4 h-4" />
          <a href={`tel:${courier.phone}`} className="hover:text-blue-600">
            {courier.phone}
          </a>
        </div>
        
        {courier.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <EnvelopeIcon className="w-4 h-4" />
            <a href={`mailto:${courier.email}`} className="hover:text-blue-600">
              {courier.email}
            </a>
          </div>
        )}
        
        {courier.vehicle && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TruckIcon className="w-4 h-4" />
            <span>
              {courier.vehicle.type === 'car' && '🚗 Автомобиль'}
              {courier.vehicle.type === 'bike' && '🚴 Велосипед'}
              {courier.vehicle.type === 'scooter' && '🛵 Скутер'}
              {courier.vehicle.type === 'walking' && '🚶 Пешком'}
              {courier.vehicle.plate && ` • ${courier.vehicle.plate}`}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm">
          {courier.rating && (
            <span className="font-medium">⭐ {courier.rating.toFixed(1)}</span>
          )}
          {courier.totalDeliveries !== undefined && (
            <span className="text-gray-600">{courier.totalDeliveries} доставок</span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onToggleAvailability(courier.id, !courier.isAvailable)}
          className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            courier.isAvailable
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {courier.isAvailable ? 'Занять' : 'Освободить'}
        </button>
        
        <button
          onClick={onViewStats}
          className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          <ChartBarIcon className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => alert('Редактирование курьера (TODO)')}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => onDelete(courier.id)}
          className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

// Add Courier Modal
const AddCourierModal: React.FC<{
  onSubmit: (data: CreateCourierData) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState<CreateCourierData>({
    name: '',
    phone: '',
    email: '',
    vehicle: { type: 'car' },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Добавить курьера</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+77001234567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Транспорт
              </label>
              <select
                value={formData.vehicle?.type || 'car'}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    vehicle: { type: e.target.value as 'car' | 'bike' | 'scooter' | 'walking' },
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="car">🚗 Автомобиль</option>
                <option value="bike">🚴 Велосипед</option>
                <option value="scooter">🛵 Скутер</option>
                <option value="walking">🚶 Пешком</option>
              </select>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Добавить
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Stats Modal
const StatsModal: React.FC<{
  stats: CourierStats;
  onClose: () => void;
}> = ({ stats, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Статистика курьера</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Всего доставок</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalDeliveries}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Сегодня</span>
            <span className="text-xl font-bold text-green-600">{stats.completedToday}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Средний рейтинг</span>
            <span className="text-xl font-bold text-yellow-600">
              ⭐ {stats.averageRating.toFixed(1)}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Среднее время</span>
            <span className="text-xl font-bold text-blue-600">{stats.averageDeliveryTime} мин</span>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Всего заработано</span>
            <span className="text-xl font-bold text-purple-600">
              {stats.totalEarnings.toLocaleString()} ₸
            </span>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CourierManagement;
