import type { ServiceStrategy, Message } from './interface';

export class ChatworkStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-chatwork';

  getServiceName(): 'chatwork' {
    return 'chatwork';
  }

  // デバッグ用メソッド: 現在のDOM構造を分析
  private debugDOMStructure(): void {
    console.log('=== Chatwork DOM Structure Analysis ===');
    
    // テキストエリアの分析
    const textareas = document.querySelectorAll('textarea');
    console.log(`Found ${textareas.length} textarea elements:`);
    textareas.forEach((textarea, index) => {
      console.log(`Textarea ${index + 1}:`, {
        id: textarea.id,
        name: textarea.name,
        placeholder: textarea.placeholder,
        className: textarea.className,
        parentClass: textarea.parentElement?.className,
      });
    });

    // ボタンの分析
    const buttons = document.querySelectorAll('button');
    console.log(`Found ${buttons.length} button elements:`);
    buttons.forEach((button, index) => {
      if (button.textContent?.includes('送信') || button.textContent?.includes('Send')) {
        console.log(`Send Button ${index + 1}:`, {
          textContent: button.textContent,
          className: button.className,
          title: button.title,
          dataset: button.dataset,
          parentClass: button.parentElement?.className,
        });
      }
    });

    // メッセージコンテナの分析
    const possibleMessageContainers = document.querySelectorAll('div[class*="message"], div[class*="chat"], div[class*="conversation"]');
    console.log(`Found ${possibleMessageContainers.length} possible message containers:`);
    possibleMessageContainers.forEach((container, index) => {
      if (index < 5) { // 最初の5つだけログ出力
        console.log(`Container ${index + 1}:`, {
          className: container.className,
          id: container.id,
          dataset: container.dataset,
          childElementCount: container.childElementCount,
        });
      }
    });

    console.log('=== End DOM Structure Analysis ===');
  }

  findInsertionPoint(): HTMLElement | null {
    try {
      // デバッグモードの場合、DOM構造を分析
      if (localStorage.getItem('chatwork-debug') === 'true') {
        this.debugDOMStructure();
      }

      // 2025年のChatworkの最新UI構造に対応した複数のセレクター戦略
      const selectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-input-toolbar"]', // メッセージ入力ツールバー
        '[data-testid="send-button-container"]', // 送信ボタンコンテナ
        '.message-input-toolbar', // メッセージ入力ツールバー
        '.send-button-area', // 送信ボタンエリア
        '.chat-input-toolbar', // チャット入力ツールバー
        '.message-actions', // メッセージアクション
        
        // 従来のセレクター（後方互換性のため保持）
        '#_chatSendTool', // 送信ツールエリア
        '._sendArea ._sendTool', // 送信ツール
        '.textInput_tool', // テキスト入力ツール
        '._roomSendArea ._sendTool', // ルーム送信エリア
        
        // より一般的なセレクター
        '[class*="send-tool"]', // send-toolを含むクラス
        '[class*="input-tool"]', // input-toolを含むクラス
        '[class*="toolbar"]', // toolbarを含むクラス
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Found insertion point using selector: ${selector}`);
          return element as HTMLElement;
        }
      }

      // プレースホルダー付きのテキストエリア周辺を探す
      const textareaWithPlaceholder = document.querySelector('textarea[placeholder*="メッセージ内容を入力"], textarea[placeholder*="ここにメッセージ"], textarea[placeholder*="Shift"]');
      if (textareaWithPlaceholder) {
        // テキストエリアの親要素をさかのぼって適切な挿入点を探す
        let parent = textareaWithPlaceholder.parentElement;
        let attempts = 0;
        while (parent && attempts < 5) {
          // ツールバーやボタンコンテナらしい要素を探す
          if (parent.querySelector('button') || 
              parent.classList.toString().includes('tool') || 
              parent.classList.toString().includes('action') ||
              parent.classList.toString().includes('button')) {
            console.log('Found insertion point near textarea with placeholder');
            return parent as HTMLElement;
          }
          parent = parent.parentElement;
          attempts++;
        }
      }

      // フォールバック: 送信ボタンの親要素
      const sendButtonSelectors = [
        'button[data-testid="send-button"]',
        'button[type="submit"]',
        'button[title*="送信"]',
        'button[title*="Send"]',
        'input[value="送信"]',
        'input[value="Send"]',
        'button[data-send="submit"]',
        // より一般的な送信ボタンの検索
        'button:has-text("送信")',
        'button:has-text("Send")',
      ];

      for (const selector of sendButtonSelectors) {
        const sendButton = document.querySelector(selector);
        if (sendButton && sendButton.parentElement) {
          console.log(`Found insertion point using send button selector: ${selector}`);
          return sendButton.parentElement as HTMLElement;
        }
      }

      // 最後の手段: テキストエリアの直接の親要素
      const anyTextarea = document.querySelector('textarea');
      if (anyTextarea && anyTextarea.parentElement) {
        console.log('Using textarea parent as fallback insertion point');
        return anyTextarea.parentElement as HTMLElement;
      }

      // 全ての手段が失敗した場合: フローティングコンテナを作成
      console.log('No insertion point found, creating floating container');
      return this.createFloatingContainer();
    } catch (error) {
      console.error('Error finding insertion point in Chatwork:', error);
      return null;
    }
  }

  extractMessages(): Message[] {
    const messages: Message[] = [];

    try {
      // 2025年のChatworkの最新UI構造に対応したメッセージ抽出
      const messageSelectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-item"]', // メッセージアイテムのテストID
        '[data-testid="chat-message"]', // チャットメッセージのテストID
        '.message-item', // メッセージアイテム
        '.chat-message', // チャットメッセージ
        '.conversation-message', // 会話メッセージ
        '[data-message-id]', // メッセージID付き要素
        
        // 従来のセレクター（後方互換性のため保持）
        '._message', // メッセージアイテム
        '.timeline_message', // タイムラインメッセージ
        '[data-mid]', // メッセージID付き要素
        
        // より一般的なセレクター
        '[class*="message"]', // messageを含むクラス
        '[class*="chat"]', // chatを含むクラス
        '[role="article"]', // articleロール
        '[role="listitem"]', // listitemロール
      ];

      let messageElements: NodeListOf<Element> | null = null;

      for (const selector of messageSelectors) {
        messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) {
          console.log(`Found ${messageElements.length} messages using selector: ${selector}`);
          break;
        }
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
        const chatAreaSelectors = [
          // 2025年の新しいUI構造
          '[data-testid="chat-content"]',
          '[data-testid="message-list"]',
          '.chat-content',
          '.message-list',
          '.conversation-content',
          
          // 従来のセレクター
          '#_chatContent',
          '.roomContent',
          '._room_content',
          
          // より一般的なセレクター
          '[class*="chat-content"]',
          '[class*="message-list"]',
          '[role="main"]',
          'main',
        ];

        for (const selector of chatAreaSelectors) {
          const chatArea = document.querySelector(selector);
          if (chatArea) {
            const text = (chatArea as HTMLElement).innerText?.trim();
            if (text) {
              console.log(`Extracted fallback text using selector: ${selector}`);
              messages.push({
                author: 'Conversation',
                text: text.substring(0, 1000), // 長すぎる場合は切り詰め
              });
              break;
            }
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
      // 2025年のChatworkの最新UI構造に対応した送信者名取得
      const authorSelectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-author"]', // メッセージ作成者のテストID
        '[data-testid="user-name"]', // ユーザー名のテストID
        '.message-author', // メッセージ作成者
        '.user-name', // ユーザー名
        '.author-name', // 作成者名
        '.sender-name', // 送信者名
        
        // 従来のセレクター（後方互換性のため保持）
        '._userName', // ユーザー名
        '.userName', // ユーザー名（別パターン）
        '._name', // 名前
        '.timeline_message_name', // タイムライン名前
        
        // より一般的なセレクター
        '[class*="user-name"]', // user-nameを含むクラス
        '[class*="author"]', // authorを含むクラス
        '[class*="sender"]', // senderを含むクラス
        '[class*="name"]', // nameを含むクラス
      ];

      let author = 'Unknown';
      for (const selector of authorSelectors) {
        const authorEl = messageEl.querySelector(selector);
        if (authorEl) {
          author = authorEl.textContent?.trim() || 'Unknown';
          if (author && author !== 'Unknown') {
            break;
          }
        }
      }

      // 2025年のChatworkの最新UI構造に対応したメッセージ本文取得
      const textSelectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-text"]', // メッセージテキストのテストID
        '[data-testid="message-content"]', // メッセージ内容のテストID
        '.message-text', // メッセージテキスト
        '.message-content', // メッセージ内容
        '.message-body', // メッセージボディ
        '.chat-message-content', // チャットメッセージ内容
        
        // 従来のセレクター（後方互換性のため保持）
        '._messageText', // メッセージテキスト
        '.messageText', // メッセージテキスト（別パターン）
        '._message_text', // メッセージテキスト
        '.timeline_message_text', // タイムラインメッセージテキスト
        
        // より一般的なセレクター
        '[class*="message-text"]', // message-textを含むクラス
        '[class*="message-content"]', // message-contentを含むクラス
        '[class*="text"]', // textを含むクラス
        'p', // パラグラフ要素
        'div', // div要素（最後の手段）
      ];

      let text = '';
      for (const selector of textSelectors) {
        const textEl = messageEl.querySelector(selector);
        if (textEl) {
          // HTMLタグを除去してプレーンテキストを取得
          text = (textEl as HTMLElement).innerText?.trim() || '';
          if (text && text.length > 0) {
            break;
          }
        }
      }

      // テキストが見つからない場合、メッセージ要素自体のテキストを取得
      if (!text) {
        text = (messageEl as HTMLElement).innerText?.trim() || '';
      }

      // 2025年のChatworkの最新UI構造に対応したタイムスタンプ取得
      const timeSelectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-time"]', // メッセージ時刻のテストID
        '[data-testid="timestamp"]', // タイムスタンプのテストID
        '.message-time', // メッセージ時刻
        '.timestamp', // タイムスタンプ
        '.message-timestamp', // メッセージタイムスタンプ
        '.chat-time', // チャット時刻
        
        // 従来のセレクター（後方互換性のため保持）
        '._messageTime', // メッセージ時刻
        '.messageTime', // メッセージ時刻
        '._time', // 時刻
        
        // より一般的なセレクター
        '[class*="time"]', // timeを含むクラス
        '[class*="timestamp"]', // timestampを含むクラス
        'time', // time要素
      ];

      let timestamp: Date | undefined;
      for (const selector of timeSelectors) {
        const timeEl = messageEl.querySelector(selector);
        if (timeEl) {
          const timeText = timeEl.textContent?.trim();
          if (timeText) {
            // 簡単な時刻解析（例: "14:30" -> 今日の14:30）
            const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              timestamp = new Date();
              timestamp.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
              break;
            }
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
      // 2025年のChatworkの最新UI構造に対応したテキスト入力エリア探索
      const inputSelectors = [
        // 2025年の新しいUI構造
        '[data-testid="message-input"]', // メッセージ入力テストID
        '[data-testid="chat-input"]', // チャット入力テストID
        'textarea[placeholder*="メッセージ内容を入力"]', // プレースホルダー付きテキストエリア
        'textarea[placeholder*="ここにメッセージ"]', // プレースホルダー付きテキストエリア
        'textarea[placeholder*="Shift"]', // Shift+Enter関連のプレースホルダー
        '.message-input textarea', // メッセージ入力内のテキストエリア
        '.chat-input textarea', // チャット入力内のテキストエリア
        
        // 従来のセレクター（後方互換性のため保持）
        '#_chatText', // メインのテキストエリア
        'textarea[name="message"]', // メッセージテキストエリア
        '._chatTextArea', // チャットテキストエリア
        'textarea.textInput', // テキストインプット
        
        // より一般的なセレクター
        '[class*="message-input"] textarea', // message-inputを含むクラス内のテキストエリア
        '[class*="chat-input"] textarea', // chat-inputを含むクラス内のテキストエリア
        '[class*="text-input"] textarea', // text-inputを含むクラス内のテキストエリア
        'textarea[role="textbox"]', // ロールがtextboxのテキストエリア
      ];

      let inputElement: HTMLTextAreaElement | null = null;

      for (const selector of inputSelectors) {
        inputElement = document.querySelector(selector);
        if (inputElement) {
          console.log(`Found input element using selector: ${selector}`);
          break;
        }
      }

      // 最後の手段: ページ内の最初のテキストエリアを使用
      if (!inputElement) {
        inputElement = document.querySelector('textarea');
        if (inputElement) {
          console.log('Using first textarea as fallback');
        }
      }

      if (inputElement) {
        // 既存のテキストをクリア
        inputElement.value = '';
        
        // 新しいテキストを挿入
        inputElement.value = text;

        // フォーカスを設定
        inputElement.focus();

        // 複数の入力イベントを発火（現代のReactアプリケーションに対応）
        const events = [
          new Event('input', { bubbles: true }),
          new Event('change', { bubbles: true }),
          new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
          new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }),
        ];

        events.forEach(event => {
          inputElement!.dispatchEvent(event);
        });

        // カーソルを末尾に移動
        inputElement.setSelectionRange(text.length, text.length);

        // ReactのuseStateなどに対応するため、valueプロパティを直接設定
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(inputElement, text);
        }

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

  private createFloatingContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'chatwork-floating-container';
    container.style.cssText = `
      position: fixed !important;
      bottom: 100px !important;
      right: 20px !important;
      z-index: 999999 !important;
      background: white !important;
      border: 2px solid #e74c3c !important;
      border-radius: 8px !important;
      padding: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      max-width: 200px !important;
    `;

    document.body.appendChild(container);
    console.log('Created floating container for Chatwork');
    return container;
  }

  static getButtonId(): string {
    return ChatworkStrategy.BUTTON_ID;
  }
}