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
    console.log('🔍 LINE Official Account: Starting insertion point search...');
    console.log(`📍 Current URL: ${window.location.href}`);
    console.log(`🌐 Hostname: ${window.location.hostname}`);
    console.log(`📂 Pathname: ${window.location.pathname}`);
    
    // ホーム画面や設定画面ではスキップ
    if (this.isOnNonChatPage()) {
      console.log('🏠 Not on chat page, skipping button injection');
      return null;
    }

    console.log('💬 On chat page, proceeding with injection...');

    // DOM要素の読み込み待機
    await this.waitForChatInterface();

    // 1. メッセージ入力エリアの親要素を探す
    console.log('🔍 Step 1: Looking for message input container...');
    const inputContainer = this.findMessageInputContainer();
    if (inputContainer) {
      console.log('✅ Found message input container, using it');
      return inputContainer;
    }

    // 2. チャットエリア内にフローティングボタンとして配置
    console.log('🔍 Step 2: Looking for chat area...');
    const chatArea = this.findChatArea();
    if (chatArea) {
      console.log('✅ Found chat area, creating floating container');
      return this.createFloatingContainer();
    }

    // 3. 最終的にbodyにフローティング配置
    console.log('🔍 Step 3: Using fallback floating container');
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
    console.log('🔍 Looking for message input container...');
    
    const selectors = [
      // LINE Manager specific selectors based on actual UI
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="送信"]',
      'textarea[placeholder*="改行"]',
      'div[contenteditable="true"]',
      'input[type="text"]',
      'textarea',
      
      // Container selectors
      'form',
      'div[class*="input"]',
      'div[class*="message"]',
      'div[class*="chat"]',
      'div[class*="compose"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements for selector: ${selector}`);
        
        for (const element of Array.from(elements)) {
          const htmlElement = element as HTMLElement;
          if (this.isValidInputContainer(htmlElement)) {
            console.log(`✅ Found valid input container: ${selector}`);
            // 親要素を返すか、要素自体を返すかを判断
            const container = htmlElement.parentElement || htmlElement;
            return container;
          }
        }
      } catch (error) {
        console.log(`❌ Selector error for ${selector}:`, error);
        continue;
      }
    }

    console.log('❌ No input container found');
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
   * フローティングコンテナを作成
   */
  private createFloatingContainer(): HTMLElement {
    console.log('🎈 Creating floating container for LINE...');
    
    // 既存のフローティングコンテナがあれば再利用
    const existingContainer = document.getElementById('line-floating-container');
    if (existingContainer) {
      console.log('♻️ Reusing existing floating container');
      return existingContainer;
    }

    const container = document.createElement('div');
    container.id = 'line-floating-container';
    container.innerHTML = '<div style="color: #00c300; font-size: 12px; margin-bottom: 8px;">LINE AI Assistant</div>';
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
      min-width: 180px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    document.body.appendChild(container);
    console.log('✅ Floating container created and added to body');
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

    // まずLINE Manager特有のDOM構造を試行
    const lineMessages = this.extractLineSpecificMessages();
    if (lineMessages.length > 0) {
      console.log(`✅ Extracted ${lineMessages.length} LINE-specific messages`);
      return lineMessages;
    }

    // 汎用的なメッセージセレクタを試行
    const genericMessages = this.extractGenericMessages();
    if (genericMessages.length > 0) {
      console.log(`✅ Extracted ${genericMessages.length} generic messages`);
      return genericMessages;
    }

    // フォールバック: チャットエリア全体から抽出
    console.log('🔄 Trying fallback message extraction...');
    const fallbackMessage = this.extractFallbackMessage();
    if (fallbackMessage) {
      return [fallbackMessage];
    }

    console.log('❌ No messages could be extracted');
    return [];
  }

  /**
   * LINE Manager特有のメッセージ抽出
   */
  private extractLineSpecificMessages(): Message[] {
    console.log('🔍 Starting LINE-specific message extraction...');
    
    const messages: Message[] = [];
    
    // LINE Managerの具体的なメッセージ構造を探す
    const messagePatterns = [
      // テキストを含む要素で、適切な長さのもの
      'div:not([class*="time"]):not([class*="timestamp"])',
      'span:not([class*="time"]):not([class*="timestamp"])',
      'p'
    ];

    // DOM全体を走査してメッセージらしいテキストを探す
    for (const pattern of messagePatterns) {
      const elements = document.querySelectorAll(pattern);
      console.log(`🔍 Found ${elements.length} elements for pattern: ${pattern}`);
      
      for (const element of Array.from(elements)) {
        const text = element.textContent?.trim();
        
        // メッセージの候補として評価
        if (this.isValidMessageCandidate(text)) {
          const messageData = this.createMessageFromText(text, element);
          if (messageData) {
            messages.push(messageData);
            console.log(`✅ Found message: "${text}"`);
          }
        }
      }
    }

    console.log(`📝 Total messages found: ${messages.length}`);
    
    // 重複除去し、最新5件を返す
    const uniqueMessages = this.removeDuplicateMessages(messages);
    const recentMessages = uniqueMessages.slice(-5);
    
    console.log(`📝 Returning ${recentMessages.length} recent messages`);
    return recentMessages;
  }

  /**
   * メッセージ候補として有効かチェック
   */
  private isValidMessageCandidate(text: string | null | undefined): boolean {
    if (!text) return false;
    
    const trimmed = text.trim();
    
    // 長さのチェック
    if (trimmed.length < 1 || trimmed.length > 500) return false;
    
    // 特定のメッセージに該当するかチェック
    const targetMessages = ['テスト', 'サロンに入会したいです！'];
    if (targetMessages.includes(trimmed)) {
      console.log(`🎯 Found target message: "${trimmed}"`);
      return true;
    }
    
    // 一般的なメッセージパターン
    if (trimmed.length >= 3 && 
        !this.isTimeStamp(trimmed) && 
        !this.isUIElement(trimmed) && 
        !this.isSystemMessage(trimmed)) {
      return true;
    }
    
    return false;
  }

  /**
   * テキストからMessageオブジェクトを作成
   */
  private createMessageFromText(text: string, element: Element): Message | null {
    if (!text) return null;
    
    // 送信者の判定
    const author = this.determineAuthorFromElement(element);
    
    return {
      author,
      text: text.trim()
    };
  }

  /**
   * 要素から送信者を判定（改良版）
   */
  private determineAuthorFromElement(element: Element): string {
    // 要素の位置を確認
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // 画面幅の60%より右側にある場合は店舗側
    if (rect.left > windowWidth * 0.6) {
      return '店舗';
    }
    
    // 左側にある場合は顧客
    if (rect.left < windowWidth * 0.4) {
      return 'お客様';
    }
    
    // 中央付近の場合は、親要素のclass名などから判定
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 3) {
      const className = current.className || '';
      
      // 送信側を示すクラス名パターン
      if (className.includes('sent') || className.includes('right') || className.includes('own')) {
        return '店舗';
      }
      
      // 受信側を示すクラス名パターン  
      if (className.includes('received') || className.includes('left') || className.includes('other')) {
        return 'お客様';
      }
      
      current = current.parentElement;
      depth++;
    }
    
    // デフォルトは顧客として扱う
    return 'お客様';
  }

  /**
   * LINE特有の要素からメッセージを抽出
   */
  private extractMessageFromLineElement(element: Element): Message | null {
    const text = element.textContent?.trim();
    
    // フィルタリング条件
    if (!text || 
        text.length < 2 || 
        text.length > 500 ||
        this.isSystemMessage(text) ||
        this.isTimeStamp(text) ||
        this.isUIElement(text)) {
      return null;
    }

    // 送信者の判定（簡易版）
    const author = this.determineAuthor(element, text);
    
    return {
      author,
      text
    };
  }

  /**
   * タイムスタンプかどうかを判定
   */
  private isTimeStamp(text: string): boolean {
    // 時刻パターン（例: "16:34", "16:35"）
    return /^\d{1,2}:\d{2}$/.test(text);
  }

  /**
   * UI要素かどうかを判定
   */
  private isUIElement(text: string): boolean {
    const uiTexts = [
      'すべて',
      '検索',
      'ヘルプ',
      '設定',
      'ホーム',
      'チャット',
      '送信',
      'Enter',
      'Shift'
    ];
    
    return uiTexts.some(uiText => text.includes(uiText));
  }

  /**
   * 送信者を判定
   */
  private determineAuthor(element: Element, text: string): string {
    // 要素の位置や親要素から送信者を推測
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // 画面の右側にあるメッセージは通常、自分（店舗側）の送信
    // 左側にあるメッセージは顧客からの受信
    if (rect.left > windowWidth * 0.6) {
      return '店舗';
    } else if (rect.left < windowWidth * 0.4) {
      return 'お客様';
    }
    
    // デフォルトは顧客として扱う
    return 'お客様';
  }

  /**
   * 汎用的なメッセージ抽出
   */
  private extractGenericMessages(): Message[] {
    const messages: Message[] = [];
    const messageSelectors = [
      'p', 'span', 'div'
    ];

    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of Array.from(elements)) {
        const messageData = this.extractMessageFromElement(element);
        if (messageData) {
          messages.push(messageData);
        }
      }
      
      if (messages.length > 0) {
        break;
      }
    }

    return this.removeDuplicateMessages(messages).slice(-5);
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
  async insertReply(text: string): Promise<void> {
    console.log('📝 LINE Official Account: Inserting reply...');
    console.log(`📝 Text to insert: "${text}"`);

    const input = this.findMessageInput();
    if (!input) {
      console.log('❌ Could not find message input');
      // デバッグ情報を出力
      this.debugInputFields();
      return;
    }

    try {
      // LINE向けの返信テキストを調整
      const lineFormattedText = this.formatTextForLine(text);
      console.log(`📝 Formatted text: "${lineFormattedText}"`);
      
      // 既存のテキストをクリア
      this.clearInputField(input);
      
      // 複数の方法でテキスト挿入を試行
      let success = false;
      
      // 方法1: React対応の高度な設定
      success = this.setInputValue(input, lineFormattedText);
      
      if (!success) {
        // 方法2: クリップボード経由
        console.log('🔄 Trying clipboard insertion method...');
        success = await this.insertViaClipboard(input, lineFormattedText);
      }
      
      if (!success) {
        // 方法3: キーボードシミュレーション  
        console.log('🔄 Trying keyboard simulation method...');
        success = this.insertViaKeyboard(input, lineFormattedText);
      }
      
      if (success) {
        console.log('✅ Reply inserted successfully');
      } else {
        console.log('❌ All insertion methods failed - showing copy assistance');
        this.showCopyAssistance(lineFormattedText);
      }
      
    } catch (error) {
      console.error('❌ Error inserting reply:', error);
      this.debugInputFields();
    }
  }

  /**
   * 入力フィールドの値を設定（React対応版）
   */
  private setInputValue(input: HTMLElement, text: string): boolean {
    const tagName = input.tagName.toLowerCase();
    
    try {
      // React対応：Fiberノードからの直接操作を試行
      if (tagName === 'textarea' || tagName === 'input') {
        const inputElement = input as HTMLInputElement | HTMLTextAreaElement;
        
        // React用の高度な設定を試行
        if (this.setReactInputValue(inputElement, text)) {
          console.log(`✅ Set value via React fiber method: "${text}"`);
          return true;
        }
        
        // フォールバック：通常のDOM操作
        inputElement.value = text;
        console.log(`📝 Set value via .value property: "${inputElement.value}"`);
        return true;
        
      } else if (input.getAttribute('contenteditable') === 'true') {
        // contenteditable要素
        input.textContent = text;
        input.innerHTML = text.replace(/\n/g, '<br>');
        console.log(`📝 Set content via textContent/innerHTML: "${input.textContent}"`);
        return true;
        
      } else if (input.getAttribute('role') === 'textbox') {
        // role="textbox"要素
        input.textContent = text;
        console.log(`📝 Set content via textContent (role=textbox): "${input.textContent}"`);
        return true;
      }
      
      console.log(`❌ Unknown input type: ${tagName}`);
      return false;
      
    } catch (error) {
      console.error('❌ Error setting input value:', error);
      return false;
    }
  }

  /**
   * React用の入力値設定
   */
  private setReactInputValue(input: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
    try {
      // React Fiberノードを取得
      const reactFiber = this.getReactFiber(input);
      if (!reactFiber) {
        console.log('❌ React fiber not found');
        return false;
      }

      // ネイティブのvalue setterを取得
      const descriptor = Object.getOwnPropertyDescriptor(
        input.constructor.prototype,
        'value'
      );
      
      if (!descriptor || !descriptor.set) {
        console.log('❌ Native value setter not found');
        return false;
      }

      // 値を設定
      descriptor.set.call(input, text);
      
      // React用のイベントを発火
      const event = new Event('input', { bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      Object.defineProperty(event, 'currentTarget', { value: input });
      
      input.dispatchEvent(event);
      
      console.log(`✅ React value set successfully: "${text}"`);
      return true;
      
    } catch (error) {
      console.log('❌ React input value setting failed:', error);
      return false;
    }
  }

  /**
   * React Fiberノードを取得
   */
  private getReactFiber(element: HTMLElement): any {
    const keys = Object.keys(element);
    
    for (const key of keys) {
      if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
        return (element as any)[key];
      }
    }
    
    return null;
  }

  /**
   * クリップボード経由でテキストを挿入
   */
  private async insertViaClipboard(input: HTMLElement, text: string): Promise<boolean> {
    try {
      // クリップボードに書き込み
      await navigator.clipboard.writeText(text);
      
      // 入力欄にフォーカス
      input.focus();
      
      // Ctrl+A で全選択
      const selectAllEvent = new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
        bubbles: true
      });
      input.dispatchEvent(selectAllEvent);
      
      // 短時間待機
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Ctrl+V でペースト
      const pasteEvent = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true
      });
      input.dispatchEvent(pasteEvent);
      
      // paste イベントも発火
      const clipboardEvent = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer()
      });
      
      // データを設定
      Object.defineProperty(clipboardEvent, 'clipboardData', {
        value: {
          getData: () => text,
          setData: () => {},
          items: [{
            kind: 'string',
            type: 'text/plain',
            getAsString: (callback: (data: string) => void) => callback(text)
          }]
        }
      });
      
      input.dispatchEvent(clipboardEvent);
      
      console.log('✅ Clipboard insertion attempted');
      return true;
      
    } catch (error) {
      console.log('❌ Clipboard insertion failed:', error);
      return false;
    }
  }

  /**
   * キーボードシミュレーションでテキストを挿入
   */
  private insertViaKeyboard(input: HTMLElement, text: string): boolean {
    try {
      // 入力欄にフォーカス
      input.focus();
      
      // 各文字を順番に入力
      for (const char of text) {
        // keydown イベント
        const keydownEvent = new KeyboardEvent('keydown', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true
        });
        input.dispatchEvent(keydownEvent);
        
        // keypress イベント
        const keypressEvent = new KeyboardEvent('keypress', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true
        });
        input.dispatchEvent(keypressEvent);
        
        // beforeinput イベント
        const beforeInputEvent = new InputEvent('beforeinput', {
          data: char,
          inputType: 'insertText',
          bubbles: true
        });
        input.dispatchEvent(beforeInputEvent);
        
        // 実際に値を設定
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          const currentValue = (input as HTMLInputElement).value || '';
          (input as HTMLInputElement).value = currentValue + char;
        } else {
          const currentValue = input.textContent || '';
          input.textContent = currentValue + char;
        }
        
        // input イベント
        const inputEvent = new InputEvent('input', {
          data: char,
          inputType: 'insertText',
          bubbles: true
        });
        input.dispatchEvent(inputEvent);
        
        // keyup イベント
        const keyupEvent = new KeyboardEvent('keyup', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true
        });
        input.dispatchEvent(keyupEvent);
      }
      
      console.log('✅ Keyboard simulation completed');
      return true;
      
    } catch (error) {
      console.log('❌ Keyboard simulation failed:', error);
      return false;
    }
  }

  /**
   * コピー支援機能を表示
   */
  private showCopyAssistance(text: string): void {
    console.log('🎯 Showing copy assistance for user');
    
    // 既存のアシスタンスUIがあれば削除
    const existingAssistance = document.getElementById('line-copy-assistance');
    if (existingAssistance) {
      existingAssistance.remove();
    }
    
    // コピー支援UIを作成
    const assistanceContainer = document.createElement('div');
    assistanceContainer.id = 'line-copy-assistance';
    assistanceContainer.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 999999 !important;
      background: white !important;
      border: 3px solid #00c300 !important;
      border-radius: 16px !important;
      padding: 24px !important;
      box-shadow: 0 12px 32px rgba(0, 195, 0, 0.3) !important;
      max-width: 500px !important;
      width: 90% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      animation: fadeIn 0.3s ease-out !important;
    `;
    
    assistanceContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="color: #00c300; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
          🎯 AI返信が生成されました
        </div>
        <div style="color: #666; font-size: 14px;">
          自動挿入できませんでしたが、下のボタンでコピーして手動でペーストしてください
        </div>
      </div>
      
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin: 16px 0; max-height: 200px; overflow-y: auto;">
        <div style="font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;">
          ${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button id="copy-text-btn" style="
          background: #00c300 !important;
          color: white !important;
          border: none !important;
          padding: 12px 24px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          font-weight: bold !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          box-shadow: 0 4px 12px rgba(0, 195, 0, 0.3) !important;
        ">
          📋 テキストをコピー
        </button>
        
        <button id="close-assistance-btn" style="
          background: #6c757d !important;
          color: white !important;
          border: none !important;
          padding: 12px 24px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        ">
          閉じる
        </button>
      </div>
      
      <div style="margin-top: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px; font-size: 12px; color: #0066cc;">
        💡 <strong>使い方:</strong> 「テキストをコピー」ボタンを押してから、LINE入力欄に手動でペースト（Ctrl+V）してください
      </div>
    `;
    
    // アニメーション用CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(assistanceContainer);
    
    // イベントリスナーを追加
    this.setupCopyAssistanceEvents(assistanceContainer, text);
    
    // 10秒後に自動で閉じる
    setTimeout(() => {
      if (document.body.contains(assistanceContainer)) {
        assistanceContainer.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => assistanceContainer.remove(), 300);
      }
    }, 10000);
  }

  /**
   * コピー支援UIのイベントを設定
   */
  private setupCopyAssistanceEvents(container: HTMLElement, text: string): void {
    const copyBtn = container.querySelector('#copy-text-btn') as HTMLButtonElement;
    const closeBtn = container.querySelector('#close-assistance-btn') as HTMLButtonElement;
    
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerHTML = '✅ コピー完了！';
          copyBtn.style.background = '#28a745 !important';
          
          setTimeout(() => {
            copyBtn.innerHTML = '📋 テキストをコピー';
            copyBtn.style.background = '#00c300 !important';
          }, 2000);
          
        } catch (error) {
          console.error('Copy failed:', error);
          copyBtn.innerHTML = '❌ コピー失敗';
          copyBtn.style.background = '#dc3545 !important';
        }
      });
      
      // ホバー効果
      copyBtn.addEventListener('mouseenter', () => {
        copyBtn.style.transform = 'translateY(-2px)';
        copyBtn.style.boxShadow = '0 6px 16px rgba(0, 195, 0, 0.4)';
      });
      
      copyBtn.addEventListener('mouseleave', () => {
        copyBtn.style.transform = 'translateY(0)';
        copyBtn.style.boxShadow = '0 4px 12px rgba(0, 195, 0, 0.3)';
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => container.remove(), 300);
      });
      
      // ホバー効果
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#5a6268 !important';
      });
      
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = '#6c757d !important';
      });
    }
    
    // ESCキーで閉じる
    const escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        container.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // オーバーレイクリックで閉じる
    container.addEventListener('click', (event) => {
      if (event.target === container) {
        container.remove();
      }
    });
  }

  /**
   * 入力フィールドをクリア
   */
  private clearInputField(input: HTMLElement): void {
    try {
      const tagName = input.tagName.toLowerCase();
      
      if (tagName === 'textarea' || tagName === 'input') {
        (input as HTMLInputElement | HTMLTextAreaElement).value = '';
      } else {
        input.textContent = '';
        input.innerHTML = '';
      }
    } catch (error) {
      console.log('❌ Error clearing input field:', error);
    }
  }

  /**
   * 入力イベントを発火
   */
  private triggerInputEvents(input: HTMLElement, text: string): void {
    try {
      // 基本的なイベント群
      const events = [
        'focus',
        'input', 
        'change',
        'keyup',
        'keydown',
        'paste',
        'blur'
      ];
      
      events.forEach(eventType => {
        const event = new Event(eventType, { 
          bubbles: true, 
          cancelable: true 
        });
        
        // React等のイベント処理用
        Object.defineProperty(event, 'target', { 
          value: input, 
          enumerable: true 
        });
        
        input.dispatchEvent(event);
      });
      
      // InputEventを個別に発火（より詳細な情報付き）
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: 'insertText'
      });
      
      Object.defineProperty(inputEvent, 'target', { 
        value: input, 
        enumerable: true 
      });
      
      input.dispatchEvent(inputEvent);
      
      console.log(`🎯 Triggered events for input field`);
      
    } catch (error) {
      console.error('❌ Error triggering input events:', error);
    }
  }

  /**
   * デバッグ用：入力フィールドの情報を出力
   */
  private debugInputFields(): void {
    console.log('🔍 Debugging input fields...');
    
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
    console.log(`Found ${allInputs.length} potential input fields:`);
    
    allInputs.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const style = window.getComputedStyle(htmlElement);
      
      console.log(`Input ${index}:`, {
        tagName: htmlElement.tagName,
        type: htmlElement.getAttribute('type'),
        placeholder: htmlElement.getAttribute('placeholder'),
        contentEditable: htmlElement.getAttribute('contenteditable'),
        role: htmlElement.getAttribute('role'),
        visible: rect.width > 0 && rect.height > 0,
        display: style.display,
        visibility: style.visibility,
        width: rect.width,
        height: rect.height,
        element: htmlElement
      });
    });
  }

  /**
   * メッセージ入力欄を探す
   */
  private findMessageInput(): HTMLElement | null {
    console.log('🔍 Looking for message input field...');
    
    // より具体的で広範囲なセレクタを試行
    const inputSelectors = [
      // LINE Manager specific patterns
      'textarea[placeholder*="Enter"]',
      'textarea[placeholder*="送信"]', 
      'textarea[placeholder*="改行"]',
      'textarea[placeholder*="メッセージ"]',
      'textarea[placeholder*="Message"]',
      'input[placeholder*="メッセージ"]',
      'input[placeholder*="Message"]',
      'div[contenteditable="true"]',
      
      // Generic input patterns
      'textarea',
      'input[type="text"]',
      'input[type="search"]',
      
      // Role-based selectors
      '[role="textbox"]',
      '[role="combobox"]',
      
      // Common class patterns
      '[class*="input"]',
      '[class*="textarea"]',
      '[class*="compose"]',
      '[class*="editor"]'
    ];

    for (const selector of inputSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Found ${elements.length} elements for input selector: ${selector}`);
        
        for (const element of Array.from(elements)) {
          const htmlElement = element as HTMLElement;
          if (this.isValidInputField(htmlElement)) {
            console.log(`✅ Found valid message input: ${selector}`);
            console.log(`📝 Input details:`, {
              tagName: htmlElement.tagName,
              type: htmlElement.getAttribute('type'),
              placeholder: htmlElement.getAttribute('placeholder'),
              contentEditable: htmlElement.getAttribute('contenteditable'),
              visible: htmlElement.offsetHeight > 0 && htmlElement.offsetWidth > 0
            });
            return htmlElement;
          }
        }
      } catch (error) {
        console.log(`❌ Error with selector ${selector}:`, error);
        continue;
      }
    }

    console.log('❌ No valid message input found - trying fallback methods');
    
    // フォールバック：DOM全体を検索
    return this.findInputFieldFallback();
  }

  /**
   * 入力フィールドが有効かどうかをチェック（改良版）
   */
  private isValidInputField(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // 基本的な可視性チェック
    const isVisible = (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
    
    if (!isVisible) {
      return false;
    }

    // 入力可能な要素かチェック
    const tagName = element.tagName.toLowerCase();
    const isInputElement = (
      tagName === 'textarea' ||
      tagName === 'input' ||
      element.getAttribute('contenteditable') === 'true' ||
      element.getAttribute('role') === 'textbox'
    );
    
    // 編集不可能な要素は除外
    const isEditable = !element.hasAttribute('readonly') && !element.hasAttribute('disabled');
    
    return isInputElement && isEditable;
  }

  /**
   * フォールバック：DOM全体から入力フィールドを探す
   */
  private findInputFieldFallback(): HTMLElement | null {
    console.log('🔄 Using fallback input field detection...');
    
    // すべてのフォーカス可能な要素を取得
    const focusableElements = document.querySelectorAll(
      'input, textarea, [contenteditable="true"], [role="textbox"]'
    );
    
    console.log(`🔍 Found ${focusableElements.length} potentially focusable elements`);
    
    for (const element of Array.from(focusableElements)) {
      const htmlElement = element as HTMLElement;
      
      if (this.isValidInputField(htmlElement)) {
        console.log('✅ Found input field via fallback method');
        return htmlElement;
      }
    }
    
    console.log('❌ No input field found even with fallback');
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

  /**
   * デバッグ用：DOM構造をコンソールに出力
   * ブラウザのコンソールで window.lineDOMDebug() を実行
   */
  debugDOMStructure(): void {
    console.log('🔍 LINE DOM Debug Information:');
    console.log('URL:', window.location.href);
    console.log('Hostname:', window.location.hostname);
    console.log('Pathname:', window.location.pathname);
    
    console.log('\n📝 All textarea elements:');
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((ta, index) => {
      console.log(`Textarea ${index}:`, {
        placeholder: ta.placeholder,
        value: ta.value,
        visible: ta.offsetHeight > 0,
        element: ta
      });
    });
    
    console.log('\n📝 All input elements:');
    const inputs = document.querySelectorAll('input');
    inputs.forEach((input, index) => {
      console.log(`Input ${index}:`, {
        type: input.type,
        placeholder: input.placeholder,
        value: input.value,
        visible: input.offsetHeight > 0,
        element: input
      });
    });
    
    console.log('\n📝 All contenteditable elements:');
    const editables = document.querySelectorAll('[contenteditable="true"]');
    editables.forEach((editable, index) => {
      console.log(`Editable ${index}:`, {
        textContent: editable.textContent,
        innerHTML: editable.innerHTML,
        visible: (editable as HTMLElement).offsetHeight > 0,
        element: editable
      });
    });
    
    console.log('\n🎯 Current button injection status:');
    console.log('Button exists:', !!document.getElementById(LineOfficialAccountStrategy.BUTTON_ID));
    console.log('Floating container exists:', !!document.getElementById('line-floating-container'));
  }
}

// デバッグ用のグローバル関数をウィンドウに追加
declare global {
  interface Window {
    lineDOMDebug: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.lineDOMDebug = () => {
    const strategy = new LineOfficialAccountStrategy();
    strategy.debugDOMStructure();
  };
}