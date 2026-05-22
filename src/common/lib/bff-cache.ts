type CacheEntry<T> = {
  data: T;
  freshUntil: number;
  staleUntil: number;
};

const store = new Map<string, CacheEntry<unknown>>();

const FRESH_MS = 3 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

export function cacheGet<T>(key: string): { data: T; stale: boolean } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  if (now <= entry.freshUntil) return { data: entry.data, stale: false };
  if (now <= entry.staleUntil) return { data: entry.data, stale: true };
  store.delete(key);
  return null;
}

export function cacheSet<T>(key: string, data: T) {
  const now = Date.now();
  store.set(key, {
    data,
    freshUntil: now + FRESH_MS,
    staleUntil: now + STALE_MS,
  });
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit && !hit.stale) return hit.data;

  try {
    const data = await fetcher();
    cacheSet(key, data);
    return data;
  } catch (error) {
    if (hit) return hit.data;
    throw error;
  }
}
