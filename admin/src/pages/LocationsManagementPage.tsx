// admin/src/pages/LocationsManagementPage.tsx
// Page for managing coffee shop locations (owner only)

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useLocation } from "@/contexts/LocationContext";
import { locationService } from "@/services/locationService";
import { Location, MAX_LOCATIONS, LocationStaff } from "@/types/location";
import { LocationFormModal } from "@/components/LocationFormModal";

export const LocationsManagementPage: React.FC = () => {
  const { locations, isSuperOwner, refreshLocations, loading } = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingStaff, setEditingStaff] = useState<LocationStaff[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isSuperOwner) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Доступ запрещен</h1>
          <p className="text-gray-600 mt-2">
            Только супервладелец может управлять точками
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (locations.length >= MAX_LOCATIONS) {
      alert(`Максимум ${MAX_LOCATIONS} точек`);
      return;
    }
    setEditingLocation(null);
    setEditingStaff([]);
    setShowModal(true);
  };

  const handleEdit = async (location: Location) => {
    setEditingLocation(location);
    try {
      const staff = await locationService.getLocationStaff(location.id);
      setEditingStaff(staff);
    } catch (error) {
      console.error("[LocationsManagement] Error loading staff:", error);
      setEditingStaff([]);
    }
    setShowModal(true);
  };

  const handleDelete = async (locationId: string) => {
    if (deleteConfirm !== locationId) {
      setDeleteConfirm(locationId);
      return;
    }

    try {
      setActionLoading(true);
      await locationService.deleteLocation(locationId);
      await refreshLocations();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("[LocationsManagement] Delete error:", error);
      alert(error instanceof Error ? error.message : "Ошибка удаления");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (data: { name: string; address: string; phone: string; isActive: boolean; coordinates?: { lat: number; lng: number }; twogisId?: string; staff: { email: string; name: string; role: string }[] }) => {
    try {
      setActionLoading(true);
      const { staff, ...locationData } = data;
      
      let locationId: string;
      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, locationData);
        locationId = editingLocation.id;
      } else {
        const newLocation = await locationService.createLocation(locationData);
        locationId = newLocation.id;
      }
      
      // Save staff for this location
      if (staff.length > 0) {
        await locationService.saveLocationStaff(locationId, staff);
      }
      
      await refreshLocations();
      setShowModal(false);
      setEditingLocation(null);
      setEditingStaff([]);
    } catch (error) {
      console.error("[LocationsManagement] Save error:", error);
      alert(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Управление точками
            </h1>
            <p className="text-gray-600 mt-2">
              {locations.length} из {MAX_LOCATIONS} точек
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={locations.length >= MAX_LOCATIONS}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Добавить точку
          </button>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {locations.map((location) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="bg-blue-100 text-blue-600 rounded-lg p-3">
                      <MapPinIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {location.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {location.address}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{location.phone}</p>
                    {!location.isActive && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded">
                        Неактивна
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(location)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    disabled={actionLoading}
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      deleteConfirm === location.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-red-600 bg-red-50 hover:bg-red-100"
                    }`}
                    title={
                      deleteConfirm === location.id
                        ? "Нажмите еще раз для подтверждения"
                        : "Удалить"
                    }
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {locations.length === 0 && (
          <div className="text-center py-12">
            <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Нет точек
            </h3>
            <p className="text-gray-600 mt-2">
              Добавьте первую точку для начала работы
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <LocationFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLocation(null);
          setEditingStaff([]);
        }}
        onSave={handleSave}
        location={editingLocation}
        existingStaff={editingStaff}
        loading={actionLoading}
      />
    </div>
  );
};
