/**
 * Caching utilities for the application.
 * Provides in-memory and AsyncStorage-based caching with TTL support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// Global memory cache instances
export const apiCache = new MemoryCache(200);
export const imageCache = new MemoryCache(500);

// ===== ASYNC STORAGE CACHE =====
const ASYNC_CACHE_PREFIX = 'alc:cache:';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedAsync<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(ASYNC_CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCachedAsync<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(ASYNC_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail - cache is not critical
  }
}

export async function deleteCachedAsync(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(ASYNC_CACHE_PREFIX + key);
  } catch {
    // Silently fail
  }
}

export async function clearAsyncCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(ASYNC_CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    // Silently fail
  }
}

// ===== LAZY DATA FETCHING =====
type Fetcher<T> = () => Promise<T>;

export async function getOrFetch<T>(
  key: string,
  fetcher: Fetcher<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  // Try memory cache first
  const memCached = apiCache.get<T>(key);
  if (memCached) return memCached;

  // Try AsyncStorage cache
  const asyncCached = await getCachedAsync<T>(key);
  if (asyncCached) {
    apiCache.set(key, asyncCached, ttlMs);
    return asyncCached;
  }

  // Fetch fresh data
  const data = await fetcher();
  apiCache.set(key, data, ttlMs);
  await setCachedAsync(key, data, ttlMs);
  return data;
}

export function invalidateCache(key: string): void {
  apiCache.delete(key);
  void deleteCachedAsync(key);
}

export { MemoryCache };
export type { CacheEntry };