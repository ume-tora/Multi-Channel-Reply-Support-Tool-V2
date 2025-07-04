import { useState, useCallback } from 'react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import type { Message } from '../types';

interface UseGeminiResult {
  isLoading: boolean;
  error: string | null;
  generateReply: (messages: Message[]) => Promise<string | null>;
  clearError: () => void;
}

export const useGemini = (): UseGeminiResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReply = useCallback(async (messages: Message[]): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get API key from storage
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        throw new Error('API key not found. Please set your Gemini API key in the extension settings.');
      }

      // Validate API key
      if (!GeminiService.validateApiKey(apiKey)) {
        throw new Error('Invalid API key format. Please check your Gemini API key.');
      }

      // Generate reply
      const reply = await GeminiService.generateReply(messages, { apiKey });
      return reply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    generateReply,
    clearError,
  };
};