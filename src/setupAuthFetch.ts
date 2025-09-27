import { getAuth } from 'firebase/auth';

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

      const isApiRequest = /^\/api\b/.test(url) || url.startsWith(`${window.location.origin}/api`);

      if (!isApiRequest) {
        return originalFetch(input, init);
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return originalFetch(input, init);
      }

      const token = await currentUser.getIdToken();
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      headers.set('Authorization', `Bearer ${token}`);

      const config: RequestInit = {
        credentials: init?.credentials ?? 'include',
        ...init,
        headers
      };

      if (input instanceof Request) {
        return originalFetch(new Request(input, config));
      }

      return originalFetch(input, config);
    } catch (error) {
      console.error('Failed to attach auth token to fetch request:', error);
      return originalFetch(input, init);
    }
  };
}
