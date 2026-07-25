const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const NO_REFRESH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  constructor(private readonly baseURL: string) {}

  private refreshSession(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data as T;
  }

  private async request<T>(endpoint: string, init: RequestInit, canRefresh = true): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (response.status === 401 && canRefresh && !NO_REFRESH_ENDPOINTS.has(endpoint)) {
      const refreshed = await this.refreshSession();
      if (refreshed) return this.request<T>(endpoint, init, false);
    }

    return this.handleResponse<T>(response);
  }

  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const relativeEndpoint = `${url.pathname}${url.search}`.replace(/^\/api/, '');
    return this.request<T>(relativeEndpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
