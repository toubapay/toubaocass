import { createApiClient, extractErrorMessage, setActiveClient } from 'shared-web/src/api/client';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api';

const { apiClient, setAuthToken, getStoredToken, setUnauthorizedHandler } = createApiClient(
  'intercity_driver_web_token',
  apiBaseUrl,
);
setActiveClient(apiClient);

export { apiClient, setAuthToken, getStoredToken, setUnauthorizedHandler, extractErrorMessage };
