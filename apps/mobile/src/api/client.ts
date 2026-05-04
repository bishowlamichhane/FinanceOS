import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { secureStore } from '@/storage/secure';
import { useAuthStore } from '@/state/auth';
import type { AuthTokens } from '@finance-os/contracts';

/**
 * API client.
 *
 * Behaviour:
 *  - Reads access token from auth store on each request.
 *  - On 401: attempts refresh ONCE, queues other requests during the refresh,
 *    replays them with the new token. If refresh fails, signs the user out.
 *  - 5s timeout in dev (LAN can be flaky), 30s for actual API calls.
 *  - Always sends JSON, always parses JSON.
 */

const baseURL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'http://localhost:4000/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — refresh on 401
// ---------------------------------------------------------------------------

let refreshPromise: Promise<AuthTokens> | null = null;

async function performRefresh(): Promise<AuthTokens> {
  const refreshToken = await secureStore.get('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const response = await axios.post<AuthTokens>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 15_000, headers: { 'Content-Type': 'application/json' } },
  );

  const tokens = response.data;
  await useAuthStore.getState().applyTokens(tokens);
  return tokens;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    // Don't try to refresh /auth/refresh itself
    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    try {
      // Coalesce concurrent refreshes — only one network call goes out
      if (!refreshPromise) {
        refreshPromise = performRefresh();
      }
      const tokens = await refreshPromise;
      original.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return apiClient(original);
    } catch (refreshError) {
      // Refresh failed — wipe auth state and let the UI route to /welcome
      await useAuthStore.getState().signOut();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export type ApiErrorBody = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};

export function isApiError(err: unknown): err is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(err);
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (isApiError(err)) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
