/**
 * Centralized Gemini API client with consistent error handling and type safety
 */

import type { 
  GeminiMessage, 
  GeminiConfig, 
  GeminiRequest, 
  GeminiResponse,
  ServiceMessage
} from '../types';

export class GeminiAPIClient {
  private static readonly API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  private static readonly DEFAULT_CONFIG: Partial<GeminiConfig> = {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topK: 1,
    topP: 1
  };

  private static readonly SAFETY_SETTINGS = [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ];

  /**
   * Generate a reply using Gemini API
   */
  static async generateReply(
    messages: GeminiMessage[], 
    config: GeminiConfig
  ): Promise<string> {
    try {
      this.validateConfig(config);
      
      const request = this.buildRequest(messages, config);
      const response = await this.makeAPICall(request, config.apiKey);
      
      return this.extractTextFromResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate a reply from conversation text
   */
  static async generateReplyFromText(
    conversationText: string,
    config: GeminiConfig
  ): Promise<string> {
    const prompt = this.buildConversationPrompt(conversationText);
    
    const messages: GeminiMessage[] = [
      { role: 'user', content: prompt }
    ];

    return this.generateReply(messages, config);
  }

  /**
   * Generate a reply from message array with context
   */
  static async generateContextualReply(
    messages: ServiceMessage[],
    config: GeminiConfig
  ): Promise<string> {
    const conversationText = messages
      .map(m => `${m.author}: ${m.text}`)
      .join('\n\n');

    return this.generateReplyFromText(conversationText, config);
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    return !!(
      apiKey && 
      apiKey.trim().length > 0 && 
      apiKey.startsWith('AIza')
    );
  }

  /**
   * Test API connection with a simple request
   */
  static async testConnection(apiKey: string): Promise<boolean> {
    try {
      const testConfig: GeminiConfig = { 
        apiKey,
        temperature: 0.1,
        maxOutputTokens: 10
      };

      const testMessages: GeminiMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await this.generateReply(testMessages, testConfig);
      return true;
    } catch (error) {
      console.error('GeminiAPIClient: Connection test failed:', error);
      return false;
    }
  }

  // === Private Helper Methods ===

  private static validateConfig(config: GeminiConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    if (!this.validateApiKey(config.apiKey)) {
      throw new Error('Invalid API key format. Expected key starting with "AIza"');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (config.maxOutputTokens !== undefined && config.maxOutputTokens < 1) {
      throw new Error('Max output tokens must be positive');
    }
  }

  private static buildRequest(messages: GeminiMessage[], config: GeminiConfig): GeminiRequest {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    return {
      contents: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: mergedConfig.temperature,
        topK: mergedConfig.topK,
        topP: mergedConfig.topP,
        maxOutputTokens: mergedConfig.maxOutputTokens
      },
      safetySettings: this.SAFETY_SETTINGS
    };
  }

  private static async makeAPICall(request: GeminiRequest, apiKey: string): Promise<GeminiResponse> {
    const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  private static extractTextFromResponse(response: GeminiResponse): string {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates received from Gemini API');
    }

    const candidate = response.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Invalid response format from Gemini API');
    }

    const text = candidate.content.parts[0].text;
    
    if (!text) {
      throw new Error('Empty response text from Gemini API');
    }

    return text.trim();
  }

  private static buildConversationPrompt(conversationText: string): string {
    return `以下の会話に対して、適切で自然な返信を日本語で生成してください。

【重要な指示】
- 必ず日本語で回答してください
- 簡潔で礼儀正しく、文脈に沿った内容にしてください
- ビジネスシーンに適した丁寧な敬語を使用してください
- 相手の質問や依頼に具体的に答えてください

【会話内容】
${conversationText}

【日本語での返信】:`;
  }

  private static handleError(error: unknown) {
    if (error instanceof Error) {
      // Extract status code from error message if present
      const statusMatch = error.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : undefined;

      return {
        message: error.message,
        status,
        details: error
      };
    }

    return {
      message: 'Unknown error occurred while calling Gemini API',
      details: error
    };
  }
}

// === Convenience wrapper for common use cases ===

export class SimpleGeminiClient {
  private config: GeminiConfig;

  constructor(apiKey: string, options?: Partial<GeminiConfig>) {
    this.config = {
      apiKey,
      ...GeminiAPIClient['DEFAULT_CONFIG'],
      ...options
    };
  }

  async generateReply(conversationText: string): Promise<string> {
    return GeminiAPIClient.generateReplyFromText(conversationText, this.config);
  }

  async generateContextualReply(messages: ServiceMessage[]): Promise<string> {
    return GeminiAPIClient.generateContextualReply(messages, this.config);
  }

  async testConnection(): Promise<boolean> {
    return GeminiAPIClient.testConnection(this.config.apiKey);
  }

  updateConfig(updates: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}