import type { ServiceStrategy, Message } from './interface';

/**
 * Google Chat 戦略 - シンプル版
 * 複雑な機能を削除し、基本機能のみに特化
 */
export class GoogleChatSimpleStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-google-chat';

  getServiceName(): 'google-chat' {
    return 'google-chat';
  }

  /**
   * シンプルな挿入ポイント検索
   */
  findInsertionPoint(): HTMLElement | null {
    console.log('🔍 Simple Google Chat: Looking for insertion point...');
    
    // ホーム画面はスキップ
    if (this.isOnHomePage()) {
      console.log('🏠 On home page, skipping');
      return null;
    }

    // 1. チャット入力エリアを探す
    const chatInput = this.findChatInput();
    if (chatInput && chatInput.parentElement) {
      console.log('✅ Found chat input, using parent');
      return chatInput.parentElement;
    }

    // 2. フローティングボタンとして表示
    console.log('🎈 Creating floating button container');
    return this.createFloatingContainer();
  }

  /**
   * シンプルなホーム画面チェック
   */
  private isOnHomePage(): boolean {
    const hash = window.location.hash;
    return hash.includes('#chat/home') || hash.includes('/home');
  }

  /**
   * シンプルなチャット入力検索
   */
  private findChatInput(): HTMLElement | null {
    const selectors = [
      'input[placeholder*="履歴がオンになっています"]',
      'input[placeholder*="History is on"]',
      'div[contenteditable="true"]',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isValidInput(element)) {
        console.log(`✅ Found input: ${selector}`);
        return element;
      }
    }

    return null;
  }

  /**
   * 有効な入力エリアかチェック
   */
  private isValidInput(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
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
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(GoogleChatSimpleStrategy.BUTTON_ID);
  }

  /**
   * シンプルなメッセージ抽出
   */
  extractMessages(): Message[] {
    console.log('📝 Simple message extraction...');
    
    const messages: Message[] = [];

    // 複数のセレクターでメッセージを検索
    const selectors = [
      // Google Chat standard message selectors
      '[data-message-id]',
      '[role="listitem"]',
      '[jsname="bgckF"]',
      // Generic message containers
      'div[data-p*="{"]', // JSON data attributes
      '.Zc1Emd', // Known Google Chat message class
      '.nF6pT', // Message text class
      '[data-topic-id]',
      // Fallback: any element with substantial text
      'div:not(script):not(style)'
    ];

    let foundMessages = false;

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (const element of Array.from(elements)) {
          const text = element.textContent?.trim();
          
          // Filter for actual message content
          if (text && 
              text.length > 10 && 
              text.length < 1000 && 
              !text.includes('履歴がオンになっています') &&
              !text.includes('新しいメッセージ') &&
              !text.includes('Google Chat') &&
              !this.isSystemMessage(text)) {
            
            // Try to extract author from parent or sibling elements
            const author = this.extractAuthor(element) || 'ユーザー';
            
            messages.push({
              author: author,
              text: text
            });
            
            console.log(`✅ Extracted message: ${author}: ${text.substring(0, 50)}...`);
          }
        }
        
        if (messages.length > 0) {
          foundMessages = true;
          break; // Found messages with this selector, stop trying others
        }
      } catch (error) {
        console.log(`❌ Error with selector ${selector}:`, error);
      }
    }

    // Fallback: if no structured messages found, extract from visible chat area
    if (!foundMessages) {
      console.log('🔄 No structured messages found, trying chat area extraction...');
      const chatArea = this.findChatArea();
      if (chatArea) {
        const text = chatArea.innerText?.trim();
        if (text && text.length > 20) {
          messages.push({
            author: '会話',
            text: text.slice(-1500) // Last 1500 characters
          });
          console.log(`✅ Extracted from chat area: ${text.substring(0, 100)}...`);
        }
      }
    }

    // Remove duplicates and keep last 5 messages
    const uniqueMessages = this.removeDuplicateMessages(messages);
    const recentMessages = uniqueMessages.slice(-5);

    console.log(`📊 Final extracted ${recentMessages.length} messages`);
    return recentMessages;
  }

  /**
   * Check if text is a system message to filter out
   */
  private isSystemMessage(text: string): boolean {
    const systemPhrases = [
      'ファイルを送信',
      'が参加しました',
      'が退出しました',
      'スレッドを開始',
      'リアクション',
      'メンション',
      '時刻',
      '送信中',
      'オンライン',
      'オフライン'
    ];
    
    return systemPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * Extract author name from element context
   */
  private extractAuthor(element: HTMLElement): string | null {
    // Look for author in parent elements or siblings
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 3) {
      // Look for author indicators
      const authorElement = current.querySelector('[data-sender-name], [aria-label*="さんから"], .gb_d');
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
   * Find the main chat conversation area
   */
  private findChatArea(): HTMLElement | null {
    const selectors = [
      '[role="main"]',
      '[aria-label*="会話"]',
      '.nH.aHU', // Gmail-like structure
      '.zA', // Message list
      '#msgs', // Messages container
      '.Tm .Ya' // Chat content area
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.innerText?.length > 50) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Remove duplicate messages based on text content
   */
  private removeDuplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = msg.text.substring(0, 100); // First 100 chars as key
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * シンプルな返信挿入
   */
  insertReply(text: string): void {
    console.log('📝 Simple reply insertion...');

    const input = this.findChatInput();
    if (input) {
      if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
        (input as HTMLInputElement).value = text;
      } else {
        input.innerText = text;
      }
      
      // フォーカスして変更イベントを発火
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('✅ Reply inserted');
    } else {
      console.log('❌ Could not find input for reply insertion');
    }
  }
}