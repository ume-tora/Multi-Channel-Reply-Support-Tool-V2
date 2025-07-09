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
   * Generate a reply from message array with context - Enhanced with retry
   */
  static async generateContextualReply(
    messages: ServiceMessage[],
    config: GeminiConfig
  ): Promise<string> {
    console.log('🤖 GeminiAPI: Starting contextual reply generation...', {
      messagesCount: messages.length,
      totalCharacters: messages.reduce((sum, m) => sum + m.text.length, 0)
    });

    const conversationText = messages
      .map(m => `${m.author}: ${m.text}`)
      .join('\n\n');

    // 🔥 Enhanced with retry logic
    return this.generateReplyWithRetry(conversationText, config, 3);
  }

  /**
   * Generate reply with intelligent retry mechanism
   */
  private static async generateReplyWithRetry(
    conversationText: string,
    config: GeminiConfig,
    maxRetries: number = 3
  ): Promise<string> {
    const timeouts = [3000, 3000, 3000]; // 3s, 3s, 3s (要件定義: 3秒以内)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const timeout = timeouts[attempt - 1] || 3000;
      console.log(`🤖 GeminiAPI: Attempt ${attempt}/${maxRetries} with ${timeout/1000}s timeout`);

      try {
        // Create config with dynamic timeout
        const attemptConfig = { ...config };
        
        const result = await this.generateReplyFromTextWithTimeout(conversationText, attemptConfig, timeout);
        
        console.log(`✅ GeminiAPI: Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        console.error(`❌ GeminiAPI: Attempt ${attempt} failed:`, error.message);
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403') || error.message.includes('API key')) {
          throw error;
        }
        
        // Don't retry on quota errors
        if (error.message.includes('429')) {
          throw error;
        }
        
        // Last attempt - throw the error
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts. Last error: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ GeminiAPI: Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error('All retry attempts exhausted');
  }

  /**
   * Generate reply with custom timeout
   */
  private static async generateReplyFromTextWithTimeout(
    conversationText: string,
    config: GeminiConfig,
    timeoutMs: number
  ): Promise<string> {
    const prompt = this.buildConversationPrompt(conversationText);
    
    const messages: GeminiMessage[] = [
      { role: 'user', content: prompt }
    ];

    return this.generateReplyWithTimeout(messages, config, timeoutMs);
  }

  /**
   * Generate reply with explicit timeout control
   */
  private static async generateReplyWithTimeout(
    messages: GeminiMessage[], 
    config: GeminiConfig,
    timeoutMs: number
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
    const maxRetries = 3;
    const baseTimeout = 60000; // 60秒ベースタイムアウト
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const currentTimeout = baseTimeout * attempt; // 段階的にタイムアウトを延長
      
      console.log(`🌐 GeminiAPI: Starting API call (attempt ${attempt}/${maxRetries})...`, {
        endpoint: this.API_ENDPOINT,
        apiKeyLength: apiKey.length,
        requestSize: JSON.stringify(request).length,
        timeout: `${currentTimeout}ms`
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`🌐 GeminiAPI: Request timeout after ${currentTimeout}ms (attempt ${attempt})`);
          controller.abort();
        }, currentTimeout);

        const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        console.log('🌐 GeminiAPI: Response received', {
          attempt,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🌐 GeminiAPI: Error response body:', errorText);
          
          // 一時的なエラーの場合はリトライ
          if (response.status >= 500 || response.status === 429) {
            if (attempt < maxRetries) {
              const retryDelay = 2000 * attempt; // 段階的に遅延を増加
              console.log(`🌐 GeminiAPI: Retrying in ${retryDelay}ms due to status ${response.status}`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
          }
          
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const jsonResponse = await response.json();
        console.log('🌐 GeminiAPI: Successful response', {
          attempt,
          responseTime: `${responseTime}ms`,
          candidatesCount: jsonResponse.candidates?.length || 0
        });

        return jsonResponse;
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error(`🌐 GeminiAPI: Request failed (attempt ${attempt}/${maxRetries})`, {
          error: error.message,
          responseTime: `${responseTime}ms`,
          errorType: error.name
        });

        if (error.name === 'AbortError') {
          if (attempt < maxRetries) {
            console.log(`🌐 GeminiAPI: Timeout on attempt ${attempt}, retrying...`);
            continue;
          } else {
            throw new Error(`Gemini API request timed out after ${maxRetries} attempts`);
          }
        }
        
        // その他のエラーは即座にスロー（ネットワークエラーなど）
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 一時的なエラーかもしれないのでリトライ
        const retryDelay = 1000 * attempt;
        console.log(`🌐 GeminiAPI: Retrying in ${retryDelay}ms due to error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error('Max retry attempts reached');
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