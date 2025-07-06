import type { ServiceStrategy, Message } from './interface';

export class GmailStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-gmail';

  getServiceName(): 'gmail' {
    return 'gmail';
  }

  findInsertionPoint(): HTMLElement | null {
    try {
      // DOM読み込み完了を待機
      if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
        console.log('Gmail: DOM not ready, deferring insertion point detection');
        return null;
      }

      // 最新のGmail UI（2024-2025版）に対応したセレクター戦略
      const currentView = this.detectGmailView();

      // ポップアップ表示の場合の特別な処理
      if (this.isPopupView()) {
        const popupToolbar = this.findPopupToolbar();
        if (popupToolbar) {
          return popupToolbar;
        } else {
          // Silent fallback to reduce console noise
          // フォールバック: ポップアップ内で適切な要素を作成
          const fallbackContainer = this.createPopupFallbackContainer();
          if (fallbackContainer) {
            return fallbackContainer;
          }
        }
      }

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

      // 6. 最後の手段: 強制的にボタン配置エリアを作成
      console.warn('Gmail: No insertion point found, attempting forced placement');
      const forcedContainer = this.createForcedButtonContainer();
      if (forcedContainer) {
        return forcedContainer;
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
    console.log('=== Gmail DOM State Analysis ===');
    
    // ポップアップ検出状態
    console.log(`Gmail: Popup detected: ${this.isPopupView()}`);
    
    // 基本的なGmail要素の存在確認
    const gmailElements = [
      'div[role="toolbar"]',
      'div[aria-label*="Reply"]',
      'div[aria-label*="返信"]',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      'div[role="dialog"]',
      'div[aria-modal="true"]',
      'div.nH.aHU',
    ];
    
    gmailElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Gmail: Found ${elements.length} elements matching "${selector}"`);
      if (elements.length > 0) {
        elements.forEach((el, idx) => {
          const style = window.getComputedStyle(el);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          console.log(`  Element ${idx}: visible=${isVisible}, class="${el.className}", id="${el.id}"`);
        });
      }
    });
    
    // URLも確認
    console.log(`Gmail: Current URL: ${window.location.href}`);
    console.log(`Gmail: Current Hash: ${window.location.hash}`);
    
    // 全てのツールバーを確認
    const allToolbars = document.querySelectorAll('div[role="toolbar"]');
    console.log(`Gmail: Found ${allToolbars.length} toolbar elements`);
    allToolbars.forEach((toolbar, index) => {
      const element = toolbar as HTMLElement;
      const isValid = this.isValidToolbar(element);
      const parentClass = element.parentElement?.className || 'no-parent';
      console.log(`Gmail: Toolbar ${index}: valid=${isValid}, parent="${parentClass}", text="${element.textContent?.substring(0, 50)}"`);
    });

    // ポップアップ特有の要素を詳細チェック
    if (this.isPopupView()) {
      console.log('=== Popup Specific Analysis ===');
      const popupContainers = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div.nH.aHU');
      popupContainers.forEach((container, idx) => {
        console.log(`Popup Container ${idx}: class="${container.className}"`);
        
        // 内部のツールバーをチェック
        const internalToolbars = container.querySelectorAll('div[role="toolbar"]');
        console.log(`  Internal toolbars: ${internalToolbars.length}`);
        internalToolbars.forEach((tb, tbIdx) => {
          console.log(`    Toolbar ${tbIdx}: class="${tb.className}"`);
          const tbButtons = tb.querySelectorAll('button, div[role="button"]');
          console.log(`      Buttons in toolbar: ${tbButtons.length}`);
          tbButtons.forEach((btn, btnIdx) => {
            console.log(`        Button ${btnIdx}: "${btn.getAttribute('aria-label') || btn.textContent?.substring(0, 20)}", tag="${btn.tagName}"`);
          });
        });
        
        // 送信ボタンをチェック
        const sendButtons = container.querySelectorAll('button[aria-label*="送信"], button[aria-label*="Send"]');
        console.log(`  Send buttons: ${sendButtons.length}`);
        sendButtons.forEach((btn, btnIdx) => {
          console.log(`    Send button ${btnIdx}: "${btn.getAttribute('aria-label')}"`);
          console.log(`      Parent: "${btn.parentElement?.className}"`);
          console.log(`      Parent tag: "${btn.parentElement?.tagName}"`);
          
          // 送信ボタンの兄弟要素をチェック
          const siblings = btn.parentElement?.children;
          if (siblings) {
            console.log(`      Siblings: ${siblings.length}`);
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              console.log(`        Sibling ${i}: tag="${sibling.tagName}", class="${sibling.className}", text="${sibling.textContent?.substring(0, 15)}"`);
            }
          }
        });

        // 編集可能な要素をチェック
        const editableElements = container.querySelectorAll('div[contenteditable="true"]');
        console.log(`  Editable elements: ${editableElements.length}`);
      });
    }
    
    console.log('=== End DOM Analysis ===');
  }

  extractMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // ポップアップ表示の場合の特別処理
      if (this.isPopupView()) {
        console.log('Gmail: Extracting messages from popup view');
        const popupMessages = this.extractPopupMessages();
        if (popupMessages.length > 0) {
          return popupMessages;
        }
      }

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

  /**
   * ポップアップ表示からメッセージを抽出
   */
  private extractPopupMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // ポップアップ内の会話履歴を検索
      const popupSelectors = [
        'div[role="dialog"] div[data-message-id]',
        'div[aria-modal="true"] div[data-message-id]',
        'div.nH.aHU div[data-message-id]',
        'div[role="dialog"] .ii.gt',
        'div[aria-modal="true"] .ii.gt',
        'div.nH.aHU .ii.gt',
      ];

      for (const selector of popupSelectors) {
        const messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) {
          console.log(`Gmail: Found ${messageElements.length} popup messages with selector: ${selector}`);
          
          messageElements.forEach((messageEl) => {
            const message = this.extractSingleMessage(messageEl);
            if (message) {
              messages.push(message);
            }
          });
          
          if (messages.length > 0) {
            break;
          }
        }
      }

      // ポップアップ表示では、元のメッセージがポップアップ外にある場合がある
      if (messages.length === 0) {
        console.log('Gmail: Searching for messages outside popup');
        const externalMessages = this.extractExternalMessages();
        messages.push(...externalMessages);
      }

    } catch (error) {
      console.error('Error extracting popup messages:', error);
    }

    return messages;
  }

  /**
   * ポップアップ外の元メッセージを抽出
   */
  private extractExternalMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // メインページの会話履歴を検索（ポップアップが開いていても見える部分）
      const mainSelectors = [
        'div[data-message-id]:not([role="dialog"] div[data-message-id])',
        '.ii.gt:not([role="dialog"] .ii.gt)',
        '.adn.ads .gs:not([role="dialog"] .adn.ads .gs)',
      ];

      for (const selector of mainSelectors) {
        const messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) {
          console.log(`Gmail: Found ${messageElements.length} external messages with selector: ${selector}`);
          
          messageElements.forEach((messageEl) => {
            const message = this.extractSingleMessage(messageEl);
            if (message) {
              messages.push(message);
            }
          });
          
          if (messages.length > 0) {
            break;
          }
        }
      }

      // 最後の手段：ページ全体から会話の文脈を抽出
      if (messages.length === 0) {
        const subjectElement = document.querySelector('[data-thread-id] span[id^="thread"]') ||
                              document.querySelector('h2[data-thread-id]') ||
                              document.querySelector('.hP'); // 件名

        if (subjectElement) {
          const subject = subjectElement.textContent?.trim() || '';
          if (subject) {
            messages.push({
              author: 'Subject',
              text: subject,
            });
          }
        }
      }

    } catch (error) {
      console.error('Error extracting external messages:', error);
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
      let inputElement: HTMLElement | null = null;

      // ポップアップ表示の場合の特別処理
      if (this.isPopupView()) {
        console.log('Gmail: Inserting reply in popup view');
        inputElement = this.findPopupInputElement();
      }

      // 通常の返信入力欄を探す
      if (!inputElement) {
        const inputSelectors = [
          'div[aria-label*="メッセージ本文"]',
          'div[aria-label*="Message body"]',
          'div[contenteditable="true"]',
          'div[role="textbox"]',
        ];

        for (const selector of inputSelectors) {
          inputElement = document.querySelector(selector);
          if (inputElement) break;
        }
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

  /**
   * ポップアップ表示での入力要素を検索
   */
  private findPopupInputElement(): HTMLElement | null {
    const popupInputSelectors = [
      'div[role="dialog"] div[aria-label*="メッセージ本文"]',
      'div[role="dialog"] div[aria-label*="Message body"]',
      'div[role="dialog"] div[contenteditable="true"]',
      'div[role="dialog"] div[role="textbox"]',
      'div[aria-modal="true"] div[aria-label*="メッセージ本文"]',
      'div[aria-modal="true"] div[aria-label*="Message body"]',
      'div[aria-modal="true"] div[contenteditable="true"]',
      'div[aria-modal="true"] div[role="textbox"]',
      'div.nH.aHU div[aria-label*="メッセージ本文"]',
      'div.nH.aHU div[aria-label*="Message body"]',
      'div.nH.aHU div[contenteditable="true"]',
      'div.nH.aHU div[role="textbox"]',
    ];

    for (const selector of popupInputSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log(`Gmail: Found popup input with selector: ${selector}`);
        return element;
      }
    }

    console.log('Gmail: No popup input element found');
    return null;
  }

  isButtonInjected(): boolean {
    const button = document.getElementById(GmailStrategy.BUTTON_ID);
    if (!button) {
      return false;
    }

    // ポップアップ表示の場合、ボタンがポップアップ内にあるかチェック
    if (this.isPopupView()) {
      const popupContainers = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div.nH.aHU');
      for (const container of popupContainers) {
        if (container.contains(button)) {
          return true;
        }
      }
      // ポップアップ表示なのにボタンがポップアップ外にある場合は再注入が必要
      return false;
    }

    // 通常表示の場合、ボタンが存在すればOK
    return true;
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

  /**
   * ポップアップ表示かどうかを判定
   */
  private isPopupView(): boolean {
    console.log('Gmail: Checking for popup view...');
    
    // ポップアップ表示の特徴的なDOM要素をチェック
    const popupIndicators = [
      // ポップアップ作成ウィンドウの特徴的なクラス
      'div[role="dialog"]',
      'div.nH.aHU', // Gmail のポップアップ作成ウィンドウ
      'div[aria-modal="true"]',
      // より具体的なGmailポップアップセレクター
      'div[jsname][role="dialog"]',
      'div[data-is-compose="true"]',
      // タイトルバーの存在（Re: TEST など）
      'div[aria-label*="Re:"]',
      'div[aria-label*="Fw:"]',
      'div[aria-label*="返信:"]',
      'div[aria-label*="転送:"]',
    ];

    let foundPopup = false;
    for (const selector of popupIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        // ポップアップが現在表示されているかチェック
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0';
        
        if (isVisible) {
          console.log(`Gmail: Popup indicator found: ${selector}`);
          foundPopup = true;
          break;
        }
      }
    }

    // URL パラメータをチェック（compose view）
    const url = window.location.href;
    const hash = window.location.hash;
    const urlHasCompose = url.includes('compose') || hash.includes('compose');
    
    if (urlHasCompose) {
      console.log('Gmail: Compose URL detected');
      foundPopup = true;
    }

    // DOM構造をより詳細にチェック
    if (!foundPopup) {
      // より広範囲でポップアップを検索
      const allDialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]');
      for (const dialog of allDialogs) {
        const hasComposeElements = dialog.querySelector('div[contenteditable="true"]') ||
                                  dialog.querySelector('button[aria-label*="送信"]') ||
                                  dialog.querySelector('button[aria-label*="Send"]');
        if (hasComposeElements) {
          console.log('Gmail: Found compose dialog via content detection');
          foundPopup = true;
          break;
        }
      }
    }

    console.log(`Gmail: Popup view detected: ${foundPopup}`);
    return foundPopup;
  }

  /**
   * ポップアップ表示用のツールバーを探す（画面内配置を保証）
   */
  private findPopupToolbar(): HTMLElement | null {
    console.log('Gmail: Searching for popup toolbar...');

    // ポップアップ表示特有のセレクター
    const popupToolbarSelectors = [
      // ポップアップダイアログ内のツールバー
      'div[role="dialog"] div[role="toolbar"]',
      'div[aria-modal="true"] div[role="toolbar"]',
      'div.nH.aHU div[role="toolbar"]',
      'div[jsname][role="dialog"] div[role="toolbar"]',
      
      // より具体的なGmailポップアップ構造
      'div.nH.aHU div.aoT div[role="toolbar"]',
      'div.nH.aHU div.Am div[role="toolbar"]',
      'div.nH.aHU div.AD',
      'div.nH.aHU div.aYF', // Gmail compose toolbar
      
      // ポップアップ内のフォーマットツールバー
      'div[role="dialog"] div[aria-label*="フォーマット"]',
      'div[role="dialog"] div[aria-label*="Format"]',
      'div[aria-modal="true"] div[aria-label*="フォーマット"]',
      'div[aria-modal="true"] div[aria-label*="Format"]',
    ];

    for (const selector of popupToolbarSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Gmail: Found popup element with selector: ${selector}`);
        
        // ツールバーを見つけるか、送信ボタンの親要素を使用
        let toolbar: HTMLElement | null = null;
        
        if (element.getAttribute('role') === 'toolbar') {
          toolbar = element as HTMLElement;
        } else {
          // 送信ボタンの場合、その親要素のツールバーを探す
          toolbar = element.closest('div[role="toolbar"]') as HTMLElement;
          if (!toolbar) {
            // ツールバーが見つからない場合、送信ボタンの親要素を使用
            toolbar = element.parentElement as HTMLElement;
          }
        }

        if (toolbar && this.isValidToolbar(toolbar)) {
          console.log('Gmail: Found valid popup toolbar');
          // 画面内配置を保証するためのコンテナを返す
          return this.createScreenSafeContainer(toolbar);
        }
      }
    }

    // フォールバック：ポップアップ内の任意のツールバー
    const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div.nH.aHU');
    for (const dialog of dialogs) {
      const toolbar = dialog.querySelector('div[role="toolbar"]');
      if (toolbar && this.isValidToolbar(toolbar as HTMLElement)) {
        console.log('Gmail: Found popup toolbar via dialog fallback');
        return this.createScreenSafeContainer(toolbar as HTMLElement);
      }
    }

    console.log('Gmail: No popup toolbar found');
    return null;
  }

  /**
   * 画面内配置を保証するコンテナを作成
   */
  private createScreenSafeContainer(toolbar: HTMLElement): HTMLElement {
    console.log('Gmail: Creating screen-safe container for popup');
    
    // 送信ボタンを探す
    const sendButton = toolbar.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]') ||
                      toolbar.parentElement?.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]');
    
    if (sendButton) {
      console.log('Gmail: Found send button, creating container before it');
      
      // 送信ボタンの直前に専用コンテナを作成
      const container = document.createElement('div');
      container.style.cssText = `
        display: inline-flex !important;
        align-items: center !important;
        margin-right: 8px !important;
        position: relative !important;
        z-index: 10000 !important;
        flex-shrink: 0 !important;
      `;
      
      // 送信ボタンの前に挿入
      sendButton.parentElement?.insertBefore(container, sendButton);
      return container;
    }
    
    // 送信ボタンが見つからない場合、ツールバーの最初に配置
    console.log('Gmail: No send button found, creating container at toolbar start');
    
    const container = document.createElement('div');
    container.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      margin-right: 8px !important;
      position: relative !important;
      z-index: 10000 !important;
      flex-shrink: 0 !important;
    `;
    
    // ツールバーの最初に挿入
    toolbar.insertBefore(container, toolbar.firstChild);
    return container;
  }

  /**
   * ポップアップ表示でツールバーが見つからない場合のフォールバック
   */
  private createPopupFallbackContainer(): HTMLElement | null {
    console.log('Gmail: Creating popup fallback container');

    try {
      // ポップアップ内の送信ボタンを探す
      const sendButtonSelectors = [
        'div[role="dialog"] button[aria-label*="送信"]',
        'div[role="dialog"] button[aria-label*="Send"]',
        'div[aria-modal="true"] button[aria-label*="送信"]',
        'div[aria-modal="true"] button[aria-label*="Send"]',
        'div.nH.aHU button[aria-label*="送信"]',
        'div.nH.aHU button[aria-label*="Send"]',
        'div[role="dialog"] div[role="button"][aria-label*="送信"]',
        'div[role="dialog"] div[role="button"][aria-label*="Send"]',
      ];

      for (const selector of sendButtonSelectors) {
        const sendButton = document.querySelector(selector);
        if (sendButton) {
          console.log(`Gmail: Found send button for fallback: ${selector}`);
          
          // 送信ボタンの親要素を取得
          const parentContainer = sendButton.parentElement;
          if (parentContainer) {
            console.log('Gmail: Using send button parent as fallback container');
            
            // 送信ボタンの前に専用コンテナを作成
            const container = document.createElement('div');
            container.style.cssText = `
              display: inline-flex !important;
              align-items: center !important;
              margin-right: 8px !important;
              position: relative !important;
              z-index: 10000 !important;
              flex-shrink: 0 !important;
            `;
            
            // 送信ボタンの前に挿入
            parentContainer.insertBefore(container, sendButton);
            return container;
          }
        }
      }

      // 最後の手段：ポップアップ内のフォーム要素を探す
      const formSelectors = [
        'div[role="dialog"] form',
        'div[aria-modal="true"] form',
        'div.nH.aHU form',
        'div[role="dialog"] div[class*="form"]',
        'div[aria-modal="true"] div[class*="form"]',
      ];

      for (const selector of formSelectors) {
        const formElement = document.querySelector(selector);
        if (formElement) {
          console.log(`Gmail: Found form element for fallback: ${selector}`);
          return formElement as HTMLElement;
        }
      }

      console.warn('Gmail: No fallback container found');
      return null;

    } catch (error) {
      console.error('Gmail: Error creating fallback container:', error);
      return null;
    }
  }

  /**
   * 最後の手段: 強制的にボタン配置エリアを作成
   */
  private createForcedButtonContainer(): HTMLElement | null {
    console.log('Gmail: Creating forced button container...');

    try {
      // 1. ポップアップ表示の場合
      if (this.isPopupView()) {
        return this.createForcedPopupContainer();
      }

      // 2. 通常表示の場合
      return this.createForcedInlineContainer();

    } catch (error) {
      console.error('Gmail: Error creating forced container:', error);
      return null;
    }
  }

  /**
   * ポップアップ表示用の強制コンテナ作成
   */
  private createForcedPopupContainer(): HTMLElement | null {
    console.log('Gmail: Creating forced popup container...');

    // 戦略1: 送信ボタンの左側（ツールバー内）に配置
    const toolbarContainer = this.createPopupToolbarContainer();
    if (toolbarContainer) {
      return toolbarContainer;
    }

    // 戦略2: 送信ボタンの直前に配置（従来の方法）
    const beforeSendContainer = this.createBeforeSendButtonContainer();
    if (beforeSendContainer) {
      return beforeSendContainer;
    }

    // 戦略3: 編集エリアの下に配置
    return this.createBelowEditorContainer();
  }

  /**
   * 送信ボタンのツールバー内に配置（推奨方法）
   */
  private createPopupToolbarContainer(): HTMLElement | null {
    console.log('Gmail: Attempting precise toolbar integration...');

    const sendButtonSelectors = [
      'button[aria-label*="送信"]',
      'button[aria-label*="Send"]',
      'div[role="button"][aria-label*="送信"]',
      'div[role="button"][aria-label*="Send"]',
    ];

    for (const selector of sendButtonSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && this.isElementInPopup(sendButton)) {
        console.log(`Gmail: Found send button for precise integration: ${selector}`);
        console.log(`Send button parent classes: ${sendButton.parentElement?.className}`);
        
        // 戦略1: 送信ボタンの左側（理想位置）に配置
        console.log('Gmail: Attempting left-side placement strategy');
        const leftSideContainer = this.createLeftSideContainer(sendButton);
        if (leftSideContainer) {
          return leftSideContainer;
        }
        
        // 戦略2: より具体的なツールバー検索
        const specificToolbar = this.findSpecificGmailToolbar(sendButton);
        if (specificToolbar) {
          console.log('Gmail: Found specific Gmail toolbar');
          
          // ツールバー内の適切な位置を特定
          const insertionPoint = this.findOptimalInsertionPoint(specificToolbar, sendButton);
          
          const aiContainer = document.createElement('div');
          aiContainer.style.cssText = `
            display: inline-flex;
            align-items: center;
            margin: 0 4px;
          `;
          
          if (insertionPoint) {
            specificToolbar.insertBefore(aiContainer, insertionPoint);
          } else {
            // 送信ボタンの前に挿入
            const sendButtonInToolbar = specificToolbar.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]');
            if (sendButtonInToolbar) {
              specificToolbar.insertBefore(aiContainer, sendButtonInToolbar);
            } else {
              specificToolbar.appendChild(aiContainer);
            }
          }
          
          console.log('Gmail: AI container placed in specific toolbar');
          return aiContainer;
        }
      }
    }

    return null;
  }

  /**
   * 送信ボタンの左側に安全に配置
   */
  private createLeftSideContainer(sendButton: Element): HTMLElement | null {
    console.log('Gmail: Creating left-side container for safe positioning');

    // 送信ボタンの親ツールバーを探す
    let toolbar = sendButton.closest('[role="toolbar"]');
    if (!toolbar) {
      // role="toolbar"がない場合、親要素を確認
      toolbar = sendButton.parentElement;
    }

    if (!toolbar) {
      console.log('Gmail: No toolbar found for left-side placement');
      return null;
    }

    console.log(`Gmail: Found toolbar for left-side placement: ${toolbar.className}`);

    // ツールバー内の全ボタンを取得
    const allButtons = Array.from(toolbar.querySelectorAll('button, div[role="button"]'));
    const sendButtonIndex = allButtons.findIndex(btn => 
      btn === sendButton || btn.contains(sendButton)
    );

    console.log(`Gmail: Send button index in toolbar: ${sendButtonIndex} / ${allButtons.length}`);

    if (sendButtonIndex <= 0) {
      console.log('Gmail: Send button is first or not found, using alternative placement');
      return this.createAlternativeContainer(sendButton);
    }

    // 送信ボタンの直前のボタンを特定
    const previousButton = allButtons[sendButtonIndex - 1];
    console.log(`Gmail: Previous button found: ${previousButton.tagName}.${previousButton.className}`);

    // 前のボタンの後ろに配置
    const aiContainer = document.createElement('div');
    aiContainer.style.cssText = `
      display: inline-flex !important;
      align-items: center;
      margin: 0 6px;
      flex-shrink: 0;
    `;

    // 前のボタンの後に挿入
    previousButton.parentElement?.insertBefore(aiContainer, previousButton.nextSibling);
    console.log('Gmail: AI container placed after previous button');
    return aiContainer;
  }

  /**
   * 代替配置戦略（編集エリア上部）
   */
  private createAlternativeContainer(sendButton: Element): HTMLElement | null {
    console.log('Gmail: Creating alternative container above editor');

    // 編集可能エリアを探す
    const editableElements = document.querySelectorAll('div[contenteditable="true"]');
    
    for (const editable of editableElements) {
      if (this.isElementInPopup(editable)) {
        console.log('Gmail: Found editable area in popup');
        
        // 編集エリアの上に配置バーを作成
        const headerContainer = document.createElement('div');
        headerContainer.style.cssText = `
          display: flex !important;
          justify-content: flex-end;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #e8eaed;
          background: #f8f9fa;
          margin-bottom: 4px;
        `;

        // 編集エリアの直前に挿入
        editable.parentElement?.insertBefore(headerContainer, editable);
        console.log('Gmail: Alternative container created above editor');
        return headerContainer;
      }
    }

    // 最後の手段: 固定位置に配置
    return this.createFixedPositionContainer();
  }

  /**
   * 固定位置コンテナ（最終手段）
   */
  private createFixedPositionContainer(): HTMLElement | null {
    console.log('Gmail: Creating fixed position container as last resort');

    const fixedContainer = document.createElement('div');
    fixedContainer.style.cssText = `
      position: fixed !important;
      top: 80px;
      right: 20px;
      z-index: 10000 !important;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(fixedContainer);
    console.log('Gmail: Fixed position container created');
    return fixedContainer;
  }

  /**
   * より具体的なGmailツールバーを検索
   */
  private findSpecificGmailToolbar(sendButton: Element): HTMLElement | null {
    // 送信ボタンから上位に向かってツールバーを探す
    let current = sendButton.parentElement;
    let depth = 0;
    const maxDepth = 5;
    
    while (current && depth < maxDepth) {
      // role="toolbar"を持つ要素
      if (current.getAttribute('role') === 'toolbar') {
        console.log(`Found toolbar at depth ${depth}: ${current.className}`);
        return current as HTMLElement;
      }
      
      // Gmail特有のツールバークラスを持つ要素
      if (current.className && (
        current.className.includes('btC') || // Gmail toolbar class
        current.className.includes('aOy') || // Another Gmail toolbar class
        current.className.includes('ams')    // Yet another Gmail class
      )) {
        console.log(`Found Gmail-specific toolbar at depth ${depth}: ${current.className}`);
        return current as HTMLElement;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  /**
   * ツールバー内の最適な挿入位置を特定
   */
  private findOptimalInsertionPoint(toolbar: HTMLElement, sendButton: Element): Element | null {
    const allButtons = toolbar.querySelectorAll('button, div[role="button"]');
    let sendButtonIndex = -1;
    
    // 送信ボタンのインデックスを特定
    for (let i = 0; i < allButtons.length; i++) {
      if (allButtons[i] === sendButton || allButtons[i].contains(sendButton)) {
        sendButtonIndex = i;
        break;
      }
    }
    
    if (sendButtonIndex > 0) {
      // 送信ボタンの前のボタンの後に挿入
      const previousButton = allButtons[sendButtonIndex - 1];
      return previousButton.nextElementSibling;
    } else if (sendButtonIndex === 0) {
      // 送信ボタンが最初の場合、その前に挿入
      return sendButton;
    }
    
    return null;
  }

  /**
   * ツールバースタイルのAIボタンを作成
   */
  private createToolbarStyleButton(): HTMLElement {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      margin: 0 4px;
      cursor: pointer;
    `;
    
    return buttonContainer;
  }

  /**
   * 送信ボタンの直前に配置（フォールバック）
   */
  private createBeforeSendButtonContainer(): HTMLElement | null {
    console.log('Gmail: Attempting before-send-button placement...');

    const sendButtonSelectors = [
      'button[aria-label*="送信"]',
      'button[aria-label*="Send"]',
      'div[role="button"][aria-label*="送信"]',
      'div[role="button"][aria-label*="Send"]',
    ];

    for (const selector of sendButtonSelectors) {
      const sendButton = document.querySelector(selector);
      if (sendButton && this.isElementInPopup(sendButton)) {
        console.log(`Gmail: Found send button for before-placement: ${selector}`);
        
        // 送信ボタンの直前に配置エリアを作成
        const container = document.createElement('div');
        container.style.cssText = `
          display: inline-flex;
          align-items: center;
          margin-right: 8px;
        `;
        
        // 送信ボタンの前に挿入
        sendButton.parentElement?.insertBefore(container, sendButton);
        console.log('Gmail: Created container before send button');
        return container;
      }
    }

    return null;
  }

  /**
   * 編集エリアの下に配置（最終フォールバック）
   */
  private createBelowEditorContainer(): HTMLElement | null {
    console.log('Gmail: Attempting below-editor placement...');

    // 送信ボタンが見つからない場合、編集可能エリアの近くに配置
    const editableSelectors = [
      'div[contenteditable="true"]',
      'div[role="textbox"]',
    ];

    for (const selector of editableSelectors) {
      const editableElement = document.querySelector(selector);
      if (editableElement && this.isElementInPopup(editableElement)) {
        console.log(`Gmail: Found editable element for below-placement: ${selector}`);
        
        // 編集エリアの下に配置エリアを作成
        const container = document.createElement('div');
        container.style.cssText = `
          display: flex;
          justify-content: flex-end;
          padding: 8px;
          border-top: 1px solid #e0e0e0;
          margin-top: 8px;
        `;
        
        // 編集エリアの親要素の後に挿入
        const parentElement = editableElement.parentElement;
        if (parentElement) {
          parentElement.insertAdjacentElement('afterend', container);
          console.log('Gmail: Created container below editable area');
          return container;
        }
      }
    }

    console.log('Gmail: Failed to create below-editor container');
    return null;
  }

  /**
   * インライン表示用の強制コンテナ作成
   */
  private createForcedInlineContainer(): HTMLElement | null {
    console.log('Gmail: Creating forced inline container...');

    // 編集可能エリアを探す
    const editableElement = document.querySelector('div[contenteditable="true"]');
    if (editableElement) {
      // 編集エリアの近くに配置
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        justify-content: flex-end;
        padding: 8px;
        margin-top: 8px;
      `;
      
      editableElement.parentElement?.appendChild(container);
      console.log('Gmail: Created forced inline container');
      return container;
    }

    return null;
  }

  /**
   * 要素がポップアップ内にあるかチェック
   */
  private isElementInPopup(element: Element): boolean {
    const popupContainers = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div.nH.aHU');
    for (const container of popupContainers) {
      if (container.contains(element)) {
        return true;
      }
    }
    return false;
  }
}