/**
 * 🚨 緊急修正版: 超シンプルなGmail戦略
 * 確実に動作するフォールバック実装
 */

import type { ServiceStrategy, ServiceMessage } from '../interface';

export class GmailSimpleStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-gmail';
  private static readonly CONTAINER_ID = 'gmail-ai-container';

  getServiceName(): 'gmail' {
    return 'gmail';
  }

  /**
   * 超シンプルな挿入ポイント検索
   * 確実に動作する場所にボタンを配置
   */
  findInsertionPoint(): HTMLElement | null {
    console.log('🔍 Gmail Simple: Finding insertion point...');

    // 戦略1: 既存のコンテナがあれば再利用
    const existingContainer = document.getElementById(GmailSimpleStrategy.CONTAINER_ID);
    if (existingContainer) {
      console.log('✅ Gmail Simple: Using existing container');
      return existingContainer;
    }

    // 戦略2: body に固定配置のコンテナを作成
    const container = document.createElement('div');
    container.id = GmailSimpleStrategy.CONTAINER_ID;
    container.style.cssText = `
      position: fixed !important;
      top: 100px !important;
      right: 20px !important;
      z-index: 999999 !important;
      background: white !important;
      border: 2px solid #10B981 !important;
      border-radius: 8px !important;
      padding: 8px !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
      max-width: 200px !important;
    `;

    document.body.appendChild(container);
    console.log('✅ Gmail Simple: Created floating container');
    return container;
  }

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(GmailSimpleStrategy.BUTTON_ID);
  }

  /**
   * シンプルなメッセージ抽出
   */
  extractMessages(): ServiceMessage[] {
    console.log('📝 Gmail Simple: Extracting messages...');
    
    const messages: ServiceMessage[] = [];
    
    try {
      // シンプルな戦略: ページ全体のテキストを取得
      const bodyText = document.body.innerText;
      if (bodyText && bodyText.length > 50) {
        const truncatedText = bodyText.slice(-2000); // 最後の2000文字
        messages.push({
          author: 'Gmail会話',
          text: truncatedText
        });
        console.log('✅ Gmail Simple: Extracted page text');
      }
    } catch (error) {
      console.error('Gmail Simple: Error extracting messages:', error);
    }

    return messages;
  }

  /**
   * シンプルな返信挿入
   */
  insertReply(text: string): void {
    console.log('📝 Gmail Simple: Inserting reply...');
    
    // 戦略1: contenteditable要素を探す
    const editableElements = document.querySelectorAll('div[contenteditable="true"]');
    for (const element of editableElements) {
      if (element instanceof HTMLElement && this.isValidInputElement(element)) {
        element.textContent = text;
        element.focus();
        element.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ Gmail Simple: Reply inserted into contenteditable');
        return;
      }
    }

    // 戦略2: textarea要素を探す
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      if (this.isValidInputElement(textarea)) {
        textarea.value = text;
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ Gmail Simple: Reply inserted into textarea');
        return;
      }
    }

    // 戦略3: クリップボードにコピー
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('AI返信をクリップボードにコピーしました！\n\nCtrl+V で貼り付けてください。');
        console.log('✅ Gmail Simple: Reply copied to clipboard');
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  /**
   * フォールバック用のクリップボードコピー
   */
  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('AI返信をクリップボードにコピーしました！\n\nCtrl+V で貼り付けてください。');
    console.log('✅ Gmail Simple: Reply copied via fallback method');
  }

  /**
   * 有効な入力要素かチェック
   */
  private isValidInputElement(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 100 && rect.height > 20 && element.offsetParent !== null;
  }

  /**
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    try {
      const url = window.location.href;
      const match = url.match(/[#\/]([a-zA-Z0-9]+)$/);
      return match ? `gmail_${match[1]}` : 'gmail_default';
    } catch {
      return 'gmail_default';
    }
  }
}