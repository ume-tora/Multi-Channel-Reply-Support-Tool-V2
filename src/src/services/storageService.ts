import { ChromeStorageManager, SettingsStorage } from '../shared/storage/ChromeStorageManager';
import type { ConversationContext, UserSettings } from '../shared/types';

/**
 * Legacy StorageService class - now uses ChromeStorageManager internally
 * This class is maintained for backward compatibility
 * @deprecated Use ChromeStorageManager or SettingsStorage directly
 */
export class StorageService {
  // Settings management
  static async getApiKey(): Promise<string | null> {
    return SettingsStorage.getApiKey();
  }

  static async setApiKey(apiKey: string): Promise<void> {
    return SettingsStorage.setApiKey(apiKey);
  }

  static async getUserSettings(): Promise<UserSettings> {
    return SettingsStorage.getUserSettings();
  }

  static async setUserSettings(settings: UserSettings): Promise<void> {
    return SettingsStorage.setUserSettings(settings);
  }

  // Cache management
  static async getCachedContext(
    channel: string,
    threadId: string
  ): Promise<ConversationContext | null> {
    return ChromeStorageManager.getCached<ConversationContext>(channel, threadId);
  }

  static async setCachedContext(
    channel: string,
    threadId: string,
    context: ConversationContext
  ): Promise<void> {
    return ChromeStorageManager.setCached(channel, threadId, context);
  }

  static async clearCachedContext(channel: string, threadId: string): Promise<void> {
    const cacheKey = `cache_${channel}_${threadId}`;
    return ChromeStorageManager.remove(cacheKey);
  }

  static async clearExpiredCache(): Promise<void> {
    await ChromeStorageManager.clearExpiredCache();
  }

  // Utility methods
  static async getStorageUsage(): Promise<number> {
    const usage = await ChromeStorageManager.getUsage();
    return usage.used;
  }

  static async clearAllData(): Promise<void> {
    return ChromeStorageManager.clear();
  }
}