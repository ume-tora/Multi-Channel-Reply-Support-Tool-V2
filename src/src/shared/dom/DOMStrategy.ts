/**
 * Unified DOM Strategy for finding insertion points across all services
 * Eliminates code duplication and provides intelligent caching
 */

export interface SelectorConfig {
  selectors: string[];
  description: string;
  priority: number;
}

export interface DOMSearchResult {
  element: HTMLElement | null;
  selector: string;
  found: boolean;
  cached: boolean;
}

export interface DOMStrategyOptions {
  enableCaching?: boolean;
  cacheTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Unified DOM finding strategy with intelligent caching and fallbacks
 */
export class DOMStrategy {
  private selectorCache = new Map<string, { element: HTMLElement; timestamp: number; selector: string }>();
  private readonly options: Required<DOMStrategyOptions>;
  
  constructor(options: DOMStrategyOptions = {}) {
    this.options = {
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout ?? 30000, // 30 seconds
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 100
    };
  }

  /**
   * Find element using prioritized selector configurations
   */
  async findElement(configs: SelectorConfig[], cacheKey?: string): Promise<DOMSearchResult> {
    // Check cache first if enabled and cache key provided
    if (this.options.enableCaching && cacheKey) {
      const cached = this.getCachedElement(cacheKey);
      if (cached) {
        return {
          element: cached.element,
          selector: cached.selector,
          found: true,
          cached: true
        };
      }
    }

    // Sort configs by priority (higher priority first)
    const sortedConfigs = configs.sort((a, b) => b.priority - a.priority);

    // Try each configuration
    for (const config of sortedConfigs) {
      const result = await this.trySelectorsWithRetry(config.selectors);
      
      if (result.element) {
        // Cache successful result if enabled
        if (this.options.enableCaching && cacheKey) {
          this.cacheElement(cacheKey, result.element, result.selector);
        }

        return {
          element: result.element,
          selector: result.selector,
          found: true,
          cached: false
        };
      }
    }

    return {
      element: null,
      selector: '',
      found: false,
      cached: false
    };
  }

  /**
   * Try selectors with retry mechanism
   */
  private async trySelectorsWithRetry(selectors: string[]): Promise<{ element: HTMLElement | null; selector: string }> {
    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && this.isElementValid(element)) {
            return { element, selector };
          }
        } catch (error) {
          console.warn(`DOMStrategy: Invalid selector "${selector}":`, error);
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < this.options.maxRetries - 1) {
        await this.delay(this.options.retryDelay);
      }
    }

    return { element: null, selector: '' };
  }

  /**
   * Check if element is valid for button insertion
   */
  private isElementValid(element: HTMLElement): boolean {
    if (!element) return false;
    
    // Check if element is visible and in DOM
    if (!element.isConnected) return false;
    if (element.offsetParent === null && element.style.display !== 'fixed') return false;
    
    // Check if element has reasonable dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    
    return true;
  }

  /**
   * Cache successful element finding
   */
  private cacheElement(key: string, element: HTMLElement, selector: string): void {
    this.selectorCache.set(key, {
      element,
      selector,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanExpiredCache();
  }

  /**
   * Get cached element if still valid
   */
  private getCachedElement(key: string): { element: HTMLElement; selector: string } | null {
    const cached = this.selectorCache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.options.cacheTimeout) {
      this.selectorCache.delete(key);
      return null;
    }

    // Check if element is still valid
    if (!this.isElementValid(cached.element)) {
      this.selectorCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.selectorCache.entries()) {
      if (now - cached.timestamp > this.options.cacheTimeout) {
        this.selectorCache.delete(key);
      }
    }
  }

  /**
   * Wait for DOM to be ready
   */
  async waitForDOMReady(timeoutMs: number = 5000): Promise<boolean> {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      
      const checkReady = () => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          clearTimeout(timeout);
          resolve(true);
        }
      };

      document.addEventListener('DOMContentLoaded', checkReady, { once: true });
      document.addEventListener('readystatechange', checkReady);
    });
  }

  /**
   * Create insertion point with fallback container
   */
  createFallbackContainer(parentSelector: string, className: string = 'ai-reply-container'): HTMLElement | null {
    try {
      const parent = document.querySelector(parentSelector) as HTMLElement;
      if (!parent) return null;

      // Check if container already exists
      let container = parent.querySelector(`.${className}`) as HTMLElement;
      if (container) return container;

      // Create new container
      container = document.createElement('div');
      container.className = className;
      container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0;
        z-index: 1000;
      `;

      parent.appendChild(container);
      return container;
    } catch (error) {
      console.error('DOMStrategy: Error creating fallback container:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.selectorCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.selectorCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking if needed
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}