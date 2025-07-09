/**
 * Base class for content scripts with common functionality
 */
import type { ServiceStrategy } from '../services/interface';
import type { ServiceMessage } from '../../shared/types/index';
import { MessageConverter } from '../../shared/utils/MessageConverter';
import { DragDropManager } from '../../shared/ui/DragDropManager';

export interface ContentScriptConfig {
  serviceName: string;
  styleId: string;
  buttonId: string;
  buttonColor: string;
}

export abstract class ContentScriptBase {
  protected strategy: ServiceStrategy | null = null;
  protected observer: MutationObserver | null = null;
  protected currentUrl: string = '';
  protected retryCount: number = 0;
  protected maxRetries: number = 3;
  protected retryDelay: number = 2000;
  protected urlCheckInterval: NodeJS.Timeout | null = null;
  protected memoryCleanupInterval: NodeJS.Timeout | null = null;
  protected isActive: boolean = false;
  protected dragDropManager: DragDropManager | null = null;

  protected abstract getConfig(): ContentScriptConfig;
  protected abstract createStrategy(): ServiceStrategy;
  
  protected async getApiKey(): Promise<string | null> {
    try {
      const response = await new Promise<{success: boolean; apiKey?: string; error?: string}>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
      });
      
      if (response.success && response.apiKey) {
        return response.apiKey;
      }
      return null;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  protected async generateReply(messages: ServiceMessage[]): Promise<{success: boolean; text?: string; error?: string}> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const geminiMessages = MessageConverter.convertToGeminiMessages(messages);
      const response = await new Promise<{success: boolean; text?: string; error?: string}>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GENERATE_REPLY',
          messages: geminiMessages,
          apiKey: apiKey
        }, resolve);
      });

      return response;
    } catch (error) {
      console.error('Failed to generate reply:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  protected scheduleRetry(delay: number = this.retryDelay): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => {
        this.checkAndInjectButton();
      }, delay);
    }
  }

  protected startObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          this.checkAndInjectButton();
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-testid', 'aria-label']
    });
  }

  protected startUrlMonitoring(): void {
    this.currentUrl = window.location.href;
    
    this.urlCheckInterval = setInterval(() => {
      if (window.location.href !== this.currentUrl) {
        this.currentUrl = window.location.href;
        this.retryCount = 0;
        setTimeout(() => {
          this.checkAndInjectButton();
        }, 1000);
      }
    }, 1000);
  }

  protected registerMemoryCleanup(): void {
    this.memoryCleanupInterval = setInterval(() => {
      if (this.strategy && typeof this.strategy.cleanup === 'function') {
        this.strategy.cleanup();
      }
    }, 300000); // 5分間隔
  }

  protected injectStyles(): void {
    const config = this.getConfig();
    const styleId = config.styleId;
    
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gemini-reply-button {
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        background: ${config.buttonColor};
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        user-select: none;
        backdrop-filter: blur(10px);
      }
      
      .gemini-reply-button:hover {
        transform: translateY(-50%) scale(1.05);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      
      .gemini-reply-button:active {
        transform: translateY(-50%) scale(0.95);
      }
    `;
    
    document.head.appendChild(style);
  }

  protected checkAndInjectButton(): void {
    const config = this.getConfig();
    const existingButton = document.getElementById(config.buttonId);
    
    if (existingButton) {
      return;
    }

    if (!this.strategy) {
      this.strategy = this.createStrategy();
    }

    if (this.strategy.canInjectButton()) {
      this.injectReplyButton();
    } else {
      this.scheduleRetry();
    }
  }

  protected injectReplyButton(): void {
    const config = this.getConfig();
    const button = document.createElement('button');
    button.id = config.buttonId;
    button.className = 'gemini-reply-button';
    button.textContent = '🤖 AI返信';
    button.title = `Click to generate AI reply for ${config.serviceName}`;
    
    button.addEventListener('click', () => this.handleButtonClick());
    
    document.body.appendChild(button);
    
    // Initialize drag and drop
    this.dragDropManager = new DragDropManager(button);
    
    console.log(`${config.serviceName} AI reply button injected`);
  }

  protected async handleButtonClick(): Promise<void> {
    if (!this.strategy) {
      console.error('Strategy not initialized');
      return;
    }

    try {
      const messages = this.strategy.extractMessages();
      if (!messages || messages.length === 0) {
        console.warn('No messages found to generate reply');
        return;
      }

      const response = await this.generateReply(messages);
      
      if (response.success && response.text) {
        this.strategy.insertReply(response.text);
      } else {
        console.error('Failed to generate reply:', response.error);
      }
    } catch (error) {
      console.error('Error handling button click:', error);
    }
  }

  protected cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }
    
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
    
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }
    
    if (this.strategy && typeof this.strategy.cleanup === 'function') {
      this.strategy.cleanup();
    }
    
    this.isActive = false;
  }

  public async init(): Promise<void> {
    if (this.isActive) {
      return;
    }
    
    this.isActive = true;
    this.injectStyles();
    this.startObserving();
    this.startUrlMonitoring();
    this.registerMemoryCleanup();
    
    // Initial button injection
    setTimeout(() => {
      this.checkAndInjectButton();
    }, 1000);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    console.log(`${this.getConfig().serviceName} content script initialized`);
  }
}