/**
 * Retry Service for handling failed operations with exponential backoff
 */

import { isAPIError, isNetworkError } from './ErrorTypes';

// === Retry Configuration ===

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  backoffFactor?: number;
  maxDelay?: number;
  retryCondition?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  jitter?: boolean;
  timeout?: number;
}

export interface RetryState {
  attempt: number;
  totalDelay: number;
  errors: unknown[];
  startTime: number;
}

// === Default Retry Configurations ===

export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 30000,
  retryCondition: (error: unknown) => isRetryableError(error),
  jitter: true,
  timeout: 60000
};

export const API_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 10000,
  retryCondition: (error: unknown) => {
    if (isAPIError(error)) {
      // Retry on server errors and rate limiting
      return error.status >= 500 || error.status === 429;
    }
    return isNetworkError(error);
  },
  jitter: true
};

export const STORAGE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  initialDelay: 500,
  backoffFactor: 1.5,
  maxDelay: 2000,
  retryCondition: (error: unknown) => {
    // Only retry storage errors that aren't quota issues
    return isNetworkError(error) || 
           (error instanceof Error && !error.message.includes('quota'));
  },
  jitter: false
};

export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 2000,
  backoffFactor: 1.5,
  maxDelay: 15000,
  retryCondition: (error: unknown) => isNetworkError(error),
  jitter: true
};

// === Retry Service ===

export class RetryService {
  /**
   * Execute an operation with retry logic
   */
  static async withRetry<T>(
    operation: (state: RetryState) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const state: RetryState = {
      attempt: 0,
      totalDelay: 0,
      errors: [],
      startTime: Date.now()
    };

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      state.attempt = attempt;

      try {
        // Check overall timeout
        if (config.timeout && (Date.now() - state.startTime) > config.timeout) {
          throw new Error(`Operation timed out after ${config.timeout}ms`);
        }

        const result = await operation(state);
        return result;
      } catch (error) {
        state.errors.push(error);

        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          throw error;
        }

        // Check if error is retryable
        if (!config.retryCondition(error, attempt)) {
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        state.totalDelay += delay;

        // Call retry callback if provided
        if (options.onRetry) {
          options.onRetry(error, attempt, delay);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    throw new Error('Retry attempts exhausted');
  }

  /**
   * Convenience method for API operations
   */
  static async retryAPIOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...API_RETRY_OPTIONS, ...options };
    return this.withRetry(() => operation(), mergedOptions);
  }

  /**
   * Convenience method for storage operations
   */
  static async retryStorageOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...STORAGE_RETRY_OPTIONS, ...options };
    return this.withRetry(() => operation(), mergedOptions);
  }

  /**
   * Convenience method for network operations
   */
  static async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...NETWORK_RETRY_OPTIONS, ...options };
    return this.withRetry(() => operation(), mergedOptions);
  }

  /**
   * Retry with exponential backoff and circuit breaker pattern
   */
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    // Implementation would include circuit breaker logic
    // For now, just use regular retry
    return this.withRetry(() => operation());
  }

  // === Private Helper Methods ===

  private static calculateDelay(attempt: number, config: Required<Omit<RetryOptions, 'onRetry'>>): number {
    // Calculate exponential backoff
    let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * 2 - 1) * jitterAmount;
    }
    
    return Math.max(delay, 0);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// === Utility Functions ===

export function isRetryableError(error: unknown): boolean {
  // API errors that are retryable
  if (isAPIError(error)) {
    return error.retryable;
  }

  // Network errors are generally retryable
  if (isNetworkError(error)) {
    return true;
  }

  // Generic network/connection errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }

  return false;
}

export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
}

export function shouldRetryError(error: unknown, maxAttempts: number = 3, currentAttempt: number = 1): boolean {
  if (currentAttempt >= maxAttempts) {
    return false;
  }

  return isRetryableError(error);
}

// === Retry Decorators ===

export function retryable(options: RetryOptions = {}) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: unknown[]) {
      return RetryService.withRetry(
        () => method.apply(this, args),
        options
      );
    } as T;

    return descriptor;
  };
}

// === Batch Retry Operations ===

export class BatchRetryService {
  /**
   * Execute multiple operations with individual retry logic
   */
  static async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: unknown }>> {
    const promises = operations.map(async (operation, index) => {
      try {
        const result = await RetryService.withRetry(
          () => operation(),
          {
            ...options,
            onRetry: (error, attempt, delay) => {
              console.log(`Batch operation ${index} retry ${attempt} after ${delay}ms:`, error);
            }
          }
        );
        return { success: true, result };
      } catch (error) {
        return { success: false, error };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute operations with dependency management
   */
  static async retryWithDependencies<T>(
    operations: Array<{
      id: string;
      operation: () => Promise<T>;
      dependencies?: string[];
    }>,
    options: RetryOptions = {}
  ): Promise<Record<string, { success: boolean; result?: T; error?: unknown }>> {
    const results: Record<string, { success: boolean; result?: T; error?: unknown }> = {};
    const completed = new Set<string>();
    const remaining = [...operations];

    while (remaining.length > 0) {
      const ready = remaining.filter(op => 
        !op.dependencies || op.dependencies.every(dep => completed.has(dep))
      );

      if (ready.length === 0) {
        throw new Error('Circular dependency detected in retry operations');
      }

      const promises = ready.map(async (op) => {
        try {
          const result = await RetryService.withRetry(() => op.operation(), options);
          results[op.id] = { success: true, result };
          completed.add(op.id);
        } catch (error) {
          results[op.id] = { success: false, error };
          // Don't add to completed set if failed
        }
      });

      await Promise.all(promises);

      // Remove completed operations
      remaining.splice(0, remaining.length, ...remaining.filter(op => !results[op.id]));

      // Break if no progress was made
      if (ready.every(op => results[op.id] && !results[op.id].success)) {
        break;
      }
    }

    return results;
  }
}