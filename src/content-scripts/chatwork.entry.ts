import { ChatworkAutoSendStrategy } from './services/chatwork-autosend';
import type { ServiceStrategy } from '../shared/types';
import { memoryManager } from '../shared/performance/MemoryManager';
import { DragDropManager } from '../shared/ui/DragDropManager';
import { ButtonFactory } from '../shared/ui/ButtonFactory';

class ChatworkContentScript {
  private strategy: ServiceStrategy | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private dragDropManager: DragDropManager | null = null;

  constructor() {
    console.log('💬 Chatwork Content Script: Initializing...');
    this.init();
    this.registerMemoryCleanup();
  }

  private init(): void {
    console.log('💬 Chatwork Content Script: Starting initialization');
    this.injectStyles();
    this.currentUrl = window.location.href;
    this.strategy = new ChatworkAutoSendStrategy();
    
    setTimeout(() => {
      this.checkAndInjectButton();
    }, 500);
    
    this.startObserving();
    this.startUrlMonitoring();
    
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private injectStyles(): void {
    const styleId = 'gemini-reply-styles-chatwork';
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
        border-color: #0084ff;
        box-shadow: 0 0 0 3px rgba(0, 132, 255, 0.1);
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
        background: linear-gradient(135deg, #0084ff, #0066cc);
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
      console.log('🔍 Chatwork: Starting button injection process...');
      
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
        console.log('🎉 Chatwork button injection completed successfully!');
      } else {
        console.log('❌ Insertion point not found, scheduling retry...');
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('💥 Error in Chatwork checkAndInjectButton:', error);
      this.scheduleRetry();
    }
  }

  private injectReplyButton(container: HTMLElement): void {
    if (!this.strategy) return;

    const buttonId = 'gemini-reply-button-chatwork-autosend';
    
    if (document.getElementById(buttonId)) {
      console.log('Button already exists, skipping injection');
      return;
    }

    const button = ButtonFactory.createServiceButton(
      'chatwork',
      () => {
        console.log('💬 Chatwork button clicked!');
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
      storageKey: 'chatwork-ai-button-position'
    });
    
    console.log('✅ Chatwork button with drag & drop injected successfully');
  }

  private async handleButtonClick(): Promise<void> {
    try {
      console.log('💬 Chatwork Button clicked, starting handleButtonClick...');
      
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

      console.log(`✅ Found ${messages.length} messages, processing...`);
      
      // Chatwork自動送信戦略の場合は直接処理
      if (this.strategy instanceof ChatworkAutoSendStrategy) {
        const { MessageConverter } = await import('../shared/types/index');
        const geminiMessages = MessageConverter.serviceArrayToGemini(messages);
        
        const response = await this.generateReply(apiKey, geminiMessages);
        if (response.success && response.text) {
          await this.strategy.insertReply(response.text);
        } else {
          alert(`エラーが発生しました: ${response.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('💥 Error handling Chatwork button click:', error);
      alert(`エラーが発生しました: ${error.message || 'Unknown error'}`);
    }
  }

  private async getApiKey(): Promise<string | null> {
    try {
      if (!chrome?.runtime?.id) {
        throw new Error('Extension context invalid');
      }

      const response = await new Promise<{success: boolean; apiKey?: string; error?: string}>((resolve, reject) => {
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

  private async generateReply(apiKey: string, messages: import('../shared/types').GeminiMessage[]): Promise<{success: boolean; text?: string; error?: string}> {
    try {
      const requestData = {
        type: 'GENERATE_REPLY',
        messages: messages,
        apiKey: apiKey,
        timestamp: Date.now()
      };
      
      const response = await new Promise<{success: boolean; text?: string; error?: string}>((resolve, reject) => {
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
        console.log('Chatwork URL changed, reinitializing...');
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
    memoryManager.registerCleanupTask('chatwork-content-script', () => {
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
        console.warn('Chatwork ContentScript: Error during memory cleanup:', error);
      }

      console.log('Chatwork ContentScript: Cleanup completed successfully');
    } catch (error) {
      console.error('Chatwork ContentScript: Error during cleanup:', error);
    }
  }
}

// Chatwork専用のコンテンツスクリプトを初期化
const chatworkScript = new ChatworkContentScript();

// デバッグ用：グローバルにアクセス可能にする
(window as any).chatworkScript = chatworkScript;
(window as any).chatworkStrategy = chatworkScript['strategy'];

console.log('🔧 Debug helpers available:');
console.log('🔧 - window.chatworkScript: Main script instance');
console.log('🔧 - window.chatworkStrategy: Strategy instance');
console.log('🔧 - chatworkStrategy.debugFindSendButton(): Find send button manually');