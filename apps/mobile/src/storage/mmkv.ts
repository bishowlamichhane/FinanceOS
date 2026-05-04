import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Non-sensitive cache.
 *
 * Originally backed by MMKV (faster, sync). Switched to AsyncStorage so the
 * app runs in Expo Go without a custom dev client. The wrapper exposes a
 * sync-feeling API for the small number of synchronous call sites we have;
 * under the hood writes are async-and-fire-forget.
 *
 * Phase 5 will switch back to MMKV once we ship a custom dev client.
 */

class StorageWrapper {
  private cache = new Map<string, string | boolean>();
  private hydrated = false;

  /** Call once during bootstrap to hydrate the in-memory cache from disk. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [key, value] of pairs) {
        if (value !== null) this.cache.set(key, value);
      }
    } catch {
      /* ignore — start fresh */
    }
    this.hydrated = true;
  }

  getString(key: string): string | undefined {
    const v = this.cache.get(key);
    return typeof v === 'string' ? v : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const v = this.cache.get(key);
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return undefined;
  }

  set(key: string, value: string | boolean): void {
    this.cache.set(key, value);
    void AsyncStorage.setItem(key, String(value)).catch(() => {});
  }

  delete(key: string): void {
    this.cache.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {});
  }
}

export const storage = new StorageWrapper();