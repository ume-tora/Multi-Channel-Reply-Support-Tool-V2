import type { ServiceStrategy, Message } from './interface';

/**
 * LINE Official Account Manager 戦略
 * https://manager.line.biz での AI返信支援機能
 */
export class LineOfficialAccountStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-line';
  private static readonly SERVICE_NAME = 'line-official-account';

  getServiceName(): 'line-official-account' {
    return 'line-official-account';
  }

  /**
   * LINE Manager画面のメッセージ入力エリア周辺にボタンを配置
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 LINE Official Account: Looking for insertion point...');
    
    // ホーム画面や設定画面ではスキップ
    if (this.isOnNonChatPage()) {
      console.log('🏠 Not on chat page, skipping');
      return null;
    }

    // DOM要素の読み込み待機
    await this.waitForChatInterface();

    // 1. メッセージ入力エリアの親要素を探す
    const inputContainer = this.findMessageInputContainer();
    if (inputContainer) {
      console.log('✅ Found message input container');
      return inputContainer;
    }

    // 2. チャットエリア内にフローティングボタンとして配置
    const chatArea = this.findChatArea();
    if (chatArea) {
      console.log('✅ Found chat area, creating floating container');
      return this.createFloatingContainer();
    }

    // 3. 最終的にbodyにフローティング配置
    console.log('🎈 Creating global floating button container');
    return this.createFloatingContainer();
  }

  /**
   * チャット画面以外のページかチェック
   */
  private isOnNonChatPage(): boolean {
    const path = window.location.pathname;
    const nonChatPaths = [
      '/home',
      '/settings',
      '/analytics', 
      '/account',
      '/api',
      '/richmenus'
    ];
    
    return nonChatPaths.some(nonChatPath => path.includes(nonChatPath));
  }

  /**
   * チャットインターフェースの読み込み待機
   */
  private async waitForChatInterface(): Promise<void> {
    const maxWait = 5000; // 5秒
    const interval = 100;
    let elapsed = 0;

    while (elapsed < maxWait) {
      const hasInterface = this.findMessageInputContainer() || this.findChatArea();
      if (hasInterface) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      elapsed += interval;
    }
    
    console.log('⏰ Timeout waiting for chat interface');
  }

  /**
   * メッセージ入力エリアのコンテナを探す
   */
  private findMessageInputContainer(): HTMLElement | null {
    const selectors = [
      // LINE Manager specific selectors
      '[data-testid="message-input"]',
      '[data-testid="text-input"]', 
      '[class*="MessageInput"]',
      '[class*="TextInput"]',
      '[class*="ChatInput"]',
      
      // Generic input container patterns
      'div[contenteditable="true"]',
      'textarea[placeholder*="メッセージ"]',
      'input[placeholder*="メッセージ"]',
      
      // Parent containers of inputs
      'div:has(> [contenteditable="true"])',
      'div:has(> textarea)',
      'div:has(> input[type="text"])'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isValidInputContainer(element)) {
          console.log(`✅ Found input container: ${selector}`);
          return element.parentElement || element;
        }
      } catch (error) {
        // セレクタエラーは無視して続行
        continue;
      }
    }

    return null;
  }

  /**
   * チャットエリアを探す
   */
  private findChatArea(): HTMLElement | null {
    const selectors = [
      '[data-testid="chat-area"]',
      '[data-testid="message-list"]',
      '[class*="ChatArea"]',
      '[class*="MessageList"]',
      '[class*="Conversation"]',
      
      // Generic chat area patterns
      '[role="log"]',
      '[role="main"]',
      'main',
      '.chat-container',
      '.message-container'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetHeight > 200) {
        console.log(`✅ Found chat area: ${selector}`);
        return element;
      }
    }

    return null;
  }

  /**
   * 有効な入力コンテナかチェック
   */
  private isValidInputContainer(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * フローティングコンテナを作成
   */
  private createFloatingContainer(): HTMLElement {
    // 既存のフローティングコンテナがあれば再利用
    const existingContainer = document.getElementById('line-floating-container');
    if (existingContainer) {
      return existingContainer;
    }

    const container = document.createElement('div');
    container.id = 'line-floating-container';
    container.style.cssText = `
      position: fixed !important;
      bottom: 100px !important;
      right: 40px !important;
      z-index: 999999 !important;
      background: white !important;
      border: 2px solid #00c300 !important;
      border-radius: 12px !important;
      padding: 12px !important;
      box-shadow: 0 8px 24px rgba(0, 195, 0, 0.3) !important;
      max-width: 160px !important;
    `;

    document.body.appendChild(container);
    return container;
  }

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(LineOfficialAccountStrategy.BUTTON_ID);
  }

  /**
   * LINEメッセージ履歴を抽出
   */
  extractMessages(): Message[] {
    console.log('📝 LINE Official Account: Extracting messages...');
    
    const messages: Message[] = [];

    // 複数のセレクタ戦略でメッセージを検索
    const messageSelectors = [
      // LINE Manager specific message selectors
      '[data-testid="message"]',
      '[data-testid="chat-message"]',
      '[class*="Message"]',
      '[class*="ChatMessage"]',
      '[class*="MessageBubble"]',
      
      // Generic message patterns
      '[role="listitem"]',
      '.message',
      '.chat-message',
      'div[data-message-id]',
      
      // Text content containers
      'div:has(> p)',
      'div:has(> span)',
      'p', 'span'
    ];

    for (const selector of messageSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (const element of Array.from(elements)) {
          const messageData = this.extractMessageFromElement(element);
          if (messageData) {
            messages.push(messageData);
          }
        }
        
        if (messages.length > 0) {
          break; // 見つかったら他のセレクタは試さない
        }
      } catch (error) {
        console.log(`❌ Error with selector ${selector}:`, error);
      }
    }

    // メッセージが見つからない場合はフォールバック
    if (messages.length === 0) {
      console.log('🔄 No structured messages found, trying fallback extraction...');
      const fallbackMessage = this.extractFallbackMessage();
      if (fallbackMessage) {
        messages.push(fallbackMessage);
      }
    }

    // 重複除去と最新5件の取得
    const uniqueMessages = this.removeDuplicateMessages(messages);
    const recentMessages = uniqueMessages.slice(-5);

    console.log(`📊 Final extracted ${recentMessages.length} messages`);
    return recentMessages;
  }

  /**
   * 要素からメッセージデータを抽出
   */
  private extractMessageFromElement(element: Element): Message | null {
    const text = element.textContent?.trim();
    
    // フィルタリング条件
    if (!text || 
        text.length < 2 || 
        text.length > 1000 ||
        this.isSystemMessage(text)) {
      return null;
    }

    // 送信者の特定
    const author = this.extractAuthorFromElement(element);
    
    return {
      author: author || 'ユーザー',
      text: text
    };
  }

  /**
   * 要素から送信者名を抽出
   */
  private extractAuthorFromElement(element: Element): string | null {
    // 親要素や兄弟要素から送信者情報を探す
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 3) {
      // 送信者名のインジケータを探す
      const authorIndicators = [
        '[data-testid="author"]',
        '[class*="Author"]',
        '[class*="UserName"]',
        '[class*="Sender"]',
        '.username',
        '.author',
        '.sender'
      ];
      
      for (const indicator of authorIndicators) {
        const authorElement = current.querySelector(indicator);
        if (authorElement) {
          const authorText = authorElement.textContent?.trim();
          if (authorText && authorText.length < 50) {
            return authorText;
          }
        }
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  /**
   * システムメッセージの判定
   */
  private isSystemMessage(text: string): boolean {
    const systemPhrases = [
      'スタンプを送信',
      '画像を送信',
      'ファイルを送信',
      '通話を開始',
      '通話が終了',
      'メンバーが参加',
      'メンバーが退出',
      'グループ名を変更',
      'メッセージを削除',
      '既読',
      'LINE',
      'Official Account'
    ];
    
    return systemPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * フォールバック用メッセージ抽出
   */
  private extractFallbackMessage(): Message | null {
    const chatArea = this.findChatArea();
    if (!chatArea) return null;

    const text = chatArea.innerText?.trim();
    if (!text || text.length < 10) return null;

    return {
      author: '会話履歴',
      text: text.slice(-800) // 最新800文字
    };
  }

  /**
   * 重複メッセージの除去
   */
  private removeDuplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = msg.text.substring(0, 50); // 最初の50文字をキーとして使用
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * LINE公式アカウント用の返信を入力欄に挿入
   */
  insertReply(text: string): void {
    console.log('📝 LINE Official Account: Inserting reply...');

    const input = this.findMessageInput();
    if (!input) {
      console.log('❌ Could not find message input');
      return;
    }

    try {
      // LINE向けの返信テキストを調整
      const lineFormattedText = this.formatTextForLine(text);
      
      if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
        (input as HTMLInputElement).value = lineFormattedText;
      } else {
        // contenteditable の場合
        input.textContent = lineFormattedText;
      }
      
      // フォーカスとイベント発火
      input.focus();
      
      // React/Vue系のSPAイベント対応
      const events = ['input', 'change', 'keyup', 'paste'];
      events.forEach(eventType => {
        input.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // React Synthetic Events対応
      const reactEvent = new Event('input', { bubbles: true });
      Object.defineProperty(reactEvent, 'target', { value: input });
      input.dispatchEvent(reactEvent);
      
      console.log('✅ Reply inserted successfully');
    } catch (error) {
      console.error('❌ Error inserting reply:', error);
    }
  }

  /**
   * メッセージ入力欄を探す
   */
  private findMessageInput(): HTMLElement | null {
    const inputSelectors = [
      '[data-testid="message-input"]',
      '[data-testid="text-input"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="メッセージ"]',
      'input[placeholder*="メッセージ"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of inputSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isValidInputContainer(element)) {
        console.log(`✅ Found message input: ${selector}`);
        return element;
      }
    }

    return null;
  }

  /**
   * LINE向けテキストフォーマット調整
   */
  private formatTextForLine(text: string): string {
    // LINE向けの改行・絵文字調整
    return text
      .replace(/\\n/g, '\n')  // 改行コードの正規化
      .replace(/([。！？])/g, '$1\n')  // 句読点での改行
      .replace(/\n{3,}/g, '\n\n')  // 過度な改行の制限
      .trim();
  }

  /**
   * スレッドIDの取得（キャッシュ用）
   */
  getThreadId(): string | null {
    // URLからチャットIDを抽出
    const match = window.location.pathname.match(/\/chat\/([^\/]+)/);
    return match ? match[1] : null;
  }
}