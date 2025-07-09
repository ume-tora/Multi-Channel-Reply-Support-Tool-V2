import { useState, useEffect, useCallback } from 'react';
import { SettingsStorage } from '../shared/storage/ChromeStorageManager';
import type { UserSettings } from '../shared/types';

interface UseStorageReturn {
  apiKey: string | null;
  userSettings: UserSettings;
  isLoading: boolean;
  error: string | null;
  setApiKey: (apiKey: string) => Promise<void>;
  setUserSettings: (settings: UserSettings) => Promise<void>;
  clearError: () => void;
}

export const useStorage = (): UseStorageReturn => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [userSettings, setUserSettingsState] = useState<UserSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Use centralized storage manager
        const [loadedApiKey, loadedSettings] = await Promise.all([
          SettingsStorage.getApiKey(),
          SettingsStorage.getUserSettings()
        ]);
        
        setApiKeyState(loadedApiKey);
        setUserSettingsState(loadedSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const setApiKey = useCallback(async (newApiKey: string) => {
    try {
      setError(null);
      await SettingsStorage.setApiKey(newApiKey);
      setApiKeyState(newApiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
      throw err;
    }
  }, []);

  const setUserSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      setError(null);
      await SettingsStorage.setUserSettings(newSettings);
      setUserSettingsState(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    apiKey,
    userSettings,
    isLoading,
    error,
    setApiKey,
    setUserSettings,
    clearError,
  };
};