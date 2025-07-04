import type { ServiceStrategy, Message } from './interface';

export class ChatworkStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-chatwork';

  getServiceName(): 'chatwork' {
    return 'chatwork';
  }

  findInsertionPoint(): HTMLElement | null {
    try {
      // Chatworkのメッセージ送信エリアのツールバーを探す
      const selectors = [
        '#_chatSendTool', // 送信ツールエリア
        '._sendArea ._sendTool', // 送信ツール
        '.textInput_tool', // テキスト入力ツール
        '._roomSendArea ._sendTool', // ルーム送信エリア
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element as HTMLElement;
        }
      }

      // フォールバック: 送信ボタンの親要素
      const sendButton = document.querySelector('input[value="送信"], input[value="Send"], button[data-send="submit"]');
      if (sendButton) {
        return sendButton.parentElement as HTMLElement;
      }

      return null;
    } catch (error) {
      console.error('Error finding insertion point in Chatwork:', error);
      return null;
    }
  }

  extractMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // Chatworkのメッセージリストを取得
      const messageSelectors = [
        '._message', // メッセージアイテム
        '.timeline_message', // タイムラインメッセージ
        '[data-mid]', // メッセージID付き要素
      ];

      let messageElements: NodeListOf<Element> | null = null;

      for (const selector of messageSelectors) {
        messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) break;
      }

      if (messageElements) {
        // 最新のメッセージから逆順で取得（最新10件程度）
        const recentMessages = Array.from(messageElements).slice(-10);
        
        recentMessages.forEach((messageEl) => {
          const message = this.extractSingleMessage(messageEl);
          if (message) {
            messages.push(message);
          }
        });
      }

      // メッセージが見つからない場合のフォールバック
      if (messages.length === 0) {
        const chatArea = document.querySelector('#_chatContent, .roomContent, ._room_content');
        if (chatArea) {
          const text = (chatArea as HTMLElement).innerText?.trim();
          if (text) {
            messages.push({
              author: 'Conversation',
              text: text.substring(0, 1000), // 長すぎる場合は切り詰め
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting Chatwork messages:', error);
    }

    return messages;
  }

  private extractSingleMessage(messageEl: Element): Message | null {
    try {
      // 送信者名を取得
      const authorSelectors = [
        '._userName', // ユーザー名
        '.userName', // ユーザー名（別パターン）
        '._name', // 名前
        '.timeline_message_name', // タイムライン名前
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
        '._messageText', // メッセージテキスト
        '.messageText', // メッセージテキスト（別パターン）
        '._message_text', // メッセージテキスト
        '.timeline_message_text', // タイムラインメッセージテキスト
      ];

      let text = '';
      for (const selector of textSelectors) {
        const textEl = messageEl.querySelector(selector);
        if (textEl) {
          // HTMLタグを除去してプレーンテキストを取得
          text = (textEl as HTMLElement).innerText?.trim() || '';
          if (text) break;
        }
      }

      // タイムスタンプを取得（オプション）
      const timeEl = messageEl.querySelector('._messageTime, .messageTime, ._time');
      let timestamp: Date | undefined;
      if (timeEl) {
        const timeText = timeEl.textContent?.trim();
        if (timeText) {
          // 簡単な時刻解析（例: "14:30" -> 今日の14:30）
          const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            timestamp = new Date();
            timestamp.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
          }
        }
      }

      if (text && text.length > 0) {
        return { author, text, timestamp };
      }
    } catch (error) {
      console.error('Error extracting single Chatwork message:', error);
    }

    return null;
  }

  insertReply(text: string): void {
    try {
      // Chatworkのテキスト入力エリアを探す
      const inputSelectors = [
        '#_chatText', // メインのテキストエリア
        'textarea[name="message"]', // メッセージテキストエリア
        '._chatTextArea', // チャットテキストエリア
        'textarea.textInput', // テキストインプット
      ];

      let inputElement: HTMLTextAreaElement | null = null;

      for (const selector of inputSelectors) {
        inputElement = document.querySelector(selector);
        if (inputElement) break;
      }

      if (inputElement) {
        // 既存のテキストをクリア
        inputElement.value = '';
        
        // 新しいテキストを挿入
        inputElement.value = text;

        // フォーカスを設定
        inputElement.focus();

        // 入力イベントを発火
        const inputEvent = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        // カーソルを末尾に移動
        inputElement.setSelectionRange(text.length, text.length);

        console.log('Reply text inserted successfully in Chatwork');
      } else {
        console.warn('Could not find reply input element in Chatwork');
      }
    } catch (error) {
      console.error('Error inserting reply in Chatwork:', error);
    }
  }

  isButtonInjected(): boolean {
    return !!document.getElementById(ChatworkStrategy.BUTTON_ID);
  }

  getThreadId(): string | null {
    try {
      // URLからルームIDを取得
      const urlMatch = window.location.href.match(/rid=(\d+)/);
      if (urlMatch) {
        return `chatwork_room_${urlMatch[1]}`;
      }

      // ページタイトルからルーム情報を取得
      const title = document.title;
      if (title && title !== 'Chatwork') {
        return `chatwork_${btoa(title).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
      }

      // フォールバック
      return `chatwork_${btoa(window.location.pathname).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    } catch (error) {
      console.error('Error getting Chatwork thread ID:', error);
      return null;
    }
  }

  static getButtonId(): string {
    return ChatworkStrategy.BUTTON_ID;
  }
}