/**
 * 送信ボタンの検出・クリック管理
 * 複雑なクリック戦略を統一的に管理
 */
export class SendButtonManager {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * 送信ボタンを探してクリック
   */
  async findAndClickSendButton(selectors: string[]): Promise<boolean> {
    console.log(`🎯 ${this.serviceName}: Starting send button search...`);
    
    const button = await this.findSendButton(selectors);
    if (!button) {
      console.error(`❌ ${this.serviceName}: No send button found`);
      return false;
    }

    return await this.clickButtonWithStrategies(button);
  }

  /**
   * 送信ボタンを検索（強化版）
   */
  private async findSendButton(selectors: string[]): Promise<HTMLElement | null> {
    console.log(`🔍 ${this.serviceName}: Checking ${selectors.length} selectors...`);

    // Phase 1: 標準セレクタで即座に検索
    for (const [index, selector] of selectors.entries()) {
      console.log(`🔍 Phase 1 - Checking selector ${index + 1}/${selectors.length}: ${selector}`);
      
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const button = element as HTMLElement;
          if (this.isValidSendButton(button)) {
            console.log(`✅ Found valid send button with selector: ${selector}`);
            return button;
          }
        }
      } catch (error) {
        console.warn(`❌ Selector error: ${selector}`, error);
      }
    }

    // Phase 2: 動的要素の読み込みを待機してから再検索
    console.log(`⏳ ${this.serviceName}: Phase 1 failed, waiting for dynamic elements...`);
    await this.delay(1000);

    for (const [index, selector] of selectors.entries()) {
      console.log(`🔍 Phase 2 - Rechecking selector ${index + 1}/${selectors.length}: ${selector}`);
      
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const button = element as HTMLElement;
          if (this.isValidSendButton(button)) {
            console.log(`✅ Found valid send button in Phase 2 with selector: ${selector}`);
            return button;
          }
        }
      } catch (error) {
        console.warn(`❌ Phase 2 Selector error: ${selector}`, error);
      }
    }

    // Phase 3: より一般的なボタン検索（最後の手段）
    console.log(`🔍 ${this.serviceName}: Phase 3 - Content-based search as last resort...`);
    return await this.findSendButtonByContent();
  }

  /**
   * コンテンツ解析による送信ボタン検索（強化版）
   */
  private async findSendButtonByContent(): Promise<HTMLElement | null> {
    // 全てのクリック可能要素を検索（div[role="button"]なども含む）
    const allInteractiveElements = document.querySelectorAll(`
      button, 
      input[type="submit"], 
      input[type="button"],
      div[role="button"],
      span[role="button"],
      a[role="button"],
      [onclick],
      [data-testid*="button"],
      [class*="button"],
      [class*="btn"]
    `);
    
    console.log(`🔍 Analyzing ${allInteractiveElements.length} interactive elements...`);
    
    // 送信ボタンの可能性が高い順にソート
    const sortedElements = Array.from(allInteractiveElements).sort((a, b) => {
      return this.calculateSendButtonScore(b as HTMLElement) - this.calculateSendButtonScore(a as HTMLElement);
    });
    
    for (const element of sortedElements) {
      const button = element as HTMLElement;
      if (this.isValidSendButton(button)) {
        const score = this.calculateSendButtonScore(button);
        console.log(`🔍 Checking element with score ${score}:`, {
          tag: button.tagName,
          text: button.textContent?.substring(0, 30),
          class: button.className,
          id: button.id
        });
        
        if (score > 0) {
          console.log(`✅ Found send button by content analysis (score: ${score})`);
          return button;
        }
      }
    }
    
    // 最後の手段: フォーム内で最も右下に位置するボタンを検索
    console.log(`🔍 Last resort: Looking for form submit buttons...`);
    return this.findFormSubmitButton();
  }

  /**
   * 送信ボタンの可能性スコアを計算（ファイル関連ボタンを強力に除外）
   */
  private calculateSendButtonScore(button: HTMLElement): number {
    let score = 0;
    const text = (button.textContent || '').toLowerCase().trim();
    const value = ((button as HTMLInputElement).value || '').toLowerCase().trim();
    const type = button.getAttribute('type') || '';
    const className = button.className.toLowerCase();
    const id = button.id.toLowerCase();
    
    // ファイル関連ボタンは即座に除外
    if (this.isFileRelatedButton(button)) {
      return -100; // 完全除外
    }
    
    // 高スコア条件（完全一致）
    if (text === '送信' || text === 'send') score += 15;
    if (value === '送信' || value === 'send') score += 15;
    if (type === 'submit' && !this.isFileRelatedButton(button)) score += 10;
    
    // 中スコア条件
    if (text.includes('送信') || text.includes('send')) score += 8;
    if (className.includes('send') || className.includes('submit')) score += 6;
    if (id.includes('send') || id.includes('submit')) score += 6;
    
    // メッセージ送信に特化したスコア
    if (text.includes('メッセージ') && text.includes('送信')) score += 12;
    if (className.includes('message') && className.includes('send')) score += 10;
    
    // 低スコア条件
    if (text.includes('投稿') || text.includes('post')) score += 3;
    if (className.includes('primary') || className.includes('btn-primary')) score += 2;
    
    // 強力な除外条件
    if (text.includes('cancel') || text.includes('キャンセル')) score -= 10;
    if (text.includes('delete') || text.includes('削除')) score -= 10;
    if (text.includes('file') || text.includes('ファイル')) score -= 15;
    if (text.includes('attach') || text.includes('添付')) score -= 15;
    if (text.includes('upload') || text.includes('アップロード')) score -= 15;
    if (button.hasAttribute('disabled')) score -= 20;
    
    return score;
  }

  /**
   * フォーム内の送信ボタンを検索
   */
  private findFormSubmitButton(): HTMLElement | null {
    const forms = document.querySelectorAll('form');
    
    for (const form of forms) {
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
      
      if (submitButtons.length > 0) {
        // フォーム内で最後（最も右下）のボタンを選択
        const lastButton = submitButtons[submitButtons.length - 1] as HTMLElement;
        if (this.isValidSendButton(lastButton)) {
          console.log(`✅ Found form submit button:`, {
            tag: lastButton.tagName,
            text: lastButton.textContent?.substring(0, 30),
            form: form.id || form.className
          });
          return lastButton;
        }
      }
    }
    
    return null;
  }

  /**
   * 有効な送信ボタンかチェック（ファイル関連ボタンを除外）
   */
  private isValidSendButton(button: HTMLElement): boolean {
    if (!this.isElementVisible(button)) return false;
    if (button.hasAttribute('disabled')) return false;
    
    // ファイル関連ボタンを除外
    if (this.isFileRelatedButton(button)) {
      console.log(`❌ Excluded file-related button: ${button.textContent?.trim()}`);
      return false;
    }
    
    return true;
  }

  /**
   * ファイル関連ボタンかどうかをチェック
   */
  private isFileRelatedButton(button: HTMLElement): boolean {
    const text = (button.textContent || '').toLowerCase().trim();
    const className = button.className.toLowerCase();
    const id = button.id.toLowerCase();
    const type = (button as HTMLInputElement).type?.toLowerCase() || '';
    const onclick = button.getAttribute('onclick') || '';
    
    // ファイル関連のキーワードをチェック
    const fileKeywords = [
      'file', 'ファイル', 'upload', 'アップロード', 'attach', '添付',
      'browse', '参照', 'choose', '選択', 'select'
    ];
    
    // input[type="file"]を除外
    if (type === 'file') return true;
    
    // ファイル関連のテキストを含むボタンを除外
    if (fileKeywords.some(keyword => 
      text.includes(keyword) || 
      className.includes(keyword) || 
      id.includes(keyword) ||
      onclick.includes(keyword)
    )) {
      return true;
    }
    
    // 近くにinput[type="file"]がある場合は除外
    const nearbyFileInput = button.parentElement?.querySelector('input[type="file"]') ||
                           button.querySelector('input[type="file"]');
    if (nearbyFileInput) return true;
    
    return false;
  }

  /**
   * コンテンツから送信ボタンを判定
   */
  private isSendButtonByContent(button: HTMLElement): boolean {
    const text = (button.textContent || '').toLowerCase().trim();
    const value = ((button as HTMLInputElement).value || '').toLowerCase().trim();
    const type = button.getAttribute('type') || '';
    
    const sendPatterns = ['送信', 'send', 'submit'];
    
    return sendPatterns.some(pattern => 
      text.includes(pattern) || 
      value.includes(pattern) || 
      type === 'submit'
    );
  }

  /**
   * 複数戦略でボタンをクリック
   */
  private async clickButtonWithStrategies(button: HTMLElement): Promise<boolean> {
    console.log(`🎯 ${this.serviceName}: Attempting to click send button...`);
    console.log(`🎯 Button details:`, {
      tag: button.tagName,
      id: button.id,
      class: button.className,
      text: button.textContent?.substring(0, 50)
    });

    const strategies = [
      () => this.clickWithPointerEvents(button),
      () => this.clickWithMouseEvents(button),
      () => this.clickWithDirectMethod(button),
      () => this.clickWithFormSubmit(button)
    ];

    for (const [index, strategy] of strategies.entries()) {
      console.log(`🎯 Trying click strategy ${index + 1}/${strategies.length}`);
      
      try {
        await strategy();
        console.log(`✅ Strategy ${index + 1} executed successfully`);
        
        // 短時間待機してDOM変化を確認
        await this.delay(1500);
        
        // 送信成功をクリック後の状態で判定
        const success = await this.verifyClickSuccess();
        if (success) {
          console.log(`✅ Send button clicked successfully with strategy ${index + 1}`);
          return true;
        } else {
          console.log(`⚠️ Strategy ${index + 1} executed but verification failed`);
        }
        
      } catch (error) {
        console.warn(`❌ Strategy ${index + 1} failed:`, error);
      }
      
      await this.delay(500);
    }

    console.error(`❌ All click strategies failed`);
    return false;
  }

  /**
   * PointerEventsを使ったクリック
   */
  private async clickWithPointerEvents(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting click with Pointer Events');
    
    button.focus();
    await this.delay(100);
    
    button.dispatchEvent(new PointerEvent('pointerdown', { 
      bubbles: true, 
      cancelable: true, 
      pointerId: 1,
      isPrimary: true 
    }));
    
    await this.delay(50);
    
    button.dispatchEvent(new PointerEvent('pointerup', { 
      bubbles: true, 
      cancelable: true, 
      pointerId: 1,
      isPrimary: true 
    }));
    
    await this.delay(50);
    
    button.dispatchEvent(new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true 
    }));
  }

  /**
   * MouseEventsを使ったクリック
   */
  private async clickWithMouseEvents(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting click with Mouse Events');
    
    button.focus();
    await this.delay(100);
    
    const rect = button.getBoundingClientRect();
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };
    
    button.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    await this.delay(50);
    
    button.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    await this.delay(50);
    
    button.dispatchEvent(new MouseEvent('click', eventOptions));
  }

  /**
   * 直接メソッド呼び出し
   */
  private async clickWithDirectMethod(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting direct click method');
    
    button.focus();
    await this.delay(100);
    
    button.click();
  }

  /**
   * フォーム送信を試行
   */
  private async clickWithFormSubmit(button: HTMLElement): Promise<void> {
    console.log('🎯 Attempting form submit method');
    
    const form = button.closest('form');
    if (form) {
      console.log('🎯 Found form, trying form submit');
      form.submit();
    } else {
      console.log('🎯 No form found, trying submit input');
      const submitInput = document.querySelector('input[type="submit"]') as HTMLInputElement;
      if (submitInput) {
        submitInput.click();
      }
    }
  }

  /**
   * クリック成功を検証
   */
  private async verifyClickSuccess(): Promise<boolean> {
    console.log('🔍 Verifying click success...');
    
    // Google Chatの入力フィールドセレクタ
    const googleChatSelectors = [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="message"]',
      'div[contenteditable="true"][aria-label*="compose"]',
      'div[contenteditable="true"][data-tab="compose"]'
    ];
    
    // 一般的な入力フィールドセレクタ
    const generalSelectors = [
      '#_chatText',
      'textarea[name="message"]',
      'input[type="text"]',
      'textarea'
    ];
    
    const allSelectors = [...googleChatSelectors, ...generalSelectors];
    
    for (const selector of allSelectors) {
      try {
        const inputs = document.querySelectorAll(selector);
        for (const input of inputs) {
          const element = input as HTMLElement;
          const isEmpty = this.isInputEmpty(element);
          console.log(`🔍 Checking input with selector '${selector}': isEmpty=${isEmpty}`);
          
          if (isEmpty) {
            console.log('✅ Input field cleared - click success confirmed');
            return true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error checking selector '${selector}':`, error);
      }
    }
    
    // フォールバック: 送信ボタンが再度無効化されたかチェック
    const sendButtons = document.querySelectorAll('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="送信"]');
    for (const button of sendButtons) {
      const btn = button as HTMLButtonElement;
      if (btn.disabled) {
        console.log('✅ Send button disabled - click success confirmed');
        return true;
      }
    }
    
    console.log('❌ Click success verification failed');
    return false;
  }
  
  /**
   * 入力フィールドが空かチェック
   */
  private isInputEmpty(element: HTMLElement): boolean {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value.trim() === '';
    }
    
    // contenteditableの場合
    if (element.contentEditable === 'true') {
      const text = element.textContent || element.innerText || '';
      return text.trim() === '';
    }
    
    return false;
  }

  /**
   * 要素が表示されているかチェック
   */
  private isElementVisible(element: HTMLElement): boolean {
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
   * 遅延
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}