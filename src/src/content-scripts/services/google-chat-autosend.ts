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
    this.modalManager = new ModalManager('google-chat');
    this.debugHelper = new DebugHelper('google-chat');
  }

  getServiceName(): 'google-chat' {
    return 'google-chat';
  }

  /**
   * 挿入ポイントを検索
   */
  findInsertionPoint(): HTMLElement | null {
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
    return this.findElementBySelectors(GOOGLE_CHAT_CONFIG.inputSelectors);
  }

  /**
   * チャットエリアを検索
   */
  private findChatArea(): HTMLElement | null {
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

    return this.findElementBySelectors(selectors);
  }

  /**
   * フローティングコンテナ作成
   */
  private createFloatingContainer(): HTMLElement {
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
    
    try {
      const success = await this.sendButtonManager.findAndClickSendButton(
        GOOGLE_CHAT_CONFIG.buttonSelectors
      );
      
      if (success) {
        this.logSuccess('Auto-send completed successfully');
      } else {
        this.logError('Auto-send failed', new Error('Could not find or click send button'));
      }
      
      return success;
    } catch (error) {
      this.logError('Auto-send exception', error);
      return false;
    }
  }

  /**
   * モーダル表示
   */
  showModal(generatedText: string): void {
    console.log('📱 Google Chat: Showing modal...');
    
    this.modalManager.showModal(
      generatedText,
      (text) => this.insertReply(text),
      () => this.autoSend()
    );
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