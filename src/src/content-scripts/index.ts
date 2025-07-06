import { createServiceStrategy } from './services';
import type { ServiceStrategy } from '../shared/types';
import { memoryManager } from '../shared/performance/MemoryManager';
class ContentScriptManager {
  private strategy: ServiceStrategy | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private port: chrome.runtime.Port | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: Array<{message: any, resolve: (response: any) => void}> = [];
  private heartbeatInterval: number | null = null;

  constructor() {
    this.init();
    this.registerMemoryCleanup();
    // Service Worker準備完了を待ってから接続開始
    this.waitForServiceWorkerReady()
      .then(() => {
        console.log('ContentScript: Service Worker ready, establishing connection...');
        return this.ensureConnection();
      })
      .catch((error) => {
        console.error('ContentScript: Failed to establish Service Worker connection:', error);
        // Fallback: ボタン注入だけでも試行
        console.log('ContentScript: Proceeding with button injection only');
      });
  }

  private init(): void {
    console.log('🚀 Multi Channel Reply Support Tool: Content script initialized');
    console.log(`🌐 Current URL: ${window.location.href}`);
    console.log(`📅 Current time: ${new Date().toISOString()}`);
    console.log(`🔧 User agent: ${navigator.userAgent}`);
    
    this.injectStyles();
    this.currentUrl = window.location.href;
    
    // 🚨 緊急修正: より積極的なボタン注入
    setTimeout(() => {
      console.log('🔄 Starting aggressive button injection...');
      this.checkAndInjectButton();
    }, 500);
    
    this.startObserving();
    this.startUrlMonitoring();
    
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private injectStyles(): void {
    const styleId = 'gemini-reply-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gemini-reply-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 0 8px;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        z-index: 1000;
        position: relative;
      }
      
      .gemini-reply-button:hover {
        background: linear-gradient(135deg, #059669, #047857);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
      }
      
      .gemini-reply-button:disabled {
        background: #9CA3AF;
        cursor: not-allowed;
        transform: none;
      }
      
      .gemini-reply-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .gemini-reply-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .gemini-reply-textarea {
        width: 100%;
        min-height: 150px;
        padding: 12px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .gemini-reply-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .gemini-reply-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .gemini-reply-btn-primary {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
      }
      
      .gemini-reply-btn-secondary {
        background: #F3F4F6;
        color: #374151;
      }
      
      .gemini-reply-loading {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  private async checkAndInjectButton(): Promise<void> {
    try {
      console.log('🔍 checkAndInjectButton: Starting button injection process...');
      
      this.strategy = createServiceStrategy(window.location.href);
      
      if (!this.strategy) {
        console.log('❌ No strategy found for current URL:', window.location.href);
        return;
      }

      console.log(`✅ Strategy loaded: ${this.strategy.getServiceName()}`);

      if (this.strategy.isButtonInjected()) {
        console.log('ℹ️ Button already injected');
        return;
      }

      console.log('🔍 Finding insertion point...');
      const insertionPoint = await this.strategy.findInsertionPoint();
      
      if (insertionPoint) {
        console.log('✅ Insertion point found, injecting button...');
        this.injectReplyButton(insertionPoint);
        this.retryCount = 0;
        console.log('🎉 Button injection completed successfully!');
      } else {
        console.log('❌ Insertion point not found, scheduling retry...');
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('💥 Error in checkAndInjectButton:', error);
      this.scheduleRetry();
    }
  }

  private injectReplyButton(container: HTMLElement): void {
    if (!this.strategy) return;

    const buttonId = `gemini-reply-button-${this.strategy.getServiceName()}`;
    
    if (document.getElementById(buttonId)) {
      console.log('Button already exists, skipping injection');
      return;
    }

    const serviceName = this.strategy.getServiceName();
    
    if (serviceName === 'gmail') {
      this.injectGmailButton(container, buttonId);
    } else if (serviceName === 'chatwork') {
      this.injectChatworkButton(container, buttonId);
    } else {
      this.injectStandardButton(container, buttonId);
    }
    
    console.log(`AI reply button injected successfully for ${serviceName}`);
  }

  private injectGmailButton(container: HTMLElement, buttonId: string): void {
    console.log('🎨 Injecting Gmail button...');
    
    const button = document.createElement('button');
    button.id = buttonId;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'AI返信生成');
    button.className = 'gemini-reply-button';
    
    // 🚨 緊急修正: より目立つスタイル
    button.style.cssText = `
      display: block !important;
      width: 140px !important;
      height: 40px !important;
      padding: 8px 16px !important;
      margin: 8px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      background: linear-gradient(135deg, #FF4444, #CC0000) !important;
      color: white !important;
      border: 2px solid #FF0000 !important;
      font-size: 14px !important;
      font-weight: bold !important;
      transition: all 0.2s ease !important;
      z-index: 999999 !important;
      position: relative !important;
      box-shadow: 0 4px 12px rgba(255, 68, 68, 0.5) !important;
      text-align: center !important;
    `;
    
    button.innerHTML = '🤖 AI返信生成';
    button.title = 'AI返信生成 - 緊急修正版';
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #CC0000, #990000) !important';
      button.style.transform = 'scale(1.1) !important';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #FF4444, #CC0000) !important';
      button.style.transform = 'scale(1) !important';
    });
    
    button.addEventListener('click', () => {
      console.log('🚀 Gmail button clicked!');
      this.handleButtonClick();
    });
    
    container.appendChild(button);
    console.log('✅ Gmail button injected successfully!');
  }

  private injectChatworkButton(container: HTMLElement, buttonId: string): void {
    const button = document.createElement('button');
    button.id = buttonId;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'AI返信生成');
    button.className = 'gemini-reply-button';
    
    button.style.cssText = `
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      margin: 4px;
      border-radius: 6px;
      cursor: pointer;
      background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
      color: white !important;
      border: none !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      transition: all 0.2s ease;
      z-index: 9999 !important;
      position: relative !important;
      box-shadow: 0 2px 4px rgba(231, 76, 60, 0.3) !important;
      flex-shrink: 0 !important;
    `;
    
    button.innerHTML = '🤖 AI返信生成';
    button.title = 'AI返信生成';
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #c0392b, #a93226) !important';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b) !important';
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    container.appendChild(button);
    console.log(`Chatwork button injected successfully`);
  }

  private injectStandardButton(container: HTMLElement, buttonId: string): void {
    const button = document.createElement('button');
    button.id = buttonId;
    button.className = 'gemini-reply-button';
    button.innerHTML = '🤖 AI返信生成';
    button.addEventListener('click', () => this.handleButtonClick());
    
    container.appendChild(button);
    console.log(`Standard button injected for ${this.strategy?.getServiceName()}`);
  }

  private async handleButtonClick(): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        alert('Gemini APIキーが設定されていません。\n\n拡張機能のポップアップを開いて「設定」タブからGemini APIキーを入力してください。\n\nAPIキーの取得方法:\n1. https://aistudio.google.com/app/apikey にアクセス\n2. 「Create API Key」をクリック\n3. 生成されたキーをコピーして設定に貼り付け');
        return;
      }

      const messages = this.strategy!.extractMessages();
      if (messages.length === 0) {
        alert('会話履歴が見つかりませんでした。');
        return;
      }

      this.showReplyModal(apiKey, messages);
    } catch (error) {
      console.error('Error handling button click:', error);
      alert('エラーが発生しました。');
    }
  }

  /**
   * Wait for Service Worker to be ready
   */
  private async waitForServiceWorkerReady(): Promise<void> {
    const maxAttempts = 20; // 最大20回試行
    const delay = 500; // 500ms間隔

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // chrome.runtime.idの存在確認
        if (chrome?.runtime?.id) {
          console.log(`ContentScript: Service Worker ready on attempt ${attempt}`);
          
          // Service Worker を確実に wake up させる
          await this.wakeUpServiceWorker();
          return;
        }
      } catch (error) {
        console.warn(`ContentScript: Service Worker check attempt ${attempt} failed:`, error);
      }

      if (attempt < maxAttempts) {
        console.log(`ContentScript: Waiting for Service Worker... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('ContentScript: Service Worker not ready after maximum attempts');
    throw new Error('Service Worker not ready');
  }

  /**
   * Wake up Service Worker by sending a simple message
   */
  private async wakeUpServiceWorker(): Promise<void> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('ContentScript: Service Worker wake-up failed:', chrome.runtime.lastError);
          } else {
            console.log('ContentScript: Service Worker awakened');
          }
          resolve(); // Always resolve to continue the flow
        });
        
        // Timeout after 2 seconds
        setTimeout(() => {
          console.log('ContentScript: Service Worker wake-up timeout');
          resolve();
        }, 2000);
      } catch (error) {
        console.warn('ContentScript: Error waking up Service Worker:', error);
        resolve();
      }
    });
  }

  /**
   * Ensure connection to background script
   */
  private async ensureConnection(): Promise<void> {
    if (this.isConnected && this.port) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connectToBackground();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Connect to background script with robust error handling
   */
  private connectToBackground(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome.runtime?.id) {
          reject(new Error('Extension context invalid'));
          return;
        }

        const port = chrome.runtime.connect({ name: 'content-script' });
        
        const connectionTimeout = setTimeout(() => {
          port.disconnect();
          reject(new Error('Connection timeout'));
        }, 5000);

        port.onMessage.addListener((response) => {
          if (response.type === 'CONNECTION_ESTABLISHED') {
            clearTimeout(connectionTimeout);
            this.port = port;
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            console.log('ContentScript: Successfully connected to background');
            this.startHeartbeat();
            this.processMessageQueue();
            resolve();
            return;
          }

          this.handleBackgroundResponse(response);
        });

        port.onDisconnect.addListener(() => {
          clearTimeout(connectionTimeout);
          console.log('ContentScript: Disconnected from background');
          
          this.isConnected = false;
          this.port = null;
          this.stopHeartbeat();
          
          if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
            console.log(`ContentScript: Attempting reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
            setTimeout(() => this.ensureConnection(), delay);
          } else {
            console.error('ContentScript: Max reconnection attempts reached');
          }
        });

      } catch (error) {
        console.error('ContentScript: Failed to connect to background:', error);
        reject(error);
      }
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.port && this.isConnected) {
        this.port.postMessage({ type: 'PING' });
      }
    }, 20000); // Send ping every 20 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle responses from background script
   */
  private pendingRequests = new Map<string, (response: any) => void>();

  private handleBackgroundResponse(response: any): void {
    if (response.requestId && this.pendingRequests.has(response.requestId)) {
      const resolve = this.pendingRequests.get(response.requestId);
      this.pendingRequests.delete(response.requestId);
      resolve!(response);
    }
  }

  /**
   * Process queued messages after connection is established
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`ContentScript: Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(({ message, resolve }) => {
      this.sendToBackgroundImmediate(message).then(resolve);
    });
  }

  /**
   * Send message to background with automatic queuing and retry
   */
  private async sendToBackground(message: any): Promise<any> {
    // Ensure connection before sending
    try {
      await this.ensureConnection();
    } catch (error) {
      console.error('ContentScript: Failed to establish connection:', error);
      return { success: false, error: 'Failed to establish connection' };
    }

    return this.sendToBackgroundImmediate(message);
  }

  /**
   * Send message immediately (assumes connection is established)
   */
  private sendToBackgroundImmediate(message: any): Promise<any> {
    return new Promise((resolve) => {
      if (!this.port || !this.isConnected) {
        // Queue the message for later processing
        this.messageQueue.push({ message, resolve });
        console.log('ContentScript: Message queued - no active connection');
        return;
      }

      const requestId = Date.now().toString() + Math.random().toString(36);
      message.requestId = requestId;
      
      this.pendingRequests.set(requestId, resolve);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({ success: false, error: 'Request timeout' });
        }
      }, 30000);

      try {
        this.port.postMessage(message);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        console.error('ContentScript: Failed to send message:', error);
        resolve({ success: false, error: 'Failed to send message' });
      }
    });
  }

  private async getApiKey(): Promise<string | null> {
    try {
      const response = await this.sendToBackground({
        type: 'GET_API_KEY',
        timestamp: Date.now()
      });

      if (response.success && response.apiKey) {
        return response.apiKey;
      } else {
        console.warn('ContentScript: Failed to get API key from background:', response.error);
        return null;
      }
    } catch (error) {
      console.error('ContentScript: Error getting API key:', error);
      return null;
    }
  }

  private showReplyModal(apiKey: string, messages: any[]): void {
    const modal = document.createElement('div');
    modal.className = 'gemini-reply-modal';
    modal.innerHTML = `
      <div class="gemini-reply-modal-content">
        <h3>🤖 AI返信生成</h3>
        <textarea class="gemini-reply-textarea" placeholder="AI返信を生成中..."></textarea>
        <div class="gemini-reply-buttons">
          <button class="gemini-reply-btn gemini-reply-btn-secondary" id="gemini-regenerate">再生成</button>
          <button class="gemini-reply-btn gemini-reply-btn-secondary" id="gemini-cancel">キャンセル</button>
          <button class="gemini-reply-btn gemini-reply-btn-primary" id="gemini-insert">挿入</button>
        </div>
      </div>
    `;

    const textarea = modal.querySelector('.gemini-reply-textarea') as HTMLTextAreaElement;
    const regenerateBtn = modal.querySelector('#gemini-regenerate') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#gemini-cancel') as HTMLButtonElement;
    const insertBtn = modal.querySelector('#gemini-insert') as HTMLButtonElement;

    regenerateBtn.addEventListener('click', () => this.generateReply(apiKey, messages, textarea, regenerateBtn));
    cancelBtn.addEventListener('click', () => modal.remove());
    insertBtn.addEventListener('click', () => {
      this.strategy!.insertReply(textarea.value);
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    this.generateReply(apiKey, messages, textarea, regenerateBtn);
  }

  private async generateReply(
    apiKey: string, 
    messages: any[], 
    textarea: HTMLTextAreaElement, 
    button: HTMLButtonElement
  ): Promise<void> {
    try {
      button.innerHTML = '<span class="gemini-reply-loading"></span> 生成中...';
      button.disabled = true;
      textarea.value = 'AI返信を生成中...';

      const { MessageConverter } = await import('../shared/types/index');
      const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
      
      const response = await this.sendToBackground({
        type: 'GENERATE_REPLY',
        messages: geminiMessages,
        apiKey: apiKey,
        timestamp: Date.now()
      });
      
      if (response.success && response.text) {
        textarea.value = response.text;
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error generating reply:', error);
      textarea.value = 'AI返信の生成でエラーが発生しました。APIキーを確認してください。';
    } finally {
      button.innerHTML = '再生成';
      button.disabled = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      setTimeout(async () => await this.checkAndInjectButton(), this.RETRY_DELAY * this.retryCount);
    }
  }

  private startObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      
      if (shouldCheck && this.retryCount < this.MAX_RETRIES) {
        setTimeout(async () => await this.checkAndInjectButton(), 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private startUrlMonitoring(): void {
    const checkUrlChange = () => {
      if (window.location.href !== this.currentUrl) {
        console.log('URL changed, reinitializing...');
        this.currentUrl = window.location.href;
        this.retryCount = 0;
        
        setTimeout(async () => {
          await this.checkAndInjectButton();
        }, 1000);
      }
    };

    setInterval(checkUrlChange, 2000);
    
    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('pushstate', checkUrlChange);
    window.addEventListener('replacestate', checkUrlChange);
  }

  private registerMemoryCleanup(): void {
    memoryManager.registerCleanupTask('content-script', () => {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.strategy = null;
    });
  }

  private cleanup(): void {
    try {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      // Stop heartbeat
      this.stopHeartbeat();

      // Clear pending requests and message queue
      this.pendingRequests.clear();
      this.messageQueue = [];

      // Update connection state
      this.isConnected = false;

      // Disconnect port safely
      if (this.port) {
        try {
          this.port.disconnect();
        } catch (error) {
          console.warn('ContentScript: Error disconnecting port:', error);
        }
        this.port = null;
      }
      
      // Safe memory cleanup without chrome APIs
      try {
        memoryManager.cleanup();
      } catch (error) {
        console.warn('ContentScript: Error during memory cleanup:', error);
      }

      console.log('ContentScript: Cleanup completed successfully');
    } catch (error) {
      console.error('ContentScript: Error during cleanup:', error);
    }
  }
}

// Initialize the content script manager
new ContentScriptManager();