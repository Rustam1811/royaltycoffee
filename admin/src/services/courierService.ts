/**
 * Courier Service
 * 
 * CRUD operations for courier management
 * Clean service layer with typed responses
 */

import { API_BASE } from '../config/api';

export interface CourierInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  isAvailable: boolean;
  activeOrders: string[];
  rating?: number;
  totalDeliveries?: number;
  vehicle?: {
    type: 'car' | 'bike' | 'scooter' | 'walking';
    model?: string;
    plate?: string;
  };
  location?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp?: number;
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface CreateCourierData {
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  vehicle?: CourierInfo['vehicle'];
}

export interface UpdateCourierData extends Partial<CreateCourierData> {
  isAvailable?: boolean;
}

export interface CourierStats {
  totalDeliveries: number;
  completedToday: number;
  averageRating: number;
  averageDeliveryTime: number;
  totalEarnings: number;
}

/**
 * Get all couriers
 */
export const getAllCouriers = async (): Promise<CourierInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/couriers`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch couriers: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching couriers:', error);
    throw error;
  }
};

/**
 * Get available couriers only
 */
export const getAvailableCouriers = async (): Promise<CourierInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/couriers?available=true`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch available couriers: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching available couriers:', error);
    throw error;
  }
};

/**
 * Get courier by ID
 */
export const getCourierById = async (courierId: string): Promise<CourierInfo> => {
  try {
    const response = await fetch(`${API_BASE}/couriers/${courierId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch courier: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching courier:', error);
    throw error;
  }
};

/**
 * Create new courier
 */
export const createCourier = async (data: CreateCourierData): Promise<CourierInfo> => {
  try {
    const response = await fetch(`${API_BASE}/couriers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create courier: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating courier:', error);
    throw error;
  }
};

/**
 * Update courier
 */
export const updateCourier = async (
  courierId: string,
  data: UpdateCourierData
): Promise<CourierInfo> => {
  try {
    const response = await fetch(`${API_BASE}/couriers/${courierId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update courier: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating courier:', error);
    throw error;
  }
};

/**
 * Update courier availability
 */
export const updateCourierAvailability = async (
  courierId: string,
  isAvailable: boolean
): Promise<CourierInfo> => {
  return updateCourier(courierId, { isAvailable });
};

/**
 * Update courier location (GPS tracking)
 */
export const updateCourierLocation = async (
  courierId: string,
  location: CourierInfo['location']
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/couriers/${courierId}/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update courier location: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating courier location:', error);
    throw error;
  }
};

/**
 * Delete courier
 */
export const deleteCourier = async (courierId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/couriers/${courierId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete courier: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting courier:', error);
    throw error;
  }
};

/**
 * Get courier statistics
 */
export const getCourierStats = async (courierId: string): Promise<CourierStats> => {
  try {
    const response = await fetch(`${API_BASE}/couriers/${courierId}/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch courier stats: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching courier stats:', error);
    throw error;
  }
};

/**
 * Assign courier to order
 */
export const assignCourierToOrder = async (
  courierId: string,
  orderId: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/assign-courier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courierId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to assign courier: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error assigning courier:', error);
    throw error;
  }
};

/**
 * Unassign courier from order
 */
export const unassignCourierFromOrder = async (orderId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/unassign-courier`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to unassign courier: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error unassigning courier:', error);
    throw error;
  }
};

export default {
  getAllCouriers,
  getAvailableCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  updateCourierAvailability,
  updateCourierLocation,
  deleteCourier,
  getCourierStats,
  assignCourierToOrder,
  unassignCourierFromOrder,
};
