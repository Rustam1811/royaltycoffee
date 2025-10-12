// 🔧 Конфигурация API endpoints для продакшена
export const API_CONFIG = {
  // Firebase Functions URLs (продакшн) - обновленный URL для unified API
  FIREBASE_BASE_URL: '/api',
  
  // Local development URLs - используем отдельный API сервер для dev
  LOCAL_BASE_URL: 'http://localhost:3001/api',
  
  // Определяем, какие URL использовать
  get BASE_URL() {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const isMainAppDev = isLocalhost && window.location.port === '5173';
    if (!isMainAppDev) {
      // Всегда используем Firebase Functions для любых окружений, кроме главного dev на 5173
      return this.FIREBASE_BASE_URL;
    }
    return this.LOCAL_BASE_URL;
  },
  
  // API endpoints - теперь используем query параметры
  get ENDPOINTS() {
    const base = this.BASE_URL;
    const isLocal = base === this.LOCAL_BASE_URL;
    
    if (isLocal) {
      // Для локальной разработки используем отдельный API сервер
      return {
        // Новые объединенные endpoints
        AUTH: `${base}/auth`,
        ORDERS: `${base}/orders`, 
        BONUS: `${base}/bonus`,
        PROMO: `${base}/promo`,
        STORIES: `${base}/stories-unified`,
        
        // Legacy endpoints для совместимости (не используются)
        STORIES_OLD: `${base}/stories`,
        PROMOTIONS: `${base}/promotions`,
        BONUS_SETTINGS: `${base}/bonus-settings`,
        USER_BONUS: `${base}/user-bonus`,
        USE_BONUS: `${base}/use-bonus`,
        ORDERS_OLD: `${base}/orders`,
        PROMO_CODES: `${base}/promo-codes`,
        PLACE_ORDER: `${base}/placeOrder`,
        SIMPLE_ORDER: `${base}/simple-order`,
      };
    } else {
      // Для продакшена используем unified API
      return {
        PROMO: `${base}/promo`,
        STORIES: `${base}/stories`,
        PROMOTIONS: `${base}/promo?action=promotions`,
        BONUS_SETTINGS: `${base}/bonus?action=settings`,
        USER_BONUS: `${base}/bonus`,
        USE_BONUS: `${base}/bonus`,
        ORDERS: `${base}/orders`,
        PROMO_CODES: `${base}/promo?action=codes`,
        PLACE_ORDER: `${base}/placeOrder`,
        SIMPLE_ORDER: `${base}/placeOrder`,
      };
    }
  }
};

// 🎯 Утилита для API вызовов
export class ApiService {
  static async request(endpoint: string, options: RequestInit = {}) {
    // Если endpoint - это полный URL, используем его
    const url = endpoint.startsWith('http') || endpoint.startsWith('/') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  }

  // Stories API (использует разные endpoints в зависимости от окружения)
  static stories = {
    getAll: () => {
      return ApiService.request(`${API_CONFIG.ENDPOINTS.STORIES}?action=get`);
    },
    
    create: (data: {
      title: string;
      contentType: 'image' | 'video' | 'text';
      mediaUrl?: string;
      textContent?: string;
      background?: { type: 'color' | 'gradient'; value: string };
      duration?: number;
      link?: string;
      linkText?: string;
      publishAt?: string;
      fileSize?: number;
      originalFileName?: string;
    }) => {
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const isMainAppDev = isLocalhost && window.location.port === '5173';
      const endpoint = isMainAppDev 
        ? `${API_CONFIG.ENDPOINTS.STORIES}?action=create` 
        : 'https://stories-s7q5tqg7zq-uc.a.run.app';
      return ApiService.request(endpoint, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    
    update: (id: string, data: Record<string, unknown>) => {
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const isMainAppDev = isLocalhost && window.location.port === '5173';
      const endpoint = isMainAppDev 
        ? `${API_CONFIG.ENDPOINTS.STORIES}?action=update&id=${id}` 
        : `https://stories-s7q5tqg7zq-uc.a.run.app/${id}`;
      return ApiService.request(endpoint, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    },
    
    delete: async (id: string) => {
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      // Check current port dynamically
      const currentPort = window.location.port;
      const isDevServer = isLocalhost && (currentPort === '5173' || currentPort === '5174' || currentPort === '5175');
      
      if (!id) throw new Error('Story ID required for deletion');
      
      try {
        const endpoint = isDevServer 
          ? `${API_CONFIG.ENDPOINTS.STORIES}?action=delete&id=${id}` 
          : `https://stories-s7q5tqg7zq-uc.a.run.app/${id}`;
        
        const response = await ApiService.request(endpoint, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response || !response.success) {
          throw new Error('Failed to delete story: ' + (response?.error || 'Unknown error'));
        }
        
        return response;
      } catch (error) {
        console.error('Story deletion failed:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to delete story');
      }
    },
    
    recordView: (id: string, userId?: string) => {
      const sessionId = sessionStorage.getItem('story_session_id') || 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionStorage.getItem('story_session_id')) {
        sessionStorage.setItem('story_session_id', sessionId);
      }

      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const isMainAppDev = isLocalhost && window.location.port === '5173';
      const endpoint = isMainAppDev 
        ? `${API_CONFIG.ENDPOINTS.STORIES}?action=view&id=${id}` 
        : `https://stories-s7q5tqg7zq-uc.a.run.app/${id}/view`;
      return ApiService.request(endpoint, { 
        method: 'POST',
        body: JSON.stringify({ userId, sessionId })
      });
    },
    
    getStats: (id: string) => {
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const isMainAppDev = isLocalhost && window.location.port === '5173';
      const endpoint = isMainAppDev 
        ? `${API_CONFIG.ENDPOINTS.STORIES}?action=stats&id=${id}` 
        : `https://stories-s7q5tqg7zq-uc.a.run.app/${id}/stats`;
      return ApiService.request(endpoint);
    },
    
    clone: (id: string) => {
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const isMainAppDev = isLocalhost && window.location.port === '5173';
      const endpoint = isMainAppDev 
        ? `${API_CONFIG.ENDPOINTS.STORIES}?action=clone&id=${id}` 
        : `https://stories-s7q5tqg7zq-uc.a.run.app/${id}/clone`;
      return ApiService.request(endpoint, { 
        method: 'POST' 
      });
    },
  };

  // Promotions API
  static promotions = {
    getAll: (userId?: string) => {
      const url = userId ? `${API_CONFIG.ENDPOINTS.PROMO}?action=promotions&userId=${userId}` : `${API_CONFIG.ENDPOINTS.PROMO}?action=promotions`;
      return ApiService.request(url);
    },
    create: (data: PromotionsCreateData) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=promotions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: PromotionsCreateData) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=promotions&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=promotions&id=${id}`, { method: 'DELETE' }),
    use: (id: string) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=promotions&id=${id}&use=true`, { method: 'POST' }),
  };

  // Achievements API
  static achievements = {
    getAll: () => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements`),
    getUserAchievements: (userId: string) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements&userId=${userId}`),
    create: (data: AchievementCreateData) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: AchievementCreateData) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements&id=${id}`, { method: 'DELETE' }),
    unlock: (userId: string, achievementId: string) => ApiService.request(`${API_CONFIG.ENDPOINTS.PROMO}?action=achievements&userId=${userId}&achievementId=${achievementId}&unlock=true`, { method: 'POST' }),
  };
}

// Тип данных для создания/обновления акции
export interface PromotionsCreateData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  [key: string]: unknown; // Для дополнительных полей, если есть
}

// Тип данных для создания/обновления достижения
export interface AchievementCreateData {
  title: string;
  description: string;
  icon: string;
  condition: string;
  reward: number;
  category: string;
  isActive: boolean;
}

// 🎯 Хук для проверки окружения
export const useEnvironment = () => {
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  const isLocal = window.location.hostname === 'localhost';
  
  return {
    isDev,
    isProd,
    isLocal,
    apiBaseUrl: API_CONFIG.BASE_URL,
    usingFirebase: !isLocal || isProd,
  };
};
