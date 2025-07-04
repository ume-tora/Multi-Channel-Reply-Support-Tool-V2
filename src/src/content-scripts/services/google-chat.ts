import type { ServiceStrategy, Message } from './interface';

export class GoogleChatStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-google-chat';

  getServiceName(): 'google-chat' {
    return 'google-chat';
  }

  findInsertionPoint(): HTMLElement | null {
    try {
      // Google Chatの入力エリア周辺のツールバーを探す
      const selectors = [
        'div[role="toolbar"][aria-label*="メッセージ書式設定"]',
        'div[role="toolbar"][aria-label*="Message formatting"]',
        'div[role="toolbar"][aria-label*="フォーマット"]',
        'div[role="toolbar"][aria-label*="Format"]',
        // 送信ボタン周辺
        'button[aria-label*="送信"], button[aria-label*="Send"]',
        // 入力エリアの親要素
        'div[contenteditable="true"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          if (element.tagName === 'BUTTON') {
            // 送信ボタンの場合、その親要素を返す
            return element.parentElement as HTMLElement;
          } else {
            return element as HTMLElement;
          }
        }
      }

      // フォールバック: メッセージ入力エリアの近くを探す
      const inputArea = document.querySelector('div[contenteditable="true"][aria-label*="メッセージ"], div[contenteditable="true"][aria-label*="Message"]');
      if (inputArea) {
        // 入力エリアの親要素や兄弟要素からツールバーを探す
        const parent = inputArea.parentElement;
        if (parent) {
          const toolbar = parent.querySelector('div[role="toolbar"]');
          if (toolbar) return toolbar as HTMLElement;
          
          // 親要素自体をツールバーとして使用
          return parent as HTMLElement;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding insertion point in Google Chat:', error);
      return null;
    }
  }

  extractMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // Google Chatのメッセージを探す
      const messageSelectors = [
        'div[data-message-id]', // メッセージID付き要素
        'div[role="listitem"]', // リストアイテム（メッセージ）
        '.nF6pT', // メッセージコンテナ
        'div[jsname][data-message-id]', // JSベースのメッセージ
      ];

      let messageElements: NodeListOf<Element> | null = null;

      for (const selector of messageSelectors) {
        messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) break;
      }

      if (messageElements) {
        // 最新のメッセージから取得（最新10件程度）
        const recentMessages = Array.from(messageElements).slice(-10);
        
        recentMessages.forEach((messageEl) => {
          const message = this.extractSingleMessage(messageEl);
          if (message) {
            messages.push(message);
          }
        });
      }

      // 代替手段: チャット履歴全体からテキストを抽出
      if (messages.length === 0) {
        const chatHistory = document.querySelector('div[role="main"], .QTQg5e, .V4jiNc');
        if (chatHistory) {
          const text = (chatHistory as HTMLElement).innerText?.trim();
          if (text) {
            // 長すぎる場合は最後の部分を取得
            const maxLength = 2000;
            const trimmedText = text.length > maxLength ? 
              text.substring(text.length - maxLength) : text;
            
            messages.push({
              author: 'Conversation History',
              text: trimmedText,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting Google Chat messages:', error);
    }

    return messages;
  }

  private extractSingleMessage(messageEl: Element): Message | null {
    try {
      // 送信者名を取得
      const authorSelectors = [
        'span[data-hovercard-id]', // ユーザーホバーカード
        '.zCIVn', // ユーザー名スパン
        'div[data-hovercard-id]', // ユーザーdiv
        '.FMTudf .zCIVn', // ユーザー名エリア
      ];

      let author = 'Unknown';
      for (const selector of authorSelectors) {
        const authorEl = messageEl.querySelector(selector);
        if (authorEl) {
          author = authorEl.textContent?.trim() || 'Unknown';
          break;
        }
      }

      // メッセージ本文を取得
      const textSelectors = [
        '.Zd5TMd', // メッセージテキスト
        'div[dir="auto"]', // 自動方向テキスト
        '.nF6pT .Zd5TMd', // メッセージコンテナ内テキスト
        'span[jsslot]', // JSスロットテキスト
      ];

      let text = '';
      for (const selector of textSelectors) {
        const textEl = messageEl.querySelector(selector);
        if (textEl) {
          // HTMLを除去してプレーンテキストを取得
          text = (textEl as HTMLElement).innerText?.trim() || '';
          if (text) break;
        }
      }

      // タイムスタンプを取得（オプション）
      const timeEl = messageEl.querySelector('span[title*=":"], .MuzmKe, span[data-absolute-timestamp]');
      let timestamp: Date | undefined;
      if (timeEl) {
        const timeTitle = timeEl.getAttribute('title');
        const dataTimestamp = timeEl.getAttribute('data-absolute-timestamp');
        
        if (dataTimestamp) {
          timestamp = new Date(parseInt(dataTimestamp));
        } else if (timeTitle) {
          timestamp = new Date(timeTitle);
        }
      }

      if (text && text.length > 0 && !text.includes('画像を送信') && !text.includes('ファイルを送信')) {
        return { author, text, timestamp };
      }
    } catch (error) {
      console.error('Error extracting single Google Chat message:', error);
    }

    return null;
  }

  insertReply(text: string): void {
    try {
      // Google Chatのメッセージ入力エリアを探す
      const inputSelectors = [
        'div[contenteditable="true"][aria-label*="メッセージ"]',
        'div[contenteditable="true"][aria-label*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][data-tab-id="1"]',
        '.Ki72of', // 入力エリアクラス
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

        // Google Chat特有のイベントも発火
        const keydownEvent = new KeyboardEvent('keydown', { bubbles: true });
        inputElement.dispatchEvent(keydownEvent);

        console.log('Reply text inserted successfully in Google Chat');
      } else {
        console.warn('Could not find reply input element in Google Chat');
      }
    } catch (error) {
      console.error('Error inserting reply in Google Chat:', error);
    }
  }

  isButtonInjected(): boolean {
    return !!document.getElementById(GoogleChatStrategy.BUTTON_ID);
  }

  getThreadId(): string | null {
    try {
      // URLからスペース・スレッドIDを取得
      const urlMatch = window.location.href.match(/\/chat\/u\/\d+\/(\w+)\/([^/?]+)/);
      if (urlMatch) {
        return `google_chat_${urlMatch[1]}_${urlMatch[2]}`;
      }

      // データ属性からスペースIDを取得
      const spaceElement = document.querySelector('[data-space-id], [data-thread-id]');
      if (spaceElement) {
        const spaceId = spaceElement.getAttribute('data-space-id') || 
                       spaceElement.getAttribute('data-thread-id');
        if (spaceId) {
          return `google_chat_${spaceId}`;
        }
      }

      // URLからハッシュを生成
      const pathParts = window.location.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 3) {
        return `google_chat_${btoa(pathParts.slice(-2).join('_')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
      }

      // フォールバック
      return `google_chat_${btoa(window.location.pathname).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    } catch (error) {
      console.error('Error getting Google Chat thread ID:', error);
      return null;
    }
  }

  static getButtonId(): string {
    return GoogleChatStrategy.BUTTON_ID;
  }
}