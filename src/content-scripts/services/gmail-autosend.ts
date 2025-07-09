import type { ServiceStrategy, Message } from './interface';

/**
 * Gmail 自動送信戦略
 * 安全性を最優先とした自動送信機能付きモーダル
 */
export class GmailAutoSendStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-gmail-autosend';
  private static readonly MODAL_ID = 'gmail-autosend-modal';
  private static readonly CONFIRM_MODAL_ID = 'gmail-confirm-modal';

  getServiceName(): 'gmail' {
    return 'gmail';
  }

  /**
   * ボタン配置点を探す
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    console.log('🔍 Gmail AutoSend: Starting insertion point search...');
    
    if (!this.isComposeWindowOpen()) {
      console.log('📝 No compose window detected');
      return null;
    }

    console.log('✅ Compose window detected');
    
    // ツールバーエリアを探す
    const toolbarArea = this.findToolbarArea();
    if (toolbarArea) {
      console.log('✅ Found toolbar area');
      return toolbarArea;
    }

    // 送信ボタン周辺エリアを探す
    const sendButtonArea = this.findSendButtonArea();
    if (sendButtonArea) {
      console.log('✅ Found send button area');
      return sendButtonArea;
    }

    // 作成エリア全体
    const composeArea = this.findComposeArea();
    return composeArea;
  }

  /**
   * 作成ウィンドウが開いているかチェック
   */
  private isComposeWindowOpen(): boolean {
    console.log('🔍 Checking for compose window...');
    
    const composeSelectors = [
      // 2024年現在のGmail作成ウィンドウ用セレクタ
      'div[role="dialog"][aria-label*="作成"]',
      'div[role="dialog"][aria-label*="compose"]',
      'div[role="dialog"][aria-label*="新しいメッセージ"]',
      'div[role="dialog"][aria-label*="New message"]',
      
      // 作成ウィンドウのツールバー
      'div[aria-label="書式設定オプション"]',
      'div[aria-label="Formatting options"]',
      
      // 作成ウィンドウのテキストエリア
      'div[aria-label*="メッセージ本文"]',
      'div[aria-label*="Message body"]',
      'div[contenteditable="true"][aria-label*="compose"]',
      'div[contenteditable="true"][role="textbox"]',
      
      // レガシーセレクタ（フォールバック）
      '.nH .if',
      'div.AD',
      'div[jscontroller][jsaction*="compose"]',
      
      // より一般的なダイアログ検出
      'div[role="dialog"]:has(div[contenteditable="true"])',
      'div[role="dialog"]:has(button[data-tooltip*="送信"])',
      'div[role="dialog"]:has(button[aria-label*="送信"])',
      'div[role="dialog"]:has(button[data-tooltip*="Send"])',
      'div[role="dialog"]:has(button[aria-label*="Send"])'
    ];

    for (let i = 0; i < composeSelectors.length; i++) {
      const selector = composeSelectors[i];
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found compose window with selector ${i + 1}/${composeSelectors.length}: ${selector}`);
          return true;
        } else {
          console.log(`❌ Selector ${i + 1}/${composeSelectors.length} failed: ${selector}`);
        }
      } catch (error) {
        console.log(`❌ Error with selector ${i + 1}/${composeSelectors.length}: ${selector}`, error);
      }
    }

    console.log('❌ No compose window found with any selector');
    return false;
  }

  /**
   * ツールバーエリアを探す
   */
  private findToolbarArea(): HTMLElement | null {
    console.log('🔍 Searching for toolbar area...');
    
    const toolbarSelectors = [
      // 現在のGmailツールバー
      'div[aria-label="書式設定オプション"]',
      'div[aria-label="Formatting options"]',
      'div[role="toolbar"]',
      'div[role="dialog"] div[role="toolbar"]',
      
      // 作成ウィンドウ内のツールバー
      'div[aria-label*="メッセージ本文"] + div',
      'div[aria-label*="Message body"] + div',
      'div[contenteditable="true"] + div[role="toolbar"]',
      
      // レガシーセレクタ
      '.btC',
      '.gU',
      'div[jscontroller][jsaction*="toolbar"]',
      
      // 送信ボタン周辺
      'div:has(button[data-tooltip*="送信"])',
      'div:has(button[aria-label*="送信"])',
      'div:has(button[data-tooltip*="Send"])',
      'div:has(button[aria-label*="Send"])'
    ];

    for (let i = 0; i < toolbarSelectors.length; i++) {
      const selector = toolbarSelectors[i];
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found toolbar with selector ${i + 1}/${toolbarSelectors.length}: ${selector}`);
          return element;
        } else {
          console.log(`❌ Toolbar selector ${i + 1}/${toolbarSelectors.length} failed: ${selector}`);
        }
      } catch (error) {
        console.log(`❌ Error with toolbar selector ${i + 1}/${toolbarSelectors.length}: ${selector}`, error);
      }
    }

    console.log('❌ No toolbar area found');
    return null;
  }

  /**
   * 送信ボタンエリアを探す
   */
  private findSendButtonArea(): HTMLElement | null {
    const sendButton = this.findSendButton();
    if (sendButton) {
      return sendButton.parentElement || sendButton;
    }

    return null;
  }

  /**
   * 作成エリアを探す
   */
  private findComposeArea(): HTMLElement | null {
    console.log('🔍 Searching for compose area...');
    
    const composeSelectors = [
      // 現在のGmail作成ダイアログ
      'div[role="dialog"][aria-label*="作成"]',
      'div[role="dialog"][aria-label*="compose"]',
      'div[role="dialog"][aria-label*="新しいメッセージ"]',
      'div[role="dialog"][aria-label*="New message"]',
      
      // 一般的なダイアログ
      'div[role="dialog"]',
      
      // レガシーセレクタ
      '.nH .if',
      'div.AD',
      
      // フォールバック - ページ内のメイン要素
      'div[role="main"]',
      'main',
      'body'
    ];

    for (let i = 0; i < composeSelectors.length; i++) {
      const selector = composeSelectors[i];
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found compose area with selector ${i + 1}/${composeSelectors.length}: ${selector}`);
          return element;
        } else {
          console.log(`❌ Compose area selector ${i + 1}/${composeSelectors.length} failed: ${selector}`);
        }
      } catch (error) {
        console.log(`❌ Error with compose area selector ${i + 1}/${composeSelectors.length}: ${selector}`, error);
      }
    }

    console.log('❌ No compose area found');
    return null;
  }

  /**
   * 要素が表示されているかチェック
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    return !!document.getElementById(GmailAutoSendStrategy.BUTTON_ID);
  }

  /**
   * メール内容を抽出
   */
  extractMessages(): Message[] {
    console.log('📧 Gmail AutoSend: Extracting email content...');
    
    const messages: Message[] = [];
    
    // 既存のメールスレッドから最新のメッセージを抽出
    const emailBodies = this.extractEmailBodies();
    
    emailBodies.forEach((body, index) => {
      if (body.trim()) {
        messages.push({
          author: index === emailBodies.length - 1 ? '最新の送信者' : '過去の送信者',
          text: body.trim()
        });
      }
    });

    console.log(`📧 Extracted ${messages.length} email messages`);
    return messages.slice(-5); // 最新5件
  }

  /**
   * メール本文を抽出
   */
  private extractEmailBodies(): string[] {
    const bodies: string[] = [];
    
    // Gmailの会話ビューからメール本文を抽出
    const messageSelectors = [
      'div[role="listitem"] div.ii.gt',
      '.message .ii.gt',
      '.gmail_quote',
      'div[dir="ltr"]'
    ];

    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        const text = element.textContent?.trim();
        if (text && text.length > 10 && text.length < 5000) {
          bodies.push(text);
        }
      });
      
      if (bodies.length > 0) break;
    }

    return bodies;
  }

  /**
   * 返信処理（自動送信モーダル版）
   */
  async insertReply(text: string): Promise<void> {
    console.log('📧 Gmail AutoSend: Showing auto-send modal...');
    this.showAutoSendModal(text);
  }

  /**
   * 自動送信モーダルを表示
   */
  private showAutoSendModal(text: string): void {
    // 既存のモーダルを削除
    const existing = document.getElementById(GmailAutoSendStrategy.MODAL_ID);
    if (existing) existing.remove();

    // メール情報を取得
    const emailInfo = this.extractEmailInfo();

    // モーダル作成
    const modal = document.createElement('div');
    modal.id = GmailAutoSendStrategy.MODAL_ID;
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
      font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
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
        <div style="color: #1a73e8; font-size: 28px; margin-bottom: 16px; font-weight: 500;">
          📧 Gmail自動送信
        </div>
        
        <div style="color: #5f6368; font-size: 14px; margin-bottom: 24px;">
          AI生成された返信を確認して送信してください
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 2px solid #1a73e8 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
        ">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px;">
            <div style="color: #5f6368; font-weight: 500;">宛先:</div>
            <div style="color: #202124;">${emailInfo.to}</div>
            <div style="color: #5f6368; font-weight: 500;">件名:</div>
            <div style="color: #202124;">${emailInfo.subject}</div>
          </div>
          
          <div style="color: #5f6368; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            📝 返信内容:
          </div>
          <textarea id="email-content" style="
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
          ⚠️ <strong>重要:</strong> この機能はGmailの送信ボタンを自動でクリックします。<br>
          内容を十分確認してから送信してください。送信後の取り消しはできません。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="send-btn" style="
            background: #1a73e8 !important;
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
          background: #e8f0fe !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #1a73e8 !important;
          text-align: left !important;
        ">
          <strong>💡 操作手順:</strong><br>
          1. 上記の返信内容を確認・編集<br>
          2. 宛先と件名が正しいことを確認<br>
          3. 「送信実行」ボタンをクリック<br>
          4. 最終確認ダイアログで「送信」を選択
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupAutoSendModalEvents(modal, emailInfo);
  }

  /**
   * メール情報を抽出
   */
  private extractEmailInfo(): { to: string; subject: string } {
    const toField = document.querySelector('input[name="to"], span[email]')?.textContent || 
                   document.querySelector('div[email]')?.getAttribute('email') || 
                   '確認できませんでした';
    
    const subjectField = document.querySelector('input[name="subjectbox"], input[placeholder*="件名"], input[placeholder*="Subject"]') as HTMLInputElement;
    const subject = subjectField?.value || 
                   document.querySelector('h2')?.textContent || 
                   '確認できませんでした';

    return {
      to: toField,
      subject: subject
    };
  }

  /**
   * 自動送信モーダルのイベントを設定
   */
  private setupAutoSendModalEvents(modal: HTMLElement, emailInfo: { to: string; subject: string }): void {
    const textarea = modal.querySelector('#email-content') as HTMLTextAreaElement;
    const sendBtn = modal.querySelector('#send-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

    // 送信ボタンクリック
    sendBtn?.addEventListener('click', async () => {
      const content = textarea?.value || '';
      if (!content.trim()) {
        this.showError(sendBtn, '内容が空です');
        return;
      }

      // 内容検証
      const risks = this.validateEmailContent(content);
      if (risks.length > 0) {
        const proceed = await this.showRiskWarning(risks);
        if (!proceed) return;
      }

      // 最終確認ダイアログ
      const confirmed = await this.showFinalConfirmation({
        to: emailInfo.to,
        subject: emailInfo.subject,
        body: content
      });

      if (confirmed) {
        sendBtn.innerHTML = '🔄 送信中...';
        sendBtn.disabled = true;

        const success = await this.executeGmailSend(content);
        
        if (success) {
          sendBtn.innerHTML = '✅ 送信完了';
          sendBtn.style.background = '#34a853 !important';
          setTimeout(() => modal.remove(), 2000);
        } else {
          this.showError(sendBtn, '送信失敗');
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
   * メール内容を検証
   */
  private validateEmailContent(content: string): string[] {
    const risks: string[] = [];
    
    // 危険なパターンの検出
    if (content.includes('機密') || content.includes('confidential')) {
      risks.push('機密情報が含まれている可能性があります');
    }
    
    if (content.length < 10) {
      risks.push('メール本文が短すぎる可能性があります');
    }
    
    if (!content.includes('。') && !content.includes('.')) {
      risks.push('文章が不完全な可能性があります');
    }

    return risks;
  }

  /**
   * リスク警告を表示
   */
  private showRiskWarning(risks: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: white !important;
        border: 2px solid #ea4335 !important;
        border-radius: 12px !important;
        padding: 24px !important;
        z-index: 99999999 !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3) !important;
        max-width: 400px !important;
        text-align: center !important;
      `;

      warning.innerHTML = `
        <div style="color: #ea4335; font-size: 20px; margin-bottom: 16px; font-weight: bold;">
          ⚠️ 警告
        </div>
        <div style="margin-bottom: 16px;">
          ${risks.map(risk => `• ${risk}`).join('<br>')}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="proceed-btn" style="background: #ea4335; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            続行
          </button>
          <button id="stop-btn" style="background: #5f6368; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            中止
          </button>
        </div>
      `;

      document.body.appendChild(warning);

      warning.querySelector('#proceed-btn')?.addEventListener('click', () => {
        warning.remove();
        resolve(true);
      });

      warning.querySelector('#stop-btn')?.addEventListener('click', () => {
        warning.remove();
        resolve(false);
      });
    });
  }

  /**
   * 最終確認ダイアログを表示
   */
  private showFinalConfirmation(emailData: { to: string; subject: string; body: string }): Promise<boolean> {
    return new Promise((resolve) => {
      const existing = document.getElementById(GmailAutoSendStrategy.CONFIRM_MODAL_ID);
      if (existing) existing.remove();

      const confirmModal = document.createElement('div');
      confirmModal.id = GmailAutoSendStrategy.CONFIRM_MODAL_ID;
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
            <div style="margin-bottom: 12px;"><strong>宛先:</strong> ${emailData.to}</div>
            <div style="margin-bottom: 12px;"><strong>件名:</strong> ${emailData.subject}</div>
            <div style="margin-bottom: 12px;"><strong>本文:</strong></div>
            <div style="background: white; padding: 12px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 13px; line-height: 1.4;">
              ${emailData.body.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="color: #d93025; font-size: 14px; margin-bottom: 24px; font-weight: 500;">
            この内容でメールを送信します。送信後の取り消しはできません。
          </div>
          
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="final-send-btn" style="
              background: #1a73e8 !important;
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

      // モーダル外クリックで閉じる
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          confirmModal.remove();
          resolve(false);
        }
      });
    });
  }


  /**
   * Gmail送信を実行
   */
  private async executeGmailSend(content: string): Promise<boolean> {
    try {
      console.log('📤 Executing Gmail send...');
      
      // Step 1: メール内容を入力欄に設定
      const success = await this.insertContentToGmail(content);
      if (!success) {
        console.log('❌ Failed to insert content');
        return false;
      }

      // Step 2: 送信ボタンを見つけてクリック
      const sendButton = await this.findAndClickSendButton();
      if (!sendButton) {
        console.log('❌ Send button not found or click failed');
        return false;
      }

      // Step 3: 送信完了を確認
      const sent = await this.confirmSentStatus();
      console.log(sent ? '✅ Email sent successfully' : '❌ Email send confirmation failed');
      
      return sent;
    } catch (error) {
      console.error('❌ Gmail send execution failed:', error);
      return false;
    }
  }

  /**
   * Gmailの入力欄にコンテンツを挿入
   */
  private async insertContentToGmail(content: string): Promise<boolean> {
    const composeBody = await this.findComposeBody();
    if (!composeBody) return false;

    try {
      // フォーカスして内容を設定
      composeBody.focus();
      
      // 既存内容をクリア
      composeBody.innerHTML = '';
      
      // 新しい内容を設定
      composeBody.innerHTML = content.replace(/\n/g, '<br>');
      
      // イベントを発火
      const events = ['input', 'change', 'keyup'];
      events.forEach(eventType => {
        composeBody.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      console.log('✅ Content inserted to Gmail compose body');
      return true;
    } catch (error) {
      console.error('❌ Failed to insert content:', error);
      return false;
    }
  }

  /**
   * 作成エリアの本文部分を探す
   */
  private async findComposeBody(): Promise<HTMLElement | null> {
    const selectors = [
      'div[role="textbox"][aria-label*="compose"]',
      'div[role="textbox"][aria-label*="作成"]',
      'div[contenteditable="true"][role="textbox"]',
      'div.Am.Al.editable',
      'div[g_editable="true"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * 送信ボタンを見つけてクリック
   */
  private async findAndClickSendButton(): Promise<boolean> {
    const sendButton = await this.findSendButton();
    if (!sendButton) return false;

    try {
      // ボタンクリック
      sendButton.click();
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // フォーカスしてもう一度クリック（確実性のため）
      sendButton.focus();
      sendButton.click();
      
      console.log('✅ Send button clicked');
      return true;
    } catch (error) {
      console.error('❌ Failed to click send button:', error);
      return false;
    }
  }

  /**
   * 送信ボタンを探す
   */
  private async findSendButton(): Promise<HTMLElement | null> {
    const selectors = [
      'div[role="button"][data-tooltip*="Send"]',
      'div[role="button"][aria-label*="Send"]',
      'div[role="button"][data-tooltip*="送信"]',
      'div[role="button"][aria-label*="送信"]',
      'div[command="Send"]',
      'div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3',
      'td.gU.Up > div[role="button"]'
    ];

    // MutationObserverで動的要素の出現を監視
    return new Promise((resolve) => {
      let found = false;
      
      const checkForButton = () => {
        if (found) return;
        
        for (const selector of selectors) {
          const button = document.querySelector(selector) as HTMLElement;
          if (button && this.isValidSendButton(button)) {
            found = true;
            resolve(button);
            return;
          }
        }
      };

      // 即座にチェック
      checkForButton();
      
      if (!found) {
        // MutationObserver でDOM変更を監視
        const observer = new MutationObserver(() => {
          checkForButton();
          if (found) observer.disconnect();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // タイムアウト
        setTimeout(() => {
          if (!found) {
            observer.disconnect();
            resolve(null);
          }
        }, 5000);
      }
    });
  }

  /**
   * 有効な送信ボタンかチェック
   */
  private isValidSendButton(button: HTMLElement): boolean {
    if (!this.isElementVisible(button)) return false;
    
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    const tooltip = button.getAttribute('data-tooltip')?.toLowerCase() || '';
    
    return (
      text.includes('send') || text.includes('送信') ||
      ariaLabel.includes('send') || ariaLabel.includes('送信') ||
      tooltip.includes('send') || tooltip.includes('送信')
    ) && !button.hasAttribute('disabled');
  }

  /**
   * 送信完了を確認
   */
  private async confirmSentStatus(): Promise<boolean> {
    // 送信完了の確認パターン
    const confirmationSelectors = [
      'div[data-message-id]', // 送信されたメッセージ
      'span:contains("送信済み")',
      'span:contains("Sent")',
      '.vh', // 送信完了通知
    ];

    return new Promise((resolve) => {
      let confirmed = false;
      
      const checkConfirmation = () => {
        if (confirmed) return;
        
        // 作成画面が閉じられたかチェック
        const composeOpen = this.isComposeWindowOpen();
        if (!composeOpen) {
          confirmed = true;
          resolve(true);
          return;
        }
        
        // 送信完了通知をチェック
        for (const selector of confirmationSelectors) {
          if (document.querySelector(selector)) {
            confirmed = true;
            resolve(true);
            return;
          }
        }
      };

      // 初回チェック
      setTimeout(checkConfirmation, 1000);
      
      // 継続監視
      const observer = new MutationObserver(checkConfirmation);
      observer.observe(document.body, { childList: true, subtree: true });
      
      // タイムアウト (10秒)
      setTimeout(() => {
        if (!confirmed) {
          observer.disconnect();
          resolve(false);
        }
      }, 10000);
    });
  }

  /**
   * エラー表示
   */
  private showError(button: HTMLButtonElement, message: string): void {
    const originalText = button.innerHTML;
    const originalBg = button.style.background;
    
    button.innerHTML = `❌ ${message}`;
    button.style.background = '#ea4335 !important';
    button.disabled = true;
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = originalBg;
      button.disabled = false;
    }, 3000);
  }

  /**
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    const match = window.location.hash.match(/#.*\/([^\/]+)$/);
    return match ? match[1] : null;
  }
}