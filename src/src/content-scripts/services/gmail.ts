import type { ServiceStrategy, Message } from './interface';

export class GmailStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-gmail';

  getServiceName(): 'gmail' {
    return 'gmail';
  }

  findInsertionPoint(): HTMLElement | null {
    try {
      // 最新のGmail UI（2024-2025版）に対応したセレクター戦略
      console.log('Gmail: Looking for insertion point...');
      
      // 現在のGmailのビューを検出
      const currentView = this.detectGmailView();
      console.log(`Gmail: Detected view: ${currentView}`);

      // 1. 返信/転送ボタンがあるツールバーを探す（最新のGmail UI）
      const toolbarSelectors = [
        // 新しいGmail UI - 返信ボタン
        'div[role="toolbar"] div[data-tooltip*="返信"]',
        'div[role="toolbar"] div[data-tooltip*="Reply"]',
        'div[role="toolbar"] div[aria-label*="返信"]',
        'div[role="toolbar"] div[aria-label*="Reply"]',
        'div[role="toolbar"] div[title*="返信"]',
        'div[role="toolbar"] div[title*="Reply"]',
        
        // 送信ボタン周辺
        'div[role="toolbar"] div[aria-label*="送信"]',
        'div[role="toolbar"] div[aria-label*="Send"]',
        'div[role="toolbar"] div[data-tooltip*="送信"]',
        'div[role="toolbar"] div[data-tooltip*="Send"]',
        
        // より汎用的なツールバー
        'div[role="toolbar"]',
        'div[class*="toolbar"]',
      ];

      for (const selector of toolbarSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Gmail: Found toolbar with selector: ${selector}`);
          const toolbar = element.closest('div[role="toolbar"]') || element;
          if (toolbar && this.isValidToolbar(toolbar as HTMLElement)) {
            return toolbar as HTMLElement;
          }
        }
      }

      // 2. 作成/返信エリアのツールバーを探す
      const composeSelectors = [
        'div[aria-label*="メッセージ本文"]',
        'div[aria-label*="Message body"]',
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'div[class*="editable"]',
      ];

      for (const selector of composeSelectors) {
        const composeArea = document.querySelector(selector);
        if (composeArea) {
          console.log(`Gmail: Found compose area with selector: ${selector}`);
          
          // 親要素からツールバーを探す
          const toolbar = this.findNearbyToolbar(composeArea);
          if (toolbar) {
            return toolbar;
          }
        }
      }

      // 3. フォールバック: より広範囲でツールバーを探す
      const fallbackSelectors = [
        // Gmail特有のクラス（2024-2025版）
        'div.gU div[role="toolbar"]',
        'div.Am div[role="toolbar"]',
        'div.aoT div[role="toolbar"]',
        'div.AD div[role="toolbar"]',
        'div.adn div[role="toolbar"]',
        'div.ii div[role="toolbar"]',
        'div.gs div[role="toolbar"]',
        
        // 新しいGmail UI構造
        'div[data-thread-id] div[role="toolbar"]',
        'div[data-message-id] div[role="toolbar"]',
        'div[jsname] div[role="toolbar"]',
        'div[jscontroller] div[role="toolbar"]',
        
        // 一般的なツールバー
        'div[role="toolbar"]:not([aria-hidden="true"])',
        'div[class*="toolbar"]:not([aria-hidden="true"])',
        'div[class*="action"]:has(div[role="toolbar"])',
      ];

      for (const selector of fallbackSelectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar && this.isValidToolbar(toolbar as HTMLElement)) {
          console.log(`Gmail: Found fallback toolbar with selector: ${selector}`);
          return toolbar as HTMLElement;
        }
      }

      // 4. 最終フォールバック: 返信ボタンを直接探す
      const replyButtonSelectors = [
        'div[data-tooltip*="返信"]',
        'div[data-tooltip*="Reply"]',
        'div[aria-label*="返信"]',
        'div[aria-label*="Reply"]',
        'span[data-tooltip*="返信"]',
        'span[data-tooltip*="Reply"]',
        'button[aria-label*="返信"]',
        'button[aria-label*="Reply"]',
        'div[role="button"][aria-label*="返信"]',
        'div[role="button"][aria-label*="Reply"]',
      ];

      for (const selector of replyButtonSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`Gmail: Found reply button, using its parent: ${selector}`);
          return button.parentElement as HTMLElement;
        }
      }

      // 5. 最終的なフォールバック: DOM構造を分析してツールバーを探す
      console.log('Gmail: Attempting DOM structure analysis...');
      const possibleToolbars = document.querySelectorAll('div');
      for (const div of possibleToolbars) {
        const element = div as HTMLElement;
        if (this.looksLikeGmailToolbar(element)) {
          console.log('Gmail: Found toolbar through DOM analysis');
          return element;
        }
      }

      console.warn('Gmail: No insertion point found after exhaustive search');
      this.logCurrentDOMState();
      return null;
    } catch (error) {
      console.error('Gmail: Error finding insertion point:', error);
      return null;
    }
  }

  private isValidToolbar(toolbar: HTMLElement): boolean {
    // ツールバーが有効かチェック
    if (!toolbar || toolbar.offsetHeight === 0 || toolbar.offsetWidth === 0) {
      return false;
    }
    
    // 非表示でないかチェック
    const style = window.getComputedStyle(toolbar);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    return true;
  }

  private findNearbyToolbar(element: Element): HTMLElement | null {
    // 指定された要素の周辺でツールバーを探す
    const searchElements = [
      element.parentElement,
      element.parentElement?.parentElement,
      element.parentElement?.parentElement?.parentElement,
    ];

    for (const parent of searchElements) {
      if (!parent) continue;
      
      // 兄弟要素でツールバーを探す
      const siblingToolbar = parent.querySelector('div[role="toolbar"]');
      if (siblingToolbar && this.isValidToolbar(siblingToolbar as HTMLElement)) {
        return siblingToolbar as HTMLElement;
      }
      
      // 子要素でツールバーを探す
      const childToolbar = parent.querySelector('div[role="toolbar"]');
      if (childToolbar && this.isValidToolbar(childToolbar as HTMLElement)) {
        return childToolbar as HTMLElement;
      }
    }

    return null;
  }

  private detectGmailView(): string {
    // 現在のGmailのビューを検出
    const url = window.location.href;
    const hash = window.location.hash;
    
    if (url.includes('/compose') || hash.includes('compose')) {
      return 'compose';
    } else if (url.includes('/thread/') || hash.includes('thread/')) {
      return 'thread';
    } else if (hash.includes('inbox')) {
      return 'inbox';
    } else if (hash.includes('sent')) {
      return 'sent';
    } else if (hash.includes('drafts')) {
      return 'drafts';
    } else {
      return 'unknown';
    }
  }

  private looksLikeGmailToolbar(element: HTMLElement): boolean {
    // Gmail のツールバーっぽい要素かチェック
    if (!element || !this.isValidToolbar(element)) {
      return false;
    }

    // ツールバーの特徴をチェック
    const hasToolbarRole = element.getAttribute('role') === 'toolbar';
    const hasToolbarClass = element.className.includes('toolbar');
    
    // 子要素にボタンがあるかチェック
    const hasButtons = element.querySelectorAll('div[role="button"], button, span[role="button"]').length > 0;
    
    // 返信関連のテキストが含まれているかチェック
    const text = element.textContent?.toLowerCase() || '';
    const hasReplyText = text.includes('reply') || text.includes('返信') || text.includes('send') || text.includes('送信');
    
    // ツールバーっぽい特徴があるかチェック
    const looksLikeToolbar = hasToolbarRole || hasToolbarClass || (hasButtons && hasReplyText);
    
    return looksLikeToolbar;
  }

  private logCurrentDOMState(): void {
    // デバッグ用: 現在のDOM状態をログに出力
    console.log('Gmail: Current DOM state analysis:');
    
    // 基本的なGmail要素の存在確認
    const gmailElements = [
      'div[role="toolbar"]',
      'div[aria-label*="Reply"]',
      'div[aria-label*="返信"]',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
    ];
    
    gmailElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Gmail: Found ${elements.length} elements matching "${selector}"`);
    });
    
    // URLも確認
    console.log(`Gmail: Current URL: ${window.location.href}`);
    
    // 全てのツールバーを確認
    const allToolbars = document.querySelectorAll('div[role="toolbar"]');
    console.log(`Gmail: Found ${allToolbars.length} toolbar elements`);
    allToolbars.forEach((toolbar, index) => {
      const element = toolbar as HTMLElement;
      console.log(`Gmail: Toolbar ${index}: visible=${this.isValidToolbar(element)}, text="${element.textContent?.substring(0, 100)}"`);
    });
  }

  extractMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // Gmailのメッセージコンテナを検索
      const messageSelectors = [
        'div[data-message-id]', // 個別メッセージ
        'div.adn.ads .gs', // スレッド内メッセージ
        'div[role="listitem"]', // メッセージリスト項目
      ];

      let messageElements: NodeListOf<Element> | null = null;

      for (const selector of messageSelectors) {
        messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) break;
      }

      if (messageElements) {
        messageElements.forEach((messageEl) => {
          const message = this.extractSingleMessage(messageEl);
          if (message) {
            messages.push(message);
          }
        });
      }

      // メッセージが見つからない場合、現在の画面のテキスト内容を取得
      if (messages.length === 0) {
        const bodyText = this.extractCurrentViewText();
        if (bodyText) {
          messages.push({
            author: 'Previous conversation',
            text: bodyText,
          });
        }
      }
    } catch (error) {
      console.error('Error extracting Gmail messages:', error);
    }

    return messages;
  }

  private extractSingleMessage(messageEl: Element): Message | null {
    try {
      // 送信者の名前を取得
      const authorSelectors = [
        '.gD[name]', // 送信者名属性
        '.go .gD', // 送信者エリア
        'span[email]', // メールアドレス
        '.yW span', // 名前スパン
      ];

      let author = 'Unknown';
      for (const selector of authorSelectors) {
        const authorEl = messageEl.querySelector(selector);
        if (authorEl) {
          author = authorEl.getAttribute('name') || 
                   authorEl.getAttribute('email') || 
                   authorEl.textContent?.trim() || 
                   'Unknown';
          break;
        }
      }

      // メッセージ本文を取得
      const textSelectors = [
        '.a3s.aiL', // メッセージ本文
        '.ii.gt div', // 内容div
        '.adn.ads .gs div', // スレッドメッセージ
        '.Am .adn div', // 展開されたメッセージ
      ];

      let text = '';
      for (const selector of textSelectors) {
        const textEl = messageEl.querySelector(selector);
        if (textEl) {
          text = (textEl as HTMLElement).innerText?.trim() || '';
          if (text) break;
        }
      }

      if (text && text.length > 0) {
        return { author, text };
      }
    } catch (error) {
      console.error('Error extracting single message:', error);
    }

    return null;
  }

  private extractCurrentViewText(): string {
    try {
      // 現在のビューからテキストを抽出
      const contentArea = document.querySelector('.nH .no .nU');
      if (contentArea) {
        return (contentArea as HTMLElement).innerText?.trim() || '';
      }
    } catch (error) {
      console.error('Error extracting current view text:', error);
    }
    return '';
  }

  insertReply(text: string): void {
    try {
      // 返信入力欄を探す
      const inputSelectors = [
        'div[aria-label*="メッセージ本文"]',
        'div[aria-label*="Message body"]',
        'div[contenteditable="true"]',
        'div[role="textbox"]',
      ];

      let inputElement: HTMLElement | null = null;

      for (const selector of inputSelectors) {
        inputElement = document.querySelector(selector);
        if (inputElement) break;
      }

      if (inputElement) {
        // 既存のテキストをクリア
        inputElement.innerHTML = '';
        
        // 新しいテキストを挿入
        inputElement.innerText = text;

        // フォーカスを設定
        inputElement.focus();

        // 入力イベントを発火
        const inputEvent = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        console.log('Reply text inserted successfully');
      } else {
        console.warn('Could not find reply input element');
      }
    } catch (error) {
      console.error('Error inserting reply:', error);
    }
  }

  isButtonInjected(): boolean {
    return !!document.getElementById(GmailStrategy.BUTTON_ID);
  }

  getThreadId(): string | null {
    try {
      // URLからスレッドIDを取得
      const urlMatch = window.location.href.match(/thread\/([a-f0-9]+)/);
      if (urlMatch) {
        return urlMatch[1];
      }

      // データ属性からスレッドIDを取得
      const threadElement = document.querySelector('[data-thread-id]');
      if (threadElement) {
        return threadElement.getAttribute('data-thread-id');
      }

      // フォールバック: URL全体をハッシュ化
      return btoa(window.location.pathname + window.location.search).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    } catch (error) {
      console.error('Error getting thread ID:', error);
      return null;
    }
  }

  static getButtonId(): string {
    return GmailStrategy.BUTTON_ID;
  }
}