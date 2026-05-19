// admin/src/services/locationService.ts
// Service layer for location management API

import { apiUrl } from "../config/api";
import { Location, LocationStats, LocationAnalytics, LocationStaff, StaffRole } from "../types/location";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StaffInput {
  email: string;
  name: string;
  role: string;
}

class LocationService {
  /**
   * Fetch all locations
   */
  async getLocations(): Promise<Location[]> {
    const url = apiUrl("/locations", { action: "list" });
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    const result: ApiResponse<Location[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load locations");
    }

    return result.data;
  }

  /**
   * Get location by ID
   */
  async getLocation(locationId: string): Promise<Location> {
    const url = apiUrl("/locations", { action: "get", id: locationId });
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch location: ${response.statusText}`);
    }

    const result: ApiResponse<Location> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load location");
    }

    return result.data;
  }

  /**
   * Create new location
   */
  async createLocation(
    data: Omit<Location, "id" | "createdAt" | "updatedAt">
  ): Promise<Location> {
    const url = apiUrl("/locations", { action: "create" });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create location: ${response.statusText}`);
    }

    const result: ApiResponse<Location> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to create location");
    }

    return result.data;
  }

  /**
   * Update existing location
   */
  async updateLocation(
    locationId: string,
    data: Partial<Omit<Location, "id" | "createdAt" | "updatedAt">>
  ): Promise<Location> {
    const url = apiUrl("/locations", { action: "update", id: locationId });
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update location: ${response.statusText}`);
    }

    const result: ApiResponse<Location> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to update location");
    }

    return result.data;
  }

  /**
   * Delete location
   */
  async deleteLocation(locationId: string): Promise<void> {
    const url = apiUrl("/locations", { action: "delete", id: locationId });
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete location: ${response.statusText}`);
    }

    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Failed to delete location");
    }
  }

  /**
   * Get stats for a specific location
   */
  async getLocationStats(locationId: string): Promise<LocationStats> {
    const url = apiUrl("/locations", { action: "stats", id: locationId });
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch location stats: ${response.statusText}`);
    }

    const result: ApiResponse<LocationStats> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load location stats");
    }

    return result.data;
  }

  /**
   * Get analytics for all locations
   */
  async getAllLocationsAnalytics(): Promise<LocationAnalytics[]> {
    const url = apiUrl("/locations", { action: "analytics" });
    const response = await fetch(url, {
      credentials: "include",
    });

    const result: ApiResponse<LocationAnalytics[]> = await response.json();
    
    if (!response.ok || !result.success) {
      // Return empty array on error to prevent dashboard crash
      console.warn('[LocationService] Analytics error:', result.error || response.statusText);
      return [];
    }

    return result.data || [];
  }

  /**
   * Get staff for a specific location
   */
  async getLocationStaff(locationId: string): Promise<LocationStaff[]> {
    const url = apiUrl("/locations", { action: "staff", id: locationId });
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch staff: ${response.statusText}`);
    }

    const result: ApiResponse<LocationStaff[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load staff");
    }

    return result.data;
  }

  /**
   * Save staff for a location (replaces existing staff)
   */
  async saveLocationStaff(locationId: string, staff: StaffInput[]): Promise<void> {
    const url = apiUrl("/locations", { action: "saveStaff", id: locationId });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ staff }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save staff: ${response.statusText}`);
    }

    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Failed to save staff");
    }
  }

  /**
   * Get staff member's location by email
   */
  async getStaffLocation(email: string): Promise<{ locationId: string; role: StaffRole } | null> {
    const url = apiUrl("/locations", { action: "staffByEmail", email });
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const result: ApiResponse<{ locationId: string; role: StaffRole }> = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  }
}

export const locationService = new LocationService();
