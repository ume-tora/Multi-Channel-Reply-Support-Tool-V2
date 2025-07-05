import { createServiceStrategy } from './services';
import type { ServiceStrategy } from '../shared/types';
import { memoryManager } from '../shared/performance/MemoryManager';

class ContentScriptManager {
  private strategy: ServiceStrategy | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 1000;
  private debounceTimeout: number | null = null;
  private isProcessing = false;
  private lastInjectionTime = 0;
  private readonly INJECTION_THROTTLE_MS = 1000;

  constructor() {
    this.init();
    this.registerMemoryCleanup();
  }

  private init(): void {
    // iframe内での実行を検出
    const isInIframe = window.self !== window.top;
    const frameInfo = isInIframe ? 'iframe' : 'main frame';
    
    console.log(`Multi Channel Reply Support Tool: Content script initialized in ${frameInfo}`);
    console.log(`Current URL: ${window.location.href}`);
    console.log(`Frame depth: ${this.getFrameDepth()}`);
    
    // スタイルシートを注入（メインフレームとiframe両方で必要）
    this.injectStyles();
    
    // 現在のURLを記録
    this.currentUrl = window.location.href;
    
    // Google Chat iframe内での特別処理
    if (isInIframe && window.location.hostname === 'chat.google.com') {
      console.log('🎯 Google Chat iframe detected - enhanced injection mode');
      this.setupGoogleChatIframeMode();
    }
    
    // 初期チェック
    this.checkAndInjectButton();
    
    // DOM変更の監視を開始
    this.startObserving();
    
    // URL変更の監視（SPA対応）
    this.startUrlMonitoring();
    
    // ページアンロード時のクリーンアップ
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
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      }
      
      .gemini-reply-modal h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1F2937;
      }
      
      .gemini-reply-textarea {
        width: 100%;
        min-height: 200px;
        padding: 12px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        margin-bottom: 16px;
      }
      
      .gemini-reply-textarea:focus {
        outline: none;
        border-color: #3B82F6;
      }
      
      .gemini-reply-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .gemini-reply-btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }
      
      .gemini-reply-btn-primary {
        background: #3B82F6;
        color: white;
      }
      
      .gemini-reply-btn-primary:hover {
        background: #2563EB;
      }
      
      .gemini-reply-btn-secondary {
        background: #F3F4F6;
        color: #374151;
      }
      
      .gemini-reply-btn-secondary:hover {
        background: #E5E7EB;
      }
      
      .gemini-reply-loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff40;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }

  private checkAndInjectButton(): void {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      
      // 現在のURLに対応するStrategyを取得
      this.strategy = createServiceStrategy(window.location.href);
      
      if (!this.strategy) {
        console.log('No strategy found for current URL:', window.location.href);
        return;
      }

      console.log(`Strategy loaded: ${this.strategy.getServiceName()}`);

      // ボタンが既に注入されているかチェック
      if (this.strategy.isButtonInjected()) {
        console.log('Button already injected');
        return;
      }

      // 挿入ポイントを探す
      const insertionPoint = this.strategy.findInsertionPoint();
      
      if (insertionPoint) {
        console.log('Insertion point found, injecting button...');
        this.injectReplyButton(insertionPoint);
        this.retryCount = 0; // 成功したらリトライカウントをリセット
        this.lastInjectionTime = Date.now();
      } else {
        console.log('Insertion point not found');
        
        // デバッグ: DOM状態を詳細出力（GmailとGoogle Chatの場合）
        if (this.strategy && (this.strategy.getServiceName() === 'gmail' || this.strategy.getServiceName() === 'google-chat')) {
          console.log(`${this.strategy.getServiceName()} strategy detected, logging DOM state for debugging...`);
          (this.strategy as any).logCurrentDOMState?.();
          
          // Google Chatの場合、絶対確実な緊急注入を実行
          if (this.strategy.getServiceName() === 'google-chat') {
            console.log('🚨 === GOOGLE CHAT EMERGENCY PROTOCOL ===');
            
            // **緊急注入プロトコル実行**
            const emergencyResult = this.executeEmergencyInjection();
            if (emergencyResult) {
              console.log('✅ Emergency injection SUCCESS!');
              return; // 成功したので終了
            }
            
            console.log('🚨 Emergency injection FAILED - trying force injection...');
            const forceInsertionPoint = (this.strategy as any).forceInjectButton?.();
            if (forceInsertionPoint) {
              console.log('Google Chat: Force injection point found, injecting button...');
              this.injectReplyButton(forceInsertionPoint);
            }
          }
        }
        
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('Error in checkAndInjectButton:', error);
      this.scheduleRetry();
    } finally {
      this.isProcessing = false;
    }
  }

  private injectReplyButton(container: HTMLElement): void {
    const buttonId = `gemini-reply-button-${this.strategy.getServiceName()}`;
    
    // 既存のボタンを削除
    const existingButton = document.getElementById(buttonId);
    if (existingButton) {
      existingButton.remove();
    }

    // Gmailのツールバー統合の場合は特別な処理
    if (this.strategy && this.strategy.getServiceName() === 'gmail' && this.isGmailToolbarContainer(container)) {
      this.injectGmailToolbarButton(container, buttonId);
    } else {
      // 標準的なボタン挿入
      this.injectStandardButton(container, buttonId);
    }
    
    console.log('AI reply button injected successfully');
  }

  /**
   * Gmailツールバー用のボタン挿入（画面内配置保証）
   */
  private injectGmailToolbarButton(container: HTMLElement, buttonId: string): void {
    // Gmailツールバーのスタイルに合わせたボタンを作成
    const button = document.createElement('div');
    button.id = buttonId;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'AI返信生成');
    button.className = 'gemini-reply-button';
    
    // 基本スタイル設定
    button.style.cssText = `
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 32px;
      padding: 4px;
      margin: 0 4px;
      border-radius: 16px;
      cursor: pointer;
      background: linear-gradient(135deg, #10B981, #059669) !important;
      color: white !important;
      font-size: 12px;
      font-weight: 500;
      border: 2px solid #047857 !important;
      transition: all 0.2s ease;
      z-index: 9999 !important;
      position: relative !important;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3) !important;
      opacity: 1 !important;
      visibility: visible !important;
      flex-shrink: 0 !important;
      white-space: nowrap !important;
    `;
    
    // アイコンとテキストを設定（コンパクトデザイン）
    button.innerHTML = '<span style="font-size: 16px;">🤖</span>';
    button.title = 'AI返信生成';
    
    // ホバー効果
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #059669, #047857) !important';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #10B981, #059669) !important';
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    // 画面内配置戦略の実装
    this.positionButtonWithinScreen(button, container);
    
    // デバッグ: ボタンの配置を確認
    setTimeout(() => {
      const rect = button.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      console.log('Gmail toolbar button positioned');
      console.log(`Button position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
      console.log(`Screen size: ${screenWidth}x${screenHeight}`);
      console.log(`Button within screen: x=${rect.x >= 0 && rect.right <= screenWidth}, y=${rect.y >= 0 && rect.bottom <= screenHeight}`);
      console.log(`Container class: ${container.className}`);
      
      // 画面外チェック
      if (rect.right > screenWidth || rect.x < 0) {
        console.warn('Button is outside horizontal screen bounds, attempting repositioning...');
        this.repositionButtonHorizontally(button, container);
      }
    }, 100);
  }
  
  /**
   * ボタンを画面内に配置する戦略的メソッド
   */
  private positionButtonWithinScreen(button: HTMLElement, container: HTMLElement): void {
    // 1. 送信ボタンの左側に配置を試みる
    const sendButton = container.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]');
    if (sendButton) {
      console.log('Attempting to position before send button');
      sendButton.parentElement?.insertBefore(button, sendButton);
      return;
    }
    
    // 2. ツールバーの左端に配置を試みる
    const toolbar = container.closest('[role="toolbar"]');
    if (toolbar) {
      console.log('Attempting to position at toolbar start');
      toolbar.insertBefore(button, toolbar.firstChild);
      return;
    }
    
    // 3. フォールバック: コンテナの先頭に配置
    console.log('Fallback: positioning at container start');
    container.insertBefore(button, container.firstChild);
  }
  
  /**
   * 水平方向のボタン再配置
   */
  private repositionButtonHorizontally(button: HTMLElement, container: HTMLElement): void {
    const rect = button.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    if (rect.right > screenWidth) {
      // 右端を超えている場合、左側に移動
      const toolbar = container.closest('[role="toolbar"]');
      if (toolbar) {
        // ツールバーの最初の子要素として配置
        toolbar.insertBefore(button, toolbar.firstChild);
        console.log('Repositioned button to toolbar start');
      } else {
        // コンテナの先頭に配置
        container.insertBefore(button, container.firstChild);
        console.log('Repositioned button to container start');
      }
    }
  }

  /**
   * 標準的なボタン挿入
   */
  private injectStandardButton(container: HTMLElement, buttonId: string): void {
    const button = document.createElement('button');
    button.id = buttonId;
    button.className = 'gemini-reply-button';
    
    // Google Chatの場合はより目立つスタイル
    if (this.strategy?.getServiceName() === 'google-chat') {
      button.innerHTML = '🤖 AI返信';
      button.style.cssText = `
        background: linear-gradient(135deg, #4285f4, #34a853) !important;
        color: white !important;
        border: 2px solid #1a73e8 !important;
        border-radius: 6px !important;
        padding: 8px 12px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        z-index: 9999 !important;
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3) !important;
        min-width: 100px !important;
        margin: 4px !important;
      `;
    } else {
      button.innerHTML = '🤖 AI返信生成';
    }
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    container.appendChild(button);
    console.log(`Standard button injected for ${this.strategy?.getServiceName()}`);
    
    // Google Chatの場合は追加の確認
    if (this.strategy?.getServiceName() === 'google-chat') {
      setTimeout(() => {
        const rect = button.getBoundingClientRect();
        console.log(`Google Chat button position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
        console.log(`Button visible: ${rect.width > 0 && rect.height > 0}`);
      }, 100);
    }
  }

  /**
   * Gmailツールバーコンテナかどうかを判定
   */
  private isGmailToolbarContainer(container: HTMLElement): boolean {
    // ツールバー内、または送信ボタンの近くかをチェック
    return !!(
      container.closest('[role="toolbar"]') ||
      container.querySelector('button[aria-label*="送信"]') ||
      container.querySelector('button[aria-label*="Send"]') ||
      container.parentElement?.querySelector('button[aria-label*="送信"]') ||
      container.parentElement?.querySelector('button[aria-label*="Send"]')
    );
  }

  /**
   * Google Chat用：絶対確実な緊急注入を実行
   */
  private executeEmergencyInjection(): boolean {
    console.log('🚨 === EXECUTING EMERGENCY INJECTION ===');
    
    // 戦略1: 実際のチャット入力エリアを探す（複数パターン）
    const chatInputSelectors = [
      'input[placeholder*="履歴がオンになっています"]',
      'input[placeholder*="History is on"]',
      'input[placeholder*="履歴がオン"]',
      'input[placeholder*="メッセージ"]',
      'input[placeholder*="Message"]',
      'input[aria-label*="メッセージ"]',
      'input[aria-label*="Message"]',
      'input[type="text"]:not([class*="search"]):not([class*="gb_"])'
    ];
    
    for (const selector of chatInputSelectors) {
      const chatInput = document.querySelector(selector) as HTMLElement;
      if (chatInput) {
        console.log(`🎯 Found chat input with selector: ${selector}`);
        
        // 戦略A: 入力エリアの直接隣に配置
        const directContainer = this.createDirectContainer(chatInput);
        if (directContainer) {
          console.log('🚨 Direct container created, injecting button...');
          this.injectReplyButton(directContainer);
          
          // 成功確認
          const button = directContainer.querySelector('.gemini-reply-button');
          if (button && this.isElementVisible(button as HTMLElement)) {
            console.log('✅ Emergency injection SUCCESS - button visible!');
            return true;
          }
        }
        
        // 戦略B: 入力エリアの親コンテナに配置
        const parentContainer = this.createParentContainer(chatInput);
        if (parentContainer) {
          console.log('🚨 Parent container created, injecting button...');
          this.injectReplyButton(parentContainer);
          
          // 成功確認
          const button = parentContainer.querySelector('.gemini-reply-button');
          if (button && this.isElementVisible(button as HTMLElement)) {
            console.log('✅ Emergency injection SUCCESS - button visible!');
            return true;
          }
        }
      }
    }
    
    // 戦略2: フローティングボタンを作成（最終手段）
    console.log('🚨 Creating floating emergency button...');
    const floatingContainer = this.createFloatingContainer();
    if (floatingContainer) {
      this.injectReplyButton(floatingContainer);
      
      // 成功確認
      const button = floatingContainer.querySelector('.gemini-reply-button');
      if (button && this.isElementVisible(button as HTMLElement)) {
        console.log('✅ Emergency floating injection SUCCESS!');
        return true;
      }
    }
    
    console.log('🚨 All emergency injection strategies FAILED');
    return false;
  }
  
  /**
   * 入力エリアの直接隣にコンテナを作成
   */
  private createDirectContainer(chatInput: HTMLElement): HTMLElement | null {
    try {
      const container = document.createElement('div');
      container.id = 'emergency-ai-button-container-direct';
      container.style.cssText = `
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-left: 8px !important;
        position: relative !important;
        z-index: 9999 !important;
        background: rgba(255,255,255,0.9) !important;
        border-radius: 4px !important;
        padding: 2px !important;
      `;
      
      const parent = chatInput.parentElement;
      if (parent) {
        // 入力エリアの後に挿入
        if (chatInput.nextSibling) {
          parent.insertBefore(container, chatInput.nextSibling);
        } else {
          parent.appendChild(container);
        }
        
        console.log('✅ Direct container created successfully');
        return container;
      }
    } catch (error) {
      console.error('🚨 Failed to create direct container:', error);
    }
    return null;
  }
  
  /**
   * 入力エリアの親コンテナに配置
   */
  private createParentContainer(chatInput: HTMLElement): HTMLElement | null {
    try {
      const container = document.createElement('div');
      container.id = 'emergency-ai-button-container-parent';
      container.style.cssText = `
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 8px 0 !important;
        position: relative !important;
        z-index: 9999 !important;
        background: rgba(16, 185, 129, 0.1) !important;
        border: 1px solid rgba(16, 185, 129, 0.3) !important;
        border-radius: 4px !important;
        padding: 8px !important;
      `;
      
      // 入力エリアの親の親に配置
      let targetParent = chatInput.parentElement;
      if (targetParent) {
        // より上位の親を探す
        let grandParent = targetParent.parentElement;
        if (grandParent) {
          grandParent.appendChild(container);
          console.log('✅ Parent container created successfully');
          return container;
        }
      }
    } catch (error) {
      console.error('🚨 Failed to create parent container:', error);
    }
    return null;
  }
  
  /**
   * フローティングコンテナを作成
   */
  private createFloatingContainer(): HTMLElement | null {
    try {
      // 既存のフローティングコンテナを削除
      const existing = document.getElementById('floating-ai-button-container-google-chat');
      if (existing) {
        existing.remove();
      }
      
      const container = document.createElement('div');
      container.id = 'floating-ai-button-container-google-chat';
      container.style.cssText = `
        position: fixed !important;
        bottom: 100px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: linear-gradient(135deg, #10B981, #059669) !important;
        border: 2px solid #047857 !important;
        border-radius: 12px !important;
        padding: 12px !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
        backdrop-filter: blur(10px) !important;
        min-width: 150px !important;
      `;
      
      // ラベルを追加
      const label = document.createElement('div');
      label.textContent = '🤖 AI返信ツール';
      label.style.cssText = `
        font-size: 12px !important;
        color: white !important;
        margin-bottom: 8px !important;
        text-align: center !important;
        font-weight: 500 !important;
      `;
      container.appendChild(label);
      
      document.body.appendChild(container);
      
      console.log('✅ Floating container created successfully');
      return container;
    } catch (error) {
      console.error('🚨 Failed to create floating container:', error);
      return null;
    }
  }
  
  /**
   * 要素が実際に表示されているかチェック
   */
  private isElementVisible(element: HTMLElement): boolean {
    try {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      const isVisible = rect.width > 0 && 
                       rect.height > 0 && 
                       style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0';
      
      console.log(`🔍 Element visibility check: ${isVisible}`);
      console.log(`   Size: ${rect.width}x${rect.height}`);
      console.log(`   Style: display=${style.display}, visibility=${style.visibility}, opacity=${style.opacity}`);
      
      return isVisible;
    } catch (error) {
      console.error('🚨 Error checking element visibility:', error);
      return false;
    }
  }

  private async handleButtonClick(): Promise<void> {
    try {
      // APIキーを取得
      console.log('🔑 Retrieving API key...');
      const apiKey = await this.getApiKey();
      console.log('🔑 API key status:', apiKey ? 'Found' : 'Not found');
      
      if (!apiKey) {
        console.error('❌ No API key found in storage');
        alert('Gemini APIキーが設定されていません。\n\n拡張機能のポップアップを開いて「設定」タブからGemini APIキーを入力してください。\n\nAPIキーの取得方法:\n1. https://aistudio.google.com/app/apikey にアクセス\n2. 「Create API Key」をクリック\n3. 生成されたキーをコピーして設定に貼り付け');
        return;
      }

      // 会話履歴を取得
      const messages = this.strategy.extractMessages();
      if (messages.length === 0) {
        alert('会話履歴が見つかりませんでした。');
        return;
      }

      // モーダルを表示
      this.showReplyModal(apiKey, messages);
    } catch (error) {
      console.error('Error handling button click:', error);
      alert('エラーが発生しました。');
    }
  }

  private async getApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get('settings.apiKey', (result) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          const apiKey = result['settings.apiKey'];
          console.log('Retrieved API key:', apiKey ? '***set***' : 'null');
          resolve(apiKey || null);
        }
      });
    });
  }

  private showReplyModal(apiKey: string, messages: any[]): void {
    // モーダルを作成
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

    // イベントリスナー
    regenerateBtn.addEventListener('click', () => this.generateReply(apiKey, messages, textarea, regenerateBtn));
    cancelBtn.addEventListener('click', () => modal.remove());
    insertBtn.addEventListener('click', () => {
      this.strategy.insertReply(textarea.value);
      modal.remove();
    });

    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);

    // 初回生成
    this.generateReply(apiKey, messages, textarea, regenerateBtn);
  }

  private async generateReply(
    apiKey: string, 
    messages: any[], 
    textarea: HTMLTextAreaElement, 
    button: HTMLButtonElement
  ): Promise<void> {
    try {
      // ローディング状態
      button.innerHTML = '<span class="gemini-reply-loading"></span> 生成中...';
      button.disabled = true;
      textarea.value = 'AI返信を生成中...';

      // iframe内でのCORS問題を回避するため、Background Scriptを経由してAPI呼び出し
      console.log('🔧 Using background script for API call to avoid CORS issues');
      
      const { MessageConverter } = await import('../shared/types/index');
      const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
      
      // Background Scriptにメッセージを送信してAPI呼び出しを依頼
      console.log('🚀 Sending message to background script...');
      console.log('Frame info:', {
        isTop: window.self === window.top,
        url: window.location.href,
        origin: window.location.origin
      });
      
      const response = await new Promise<{success: boolean, text?: string, error?: string}>((resolve) => {
        const startTime = Date.now();
        
        const messagePayload = {
          type: 'GENERATE_REPLY',
          messages: geminiMessages,
          apiKey: apiKey,
          timestamp: Date.now()
        };
        
        console.log('📤 Message payload:', messagePayload);
        
        try {
          chrome.runtime.sendMessage(messagePayload, (response) => {
            const elapsed = Date.now() - startTime;
            console.log(`📥 Response received after ${elapsed}ms:`, response);
            
            if (chrome.runtime.lastError) {
              console.error('❌ Background script communication error:', chrome.runtime.lastError);
              resolve({
                success: false,
                error: `Background scriptとの通信に失敗しました: ${chrome.runtime.lastError.message}`
              });
            } else if (!response) {
              console.error('❌ No response from background script');
              resolve({
                success: false,
                error: 'Background scriptからレスポンスがありません'
              });
            } else {
              console.log('✅ Valid response from background script');
              resolve(response);
            }
          });
        } catch (sendError) {
          console.error('❌ Error sending message to background script:', sendError);
          resolve({
            success: false,
            error: `メッセージ送信エラー: ${sendError.message}`
          });
        }
        
        // タイムアウト処理
        setTimeout(() => {
          console.error('⏰ Background script communication timeout');
          resolve({
            success: false,
            error: 'Background scriptとの通信がタイムアウトしました'
          });
        }, 30000); // 30秒タイムアウト
      });
      
      if (response.success && response.text) {
        console.log('✅ Successfully received generated text');
        textarea.value = response.text;
      } else {
        console.error('❌ API generation failed:', response.error);
        
        // iframe通信が失敗した場合のフォールバック（デバッグ用）
        if (response.error?.includes('Background script') || response.error?.includes('通信')) {
          console.log('🔄 Attempting direct API call as fallback...');
          
          try {
            // 直接API呼び出しを試行（デバッグ用）
            const { GeminiAPIClient } = await import('../shared/api/GeminiAPIClient');
            const config = { apiKey };
            const fallbackText = await GeminiAPIClient.generateReply(geminiMessages, config);
            
            console.log('✅ Direct API call succeeded');
            textarea.value = fallbackText;
            return;
          } catch (fallbackError) {
            console.error('❌ Direct API call also failed:', fallbackError);
          }
        }
        
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
    // Google Chatのホーム画面では無限リトライを停止
    if (this.strategy?.getServiceName() === 'google-chat' && window.location.hash.includes('#chat/home')) {
      console.log('Google Chat: On home page, stopping retries until page changes');
      this.retryCount = this.MAX_RETRIES; // リトライを停止
      return;
    }
    
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      console.log(`Scheduling retry ${this.retryCount}/${this.MAX_RETRIES} in ${this.RETRY_DELAY}ms`);
      
      setTimeout(() => {
        this.checkAndInjectButton();
      }, this.RETRY_DELAY * this.retryCount);
    } else {
      console.log('Max retries reached, giving up');
    }
  }

  private startObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      // Only check mutations that could affect toolbar/button areas
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Gmail popup detection: ポップアップダイアログが追加された場合
              if (element.matches && (
                element.matches('[role="dialog"]') ||
                element.matches('[aria-modal="true"]') ||
                element.matches('.nH.aHU') ||
                element.querySelector('[role="dialog"]') ||
                element.querySelector('[aria-modal="true"]') ||
                element.querySelector('.nH.aHU')
              )) {
                console.log('Gmail popup dialog detected via mutation observer');
                shouldCheck = true;
                break;
              }
              
              // Only check if the added node might contain toolbars
              if (element.querySelector && (
                element.querySelector('[role="toolbar"]') ||
                element.matches('[role="toolbar"]') ||
                element.querySelector('[contenteditable="true"]') ||
                element.matches('[contenteditable="true"]') ||
                element.querySelector('button[aria-label*="送信"]') ||
                element.querySelector('button[aria-label*="Send"]')
              )) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
        if (shouldCheck) break;
      }

      if (shouldCheck) {
        console.log('DOM mutation detected, scheduling button check...');
        this.debounceCheck();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('DOM observer started with popup detection');
  }

  private debounceCheck(): void {
    // Skip if already processing or too soon since last injection
    const now = Date.now();
    if (this.isProcessing || (now - this.lastInjectionTime) < this.INJECTION_THROTTLE_MS) {
      return;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = window.setTimeout(() => {
      this.checkAndInjectButton();
      this.debounceTimeout = null;
    }, 500);
  }

  private startUrlMonitoring(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state, title, url) {
      originalPushState.call(history, state, title, url);
      window.dispatchEvent(new CustomEvent('urlchange'));
    };

    history.replaceState = function(state, title, url) {
      originalReplaceState.call(history, state, title, url);
      window.dispatchEvent(new CustomEvent('urlchange'));
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('urlchange'));
    });

    window.addEventListener('urlchange', () => {
      this.handleUrlChange();
    });

    console.log('URL monitoring started');
  }

  private handleUrlChange(): void {
    const newUrl = window.location.href;
    
    if (newUrl !== this.currentUrl) {
      console.log('URL changed:', this.currentUrl, '->', newUrl);
      this.currentUrl = newUrl;
      
      // 古いボタンを削除
      if (this.strategy) {
        const buttonId = `gemini-reply-button-${this.strategy.getServiceName()}`;
        const existingButton = document.getElementById(buttonId);
        if (existingButton) {
          existingButton.remove();
        }
      }
      
      // リトライカウントをリセット
      this.retryCount = 0;
      
      // Google Chatの場合、ホーム画面から実際のチャットに移動した可能性をチェック
      if (this.strategy?.getServiceName() === 'google-chat') {
        if (window.location.hash.includes('#chat/home')) {
          console.log('Google Chat: Still on home page after URL change');
          return; // ホーム画面では処理しない
        } else {
          console.log('Google Chat: Moved to actual chat conversation, attempting button injection');
        }
      }
      
      setTimeout(() => {
        this.checkAndInjectButton();
      }, 1000);
    }
  }

  private cleanup(): void {
    console.log('Cleaning up content script');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    // Remove any injected buttons
    if (this.strategy) {
      const buttonId = `gemini-reply-button-${this.strategy.getServiceName()}`;
      const existingButton = document.getElementById(buttonId);
      if (existingButton) {
        existingButton.remove();
      }
    }
    
    // Remove any modal dialogs
    const modals = document.querySelectorAll('.gemini-reply-modal');
    modals.forEach(modal => modal.remove());
    
    // Reset state
    this.isProcessing = false;
    this.retryCount = 0;
    this.lastInjectionTime = 0;
    
    // Unregister memory cleanup
    memoryManager.unregisterCleanupTask('content-script');
  }

  /**
   * フレームの深さを取得
   */
  private getFrameDepth(): number {
    let depth = 0;
    let currentWindow = window;
    
    try {
      while (currentWindow !== currentWindow.parent) {
        depth++;
        currentWindow = currentWindow.parent;
        
        // 無限ループ防止
        if (depth > 10) break;
      }
    } catch (error) {
      // クロスオリジンエラーの場合
      console.log('Cross-origin frame access blocked');
    }
    
    return depth;
  }

  /**
   * Google Chat iframe用の特別セットアップ
   */
  private setupGoogleChatIframeMode(): void {
    console.log('🚀 Setting up Google Chat iframe mode...');
    
    // iframe内でより頻繁にチェック
    this.MAX_RETRIES = 10;
    this.RETRY_DELAY = 500;
    
    // iframe readyイベントを待つ
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        console.log('🎯 Google Chat iframe loaded, attempting injection...');
        setTimeout(() => this.checkAndInjectButton(), 1000);
      });
    }
    
    // 追加のDOM変更監視
    const iframeObserver = new MutationObserver(() => {
      console.log('🔄 Google Chat iframe DOM changed');
      this.debounceCheck();
    });
    
    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  private registerMemoryCleanup(): void {
    memoryManager.registerCleanupTask('content-script', () => {
      // Clean up event listeners
      if (this.observer) {
        this.observer.disconnect();
      }
      
      // Clear timeouts
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }
      
      // Remove DOM elements
      const buttons = document.querySelectorAll('.gemini-reply-button');
      buttons.forEach(button => button.remove());
      
      const modals = document.querySelectorAll('.gemini-reply-modal');
      modals.forEach(modal => modal.remove());
    });
  }
}

// ページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScriptManager();
  });
} else {
  new ContentScriptManager();
}