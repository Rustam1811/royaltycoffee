// admin/src/components/LocationFormModal.tsx
// Modal form for creating/editing locations with staff management

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Location, StaffRole, LocationStaff, LocationCoordinates } from "@/types/location";

interface StaffInput {
  email: string;
  name: string;
  role: StaffRole;
}

interface LocationFormData {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  coordinates?: LocationCoordinates;
  staff: StaffInput[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LocationFormData) => Promise<void>;
  location: Location | null;
  existingStaff?: LocationStaff[];
  loading: boolean;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  barista: "Бариста",
  kitchen: "Кухня",
  courier: "Курьер",
};

const AVAILABLE_ROLES: StaffRole[] = ["admin", "barista", "kitchen", "courier"];

export const LocationFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  location,
  existingStaff = [],
  loading,
}) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [staff, setStaff] = useState<StaffInput[]>([]);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setAddress(location.address);
      setPhone(location.phone);
      setIsActive(location.isActive);
      setLat(location.coordinates?.lat?.toString() ?? "");
      setLng(location.coordinates?.lng?.toString() ?? "");
      // Load existing staff
      setStaff(existingStaff.map(s => ({
        email: s.email,
        name: s.name,
        role: s.role,
      })));
    } else {
      setName("");
      setAddress("");
      setPhone("");
      setIsActive(true);
      setLat("");
      setLng("");
      setStaff([]);
    }
  }, [location, existingStaff, isOpen]);

  const addStaff = () => {
    setStaff([...staff, { email: "", name: "", role: "barista" }]);
  };

  const removeStaff = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  const updateStaff = (index: number, field: keyof StaffInput, value: string) => {
    const updated = [...staff];
    updated[index] = { ...updated[index], [field]: value };
    setStaff(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty staff entries
    const validStaff = staff.filter(s => s.email.trim() && s.name.trim());
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const coordinates =
      !isNaN(parsedLat) && !isNaN(parsedLng) ? { lat: parsedLat, lng: parsedLng } : undefined;
    await onSave({ name, address, phone, isActive, coordinates, staff: validStaff });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {location ? "Редактировать точку" : "Добавить точку"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название точки *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Например: SunFood на Абая"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Адрес *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="ул. Абая, 150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+7 (777) 123-45-67"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Coordinates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Координаты (для карты)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="Широта, напр. 43.3045"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="Долгота, напр. 76.9455"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Откройте Google Maps → ПКМ по точке → скопируйте координаты
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Точка активна
                  </label>
                </div>

                {/* Staff Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Сотрудники точки</h3>
                    <button
                      type="button"
                      onClick={addStaff}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Добавить
                    </button>
                  </div>

                  {staff.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-lg">
                      Нет сотрудников. Нажмите "Добавить" чтобы добавить.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {staff.map((s, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Сотрудник {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeStaff(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => updateStaff(idx, "name", e.target.value)}
                              placeholder="Имя"
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                            <select
                              value={s.role}
                              onChange={(e) => updateStaff(idx, "role", e.target.value)}
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            >
                              {AVAILABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="email"
                            value={s.email}
                            onChange={(e) => updateStaff(idx, "email", e.target.value)}
                            placeholder="Email для входа"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
