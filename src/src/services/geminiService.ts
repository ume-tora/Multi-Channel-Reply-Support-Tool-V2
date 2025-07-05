import { GeminiAPIClient } from '../shared/api/GeminiAPIClient';
import type { GeminiMessage, GeminiConfig, ApiError } from '../shared/types';

/**
 * Legacy GeminiService class - now uses GeminiAPIClient internally
 * This class is maintained for backward compatibility
 * @deprecated Use GeminiAPIClient or SimpleGeminiClient directly
 */
export class GeminiService {
  static async generateReply(
    messages: GeminiMessage[],
    config: GeminiConfig
  ): Promise<string> {
    return GeminiAPIClient.generateReply(messages, config);
  }

  /**
   * Generate reply from conversation text
   */
  static async generateReplyFromText(
    conversationText: string,
    config: GeminiConfig
  ): Promise<string> {
    return GeminiAPIClient.generateReplyFromText(conversationText, config);
  }

  /**
   * Generate reply from service messages
   */
  static async generateContextualReply(
    messages: Array<{ author: string; text: string }>,
    config: GeminiConfig
  ): Promise<string> {
    return GeminiAPIClient.generateContextualReply(messages, config);
  }

  static validateApiKey(apiKey: string): boolean {
    return GeminiAPIClient.validateApiKey(apiKey);
  }

  /**
   * Test API connection
   */
  static async testConnection(apiKey: string): Promise<boolean> {
    return GeminiAPIClient.testConnection(apiKey);
  }

  private static handleApiError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error,
      };
    }
    return {
      message: 'Unknown error occurred while calling Gemini API',
      details: error,
    };
  }
}