import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage — uses iOS Keychain / Android Keystore.
 *
 * Only for sensitive values. All four token-related slots namespaced under
 * `auth.*` so we can wipe them in one pass on logout.
 */

const KEYS = {
  refreshToken: 'auth.refresh_token',
  refreshExpiresAt: 'auth.refresh_expires_at',
  userId: 'auth.user_id',
  pinHash: 'auth.pin_hash',
} as const;

export type SecureKey = keyof typeof KEYS;

export const secureStore = {
  async get(key: SecureKey): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS[key]);
    } catch {
      return null;
    }
  },

  async set(key: SecureKey, value: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS[key], value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  async remove(key: SecureKey): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEYS[key]);
    } catch {
      // Idempotent
    }
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      this.remove('refreshToken'),
      this.remove('refreshExpiresAt'),
      this.remove('userId'),
    ]);
  },
};
