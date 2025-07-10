import type { Message } from './interface';
import { BaseAutoSendStrategy } from './base/BaseAutoSendStrategy';
import { SendButtonManager } from './base/SendButtonManager';
import { ModalManager } from './base/ModalManager';
import { CHATWORK_CONFIG } from './base/ServiceConfigs';

/**
 * Chatwork 自動送信戦略 (リファクタリング版)
 * 責任を分離し、可読性と保守性を向上
 */
export class ChatworkAutoSendStrategy extends BaseAutoSendStrategy {
  private sendButtonManager: SendButtonManager;
  private modalManager: ModalManager;

  constructor() {
    super();
    this.sendButtonManager = new SendButtonManager(CHATWORK_CONFIG.serviceName);
    this.modalManager = new ModalManager(CHATWORK_CONFIG.serviceName, {
      displayName: CHATWORK_CONFIG.displayName,
      color: CHATWORK_CONFIG.color
    });
  }

  getServiceName(): 'chatwork' {
    return 'chatwork';
  }

  /**
   * ボタン配置点を探す
   */
  async findInsertionPoint(): Promise<HTMLElement | null> {
    this.logInfo('Starting insertion point search...');
    this.debugPageStructure();
    
    if (!this.isChatworkPage()) {
      this.logInfo('Not on Chatwork chat page');
      this.debugPageDetection();
      return null;
    }

    this.logSuccess('Chatwork chat page detected');
    
    // 優先順位順で検索（非同期対応）
    const searchMethods = [
      { name: 'Input Area', method: () => this.findInputArea() },
      { name: 'Chat Form', method: () => this.findChatForm() },
      { name: 'Chat Container', method: () => this.findChatContainer() }
    ];

    for (const searchMethod of searchMethods) {
      this.logInfo(`Trying search method: ${searchMethod.name}`);
      const element = await searchMethod.method();
      if (element) {
        this.logSuccess(`Found insertion point via ${searchMethod.name}: ${element.tagName}.${element.className}`);
        return element;
      }
    }

    this.logError('insertion point search', 'No suitable insertion point found');
    this.debugInsertionPointFailure();
    return null;
  }

  /**
   * メッセージを抽出
   */
  extractMessages(): Message[] {
    this.logInfo('Extracting messages...');
    this.debugMessageStructure();
    
    const messageData = this.extractMessageData();
    const messages: Message[] = [];

    messageData.forEach((data, index) => {
      if (data.text.trim() && this.isValidMessageText(data.text)) {
        messages.push({
          author: data.author || `ユーザー${index + 1}`,
          text: data.text.trim(),
          timestamp: data.timestamp || new Date()
        });
      }
    });

    console.log('🔍 Chatwork: Extracted message data:', messageData);
    console.log('🔍 Chatwork: Processed messages:', messages);
    this.logInfo(`Extracted ${messages.length} valid messages from ${messageData.length} raw data`);
    
    if (messages.length === 0) {
      this.debugMessageExtractionFailure();
    }
    
    return messages.slice(-5); // 最新5件のみ
  }

  /**
   * 返信処理（モーダル表示）
   */
  async insertReply(text: string): Promise<void> {
    this.logInfo('Showing auto-send modal...');
    
    const chatInfo = this.extractChatInfo();
    
    this.modalManager.showAutoSendModal(
      text,
      chatInfo,
      (content: string) => this.executeSend(content)
    );
  }

  /**
   * スレッドIDを取得
   */
  getThreadId(): string | null {
    const match = window.location.pathname.match(/\/room\/(\d+)/);
    return match ? match[1] : null;
  }

  // === プライベートメソッド ===

  /**
   * Chatworkページかチェック
   */
  private isChatworkPage(): boolean {
    this.logInfo('Checking for Chatwork page...');
    
    const urlCheck = this.isValidChatworkUrl();
    if (!urlCheck) {
      this.logInfo('Not a valid Chatwork URL');
      return false;
    }
    
    const elementCheck = this.hasChatworkElements();
    const result = urlCheck && elementCheck;
    
    this.logInfo(`Final Chatwork page check: ${result ? 'Valid' : 'Invalid'}`);
    return result;
  }

  /**
   * 有効なChatworkのURLかチェック
   */
  private isValidChatworkUrl(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    const isDomain = CHATWORK_CONFIG.urlPatterns.some(pattern => 
      hostname.includes(pattern)
    );
    
    const hasRoomId = search.includes('rid=') || pathname.includes('/room/');
    
    return isDomain && (hasRoomId || pathname === '/' || search.includes('rid='));
  }

  /**
   * Chatworkの特徴的な要素が存在するかチェック
   */
  private hasChatworkElements(): boolean {
    for (const selector of CHATWORK_CONFIG.pageDetectionSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        const visibleElements = Array.from(elements).filter(el => 
          this.isElementVisible(el as HTMLElement)
        );
        
        if (visibleElements.length > 0) {
          this.logInfo(`Found ${visibleElements.length} visible elements with: ${selector}`);
          return true;
        }
      } catch {
        // セレクタエラーは無視
      }
    }
    
    return false;
  }

  /**
   * 入力エリアを探す（待機機能付き）
   */
  private async findInputArea(): Promise<HTMLElement | null> {
    // 最初に即座に検索
    let element = this.findElementBySelectors([
      '#chat_input_area',
      '.chatInput',
      '#_chatSendTool',
      'div[class*="input"]',
      'div[class*="chat"]'
    ]);
    
    if (element) return element;
    
    // 見つからない場合は要素の読み込みを待機
    this.logInfo('Input area not immediately found, waiting for dynamic load...');
    
    element = await this.waitForElement([
      '#chat_input_area',
      '.chatInput',
      '#_chatSendTool',
      'div[class*="input"]',
      'textarea',
      '[contenteditable="true"]'
    ].join(', '), 3000);
    
    return element as HTMLElement;
  }

  /**
   * チャット入力フォームを探す（待機機能付き）
   */
  private async findChatForm(): Promise<HTMLElement | null> {
    let element = this.findElementBySelectors([
      'form:has(#_chatText)',
      'form:has(textarea[name="message"])',
      '.chat-form',
      '.message-form',
      'form[class*="chat"]',
      'form[class*="message"]'
    ]);
    
    if (element) return element;
    
    this.logInfo('Chat form not immediately found, waiting...');
    element = await this.waitForElement('form', 2000);
    
    return element as HTMLElement;
  }

  /**
   * チャットコンテナを探す（待機機能付き）
   */
  private async findChatContainer(): Promise<HTMLElement | null> {
    let element = this.findElementBySelectors([
      '#chatWorkSpace',
      '#_mainContent',
      '.chat-container',
      '.main-content',
      'div[class*="workspace"]',
      'div[class*="main"]'
    ]);
    
    if (element) return element;
    
    this.logInfo('Chat container not immediately found, waiting...');
    element = await this.waitForElement([
      '#chatWorkSpace',
      '#_mainContent',
      'main',
      '[role="main"]'
    ].join(', '), 2000);
    
    return element as HTMLElement;
  }

  /**
   * メッセージテキストを抽出
   */
  private extractMessageData(): Array<{text: string; author?: string; timestamp?: Date}> {
    const messageData: Array<{text: string; author?: string; timestamp?: Date}> = [];
    
    // メッセージコンテナを探す
    const messageContainers = this.findMessageContainers();
    
    messageContainers.forEach(container => {
      const text = this.extractSingleMessageText(container);
      if (text) {
        const author = this.extractAuthorFromContainer(container);
        const timestamp = this.extractTimestampFromContainer(container);
        
        messageData.push({
          text,
          author,
          timestamp
        });
      }
    });

    // 重複を削除（テキストベース）
    const uniqueData = messageData.filter((data, index, array) => 
      array.findIndex(d => d.text === data.text) === index
    );
    
    return uniqueData;
  }
  
  private extractMessageTexts(): string[] {
    const messageTexts: string[] = [];
    
    // メッセージコンテナを探す
    const messageContainers = this.findMessageContainers();
    
    messageContainers.forEach(container => {
      const messageText = this.extractSingleMessageText(container);
      if (messageText) {
        messageTexts.push(messageText);
      }
    });

    // 重複を削除
    return [...new Set(messageTexts)];
  }

  /**
   * メッセージコンテナを検索（強化版）
   */
  private findMessageContainers(): Element[] {
    // 設定されたセレクタで検索
    for (const selector of CHATWORK_CONFIG.messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        this.logInfo(`Found ${elements.length} message containers using: ${selector}`);
        return Array.from(elements);
      }
    }

    // フォールバック1：タイムライン内の要素
    const timeline = document.querySelector('#_timeLine, .timeline, .chat-timeline, [class*="timeline"], [class*="message-list"], [class*="chat-list"]');
    if (timeline) {
      const children = Array.from(timeline.children).filter(child => {
        const text = child.textContent?.trim() || '';
        return text.length > 10 && this.isValidMessageText(text);
      });
      this.logInfo(`Found ${children.length} potential message elements in timeline`);
      if (children.length > 0) {
        return children;
      }
    }

    // フォールバック2：より一般的なメッセージ要素
    const fallbackSelectors = [
      'div[class*="message"]:not([class*="input"])',
      'li[class*="message"]',
      'div[class*="chat"]:not([class*="input"])',
      'li[class*="chat"]',
      '[role="listitem"]',
      'div[data-*="message"]',
      'div[data-*="chat"]'
    ];

    for (const selector of fallbackSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const validElements = Array.from(elements).filter(el => {
            const text = el.textContent?.trim() || '';
            return text.length > 10 && this.isValidMessageText(text);
          });
          if (validElements.length > 0) {
            this.logInfo(`Found ${validElements.length} message containers using fallback: ${selector}`);
            return validElements;
          }
        }
      } catch {
        // セレクタエラーは無視
      }
    }

    return [];
  }

  /**
   * 単一のメッセージからテキストを抽出
   */
  private extractSingleMessageText(container: Element): string | null {
    // まず専用のテキスト要素を探す
    const textSelectors = [
      '[data-testid="message-text"]',
      '.message-text',
      '.messageBody',
      '._messageText',
      '.timeline_message_text'
    ];

    for (const selector of textSelectors) {
      const textElement = container.querySelector(selector);
      if (textElement) {
        const text = this.cleanMessageText(textElement.textContent || '');
        if (this.isValidMessageText(text)) {
          return text;
        }
      }
    }

    // フォールバック：コンテナ全体のテキスト
    const fullText = container.textContent || '';
    const cleanedText = this.cleanMessageText(fullText);
    
    return this.isValidMessageText(cleanedText) ? cleanedText : null;
  }

  /**
   * メッセージテキストをクリーンアップ
   */
  private cleanMessageText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(TO|From|送信者|宛先)[:：]\s*/i, '')
      .replace(/^\d{1,2}:\d{2}\s*/, '')
      .replace(/^[\d/-\s]+\s*/, '')
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
      /^(ログイン|ログアウト|参加|退出|作成|削除|変更)/,
      /^(login|logout|joined|left|created|deleted|changed)/i,
      /検索条件をクリアし、初期状態に戻します/,
      /^(TO|From|送信者|宛先|時刻|日付)[:：]/,
      /^(送信|キャンセル|削除|編集|返信|転送)/,
      /^\d+$/,
      /^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/,
      /^(はい|いいえ|yes|no|ok|ng)$/i,
      /^\s*$/
    ];
    
    return !excludePatterns.some(pattern => pattern.test(text));
  }

  /**
   * チャット情報を抽出
   */
  private extractChatInfo(): { chatName: string; roomName: string } {
    const chatName = document.querySelector('#_roomTitle, .room_title, .chat_title')?.textContent ||
                    document.querySelector('h1, h2')?.textContent || 
                    'マイチャット';
    
    const roomName = document.querySelector('.group_name, .room_name')?.textContent ||
                    '個別チャット';

    return { chatName, roomName };
  }

  /**
   * 送信を実行
   */
  private async executeSend(content: string): Promise<boolean> {
    try {
      this.logInfo('========== Starting Chatwork Send Execution ==========');
      
      // Step 1: コンテンツを入力欄に挿入
      this.logInfo('Step 1: Inserting content to input field...');
      const insertSuccess = await this.insertContentToChatwork(content);
      if (!insertSuccess) {
        this.logError('send execution', 'Could not insert content to input field');
        return false;
      }
      this.logSuccess('Content inserted to input field');

      // Step 2: 送信ボタンをクリック
      this.logInfo('Step 2: Finding and clicking send button...');
      this.debugSendButtonsInDetail();
      
      const clickSuccess = await this.sendButtonManager.findAndClickSendButton(
        CHATWORK_CONFIG.buttonSelectors
      );
      
      if (!clickSuccess) {
        this.logError('send execution', 'Could not find or click send button');
        this.debugSendButtonFailure();
        return false;
      }
      
      this.logSuccess('Send button clicked and message sent');
      this.logInfo('========== Chatwork Send Execution Complete ==========');
      return true;
      
    } catch (error) {
      this.logError('send execution', error);
      return false;
    }
  }

  /**
   * Chatworkの入力欄にコンテンツを挿入
   */
  private async insertContentToChatwork(content: string): Promise<boolean> {
    this.debugInputElements();
    
    const messageInput = this.findElementBySelectors(CHATWORK_CONFIG.inputSelectors) as HTMLTextAreaElement;
    
    if (!messageInput) {
      this.logError('content insertion', 'Message input not found');
      this.debugInputElementsFailure();
      return false;
    }

    try {
      messageInput.focus();
      await this.delay(100);
      
      messageInput.value = '';
      messageInput.value = content;

      // より包括的なイベント発火
      const events = ['input', 'change', 'keyup', 'keydown', 'blur', 'focus'];
      events.forEach(eventType => {
        messageInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      // React/Vue用の詳細なイベント
      messageInput.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        cancelable: true,
        inputType: 'insertText',
        data: content 
      }));

      this.logSuccess('Content inserted to message input');
      return true;
    } catch (error) {
      this.logError('content insertion', error);
      return false;
    }
  }

  // === デバッグメソッド ===

  private debugPageStructure(): void {
    console.log('🔍 === Chatwork Page Structure Debug ===');
    console.log('URL:', window.location.href);
    console.log('Title:', document.title);
    console.log('Body classes:', document.body.className);
    
    // 主要なコンテナをチェック
    const containers = ['#app', '#root', '[data-reactroot]', '#_body', '#chatWorkSpace'];
    containers.forEach(selector => {
      const element = document.querySelector(selector);
      console.log(`${selector}:`, element ? 'Found' : 'Not found');
    });
  }

  private debugPageDetection(): void {
    console.log('🔍 === Page Detection Debug ===');
    console.log('URL patterns check:');
    CHATWORK_CONFIG.urlPatterns.forEach(pattern => {
      const matches = window.location.hostname.includes(pattern);
      console.log(`  ${pattern}: ${matches ? '✅' : '❌'}`);
    });

    console.log('Element detection check:');
    CHATWORK_CONFIG.pageDetectionSelectors.slice(0, 5).forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`  ${selector}: ${elements.length} found`);
      } catch {
        console.log(`  ${selector}: Error`);
      }
    });
  }

  private debugInsertionPointFailure(): void {
    console.log('🔍 === Insertion Point Failure Debug ===');
    
    // より基本的な要素をチェック
    const basicSelectors = ['form', 'textarea', 'input', 'button', '[contenteditable]'];
    basicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`${selector}: ${elements.length} found`);
    });

    // ページの全体的な構造を表示
    console.log('Document structure:');
    const bodyChildren = Array.from(document.body.children);
    bodyChildren.slice(0, 10).forEach((child, index) => {
      console.log(`  ${index + 1}. ${child.tagName}${child.id ? '#' + child.id : ''}${child.className ? '.' + child.className.split(' ')[0] : ''}`);
    });
  }

  private debugInputElements(): void {
    console.log('🔍 === Input Elements Debug ===');
    
    CHATWORK_CONFIG.inputSelectors.slice(0, 10).forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`${index + 1}. ${selector}: ${elements.length} found`);
        if (elements.length > 0) {
          const first = elements[0] as HTMLElement;
          console.log(`   Type: ${first.tagName}, Visible: ${this.isElementVisible(first)}`);
        }
      } catch {
        console.log(`${index + 1}. ${selector}: Error`);
      }
    });
  }

  private debugInputElementsFailure(): void {
    console.log('🔍 === Input Elements Failure Debug ===');
    
    // 全ての入力可能要素を検索
    const allInputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    console.log(`Total input elements found: ${allInputs.length}`);
    
    Array.from(allInputs).slice(0, 5).forEach((input, index) => {
      const element = input as HTMLElement;
      console.log(`${index + 1}.`, {
        tag: element.tagName,
        type: (element as HTMLInputElement).type,
        id: element.id,
        class: element.className,
        visible: this.isElementVisible(element),
        placeholder: element.getAttribute('placeholder')
      });
    });
  }

  private debugMessageStructure(): void {
    console.log('🔍 === Message Structure Debug ===');
    
    // タイムラインの確認
    const timeline = document.querySelector('#_timeLine, .timeline, .chat-timeline');
    if (timeline) {
      console.log('Timeline found:', {
        id: timeline.id,
        class: timeline.className,
        children: timeline.children.length
      });
    } else {
      console.log('❌ Timeline not found');
    }

    // メッセージセレクタの確認
    CHATWORK_CONFIG.messageSelectors.slice(0, 8).forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`${index + 1}. ${selector}: ${elements.length} found`);
        }
      } catch {
        console.log(`${index + 1}. ${selector}: Error`);
      }
    });
  }

  private debugMessageExtractionFailure(): void {
    console.log('🔍 === Message Extraction Failure Debug ===');
    
    // より一般的なメッセージ要素を探す
    const generalSelectors = [
      'div[class*="message"]',
      'div[class*="chat"]',
      'div[class*="timeline"]',
      'li',
      '[role="listitem"]',
      '.message',
      '.msg'
    ];

    generalSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`${selector}: ${elements.length} found`);
          // 最初の要素の詳細を表示
          const first = elements[0];
          const text = first.textContent?.trim() || '';
          console.log(`  Sample: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        }
      } catch {
        console.log(`${selector}: Error`);
      }
    });

    // ページ全体のテキスト内容をサンプリング
    const bodyText = document.body.textContent || '';
    console.log(`Total body text length: ${bodyText.length}`);
    if (bodyText.length > 0) {
      console.log(`Body text sample: "${bodyText.substring(0, 200)}..."`);
    }
  }

  private debugSendButtonsInDetail(): void {
    console.log('🔍 === Detailed Send Button Analysis ===');
    
    // 全てのボタン要素を詳細分析
    const allButtons = document.querySelectorAll('button, input[type="submit"], div[role="button"], span[role="button"]');
    console.log(`Total interactive elements: ${allButtons.length}`);
    
    let candidateCount = 0;
    Array.from(allButtons).forEach((element, index) => {
      const button = element as HTMLElement;
      const text = (button.textContent || '').trim();
      const value = ((button as HTMLInputElement).value || '').trim();
      const className = button.className;
      const id = button.id;
      const type = button.getAttribute('type');
      const role = button.getAttribute('role');
      
      // 送信候補かどうか判定
      const isSendCandidate = 
        text.includes('送信') || 
        text.includes('Send') ||
        value.includes('送信') || 
        value.includes('Send') ||
        type === 'submit' ||
        className.includes('send') ||
        className.includes('submit') ||
        id.includes('send') ||
        id.includes('submit');
        
      if (isSendCandidate || candidateCount < 10) {
        candidateCount++;
        console.log(`Button ${index + 1} ${isSendCandidate ? '(CANDIDATE)' : ''}:`, {
          tag: button.tagName,
          text: text.substring(0, 30),
          value: value.substring(0, 30),
          class: className,
          id: id,
          type: type,
          role: role,
          visible: this.isElementVisible(button),
          disabled: button.hasAttribute('disabled'),
          position: this.getElementPosition(button)
        });
      }
    });
    
    console.log(`Found ${candidateCount} potential send button candidates`);
  }

  private debugSendButtonFailure(): void {
    console.log('🔍 === Send Button Failure Debug ===');
    
    // フォームの詳細分析
    const forms = document.querySelectorAll('form');
    console.log(`Forms on page: ${forms.length}`);
    
    forms.forEach((form, index) => {
      console.log(`Form ${index + 1}:`, {
        id: form.id,
        class: form.className,
        action: form.action,
        method: form.method,
        visible: this.isElementVisible(form as HTMLElement)
      });
      
      const formButtons = form.querySelectorAll('button, input[type="submit"]');
      console.log(`  Buttons in form: ${formButtons.length}`);
      formButtons.forEach((btn, btnIndex) => {
        const button = btn as HTMLElement;
        console.log(`    ${btnIndex + 1}. ${button.tagName} - "${button.textContent?.trim()}" (visible: ${this.isElementVisible(button)})`);
      });
    });

    // 最も近い入力要素の周辺を調査
    const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    console.log(`Input elements: ${inputs.length}`);
    
    inputs.forEach((input, index) => {
      const inputElement = input as HTMLElement;
      if (this.isElementVisible(inputElement)) {
        console.log(`Visible input ${index + 1}:`, {
          tag: inputElement.tagName,
          id: inputElement.id,
          class: inputElement.className
        });
        
        // 周辺のボタンを探す
        const parent = inputElement.closest('form, div, section');
        if (parent) {
          const nearbyButtons = parent.querySelectorAll('button, input[type="submit"]');
          console.log(`  Nearby buttons: ${nearbyButtons.length}`);
          nearbyButtons.forEach((btn, btnIndex) => {
            const button = btn as HTMLElement;
            console.log(`    ${btnIndex + 1}. "${button.textContent?.trim()}" (${button.tagName})`);
          });
        }
      }
    });
  }

  private getElementPosition(element: HTMLElement): { x: number; y: number; width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }
  
  /**
   * コンテナから作成者を抽出
   */
  private extractAuthorFromContainer(container: Element): string | null {
    // 作成者名を探すセレクタ
    const authorSelectors = [
      '[class*="name"]',
      '[class*="author"]',
      '[class*="user"]',
      '[class*="sender"]',
      '.userName',
      '.member-name',
      '.message-name',
      '.chat-name',
      'strong',
      'b',
      '[data-name]',
      '[data-user]'
    ];
    
    for (const selector of authorSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const name = element.textContent?.trim();
        if (name && name.length > 0 && name.length < 50) {
          console.log(`👥 Found author: ${name} using selector: ${selector}`);
          return name;
        }
      }
    }
    
    // フォールバック: 最初のstrong要素
    const strongElement = container.querySelector('strong');
    if (strongElement) {
      const name = strongElement.textContent?.trim();
      if (name && name.length > 0 && name.length < 50) {
        console.log(`👥 Found author (fallback): ${name}`);
        return name;
      }
    }
    
    return null;
  }
  
  /**
   * コンテナからタイムスタンプを抽出
   */
  private extractTimestampFromContainer(container: Element): Date | null {
    // タイムスタンプを探すセレクタ
    const timestampSelectors = [
      '[class*="time"]',
      '[class*="date"]',
      '[class*="timestamp"]',
      '[data-time]',
      '[data-date]',
      '[title*=":"]',
      'time'
    ];
    
    for (const selector of timestampSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const timeText = element.textContent?.trim() || element.getAttribute('title') || element.getAttribute('data-time');
        if (timeText) {
          const timestamp = this.parseTimestamp(timeText);
          if (timestamp) {
            console.log(`🕰️ Found timestamp: ${timestamp.toISOString()} from: ${timeText}`);
            return timestamp;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * タイムスタンプ文字列を解析
   */
  private parseTimestamp(timeText: string): Date | null {
    // よくある時刻形式を解析
    const patterns = [
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, // 2024-01-01 12:00:00
      /\d{2}:\d{2}/, // 12:00
      /\d{1,2}月\d{1,2}日 \d{1,2}:\d{2}/, // 1月1日 12:00
      /\d{1,2}\/\d{1,2} \d{1,2}:\d{2}/, // 1/1 12:00
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(timeText)) {
        const date = new Date(timeText);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return null;
  }
}