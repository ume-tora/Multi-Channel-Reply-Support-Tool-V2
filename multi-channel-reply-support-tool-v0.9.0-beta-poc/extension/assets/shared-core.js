import { e as errorNotificationService } from "./shared-errors.js";
const _ChromeStorageManager = class _ChromeStorageManager {
  /**
   * Get a value from Chrome storage
   */
  static async get(key) {
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
  static async set(key, value) {
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
  static async getMultiple(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error("ChromeStorageManager: Error getting multiple keys:", error);
      return {};
    }
  }
  /**
   * Set multiple values in Chrome storage
   */
  static async setMultiple(items) {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error("ChromeStorageManager: Error setting multiple items:", error);
      throw error;
    }
  }
  /**
   * Remove a key from Chrome storage
   */
  static async remove(key) {
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
  static async clear() {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error("ChromeStorageManager: Error clearing storage:", error);
      throw error;
    }
  }
  /**
   * Get storage usage information
   */
  static async getUsage() {
    try {
      const used = await chrome.storage.local.getBytesInUse();
      const total = chrome.storage.local.QUOTA_BYTES || 5242880;
      return {
        used,
        total,
        percentage: used / total * 100
      };
    } catch (error) {
      console.error("ChromeStorageManager: Error getting storage usage:", error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
  // === Cached Storage Methods ===
  /**
   * Get a cached value with automatic expiration
   */
  static async getCached(channel, threadId) {
    try {
      const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
      const cached = await this.get(cacheKey);
      if (!cached) {
        return null;
      }
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.remove(cacheKey);
        return null;
      }
      return cached.value;
    } catch (error) {
      console.error("ChromeStorageManager: Error getting cached value:", error);
      return null;
    }
  }
  /**
   * Set a cached value with TTL
   */
  static async setCached(channel, threadId, value, options = {}) {
    try {
      const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
      const ttl = options.ttl || this.DEFAULT_TTL;
      const cacheItem = {
        value,
        expiresAt: Date.now() + ttl
      };
      await this.set(cacheKey, cacheItem);
    } catch (error) {
      console.error("ChromeStorageManager: Error setting cached value:", error);
      throw error;
    }
  }
  /**
   * Clear expired cache entries safely with proper error handling
   */
  static async clearExpiredCache() {
    try {
      if (!this.isExtensionContextValid()) {
        return 0;
      }
      let allData;
      try {
        allData = await chrome.storage.local.get();
      } catch {
        console.warn("ChromeStorageManager: Storage access failed during cache cleanup");
        return 0;
      }
      const now = Date.now();
      const keysToRemove = [];
      for (const [key, value] of Object.entries(allData)) {
        if (this.isCacheKey(key) && this.isCacheItemExpired(value, now)) {
          keysToRemove.push(key);
        }
      }
      if (keysToRemove.length > 0) {
        try {
          await chrome.storage.local.remove(keysToRemove);
          console.log(`ChromeStorageManager: Cleared ${keysToRemove.length} expired cache entries`);
        } catch (removeError) {
          console.warn("ChromeStorageManager: Failed to remove expired entries:", removeError);
          return 0;
        }
      }
      return keysToRemove.length;
    } catch (error) {
      if (this.isExtensionContextError(error)) {
        console.warn("ChromeStorageManager: Extension context invalidated during cache cleanup");
        return 0;
      }
      console.error("ChromeStorageManager: Unexpected error during cache cleanup:", error);
      return 0;
    }
  }
  /**
   * Check if extension context is valid
   */
  static isExtensionContextValid() {
    try {
      return !!(chrome?.runtime?.id && chrome?.storage?.local);
    } catch {
      return false;
    }
  }
  /**
   * Check if a key is a cache key
   */
  static isCacheKey(key) {
    return key.startsWith(this.CACHE_PREFIX);
  }
  /**
   * Check if a cache item is expired
   */
  static isCacheItemExpired(value, now) {
    return value && typeof value === "object" && "expiresAt" in value && typeof value.expiresAt === "number" && value.expiresAt < now;
  }
  /**
   * Check if error is related to extension context
   */
  static isExtensionContextError(error) {
    if (!error || typeof error !== "object" || !("message" in error)) return false;
    const message = error.message.toLowerCase();
    return message.includes("extension context invalidated") || message.includes("context invalidated") || message.includes("extension is disabled");
  }
  /**
   * Clear all cache entries
   */
  static async clearAllCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData).filter((key) => key.startsWith(this.CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
        console.log(`ChromeStorageManager: Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error("ChromeStorageManager: Error clearing all cache:", error);
      throw error;
    }
  }
  // === Promise-based wrapper for callback-style code ===
  /**
   * Promise-based get for use in content scripts or callback contexts
   */
  static getPromised(key) {
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
  static setPromised(key, value) {
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
};
_ChromeStorageManager.DEFAULT_TTL = 60 * 60 * 1e3;
_ChromeStorageManager.CACHE_PREFIX = "cache";
let ChromeStorageManager = _ChromeStorageManager;
class SettingsStorage {
  static async getApiKey() {
    return ChromeStorageManager.get("settings.apiKey");
  }
  static async setApiKey(apiKey) {
    return ChromeStorageManager.set("settings.apiKey", apiKey);
  }
  static async getUserSettings() {
    const settings = await ChromeStorageManager.get("settings.userSettings");
    return settings || {};
  }
  static async setUserSettings(settings) {
    return ChromeStorageManager.set("settings.userSettings", settings);
  }
  static async clearApiKey() {
    return ChromeStorageManager.remove("settings.apiKey");
  }
}
const _GeminiAPIClient = class _GeminiAPIClient {
  /**
   * Generate a reply using Gemini API
   */
  static async generateReply(messages, config) {
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
  static async generateReplyFromText(conversationText, config) {
    const prompt = this.buildConversationPrompt(conversationText);
    const messages = [
      { role: "user", content: prompt }
    ];
    return this.generateReply(messages, config);
  }
  /**
   * Generate a reply from message array with context - Enhanced with retry
   */
  static async generateContextualReply(messages, config) {
    console.log("🤖 GeminiAPI: Starting contextual reply generation...", {
      messagesCount: messages.length,
      totalCharacters: messages.reduce((sum, m) => sum + m.text.length, 0)
    });
    const conversationText = messages.map((m) => `${m.author}: ${m.text}`).join("\n\n");
    return this.generateReplyWithRetry(conversationText, config, 3);
  }
  /**
   * Generate reply with intelligent retry mechanism
   */
  static async generateReplyWithRetry(conversationText, config, maxRetries = 3) {
    const timeouts = [3e3, 3e3, 3e3];
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const timeout = timeouts[attempt - 1] || 3e3;
      console.log(`🤖 GeminiAPI: Attempt ${attempt}/${maxRetries} with ${timeout / 1e3}s timeout`);
      try {
        const attemptConfig = { ...config };
        const result = await this.generateReplyFromTextWithTimeout(conversationText, attemptConfig, timeout);
        console.log(`✅ GeminiAPI: Success on attempt ${attempt}`);
        if (attempt > 1) {
          errorNotificationService.showSuccess(`接続が復旧しました (${attempt}回目で成功)`);
        }
        return result;
      } catch (error) {
        console.error(`❌ GeminiAPI: Attempt ${attempt} failed:`, error.message);
        if (attempt === 1) {
          errorNotificationService.showAPIError(error);
        }
        if (error.message.includes("401") || error.message.includes("403") || error.message.includes("API key")) {
          throw error;
        }
        if (error.message.includes("429")) {
          throw error;
        }
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts. Last error: ${error.message}`);
        }
        const waitTime = Math.min(1e3 * Math.pow(2, attempt - 1), 1e4);
        console.log(`⏳ GeminiAPI: Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    throw new Error("All retry attempts exhausted");
  }
  /**
   * Generate reply with custom timeout
   */
  static async generateReplyFromTextWithTimeout(conversationText, config, timeoutMs) {
    const prompt = this.buildConversationPrompt(conversationText);
    const messages = [
      { role: "user", content: prompt }
    ];
    return this.generateReplyWithTimeout(messages, config, timeoutMs);
  }
  /**
   * Generate reply with explicit timeout control
   */
  static async generateReplyWithTimeout(messages, config) {
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
  static validateApiKey(apiKey) {
    return !!(apiKey && apiKey.trim().length > 0 && apiKey.startsWith("AIza"));
  }
  /**
   * Test API connection with a simple request
   */
  static async testConnection(apiKey) {
    try {
      const testConfig = {
        apiKey,
        temperature: 0.1,
        maxOutputTokens: 10
      };
      const testMessages = [
        { role: "user", content: "Hello" }
      ];
      await this.generateReply(testMessages, testConfig);
      return true;
    } catch (error) {
      console.error("GeminiAPIClient: Connection test failed:", error);
      return false;
    }
  }
  // === Private Helper Methods ===
  static validateConfig(config) {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    if (!this.validateApiKey(config.apiKey)) {
      throw new Error('Invalid API key format. Expected key starting with "AIza"');
    }
    if (config.temperature !== void 0 && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error("Temperature must be between 0 and 2");
    }
    if (config.maxOutputTokens !== void 0 && config.maxOutputTokens < 1) {
      throw new Error("Max output tokens must be positive");
    }
  }
  static buildRequest(messages, config) {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
    return {
      contents: messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
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
  static async makeAPICall(request, apiKey) {
    const maxRetries = 3;
    const baseTimeout = 6e4;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const currentTimeout = baseTimeout * attempt;
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
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        console.log("🌐 GeminiAPI: Response received", {
          attempt,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          headers: Object.fromEntries(response.headers.entries())
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("🌐 GeminiAPI: Error response body:", errorText);
          if (response.status >= 500 || response.status === 429) {
            if (attempt < maxRetries) {
              const retryDelay = 2e3 * attempt;
              console.log(`🌐 GeminiAPI: Retrying in ${retryDelay}ms due to status ${response.status}`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            }
          }
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const jsonResponse = await response.json();
        console.log("🌐 GeminiAPI: Successful response", {
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
        if (error.name === "AbortError") {
          if (attempt < maxRetries) {
            console.log(`🌐 GeminiAPI: Timeout on attempt ${attempt}, retrying...`);
            continue;
          } else {
            throw new Error(`Gemini API request timed out after ${maxRetries} attempts`);
          }
        }
        if (attempt === maxRetries) {
          throw error;
        }
        const retryDelay = 1e3 * attempt;
        console.log(`🌐 GeminiAPI: Retrying in ${retryDelay}ms due to error: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error("Max retry attempts reached");
  }
  static extractTextFromResponse(response) {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No response candidates received from Gemini API");
    }
    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("Invalid response format from Gemini API");
    }
    const text = candidate.content.parts[0].text;
    if (!text) {
      throw new Error("Empty response text from Gemini API");
    }
    return text.trim();
  }
  static buildConversationPrompt(conversationText) {
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
  static handleError(error) {
    if (error instanceof Error) {
      const statusMatch = error.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : void 0;
      return {
        message: error.message,
        status,
        details: error
      };
    }
    return {
      message: "Unknown error occurred while calling Gemini API",
      details: error
    };
  }
};
_GeminiAPIClient.API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
_GeminiAPIClient.DEFAULT_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 2048,
  topK: 1,
  topP: 1
};
_GeminiAPIClient.SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  }
];
let GeminiAPIClient = _GeminiAPIClient;
export {
  GeminiAPIClient as G,
  SettingsStorage as S
};
