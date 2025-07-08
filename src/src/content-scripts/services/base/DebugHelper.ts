/**
 * デバッグ機能の統合クラス
 * 各サービスで共通して使えるデバッグ機能を提供
 */
export class DebugHelper {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * ページ状態の詳細分析
   */
  analyzePageState(): void {
    console.log(`🔍 === ${this.serviceName.toUpperCase()} Page State Analysis ===`);
    console.log('URL:', window.location.href);
    console.log('Title:', document.title);
    console.log('Ready State:', document.readyState);
    console.log('Active Element:', document.activeElement);
    console.log('Time:', new Date().toISOString());
  }

  /**
   * 要素検索のデバッグ
   */
  debugElementSearch(selectors: string[], description: string): HTMLElement | null {
    console.log(`🔍 === ${description} Debug ===`);
    console.log(`Checking ${selectors.length} selectors...`);
    
    for (const [index, selector] of selectors.entries()) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`${index + 1}/${selectors.length}: ${selector} - Found ${elements.length} elements`);
        
        if (elements.length > 0) {
          const visibleElements = Array.from(elements).filter(el => 
            this.isElementVisible(el as HTMLElement)
          );
          console.log(`  - ${visibleElements.length} visible elements`);
          
          if (visibleElements.length > 0) {
            const element = visibleElements[0] as HTMLElement;
            console.log(`  ✅ Selected first visible element:`, {
              tag: element.tagName,
              id: element.id,
              class: element.className,
              text: element.textContent?.substring(0, 50)
            });
            return element;
          }
        }
      } catch (error) {
        console.log(`  ❌ Selector error: ${error.message}`);
      }
    }
    
    console.log(`❌ No elements found with any selector for ${description}`);
    return null;
  }

  /**
   * 送信ボタンの詳細分析
   */
  debugSendButtons(): void {
    console.log(`🔍 === ${this.serviceName.toUpperCase()} Send Button Analysis ===`);
    
    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    console.log(`Total interactive elements: ${allButtons.length}`);
    
    let potentialSendButtons = 0;
    allButtons.forEach((element, index) => {
      const button = element as HTMLElement;
      const text = (button.textContent || '').toLowerCase();
      const value = ((button as HTMLInputElement).value || '').toLowerCase();
      const type = button.getAttribute('type') || '';
      
      const isSendCandidate = 
        text.includes('送信') || 
        text.includes('send') ||
        value.includes('送信') || 
        value.includes('send') ||
        type === 'submit';
        
      if (isSendCandidate) {
        potentialSendButtons++;
        console.log(`Send candidate ${potentialSendButtons}:`, {
          index: index + 1,
          tag: button.tagName,
          id: button.id,
          class: button.className,
          text: text.substring(0, 30),
          value: value.substring(0, 30),
          type,
          visible: this.isElementVisible(button),
          disabled: button.hasAttribute('disabled'),
          position: this.getElementPosition(button)
        });
      }
    });
    
    if (potentialSendButtons === 0) {
      console.log('❌ No potential send buttons found!');
      this.debugForms();
    }
  }

  /**
   * フォーム情報のデバッグ
   */
  debugForms(): void {
    console.log(`🔍 === ${this.serviceName.toUpperCase()} Forms Analysis ===`);
    
    const forms = document.querySelectorAll('form');
    console.log(`Forms found: ${forms.length}`);
    
    forms.forEach((form, index) => {
      console.log(`Form ${index + 1}:`, {
        id: form.id,
        class: form.className,
        action: form.action,
        method: form.method,
        elements: form.elements.length,
        visible: this.isElementVisible(form as HTMLElement)
      });
      
      // フォーム内の送信可能な要素をチェック
      const submitElements = form.querySelectorAll('button, input[type="submit"], input[type="button"]');
      if (submitElements.length > 0) {
        console.log(`  Submit elements in form ${index + 1}:`);
        submitElements.forEach((el, elIndex) => {
          const element = el as HTMLElement;
          console.log(`    ${elIndex + 1}. ${element.tagName} - ${element.textContent || (element as HTMLInputElement).value}`);
        });
      }
    });
  }

  /**
   * メッセージ要素のデバッグ
   */
  debugMessages(messageSelectors: string[]): void {
    console.log(`🔍 === ${this.serviceName.toUpperCase()} Messages Analysis ===`);
    
    for (const selector of messageSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`${selector}: ${elements.length} elements`);
          
          // 最新の数件を詳細表示
          const recent = Array.from(elements).slice(-3);
          recent.forEach((el, index) => {
            const text = el.textContent?.trim() || '';
            console.log(`  ${elements.length - 3 + index + 1}. "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          });
          break;
        }
      } catch (error) {
        console.log(`❌ Message selector error: ${selector}`, error.message);
      }
    }
  }

  /**
   * 入力要素のデバッグ
   */
  debugInputElements(inputSelectors: string[]): void {
    console.log(`🔍 === ${this.serviceName.toUpperCase()} Input Elements Analysis ===`);
    
    for (const [index, selector] of inputSelectors.entries()) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`${index + 1}/${inputSelectors.length}: ${selector} - ${elements.length} elements`);
        
        elements.forEach((el, elIndex) => {
          const element = el as HTMLElement;
          console.log(`  ${elIndex + 1}.`, {
            tag: element.tagName,
            id: element.id,
            class: element.className,
            value: (element as HTMLInputElement).value?.substring(0, 50),
            placeholder: element.getAttribute('placeholder'),
            visible: this.isElementVisible(element)
          });
        });
      } catch (error) {
        console.log(`❌ Input selector error: ${selector}`, error.message);
      }
    }
  }

  /**
   * 実行時パフォーマンス計測
   */
  measurePerformance<T>(name: string, fn: () => T): T {
    const start = performance.now();
    console.log(`⏱️ Starting ${name}...`);
    
    try {
      const result = fn();
      const end = performance.now();
      console.log(`✅ ${name} completed in ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`❌ ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 非同期パフォーマンス計測
   */
  async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    console.log(`⏱️ Starting async ${name}...`);
    
    try {
      const result = await fn();
      const end = performance.now();
      console.log(`✅ Async ${name} completed in ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`❌ Async ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * メモリ使用量の監視
   */
  logMemoryUsage(context: string): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`💾 Memory usage at ${context}:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  /**
   * DOM変化の監視
   */
  watchDOMChanges(selector: string, timeout: number = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      console.log(`👀 Watching for DOM changes: ${selector}`);
      
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.matches && element.matches(selector)) {
                  console.log(`✅ DOM change detected: ${selector}`);
                  observer.disconnect();
                  resolve(element);
                  return;
                }
                
                const found = element.querySelector && element.querySelector(selector);
                if (found) {
                  console.log(`✅ DOM change detected (nested): ${selector}`);
                  observer.disconnect();
                  resolve(found);
                  return;
                }
              }
            }
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        console.log(`⏰ DOM watch timeout for ${selector}`);
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // === ヘルパーメソッド ===

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
   * 要素の位置情報を取得
   */
  private getElementPosition(element: HTMLElement): { x: number; y: number; width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }
}