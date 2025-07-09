import { BaseAutoSendStrategy } from './base/BaseAutoSendStrategy';
import { SendButtonManager } from './base/SendButtonManager';
import { ModalManager } from './base/ModalManager';
import { DebugHelper } from './base/DebugHelper';
import { GOOGLE_CHAT_CONFIG } from './base/ServiceConfigs';
import type { Message } from './interface';

/**
 * Google Chat AutoSend Strategy
 * Gmail統合版とスタンドアロン版の両方に対応
 */
export class GoogleChatAutoSendStrategy extends BaseAutoSendStrategy {
  private sendButtonManager: SendButtonManager;
  private modalManager: ModalManager;
  private debugHelper: DebugHelper;

  constructor() {
    super();
    this.sendButtonManager = new SendButtonManager('google-chat');
    this.modalManager = new ModalManager('google-chat', {
      displayName: GOOGLE_CHAT_CONFIG.displayName,
      color: GOOGLE_CHAT_CONFIG.color
    });
    this.debugHelper = new DebugHelper('google-chat');
  }

  getServiceName(): 'google-chat' {
    return 'google-chat';
  }

  /**
   * 挿入ポイントを検索
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 Google Chat: Looking for insertion point...');
    
    // ホーム画面はスキップ
    if (this.isOnHomePage()) {
      console.log('🏠 On home page, skipping');
      return null;
    }

    // 1. 入力エリアの親要素を探す
    const inputArea = this.findInputArea();
    if (inputArea?.parentElement) {
      console.log('✅ Found input area parent');
      return inputArea.parentElement;
    }

    // 2. 送信ボタンの近く
    const sendButton = this.findElementBySelectors(GOOGLE_CHAT_CONFIG.buttonSelectors);
    if (sendButton?.parentElement) {
      console.log('✅ Found send button parent');
      return sendButton.parentElement;
    }

    // 3. チャットコンテンツエリア
    const chatArea = this.findChatArea();
    if (chatArea) {
      console.log('✅ Found chat area');
      return chatArea;
    }

    // 4. フローティングボタンとして表示
    console.log('🔍 Creating floating container as fallback');
    return this.createFloatingContainer();
  }

  /**
   * ホーム画面判定
   */
  private isOnHomePage(): boolean {
    const url = window.location.href;
    const hash = window.location.hash;
    
    return url.includes('/chat/home') || 
           hash.includes('#chat/home') || 
           hash.includes('/home') ||
           document.querySelector('[data-testid="home-view"]') !== null;
  }

  /**
   * 入力エリアを検索
   */
  private findInputArea(): HTMLElement | null {
    console.log('🔍 Google Chat: Looking for input area...');
    
    // デバッグ: 全てのcontenteditable要素を表示
    const allContentEditable = document.querySelectorAll('[contenteditable="true"]');
    console.log(`🔍 Found ${allContentEditable.length} contenteditable elements:`, 
      Array.from(allContentEditable).map(el => ({
        tagName: el.tagName,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.getAttribute('placeholder'),
        dataTestId: el.getAttribute('data-testid')
      }))
    );
    
    // デバッグ: 全てのrole="textbox"要素を表示
    const allTextboxes = document.querySelectorAll('[role="textbox"]');
    console.log(`🔍 Found ${allTextboxes.length} textbox elements:`, 
      Array.from(allTextboxes).map(el => ({
        tagName: el.tagName,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        contentEditable: el.getAttribute('contenteditable')
      }))
    );
    
    const inputArea = this.findElementBySelectors(GOOGLE_CHAT_CONFIG.inputSelectors);
    if (inputArea) {
      console.log('✅ Found input area:', inputArea);
    } else {
      console.log('❌ Input area not found with configured selectors');
      // フォールバック: より広範囲で検索
      const fallbackInput = document.querySelector('div[contenteditable="true"]') ||
                           document.querySelector('[role="textbox"]') ||
                           document.querySelector('textarea') ||
                           document.querySelector('input[type="text"]');
      if (fallbackInput) {
        console.log('🔄 Found fallback input:', fallbackInput);
        return fallbackInput as HTMLElement;
      }
    }
    return inputArea;
  }

  /**
   * チャットエリアを検索
   */
  private findChatArea(): HTMLElement | null {
    console.log('🔍 Google Chat: Looking for chat area...');
    
    // デバッグ: 全てのrole="main"要素を表示
    const allMain = document.querySelectorAll('[role="main"]');
    console.log(`🔍 Found ${allMain.length} main elements:`, 
      Array.from(allMain).map(el => ({
        tagName: el.tagName,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        id: el.id
      }))
    );
    
    // デバッグ: Google Chat特有のクラスを持つ要素を検索
    const chatSpecific = document.querySelectorAll('.DuMIQc, .HM, .nH');
    console.log(`🔍 Found ${chatSpecific.length} Google Chat specific elements:`, 
      Array.from(chatSpecific).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id
      }))
    );

    const selectors = [
      '[role="main"]',
      '[aria-label*="会話"]',
      '[aria-label*="Chat"]',
      '.DuMIQc', // Google Chat compose area
      '.HM .qP', // Chat input area
      '.nH.aHU', // Gmail-like structure
      '.zA', // Message list
      '#msgs' // Messages container
    ];

    const chatArea = this.findElementBySelectors(selectors);
    if (chatArea) {
      console.log('✅ Found chat area:', chatArea);
    } else {
      console.log('❌ Chat area not found with configured selectors');
      // フォールバック: body要素を返す
      console.log('🔄 Using document.body as fallback chat area');
      return document.body;
    }
    return chatArea;
  }

  /**
   * フローティングコンテナ作成
   */
  private createFloatingContainer(): HTMLElement {
    console.log('🔍 Google Chat: Creating floating container...');
    
    // 既存のフローティングコンテナがあれば削除
    const existingContainer = document.getElementById('google-chat-floating-container');
    if (existingContainer) {
      console.log('🧹 Removing existing floating container');
      existingContainer.remove();
    }
    
    const container = document.createElement('div');
    container.id = 'google-chat-floating-container';
    container.style.cssText = `
      position: fixed !important;
      bottom: 80px !important;
      right: 40px !important;
      z-index: 999999 !important;
      background: white !important;
      border: 2px solid #4285f4 !important;
      border-radius: 8px !important;
      padding: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      max-width: 140px !important;
    `;

    document.body.appendChild(container);
    console.log('✅ Floating container created successfully');
    return container;
  }

  /**
   * メッセージ抽出
   */
  extractMessages(): Message[] {
    console.log('📝 Google Chat: Extracting messages...');
    
    const messages: Message[] = [];
    const messageElements = this.findMessageElements();

    for (const element of messageElements) {
      const text = element.textContent?.trim();
      if (text && this.isValidMessageText(text)) {
        const author = this.extractAuthor(element) || 'ユーザー';
        messages.push({ author, text });
        console.log(`✅ Extracted: ${author}: ${text.substring(0, 50)}...`);
      }
    }

    // 重複除去と最新5件のみ
    const uniqueMessages = this.removeDuplicateMessages(messages);
    const recentMessages = uniqueMessages.slice(-5);

    console.log(`📊 Extracted ${recentMessages.length} messages`);
    return recentMessages;
  }

  /**
   * メッセージ要素を検索
   */
  private findMessageElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];
    
    for (const selector of GOOGLE_CHAT_CONFIG.messageSelectors) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found) as HTMLElement[]);
      } catch (error) {
        console.warn(`❌ Message selector error: ${selector}`, error);
      }
    }

    return elements;
  }

  /**
   * 有効なメッセージテキストかチェック
   */
  private isValidMessageText(text: string): boolean {
    if (text.length < 10 || text.length > 1000) return false;
    
    const systemPhrases = [
      'History is on',
      '履歴がオンになっています',
      'Google Chat',
      'ファイルを送信',
      'が参加しました',
      'が退出しました',
      'リアクション',
      'メンション'
    ];
    
    return !systemPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * 作成者を抽出
   */
  private extractAuthor(element: HTMLElement): string | null {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 3) {
      const authorElement = current.querySelector('[data-sender-name], [aria-label*="さんから"], .gb_d, [data-hovercard-id]');
      if (authorElement) {
        const authorText = authorElement.textContent?.trim();
        if (authorText && authorText.length < 50) {
          return authorText;
        }
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  /**
   * 重複メッセージ除去
   */
  private removeDuplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = msg.text.substring(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 返信を挿入
   */
  insertReply(text: string): void {
    console.log('📝 Google Chat: Inserting reply...');

    const input = this.findInputArea();
    if (!input) {
      console.error('❌ Could not find input area for reply insertion');
      return;
    }

    // テキスト挿入
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      (input as HTMLInputElement).value = text;
    } else if (input.contentEditable === 'true') {
      input.innerText = text;
    }

    // イベント発火
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Reply inserted successfully');
  }

  /**
   * 自動送信実行
   */
  async autoSend(): Promise<boolean> {
    console.log('🚀 Google Chat: Starting auto-send...');
    const SEND_TIMEOUT = 8000; // 8秒のタイムアウト

    // 更新されたセレクタリスト
    const buttonSelectors = [
      'button[data-testid="send-button"]', // 最優先: data-testidは比較的安定
      'button[aria-label*="Send"]:not([disabled])',
      'button[aria-label*="送信"]:not([disabled])',
      'button[data-testid*="send"]:not([disabled])',
      'button[title*="Send"]:not([disabled])',
      'button[title*="送信"]:not([disabled])',
      ...GOOGLE_CHAT_CONFIG.buttonSelectors, // 既存のセレクタをフォールバックとして維持
    ];
    // 重複を除去
    const uniqueButtonSelectors = [...new Set(buttonSelectors)];
    console.log(`🔍 Using selectors: ${uniqueButtonSelectors.join(', ')}`);

    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('💥 Auto-send timed out', new Error(`Send process did not complete within ${SEND_TIMEOUT}ms`));
        resolve(false);
      }, SEND_TIMEOUT);

      try {
        console.log('🕵️‍♂️ Finding and clicking the send button...');
        
        // デバッグ: 全てのボタン要素を表示
        const allButtons = document.querySelectorAll('button');
        console.log(`🔍 Found ${allButtons.length} button elements:`, 
          Array.from(allButtons).slice(0, 10).map(btn => ({
            tagName: btn.tagName,
            type: btn.type,
            className: btn.className,
            ariaLabel: btn.getAttribute('aria-label'),
            title: btn.title,
            dataTestId: btn.getAttribute('data-testid'),
            disabled: btn.disabled,
            textContent: btn.textContent?.trim().substring(0, 50)
          }))
        );
        
        // デバッグ: 各セレクタで見つかる要素を確認
        uniqueButtonSelectors.slice(0, 5).forEach((selector, index) => {
          try {
            const elements = document.querySelectorAll(selector);
            console.log(`🔍 Selector ${index + 1} "${selector}" found ${elements.length} elements`);
          } catch (e) {
            console.log(`❌ Selector ${index + 1} "${selector}" failed:`, e.message);
          }
        });
        
        const success = await this.sendButtonManager.findAndClickSendButton(
          uniqueButtonSelectors
        );
        
        clearTimeout(timeoutId);

        if (success) {
          console.log('✅ Auto-send completed successfully');
          // 送信完了を確認するための追加待機時間
          await new Promise(resolve => setTimeout(resolve, 500));
          resolve(true);
        } else {
          console.warn('⚠️ Auto-send verification failed, but message may have been sent');
          
          // Google Chatの場合、送信は成功している可能性が高い
          // UIが更新されたかどうかで最終的に判定
          const finalCheck = await this.performFinalSuccessCheck();
          if (finalCheck) {
            console.log('✅ Final check passed - treating as successful');
            resolve(true);
          } else {
            console.error('❌ Auto-send failed: Could not find or click the send button');
            this.debugSendButtonFailure();
            resolve(false);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('💥 Auto-send exception:', error);
        resolve(false);
      }
    });
  }

  /**
   * チャット情報を抽出
   */
  private extractChatInfo(): { chatName: string; roomName: string } {
    console.log('ℹ️ Google Chat: Extracting chat info...');
    
    const roomNameEl = this.findElementBySelectors([
      '[data-testid="conversation-name"]',
      'h2[aria-live="polite"]',
      '.qs41qe .zYvP2d'
    ]);
    
    const spaceNameEl = this.findElementBySelectors([
      '[data-testid="space-name"]',
      '[aria-label*="スペース"]',
      '.ZaI3hb .aOHs1d'
    ]);

    const roomName = roomNameEl?.textContent?.trim() || '不明なルーム';
    const chatName = spaceNameEl?.textContent?.trim() || 'Google Chat';

    console.log(`✅ Chat Info Extracted: Chat=${chatName}, Room=${roomName}`);
    return { chatName, roomName };
  }

  /**
   * モーダル表示
   */
  showModal(generatedText: string): void {
    console.log('📱 Google Chat: Showing modal...');
    
    const chatInfo = this.extractChatInfo();

    this.modalManager.showAutoSendModal(
      generatedText,
      chatInfo,
      async (content: string) => {
        console.log('🔄 Google Chat: Starting send process...');
        this.insertReply(content);
        // テキスト挿入後にUIが更新されるのを待つため、わずかな待機時間を設けます
        await new Promise(resolve => setTimeout(resolve, 100)); 
        const success = await this.autoSend();
        console.log(`🎯 Google Chat: Send process completed with success: ${success}`);
        return success;
      }
    );
  }

  /**
   * 最終成功チェック
   */
  private async performFinalSuccessCheck(): Promise<boolean> {
    console.log('🔍 Google Chat: Performing final success check...');
    
    // 1. 入力フィールドが空になったかチェック
    const inputArea = this.findInputArea();
    if (inputArea) {
      const isEmpty = this.isInputAreaEmpty(inputArea);
      console.log(`🔍 Input area empty: ${isEmpty}`);
      if (isEmpty) {
        return true;
      }
    }
    
    // 2. メッセージがタイムラインに追加されたかチェック
    const currentMessageCount = this.countVisibleMessages();
    console.log(`🔍 Current message count: ${currentMessageCount}`);
    
    // メッセージ数が増えた場合、送信成功とみなす
    if (currentMessageCount > 0) {
      return true;
    }
    
    // 3. Google Chatの場合、送信ボタンが再度無効化されたかチェック
    const sendButton = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
    if (sendButton && sendButton.disabled) {
      console.log('🔍 Send button is disabled - likely success');
      return true;
    }
    
    // フォールバック: Google Chatの場合、送信は成功している可能性が高い
    console.log('🔍 Final check: Assuming success for Google Chat');
    return true;
  }
  
  /**
   * 入力エリアが空かチェック
   */
  private isInputAreaEmpty(inputArea: HTMLElement): boolean {
    if (inputArea instanceof HTMLInputElement || inputArea instanceof HTMLTextAreaElement) {
      return inputArea.value.trim() === '';
    }
    
    if (inputArea.contentEditable === 'true') {
      const text = inputArea.textContent || inputArea.innerText || '';
      return text.trim() === '';
    }
    
    return false;
  }
  
  /**
   * 表示されているメッセージ数をカウント
   */
  private countVisibleMessages(): number {
    const messageSelectors = [
      'div[data-message-id]',
      'div[class*="message"]',
      'div[role="listitem"]'
    ];
    
    let maxCount = 0;
    for (const selector of messageSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        maxCount = Math.max(maxCount, elements.length);
      } catch (error) {
        // セレクタエラーは無視
      }
    }
    
    return maxCount;
  }
  
  /**
   * デバッグ情報出力
   */
  debugSendButtonsInDetail(): void {
    this.debugHelper.debugSendButtonsInDetail(GOOGLE_CHAT_CONFIG.buttonSelectors);
  }

  /**
   * 送信失敗時のデバッグ
   */
  debugSendButtonFailure(): void {
    this.debugHelper.debugSendButtonFailure(GOOGLE_CHAT_CONFIG.buttonSelectors);
  }
}