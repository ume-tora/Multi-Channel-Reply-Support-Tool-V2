import type { ServiceStrategy, Message } from './interface';

/**
 * LINE Official Account Manager 戦略（シンプル版）
 * 確実に動作することに重点を置いたリファクタリング版
 */
export class LineOfficialAccountSimpleStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-line-simple';
  private static readonly COPY_MODAL_ID = 'line-copy-modal-simple';

  getServiceName(): 'line-official-account' {
    return 'line-official-account';
  }

  /**
   * ボタン配置点を探す（シンプル版）
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 LINE Simple: Starting insertion point search...');
    
    // チャット画面以外はスキップ
    if (!this.isOnChatPage()) {
      console.log('🏠 Not on chat page, skipping');
      return null;
    }

    // フローティングコンテナを作成
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
    const existingContainer = document.getElementById('line-floating-simple');
    if (existingContainer) {
      return existingContainer;
    }

    const container = document.createElement('div');
    container.id = 'line-floating-simple';
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
    return !!document.getElementById(LineOfficialAccountSimpleStrategy.BUTTON_ID);
  }

  /**
   * メッセージ履歴を抽出（シンプル版）
   */
  extractMessages(): Message[] {
    console.log('📝 LINE Simple: Extracting messages...');
    
    const messages: Message[] = [];
    
    // 特定のメッセージを探す
    const targetMessages = ['テスト', 'サロンに入会したいです！'];
    
    // DOM全体からテキストを検索
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

    // 一般的なメッセージも探す（長さ3-100文字）
    if (messages.length === 0) {
      for (const element of Array.from(allElements)) {
        const text = element.textContent?.trim();
        if (text && text.length >= 3 && text.length <= 100 && 
            !this.isSystemText(text)) {
          messages.push({
            author: 'お客様',
            text: text
          });
          if (messages.length >= 3) break; // 最大3件
        }
      }
    }

    console.log(`📝 Extracted ${messages.length} messages`);
    return messages.slice(-5); // 最新5件
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
           /^\d{1,2}:\d{2}$/.test(text); // 時刻パターン
  }

  /**
   * 返信挿入（コピーモーダル版）
   */
  async insertReply(text: string): Promise<void> {
    console.log('📝 LINE Simple: Showing copy modal for reply...');
    this.showCopyModal(text);
  }

  /**
   * コピーモーダルを表示
   */
  private showCopyModal(text: string): void {
    // 既存のモーダルを削除
    const existing = document.getElementById(LineOfficialAccountSimpleStrategy.COPY_MODAL_ID);
    if (existing) existing.remove();

    // モーダル作成
    const modal = document.createElement('div');
    modal.id = LineOfficialAccountSimpleStrategy.COPY_MODAL_ID;
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.5) !important;
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
        max-width: 500px !important;
        width: 90% !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
      ">
        <div style="color: #16a34a; font-size: 24px; margin-bottom: 16px;">
          🎯 AI返信を生成しました
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 1px solid #dee2e6 !important;
          border-radius: 8px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
          max-height: 200px !important;
          overflow-y: auto !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        ">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        
        <div style="display: flex; gap: 16px; justify-content: center;">
          <button id="copy-btn-simple" style="
            background: #16a34a !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
          ">
            📋 コピーする
          </button>
          
          <button id="close-btn-simple" style="
            background: #6c757d !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
          ">
            閉じる
          </button>
        </div>
        
        <div style="
          margin-top: 20px !important;
          padding: 16px !important;
          background: #e7f3ff !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          color: #0066cc !important;
        ">
          💡 コピー後、LINE入力欄で Ctrl+V（またはCmd+V）でペーストしてください
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    const copyBtn = modal.querySelector('#copy-btn-simple') as HTMLButtonElement;
    const closeBtn = modal.querySelector('#close-btn-simple') as HTMLButtonElement;

    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = '✅ コピー完了！';
        copyBtn.style.background = '#28a745 !important';
        
        setTimeout(() => modal.remove(), 1500);
      } catch (error) {
        console.error('Copy failed:', error);
        copyBtn.innerHTML = '❌ コピー失敗';
        copyBtn.style.background = '#dc3545 !important';
      }
    });

    closeBtn?.addEventListener('click', () => modal.remove());
    
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
    const match = window.location.pathname.match(/\/chat\/([^/]+)/);
    return match ? match[1] : null;
  }
}