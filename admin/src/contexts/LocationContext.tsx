// admin/src/contexts/LocationContext.tsx
// Context for managing multi-location state across admin panel

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  FC,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { Location, DEFAULT_LOCATION_ID } from "../types/location";
import { locationService } from "@/services/locationService";
import { UserContext } from "./UserContext";

// Специальное значение для "Все точки"
export const ALL_LOCATIONS_ID = "__all__";

interface LocationContextValue {
  locations: Location[];
  selectedLocation: Location | null;
  selectedLocationId: string; // Может быть id точки или ALL_LOCATIONS_ID
  loading: boolean;
  error: Error | null;
  selectLocation: (locationId: string) => void;
  refreshLocations: () => Promise<void>;
  isOwner: boolean;
  isSuperOwner: boolean;
  isAllLocationsSelected: boolean;
  // Утилита для фильтрации данных по текущей локации
  filterByLocation: <T extends { locationId?: string }>(items: T[]) => T[];
}

export const LocationContext = createContext<LocationContextValue>({
  locations: [],
  selectedLocation: null,
  selectedLocationId: ALL_LOCATIONS_ID,
  loading: true,
  error: null,
  selectLocation: () => {},
  refreshLocations: async () => {},
  isOwner: false,
  isSuperOwner: false,
  isAllLocationsSelected: true,
  filterByLocation: (items) => items,
});

interface Props {
  children: ReactNode;
}

export const LocationProvider: FC<Props> = ({ children }) => {
  const { user } = useContext(UserContext);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => localStorage.getItem("selectedLocationId") || ALL_LOCATIONS_ID
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isOwner = useMemo(() => user?.role === "owner" || user?.role === "superowner", [user?.role]);
  const isSuperOwner = useMemo(() => user?.role === "superowner", [user?.role]);

  // Проверка выбраны ли "Все точки"
  const isAllLocationsSelected = useMemo(() => {
    return selectedLocationId === ALL_LOCATIONS_ID;
  }, [selectedLocationId]);

  // Для не-owner используем locationId из user
  const effectiveLocationId = useMemo(() => {
    if (isOwner) {
      return selectedLocationId; // Owner может выбирать любую точку или все
    }
    // Staff видит только свою точку
    return user?.locationId || DEFAULT_LOCATION_ID;
  }, [isOwner, selectedLocationId, user?.locationId]);

  // Fetch locations on mount
  const refreshLocations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await locationService.getLocations();
      setLocations(data);

      // Для ALL_LOCATIONS_ID не сбрасываем - это валидное значение
      // Сбрасываем только если выбрана конкретная точка, которой нет
      if (selectedLocationId !== ALL_LOCATIONS_ID && !data.find((loc) => loc.id === selectedLocationId)) {
        setSelectedLocationId(ALL_LOCATIONS_ID);
        localStorage.setItem("selectedLocationId", ALL_LOCATIONS_ID);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load locations");
      setError(error);
      console.error("[LocationContext] Error loading locations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedLocationId]);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  // Persist selected location (only works for owner)
  const selectLocation = useCallback((locationId: string) => {
    if (!isOwner) return; // Staff не может менять точку
    setSelectedLocationId(locationId);
    localStorage.setItem("selectedLocationId", locationId);
  }, [isOwner]);

  // selectedLocation = null если выбраны "Все точки"
  const selectedLocation = useMemo(
    () => {
      if (effectiveLocationId === ALL_LOCATIONS_ID) return null;
      return locations.find((loc) => loc.id === effectiveLocationId) || null;
    },
    [locations, effectiveLocationId]
  );

  // Утилита для фильтрации данных по текущей локации
  const filterByLocation = useCallback(<T extends { locationId?: string }>(items: T[]): T[] => {
    // Если выбраны все точки - возвращаем все
    if (effectiveLocationId === ALL_LOCATIONS_ID) {
      return items;
    }
    // Иначе фильтруем по locationId
    return items.filter(item => item.locationId === effectiveLocationId);
  }, [effectiveLocationId]);

  const value = useMemo(
    () => ({
      locations,
      selectedLocation,
      selectedLocationId: effectiveLocationId,
      loading,
      error,
      selectLocation,
      refreshLocations,
      isOwner,
      isSuperOwner,
      isAllLocationsSelected: effectiveLocationId === ALL_LOCATIONS_ID,
      filterByLocation,
    }),
    [
      locations,
      selectedLocation,
      effectiveLocationId,
      loading,
      error,
      selectLocation,
      refreshLocations,
      isOwner,
      isSuperOwner,
      filterByLocation,
    ]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }
  return context;
};
