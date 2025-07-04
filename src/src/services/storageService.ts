import type { ConversationContext } from '../types';

export class StorageService {
  private static readonly STORAGE_KEYS = {
    API_KEY: 'settings.apiKey',
    USER_SETTINGS: 'settings.userSettings',
    CACHE_PREFIX: 'cache',
  } as const;

  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  // Settings management
  static async getApiKey(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.API_KEY);
      return result[this.STORAGE_KEYS.API_KEY] || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  static async setApiKey(apiKey: string): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.API_KEY]: apiKey,
      });
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  }

  static async getUserSettings(): Promise<any> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.USER_SETTINGS);
      return result[this.STORAGE_KEYS.USER_SETTINGS] || {};
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }

  static async setUserSettings(settings: any): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.USER_SETTINGS]: settings,
      });
    } catch (error) {
      console.error('Error setting user settings:', error);
      throw error;
    }
  }

  // Cache management
  static async getCachedContext(
    channel: string,
    threadId: string
  ): Promise<ConversationContext | null> {
    try {
      const cacheKey = `${this.STORAGE_KEYS.CACHE_PREFIX}_${channel}_${threadId}`;
      const result = await chrome.storage.local.get(cacheKey);
      const cached = result[cacheKey];

      if (!cached) {
        return null;
      }

      // Check if cache is expired
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.clearCachedContext(channel, threadId);
        return null;
      }

      return cached;
    } catch (error) {
      console.error('Error getting cached context:', error);
      return null;
    }
  }

  static async setCachedContext(
    channel: string,
    threadId: string,
    context: ConversationContext
  ): Promise<void> {
    try {
      const cacheKey = `${this.STORAGE_KEYS.CACHE_PREFIX}_${channel}_${threadId}`;
      const cacheData = {
        ...context,
        expiresAt: Date.now() + this.CACHE_TTL,
      };

      await chrome.storage.local.set({
        [cacheKey]: cacheData,
      });
    } catch (error) {
      console.error('Error setting cached context:', error);
    }
  }

  static async clearCachedContext(channel: string, threadId: string): Promise<void> {
    try {
      const cacheKey = `${this.STORAGE_KEYS.CACHE_PREFIX}_${channel}_${threadId}`;
      await chrome.storage.local.remove(cacheKey);
    } catch (error) {
      console.error('Error clearing cached context:', error);
    }
  }

  static async clearExpiredCache(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get();
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.STORAGE_KEYS.CACHE_PREFIX) && 
            value && 
            typeof value === 'object' && 
            'expiresAt' in value && 
            value.expiresAt < now) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleared ${keysToRemove.length} expired cache entries`);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  // Utility methods
  static async getStorageUsage(): Promise<number> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      return bytesInUse;
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}