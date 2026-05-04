import { create } from 'zustand';
import { secureStore } from '@/storage/secure';
import { storage } from '@/storage/mmkv';
import { authApi } from '@/api/auth';
import { queryClient } from '@/api/queryClient';
import type { AuthTokens, AuthUser } from '@finance-os/contracts';

/**
 * Auth state machine.
 *
 * Status transitions:
 *
 *   bootstrapping ──refresh ok──▶ authenticated ──app foreground──▶ pin_locked
 *         │                          ▲                                  │
 *         │                          └──────unlocked────────────────────┘
 *         │
 *         └──no token──▶ unauthenticated ──login─▶ authenticated
 *
 * The router observes status and renders:
 *   - bootstrapping  → splash
 *   - unauthenticated → /(auth)/welcome
 *   - authenticated  → /(app)
 *   - pin_locked     → /(auth)/unlock-pin (modal)
 */

const PROFILE_CACHE_KEY = 'auth.profile';
const PIN_HASH_KEY = 'auth.pin_hash_present'; // boolean marker; real hash in SecureStore

export type AuthStatus =
  | 'bootstrapping'
  | 'unauthenticated'
  | 'authenticated'
  | 'pin_locked';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  /** Unix seconds when the access token expires. */
  accessTokenExpiresAt: number | null;
  /** Whether the user has set up a PIN. Affects the lock screen flow. */
  hasPin: boolean;

  // ---- actions ----
  bootstrap: () => Promise<void>;
  applyTokens: (tokens: AuthTokens) => Promise<void>;
  signIn: (input: { email: string; password: string; deviceName?: string }) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => void;
  unlock: () => void;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'bootstrapping',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  hasPin: storage.getBoolean(PIN_HASH_KEY) ?? false,

  // -----------------------------------------------------------------------
  // Bootstrap — called once on app start
  // -----------------------------------------------------------------------
  async bootstrap() {
    try {
      const refreshToken = await secureStore.get('refreshToken');
      if (!refreshToken) {
        set({ status: 'unauthenticated', user: null, accessToken: null });
        return;
      }

      // Try to use refresh to get a fresh pair
      try {
        const tokens = await authApi.refresh(refreshToken);
        await get().applyTokens(tokens);

        // Hydrate user — first from cache, then refresh in background
        const cached = storage.getString(PROFILE_CACHE_KEY);
        if (cached) {
          try {
            set({ user: JSON.parse(cached) as AuthUser });
          } catch {
            /* ignore corrupt cache */
          }
        }
        try {
          const fresh = await authApi.me();
          storage.set(PROFILE_CACHE_KEY, JSON.stringify(fresh));
          set({ user: fresh });
        } catch {
          // Keep cached user if /me fails (offline)
        }

        // If user has a PIN configured, require unlock
        const hasPin = !!(await secureStore.get('pinHash'));
        set({
          status: hasPin ? 'pin_locked' : 'authenticated',
          hasPin,
        });
      } catch {
        await secureStore.clearAuth();
        storage.delete(PROFILE_CACHE_KEY);
        set({ status: 'unauthenticated', user: null, accessToken: null });
      }
    } catch (e) {
      // Catch-all to avoid getting stuck in `bootstrapping`
      set({ status: 'unauthenticated', user: null, accessToken: null });
    }
  },

  async applyTokens(tokens: AuthTokens) {
    await secureStore.set('refreshToken', tokens.refreshToken);
    await secureStore.set('refreshExpiresAt', String(tokens.refreshTokenExpiresAt));
    set({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    });
  },

  async signIn({ email, password, deviceName }) {
    const response = await authApi.login({ email, password, deviceName });
    await get().applyTokens(response.tokens);
    storage.set(PROFILE_CACHE_KEY, JSON.stringify(response.user));
    await secureStore.set('userId', response.user.id);
    set({
      user: response.user,
      status: 'authenticated', // skip PIN on first sign-in; user creates one in onboarding
    });
  },

  async signUp({ email, password, name }) {
    const response = await authApi.register({ email, password, name });
    await get().applyTokens(response.tokens);
    storage.set(PROFILE_CACHE_KEY, JSON.stringify(response.user));
    await secureStore.set('userId', response.user.id);
    set({
      user: response.user,
      status: 'authenticated',
    });
  },

  async signOut() {
    const refreshToken = await secureStore.get('refreshToken');
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {
        /* ignore network errors on logout */
      });
    }
    await secureStore.clearAuth();
    await secureStore.remove('pinHash');
    storage.delete(PROFILE_CACHE_KEY);
    storage.delete(PIN_HASH_KEY);
    // CRITICAL: clear the TanStack Query cache so the next user (if a
    // different account signs in on the same device) doesn't see stale data
    // from the previous session. Query keys are not user-scoped — they
    // assume one user per device-session — so wipe them on every signOut.
    queryClient.clear();
    set({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
      hasPin: false,
    });
  },

  lock() {
    if (get().status === 'authenticated') {
      set({ status: 'pin_locked' });
    }
  },

  unlock() {
    if (get().status === 'pin_locked') {
      set({ status: 'authenticated' });
    }
  },

  // -----------------------------------------------------------------------
  // PIN management
  // -----------------------------------------------------------------------

  async setPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }
    // Hash with a salt derived from userId. Not Argon2 — that's overkill for
    // a 4-digit PIN whose security model is "device + biometric". Simple
    // SHA-256 with userId as salt is sufficient since the PIN is verified
    // locally and the SecureStore protects the hash.
    const userId = await secureStore.get('userId');
    if (!userId) throw new Error('Cannot set PIN before sign-in');
    const hash = await sha256(`${userId}:${pin}`);
    await secureStore.set('pinHash', hash);
    storage.set(PIN_HASH_KEY, true);
    set({ hasPin: true });
  },

  async verifyPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) return false;
    const userId = await secureStore.get('userId');
    const stored = await secureStore.get('pinHash');
    if (!userId || !stored) return false;
    const computed = await sha256(`${userId}:${pin}`);
    return computed === stored;
  },

  async refreshUser() {
    try {
      const user = await authApi.me();
      storage.set(PROFILE_CACHE_KEY, JSON.stringify(user));
      set({ user });
    } catch {
      /* keep cached */
    }
  },
}));

// ---- helpers ----

async function sha256(input: string): Promise<string> {
  // expo-crypto is the platform-correct choice; lazy-imported to keep boot lean
  const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, input);
}
