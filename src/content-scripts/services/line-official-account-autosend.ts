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
      border: 2px solid #16a34a !important;
      border-radius: 12px !important;
      padding: 16px !important;
      box-shadow: 0 8px 24px rgba(0, 195, 0, 0.4) !important;
      min-width: 160px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    container.innerHTML = '<div style="color: #16a34a; font-size: 12px; margin-bottom: 8px; text-align: center;">LINE AI Assistant</div>';
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
    
    // LINEチャット画面の一般的なメッセージ構造を検索
    const messageSelectors = [
      // LINE Official Account Manager の一般的なセレクタ
      '[data-testid*="message"]',
      '[data-testid*="chat-message"]',
      '.chat-message',
      '.message-item',
      '.message-content',
      '.msg-content',
      // メッセージコンテナの一般的なクラス
      '.message-bubble',
      '.chat-bubble',
      '.conversation-message',
      '.line-message',
      // より汎用的なアプローチ
      '[role="group"] [role="textbox"]',
      '[data-qa*="message"]',
      '[aria-label*="message"]'
    ];
    
    // 各セレクタを試してメッセージを検索
    for (const selector of messageSelectors) {
      const messageElements = document.querySelectorAll(selector);
      console.log(`🔍 Trying selector "${selector}": found ${messageElements.length} elements`);
      
      if (messageElements.length > 0) {
        for (const element of Array.from(messageElements)) {
          const messageData = this.extractMessageFromElement(element);
          if (messageData) {
            messages.push(messageData);
          }
        }
        
        if (messages.length > 0) {
          console.log(`✅ Successfully extracted messages using selector: ${selector}`);
          break;
        }
      }
    }
    
    // フォールバック: より広範囲で検索
    if (messages.length === 0) {
      console.log('🔄 Fallback: Searching in all text elements...');
      messages.push(...this.fallbackMessageExtraction());
    }
    
    // 重複を除去し、最新の5件に制限
    const uniqueMessages = this.removeDuplicateMessages(messages);
    const latestMessages = uniqueMessages.slice(-5);
    
    console.log(`📝 Final extracted ${latestMessages.length} messages:`);
    latestMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.author}] ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}`);
    });
    
    return latestMessages;
  }
  
  /**
   * 要素からメッセージデータを抽出
   */
  private extractMessageFromElement(element: Element): Message | null {
    const text = element.textContent?.trim();
    
    if (!text || text.length < 2 || text.length > 500) {
      return null;
    }
    
    if (this.isSystemText(text)) {
      return null;
    }
    
    // メッセージの送信者を判定（LINEの一般的な構造から推測）
    const author = this.determineMessageAuthor(element);
    
    return {
      author,
      text
    };
  }
  
  /**
   * メッセージの送信者を判定
   */
  private determineMessageAuthor(element: Element): string {
    // 要素やその親要素のクラス・属性から送信者を判定
    const elementStr = element.outerHTML.toLowerCase();
    const parentStr = element.parentElement?.outerHTML.toLowerCase() || '';
    
    // 自分のメッセージを示すキーワード
    const selfIndicators = [
      'me', 'self', 'own', 'sent', 'outgoing', 'right',
      'agent', 'staff', 'admin', 'sender'
    ];
    
    // お客様のメッセージを示すキーワード
    const customerIndicators = [
      'other', 'customer', 'user', 'incoming', 'left',
      'guest', 'visitor', 'client'
    ];
    
    // クラス名や属性から判定
    for (const indicator of selfIndicators) {
      if (elementStr.includes(indicator) || parentStr.includes(indicator)) {
        return '自分';
      }
    }
    
    for (const indicator of customerIndicators) {
      if (elementStr.includes(indicator) || parentStr.includes(indicator)) {
        return 'お客様';
      }
    }
    
    // 位置による判定（右寄せ = 自分、左寄せ = お客様）
    const computedStyle = window.getComputedStyle(element);
    const textAlign = computedStyle.textAlign;
    const marginLeft = parseInt(computedStyle.marginLeft || '0');
    const marginRight = parseInt(computedStyle.marginRight || '0');
    
    if (textAlign === 'right' || marginLeft > marginRight) {
      return '自分';
    }
    
    // デフォルトはお客様として扱う
    return 'お客様';
  }
  
  /**
   * フォールバック: より広範囲でメッセージを検索
   */
  private fallbackMessageExtraction(): Message[] {
    console.log('🔄 Performing fallback message extraction...');
    
    const messages: Message[] = [];
    const allTextElements = document.querySelectorAll('div, span, p, td, li');
    
    for (const element of Array.from(allTextElements)) {
      const text = element.textContent?.trim();
      
      if (text && 
          text.length >= 3 && 
          text.length <= 200 && 
          !this.isSystemText(text) &&
          !this.isNavigationText(text)) {
        
        // 既に同じテキストが存在するかチェック
        if (!messages.some(msg => msg.text === text)) {
          messages.push({
            author: 'お客様',
            text: text
          });
        }
        
        // 最大10件まで
        if (messages.length >= 10) break;
      }
    }
    
    return messages;
  }
  
  /**
   * 重複メッセージを除去
   */
  private removeDuplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = `${msg.author}:${msg.text}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * ナビゲーション系のテキストかチェック
   */
  private isNavigationText(text: string): boolean {
    const navPhrases = [
      'ホーム', 'チャット', '設定', '通知', 'メニュー', 'ログアウト',
      'プロフィール', 'アカウント', 'ダッシュボード', '管理', '分析',
      'リッチメニュー', 'ボタン', 'カード', 'フレックス', 'クーポン'
    ];
    
    return navPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * システムテキストかチェック
   */
  private isSystemText(text: string): boolean {
    const systemPhrases = [
      'LINE', 'Official Account', 'スタンプ', '画像', 'ファイル', 
      '通話', '既読', 'ホーム', 'チャット', '設定', '検索',
      '送信', 'Enter', 'Shift', 'すべて', 'ヘルプ', 'ボタン',
      'メニュー', 'ログイン', 'ログアウト', 'リロード', '更新',
      'コピー', '貼り付け', '削除', '編集', '保存', 'キャンセル',
      '確認', '承認', '拒否', '戻る', '進む', '閉じる', '開く',
      'アップロード', 'ダウンロード', '印刷', '共有', 'エクスポート',
      'インポート', '同期', 'バックアップ', '復元', 'リセット'
    ];
    
    // 時刻パターン (HH:MM, H:MM)
    const timePattern = /^\d{1,2}:\d{2}$/;
    
    // 日付パターン (YYYY/MM/DD, MM/DD等)
    const datePattern = /^\d{1,4}[\/\-]\d{1,2}([\/\-]\d{1,4})?$/;
    
    // 数字のみ (ID等)
    const numbersOnly = /^\d+$/;
    
    // 非常に短いテキスト (単一文字、記号等)
    const tooShort = text.length <= 1;
    
    // HTMLタグが含まれている
    const hasHtmlTags = /<[^>]*>/.test(text);
    
    // URLパターン
    const urlPattern = /https?:\/\/|www\./;
    
    return systemPhrases.some(phrase => text.includes(phrase)) ||
           timePattern.test(text) ||
           datePattern.test(text) ||
           numbersOnly.test(text) ||
           tooShort ||
           hasHtmlTags ||
           urlPattern.test(text);
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
        <div style="color: #16a34a; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
          🎯 AI返信の確認と送信
        </div>
        
        <div style="color: #666; font-size: 14px; margin-bottom: 20px;">
          生成された返信を確認して、コピーボタンでクリップボードにコピーしてください
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 2px solid #16a34a !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
          max-height: 200px !important;
          overflow-y: auto !important;
        ">
          <div style="color: #16a34a; font-size: 12px; font-weight: bold; margin-bottom: 8px;">
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
          ⚠️ <strong>安全確認:</strong> 内容を確認してから「コピーする」ボタンを押してください。<br>
          コピー後は必ずLINE画面で手動貼り付けし、最終確認してから送信してください。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="copy-btn" style="
            background: #16a34a !important;
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
            📋 コピーする
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
          2. 「コピーする」ボタンをクリック<br>
          3. LINE画面の入力欄に手動で貼り付け<br>
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
    const copyBtn = modal.querySelector('#copy-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

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
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    const match = window.location.pathname.match(/\/chat\/([^\/]+)/);
    return match ? match[1] : null;
  }
}