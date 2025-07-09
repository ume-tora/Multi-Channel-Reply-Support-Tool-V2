import type { ServiceStrategy, Message } from './interface';
import { DOMStrategy } from '../../shared/dom/DOMStrategy';
import { getServiceConfigs, POPUP_CONFIGS } from '../../shared/dom/ServiceConfigs';

/**
 * Simplified Gmail Strategy using unified DOM finding
 */
export class GmailStrategy implements ServiceStrategy {
  private static readonly BUTTON_ID = 'gemini-reply-button-gmail';
  private domStrategy: DOMStrategy;

  constructor() {
    this.domStrategy = new DOMStrategy({
      enableCaching: true,
      cacheTimeout: 30000,
      maxRetries: 2,
      retryDelay: 100
    });
  }

  getServiceName(): 'gmail' {
    return 'gmail';
  }

  async findInsertionPoint(): Promise<HTMLElement | null> {
    try {
      // Wait for DOM to be ready with longer timeout for Gmail's dynamic loading
      const isReady = await this.domStrategy.waitForDOMReady(10000); // 10 second timeout
      if (!isReady) {
        console.log('Gmail: DOM not ready, timing out');
        return null;
      }

      // Wait a bit more for Gmail's dynamic content to load
      await this.waitForGmailUI();

      // Detect if this is a popup view
      if (this.isPopupView()) {
        return await this.findPopupInsertionPoint();
      }

      // Use unified DOM strategy for main view
      return await this.findMainViewInsertionPoint();
    } catch (error) {
      console.error('Gmail: Error finding insertion point:', error);
      return null;
    }
  }

  /**
   * Wait for Gmail UI elements to be available
   */
  private async waitForGmailUI(): Promise<void> {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      // Check if Gmail UI elements are present
      const hasGmailUI = document.querySelector('[role="main"]') || 
                        document.querySelector('.nH') ||
                        document.querySelector('[aria-label*="compose"]') ||
                        document.querySelector('[aria-label*="メッセージ"]');
      
      if (hasGmailUI) {
        console.log('Gmail: UI elements detected');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log('Gmail: UI elements not detected within timeout');
  }

  /**
   * Find insertion point in main Gmail view
   */
  private async findMainViewInsertionPoint(): Promise<HTMLElement | null> {
    const configs = getServiceConfigs('gmail');
    const result = await this.domStrategy.findElement(configs, 'gmail-main');

    if (result.found && result.element) {
      console.log(`Gmail: Found insertion point using ${result.selector} (cached: ${result.cached})`);
      return result.element;
    }

    // Fallback: create container
    console.log('Gmail: No insertion point found, creating fallback container');
    return this.domStrategy.createFallbackContainer('[role="main"]', 'gmail-ai-container');
  }

  /**
   * Find insertion point in popup view
   */
  private async findPopupInsertionPoint(): Promise<HTMLElement | null> {
    const result = await this.domStrategy.findElement(POPUP_CONFIGS, 'gmail-popup');

    if (result.found && result.element) {
      console.log(`Gmail: Found popup insertion point using ${result.selector}`);
      return result.element;
    }

    // Fallback for popups
    return this.domStrategy.createFallbackContainer('[role="dialog"]', 'gmail-popup-ai-container') ||
           this.domStrategy.createFallbackContainer('[aria-modal="true"]', 'gmail-popup-ai-container');
  }

  /**
   * Simplified popup detection
   */
  private isPopupView(): boolean {
    return !!(
      document.querySelector('div[role="dialog"]') ||
      document.querySelector('div[aria-modal="true"]') ||
      document.querySelector('.nH.aHU') // Gmail popup class
    );
  }

  isButtonInjected(): boolean {
    return !!document.getElementById(GmailStrategy.BUTTON_ID);
  }

  extractMessages(): Message[] {
    try {
      const messages: Message[] = [];

      // Common Gmail message selectors (simplified)
      const messageSelectors = [
        'div[data-message-id]',
        'div[role="listitem"]',
        '.ii.gt div.ii.gt.adv'
      ];

      for (const selector of messageSelectors) {
        const messageElements = document.querySelectorAll(selector);
        
        for (const element of messageElements) {
          const text = this.extractTextFromElement(element as HTMLElement);
          if (text && text.length > 10) { // Minimum meaningful length
            messages.push({
              role: 'user',
              content: text,
              timestamp: Date.now()
            });
          }
        }

        // If we found messages with this selector, break
        if (messages.length > 0) break;
      }

      return messages.slice(0, 10); // Limit to 10 most recent messages
    } catch (error) {
      console.error('Gmail: Error extracting messages:', error);
      return [];
    }
  }

  /**
   * Extract clean text from element
   */
  private extractTextFromElement(element: HTMLElement): string {
    if (!element) return '';

    // Remove script, style, and button elements
    const clone = element.cloneNode(true) as HTMLElement;
    const unwantedElements = clone.querySelectorAll('script, style, button, .gmail-quote, [data-smartmail="gmail_signature"]');
    unwantedElements.forEach(el => el.remove());

    const text = clone.textContent || '';
    return text.trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\s*>.*$/gm, '') // Remove quoted lines
      .trim();
  }

  insertReply(text: string): void {
    try {
      // Common Gmail text input selectors
      const inputSelectors = [
        'div[contenteditable="true"][aria-label*="メッセージ"]',
        'div[contenteditable="true"][aria-label*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[name="message"]'
      ];

      for (const selector of inputSelectors) {
        const inputElement = document.querySelector(selector) as HTMLElement;
        if (inputElement) {
          if (inputElement.tagName === 'TEXTAREA') {
            (inputElement as HTMLTextAreaElement).value = text;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            inputElement.textContent = text;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          console.log('Gmail: Reply text inserted successfully');
          return;
        }
      }

      console.warn('Gmail: No input element found for reply insertion');
    } catch (error) {
      console.error('Gmail: Error inserting reply:', error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.domStrategy.clearCache();
  }
}