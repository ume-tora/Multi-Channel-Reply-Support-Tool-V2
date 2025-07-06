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

  constructor() {
    this.init();
    this.registerMemoryCleanup();
  }

  private init(): void {
    console.log('Multi Channel Reply Support Tool: Content script initialized');
    console.log(`Current URL: ${window.location.href}`);
    
    this.injectStyles();
    this.currentUrl = window.location.href;
    this.checkAndInjectButton();
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

  private checkAndInjectButton(): void {
    try {
      this.strategy = createServiceStrategy(window.location.href);
      
      if (!this.strategy) {
        console.log('No strategy found for current URL:', window.location.href);
        return;
      }

      console.log(`Strategy loaded: ${this.strategy.getServiceName()}`);

      if (this.strategy.isButtonInjected()) {
        console.log('Button already injected');
        return;
      }

      const insertionPoint = this.strategy.findInsertionPoint();
      
      if (insertionPoint) {
        console.log('Insertion point found, injecting button...');
        this.injectReplyButton(insertionPoint);
        this.retryCount = 0;
      } else {
        console.log('Insertion point not found');
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('Error in checkAndInjectButton:', error);
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
    } else {
      this.injectStandardButton(container, buttonId);
    }
    
    console.log(`AI reply button injected successfully for ${serviceName}`);
  }

  private injectGmailButton(container: HTMLElement, buttonId: string): void {
    const button = document.createElement('button');
    button.id = buttonId;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'AI返信生成');
    button.className = 'gemini-reply-button';
    
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
      border: none !important;
      font-size: 16px !important;
      transition: all 0.2s ease;
      z-index: 9999 !important;
      position: relative !important;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3) !important;
      flex-shrink: 0 !important;
    `;
    
    button.innerHTML = '<span style="font-size: 16px;">🤖</span>';
    button.title = 'AI返信生成';
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #059669, #047857) !important';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #10B981, #059669) !important';
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    // Gmail specific positioning
    const sendButton = container.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]');
    if (sendButton) {
      sendButton.parentElement?.insertBefore(button, sendButton);
    } else {
      container.appendChild(button);
    }
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

  private async getApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get('settings.apiKey', (result) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result['settings.apiKey'] || null);
        }
      });
    });
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
      
      const response = await new Promise<{success: boolean, text?: string, error?: string}>((resolve) => {
        const messagePayload = {
          type: 'GENERATE_REPLY',
          messages: geminiMessages,
          apiKey: apiKey,
          timestamp: Date.now()
        };
        
        chrome.runtime.sendMessage(messagePayload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: `Background scriptとの通信に失敗しました: ${chrome.runtime.lastError.message}`
            });
          } else {
            resolve(response || { success: false, error: 'No response from background script' });
          }
        });
        
        setTimeout(() => {
          resolve({ success: false, error: 'タイムアウトしました' });
        }, 30000);
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
      console.log(`Scheduling retry ${this.retryCount}/${this.MAX_RETRIES} in ${this.RETRY_DELAY}ms`);
      setTimeout(() => this.checkAndInjectButton(), this.RETRY_DELAY);
    } else {
      console.log('Max retries reached, stopping attempts');
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
      
      if (shouldCheck) {
        setTimeout(() => this.checkAndInjectButton(), 500);
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
        
        setTimeout(() => {
          this.checkAndInjectButton();
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
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    memoryManager.cleanup();
  }
}

// Initialize the content script manager
new ContentScriptManager();