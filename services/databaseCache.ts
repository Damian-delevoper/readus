/**
 * Database Query Cache
 * Simple in-memory cache for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DatabaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Simple pattern matching - supports * wildcard
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const dbCache = new DatabaseCache();

// Cache key generators
export const cacheKeys = {
  document: (id: string) => `document:${id}`,
  documents: () => 'documents:all',
  highlights: (documentId?: string) => documentId ? `highlights:${documentId}` : 'highlights:all',
  notes: (documentId?: string) => documentId ? `notes:${documentId}` : 'notes:all',
  collections: () => 'collections:all',
  bookmarks: (documentId?: string) => documentId ? `bookmarks:${documentId}` : 'bookmarks:all',
};
