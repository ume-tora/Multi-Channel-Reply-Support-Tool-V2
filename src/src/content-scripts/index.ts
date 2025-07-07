import { createServiceStrategy } from './services';
import type { ServiceStrategy } from '../shared/types';
import { memoryManager } from '../shared/performance/MemoryManager';
import { DragDropManager } from '../shared/ui/DragDropManager';
import { ButtonFactory } from '../shared/ui/ButtonFactory';
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
  private dragDropManager: DragDropManager | null = null;

  constructor() {
    this.init();
    this.registerMemoryCleanup();
    
    // 🚨 緊急修正: Service Worker接続は非同期でバックグラウンド実行し、ボタン注入をブロックしない
    this.initializeBackgroundConnection();
  }
  
  private async initializeBackgroundConnection(): Promise<void> {
    try {
      console.log('🔄 Initializing background connection (non-blocking)...');
      await this.waitForServiceWorkerReady();
      console.log('✅ Service Worker ready, establishing connection...');
      await this.ensureConnection();
      console.log('✅ Background connection established successfully');
    } catch (error) {
      console.warn('⚠️ Background connection failed, extension will work in fallback mode:', error);
      // Service Worker接続に失敗してもボタン注入は続行
    }
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
        background: linear-gradient(135deg, #16a34a, #15803d);
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
        background: linear-gradient(135deg, #15803d, #14532d);
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
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        margin: auto;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .gemini-reply-textarea {
        width: 100%;
        min-height: 150px;
        max-height: 400px;
        padding: 12px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s ease;
      }
      
      .gemini-reply-textarea:focus {
        border-color: #10B981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }
      
      .gemini-reply-buttons {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-top: 8px;
        align-items: center;
      }
      
      .gemini-reply-buttons > :first-child {
        margin-right: auto;
      }
      
      .gemini-reply-buttons > :last-child {
        display: flex;
        gap: 8px;
      }
      
      .gemini-reply-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
        box-sizing: border-box;
      }
      
      .gemini-reply-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
      
      .gemini-reply-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      
      .gemini-reply-btn-primary {
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
      }
      
      .gemini-reply-btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #15803d, #14532d);
      }
      
      .gemini-reply-btn-secondary {
        background: #F3F4F6;
        color: #374151;
        border: 1px solid #D1D5DB;
      }
      
      .gemini-reply-btn-secondary:hover:not(:disabled) {
        background: #E5E7EB;
        border-color: #9CA3AF;
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
    } else if (serviceName === 'line-official-account') {
      this.injectLineButton(container, buttonId);
    } else {
      this.injectStandardButton(container, buttonId);
    }
    
    console.log(`AI reply button injected successfully for ${serviceName}`);
  }

  private injectGmailButton(container: HTMLElement, buttonId: string): void {
    console.log('🎨 Injecting Gmail button with drag & drop...');
    
    const button = ButtonFactory.createServiceButton(
      'gmail',
      () => {
        console.log('🚀 Gmail button clicked!');
        this.handleButtonClick();
      },
      {
        id: buttonId,
        title: 'AI返信生成 - ドラッグ&ドロップ対応'
      }
    );
    
    container.appendChild(button);
    
    // ドラッグ&ドロップ機能を追加
    this.dragDropManager = new DragDropManager(button, {
      constrainToViewport: true,
      dragOpacity: 0.8,
      snapToGrid: true,
      gridSize: 20,
      storageKey: 'gmail-ai-button-position'
    });
    
    console.log('✅ Gmail button with drag & drop injected successfully!');
  }

  private injectChatworkButton(container: HTMLElement, buttonId: string): void {
    const button = ButtonFactory.createServiceButton(
      'chatwork',
      () => this.handleButtonClick(),
      {
        id: buttonId,
        title: 'AI返信生成 - ドラッグ&ドロップ対応'
      }
    );
    
    container.appendChild(button);
    
    // ドラッグ&ドロップ機能を追加
    this.dragDropManager = new DragDropManager(button, {
      constrainToViewport: true,
      dragOpacity: 0.8,
      snapToGrid: true,
      gridSize: 20,
      storageKey: 'chatwork-ai-button-position'
    });
    
    console.log('✅ Chatwork button with drag & drop injected successfully');
  }

  private injectLineButton(container: HTMLElement, buttonId: string): void {
    console.log('🟢 Injecting LINE Official Account button with drag & drop...');
    
    const button = ButtonFactory.createServiceButton(
      'line-official-account',
      () => {
        console.log('🟢 LINE button clicked!');
        this.handleButtonClick();
      },
      {
        id: buttonId,
        title: 'AI返信生成 - LINE公式アカウント対応'
      }
    );
    
    container.appendChild(button);
    
    // ドラッグ&ドロップ機能を追加
    this.dragDropManager = new DragDropManager(button, {
      constrainToViewport: true,
      dragOpacity: 0.8,
      snapToGrid: true,
      gridSize: 20,
      storageKey: 'line-ai-button-position'
    });
    
    console.log('✅ LINE button with drag & drop injected successfully');
  }

  private injectStandardButton(container: HTMLElement, buttonId: string): void {
    if (!this.strategy) return;
    
    const button = ButtonFactory.createServiceButton(
      this.strategy.getServiceName(),
      () => this.handleButtonClick(),
      {
        id: buttonId,
        title: 'AI返信生成 - ドラッグ&ドロップ対応'
      }
    );
    
    container.appendChild(button);
    
    // ドラッグ&ドロップ機能を追加
    this.dragDropManager = new DragDropManager(button, {
      constrainToViewport: true,
      dragOpacity: 0.8,
      snapToGrid: true,
      gridSize: 20,
      storageKey: `${this.strategy.getServiceName()}-ai-button-position`
    });
    
    console.log(`✅ Standard button with drag & drop injected for ${this.strategy.getServiceName()}`);
  }

  private async handleButtonClick(): Promise<void> {
    try {
      console.log('🚀 Button clicked, starting handleButtonClick...');
      
      // Extension contextの有効性をチェック
      if (!chrome?.runtime?.id) {
        console.error('❌ Extension context is invalid');
        alert('拡張機能のコンテキストが無効です。ページを再読み込みしてください。');
        return;
      }

      console.log('✅ Extension context is valid, getting API key...');
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        console.log('❌ No API key found');
        alert('Gemini APIキーが設定されていません。\n\n拡張機能のポップアップを開いて「設定」タブからGemini APIキーを入力してください。\n\nAPIキーの取得方法:\n1. https://aistudio.google.com/app/apikey にアクセス\n2. 「Create API Key」をクリック\n3. 生成されたキーをコピーして設定に貼り付け');
        return;
      }

      console.log('✅ API key obtained, extracting messages...');
      const messages = this.strategy!.extractMessages();
      if (messages.length === 0) {
        console.log('❌ No messages found');
        alert('会話履歴が見つかりませんでした。');
        return;
      }

      console.log(`✅ Found ${messages.length} messages, showing modal...`);
      this.showReplyModal(apiKey, messages);
    } catch (error) {
      console.error('💥 Error handling button click:', error);
      
      // Extension context invalidエラーの場合は特別な処理
      if (error.message?.includes('Extension context invalid')) {
        alert('拡張機能のコンテキストが無効になりました。ページを再読み込みしてください。');
      } else {
        alert(`エラーが発生しました: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Wait for Service Worker to be ready
   */
  private async waitForServiceWorkerReady(): Promise<void> {
    // 🚨 緊急修正: 試行回数を減らし、早期にフォールバックする
    const maxAttempts = 5; // 最大5回試行
    const delay = 200; // 200ms間隔

    console.log('🔍 Checking Service Worker readiness...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // chrome.runtime.idの存在確認
        if (chrome?.runtime?.id) {
          console.log(`✅ Service Worker ready on attempt ${attempt}`);
          
          // Service Worker を確実に wake up させる（タイムアウト短縮）
          await this.wakeUpServiceWorker();
          return;
        }
      } catch (error) {
        console.warn(`❌ Service Worker check attempt ${attempt} failed:`, error);
      }

      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting for Service Worker... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.warn('⚠️ Service Worker not ready after attempts - proceeding without connection');
    // エラーをスローせずに警告のみ出力してボタン注入を続行
  }

  /**
   * Wake up Service Worker by sending a simple message
   */
  private async wakeUpServiceWorker(): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log('🔔 Attempting to wake up Service Worker...');
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('❌ Service Worker wake-up failed:', chrome.runtime.lastError);
          } else {
            console.log('✅ Service Worker awakened successfully');
          }
          resolve(); // Always resolve to continue the flow
        });
        
        // 🚨 緊急修正: タイムアウトを500msに大幅短縮
        setTimeout(() => {
          console.log('⏰ Service Worker wake-up timeout after 500ms');
          resolve();
        }, 500);
      } catch (error) {
        console.warn('💥 Error waking up Service Worker:', error);
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
        
        // 🚨 緊急修正: 接続タイムアウトを2秒に短縮
        const connectionTimeout = setTimeout(() => {
          console.warn('🚨 Background connection timeout after 2 seconds');
          port.disconnect();
          reject(new Error('Connection timeout after 2 seconds'));
        }, 2000);

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
          
          // Extension context invalid error の場合
          if (chrome.runtime.lastError) {
            console.error('ContentScript: Port disconnected with error:', chrome.runtime.lastError);
            if (chrome.runtime.lastError.message?.includes('Extension context invalid')) {
              console.error('ContentScript: Extension context invalidated - stopping reconnection attempts');
              this.isConnected = false;
              this.port = null;
              this.stopHeartbeat();
              reject(new Error('Extension context invalid'));
              return;
            }
          }
          
          console.log('ContentScript: Disconnected from background');
          this.isConnected = false;
          this.port = null;
          this.stopHeartbeat();
          
          // Extension contextが有効な場合のみ再接続を試行
          if (chrome?.runtime?.id && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
            console.log(`ContentScript: Attempting reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
            setTimeout(() => this.ensureConnection(), delay);
          } else {
            console.error('ContentScript: Max reconnection attempts reached or extension context invalid');
            reject(new Error('Connection failed permanently'));
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
    // 🔥 SIMPLIFIED: Direct chrome.runtime.sendMessage approach
    console.log('📡 ContentScript: Preparing to send message to background...');
    
    // Add timestamp for response time calculation
    message.timestamp = Date.now();
    
    return this.sendToBackgroundImmediate(message);
  }

  /**
   * Send message immediately (assumes connection is established)
   */
  private sendToBackgroundImmediate(message: any): Promise<any> {
    return new Promise((resolve) => {
      console.log('📡 ContentScript: Sending message via runtime.sendMessage...', {
        type: message.type,
        timestamp: new Date().toISOString(),
        hasApiKey: !!message.apiKey,
        messagesCount: message.messages?.length
      });

      // 🔧 タイムアウトを60秒に延長（Gemini API対応）
      const timeoutId = setTimeout(() => {
        console.warn('🚨 Background request timeout after 60 seconds');
        resolve({ success: false, error: 'Request timeout after 60 seconds' });
      }, 60000);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            console.error('📡 ContentScript: Runtime error:', chrome.runtime.lastError);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log('📡 ContentScript: Response received:', {
              success: response?.success,
              hasText: !!response?.text,
              error: response?.error,
              responseTime: Date.now() - (message.timestamp || Date.now())
            });
            resolve(response || { success: false, error: 'No response received' });
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('📡 ContentScript: Failed to send message:', error);
        resolve({ success: false, error: 'Failed to send message: ' + error.message });
      }
    });
  }

  private async getApiKey(): Promise<string | null> {
    try {
      // 🔥 CRITICAL: Extension contextをまず確認
      if (!chrome?.runtime?.id) {
        throw new Error('Extension context invalid');
      }

      console.log('🔑 Testing simplified background communication...');
      
      // 🔥 CRITICAL: 最もシンプルな方法でBackground Scriptと通信
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background communication timeout after 5 seconds'));
        }, 5000);

        chrome.runtime.sendMessage({
          type: 'GET_API_KEY',
          timestamp: Date.now()
        }, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('🔥 Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('🔥 Background response received:', response);
            resolve(response);
          }
        });
      });

      console.log('🔑 GET_API_KEY response received:', { 
        success: response.success, 
        hasApiKey: !!response.apiKey,
        error: response.error 
      });

      if (response.success && response.apiKey) {
        console.log('✅ API key obtained from background');
        return response.apiKey;
      } else {
        console.warn('❌ Failed to get API key from background:', response.error);
        return null;
      }
    } catch (error) {
      console.error('💥 Error getting API key:', error);
      
      // Extension context invalidエラーを再スロー
      if (error.message?.includes('Extension context invalid')) {
        throw error;
      }
      
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
          <div>
            <button class="gemini-reply-btn gemini-reply-btn-secondary" id="gemini-cancel">キャンセル</button>
            <button class="gemini-reply-btn gemini-reply-btn-primary" id="gemini-insert">挿入</button>
          </div>
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
      console.log('🚀 Starting reply generation...');
      console.log('🔑 API Key length:', apiKey?.length);
      console.log('📨 Messages count:', messages?.length);
      console.log('📨 Messages:', messages);

      button.innerHTML = '<span class="gemini-reply-loading"></span> 生成中...';
      button.disabled = true;
      textarea.value = 'AI返信を生成中...';

      console.log('🔄 Loading MessageConverter...');
      const { MessageConverter } = await import('../shared/types/index');
      const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
      console.log('✅ Converted to Gemini format:', geminiMessages);
      
      console.log('📡 Sending GENERATE_REPLY request to background...');
      const requestData = {
        type: 'GENERATE_REPLY',
        messages: geminiMessages,
        apiKey: apiKey,
        timestamp: Date.now()
      };
      console.log('📡 Request data:', {
        type: requestData.type,
        messagesCount: requestData.messages.length,
        apiKeyLength: requestData.apiKey.length,
        timestamp: new Date(requestData.timestamp).toISOString()
      });
      
      // 🔥 CRITICAL: 最もシンプルな方法でBackground Scriptに送信
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background communication timeout after 60 seconds'));
        }, 60000); // 60秒タイムアウト

        chrome.runtime.sendMessage(requestData, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('🔥 Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('🔥 Background response received:', response);
            resolve(response);
          }
        });
      });
      
      console.log('📡 GENERATE_REPLY response received:', {
        success: response.success,
        hasText: !!response.text,
        error: response.error,
        responseKeys: Object.keys(response)
      });
      
      if (response.success && response.text) {
        console.log('✅ Reply generated successfully, length:', response.text.length);
        textarea.value = response.text;
      } else {
        console.error('❌ Reply generation failed:', response.error);
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('💥 Error generating reply:', error);
      // より詳細なエラーメッセージ
      let errorMessage = 'AI返信の生成でエラーが発生しました。';
      if (error.message?.includes('timeout')) {
        errorMessage += ' ネットワークがタイムアウトしました。';
      } else if (error.message?.includes('API')) {
        errorMessage += ' APIキーを確認してください。';
      } else if (error.message?.includes('Extension context invalid')) {
        errorMessage += ' 拡張機能を再読み込みしてください。';
      } else {
        errorMessage += ` 詳細: ${error.message}`;
      }
      textarea.value = errorMessage;
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
      
      // Cleanup drag & drop manager
      if (this.dragDropManager) {
        this.dragDropManager.destroy();
        this.dragDropManager = null;
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