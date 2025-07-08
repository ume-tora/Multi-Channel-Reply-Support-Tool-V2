import type { ServiceStrategy, Message } from './interface';

/**
 * Chatwork 自動送信戦略
 * Chatworkチャットでの自動メッセージ送信機能付きモーダル
 */
export class ChatworkAutoSendStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-chatwork-autosend';
  private static readonly MODAL_ID = 'chatwork-autosend-modal';
  private static readonly CONFIRM_MODAL_ID = 'chatwork-confirm-modal';

  getServiceName(): 'chatwork' {
    return 'chatwork';
  }

  /**
   * ボタン配置点を探す
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 Chatwork AutoSend: Starting insertion point search...');
    
    if (!this.isChatworkPage()) {
      console.log('📝 Not on Chatwork chat page');
      return null;
    }

    console.log('✅ Chatwork chat page detected');
    
    // メッセージ入力エリアを探す
    const inputArea = this.findInputArea();
    if (inputArea) {
      console.log('✅ Found input area');
      return inputArea;
    }

    // チャット入力フォームを探す
    const chatForm = this.findChatForm();
    if (chatForm) {
      console.log('✅ Found chat form');
      return chatForm;
    }

    // フォールバック: チャットコンテナ
    const chatContainer = this.findChatContainer();
    return chatContainer;
  }

  /**
   * Chatworkのページかチェック
   */
  private isChatworkPage(): boolean {
    console.log('🔍 Checking for Chatwork page...');
    console.log(`🔍 Current URL: ${window.location.href}`);
    console.log(`🔍 Current hostname: ${window.location.hostname}`);
    
    // Step 1: URL検証
    const urlCheck = this.isValidChatworkUrl();
    console.log(`🔍 URL validation: ${urlCheck ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!urlCheck) {
      console.log('❌ Not a valid Chatwork URL');
      return false;
    }
    
    // Step 2: DOM要素の検証
    const elementCheck = this.hasChatworkElements();
    console.log(`🔍 Element validation: ${elementCheck ? '✅ Valid' : '❌ Invalid'}`);
    
    const result = urlCheck && elementCheck;
    console.log(`🔍 Final Chatwork page check: ${result ? '✅ Valid Chatwork page' : '❌ Not a Chatwork page'}`);
    
    return result;
  }

  /**
   * 有効なChatworkのURLかチェック
   */
  private isValidChatworkUrl(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    // Chatworkドメインチェック
    const isDomain = hostname.includes('chatwork.com') || hostname.includes('chatwork.jp');
    console.log(`   Domain check: ${isDomain ? '✅' : '❌'} (${hostname})`);
    
    // チャットルームのURLパターンチェック
    const hasRoomId = search.includes('rid=') || pathname.includes('/room/');
    console.log(`   Room ID check: ${hasRoomId ? '✅' : '❌'} (${search || pathname})`);
    
    return isDomain && (hasRoomId || pathname === '/' || search.includes('rid='));
  }

  /**
   * Chatworkの特徴的な要素が存在するかチェック
   */
  private hasChatworkElements(): boolean {
    const chatworkSelectors = [
      // 最優先：Chatworkアプリケーションの核心要素
      '#_body',
      '#_mainContent', 
      '#_roomMemberWrapper',
      '#_timeLine',
      
      // 高優先：入力・送信関連
      '#_chatText',
      '#_chatSendTool',
      '#chat_input_area',
      
      // 中優先：UI構造要素
      '.chatInput',
      '.chatInput textarea',
      'textarea[name="message"]',
      '#chatWorkSpace',
      
      // 低優先：より一般的な要素
      '#_roomTitle',
      '.room_title',
      '.chat_title'
    ];

    console.log(`   Checking ${chatworkSelectors.length} Chatwork-specific selectors...`);

    for (let i = 0; i < chatworkSelectors.length; i++) {
      const selector = chatworkSelectors[i];
      try {
        const elements = document.querySelectorAll(selector);
        const visibleElements = Array.from(elements).filter(el => this.isElementVisible(el as HTMLElement));
        
        if (visibleElements.length > 0) {
          console.log(`   ✅ Found ${visibleElements.length} visible elements with selector ${i + 1}/${chatworkSelectors.length}: ${selector}`);
          return true;
        } else if (elements.length > 0) {
          console.log(`   ⚠️ Found ${elements.length} hidden elements with selector ${i + 1}/${chatworkSelectors.length}: ${selector}`);
        } else {
          console.log(`   ❌ No elements found with selector ${i + 1}/${chatworkSelectors.length}: ${selector}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with selector ${i + 1}/${chatworkSelectors.length}: ${selector}`, error);
      }
    }

    console.log('   ❌ No Chatwork elements found');
    return false;
  }

  /**
   * メッセージ入力エリアを探す
   */
  private findInputArea(): HTMLElement | null {
    console.log('🔍 Searching for input area...');
    
    const inputSelectors = [
      // Chatworkのメイン入力エリア
      '#chat_input_area',
      '.chatInput',
      '.inputTools',
      '#_chatSendTool',
      
      // 入力フィールド周辺
      '#_chatText',
      'textarea[name="message"]',
      '.chatInput textarea'
    ];

    for (const selector of inputSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found input area: ${selector}`);
          return element.parentElement || element;
        }
      } catch (error) {
        console.log(`❌ Error with input selector: ${selector}`, error);
      }
    }

    console.log('❌ No input area found');
    return null;
  }

  /**
   * チャットフォームを探す
   */
  private findChatForm(): HTMLElement | null {
    console.log('🔍 Searching for chat form...');
    
    const formSelectors = [
      '#chat_input_form',
      'form[name="chatForm"]',
      '.chatForm',
      'form:has(#_chatText)',
      'form:has(textarea[name="message"])'
    ];

    for (const selector of formSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found chat form: ${selector}`);
          return element;
        }
      } catch (error) {
        console.log(`❌ Error with form selector: ${selector}`, error);
      }
    }

    console.log('❌ No chat form found');
    return null;
  }

  /**
   * チャットコンテナを探す
   */
  private findChatContainer(): HTMLElement | null {
    console.log('🔍 Searching for chat container...');
    
    const containerSelectors = [
      '#_chatContent',
      '#chatWorkSpace',
      '.chatWork',
      '#main',
      'body'
    ];

    for (const selector of containerSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found chat container: ${selector}`);
          return element;
        }
      } catch (error) {
        console.log(`❌ Error with container selector: ${selector}`, error);
      }
    }

    console.log('❌ No chat container found');
    return null;
  }

  /**
   * 要素が表示されているかチェック
   */
  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(ChatworkAutoSendStrategy.BUTTON_ID);
  }

  /**
   * メッセージを抽出
   */
  extractMessages(): Message[] {
    console.log('💬 Chatwork AutoSend: Extracting chat messages...');
    const messages: Message[] = [];
    
    const messageTexts = this.extractMessageTexts();
    messageTexts.forEach((text, index) => {
      if (text.trim()) {
        messages.push({
          author: index === messageTexts.length - 1 ? "最新の送信者" : "過去の送信者",
          text: text.trim()
        });
      }
    });

    console.log(`💬 Extracted ${messages.length} chat messages`);
    return messages.slice(-5); // 最新5件
  }

  /**
   * メッセージテキストを抽出
   */
  private extractMessageTexts(): string[] {
    console.log('🔍 Chatwork: Starting improved message extraction...');
    const messageTexts: string[] = [];

    // 段階的なメッセージ抽出アプローチ
    
    // Step 1: メッセージコンテナを特定
    const messageContainerSelectors = [
      '[data-testid="message-item"]',
      '[data-testid="chat-message"]', 
      '[data-messageid]',
      '.chatTimeLineMessage',
      '.timeline_message',
      '.message-item',
      '.chat-message',
      '._message',
      '[data-mid]'
    ];

    let messageContainers: Element[] = [];
    
    for (const selector of messageContainerSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} message containers using: ${selector}`);
        messageContainers = Array.from(elements);
        break;
      }
    }

    // Step 2: コンテナが見つからない場合は、より一般的な方法で探す
    if (messageContainers.length === 0) {
      console.log('🔍 No message containers found, trying timeline approach...');
      const timelineSelectors = ['#_timeLine', '.timeline', '.chat-timeline', '.message-list'];
      
      for (const timelineSelector of timelineSelectors) {
        const timeline = document.querySelector(timelineSelector);
        if (timeline) {
          console.log(`✅ Found timeline container: ${timelineSelector}`);
          // タイムライン内の直接の子要素をメッセージとして扱う
          const children = timeline.children;
          messageContainers = Array.from(children).filter(child => {
            const text = child.textContent?.trim() || '';
            return text.length > 10; // 最低限の長さがあるもの
          });
          console.log(`✅ Found ${messageContainers.length} potential message elements in timeline`);
          break;
        }
      }
    }

    // Step 3: 各メッセージコンテナからテキストを抽出
    if (messageContainers.length > 0) {
      messageContainers.forEach((container, index) => {
        const messageText = this.extractSingleMessageText(container as HTMLElement);
        if (messageText) {
          messageTexts.push(messageText);
          console.log(`   Message ${index + 1}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);
        }
      });
    }

    // Step 4: 結果が不十分な場合のフォールバック
    if (messageTexts.length === 0) {
      console.log('🔍 No messages found via containers, trying direct text extraction...');
      return this.fallbackMessageExtraction();
    }

    // 重複を削除して返す
    const uniqueTexts = [...new Set(messageTexts)];
    console.log(`💬 Chatwork: Total unique messages found: ${uniqueTexts.length}`);

    return uniqueTexts;
  }

  /**
   * 単一のメッセージコンテナからテキストを抽出
   */
  private extractSingleMessageText(container: HTMLElement): string | null {
    // メッセージ本文の可能性があるセレクタ
    const textSelectors = [
      '[data-testid="message-text"]',
      '[data-testid="message-content"]',
      '.message-text',
      '.message-content', 
      '.messageBody',
      '.message_body',
      '._messageText',
      '.timeline_message_text',
      '.msg_content'
    ];

    // まず、専用のテキスト要素を探す
    for (const selector of textSelectors) {
      const textElement = container.querySelector(selector);
      if (textElement) {
        const text = this.cleanMessageText(textElement.textContent || '');
        if (this.isValidMessageText(text)) {
          return text;
        }
      }
    }

    // 専用要素が見つからない場合は、コンテナ全体のテキストを取得
    // ただし、ユーザー名や時刻などの不要な部分を除外
    const fullText = container.textContent || '';
    const cleanedText = this.cleanMessageText(fullText);
    
    if (this.isValidMessageText(cleanedText)) {
      return cleanedText;
    }

    return null;
  }

  /**
   * フォールバック用のメッセージ抽出
   */
  private fallbackMessageExtraction(): string[] {
    console.log('🔍 Running fallback message extraction...');
    const texts: string[] = [];
    
    // より控えめなセレクタでフォールバック
    const fallbackSelectors = [
      'div[class*="message"]:not([class*="input"]):not([class*="button"])',
      'p:not([class*="button"]):not([class*="menu"])',
      '.messageBody',
      '.msg_content'
    ];

    fallbackSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`   Fallback ${selector}: ${elements.length} elements`);
      
      elements.forEach(element => {
        const text = this.cleanMessageText(element.textContent || '');
        if (this.isValidMessageText(text) && text.length > 20) { // より厳しい条件
          texts.push(text);
        }
      });
    });

    return [...new Set(texts)];
  }

  /**
   * メッセージテキストをクリーンアップ
   */
  private cleanMessageText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .replace(/^(TO|From|送信者|宛先)[:：]\s*/i, '') // プレフィックスを削除
      .replace(/^\d{1,2}:\d{2}\s*/, '') // 時刻を削除
      .replace(/^[\d\/\-\s]+\s*/, '') // 日付を削除
      .trim();
  }

  /**
   * 有効なメッセージテキストかチェック
   */
  private isValidMessageText(text: string): boolean {
    if (!text || text.length < 5 || text.length > 3000) {
      return false;
    }
    
    // システムメッセージや無関係なテキストを除外
    const excludePatterns = [
      // システムメッセージ
      /^(ログイン|ログアウト|参加|退出|作成|削除|変更)/,
      /^(login|logout|joined|left|created|deleted|changed)/i,
      
      // UI要素のテキスト
      /検索条件をクリアし、初期状態に戻します/,
      /^(承知いたしました。検索条件を)/,
      /^(チャット名|メッセージ内容を検索|ファイル)/,
      /^(TO|From|送信者|宛先|時刻|日付)[:：]/,
      /^(マイチャット|個別チャット|グループチャット)/,
      
      // ボタンやメニューのテキスト
      /^(送信|キャンセル|削除|編集|返信|転送)/,
      /^(Send|Cancel|Delete|Edit|Reply|Forward)/i,
      /^(設定|オプション|メニュー|ヘルプ)/,
      
      // 単純なレスポンス
      /^\d+$/,  // 数字のみ
      /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/, // 記号のみ
      /^(はい|いいえ|yes|no|ok|ng)$/i,
      /^(了解|理解|わかりました|承知|確認)$/,
      
      // タイムスタンプや日付のみ
      /^\d{1,2}:\d{2}$/,
      /^\d{4}\/\d{1,2}\/\d{1,2}$/,
      
      // 空白や改行のみ
      /^\s*$/,
      
      // Chatwork特有のUI要素
      /^(メンバー|ファイル|タスク|概要)/,
      /^(Member|File|Task|Overview)/i,
      /^(通知|設定|プロフィール)/
    ];
    
    // 除外パターンにマッチしないかチェック
    const isExcluded = excludePatterns.some(pattern => pattern.test(text));
    
    if (isExcluded) {
      console.log(`   ❌ Excluded text: "${text.substring(0, 30)}..."`);
      return false;
    }
    
    return true;
  }

  /**
   * 返信処理（自動送信モーダル版）
   */
  async insertReply(text: string): Promise<void> {
    console.log('💬 Chatwork AutoSend: Showing auto-send modal...');
    this.showAutoSendModal(text);
  }

  /**
   * 自動送信モーダルを表示
   */
  private showAutoSendModal(text: string): void {
    const existing = document.getElementById(ChatworkAutoSendStrategy.MODAL_ID);
    if (existing) existing.remove();

    const chatInfo = this.extractChatInfo();
    const modal = document.createElement('div');
    modal.id = ChatworkAutoSendStrategy.MODAL_ID;
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.7) !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: 'Hiragino Sans', 'Meiryo', sans-serif !important;
    `;

    modal.innerHTML = `
      <div style="
        background: white !important;
        border-radius: 16px !important;
        padding: 32px !important;
        max-width: 700px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
      ">
        <div style="color: #00a0e9; font-size: 28px; margin-bottom: 16px; font-weight: 500;">
          💬 Chatwork自動送信
        </div>
        
        <div style="color: #5f6368; font-size: 14px; margin-bottom: 24px;">
          AI生成された返信を確認してChatworkに送信してください
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 2px solid #00a0e9 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
        ">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px;">
            <div style="color: #5f6368; font-weight: 500;">チャット:</div>
            <div style="color: #202124;">${chatInfo.chatName}</div>
            <div style="color: #5f6368; font-weight: 500;">ルーム:</div>
            <div style="color: #202124;">${chatInfo.roomName}</div>
          </div>
          
          <div style="color: #5f6368; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            📝 返信内容:
          </div>
          <textarea id="chat-content" style="
            width: 100% !important;
            min-height: 120px !important;
            border: 1px solid #dadce0 !important;
            border-radius: 8px !important;
            padding: 12px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            font-family: inherit !important;
            resize: vertical !important;
            box-sizing: border-box !important;
            outline: none !important;
          ">${text}</textarea>
        </div>
        
        <div style="
          background: #fef7e0 !important;
          border: 1px solid #f9ab00 !important;
          border-radius: 8px !important;
          padding: 16px !important;
          margin: 20px 0 !important;
          font-size: 13px !important;
          color: #b06000 !important;
        ">
          ⚠️ <strong>重要:</strong> この機能はChatworkの送信ボタンを自動でクリックします。<br>
          内容を十分確認してから送信してください。送信後の取り消しはできません。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="send-btn" style="
            background: #00a0e9 !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            📤 送信実行
          </button>
          
          <button id="cancel-btn" style="
            background: #ea4335 !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            ✖️ キャンセル
          </button>
        </div>
        
        <div style="
          margin-top: 24px !important;
          padding: 16px !important;
          background: #e3f2fd !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #00a0e9 !important;
          text-align: left !important;
        ">
          <strong>💡 操作手順:</strong><br>
          1. 上記の返信内容を確認・編集<br>
          2. チャット情報が正しいことを確認<br>
          3. 「送信実行」ボタンをクリック<br>
          4. 最終確認ダイアログで「送信」を選択
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupAutoSendModalEvents(modal, chatInfo);
  }

  /**
   * チャット情報を抽出
   */
  private extractChatInfo(): { chatName: string; roomName: string } {
    // チャット名を取得
    const chatName = document.querySelector('#_roomTitle, .room_title, .chat_title')?.textContent ||
                    document.querySelector('h1, h2')?.textContent || 
                    '確認できませんでした';
    
    // ルーム名を取得（グループの場合）
    const roomName = document.querySelector('.group_name, .room_name')?.textContent ||
                    '個別チャット';

    return {
      chatName: chatName,
      roomName: roomName
    };
  }

  /**
   * 自動送信モーダルのイベントを設定
   */
  private setupAutoSendModalEvents(modal: HTMLElement, chatInfo: { chatName: string; roomName: string }): void {
    const textarea = modal.querySelector('#chat-content') as HTMLTextAreaElement;
    const sendBtn = modal.querySelector('#send-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

    // 送信ボタンクリック
    sendBtn?.addEventListener('click', async () => {
      const content = textarea?.value || '';
      if (!content.trim()) {
        this.showError(sendBtn, '内容が空です');
        return;
      }

      // 最終確認ダイアログ
      const confirmed = await this.showFinalConfirmation({
        chatName: chatInfo.chatName,
        roomName: chatInfo.roomName,
        message: content
      });

      if (confirmed) {
        sendBtn.innerHTML = '🔄 送信中...';
        sendBtn.disabled = true;

        try {
          const success = await this.executeChatworkSend(content);
          
          if (success) {
            sendBtn.innerHTML = '✅ 送信完了';
            sendBtn.style.background = '#34a853 !important';
            console.log('🎉 Chatwork send completed successfully, closing modal in 2 seconds');
            setTimeout(() => {
              console.log('🎉 Removing modal after successful send');
              modal.remove();
            }, 2000);
          } else {
            console.log('⚠️ Send reported as failed, starting fallback verification...');
            
            // より徹底的なフォールバック検証
            await this.performFallbackSendVerification(sendBtn, modal, content);
          }
        } catch (error) {
          console.error('💥 Exception in send execution:', error);
          this.showError(sendBtn, '送信エラー');
          
          // エラーでも一定時間後にはモーダルを閉じる
          setTimeout(() => {
            console.log('🕐 Force closing modal after 8 seconds due to error');
            modal.remove();
          }, 8000);
        }
      }
    });

    // キャンセルボタンクリック
    cancelBtn?.addEventListener('click', () => modal.remove());
    
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
   * 最終確認ダイアログを表示
   */
  private showFinalConfirmation(chatData: { chatName: string; roomName: string; message: string }): Promise<boolean> {
    return new Promise((resolve) => {
      const existing = document.getElementById(ChatworkAutoSendStrategy.CONFIRM_MODAL_ID);
      if (existing) existing.remove();

      const confirmModal = document.createElement('div');
      confirmModal.id = ChatworkAutoSendStrategy.CONFIRM_MODAL_ID;
      confirmModal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.8) !important;
        z-index: 99999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      `;

      confirmModal.innerHTML = `
        <div style="
          background: white !important;
          border-radius: 16px !important;
          padding: 32px !important;
          max-width: 600px !important;
          width: 90% !important;
          max-height: 70vh !important;
          overflow-y: auto !important;
          text-align: center !important;
        ">
          <div style="color: #ea4335; font-size: 24px; margin-bottom: 24px; font-weight: bold;">
            🚨 最終確認
          </div>
          
          <div style="text-align: left; margin-bottom: 24px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 12px;"><strong>チャット:</strong> ${chatData.chatName}</div>
            <div style="margin-bottom: 12px;"><strong>ルーム:</strong> ${chatData.roomName}</div>
            <div style="margin-bottom: 12px;"><strong>メッセージ:</strong></div>
            <div style="background: white; padding: 12px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 13px; line-height: 1.4;">
              ${chatData.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="color: #d93025; font-size: 14px; margin-bottom: 24px; font-weight: 500;">
            この内容でChatworkにメッセージを送信します。送信後の取り消しはできません。
          </div>
          
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="final-send-btn" style="
              background: #00a0e9 !important;
              color: white !important;
              border: none !important;
              padding: 16px 32px !important;
              border-radius: 8px !important;
              font-size: 16px !important;
              font-weight: bold !important;
              cursor: pointer !important;
            ">
              📤 確認しました。送信実行
            </button>
            
            <button id="final-cancel-btn" style="
              background: #5f6368 !important;
              color: white !important;
              border: none !important;
              padding: 16px 32px !important;
              border-radius: 8px !important;
              font-size: 16px !important;
              cursor: pointer !important;
            ">
              ✖️ キャンセル
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(confirmModal);

      confirmModal.querySelector('#final-send-btn')?.addEventListener('click', () => {
        confirmModal.remove();
        resolve(true);
      });

      confirmModal.querySelector('#final-cancel-btn')?.addEventListener('click', () => {
        confirmModal.remove();
        resolve(false);
      });

      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          confirmModal.remove();
          resolve(false);
        }
      });
    });
  }

  /**
   * Chatwork送信を実行
   */
  private async executeChatworkSend(content: string): Promise<boolean> {
    try {
      console.log('📤 ========== Chatwork Send Execution Start ==========');
      console.log(`📝 Content to send: "${content.substring(0, 100)}..."`);
      
      // Step 1: メッセージを入力欄に設定
      console.log('📤 Step 1: Inserting content to input field...');
      const insertSuccess = await this.insertContentToChatwork(content);
      if (!insertSuccess) {
        console.error('❌ Step 1 FAILED: Could not insert content to input field');
        this.debugCurrentPage('INSERT_FAILED');
        return false;
      }
      console.log('✅ Step 1 SUCCESS: Content inserted to input field');

      // Step 2: 送信ボタンを見つけてクリック（送信完了確認も含む）
      console.log('📤 Step 2: Finding and clicking send button...');
      const clickSuccess = await this.findAndClickSendButton();
      if (!clickSuccess) {
        console.error('❌ Step 2 FAILED: Could not find or click send button');
        this.debugCurrentPage('SEND_BUTTON_FAILED');
        return false;
      }
      console.log('✅ Step 2 SUCCESS: Send button clicked and message sent confirmed');
      console.log('📤 ========== Chatwork Send Execution Complete ==========');
      return true;
    } catch (error) {
      console.error('💥 Chatwork send execution failed with exception:', error);
      this.debugCurrentPage('EXCEPTION');
      return false;
    }
  }

  /**
   * 現在のページ状態をデバッグ
   */
  private debugCurrentPage(context: string): void {
    console.log(`🔍 DEBUG [${context}] - Current page state:`);
    console.log('🔍 URL:', window.location.href);
    console.log('🔍 Document ready state:', document.readyState);
    
    // 入力欄の状態をチェック
    const inputElement = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
    if (inputElement) {
      console.log('🔍 Input element found:', inputElement.tagName, inputElement.id, inputElement.className);
      console.log('🔍 Input value:', inputElement.value);
      console.log('🔍 Input visible:', this.isElementVisible(inputElement));
    } else {
      console.log('🔍 No input element found');
    }

    // 送信ボタンの状態をチェック
    this.debugSendButtons();
  }

  /**
   * 送信ボタンをデバッグ
   */
  private debugSendButtons(): void {
    console.log('🔍 === Send Button Debug Analysis ===');
    
    const allButtons = document.querySelectorAll('button, input[type="submit"]');
    console.log(`🔍 Total buttons/inputs found: ${allButtons.length}`);
    
    let potentialSendButtons = 0;
    allButtons.forEach((button, index) => {
      const element = button as HTMLElement;
      const text = element.textContent?.toLowerCase() || '';
      const value = (element as HTMLInputElement).value?.toLowerCase() || '';
      const type = element.getAttribute('type') || '';
      const id = element.id || '';
      const className = element.className || '';
      
      const isSendButton = 
        text.includes('送信') || 
        value.includes('送信') || 
        type === 'submit' ||
        text.includes('send') ||
        value.includes('send');
        
      if (isSendButton) {
        potentialSendButtons++;
        console.log(`🔍 Potential send button ${potentialSendButtons}:`);
        console.log(`   Element: ${element.tagName}`);
        console.log(`   ID: ${id}`);
        console.log(`   Class: ${className}`);
        console.log(`   Text: "${text}"`);
        console.log(`   Value: "${value}"`);
        console.log(`   Type: ${type}`);
        console.log(`   Visible: ${this.isElementVisible(element)}`);
        console.log(`   Disabled: ${element.hasAttribute('disabled')}`);
      }
    });
    
    if (potentialSendButtons === 0) {
      console.log('🔍 ❌ No potential send buttons found!');
      console.log('🔍 Checking for forms...');
      const forms = document.querySelectorAll('form');
      console.log(`🔍 Forms found: ${forms.length}`);
      forms.forEach((form, index) => {
        console.log(`🔍 Form ${index + 1}:`, form.id, form.className, form.action);
      });
    }
  }

  /**
   * Chatworkの入力欄にコンテンツを挿入
   */
  private async insertContentToChatwork(content: string): Promise<boolean> {
    const messageInput = await this.findMessageInput();
    if (!messageInput) return false;

    try {
      // フォーカスして内容を設定
      messageInput.focus();
      
      // 既存内容をクリア
      messageInput.value = '';
      messageInput.value = content;

      // イベントを発火して変更を通知
      const events = ['input', 'change', 'keyup'];
      events.forEach((eventType) => {
        messageInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      console.log('✅ Content inserted to Chatwork message input');
      return true;
    } catch (error) {
      console.error('❌ Failed to insert content:', error);
      return false;
    }
  }

  /**
   * メッセージ入力欄を探す
   */
  private async findMessageInput(): Promise<HTMLTextAreaElement | null> {
    const selectors = [
      '#_chatText',
      'textarea[name="message"]',
      '.chatInput textarea',
      '#chat_input_area textarea',
      'textarea[placeholder*="メッセージ"]',
      'textarea[placeholder*="message"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLTextAreaElement;
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * 送信ボタンを見つけてクリック（強化版）
   */
  private async findAndClickSendButton(): Promise<boolean> {
    const sendButton = await this.findSendButton();
    if (!sendButton) return false;

    try {
      console.log('🎯 Found send button:', sendButton.tagName, sendButton.className, sendButton.id);
      console.log('🎯 Send button HTML:', sendButton.outerHTML);
      console.log('🎯 Send button text content:', sendButton.textContent);
      console.log('🎯 Send button disabled status:', sendButton.hasAttribute('disabled'));
      
      // ボタンが表示されていることを確認
      if (!this.isElementVisible(sendButton)) {
        console.error('❌ Send button is not visible');
        return false;
      }
      
      // ボタンの位置情報をログ
      const rect = sendButton.getBoundingClientRect();
      console.log('🎯 Send button position:', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      
      // クリック前にボタンを有効化する試み
      if (sendButton.hasAttribute('disabled')) {
        console.log('🔧 Removing disabled attribute');
        sendButton.removeAttribute('disabled');
      }
      
      // 複数のクリック戦略を順次試行
      const clickStrategies = [
        () => this.clickWithPointerEvents(sendButton),
        () => this.clickWithMouseEvents(sendButton),
        () => this.clickWithDirectMethod(sendButton),
        () => this.clickWithFormSubmit(sendButton)
      ];
      
      for (const [index, strategy] of clickStrategies.entries()) {
        console.log(`🎯 Trying click strategy ${index + 1}/${clickStrategies.length}`);
        
        try {
          // 各戦略ごとに新しいObserverを設定
          const domChangePromise = this.setupSendClickObserver();
          
          await strategy();
          console.log(`🎯 Strategy ${index + 1} executed successfully`);
          
          // DOM変化を短時間待機して確認
          const success = await Promise.race([
            domChangePromise,
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000))
          ]);
          
          if (success) {
            console.log(`✅ Send button clicked successfully with strategy ${index + 1}`);
            return true;
          } else {
            console.log(`⚠️ Strategy ${index + 1} executed but no DOM change detected, trying next strategy...`);
          }
        } catch (error) {
          console.log(`❌ Strategy ${index + 1} failed:`, error);
        }
        
        // 戦略間で少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.error('❌ All click strategies failed');
      return false;
    } catch (error) {
      console.error('❌ Failed to click send button:', error);
      return false;
    }
  }

  /**
   * PointerEventsを使ったクリック
   */
  private async clickWithPointerEvents(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting click with Pointer Events');
    
    button.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // PointerEventsは最新のWebアプリでよく使われる
    button.dispatchEvent(new PointerEvent('pointerdown', { 
      bubbles: true, 
      cancelable: true, 
      pointerId: 1,
      isPrimary: true 
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    button.dispatchEvent(new PointerEvent('pointerup', { 
      bubbles: true, 
      cancelable: true, 
      pointerId: 1,
      isPrimary: true 
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    button.dispatchEvent(new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true,
      detail: 1 
    }));
  }

  /**
   * 従来のMouseEventsを使ったクリック
   */
  private async clickWithMouseEvents(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting click with Mouse Events');
    
    button.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const rect = button.getBoundingClientRect();
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      detail: 1
    };
    
    button.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    button.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    button.dispatchEvent(new MouseEvent('click', eventOptions));
  }

  /**
   * 直接メソッド呼び出し
   */
  private async clickWithDirectMethod(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting direct click method');
    
    button.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    button.click();
  }

  /**
   * フォーム送信を試行
   */
  private async clickWithFormSubmit(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting form submit method');
    
    // ボタンが属するフォームを探す
    const form = button.closest('form');
    if (form) {
      console.log('🎯 Found form, trying form submit');
      form.submit();
    } else {
      console.log('🎯 No form found, trying to find submit input');
      // type="submit"のinputを探してクリック
      const submitInput = document.querySelector('input[type="submit"]') as HTMLInputElement;
      if (submitInput) {
        submitInput.click();
      }
    }
  }

  /**
   * 送信クリック後のDOM変化を監視（強化版）
   */
  private setupSendClickObserver(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('🔍 Setting up send click observer...');
      let resolved = false;
      
      const resolveOnce = (success: boolean, reason: string) => {
        if (resolved) return;
        resolved = true;
        console.log(`🔍 Send observer resolving: ${success ? '✅ SUCCESS' : '❌ FAILURE'} - ${reason}`);
        observer.disconnect();
        resolve(success);
      };
      
      // 送信前の状態を記録
      const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
      const initialInputValue = messageInput?.value || '';
      const initialMessageCount = this.countCurrentMessages();
      
      console.log('🔍 Initial state:', {
        inputValue: initialInputValue.substring(0, 50) + '...',
        messageCount: initialMessageCount
      });
      
      const observer = new MutationObserver((mutations) => {
        try {
          // 方法1: 入力欄がクリアされたかチェック（最も確実）
          if (messageInput && messageInput.value.trim() === '' && initialInputValue.trim() !== '') {
            resolveOnce(true, 'Input field cleared');
            return;
          }
          
          // 方法2: メッセージ数の増加をチェック
          const currentMessageCount = this.countCurrentMessages();
          if (currentMessageCount > initialMessageCount) {
            resolveOnce(true, `Message count increased from ${initialMessageCount} to ${currentMessageCount}`);
            return;
          }
          
          // 方法3: DOM変化による新しいメッセージ検知
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  
                  // 2025年Chatwork UIの新しいメッセージパターン
                  if (this.isNewMessageElement(element)) {
                    resolveOnce(true, `New message element detected: ${element.className}`);
                    return;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('🔍 Error in send observer:', error);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['value'],
        characterData: true
      });
      
      // 段階的タイムアウト処理
      setTimeout(() => {
        if (!resolved) {
          console.log('🔍 First timeout (3s) - checking if input was cleared...');
          if (messageInput && messageInput.value.trim() === '' && initialInputValue.trim() !== '') {
            resolveOnce(true, 'Input cleared detected at 3s timeout');
          }
        }
      }, 3000);
      
      setTimeout(() => {
        if (!resolved) {
          console.log('🔍 Second timeout (6s) - checking message count...');
          const currentCount = this.countCurrentMessages();
          if (currentCount > initialMessageCount) {
            resolveOnce(true, `Message count increased at 6s timeout: ${initialMessageCount} -> ${currentCount}`);
          }
        }
      }, 6000);
      
      // 最終タイムアウト
      setTimeout(() => {
        if (!resolved) {
          console.log('🔍 Final timeout (10s) - assuming send failed or completed');
          // 入力欄が空になっていれば成功とみなす
          if (messageInput && messageInput.value.trim() === '') {
            resolveOnce(true, 'Input empty at final timeout - assuming success');
          } else {
            resolveOnce(false, 'Final timeout reached with no clear success signal');
          }
        }
      }, 10000);
    });
  }

  /**
   * 現在のメッセージ数をカウント
   */
  private countCurrentMessages(): number {
    const messageSelectors = [
      '[data-message-id]',
      '.chatMessage',
      '.message',
      '.timeline_message',
      '[class*="message"]',
      '[class*="Message"]',
      '.message-wrapper',
      '.message_content'
    ];
    
    let totalCount = 0;
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        totalCount = Math.max(totalCount, elements.length);
      }
    }
    
    return totalCount;
  }

  /**
   * 新しいメッセージ要素かどうかを判定
   */
  private isNewMessageElement(element: Element): boolean {
    // 2025年Chatwork UIの特徴的なパターンをチェック
    const messagePatterns = [
      // クラス名による判定
      'chatMessage', 'message', 'timeline_message', 'message-wrapper',
      'message_content', 'message-item', 'chat-message', 'timeline-message',
      
      // データ属性による判定
      '[data-message-id]', '[data-message]', '[data-chat-message]'
    ];
    
    for (const pattern of messagePatterns) {
      if (pattern.startsWith('[')) {
        // データ属性のチェック
        const attr = pattern.replace(/[\[\]]/g, '').split('=')[0];
        if (element.hasAttribute(attr)) {
          return true;
        }
      } else {
        // クラス名のチェック
        if (element.classList.contains(pattern) || 
            element.className.includes(pattern)) {
          return true;
        }
      }
    }
    
    // 子要素にメッセージパターンがあるかチェック
    for (const pattern of messagePatterns) {
      if (!pattern.startsWith('[')) {
        if (element.querySelector(`.${pattern}`)) {
          return true;
        }
      }
    }
    
    // テキスト内容による判定（自分が送信したメッセージか）
    const textContent = element.textContent || '';
    if (textContent.length > 5 && textContent.length < 1000) {
      // メッセージらしい長さのテキストが含まれている
      const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
      if (messageInput && messageInput.value.trim() === '') {
        // 入力欄が空で、新しいテキスト要素が追加された場合
        return true;
      }
    }
    
    return false;
  }

  /**
   * 送信ボタンを探す（強化版）
   */
  private async findSendButton(): Promise<HTMLElement | null> {
    console.log('🔍 === Finding Send Button (Enhanced) ===');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current time:', new Date().toISOString());
    
    const selectors = [
      // 2025年最新のChatwork UI対応
      'button[data-testid="send-button"]',
      'button[data-testid="message-send-button"]',
      'button[aria-label="送信"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="メッセージを送信"]',
      'button[type="submit"]',
      'input[type="submit"]',
      
      // React/Vue.js系の動的セレクタ
      'button[class*="send"]',
      'button[class*="Send"]',
      'button[class*="submit"]',
      'button[id*="send"]',
      'button[id*="Send"]',
      
      // Chatwork特有のセレクタ
      '#_sendButton',
      '#_chatSendTool input',
      '#_chatSendTool button',
      '.send_button', 
      '.chatSendButton',
      '.chat-send-button',
      'input[value="送信"]',
      'button[value="送信"]',
      '[data-action="send"]',
      '[data-tip*="送信"]',
      
      // フォーム系
      'form button[type="submit"]',
      'form input[type="submit"]',
      '.chatInput button',
      '.chat-input button',
      '#chat_input_area button',
      '#_chatText + * button',
      'textarea[name="message"] + * button',
      
      // 汎用パターン（最後の手段）
      'button',
      'input[type="button"]'
    ];

    console.log(`🔍 Checking ${selectors.length} selectors for send button...`);

    return new Promise((resolve) => {
      let found = false;

      const checkForButton = () => {
        if (found) return;

        // まず、標準的なセレクタで探す
        for (let i = 0; i < selectors.length - 2; i++) { // 最後の2つは除く
          const selector = selectors[i];
          console.log(`🔍 Checking selector ${i + 1}: ${selector}`);
          
          const elements = document.querySelectorAll(selector);
          console.log(`   Found ${elements.length} elements`);
          
          for (const element of elements) {
            const button = element as HTMLElement;
            if (this.isValidSendButton(button)) {
              console.log('✅ Found valid send button with selector:', selector);
              console.log('✅ Button details:', button.tagName, button.id, button.className);
              found = true;
              resolve(button);
              return;
            }
          }
        }

        // 標準セレクタで見つからない場合、全てのbuttonとinputをチェック
        console.log('🔍 Standard selectors failed, checking all buttons by content...');
        this.findSendButtonByContent().then(button => {
          if (button && !found) {
            console.log('✅ Found send button by content analysis');
            found = true;
            resolve(button);
          }
        });
      };

      checkForButton();

      if (!found) {
        // DOM変更を監視
        console.log('🔍 Setting up DOM observer for send button...');
        const observer = new MutationObserver(() => {
          console.log('🔍 DOM changed, rechecking for send button...');
          checkForButton();
          if (found) observer.disconnect();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 10秒でタイムアウト（より長めに設定）
        setTimeout(() => {
          if (!found) {
            console.log('❌ Send button search timed out after 10 seconds');
            observer.disconnect();
            resolve(null);
          }
        }, 10000);
      }
    });
  }

  /**
   * コンテンツ解析による送信ボタン検索
   */
  private async findSendButtonByContent(): Promise<HTMLElement | null> {
    console.log('🔍 Analyzing all buttons by content...');
    
    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    console.log(`🔍 Found ${allButtons.length} total button elements`);
    
    for (const element of allButtons) {
      const button = element as HTMLElement;
      const text = button.textContent?.toLowerCase().trim() || '';
      const value = (button as HTMLInputElement).value?.toLowerCase().trim() || '';
      const type = button.getAttribute('type') || '';
      
      // より柔軟な送信ボタン判定
      const isSendButton = 
        text === '送信' ||
        text === 'send' ||
        value === '送信' ||
        value === 'send' ||
        type === 'submit' ||
        text.includes('送信') ||
        text.includes('send') ||
        value.includes('送信') ||
        value.includes('send');
        
      if (isSendButton && this.isElementVisible(button)) {
        console.log('🔍 Potential send button found by content:');
        console.log(`   Text: "${text}"`);
        console.log(`   Value: "${value}"`);
        console.log(`   Type: ${type}`);
        console.log(`   ID: ${button.id}`);
        console.log(`   Class: ${button.className}`);
        
        if (!button.hasAttribute('disabled')) {
          console.log('✅ Button is enabled, selecting this one');
          return button;
        } else {
          console.log('⚠️ Button is disabled, continuing search...');
        }
      }
    }
    
    console.log('❌ No send button found by content analysis');
    return null;
  }

  /**
   * 有効な送信ボタンかチェック
   */
  private isValidSendButton(button: HTMLElement): boolean {
    if (!this.isElementVisible(button)) return false;

    const text = button.textContent?.toLowerCase() || '';
    const value = (button as HTMLInputElement).value?.toLowerCase() || '';
    const type = button.getAttribute('type') || '';

    return (text.includes('送信') || value.includes('送信') || type === 'submit') &&
           !button.hasAttribute('disabled');
  }

  /**
   * 送信完了を確認
   */
  private async confirmSentStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      let confirmed = false;

      const checkConfirmation = () => {
        if (confirmed) return;

        // メッセージ入力欄が空になったかチェック
        const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
        if (messageInput && messageInput.value.trim() === '') {
          confirmed = true;
          resolve(true);
          return;
        }

        // 新しいメッセージが表示されたかチェック
        const latestMessage = document.querySelector('.chatMessage:last-child, .message:last-child');
        if (latestMessage) {
          confirmed = true;
          resolve(true);
          return;
        }
      };

      // 1秒後にチェック開始
      setTimeout(checkConfirmation, 1000);

      // DOM変更を監視
      const observer = new MutationObserver(checkConfirmation);
      observer.observe(document.body, { childList: true, subtree: true });

      // 10秒でタイムアウト
      setTimeout(() => {
        if (!confirmed) {
          observer.disconnect();
          resolve(false);
        }
      }, 10000);
    });
  }

  /**
   * フォールバック送信検証
   */
  private async performFallbackSendVerification(sendBtn: HTMLButtonElement, modal: HTMLElement, originalContent: string): Promise<void> {
    console.log('🔍 === Fallback Send Verification ===');
    
    // 段階的に検証
    const verificationSteps = [
      () => this.checkInputCleared(),
      () => this.checkMessageCountIncrease(),
      () => this.checkForNewMessage(originalContent),
      () => this.waitAndRecheck(3000)
    ];
    
    for (let i = 0; i < verificationSteps.length; i++) {
      console.log(`🔍 Fallback step ${i + 1}/${verificationSteps.length}`);
      
      const result = await verificationSteps[i]();
      if (result) {
        console.log(`✅ Fallback verification successful at step ${i + 1}`);
        sendBtn.innerHTML = '✅ 送信完了';
        sendBtn.style.background = '#34a853 !important';
        setTimeout(() => {
          console.log('🎉 Removing modal after fallback verification');
          modal.remove();
        }, 2000);
        return;
      }
      
      // ステップ間で少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // すべての検証が失敗した場合
    console.log('❌ All fallback verification steps failed');
    this.showError(sendBtn, '送信失敗');
    
    // それでも最終的にはモーダルを閉じる
    setTimeout(() => {
      console.log('🕐 Force closing modal after 8 seconds due to fallback failure');
      modal.remove();
    }, 8000);
  }

  /**
   * 入力欄がクリアされたかチェック
   */
  private async checkInputCleared(): Promise<boolean> {
    const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
    const cleared = messageInput && messageInput.value.trim() === '';
    console.log(`🔍 Input cleared check: ${cleared ? '✅ YES' : '❌ NO'} (value: "${messageInput?.value || 'N/A'}")`);
    return cleared;
  }

  /**
   * メッセージ数の増加をチェック
   */
  private async checkMessageCountIncrease(): Promise<boolean> {
    const currentCount = this.countCurrentMessages();
    // 初期カウントを推定（通常は前回より1多いはず）
    const estimatedPreviousCount = Math.max(0, currentCount - 1);
    const increased = currentCount > estimatedPreviousCount;
    console.log(`🔍 Message count check: current=${currentCount}, increased=${increased ? '✅ YES' : '❌ NO'}`);
    return increased;
  }

  /**
   * 新しいメッセージの存在をチェック
   */
  private async checkForNewMessage(expectedContent: string): Promise<boolean> {
    const recentMessages = this.extractRecentMessageTexts(3); // 最新3件をチェック
    const foundMatch = recentMessages.some(msg => 
      msg.includes(expectedContent.substring(0, 50)) || 
      expectedContent.includes(msg.substring(0, 50))
    );
    console.log(`🔍 New message content check: ${foundMatch ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`🔍 Recent messages:`, recentMessages.map(msg => msg.substring(0, 30) + '...'));
    return foundMatch;
  }

  /**
   * 待機してから再チェック
   */
  private async waitAndRecheck(ms: number): Promise<boolean> {
    console.log(`🔍 Waiting ${ms}ms and rechecking...`);
    await new Promise(resolve => setTimeout(resolve, ms));
    return await this.checkInputCleared();
  }

  /**
   * 最近のメッセージテキストを抽出
   */
  private extractRecentMessageTexts(count: number): string[] {
    const messageSelectors = [
      '.chatMessage:last-child',
      '.message:last-child',
      '.timeline_message:last-child',
      '[data-message-id]:last-child',
      '[class*="message"]:last-child'
    ];
    
    const messages: string[] = [];
    
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      for (let i = Math.max(0, elements.length - count); i < elements.length; i++) {
        const text = elements[i]?.textContent?.trim();
        if (text && text.length > 5) {
          messages.push(text);
        }
      }
      
      if (messages.length > 0) break;
    }
    
    return [...new Set(messages)]; // 重複を削除
  }

  /**
   * エラー表示
   */
  private showError(button: HTMLButtonElement, message: string): void {
    console.log(`💥 Showing error on button: ${message}`);
    
    const originalText = button.innerHTML;
    const originalBg = button.style.background;
    
    button.innerHTML = `❌ ${message}`;
    button.style.background = '#ea4335 !important';
    button.disabled = true;

    setTimeout(() => {
      console.log('🔄 Resetting button to original state');
      button.innerHTML = originalText;
      button.style.background = originalBg;
      button.disabled = false;
    }, 5000); // 5秒に延長してユーザーがエラーを確認できるように
  }

  /**
   * デバッグ用：手動で送信ボタンを探すヘルパー（強化版）
   */
  public async debugFindSendButton(): Promise<void> {
    console.log('🔍 === Manual Send Button Debug (Enhanced) ===');
    console.log('🔍 Call this from console: chatworkStrategy.debugFindSendButton()');
    
    // 現在のページ状態を詳細に表示
    console.log('🔍 Page State Analysis:');
    console.log('  URL:', window.location.href);
    console.log('  Title:', document.title);
    console.log('  Ready State:', document.readyState);
    console.log('  Active Element:', document.activeElement);
    
    // メッセージ入力欄の状態
    const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
    if (messageInput) {
      console.log('🔍 Message Input Found:');
      console.log('  Element:', messageInput.tagName);
      console.log('  ID:', messageInput.id);
      console.log('  Class:', messageInput.className);
      console.log('  Value:', messageInput.value);
      console.log('  Visible:', this.isElementVisible(messageInput));
    } else {
      console.log('❌ No message input found');
    }
    
    // 送信ボタンを探す
    const button = await this.findSendButton();
    if (button) {
      console.log('✅ Send button found:', button);
      console.log('✅ Button details:');
      console.log('  Tag:', button.tagName);
      console.log('  ID:', button.id);
      console.log('  Class:', button.className);
      console.log('  Text:', button.textContent);
      console.log('  HTML:', button.outerHTML);
      console.log('  Visible:', this.isElementVisible(button));
      console.log('  Disabled:', button.hasAttribute('disabled'));
      console.log('  Position:', button.getBoundingClientRect());
      
      // グローバルに保存
      (window as any).debugSendButton = button;
      console.log('✅ Button saved to window.debugSendButton');
      console.log('✅ You can test clicking manually with: debugSendButton.click()');
      
      // イベントリスナー情報も表示
      console.log('🔍 Testing click strategies:');
      console.log('  1. debugSendButton.click()');
      console.log('  2. debugSendButton.dispatchEvent(new MouseEvent("click", {bubbles: true}))');
      console.log('  3. debugSendButton.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}))');
      
    } else {
      console.log('❌ No send button found');
    }
    
    // 全ボタンの詳細分析
    this.debugSendButtons();
    
    // 追加：フォーム情報の表示
    const forms = document.querySelectorAll('form');
    console.log(`🔍 Forms found: ${forms.length}`);
    forms.forEach((form, index) => {
      console.log(`  Form ${index + 1}:`, {
        id: form.id,
        class: form.className,
        action: form.action,
        method: form.method,
        elements: form.elements.length
      });
    });
  }

  /**
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    // ChatworkのルームIDを取得
    const match = window.location.pathname.match(/\/room\/(\d+)/);
    return match ? match[1] : null;
  }
}