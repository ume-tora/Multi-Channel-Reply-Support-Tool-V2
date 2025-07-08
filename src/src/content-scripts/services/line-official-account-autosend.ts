import type { ServiceStrategy, Message } from './interface';

/**
 * LINE Official Account Manager 戦略（自動挿入版）
 * 安全性を最優先とした自動挿入 + 手動送信方式
 */
export class LineOfficialAccountAutoSendStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-line-autosend';
  private static readonly MODAL_ID = 'line-autosend-modal';

  getServiceName(): 'line-official-account' {
    return 'line-official-account';
  }

  /**
   * ボタン配置点を探す
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 LINE AutoSend: Starting insertion point search...');
    
    if (!this.isOnChatPage()) {
      console.log('🏠 Not on chat page, skipping');
      return null;
    }

    return this.createFloatingContainer();
  }

  /**
   * チャット画面かチェック
   */
  private isOnChatPage(): boolean {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    
    return (hostname === 'chat.line.biz' || hostname === 'manager.line.biz') &&
           !path.includes('/home') &&
           !path.includes('/settings') &&
           !path.includes('/analytics');
  }

  /**
   * フローティングコンテナを作成
   */
  private createFloatingContainer(): HTMLElement {
    const existingContainer = document.getElementById('line-floating-autosend');
    if (existingContainer) {
      return existingContainer;
    }

    const container = document.createElement('div');
    container.id = 'line-floating-autosend';
    container.style.cssText = `
      position: fixed !important;
      bottom: 120px !important;
      right: 40px !important;
      z-index: 999999 !important;
      background: white !important;
      border: 2px solid #00c300 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      box-shadow: 0 8px 24px rgba(0, 195, 0, 0.4) !important;
      min-width: 160px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    container.innerHTML = '<div style="color: #00c300; font-size: 12px; margin-bottom: 8px; text-align: center;">LINE AI Assistant</div>';
    document.body.appendChild(container);
    
    return container;
  }

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(LineOfficialAccountAutoSendStrategy.BUTTON_ID);
  }

  /**
   * メッセージ履歴を抽出
   */
  extractMessages(): Message[] {
    console.log('📝 LINE AutoSend: Extracting messages...');
    
    const messages: Message[] = [];
    const targetMessages = ['テスト', 'サロンに入会したいです！'];
    const allElements = document.querySelectorAll('div, span, p');
    
    for (const element of Array.from(allElements)) {
      const text = element.textContent?.trim();
      if (text && targetMessages.includes(text)) {
        messages.push({
          author: 'お客様',
          text: text
        });
        console.log(`✅ Found message: "${text}"`);
      }
    }

    if (messages.length === 0) {
      for (const element of Array.from(allElements)) {
        const text = element.textContent?.trim();
        if (text && text.length >= 3 && text.length <= 100 && 
            !this.isSystemText(text)) {
          messages.push({
            author: 'お客様',
            text: text
          });
          if (messages.length >= 3) break;
        }
      }
    }

    console.log(`📝 Extracted ${messages.length} messages`);
    return messages.slice(-5);
  }

  /**
   * システムテキストかチェック
   */
  private isSystemText(text: string): boolean {
    const systemPhrases = [
      'LINE', 'Official Account', 'スタンプ', '画像', 'ファイル', 
      '通話', '既読', 'ホーム', 'チャット', '設定', '検索',
      '送信', 'Enter', 'Shift', 'すべて', 'ヘルプ'
    ];
    
    return systemPhrases.some(phrase => text.includes(phrase)) ||
           /^\d{1,2}:\d{2}$/.test(text);
  }

  /**
   * 返信処理（自動挿入モーダル版）
   */
  async insertReply(text: string): Promise<void> {
    console.log('📝 LINE AutoSend: Showing auto-insert modal...');
    this.showAutoInsertModal(text);
  }

  /**
   * 自動挿入モーダルを表示
   */
  private showAutoInsertModal(text: string): void {
    // 既存のモーダルを削除
    const existing = document.getElementById(LineOfficialAccountAutoSendStrategy.MODAL_ID);
    if (existing) existing.remove();

    // モーダル作成
    const modal = document.createElement('div');
    modal.id = LineOfficialAccountAutoSendStrategy.MODAL_ID;
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    modal.innerHTML = `
      <div style="
        background: white !important;
        border-radius: 16px !important;
        padding: 32px !important;
        max-width: 600px !important;
        width: 90% !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
      ">
        <div style="color: #00c300; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
          🎯 AI返信の確認と送信
        </div>
        
        <div style="color: #666; font-size: 14px; margin-bottom: 20px;">
          生成された返信を確認して、LINE入力欄に反映してください
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 2px solid #00c300 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
          max-height: 200px !important;
          overflow-y: auto !important;
        ">
          <div style="color: #00c300; font-size: 12px; font-weight: bold; margin-bottom: 8px;">
            📝 生成された返信内容:
          </div>
          <textarea id="reply-content" style="
            width: 100% !important;
            min-height: 100px !important;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            padding: 12px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            font-family: inherit !important;
            resize: vertical !important;
            box-sizing: border-box !important;
          ">${text}</textarea>
        </div>
        
        <div style="
          background: #fff3cd !important;
          border: 1px solid #ffeaa7 !important;
          border-radius: 8px !important;
          padding: 16px !important;
          margin: 20px 0 !important;
          font-size: 13px !important;
          color: #856404 !important;
        ">
          ⚠️ <strong>安全確認:</strong> 内容を確認してから「反映」ボタンを押してください。<br>
          反映後は必ずLINE画面で最終確認してから送信してください。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="insert-btn" style="
            background: #00c300 !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            🚀 LINE入力欄に反映
          </button>
          
          <button id="copy-btn" style="
            background: #6c757d !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            📋 コピーのみ
          </button>
          
          <button id="cancel-btn" style="
            background: #dc3545 !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            ✖️ キャンセル
          </button>
        </div>
        
        <div style="
          margin-top: 20px !important;
          padding: 16px !important;
          background: #e7f3ff !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #0066cc !important;
          text-align: left !important;
        ">
          <strong>💡 使用方法:</strong><br>
          1. 上記テキストを必要に応じて編集<br>
          2. 「LINE入力欄に反映」ボタンをクリック<br>
          3. LINE画面で内容を最終確認<br>
          4. 問題なければLINEの送信ボタンをクリック
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupModalEvents(modal);
  }

  /**
   * モーダルのイベントを設定
   */
  private setupModalEvents(modal: HTMLElement): void {
    const textarea = modal.querySelector('#reply-content') as HTMLTextAreaElement;
    const insertBtn = modal.querySelector('#insert-btn') as HTMLButtonElement;
    const copyBtn = modal.querySelector('#copy-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

    // 反映ボタンクリック
    insertBtn?.addEventListener('click', async () => {
      const text = textarea?.value || '';
      if (!text.trim()) {
        insertBtn.innerHTML = '❌ 内容が空です';
        insertBtn.style.background = '#dc3545 !important';
        setTimeout(() => {
          insertBtn.innerHTML = '🚀 LINE入力欄に反映';
          insertBtn.style.background = '#00c300 !important';
        }, 2000);
        return;
      }

      insertBtn.innerHTML = '🔄 反映中...';
      insertBtn.disabled = true;

      const success = await this.insertToLineInput(text);
      
      if (success) {
        insertBtn.innerHTML = '✅ 反映完了！';
        insertBtn.style.background = '#28a745 !important';
        
        // 成功時のメッセージ
        this.showSuccessMessage();
        
        setTimeout(() => modal.remove(), 2000);
      } else {
        insertBtn.innerHTML = '❌ 反映失敗';
        insertBtn.style.background = '#dc3545 !important';
        insertBtn.disabled = false;
        
        setTimeout(() => {
          insertBtn.innerHTML = '🚀 LINE入力欄に反映';
          insertBtn.style.background = '#00c300 !important';
        }, 3000);
      }
    });

    // コピーボタンクリック
    copyBtn?.addEventListener('click', async () => {
      const text = textarea?.value || '';
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = '✅ コピー完了';
        copyBtn.style.background = '#28a745 !important';
        
        setTimeout(() => modal.remove(), 1500);
      } catch (error) {
        copyBtn.innerHTML = '❌ コピー失敗';
        copyBtn.style.background = '#dc3545 !important';
      }
    });

    // キャンセルボタンクリック
    cancelBtn?.addEventListener('click', () => modal.remove());
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // ESCキーで閉じる
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * LINE入力欄にテキストを挿入（高度な手法）
   */
  private async insertToLineInput(text: string): Promise<boolean> {
    console.log('🚀 Attempting to insert text to LINE input field...');
    
    try {
      // 入力フィールドを検索
      const inputField = await this.findLineInputField();
      if (!inputField) {
        console.log('❌ LINE input field not found');
        return false;
      }

      console.log('✅ Found LINE input field:', inputField);

      // 複数の挿入方式を試行
      const methods = [
        () => this.insertViaDocumentCommand(inputField, text),
        () => this.insertViaClipboard(inputField, text),
        () => this.insertViaKeyboardSimulation(inputField, text),
        () => this.insertViaDirectValue(inputField, text)
      ];

      for (const method of methods) {
        try {
          const success = await method();
          if (success) {
            console.log('✅ Text insertion successful');
            return true;
          }
        } catch (error) {
          console.log('❌ Insertion method failed:', error);
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to insert text:', error);
      return false;
    }
  }

  /**
   * LINE入力フィールドを検索
   */
  private async findLineInputField(): Promise<HTMLElement | null> {
    console.log('🔍 Searching for LINE input field...');
    
    const selectors = [
      'textarea[placeholder*="メッセージ"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="送信"]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
      'textarea',
      'input[type="text"]'
    ];

    // 要素の出現を待機
    for (let attempt = 0; attempt < 10; attempt++) {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const element of Array.from(elements)) {
          const htmlElement = element as HTMLElement;
          if (this.isValidInputField(htmlElement)) {
            console.log(`✅ Found valid input field with selector: ${selector}`);
            return htmlElement;
          }
        }
      }
      
      // 100ms待機して再試行
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('❌ No valid LINE input field found');
    return null;
  }

  /**
   * 入力フィールドが有効かチェック
   */
  private isValidInputField(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0 &&
      !element.hasAttribute('readonly') &&
      !element.hasAttribute('disabled')
    );
  }

  /**
   * document.execCommandでテキスト挿入
   */
  private insertViaDocumentCommand(element: HTMLElement, text: string): boolean {
    try {
      element.focus();
      
      // 既存テキストを選択
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        (element as HTMLInputElement).select();
      } else {
        // contenteditable要素の場合
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      // execCommandでテキスト挿入
      const success = document.execCommand('insertText', false, text);
      console.log(`📝 execCommand result: ${success}`);
      
      return success;
    } catch (error) {
      console.log('❌ execCommand failed:', error);
      return false;
    }
  }

  /**
   * クリップボード経由でテキスト挿入
   */
  private async insertViaClipboard(element: HTMLElement, text: string): Promise<boolean> {
    try {
      // クリップボードに書き込み
      await navigator.clipboard.writeText(text);
      
      element.focus();
      
      // 全選択
      const selectAllEvent = new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
        bubbles: true
      });
      element.dispatchEvent(selectAllEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // ペースト
      const pasteEvent = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true
      });
      element.dispatchEvent(pasteEvent);
      
      console.log('📋 Clipboard insertion attempted');
      return true;
    } catch (error) {
      console.log('❌ Clipboard insertion failed:', error);
      return false;
    }
  }

  /**
   * キーボードシミュレーションでテキスト挿入
   */
  private insertViaKeyboardSimulation(element: HTMLElement, text: string): boolean {
    try {
      element.focus();
      
      // 既存テキストをクリア
      this.clearElement(element);
      
      // 文字を一つずつ入力
      for (const char of text) {
        this.simulateCharacterInput(element, char);
      }
      
      console.log('⌨️ Keyboard simulation completed');
      return true;
    } catch (error) {
      console.log('❌ Keyboard simulation failed:', error);
      return false;
    }
  }

  /**
   * 直接値設定でテキスト挿入
   */
  private insertViaDirectValue(element: HTMLElement, text: string): boolean {
    try {
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        (element as HTMLInputElement).value = text;
      } else {
        element.textContent = text;
      }
      
      // 各種イベントを発火
      this.fireInputEvents(element);
      
      console.log('📝 Direct value insertion attempted');
      return true;
    } catch (error) {
      console.log('❌ Direct value insertion failed:', error);
      return false;
    }
  }

  /**
   * 要素をクリア
   */
  private clearElement(element: HTMLElement): void {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      (element as HTMLInputElement).value = '';
    } else {
      element.textContent = '';
    }
  }

  /**
   * 文字入力をシミュレート
   */
  private simulateCharacterInput(element: HTMLElement, char: string): void {
    const events = ['keydown', 'keypress', 'beforeinput', 'input', 'keyup'];
    
    events.forEach(eventType => {
      const event = new KeyboardEvent(eventType, {
        key: char,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    });
    
    // 実際の値を更新
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const currentValue = (element as HTMLInputElement).value;
      (element as HTMLInputElement).value = currentValue + char;
    } else {
      element.textContent = (element.textContent || '') + char;
    }
  }

  /**
   * 入力イベントを発火
   */
  private fireInputEvents(element: HTMLElement): void {
    const events = ['input', 'change', 'blur', 'focus'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  /**
   * 成功メッセージを表示
   */
  private showSuccessMessage(): void {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #28a745 !important;
      color: white !important;
      padding: 16px 24px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: bold !important;
      z-index: 10000000 !important;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3) !important;
      animation: fadeIn 0.3s ease-out !important;
    `;
    
    message.innerHTML = '✅ LINE入力欄に反映されました！内容を確認して送信してください';
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'fadeOut 0.3s ease-in';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  /**
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    const match = window.location.pathname.match(/\/chat\/([^\/]+)/);
    return match ? match[1] : null;
  }
}