import type { ServiceStrategy } from '../services/interface';
import { ButtonFactory } from '../../shared/ui/ButtonFactory';
import { GeminiService } from '../../services/geminiService';

export class UIInjector {
  private buttonElements: Map<string, HTMLElement> = new Map();

  injectReplyButton(
    insertionPoint: HTMLElement,
    strategy: ServiceStrategy
  ): void {
    const buttonId = this.getButtonId(strategy.getServiceName());
    
    // 既にボタンが注入されている場合はスキップ
    if (document.getElementById(buttonId)) {
      return;
    }

    try {
      // ボタン用のコンテナを作成
      const container = document.createElement('div');
      container.id = buttonId;
      container.className = 'gemini-reply-button-container';
      
      // CSS スタイルを設定
      container.style.cssText = `
        display: inline-flex;
        margin-left: 8px;
        z-index: 1000;
        position: relative;
      `;

      // AIボタンを作成
      const button = this.createReplyButton(strategy);
      container.appendChild(button);

      // 挿入位置を決定 - より柔軟な挿入戦略
      const insertionStrategies = [
        // 戦略1: 最初の子要素の後に挿入
        () => {
          if (insertionPoint.children.length > 0) {
            insertionPoint.insertBefore(container, insertionPoint.children[0].nextSibling);
            return true;
          }
          return false;
        },
        // 戦略2: 送信ボタンの前に挿入
        () => {
          const sendButton = insertionPoint.querySelector('button[type="submit"], button[title*="送信"], button[title*="Send"]');
          if (sendButton) {
            insertionPoint.insertBefore(container, sendButton);
            return true;
          }
          return false;
        },
        // 戦略3: 最後の子要素の前に挿入
        () => {
          if (insertionPoint.children.length > 0) {
            insertionPoint.insertBefore(container, insertionPoint.lastElementChild);
            return true;
          }
          return false;
        },
        // 戦略4: 末尾に追加
        () => {
          insertionPoint.appendChild(container);
          return true;
        },
      ];

      // 挿入戦略を順番に試行
      let inserted = false;
      for (const strategy of insertionStrategies) {
        try {
          if (strategy()) {
            inserted = true;
            break;
          }
        } catch (error) {
          console.warn('Insertion strategy failed:', error);
          continue;
        }
      }

      if (!inserted) {
        console.warn('All insertion strategies failed, using fallback');
        insertionPoint.appendChild(container);
      }

      // ボタン要素を保存
      this.buttonElements.set(buttonId, container);

      console.log(`AI Reply button injected for ${strategy.getServiceName()}`);
    } catch (error) {
      console.error('Failed to inject reply button:', error);
    }
  }

  private createReplyButton(strategy: ServiceStrategy): HTMLElement {
    return ButtonFactory.createServiceButton(
      strategy.getServiceName(),
      () => this.handleReplyButtonClick(strategy),
      {
        className: 'gemini-reply-btn',
        title: 'AI返信案を生成',
        text: 'AI返信'
      }
    );
  }

  private async handleReplyButtonClick(strategy: ServiceStrategy): Promise<void> {
    try {
      // ローディング状態を表示
      const button = document.querySelector('.gemini-reply-btn') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.innerHTML = `
          <span style="font-size: 14px;">⏳</span>
          <span>生成中...</span>
        `;
      }

      // メッセージを抽出
      const messages = strategy.extractMessages();
      
      if (messages.length === 0) {
        alert('メッセージを取得できませんでした。ページを更新してお試しください。');
        this.resetButton();
        return;
      }

      // Gemini APIを呼び出す
      const reply = await this.generateReply(messages);
      
      if (reply) {
        // モーダルを表示
        this.showReplyModal(reply, strategy);
      }
    } catch (error) {
      console.error('Failed to generate reply:', error);
      alert('AI返信の生成に失敗しました。設定を確認してください。');
    } finally {
      this.resetButton();
    }
  }

  private async generateReply(messages: Array<{ author: string; text: string }>): Promise<string | null> {
    // Chrome storage からAPI キーを取得
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    
    if (!apiKey) {
      alert('GeminiのAPIキーが設定されていません。拡張機能のポップアップから設定してください。');
      return null;
    }

    // 中央化されたGeminiServiceを使用
    return await GeminiService.generateContextualReply(messages, { apiKey });
  }

  private showReplyModal(reply: string, strategy: ServiceStrategy): void {
    const modal = this.createModal(reply, strategy);
    document.body.appendChild(modal);

    // モーダルを表示
    modal.style.display = 'flex';
    
    // ESCキーでモーダルを閉じる
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeModal(modal);
        document.removeEventListener('keydown', handleEscKey);
      }
    };
    document.addEventListener('keydown', handleEscKey);
  }

  private createModal(reply: string, strategy: ServiceStrategy): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'gemini-modal-backdrop';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const content = document.createElement('div');
    content.className = 'gemini-modal-content';
    content.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 600px;
      width: 90vw;
      max-height: 90vh;
      overflow: auto;
      padding: 24px;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">AI返信案</h3>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #374151;">
          生成された返信案
        </label>
        <textarea id="reply-textarea" style="width: 100%; height: 120px; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;">${reply}</textarea>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 12px;">
        <button id="regenerate-btn" style="background-color: #6b7280; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
          再生成
        </button>
        <div style="display: flex; gap: 12px;">
          <button id="cancel-btn" style="background-color: #6b7280; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
            キャンセル
          </button>
          <button id="insert-btn" style="background-color: #16a34a; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
            挿入
          </button>
        </div>
      </div>
    `;

    modal.appendChild(content);

    // イベントリスナーを追加
    const textarea = content.querySelector('#reply-textarea') as HTMLTextAreaElement;
    const regenerateBtn = content.querySelector('#regenerate-btn') as HTMLButtonElement;
    const cancelBtn = content.querySelector('#cancel-btn') as HTMLButtonElement;
    const insertBtn = content.querySelector('#insert-btn') as HTMLButtonElement;

    regenerateBtn.addEventListener('click', async () => {
      regenerateBtn.disabled = true;
      regenerateBtn.textContent = '生成中...';
      
      try {
        const messages = strategy.extractMessages();
        const newReply = await this.generateReply(messages);
        if (newReply) {
          textarea.value = newReply;
        }
      } catch (error) {
        console.error('Failed to regenerate reply:', error);
        alert('返信案の再生成に失敗しました。');
      } finally {
        regenerateBtn.disabled = false;
        regenerateBtn.textContent = '再生成';
      }
    });

    cancelBtn.addEventListener('click', () => {
      this.closeModal(modal);
    });

    insertBtn.addEventListener('click', () => {
      const replyText = textarea.value.trim();
      if (replyText) {
        strategy.insertReply(replyText);
        this.closeModal(modal);
      }
    });

    // モーダル背景クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  private closeModal(modal: HTMLElement): void {
    modal.remove();
  }

  private resetButton(): void {
    const button = document.querySelector('.gemini-reply-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <span style="font-size: 14px;">🤖</span>
        <span>AI返信</span>
      `;
    }
  }

  removeReplyButton(serviceName: string): void {
    const buttonId = this.getButtonId(serviceName);
    const element = this.buttonElements.get(buttonId);
    
    if (element) {
      element.remove();
      this.buttonElements.delete(buttonId);
    }

    const domElement = document.getElementById(buttonId);
    if (domElement) {
      domElement.remove();
    }
  }

  private getButtonId(serviceName: string): string {
    return `gemini-reply-button-${serviceName}`;
  }

  // スタイルシートを注入
  injectStyles(): void {
    if (document.getElementById('gemini-reply-styles')) {
      return; // 既に注入済み
    }

    const styleId = 'gemini-reply-styles';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 基本的なスタイル */
      .gemini-reply-button-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .gemini-reply-btn {
        background-color: #16a34a !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        padding: 6px 12px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: background-color 0.2s !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
      }
      
      .gemini-reply-btn:hover {
        background-color: #15803d !important;
      }
      
      .gemini-reply-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      /* 各サービスのUIとの調和を図るためのスタイル調整 */
      /* Gmail */
      .gmail .gemini-reply-btn {
        background-color: #16a34a !important;
        font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
      }

      /* Chatwork */
      .chatwork .gemini-reply-btn {
        background-color: #16a34a !important;
      }

      /* Google Chat */
      .google-chat .gemini-reply-btn {
        background-color: #16a34a !important;
        font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
      }
    `;

    document.head.appendChild(style);
    
    // 既存のボタンの色を強制的に変更
    this.updateExistingButtonColors();
  }

  private updateExistingButtonColors(): void {
    // 既存のAIボタンを見つけて色を変更
    const buttons = document.querySelectorAll('.gemini-reply-btn, [class*="gemini"], [class*="ai-reply"]');
    buttons.forEach((button: Element) => {
      const htmlButton = button as HTMLElement;
      htmlButton.style.setProperty('background-color', '#16a34a', 'important');
      
      // ホバーイベントも再設定
      htmlButton.addEventListener('mouseenter', () => {
        htmlButton.style.setProperty('background-color', '#15803d', 'important');
      });
      
      htmlButton.addEventListener('mouseleave', () => {
        htmlButton.style.setProperty('background-color', '#16a34a', 'important');
      });
    });
  }

  // クリーンアップ
  cleanup(): void {
    // すべてのボタンを削除
    this.buttonElements.forEach((element) => {
      element.remove();
    });
    this.buttonElements.clear();

    // スタイルシートを削除
    const styles = document.getElementById('gemini-reply-styles');
    if (styles) {
      styles.remove();
    }

    // モーダルを削除
    const modals = document.querySelectorAll('.gemini-modal-backdrop');
    modals.forEach(modal => modal.remove());
  }
}