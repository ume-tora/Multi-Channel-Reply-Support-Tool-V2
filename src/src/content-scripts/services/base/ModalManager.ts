/**
 * モーダル表示・管理の統一クラス
 * 自動送信モーダルと確認モーダルを管理
 */
export class ModalManager {
  private serviceName: string;
  private serviceDisplayName: string;
  private serviceColor: string;

  constructor(serviceName: string, config: {
    displayName: string;
    color: string;
  }) {
    this.serviceName = serviceName;
    this.serviceDisplayName = config.displayName;
    this.serviceColor = config.color;
  }

  /**
   * 自動送信モーダルを表示
   */
  showAutoSendModal(
    text: string,
    chatInfo: { chatName: string; roomName: string },
    onSend: (content: string) => Promise<boolean>
  ): void {
    const modalId = `${this.serviceName}-autosend-modal`;
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = this.createAutoSendModal(modalId, text, chatInfo);
    document.body.appendChild(modal);
    
    this.setupAutoSendEvents(modal, onSend);
  }

  /**
   * 自動送信モーダルを作成
   */
  private createAutoSendModal(
    modalId: string,
    text: string,
    chatInfo: { chatName: string; roomName: string }
  ): HTMLElement {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = this.getModalStyles();

    modal.innerHTML = `
      <div style="${this.getModalContentStyles()}">
        <div style="color: ${this.serviceColor}; font-size: 28px; margin-bottom: 16px; font-weight: 500;">
          💬 ${this.serviceDisplayName}自動送信
        </div>
        
        <div style="color: #5f6368; font-size: 14px; margin-bottom: 24px;">
          AI生成された返信を確認して${this.serviceDisplayName}に送信してください
        </div>
        
        <div style="${this.getChatInfoStyles()}">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px;">
            <div style="color: #5f6368; font-weight: 500;">チャット:</div>
            <div style="color: #202124;">${chatInfo.chatName}</div>
            <div style="color: #5f6368; font-weight: 500;">ルーム:</div>
            <div style="color: #202124;">${chatInfo.roomName}</div>
          </div>
          
          <div style="color: #5f6368; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            📝 返信内容:
          </div>
          <textarea id="chat-content" style="${this.getTextareaStyles()}">${text}</textarea>
        </div>
        
        <div style="${this.getWarningStyles()}">
          ⚠️ <strong>重要:</strong> この機能は${this.serviceDisplayName}の送信ボタンを自動でクリックします。<br>
          内容を十分確認してから送信してください。送信後の取り消しはできません。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="send-btn" style="${this.getSendButtonStyles()}">
            📤 送信実行
          </button>
          
          <button id="cancel-btn" style="${this.getCancelButtonStyles()}">
            ✖️ キャンセル
          </button>
        </div>
        
        <div style="${this.getInstructionStyles()}">
          <strong>💡 操作手順:</strong><br>
          1. 上記の返信内容を確認・編集<br>
          2. チャット情報が正しいことを確認<br>
          3. 「送信実行」ボタンをクリック<br>
          4. 最終確認ダイアログで「送信」を選択
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * 自動送信モーダルのイベントを設定
   */
  private setupAutoSendEvents(
    modal: HTMLElement,
    onSend: (content: string) => Promise<boolean>
  ): void {
    const textarea = modal.querySelector('#chat-content') as HTMLTextAreaElement;
    const sendBtn = modal.querySelector('#send-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

    // 送信ボタンクリック
    sendBtn?.addEventListener('click', async () => {
      const content = textarea?.value || '';
      if (!content.trim()) {
        this.showButtonError(sendBtn, '内容が空です');
        return;
      }

      // 最終確認
      const confirmed = await this.showConfirmationModal({
        chatName: 'チャット',
        roomName: 'ルーム',
        message: content
      });

      if (confirmed) {
        await this.handleSendExecution(sendBtn, modal, content, onSend);
      }
    });

    // キャンセルボタンクリック
    cancelBtn?.addEventListener('click', () => modal.remove());
    
    // ESCキーで閉じる
    this.setupEscapeHandler(modal);
  }

  /**
   * 送信実行処理
   */
  private async handleSendExecution(
    sendBtn: HTMLButtonElement,
    modal: HTMLElement,
    content: string,
    onSend: (content: string) => Promise<boolean>
  ): Promise<void> {
    sendBtn.innerHTML = '🔄 送信中...';
    sendBtn.disabled = true;

    try {
      const success = await onSend(content);
      
      if (success) {
        this.showSendSuccess(sendBtn, modal);
      } else {
        await this.handleSendFailure(sendBtn, modal, content);
      }
    } catch (error) {
      console.error('💥 Send execution error:', error);
      this.showButtonError(sendBtn, '送信エラー');
      this.scheduleModalClose(modal, 8000);
    }
  }

  /**
   * 送信成功処理
   */
  private showSendSuccess(sendBtn: HTMLButtonElement, modal: HTMLElement): void {
    sendBtn.innerHTML = '✅ 送信完了';
    sendBtn.style.background = '#34a853 !important';
    console.log('🎉 Send completed successfully, closing modal in 2 seconds');
    
    setTimeout(() => {
      console.log('🎉 Removing modal after successful send');
      modal.remove();
    }, 2000);
  }

  /**
   * 送信失敗処理（フォールバック検証付き）
   */
  private async handleSendFailure(
    sendBtn: HTMLButtonElement,
    modal: HTMLElement,
    content: string
  ): Promise<void> {
    console.log('⚠️ Send reported as failed, starting fallback verification...');
    
    // 簡単なフォールバック：入力欄が空かチェック
    const messageInput = document.querySelector('#_chatText, textarea[name="message"]') as HTMLTextAreaElement;
    if (messageInput && messageInput.value.trim() === '') {
      console.log('✅ Input field is empty, assuming send was successful');
      this.showSendSuccess(sendBtn, modal);
      return;
    }

    // 失敗として処理
    console.log('❌ Send failed and input not cleared');
    this.showButtonError(sendBtn, '送信失敗');
    this.scheduleModalClose(modal, 8000);
  }

  /**
   * 確認モーダルを表示
   */
  private showConfirmationModal(data: {
    chatName: string;
    roomName: string;
    message: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmModalId = `${this.serviceName}-confirm-modal`;
      const existing = document.getElementById(confirmModalId);
      if (existing) existing.remove();

      const confirmModal = document.createElement('div');
      confirmModal.id = confirmModalId;
      confirmModal.style.cssText = this.getConfirmModalStyles();

      confirmModal.innerHTML = `
        <div style="${this.getConfirmModalContentStyles()}">
          <div style="color: #ea4335; font-size: 24px; margin-bottom: 24px; font-weight: bold;">
            🚨 最終確認
          </div>
          
          <div style="${this.getConfirmContentStyles()}">
            <div style="margin-bottom: 12px;"><strong>メッセージ:</strong></div>
            <div style="${this.getMessagePreviewStyles()}">
              ${data.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="color: #d93025; font-size: 14px; margin-bottom: 24px; font-weight: 500;">
            この内容で${this.serviceDisplayName}にメッセージを送信します。送信後の取り消しはできません。
          </div>
          
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="final-send-btn" style="${this.getConfirmSendButtonStyles()}">
              📤 確認しました。送信実行
            </button>
            
            <button id="final-cancel-btn" style="${this.getConfirmCancelButtonStyles()}">
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

      // 背景クリックで閉じる
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          confirmModal.remove();
          resolve(false);
        }
      });
    });
  }

  /**
   * ボタンエラー表示
   */
  private showButtonError(button: HTMLButtonElement, message: string): void {
    const originalText = button.innerHTML;
    const originalBg = button.style.background;
    
    button.innerHTML = `❌ ${message}`;
    button.style.background = '#ea4335 !important';
    button.disabled = true;

    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = originalBg;
      button.disabled = false;
    }, 5000);
  }

  /**
   * モーダルを指定時間後に閉じる
   */
  private scheduleModalClose(modal: HTMLElement, delay: number): void {
    setTimeout(() => {
      console.log(`🕐 Force closing modal after ${delay}ms`);
      modal.remove();
    }, delay);
  }

  /**
   * ESCキーハンドラーを設定
   */
  private setupEscapeHandler(modal: HTMLElement): void {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // === スタイル定義メソッド ===
  private getModalStyles(): string {
    return `
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
  }

  private getModalContentStyles(): string {
    return `
      background: white !important;
      border-radius: 16px !important;
      padding: 32px !important;
      max-width: 700px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3) !important;
      text-align: center !important;
    `;
  }

  private getChatInfoStyles(): string {
    return `
      background: #f8f9fa !important;
      border: 2px solid ${this.serviceColor} !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin: 20px 0 !important;
      text-align: left !important;
    `;
  }

  private getTextareaStyles(): string {
    return `
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
    `;
  }

  private getWarningStyles(): string {
    return `
      background: #fef7e0 !important;
      border: 1px solid #f9ab00 !important;
      border-radius: 8px !important;
      padding: 16px !important;
      margin: 20px 0 !important;
      font-size: 13px !important;
      color: #b06000 !important;
    `;
  }

  private getSendButtonStyles(): string {
    return `
      background: ${this.serviceColor} !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      min-width: 140px !important;
    `;
  }

  private getCancelButtonStyles(): string {
    return `
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
    `;
  }

  private getInstructionStyles(): string {
    return `
      margin-top: 24px !important;
      padding: 16px !important;
      background: #e3f2fd !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      color: ${this.serviceColor} !important;
      text-align: left !important;
    `;
  }

  private getConfirmModalStyles(): string {
    return `
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
  }

  private getConfirmModalContentStyles(): string {
    return `
      background: white !important;
      border-radius: 16px !important;
      padding: 32px !important;
      max-width: 600px !important;
      width: 90% !important;
      max-height: 70vh !important;
      overflow-y: auto !important;
      text-align: center !important;
    `;
  }

  private getConfirmContentStyles(): string {
    return `
      text-align: left !important;
      margin-bottom: 24px !important;
      background: #f8f9fa !important;
      padding: 20px !important;
      border-radius: 8px !important;
    `;
  }

  private getMessagePreviewStyles(): string {
    return `
      background: white !important;
      padding: 12px !important;
      border-radius: 4px !important;
      max-height: 150px !important;
      overflow-y: auto !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    `;
  }

  private getConfirmSendButtonStyles(): string {
    return `
      background: ${this.serviceColor} !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: bold !important;
      cursor: pointer !important;
    `;
  }

  private getConfirmCancelButtonStyles(): string {
    return `
      background: #5f6368 !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      cursor: pointer !important;
    `;
  }
}