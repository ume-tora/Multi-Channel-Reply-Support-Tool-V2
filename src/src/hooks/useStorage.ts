import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storageService';

interface UseStorageResult {
  apiKey: string | null;
  userSettings: any;
  isLoading: boolean;
  error: string | null;
  setApiKey: (apiKey: string) => Promise<void>;
  setUserSettings: (settings: any) => Promise<void>;
  clearError: () => void;
}

export const useStorage = (): UseStorageResult => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [userSettings, setUserSettingsState] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [key, settings] = await Promise.all([
          StorageService.getApiKey(),
          StorageService.getUserSettings(),
        ]);
        setApiKeyState(key);
        setUserSettingsState(settings);
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
      await StorageService.setApiKey(newApiKey);
      setApiKeyState(newApiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
      throw err;
    }
  }, []);

  const setUserSettings = useCallback(async (newSettings: any) => {
    try {
      setError(null);
      await StorageService.setUserSettings(newSettings);
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