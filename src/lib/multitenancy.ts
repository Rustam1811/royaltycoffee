/**
 * Multi-tenancy configuration and utilities
 * Supports multiple cafes with isolated data
 */

export interface CafeConfig {
  id: string;
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  enabled: boolean;
  settings: {
    currency: string;
    timezone: string;
    language: string;
  };
}

export interface TenantContext {
  cafeId: string;
  cafe?: CafeConfig;
}

// Default cafe ID for backward compatibility
export const DEFAULT_CAFE_ID = 'default';

/**
 * Get cafe ID from subdomain or custom domain
 * Examples:
 * - cafe1.coffeeapp.com → cafe1
 * - cafe2.coffeeapp.com → cafe2
 * - localhost → default
 */
export function getCafeIdFromDomain(): string {
  if (typeof window === 'undefined') return DEFAULT_CAFE_ID;

  const hostname = window.location.hostname;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEFAULT_CAFE_ID;
  }

  // Check if it's a subdomain (e.g., cafe1.coffeeapp.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0]; // Return subdomain as cafeId
  }

  // Check custom domain mapping (can be extended)
  const customDomainMap: Record<string, string> = {
    'cafe1.com': 'cafe1',
    'cafe2.com': 'cafe2',
  };

  return customDomainMap[hostname] || DEFAULT_CAFE_ID;
}

/**
 * Get cafe configuration from localStorage or API
 */
export async function getCafeConfig(cafeId: string): Promise<CafeConfig | null> {
  // Try localStorage cache first
  const cached = localStorage.getItem(`cafe_config_${cafeId}`);
  if (cached) {
    try {
      const config = JSON.parse(cached);
      if (config.expiresAt > Date.now()) {
        return config.data;
      }
    } catch {
      // Invalid cache, continue to fetch
    }
  }

  // Fetch from API
  try {
    const response = await fetch(`/api/cafes/${cafeId}`);
    if (!response.ok) return null;

    const config = await response.json();

    // Cache for 1 hour
    localStorage.setItem(`cafe_config_${cafeId}`, JSON.stringify({
      data: config,
      expiresAt: Date.now() + 60 * 60 * 1000,
    }));

    return config;
  } catch {
    return null;
  }
}

/**
 * Build Firestore path with cafe isolation
 * Example: buildCafePath('orders', 'order123') → 'cafes/cafe1/orders/order123'
 */
export function buildCafePath(cafeId: string, collection: string, docId?: string): string {
  const base = `cafes/${cafeId}/${collection}`;
  return docId ? `${base}/${docId}` : base;
}

/**
 * Check if user has access to cafe
 */
export async function checkCafeAccess(userId: string, cafeId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/cafes/${cafeId}/access?userId=${userId}`);
    const data = await response.json();
    return data.hasAccess === true;
  } catch {
    return false;
  }
}
