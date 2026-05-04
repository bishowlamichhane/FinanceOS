import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '@finance-os/contracts';
import { apiClient } from './client';

/**
 * Auth service. Thin typed wrappers over the API.
 * Functions only — no caching/state. State lives in the auth store.
 */

export const authApi = {
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const { data } = await apiClient.post<{ resetToken?: string }>('/auth/forgot-password', { email });
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },
};
