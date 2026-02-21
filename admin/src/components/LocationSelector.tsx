// admin/src/components/LocationSelector.tsx
// Dropdown component for selecting active location (owner only)

import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  MapPinIcon,
  ChevronDownIcon,
  CheckIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { useLocation, ALL_LOCATIONS_ID } from "@/contexts/LocationContext";
import { cn } from "@/utils/cn";

export const LocationSelector: React.FC = () => {
  const { locations, selectedLocation, selectedLocationId, selectLocation, isOwner, isAllLocationsSelected } =
    useLocation();

  if (!isOwner || locations.length === 0) {
    return null;
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
        {isAllLocationsSelected ? (
          <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
        ) : (
          <MapPinIcon className="h-5 w-5 text-gray-500" />
        )}
        <span className="max-w-[150px] truncate">
          {isAllLocationsSelected ? "Все точки" : selectedLocation?.name || "Выберите точку"}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1 max-h-96 overflow-y-auto">
            {/* Опция "Все точки" */}
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => selectLocation(ALL_LOCATIONS_ID)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm flex items-start gap-3 transition-colors border-b border-gray-100",
                    active && "bg-gray-50",
                    isAllLocationsSelected && "bg-blue-50"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isAllLocationsSelected ? (
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    ) : (
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      Все точки
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Общая статистика по всем локациям
                    </div>
                  </div>
                </button>
              )}
            </Menu.Item>
            
            {/* Список отдельных точек */}
            {locations.map((location) => (
              <Menu.Item key={location.id}>
                {({ active }) => (
                  <button
                    onClick={() => selectLocation(location.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm flex items-start gap-3 transition-colors",
                      active && "bg-gray-50",
                      selectedLocationId === location.id && "bg-blue-50"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {selectedLocationId === location.id ? (
                        <CheckIcon className="h-5 w-5 text-blue-600" />
                      ) : (
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {location.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {location.address}
                      </div>
                      {!location.isActive && (
                        <div className="text-xs text-red-600 mt-1">
                          Неактивна
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
