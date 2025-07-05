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
  createBackgroundError
} from '../shared/types/background';

class BackgroundManager {
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
      } else {
        console.warn('Unknown message type:', message.type);
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

  private setupPeriodicCleanup(): void {
    // 1時間ごとに期限切れキャッシュをクリーンアップ
    const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

    setInterval(async () => {
      try {
        console.log('Running periodic cache cleanup...');
        await StorageService.clearExpiredCache();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, CLEANUP_INTERVAL);

    console.log('Periodic cleanup scheduled');
  }

  // アラーム機能を使用したクリーンアップ（より効率的）
  // private setupAlarmCleanup(): void {
  //   chrome.alarms.onAlarm.addListener(async (alarm) => {
  //     if (alarm.name === 'cache-cleanup') {
  //       try {
  //         console.log('Running scheduled cache cleanup...');
  //         await StorageService.clearExpiredCache();
  //       } catch (error) {
  //         console.error('Error during scheduled cleanup:', error);
  //       }
  //     }
  //   });

  //   // 1時間ごとにアラームを設定
  //   chrome.alarms.create('cache-cleanup', { 
  //     delayInMinutes: 60,
  //     periodInMinutes: 60 
  //   });

  //   console.log('Alarm-based cleanup scheduled');
  // }
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