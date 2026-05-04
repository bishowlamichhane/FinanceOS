import { QueryClient } from '@tanstack/react-query';
import { apiErrorMessage, isApiError } from './client';

/**
 * Single QueryClient for the app. Configured for mobile network reality:
 *  - 30s stale time so views don't re-fetch every focus on a flaky LAN
 *  - Retry 1x with backoff, but never on 4xx (client errors are deterministic)
 *  - No automatic refetch on window focus (RN doesn't really have one anyway)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (isApiError(error)) {
          const status = error.response?.status;
          // Don't retry client errors
          if (status && status >= 400 && status < 500) return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { apiErrorMessage };
