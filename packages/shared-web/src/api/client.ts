import axios, { AxiosInstance } from 'axios';

const REQUEST_TIMEOUT_MS = 15000;

export interface ApiClientHandle {
  apiClient: AxiosInstance;
  setAuthToken: (token: string | null) => void;
  getStoredToken: () => string | null;
  /** Called once at app startup with a callback that clears the signed-in user and routes to sign-in. */
  setUnauthorizedHandler: (handler: (() => void) | null) => void;
}

/**
 * Builds an axios instance wired up with bearer-token auth, a request
 * timeout, and a 401 response interceptor that clears the session.
 * `tokenKey` is the caller's own localStorage key — kept distinct per app
 * (not a single shared literal) on general principle, though in practice
 * each of these apps is already served from its own origin, so localStorage
 * wouldn't collide either way.
 */
export function createApiClient(tokenKey: string, baseUrl: string): ApiClientHandle {
  let authToken: string | null = localStorage.getItem(tokenKey);
  let onUnauthorized: (() => void) | null = null;

  const apiClient = axios.create({
    baseURL: baseUrl,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
  });

  function setAuthToken(token: string | null): void {
    authToken = token;
    if (token) {
      localStorage.setItem(tokenKey, token);
    } else {
      localStorage.removeItem(tokenKey);
    }
  }

  function getStoredToken(): string | null {
    return authToken;
  }

  function setUnauthorizedHandler(handler: (() => void) | null): void {
    onUnauthorized = handler;
  }

  apiClient.interceptors.request.use((config) => {
    if (authToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401 && authToken) {
        setAuthToken(null);
        onUnauthorized?.();
      }
      return Promise.reject(error);
    },
  );

  return { apiClient, setAuthToken, getStoredToken, setUnauthorizedHandler };
}

// web and driver-web are served from the same origin in production (see
// nginx.frontends.conf.template: `/` vs `/driver/`), so their apiClient
// instances can't be a single shared literal-keyed singleton here — each
// app builds its own via createApiClient() above with its own token key,
// then registers it here so the shared API modules (addresses.ts,
// anando.ts, etc., which only need to make requests, not manage auth) know
// which instance to call.
let activeClient: AxiosInstance | null = null;

export function setActiveClient(client: AxiosInstance): void {
  activeClient = client;
}

export function getActiveClient(): AxiosInstance {
  if (!activeClient) {
    throw new Error('shared-web apiClient not initialized — setActiveClient() must run at app startup.');
  }
  return activeClient;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey) return data.errors[firstKey][0];
    }
    if (data?.message) return data.message;
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}
