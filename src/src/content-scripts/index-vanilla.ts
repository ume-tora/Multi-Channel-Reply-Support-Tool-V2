import { createServiceStrategy } from './services';

class ContentScriptManager {
  private strategy: any = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('Multi Channel Reply Support Tool: Content script initialized');
    
    // スタイルシートを注入
    this.injectStyles();
    
    // 現在のURLを記録
    this.currentUrl = window.location.href;
    
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
        background: linear-gradient(135deg, #3B82F6, #1D4ED8);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 0 8px;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
      }
      
      .gemini-reply-button:hover {
        background: linear-gradient(135deg, #2563EB, #1E40AF);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
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
    try {
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
    const buttonId = `gemini-reply-button-${this.strategy.getServiceName()}`;
    
    // 既存のボタンを削除
    const existingButton = document.getElementById(buttonId);
    if (existingButton) {
      existingButton.remove();
    }

    // ボタンを作成
    const button = document.createElement('button');
    button.id = buttonId;
    button.className = 'gemini-reply-button';
    button.innerHTML = '🤖 AI返信生成';
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    // ボタンを挿入
    container.appendChild(button);
    console.log('AI reply button injected successfully');
  }

  private async handleButtonClick(): Promise<void> {
    try {
      // APIキーを取得
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        alert('Gemini APIキーが設定されていません。拡張機能のポップアップから設定してください。');
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
        resolve(result['settings.apiKey'] || null);
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

      // プロンプト作成
      const conversationText = messages.map(m => `${m.author}: ${m.text}`).join('\n\n');
      const prompt = `以下の会話に対して、適切で自然な返信を日本語で生成してください。簡潔で礼儀正しく、文脈に沿った内容にしてください。\n\n${conversationText}\n\n返信:`;

      // Gemini API呼び出し
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI返信の生成に失敗しました。';
      
      textarea.value = generatedText;
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
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }

      if (shouldCheck) {
        this.debounceCheck();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('DOM observer started');
  }

  private debounceTimeout: number | null = null;

  private debounceCheck(): void {
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
      
      this.retryCount = 0;
      
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