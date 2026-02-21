// admin/src/services/staffService.ts
// Service for staff management — create users, assign roles, manage passwords

import { auth } from '@/lib/firebase';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ============================================================================
// Types
// ============================================================================

export type StaffRole = 'superowner' | 'owner' | 'admin' | 'barista' | 'courier' | 'workshop_owner' | 'workshop_admin' | 'workshop_client';

export interface StaffMember {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: StaffRole | 'user';
  locationId: string | null;
  workshopId: string | null;
  disabled: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  displayName: string;
  role: StaffRole;
  locationId?: string;
  workshopId?: string;
}

export interface UpdateRoleRequest {
  targetEmail?: string;
  targetUid?: string;
  role: StaffRole | 'user';
  locationId?: string;
  workshopId?: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiCall<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAuthToken();
  
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data.data;
}

// ============================================================================
// API
// ============================================================================

export const staffService = {
  /**
   * List all staff (from Firebase Auth with claims)
   */
  async listStaff(): Promise<StaffMember[]> {
    return apiCall<StaffMember[]>('GET', '/roles/staff-full');
  },

  /**
   * Create a new staff user (or update existing)
   */
  async createStaff(data: CreateStaffRequest): Promise<StaffMember & { isNewUser: boolean }> {
    return apiCall('POST', '/roles/create-staff', data);
  },

  /**
   * Update role for existing user
   */
  async updateRole(data: UpdateRoleRequest): Promise<{ uid: string; email: string; role: string }> {
    return apiCall('POST', '/roles/set', data);
  },

  /**
   * Remove role (set to 'user')
   */
  async removeRole(targetUid?: string, targetEmail?: string): Promise<void> {
    await apiCall<void>('POST', '/roles/remove', { targetUid, targetEmail });
  },

  /**
   * Update staff user's password
   */
  async updatePassword(targetUid: string, newPassword: string): Promise<void> {
    await apiCall<void>('POST', '/roles/update-password', { targetUid, newPassword });
  },

  /**
   * Get role for a specific user
   */
  async getRole(email: string): Promise<StaffMember> {
    return apiCall('GET', `/roles/get?email=${encodeURIComponent(email)}`);
  },
};
