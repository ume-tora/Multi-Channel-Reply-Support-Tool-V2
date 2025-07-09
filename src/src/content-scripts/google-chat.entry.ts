import { GoogleChatAutoSendStrategy } from './services/google-chat-autosend';
import type { ServiceStrategy } from '../shared/types';
import { memoryManager } from '../shared/performance/MemoryManager';
import { DragDropManager } from '../shared/ui/DragDropManager';
import { ButtonFactory } from '../shared/ui/ButtonFactory';

class GoogleChatContentScript {
  private strategy: ServiceStrategy | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private dragDropManager: DragDropManager | null = null;

  constructor() {
    console.log('💬 Google Chat Content Script: Initializing...');
    this.init();
    this.registerMemoryCleanup();
  }

  private init(): void {
    console.log('💬 Google Chat Content Script: Starting initialization');
    this.injectStyles();
    this.currentUrl = window.location.href;
    this.strategy = new GoogleChatAutoSendStrategy();
    
    setTimeout(() => {
      this.checkAndInjectButton();
    }, 500);
    
    this.startObserving();
    this.startUrlMonitoring();
    
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private injectStyles(): void {
    const styleId = 'gemini-reply-styles-google-chat';
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
        box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
        z-index: 1000;
        position: relative;
      }
      
      .gemini-reply-button:hover {
        background: linear-gradient(135deg, #15803d, #166534);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(22, 163, 74, 0.3);
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
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
      }
      
      .gemini-reply-buttons {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-top: 8px;
        align-items: center;
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
      
      .gemini-reply-btn-primary {
        background: linear-gradient(135deg, #1a73e8, #1557b0);
        color: white;
      }
      
      .gemini-reply-btn-secondary {
        background: #F3F4F6;
        color: #374151;
        border: 1px solid #D1D5DB;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  private async checkAndInjectButton(): Promise<void> {
    try {
      console.log('🔍 Google Chat: Starting button injection process...');
      
      if (!this.strategy) {
        console.log('❌ No strategy available');
        return;
      }

      if (this.strategy.isButtonInjected()) {
        console.log('ℹ️ Button already injected');
        return;
      }

      const insertionPoint = await this.strategy.findInsertionPoint();
      
      if (insertionPoint) {
        console.log('✅ Insertion point found, injecting button...');
        this.injectReplyButton(insertionPoint);
        this.retryCount = 0;
        console.log('🎉 Google Chat button injection completed successfully!');
      } else {
        console.log('❌ Insertion point not found, scheduling retry...');
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('💥 Error in Google Chat checkAndInjectButton:', error);
      this.scheduleRetry();
    }
  }

  private injectReplyButton(container: HTMLElement): void {
    if (!this.strategy) return;

    const buttonId = 'gemini-reply-button-google-chat';
    
    if (document.getElementById(buttonId)) {
      console.log('Button already exists, skipping injection');
      return;
    }

    const button = ButtonFactory.createServiceButton(
      'google-chat',
      () => {
        console.log('💬 Google Chat button clicked!');
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
      storageKey: 'google-chat-ai-button-position'
    });
    
    console.log('✅ Google Chat button with drag & drop injected successfully');
  }

  private async handleButtonClick(): Promise<void> {
    try {
      console.log('💬 Google Chat Button clicked, starting handleButtonClick...');
      
      if (!chrome?.runtime?.id) {
        console.error('❌ Extension context is invalid');
        alert('拡張機能のコンテキストが無効です。ページを再読み込みしてください。');
        return;
      }

      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        console.log('❌ No API key found');
        alert('Gemini APIキーが設定されていません。\n\n拡張機能のポップアップを開いて「設定」タブからGemini APIキーを入力してください。');
        return;
      }

      const messages = this.strategy!.extractMessages();
      if (messages.length === 0) {
        console.log('❌ No messages found');
        alert('会話履歴が見つかりませんでした。');
        return;
      }

      console.log(`✅ Found ${messages.length} messages, generating AI reply...`);
      
      // AI返信を生成してモーダル表示
      const { MessageConverter } = await import('../shared/types/index');
      const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
      
      const response = await this.generateReplyResponse(apiKey, geminiMessages);
      if (response.success && response.text) {
        // AutoSendStrategyのshowModalメソッドを使用
        if (this.strategy && 'showModal' in this.strategy) {
          (this.strategy as any).showModal(response.text);
        } else {
          console.warn('AutoSend modal functionality not available, falling back to simple modal');
          this.showReplyModal(apiKey, messages);
        }
      } else {
        alert(`AI返信の生成でエラーが発生しました: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('💥 Error handling Google Chat button click:', error);
      alert(`エラーが発生しました: ${error.message || 'Unknown error'}`);
    }
  }

  private async getApiKey(): Promise<string | null> {
    try {
      if (!chrome?.runtime?.id) {
        throw new Error('Extension context invalid');
      }

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
            resolve(response);
          }
        });
      });

      if (response.success && response.apiKey) {
        return response.apiKey;
      } else {
        console.warn('❌ Failed to get API key from background:', response.error);
        return null;
      }
    } catch (error) {
      console.error('💥 Error getting API key:', error);
      if (error.message?.includes('Extension context invalid')) {
        throw error;
      }
      return null;
    }
  }

  private async generateReplyResponse(apiKey: string, messages: any[]): Promise<any> {
    try {
      const requestData = {
        type: 'GENERATE_REPLY',
        messages: messages,
        apiKey: apiKey,
        timestamp: Date.now()
      };
      
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background communication timeout after 60 seconds'));
        }, 60000);

        chrome.runtime.sendMessage(requestData, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      return response;
    } catch (error) {
      console.error('💥 Error generating reply:', error);
      return { success: false, error: error.message };
    }
  }

  private showReplyModal(apiKey: string, messages: any[]): void {
    const modal = document.createElement('div');
    modal.className = 'gemini-reply-modal';
    modal.innerHTML = `
      <div class="gemini-reply-modal-content">
        <h3>🤖 AI返信生成 - Google Chat</h3>
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
      button.innerHTML = '🔄 生成中...';
      button.disabled = true;
      textarea.value = 'AI返信を生成中...';

      const { MessageConverter } = await import('../shared/types/index');
      const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
      
      const requestData = {
        type: 'GENERATE_REPLY',
        messages: geminiMessages,
        apiKey: apiKey,
        timestamp: Date.now()
      };
      
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background communication timeout after 60 seconds'));
        }, 60000);

        chrome.runtime.sendMessage(requestData, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response.success && response.text) {
        textarea.value = response.text;
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('💥 Error generating reply:', error);
      textarea.value = `AI返信の生成でエラーが発生しました。詳細: ${error.message}`;
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
        console.log('Google Chat URL changed, reinitializing...');
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
    memoryManager.registerCleanupTask('google-chat-content-script', () => {
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
      
      if (this.dragDropManager) {
        this.dragDropManager.destroy();
        this.dragDropManager = null;
      }
      
      try {
        memoryManager.cleanup();
      } catch (error) {
        console.warn('Google Chat ContentScript: Error during memory cleanup:', error);
      }

      console.log('Google Chat ContentScript: Cleanup completed successfully');
    } catch (error) {
      console.error('Google Chat ContentScript: Error during cleanup:', error);
    }
  }
}

// Google Chat専用のコンテンツスクリプトを初期化
new GoogleChatContentScript();