import { createApiClient, extractErrorMessage } from 'shared-web/src/api/client';

export const apiBaseUrl =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/admin';

const { apiClient, setAuthToken, getStoredToken, setUnauthorizedHandler } = createApiClient(
  'intercity_admin_token',
  apiBaseUrl,
);

export { apiClient, setAuthToken, getStoredToken, setUnauthorizedHandler, extractErrorMessage };
