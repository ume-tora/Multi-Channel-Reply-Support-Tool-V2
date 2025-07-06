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
  private serviceWorkerMonitorInterval: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // 🔥 CRITICAL: Background Script 初期化の完全ログ
    console.log('🚀 ===== BACKGROUND SCRIPT INITIALIZATION =====');
    console.log('🚀 Multi Channel Reply Support Tool: Background script initialized');
    console.log('🚀 Service Worker Context:', {
      hasRuntime: !!chrome.runtime,
      runtimeId: chrome.runtime?.id,
      version: chrome.runtime?.getManifest()?.version,
      timestamp: new Date().toISOString()
    });

    // 🔥 CRITICAL: Service Worker 生存状態の監視開始
    this.startServiceWorkerMonitoring();

    // インストール時の処理
    chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
      console.log('🔥 onInstalled event fired:', details);
      this.handleInstalled(details);
    });

    // スタートアップ時の処理
    chrome.runtime.onStartup.addListener(() => {
      console.log('🔥 onStartup event fired');
      this.handleStartup();
    });

    // 🔥 CRITICAL: メッセージ受信の処理（最優先デバッグ）
    chrome.runtime.onMessage.addListener((
      message: unknown, 
      sender: ChromeRuntimeSender, 
      sendResponse: ChromeRuntimeSendResponse
    ) => {
      console.log('🔥 ===== MESSAGE RECEIVED IN BACKGROUND =====');
      console.log('🔥 Message:', message);
      console.log('🔥 Sender:', sender);
      console.log('🔥 Time:', new Date().toISOString());
      
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを許可
    });

    // ロングライブコネクション対応
    chrome.runtime.onConnect.addListener((port) => {
      console.log('🔥 Port connection established:', port.name);
      this.handleConnection(port);
    });

    // ハートビート開始
    this.startHeartbeat();

    // 定期的なクリーンアップ
    this.setupPeriodicCleanup();
    
    console.log('🚀 ===== BACKGROUND SCRIPT INITIALIZATION COMPLETE =====');
  }
  
  /**
   * Service Worker 生存状態の監視
   */
  private logServiceWorkerState(): void {
    console.log('🔥 Service Worker State Check:', {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      workerGlobalScope: typeof WorkerGlobalScope !== 'undefined',
      selfExists: typeof self !== 'undefined',
      globalThis: typeof globalThis !== 'undefined',
      chromeExtensionContext: !!(chrome && chrome.runtime && chrome.runtime.id)
    });
    
    // 定期的にService Worker の状態をログ出力
    setInterval(() => {
      console.log('🔥 Service Worker Heartbeat:', {
        timestamp: new Date().toISOString(),
        runtimeId: chrome.runtime?.id,
        activeConnections: this.activePorts.size
      });
    }, 15000); // 15秒間隔でハートビート
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
      // 🔍 メッセージ受信の詳細ログ
      console.log('*** BACKGROUND: MESSAGE RECEIVED ***', {
        timestamp: new Date().toISOString(),
        messageType: typeof message === 'object' && message !== null && 'type' in message ? (message as any).type : 'unknown',
        messageKeys: typeof message === 'object' && message !== null ? Object.keys(message) : [],
        sender: _sender
      });

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
        console.log('*** GENERATE_REPLY MESSAGE RECEIVED ***', {
          timestamp: new Date().toISOString(),
          hasApiKey: !!(message as any).apiKey,
          apiKeyLength: (message as any).apiKey?.length,
          hasMessages: !!(message as any).messages,
          messagesCount: (message as any).messages?.length
        });
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
    // 🔥 CRITICAL: 最強のService Worker keep-alive機能
    const keepAliveInterval = this.setupAdvancedKeepAlive();
    
    try {
      console.log('🚀 Background: *** GENERATE_REPLY MESSAGE RECEIVED ***');
      console.log('📨 Message received:', { 
        hasApiKey: !!message.apiKey,
        apiKeyLength: message.apiKey?.length,
        messagesCount: message.messages?.length,
        messageType: message.type,
        timestamp: message.timestamp
      });
      console.log('⏰ Background: Starting reply generation at:', new Date().toISOString());
      
      const { messages, apiKey } = message;
      
      if (!apiKey) {
        console.error('❌ Background: API key is missing');
        sendResponse({
          success: false,
          error: 'APIキーが設定されていません'
        });
        return;
      }

      // Enhanced API key validation with detailed logging
      console.log('🔑 Background: Validating API key...');
      console.log('🔑 API key format:', {
        length: apiKey.length,
        startsWithAIza: apiKey.startsWith('AIza'),
        firstChars: apiKey.substring(0, 8) + '...'
      });

      if (!messages || messages.length === 0) {
        console.error('❌ Background: Messages array is empty');
        sendResponse({
          success: false,
          error: '会話履歴が見つかりません'
        });
        return;
      }

      console.log('📝 Background: Processing messages:', messages.length);
      
      const { GeminiAPIClient } = await import('../shared/api/GeminiAPIClient');
      
      // Test API key first
      console.log('🔍 Background: Testing API key validation...');
      const isValidKey = GeminiAPIClient.validateApiKey(apiKey);
      console.log('✅ Background: API key validation result:', isValidKey);
      
      if (!isValidKey) {
        console.error('❌ Background: API key validation failed');
        sendResponse({
          success: false,
          error: 'APIキーの形式が正しくありません。"AIza"で始まるキーを入力してください。'
        });
        return;
      }
      
      const config = { apiKey };
      
      const serviceMessages = messages.map(msg => ({
        author: msg.role === 'user' ? 'ユーザー' : 'アシスタント',
        text: msg.content
      }));
      
      console.log('🤖 Background: Calling Gemini API...', {
        messagesCount: serviceMessages.length,
        configKeys: Object.keys(config)
      });
      
      const startTime = Date.now();
      console.log('⏰ Background: Gemini API call started at:', new Date().toISOString());
      const generatedText = await GeminiAPIClient.generateContextualReply(serviceMessages, config);
      const generationTime = Date.now() - startTime;
      console.log('⏰ Background: Gemini API call completed at:', new Date().toISOString());
      
      console.log('✅ Background: Generated reply successfully', {
        generationTime: `${generationTime}ms`,
        replyLength: generatedText.length
      });
      
      sendResponse({
        success: true,
        text: generatedText
      });
      
    } catch (error) {
      console.error('❌ Background: Error generating reply:', error);
      
      // Enhanced error reporting
      let errorMessage = '不明なエラーが発生しました';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'APIキーが無効です。Google AI Studioで正しいAPIキーを確認してください。';
        } else if (error.message.includes('400')) {
          errorMessage = 'リクエストが無効です。APIキーを確認してください。';
        } else if (error.message.includes('401')) {
          errorMessage = 'APIキーが認証されませんでした。正しいAPIキーを入力してください。';
        } else if (error.message.includes('403')) {
          errorMessage = 'APIキーにアクセス権限がありません。';
        } else if (error.message.includes('429')) {
          errorMessage = 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
        } else {
          errorMessage = error.message;
        }
      }
      
      sendResponse({
        success: false,
        error: errorMessage
      });
      
    } finally {
      // 🔥 Keep-alive cleanup
      this.cleanupAdvancedKeepAlive(keepAliveInterval);
      console.log('⏰ Background: Service Worker keep-alive stopped');
    }
  }

  /**
   * 🔥 CRITICAL: 最強のService Worker keep-alive機能
   */
  private setupAdvancedKeepAlive(): number {
    console.log('🔥 Background: Setting up advanced Service Worker keep-alive...');
    
    // 複数の手法でService Workerを生存させる
    const keepAliveInterval = setInterval(() => {
      const timestamp = new Date().toISOString();
      console.log('⏰ Background: Service Worker keep-alive ping', timestamp);
      
      // Method 1: chrome.storage access
      chrome.storage.local.get(['keep-alive'], () => {
        console.log('⏰ Storage access keep-alive completed');
      });
      
      // Method 2: chrome.runtime.getPlatformInfo
      chrome.runtime.getPlatformInfo((info) => {
        console.log('⏰ Runtime API keep-alive completed:', info.os);
      });
      
      // Method 3: chrome.alarms check
      chrome.alarms.getAll((alarms) => {
        console.log('⏰ Alarms API keep-alive completed:', alarms.length);
      });
      
      // Method 4: Extension context validation
      if (chrome.runtime?.id) {
        console.log('⏰ Extension context is valid');
      } else {
        console.warn('⚠️ Extension context is invalid!');
      }
    }, 5000); // 5秒間隔で実行
    
    return keepAliveInterval;
  }

  /**
   * Advanced keep-alive cleanup
   */
  private cleanupAdvancedKeepAlive(keepAliveInterval: number): void {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      console.log('⏰ Background: Advanced keep-alive cleaned up');
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
   * Service Worker監視機能
   */
  private startServiceWorkerMonitoring(): void {
    console.log('🔥 Service Worker monitoring started');
    
    // 15秒間隔でService Worker状態をログ
    this.serviceWorkerMonitorInterval = setInterval(() => {
      console.log('🔥 Service Worker Status Check:', {
        timestamp: new Date().toISOString(),
        hasRuntime: !!chrome.runtime,
        runtimeId: chrome.runtime?.id,
        activePorts: this.activePorts.size
      });
      
      // Storage操作でService Workerを維持
      chrome.storage.local.get(['service-worker-ping'], () => {
        // This helps keep Service Worker alive
      });
    }, 15000);
  }

  private stopServiceWorkerMonitoring(): void {
    if (this.serviceWorkerMonitorInterval) {
      clearInterval(this.serviceWorkerMonitorInterval);
      this.serviceWorkerMonitorInterval = null;
      console.log('🔥 Service Worker monitoring stopped');
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