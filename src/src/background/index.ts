import { StorageService } from '../services/storageService';
import type { 
  BackgroundMessage, 
  BackgroundResponse, 
  ChromeRuntimeSender, 
  ChromeRuntimeSendResponse,
  InstallationDetails
} from '../shared/types/background';
import {
  isBackgroundMessage,
  isGetApiKeyMessage,
  isSetApiKeyMessage,
  isGetCachedContextMessage,
  isSetCachedContextMessage,
  isClearCacheMessage,
  isGetStorageInfoMessage,
  isGenerateReplyMessage,
  createBackgroundError
} from '../shared/types/background';

class BackgroundManager {
  private activePorts = new Set<chrome.runtime.Port>();
  private heartbeatInterval: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('Multi Channel Reply Support Tool: Background script initialized');

    // インストール時の処理
    chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
      this.handleInstalled(details);
    });

    // スタートアップ時の処理
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // メッセージ受信の処理
    chrome.runtime.onMessage.addListener((
      message: unknown, 
      sender: ChromeRuntimeSender, 
      sendResponse: ChromeRuntimeSendResponse
    ) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを許可
    });

    // ロングライブコネクション対応
    chrome.runtime.onConnect.addListener((port) => {
      this.handleConnection(port);
    });

    // ハートビート開始
    this.startHeartbeat();

    // 定期的なクリーンアップ
    this.setupPeriodicCleanup();
  }

  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    console.log('Extension installed/updated:', details);

    if (details.reason === 'install') {
      // 初回インストール時の処理
      console.log('First time installation');
      
      // ウェルカムメッセージやオンボーディングなどがあれば実装
      // chrome.tabs.create({ url: 'welcome.html' });
    } else if (details.reason === 'update') {
      // アップデート時の処理
      console.log('Extension updated to version:', chrome.runtime.getManifest().version);
      
      // 期限切れキャッシュをクリーンアップ
      await StorageService.clearExpiredCache();
    }
  }

  private async handleStartup(): Promise<void> {
    console.log('Browser startup detected');
    
    // ブラウザ起動時に期限切れキャッシュをクリーンアップ
    await StorageService.clearExpiredCache();
  }

  private async handleMessage(
    message: unknown,
    _sender: ChromeRuntimeSender,
    sendResponse: ChromeRuntimeSendResponse
  ): Promise<void> {
    try {
      // Handle simple PING messages for Service Worker wake-up
      if (typeof message === 'object' && message !== null && 'type' in message && (message as any).type === 'PING') {
        console.log('Background: Received PING, responding with PONG');
        sendResponse({ 
          success: true, 
          message: 'PONG',
          timestamp: Date.now()
        });
        return;
      }

      // Validate message structure
      if (!isBackgroundMessage(message)) {
        console.warn('Invalid message format:', message);
        sendResponse({ 
          success: false, 
          error: 'Invalid message format',
          timestamp: Date.now()
        });
        return;
      }

      // Handle different message types with type safety
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
        await this.handleGenerateReply(message, sendResponse);
      } else {
        console.warn('Unknown message type:', message.type || (message as any).action);
        sendResponse({ 
          success: false, 
          error: 'Unknown message type',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  private async handleGetApiKey(sendResponse: ChromeRuntimeSendResponse): Promise<void> {
    try {
      const apiKey = await StorageService.getApiKey();
      sendResponse({ 
        success: true, 
        apiKey,
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to get API key',
        timestamp: Date.now()
      });
    }
  }

  private async handleSetApiKey(apiKey: string, sendResponse: ChromeRuntimeSendResponse): Promise<void> {
    try {
      await StorageService.setApiKey(apiKey);
      sendResponse({ 
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to set API key',
        timestamp: Date.now()
      });
    }
  }

  private async handleGetCachedContext(
    channel: string,
    threadId: string,
    sendResponse: ChromeRuntimeSendResponse
  ): Promise<void> {
    try {
      const context = await StorageService.getCachedContext(channel, threadId);
      sendResponse({ 
        success: true, 
        context,
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to get cached context',
        timestamp: Date.now()
      });
    }
  }

  private async handleSetCachedContext(
    channel: string,
    threadId: string,
    context: unknown,
    sendResponse: ChromeRuntimeSendResponse
  ): Promise<void> {
    try {
      await StorageService.setCachedContext(channel, threadId, context);
      sendResponse({ 
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to set cached context',
        timestamp: Date.now()
      });
    }
  }

  private async handleClearCache(sendResponse: ChromeRuntimeSendResponse): Promise<void> {
    try {
      await StorageService.clearExpiredCache();
      sendResponse({ 
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to clear cache',
        timestamp: Date.now()
      });
    }
  }

  private async handleGetStorageInfo(sendResponse: ChromeRuntimeSendResponse): Promise<void> {
    try {
      const usage = await StorageService.getStorageUsage();
      const apiKey = await StorageService.getApiKey();
      
      sendResponse({ 
        success: true, 
        info: {
          storageUsage: usage,
          hasApiKey: !!apiKey,
          maxStorage: chrome.storage.local.QUOTA_BYTES || 5242880, // 5MB
        },
        timestamp: Date.now()
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: 'Failed to get storage info',
        timestamp: Date.now()
      });
    }
  }

  private async handleGenerateReply(message: any, sendResponse: ChromeRuntimeSendResponse): Promise<void> {
    try {
      const { messages, apiKey } = message;
      
      if (!apiKey) {
        sendResponse({
          success: false,
          error: 'APIキーが設定されていません'
        });
        return;
      }

      if (!messages || messages.length === 0) {
        sendResponse({
          success: false,
          error: '会話履歴が見つかりません'
        });
        return;
      }

      const { GeminiAPIClient } = await import('../shared/api/GeminiAPIClient');
      const config = { apiKey };
      
      const serviceMessages = messages.map(msg => ({
        author: msg.role === 'user' ? 'ユーザー' : 'アシスタント',
        text: msg.content
      }));
      
      const generatedText = await GeminiAPIClient.generateContextualReply(serviceMessages, config);
      
      sendResponse({
        success: true,
        text: generatedText
      });
      
    } catch (error) {
      console.error('Background script error generating reply:', error);
      
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
    }
  }

  private setupPeriodicCleanup(): void {
    // Manifest V3: Use chrome.alarms instead of setInterval for periodic tasks
    // setInterval violates service worker lifecycle rules
    this.setupAlarmCleanup();
  }

  // アラーム機能を使用したクリーンアップ（Manifest V3完全準拠）
  private setupAlarmCleanup(): void {
    // Clear any existing alarms first
    chrome.alarms.clear('cache-cleanup');

    // Set up alarm listener with proper error handling
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'cache-cleanup') {
        await this.handleScheduledCleanup();
      }
    });

    // Create alarm with proper timing for production use
    chrome.alarms.create('cache-cleanup', { 
      delayInMinutes: 5,    // First cleanup in 5 minutes
      periodInMinutes: 60   // Then every hour
    });

    console.log('Manifest V3 compliant alarm-based cleanup scheduled');
  }

  /**
   * Handle scheduled cleanup with comprehensive error handling
   */
  private async handleScheduledCleanup(): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Background: Extension context invalid during scheduled cleanup');
        return;
      }

      console.log('Background: Running scheduled cache cleanup...');
      const clearedCount = await StorageService.clearExpiredCache();
      
      if (clearedCount > 0) {
        console.log(`Background: Cleaned up ${clearedCount} expired cache entries`);
      }
    } catch (error) {
      console.error('Background: Error during scheduled cleanup:', error);
      
      // If cleanup fails repeatedly, reduce frequency
      this.handleCleanupFailure();
    }
  }

  /**
   * Handle long-lived connections
   */
  private handleConnection(port: chrome.runtime.Port): void {
    console.log('Background: Content script connected:', port.name);
    
    // アクティブポートに追加
    this.activePorts.add(port);

    // 接続確立を即座に通知
    port.postMessage({
      type: 'CONNECTION_ESTABLISHED',
      success: true,
      timestamp: Date.now()
    });

    port.onMessage.addListener(async (message) => {
      try {
        // ハートビートメッセージの処理
        if (message.type === 'PING') {
          port.postMessage({
            type: 'PONG',
            success: true,
            timestamp: Date.now()
          });
          return;
        }

        const response = await this.processMessage(message);
        port.postMessage(response);
      } catch (error) {
        console.error('Background: Error processing port message:', error);
        port.postMessage({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Background: Content script disconnected:', port.name);
      this.activePorts.delete(port);
      this.handleContentScriptDisconnect(port.name);
    });
  }

  /**
   * Handle content script disconnect for cleanup
   */
  private handleContentScriptDisconnect(portName: string): void {
    console.log(`Background: Cleaning up resources for ${portName}`);
    // 必要に応じて特定のポートに関連するリソースをクリーンアップ
  }

  /**
   * Process messages from long-lived connections
   */
  private async processMessage(message: any): Promise<any> {
    if (!isBackgroundMessage(message)) {
      return {
        success: false,
        error: 'Invalid message format',
        timestamp: Date.now()
      };
    }

    // 既存のhandleMessage機能を流用
    return new Promise((resolve) => {
      this.handleMessage(message, {} as ChromeRuntimeSender, resolve);
    });
  }

  /**
   * Start heartbeat to keep service worker alive
   */
  private startHeartbeat(): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 25 seconds (Service Worker timeout is 30s)
    this.heartbeatInterval = setInterval(() => {
      if (this.activePorts.size > 0) {
        console.log(`Background: Heartbeat - ${this.activePorts.size} active connections`);
        // Service Worker stays alive as long as there are active listeners
      }
    }, 25000);

    console.log('Background: Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Background: Heartbeat stopped');
    }
  }

  /**
   * Handle cleanup failures by adjusting alarm frequency
   */
  private cleanupFailureCount = 0;
  private readonly MAX_CLEANUP_FAILURES = 3;

  private async handleCleanupFailure(): Promise<void> {
    this.cleanupFailureCount++;
    
    if (this.cleanupFailureCount >= this.MAX_CLEANUP_FAILURES) {
      console.warn('Background: Multiple cleanup failures, reducing cleanup frequency');
      
      // Clear current alarm and create a less frequent one
      chrome.alarms.clear('cache-cleanup');
      chrome.alarms.create('cache-cleanup', { 
        delayInMinutes: 120,  // Wait 2 hours before retry
        periodInMinutes: 240  // Then every 4 hours
      });
      
      this.cleanupFailureCount = 0; // Reset counter
    }
  }
}

// Background scriptを初期化
new BackgroundManager();

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Background script unhandled rejection:', event.reason);
});