/**
 * API Configuration for Workshop
 */

export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const WORKSHOP_API = {
  products: `${API_BASE}/workshop?action=products`,
  categories: `${API_BASE}/workshop?action=categories`,
  orders: `${API_BASE}/workshop?action=orders`,
  clients: `${API_BASE}/workshop?action=clients`,
  analytics: `${API_BASE}/workshop?action=analytics`,
  settings: `${API_BASE}/workshop?action=settings`,
};
