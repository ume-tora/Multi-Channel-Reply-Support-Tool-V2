import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseAutoSendStrategy } from '../BaseAutoSendStrategy';
import type { ServiceMessage } from '../../../../shared/types';

// Test implementation of abstract class
class TestAutoSendStrategy extends BaseAutoSendStrategy {
  getServiceName(): string {
    return 'test';
  }

  async findInsertionPoint(): Promise<HTMLElement | null> {
    return document.querySelector('[data-test="insertion-point"]');
  }

  extractMessages(): ServiceMessage[] {
    return [
      { author: 'User', text: 'Test message' },
      { author: 'Bot', text: 'Test reply' }
    ];
  }

  async insertReply(text: string): Promise<void> {
    const element = document.querySelector('[data-test="text-area"]') as HTMLTextAreaElement;
    if (element) {
      element.value = text;
    }
  }

  getThreadId(): string | null {
    return 'test-thread-123';
  }
}

describe('BaseAutoSendStrategy', () => {
  let strategy: TestAutoSendStrategy;
  let mockElement: HTMLElement;

  beforeEach(() => {
    strategy = new TestAutoSendStrategy();
    
    // Create mock DOM elements
    document.body.innerHTML = `
      <div data-test="insertion-point" style="display: block; visibility: visible; opacity: 1;"></div>
      <textarea data-test="text-area"></textarea>
      <div id="gemini-reply-button-test-autosend" style="display: none;"></div>
    `;

    mockElement = document.querySelector('[data-test="insertion-point"]')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('isButtonInjected', () => {
    it('should return true when button exists', () => {
      expect(strategy.isButtonInjected()).toBe(true);
    });

    it('should return false when button does not exist', () => {
      document.getElementById('gemini-reply-button-test-autosend')?.remove();
      expect(strategy.isButtonInjected()).toBe(false);
    });
  });

  describe('isElementVisible', () => {
    it('should return true for visible element', () => {
      expect(strategy['isElementVisible'](mockElement)).toBe(true);
    });

    it('should return false for hidden element', () => {
      mockElement.style.display = 'none';
      expect(strategy['isElementVisible'](mockElement)).toBe(false);
    });

    it('should return false for element with zero dimensions', () => {
      // Mock getBoundingClientRect to return zero dimensions
      mockElement.getBoundingClientRect = vi.fn(() => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      }));
      
      expect(strategy['isElementVisible'](mockElement)).toBe(false);
    });
  });

  describe('waitForElement', () => {
    it('should return element immediately if it exists and is visible', async () => {
      const result = await strategy['waitForElement']('[data-test="insertion-point"]');
      expect(result).toBe(mockElement);
    });

    it('should return null if element is not found within timeout', async () => {
      const result = await strategy['waitForElement']('[data-test="non-existent"]', 100);
      expect(result).toBe(null);
    });

    it('should wait for element to appear in DOM', async () => {
      // Start with element not present
      document.body.innerHTML = '';
      
      // Mock MutationObserver to simulate element appearing
      let observerCallback: MutationCallback;
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(),
      };
      
      vi.mocked(global.MutationObserver).mockImplementation((callback) => {
        observerCallback = callback;
        return mockObserver;
      });
      
      // Simulate async element addition
      const waitPromise = strategy['waitForElement']('[data-test="delayed-element"]', 200);
      
      // Add element and trigger observer callback
      setTimeout(() => {
        const newElement = document.createElement('div');
        newElement.setAttribute('data-test', 'delayed-element');
        document.body.appendChild(newElement);
        
        // Simulate MutationObserver callback
        observerCallback([], mockObserver as any);
      }, 50);

      const result = await waitPromise;
      expect(result).toBeTruthy();
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('findElementBySelectors', () => {
    it('should return first matching visible element', () => {
      const selectors = ['[data-test="non-existent"]', '[data-test="insertion-point"]'];
      const result = strategy['findElementBySelectors'](selectors);
      expect(result).toBe(mockElement);
    });

    it('should return null if no selectors match', () => {
      const selectors = ['[data-test="non-existent-1"]', '[data-test="non-existent-2"]'];
      const result = strategy['findElementBySelectors'](selectors);
      expect(result).toBe(null);
    });

    it('should skip invisible elements', () => {
      // Add invisible element first
      document.body.innerHTML = `
        <div data-test="invisible" style="display: none;"></div>
        <div data-test="visible" style="display: block;"></div>
      `;

      const selectors = ['[data-test="invisible"]', '[data-test="visible"]'];
      const result = strategy['findElementBySelectors'](selectors);
      
      expect(result).toBe(document.querySelector('[data-test="visible"]'));
    });
  });

  describe('delay', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await strategy['delay'](100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('ID generation methods', () => {
    it('should generate correct button ID', () => {
      expect(strategy['getButtonId']()).toBe('gemini-reply-button-test-autosend');
    });

    it('should generate correct modal ID', () => {
      expect(strategy['getModalId']()).toBe('test-autosend-modal');
    });

    it('should generate correct confirm modal ID', () => {
      expect(strategy['getConfirmModalId']()).toBe('test-confirm-modal');
    });
  });

  describe('logging methods', () => {
    it('should log error with service name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');
      
      strategy['logError']('test context', error);
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ test test context:', error);
    });

    it('should log success with service name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      strategy['logSuccess']('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ test: test message');
    });

    it('should log info with service name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      strategy['logInfo']('test info');
      
      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ test: test info');
    });
  });

  describe('abstract method implementations', () => {
    it('should implement getServiceName', () => {
      expect(strategy.getServiceName()).toBe('test');
    });

    it('should implement extractMessages', () => {
      const messages = strategy.extractMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ author: 'User', text: 'Test message' });
      expect(messages[1]).toEqual({ author: 'Bot', text: 'Test reply' });
    });

    it('should implement getThreadId', () => {
      expect(strategy.getThreadId()).toBe('test-thread-123');
    });

    it('should implement insertReply', async () => {
      const textarea = document.querySelector('[data-test="text-area"]') as HTMLTextAreaElement;
      await strategy.insertReply('Hello World');
      expect(textarea.value).toBe('Hello World');
    });

    it('should implement findInsertionPoint', async () => {
      const result = await strategy.findInsertionPoint();
      expect(result).toBe(mockElement);
    });
  });

  describe('constants', () => {
    it('should have correct timeout constants', () => {
      expect(BaseAutoSendStrategy['RETRY_DELAY']).toBe(500);
      expect(BaseAutoSendStrategy['TIMEOUT_SHORT']).toBe(3000);
      expect(BaseAutoSendStrategy['TIMEOUT_MEDIUM']).toBe(5000);
      expect(BaseAutoSendStrategy['TIMEOUT_LONG']).toBe(10000);
    });
  });
});