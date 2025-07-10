(function() {
  "use strict";
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
  const _ErrorNotificationService = class _ErrorNotificationService {
    constructor() {
      this.notificationContainer = null;
      this.activeNotifications = /* @__PURE__ */ new Map();
      this.createNotificationContainer();
    }
    static getInstance() {
      if (!_ErrorNotificationService.instance) {
        _ErrorNotificationService.instance = new _ErrorNotificationService();
      }
      return _ErrorNotificationService.instance;
    }
    /**
     * API関連エラーの表示
     */
    showAPIError(error) {
      if (this.isInvalidAPIKeyError(error)) {
        this.show({
          level: "error",
          title: "APIキーエラー",
          message: "Gemini APIキーが無効です。設定を確認してください。",
          persistent: true,
          actions: [
            {
              label: "設定を開く",
              action: () => this.openSettings(),
              style: "primary"
            },
            {
              label: "APIキー取得方法",
              action: () => this.openAPIKeyGuide(),
              style: "secondary"
            }
          ]
        });
      } else if (this.isRateLimitError(error)) {
        this.show({
          level: "warning",
          title: "レート制限",
          message: "API使用量制限に達しました。しばらく待ってから再試行してください。",
          autoHide: 8e3,
          actions: [
            {
              label: "30秒後に再試行",
              action: () => this.scheduleRetry(3e4),
              style: "primary"
            }
          ]
        });
      } else if (this.isNetworkError(error)) {
        this.show({
          level: "warning",
          title: "ネットワークエラー",
          message: "インターネット接続を確認してください。自動で再試行します。",
          autoHide: 5e3
        });
      } else {
        this.show({
          level: "error",
          title: "APIエラー",
          message: "AI返信の生成中にエラーが発生しました。",
          autoHide: 5e3,
          actions: [
            {
              label: "再試行",
              action: () => this.triggerRetry(),
              style: "primary"
            }
          ]
        });
      }
    }
    /**
     * ストレージエラーの表示
     */
    showStorageError(error) {
      if (this.isQuotaExceededError(error)) {
        this.show({
          level: "error",
          title: "ストレージ容量不足",
          message: "設定の保存容量が不足しています。不要なデータを削除してください。",
          persistent: true,
          actions: [
            {
              label: "キャッシュクリア",
              action: () => this.clearCache(),
              style: "primary"
            },
            {
              label: "ヘルプ",
              action: () => this.openStorageHelp(),
              style: "secondary"
            }
          ]
        });
      } else {
        this.show({
          level: "warning",
          title: "ストレージエラー",
          message: "設定の保存に失敗しました。",
          autoHide: 5e3
        });
      }
    }
    /**
     * DOM関連エラーの表示（開発者向け + ユーザー向け）
     */
    showDOMError(serviceName) {
      console.warn(`🔧 DOM構造変更検出: ${serviceName}のUI要素が見つかりません`);
      this.show({
        level: "warning",
        title: "UI読み込みエラー",
        message: `${serviceName}のページ読み込みに時間がかかっています。`,
        autoHide: 3e3
      });
    }
    /**
     * 成功メッセージの表示
     */
    showSuccess(message) {
      this.show({
        level: "success",
        message,
        autoHide: 3e3
      });
    }
    /**
     * 汎用通知表示
     */
    show(notification) {
      if (!this.notificationContainer) {
        this.createNotificationContainer();
      }
      const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const element = this.createNotificationElement(notificationId, notification);
      this.notificationContainer.appendChild(element);
      this.activeNotifications.set(notificationId, element);
      requestAnimationFrame(() => {
        element.style.transform = "translateX(0)";
        element.style.opacity = "1";
      });
      if (!notification.persistent && notification.autoHide) {
        setTimeout(() => {
          this.hideNotification(notificationId);
        }, notification.autoHide);
      }
    }
    /**
     * 通知を非表示
     */
    hideNotification(id) {
      const element = this.activeNotifications.get(id);
      if (element) {
        element.style.transform = "translateX(100%)";
        element.style.opacity = "0";
        setTimeout(() => {
          if (element.parentElement) {
            element.parentElement.removeChild(element);
          }
          this.activeNotifications.delete(id);
        }, 300);
      }
    }
    /**
     * 通知コンテナの作成
     */
    createNotificationContainer() {
      if (document.getElementById("gemini-notifications")) {
        this.notificationContainer = document.getElementById("gemini-notifications");
        return;
      }
      const container = document.createElement("div");
      container.id = "gemini-notifications";
      container.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
      max-width: 400px !important;
      pointer-events: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
      document.body.appendChild(container);
      this.notificationContainer = container;
    }
    /**
     * 通知要素の作成
     */
    createNotificationElement(id, notification) {
      const element = document.createElement("div");
      element.id = id;
      const levelColors = {
        info: "#2196F3",
        warning: "#FF9800",
        error: "#F44336",
        success: "#4CAF50"
      };
      const levelIcons = {
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        success: "✅"
      };
      element.style.cssText = `
      background: white !important;
      border-left: 4px solid ${levelColors[notification.level]} !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      margin-bottom: 12px !important;
      padding: 16px !important;
      max-width: 100% !important;
      transform: translateX(100%) !important;
      opacity: 0 !important;
      transition: all 0.3s ease !important;
      pointer-events: auto !important;
      position: relative !important;
    `;
      const closeButton = `
      <button onclick="document.getElementById('${id}').style.display='none'" 
              style="position: absolute; top: 8px; right: 8px; background: none; border: none; 
                     font-size: 16px; cursor: pointer; color: #666; padding: 4px;">×</button>
    `;
      const actionsHTML = notification.actions ? `<div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${notification.actions.map((action) => {
        const bgColor = action.style === "primary" ? levelColors[notification.level] : action.style === "danger" ? "#F44336" : "#6c757d";
        return `<button onclick="(${action.action.toString()})()" 
                         style="background: ${bgColor}; color: white; border: none; padding: 8px 16px; 
                                border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                    ${action.label}
                  </button>`;
      }).join("")}
      </div>` : "";
      element.innerHTML = `
      ${closeButton}
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 18px; flex-shrink: 0;">${levelIcons[notification.level]}</div>
        <div style="flex: 1; min-width: 0;">
          ${notification.title ? `<div style="font-weight: 600; color: #333; margin-bottom: 4px; font-size: 14px;">${notification.title}</div>` : ""}
          <div style="color: #666; font-size: 13px; line-height: 1.4;">${notification.message}</div>
          ${actionsHTML}
        </div>
      </div>
    `;
      return element;
    }
    // === Error Type Detection ===
    isInvalidAPIKeyError(error) {
      return error instanceof Error && (error.message.includes("API key") || error.message.includes("401") || error.message.includes("Unauthorized"));
    }
    isRateLimitError(error) {
      return error instanceof Error && (error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("Too Many Requests"));
    }
    isNetworkError(error) {
      return error instanceof Error && (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("offline") || error.message.includes("connection"));
    }
    isQuotaExceededError(error) {
      return error instanceof Error && (error.message.includes("quota") || error.message.includes("QUOTA_EXCEEDED") || error.message.includes("storage"));
    }
    // === Action Handlers ===
    openSettings() {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(console.error);
    }
    openAPIKeyGuide() {
      chrome.tabs.create({
        url: "https://ai.google.dev/gemini-api/docs/api-key"
      }).catch(console.error);
    }
    async clearCache() {
      try {
        const keys = await chrome.storage.local.get(null);
        const cacheKeys = Object.keys(keys).filter((key) => key.startsWith("cache_"));
        if (cacheKeys.length > 0) {
          await chrome.storage.local.remove(cacheKeys);
          this.showSuccess(`${cacheKeys.length}件のキャッシュを削除しました`);
        } else {
          this.showSuccess("削除するキャッシュはありませんでした");
        }
      } catch (error) {
        console.error("Cache clear error:", error);
      }
    }
    openStorageHelp() {
      chrome.tabs.create({
        url: "https://developer.chrome.com/docs/extensions/reference/storage/"
      }).catch(console.error);
    }
    scheduleRetry(delayMs) {
      setTimeout(() => {
        this.showSuccess("再試行可能になりました");
        window.dispatchEvent(new CustomEvent("gemini-retry-ready"));
      }, delayMs);
    }
    triggerRetry() {
      window.dispatchEvent(new CustomEvent("gemini-manual-retry"));
    }
    /**
     * 全ての通知をクリア
     */
    clearAll() {
      this.activeNotifications.forEach((element, id) => {
        this.hideNotification(id);
      });
    }
    /**
     * インスタンスの破棄
     */
    destroy() {
      if (this.notificationContainer) {
        this.notificationContainer.remove();
        this.notificationContainer = null;
      }
      this.activeNotifications.clear();
      _ErrorNotificationService.instance = null;
    }
  };
  _ErrorNotificationService.instance = null;
  let ErrorNotificationService = _ErrorNotificationService;
  const errorNotificationService = ErrorNotificationService.getInstance();
  class StorageService {
    // Settings management
    static async getApiKey() {
      return SettingsStorage.getApiKey();
    }
    static async setApiKey(apiKey) {
      try {
        return await SettingsStorage.setApiKey(apiKey);
      } catch (error) {
        errorNotificationService.showStorageError(error);
        throw error;
      }
    }
    static async getUserSettings() {
      try {
        return await SettingsStorage.getUserSettings();
      } catch (error) {
        console.warn("Settings load error:", error);
        return {};
      }
    }
    static async setUserSettings(settings) {
      try {
        return await SettingsStorage.setUserSettings(settings);
      } catch (error) {
        errorNotificationService.showStorageError(error);
        throw error;
      }
    }
    // Cache management
    static async getCachedContext(channel, threadId) {
      return ChromeStorageManager.getCached(channel, threadId);
    }
    static async setCachedContext(channel, threadId, context) {
      return ChromeStorageManager.setCached(channel, threadId, context);
    }
    static async clearCachedContext(channel, threadId) {
      const cacheKey = `cache_${channel}_${threadId}`;
      return ChromeStorageManager.remove(cacheKey);
    }
    static async clearExpiredCache() {
      await ChromeStorageManager.clearExpiredCache();
    }
    // Utility methods
    static async getStorageUsage() {
      const usage = await ChromeStorageManager.getUsage();
      return usage.used;
    }
    static async clearAllData() {
      return ChromeStorageManager.clear();
    }
  }
  function isBackgroundMessage(obj) {
    return typeof obj === "object" && obj !== null && "type" in obj && typeof obj.type === "string";
  }
  function isGetApiKeyMessage(msg) {
    return msg.type === "GET_API_KEY";
  }
  function isSetApiKeyMessage(msg) {
    return msg.type === "SET_API_KEY";
  }
  function isGetCachedContextMessage(msg) {
    return msg.type === "GET_CACHED_CONTEXT";
  }
  function isSetCachedContextMessage(msg) {
    return msg.type === "SET_CACHED_CONTEXT";
  }
  function isClearCacheMessage(msg) {
    return msg.type === "CLEAR_CACHE";
  }
  function isGetStorageInfoMessage(msg) {
    return msg.type === "GET_STORAGE_INFO";
  }
  function isGenerateReplyMessage(msg) {
    return msg.type === "GENERATE_REPLY";
  }
  class BackgroundManager {
    constructor() {
      this.activePorts = /* @__PURE__ */ new Set();
      this.heartbeatInterval = null;
      this.serviceWorkerMonitorInterval = null;
      this.cleanupFailureCount = 0;
      this.MAX_CLEANUP_FAILURES = 3;
      this.init();
    }
    init() {
      console.log("🚀 ===== BACKGROUND SCRIPT INITIALIZATION =====");
      console.log("🚀 Multi Channel Reply Support Tool: Background script initialized");
      console.log("🚀 Service Worker Context:", {
        hasRuntime: !!chrome.runtime,
        runtimeId: chrome.runtime?.id,
        version: chrome.runtime?.getManifest()?.version,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.startServiceWorkerMonitoring();
      chrome.runtime.onInstalled.addListener((details) => {
        console.log("🔥 onInstalled event fired:", details);
        this.handleInstalled(details);
      });
      chrome.runtime.onStartup.addListener(() => {
        console.log("🔥 onStartup event fired");
        this.handleStartup();
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("🔥 ===== MESSAGE RECEIVED IN BACKGROUND =====");
        console.log("🔥 Message:", message);
        console.log("🔥 Sender:", sender);
        console.log("🔥 Time:", (/* @__PURE__ */ new Date()).toISOString());
        this.handleMessage(message, sender, sendResponse);
        return true;
      });
      chrome.runtime.onConnect.addListener((port) => {
        console.log("🔥 Port connection established:", port.name);
        this.handleConnection(port);
      });
      this.startHeartbeat();
      this.setupPeriodicCleanup();
      console.log("🚀 ===== BACKGROUND SCRIPT INITIALIZATION COMPLETE =====");
    }
    /**
     * Service Worker 生存状態の監視
     */
    logServiceWorkerState() {
      console.log("🔥 Service Worker State Check:", {
        serviceWorkerSupported: "serviceWorker" in navigator,
        workerGlobalScope: typeof WorkerGlobalScope !== "undefined",
        selfExists: typeof self !== "undefined",
        globalThis: typeof globalThis !== "undefined",
        chromeExtensionContext: !!(chrome && chrome.runtime && chrome.runtime.id)
      });
      setInterval(() => {
        console.log("🔥 Service Worker Heartbeat:", {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          runtimeId: chrome.runtime?.id,
          activeConnections: this.activePorts.size
        });
      }, 15e3);
    }
    async handleInstalled(details) {
      console.log("Extension installed/updated:", details);
      if (details.reason === "install") {
        console.log("First time installation");
      } else if (details.reason === "update") {
        console.log("Extension updated to version:", chrome.runtime.getManifest().version);
        await StorageService.clearExpiredCache();
      }
    }
    async handleStartup() {
      console.log("Browser startup detected");
      await StorageService.clearExpiredCache();
    }
    async handleMessage(message, _sender, sendResponse) {
      try {
        console.log("*** BACKGROUND: MESSAGE RECEIVED ***", {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          messageType: typeof message === "object" && message !== null && "type" in message ? message.type : "unknown",
          messageKeys: typeof message === "object" && message !== null ? Object.keys(message) : [],
          sender: _sender
        });
        if (typeof message === "object" && message !== null && "type" in message && message.type === "PING") {
          console.log("Background: Received PING, responding with PONG");
          sendResponse({
            success: true,
            message: "PONG",
            timestamp: Date.now()
          });
          return;
        }
        if (!isBackgroundMessage(message)) {
          console.warn("Invalid message format:", message);
          sendResponse({
            success: false,
            error: "Invalid message format",
            timestamp: Date.now()
          });
          return;
        }
        if (isGetApiKeyMessage(message)) {
          await this.handleGetApiKey(sendResponse);
        } else if (isSetApiKeyMessage(message)) {
          await this.handleSetApiKey(message.apiKey, sendResponse);
        } else if (isGetCachedContextMessage(message)) {
          await this.handleGetCachedContext(message.channel, message.threadId, sendResponse);
        } else if (isSetCachedContextMessage(message)) {
          await this.handleSetCachedContext(message.channel, message.threadId, message.context, sendResponse);
        } else if (isClearCacheMessage(message)) {
          await this.handleClearCache(sendResponse);
        } else if (isGetStorageInfoMessage(message)) {
          await this.handleGetStorageInfo(sendResponse);
        } else if (isGenerateReplyMessage(message)) {
          console.log("*** GENERATE_REPLY MESSAGE RECEIVED ***", {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            hasApiKey: !!message.apiKey,
            apiKeyLength: message.apiKey?.length,
            hasMessages: !!message.messages,
            messagesCount: message.messages?.length
          });
          await this.handleGenerateReply(message, sendResponse);
        } else {
          console.warn("Unknown message type:", message.type);
          sendResponse({
            success: false,
            error: "Unknown message type",
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error("Error handling message:", error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now()
        });
      }
    }
    async handleGetApiKey(sendResponse) {
      try {
        const apiKey = await StorageService.getApiKey();
        sendResponse({
          success: true,
          apiKey,
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to get API key",
          timestamp: Date.now()
        });
      }
    }
    async handleSetApiKey(apiKey, sendResponse) {
      try {
        await StorageService.setApiKey(apiKey);
        sendResponse({
          success: true,
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to set API key",
          timestamp: Date.now()
        });
      }
    }
    async handleGetCachedContext(channel, threadId, sendResponse) {
      try {
        const context = await StorageService.getCachedContext(channel, threadId);
        sendResponse({
          success: true,
          context,
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to get cached context",
          timestamp: Date.now()
        });
      }
    }
    async handleSetCachedContext(channel, threadId, context, sendResponse) {
      try {
        await StorageService.setCachedContext(channel, threadId, context);
        sendResponse({
          success: true,
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to set cached context",
          timestamp: Date.now()
        });
      }
    }
    async handleClearCache(sendResponse) {
      try {
        await StorageService.clearExpiredCache();
        sendResponse({
          success: true,
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to clear cache",
          timestamp: Date.now()
        });
      }
    }
    async handleGetStorageInfo(sendResponse) {
      try {
        const usage = await StorageService.getStorageUsage();
        const apiKey = await StorageService.getApiKey();
        sendResponse({
          success: true,
          info: {
            storageUsage: usage,
            hasApiKey: !!apiKey,
            maxStorage: chrome.storage.local.QUOTA_BYTES || 5242880
            // 5MB
          },
          timestamp: Date.now()
        });
      } catch {
        sendResponse({
          success: false,
          error: "Failed to get storage info",
          timestamp: Date.now()
        });
      }
    }
    async handleGenerateReply(message, sendResponse) {
      const keepAliveInterval = this.setupAdvancedKeepAlive();
      try {
        console.log("🚀 Background: *** GENERATE_REPLY MESSAGE RECEIVED ***");
        console.log("📨 Message received:", {
          hasApiKey: !!message.apiKey,
          apiKeyLength: message.apiKey?.length,
          messagesCount: message.messages?.length,
          messageType: message.type,
          timestamp: message.timestamp
        });
        console.log("⏰ Background: Starting reply generation at:", (/* @__PURE__ */ new Date()).toISOString());
        const { messages, apiKey } = message;
        if (!apiKey) {
          console.error("❌ Background: API key is missing");
          sendResponse({
            success: false,
            error: "APIキーが設定されていません"
          });
          return;
        }
        console.log("🔑 Background: Validating API key...");
        console.log("🔑 API key format:", {
          length: apiKey.length,
          startsWithAIza: apiKey.startsWith("AIza"),
          firstChars: apiKey.substring(0, 8) + "..."
        });
        if (!messages || messages.length === 0) {
          console.error("❌ Background: Messages array is empty");
          sendResponse({
            success: false,
            error: "会話履歴が見つかりません"
          });
          return;
        }
        console.log("📝 Background: Processing messages:", messages.length);
        const { GeminiAPIClient: GeminiAPIClient2 } = await Promise.resolve().then(() => GeminiAPIClient$1);
        console.log("🔍 Background: Testing API key validation...");
        const isValidKey = GeminiAPIClient2.validateApiKey(apiKey);
        console.log("✅ Background: API key validation result:", isValidKey);
        if (!isValidKey) {
          console.error("❌ Background: API key validation failed");
          sendResponse({
            success: false,
            error: 'APIキーの形式が正しくありません。"AIza"で始まるキーを入力してください。'
          });
          return;
        }
        const config = { apiKey };
        const serviceMessages = messages.map((msg) => ({
          author: msg.role === "user" ? "ユーザー" : "アシスタント",
          text: msg.content
        }));
        console.log("🤖 Background: Calling Gemini API...", {
          messagesCount: serviceMessages.length,
          configKeys: Object.keys(config)
        });
        const startTime = Date.now();
        console.log("⏰ Background: Gemini API call started at:", (/* @__PURE__ */ new Date()).toISOString());
        const generatedText = await GeminiAPIClient2.generateContextualReply(serviceMessages, config);
        const generationTime = Date.now() - startTime;
        console.log("⏰ Background: Gemini API call completed at:", (/* @__PURE__ */ new Date()).toISOString());
        console.log("✅ Background: Generated reply successfully", {
          generationTime: `${generationTime}ms`,
          replyLength: generatedText.length
        });
        sendResponse({
          success: true,
          text: generatedText
        });
      } catch (error) {
        console.error("❌ Background: Error generating reply:", error);
        let errorMessage = "不明なエラーが発生しました";
        if (error instanceof Error) {
          if (error.message.includes("API key")) {
            errorMessage = "APIキーが無効です。Google AI Studioで正しいAPIキーを確認してください。";
          } else if (error.message.includes("400")) {
            errorMessage = "リクエストが無効です。APIキーを確認してください。";
          } else if (error.message.includes("401")) {
            errorMessage = "APIキーが認証されませんでした。正しいAPIキーを入力してください。";
          } else if (error.message.includes("403")) {
            errorMessage = "APIキーにアクセス権限がありません。";
          } else if (error.message.includes("429")) {
            errorMessage = "APIの利用制限に達しました。しばらく待ってから再試行してください。";
          } else {
            errorMessage = error.message;
          }
        }
        sendResponse({
          success: false,
          error: errorMessage
        });
      } finally {
        this.cleanupAdvancedKeepAlive(keepAliveInterval);
        console.log("⏰ Background: Service Worker keep-alive stopped");
      }
    }
    /**
     * 🔥 CRITICAL: 最強のService Worker keep-alive機能
     */
    setupAdvancedKeepAlive() {
      console.log("🔥 Background: Setting up advanced Service Worker keep-alive...");
      const keepAliveInterval = setInterval(() => {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        console.log("⏰ Background: Service Worker keep-alive ping", timestamp);
        chrome.storage.local.get(["keep-alive"], () => {
          console.log("⏰ Storage access keep-alive completed");
        });
        chrome.runtime.getPlatformInfo((info) => {
          console.log("⏰ Runtime API keep-alive completed:", info.os);
        });
        chrome.alarms.getAll((alarms) => {
          console.log("⏰ Alarms API keep-alive completed:", alarms.length);
        });
        if (chrome.runtime?.id) {
          console.log("⏰ Extension context is valid");
        } else {
          console.warn("⚠️ Extension context is invalid!");
        }
      }, 5e3);
      return keepAliveInterval;
    }
    /**
     * Advanced keep-alive cleanup
     */
    cleanupAdvancedKeepAlive(keepAliveInterval) {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        console.log("⏰ Background: Advanced keep-alive cleaned up");
      }
    }
    setupPeriodicCleanup() {
      this.setupAlarmCleanup();
    }
    // アラーム機能を使用したクリーンアップ（Manifest V3完全準拠）
    setupAlarmCleanup() {
      chrome.alarms.clear("cache-cleanup");
      chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === "cache-cleanup") {
          await this.handleScheduledCleanup();
        }
      });
      chrome.alarms.create("cache-cleanup", {
        delayInMinutes: 5,
        // First cleanup in 5 minutes
        periodInMinutes: 60
        // Then every hour
      });
      console.log("Manifest V3 compliant alarm-based cleanup scheduled");
    }
    /**
     * Handle scheduled cleanup with comprehensive error handling
     */
    async handleScheduledCleanup() {
      try {
        if (!chrome.runtime?.id) {
          console.warn("Background: Extension context invalid during scheduled cleanup");
          return;
        }
        console.log("Background: Running scheduled cache cleanup...");
        const clearedCount = await StorageService.clearExpiredCache();
        if (clearedCount > 0) {
          console.log(`Background: Cleaned up ${clearedCount} expired cache entries`);
        }
      } catch (error) {
        console.error("Background: Error during scheduled cleanup:", error);
        this.handleCleanupFailure();
      }
    }
    /**
     * Handle long-lived connections
     */
    handleConnection(port) {
      console.log("Background: Content script connected:", port.name);
      this.activePorts.add(port);
      port.postMessage({
        type: "CONNECTION_ESTABLISHED",
        success: true,
        timestamp: Date.now()
      });
      port.onMessage.addListener(async (message) => {
        try {
          if (message.type === "PING") {
            port.postMessage({
              type: "PONG",
              success: true,
              timestamp: Date.now()
            });
            return;
          }
          const response = await this.processMessage(message);
          port.postMessage(response);
        } catch (error) {
          console.error("Background: Error processing port message:", error);
          port.postMessage({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now()
          });
        }
      });
      port.onDisconnect.addListener(() => {
        console.log("Background: Content script disconnected:", port.name);
        this.activePorts.delete(port);
        this.handleContentScriptDisconnect(port.name);
      });
    }
    /**
     * Handle content script disconnect for cleanup
     */
    handleContentScriptDisconnect(portName) {
      console.log(`Background: Cleaning up resources for ${portName}`);
    }
    /**
     * Process messages from long-lived connections
     */
    async processMessage(message) {
      if (!isBackgroundMessage(message)) {
        return {
          success: false,
          error: "Invalid message format",
          timestamp: Date.now()
        };
      }
      return new Promise((resolve) => {
        this.handleMessage(message, {}, resolve);
      });
    }
    /**
     * Start heartbeat to keep service worker alive
     */
    startHeartbeat() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      this.heartbeatInterval = setInterval(() => {
        if (this.activePorts.size > 0) {
          console.log(`Background: Heartbeat - ${this.activePorts.size} active connections`);
        }
      }, 25e3);
      console.log("Background: Heartbeat started");
    }
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log("Background: Heartbeat stopped");
      }
    }
    /**
     * Service Worker監視機能
     */
    startServiceWorkerMonitoring() {
      console.log("🔥 Service Worker monitoring started");
      this.serviceWorkerMonitorInterval = setInterval(() => {
        console.log("🔥 Service Worker Status Check:", {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          hasRuntime: !!chrome.runtime,
          runtimeId: chrome.runtime?.id,
          activePorts: this.activePorts.size
        });
        chrome.storage.local.get(["service-worker-ping"], () => {
        });
      }, 15e3);
    }
    stopServiceWorkerMonitoring() {
      if (this.serviceWorkerMonitorInterval) {
        clearInterval(this.serviceWorkerMonitorInterval);
        this.serviceWorkerMonitorInterval = null;
        console.log("🔥 Service Worker monitoring stopped");
      }
    }
    async handleCleanupFailure() {
      this.cleanupFailureCount++;
      if (this.cleanupFailureCount >= this.MAX_CLEANUP_FAILURES) {
        console.warn("Background: Multiple cleanup failures, reducing cleanup frequency");
        chrome.alarms.clear("cache-cleanup");
        chrome.alarms.create("cache-cleanup", {
          delayInMinutes: 120,
          // Wait 2 hours before retry
          periodInMinutes: 240
          // Then every 4 hours
        });
        this.cleanupFailureCount = 0;
      }
    }
  }
  new BackgroundManager();
  self.addEventListener("error", (event) => {
    console.error("Background script error:", event.error);
  });
  self.addEventListener("unhandledrejection", (event) => {
    console.error("Background script unhandled rejection:", event.reason);
  });
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
  const GeminiAPIClient$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    GeminiAPIClient
  }, Symbol.toStringTag, { value: "Module" }));
})();
