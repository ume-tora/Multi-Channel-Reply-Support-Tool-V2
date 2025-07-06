/**
 * Centralized Chrome Storage API manager with consistent error handling and type safety
 */

export type StorageKey = 'settings.apiKey' | 'settings.userSettings' | string;

export interface StorageItem<T = unknown> {
  value: T;
  expiresAt?: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export class ChromeStorageManager {
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly CACHE_PREFIX = 'cache';

  /**
   * Get a value from Chrome storage
   */
  static async get<T = unknown>(key: StorageKey): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`ChromeStorageManager: Error getting key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a value in Chrome storage
   */
  static async set<T = unknown>(key: StorageKey, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`ChromeStorageManager: Error setting key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get multiple values from Chrome storage
   */
  static async getMultiple<T extends Record<string, any>>(keys: StorageKey[]): Promise<Partial<T>> {
    try {
      const result = await chrome.storage.local.get(keys);
      return result as Partial<T>;
    } catch (error) {
      console.error('ChromeStorageManager: Error getting multiple keys:', error);
      return {};
    }
  }

  /**
   * Set multiple values in Chrome storage
   */
  static async setMultiple<T extends Record<string, any>>(items: T): Promise<void> {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('ChromeStorageManager: Error setting multiple items:', error);
      throw error;
    }
  }

  /**
   * Remove a key from Chrome storage
   */
  static async remove(key: StorageKey): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`ChromeStorageManager: Error removing key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all data from Chrome storage
   */
  static async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('ChromeStorageManager: Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  static async getUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const used = await chrome.storage.local.getBytesInUse();
      const total = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
      return {
        used,
        total,
        percentage: (used / total) * 100
      };
    } catch (error) {
      console.error('ChromeStorageManager: Error getting storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // === Cached Storage Methods ===

  /**
   * Get a cached value with automatic expiration
   */
  static async getCached<T = unknown>(
    channel: string, 
    threadId: string
  ): Promise<T | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
      const cached = await this.get<StorageItem<T>>(cacheKey);
      
      if (!cached) {
        return null;
      }

      // Check expiration
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.remove(cacheKey);
        return null;
      }

      return cached.value;
    } catch (error) {
      console.error('ChromeStorageManager: Error getting cached value:', error);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   */
  static async setCached<T = unknown>(
    channel: string, 
    threadId: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
      const ttl = options.ttl || this.DEFAULT_TTL;
      
      const cacheItem: StorageItem<T> = {
        value,
        expiresAt: Date.now() + ttl
      };

      await this.set(cacheKey, cacheItem);
    } catch (error) {
      console.error('ChromeStorageManager: Error setting cached value:', error);
      throw error;
    }
  }

  /**
   * Clear expired cache entries safely with proper error handling
   */
  static async clearExpiredCache(): Promise<number> {
    try {
      // Multiple safety checks for extension context
      if (!this.isExtensionContextValid()) {
        return 0;
      }

      let allData: Record<string, any>;
      try {
        allData = await chrome.storage.local.get();
      } catch (storageError) {
        console.warn('ChromeStorageManager: Storage access failed during cache cleanup');
        return 0;
      }

      const now = Date.now();
      const keysToRemove: string[] = [];

      // Identify expired cache entries
      for (const [key, value] of Object.entries(allData)) {
        if (this.isCacheKey(key) && this.isCacheItemExpired(value, now)) {
          keysToRemove.push(key);
        }
      }

      // Remove expired entries in batches for better performance
      if (keysToRemove.length > 0) {
        try {
          await chrome.storage.local.remove(keysToRemove);
          console.log(`ChromeStorageManager: Cleared ${keysToRemove.length} expired cache entries`);
        } catch (removeError) {
          console.warn('ChromeStorageManager: Failed to remove expired entries:', removeError);
          return 0;
        }
      }

      return keysToRemove.length;
    } catch (error) {
      if (this.isExtensionContextError(error)) {
        console.warn('ChromeStorageManager: Extension context invalidated during cache cleanup');
        return 0;
      }
      console.error('ChromeStorageManager: Unexpected error during cache cleanup:', error);
      return 0;
    }
  }

  /**
   * Check if extension context is valid
   */
  private static isExtensionContextValid(): boolean {
    try {
      return !!(chrome?.runtime?.id && chrome?.storage?.local);
    } catch {
      return false;
    }
  }

  /**
   * Check if a key is a cache key
   */
  private static isCacheKey(key: string): boolean {
    return key.startsWith(this.CACHE_PREFIX);
  }

  /**
   * Check if a cache item is expired
   */
  private static isCacheItemExpired(value: any, now: number): boolean {
    return (
      value &&
      typeof value === 'object' &&
      'expiresAt' in value &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt < now
    );
  }

  /**
   * Check if error is related to extension context
   */
  private static isExtensionContextError(error: any): boolean {
    if (!error?.message) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('extension context invalidated') ||
      message.includes('context invalidated') ||
      message.includes('extension is disabled')
    );
  }

  /**
   * Clear all cache entries
   */
  static async clearAllCache(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData).filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
        console.log(`ChromeStorageManager: Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('ChromeStorageManager: Error clearing all cache:', error);
      throw error;
    }
  }

  // === Promise-based wrapper for callback-style code ===

  /**
   * Promise-based get for use in content scripts or callback contexts
   */
  static getPromised<T = unknown>(key: StorageKey): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          console.error(`ChromeStorageManager: Runtime error for key "${key}":`, chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result[key] || null);
        }
      });
    });
  }

  /**
   * Promise-based set for use in content scripts or callback contexts
   */
  static setPromised<T = unknown>(key: StorageKey, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.error(`ChromeStorageManager: Runtime error setting key "${key}":`, chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
}

// === Convenience methods for common operations ===

export class SettingsStorage {
  static async getApiKey(): Promise<string | null> {
    return ChromeStorageManager.get<string>('settings.apiKey');
  }

  static async setApiKey(apiKey: string): Promise<void> {
    return ChromeStorageManager.set('settings.apiKey', apiKey);
  }

  static async getUserSettings(): Promise<Record<string, any>> {
    const settings = await ChromeStorageManager.get<Record<string, any>>('settings.userSettings');
    return settings || {};
  }

  static async setUserSettings(settings: Record<string, any>): Promise<void> {
    return ChromeStorageManager.set('settings.userSettings', settings);
  }

  static async clearApiKey(): Promise<void> {
    return ChromeStorageManager.remove('settings.apiKey');
  }
}