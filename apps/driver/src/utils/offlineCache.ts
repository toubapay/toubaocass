import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'intercity_driver_offline_cache:';

/**
 * Cache-aside wrapper for a screen's main data fetch: tries the network
 * first and, on success, persists the result for next time. If the fetch
 * fails (most commonly: offline), falls back to whatever was last cached
 * under this key rather than leaving the screen blank — `stale: true` lets
 * the caller show a small "showing cached data" notice. Rethrows when
 * there's no cached fallback, same as an uncached fetch would.
 */
export async function withOfflineCache<T>(key: string, fetcher: () => Promise<T>): Promise<{ data: T; stale: boolean }> {
  const storageKey = STORAGE_PREFIX + key;
  try {
    const data = await fetcher();
    AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
    return { data, stale: false };
  } catch (err) {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached != null) {
      return { data: JSON.parse(cached) as T, stale: true };
    }
    throw err;
  }
}
