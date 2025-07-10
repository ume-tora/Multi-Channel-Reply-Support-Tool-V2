/**
 * Unified Error Handling System - Central Export
 */

// === Error Types ===
export type {
  ErrorContext,
  ErrorResponse,
  RecoveryAction,
  BaseError
} from './ErrorTypes';

export {
  APIError,
  GeminiAPIError,
  StorageError,
  StorageQuotaError,
  ServiceError,
  DOMError,
  NetworkError,
  PermissionError,
  UIError,
  ValidationError,
  ErrorSeverity,
  getErrorSeverity,
  isAPIError,
  isGeminiAPIError,
  isStorageError,
  isStorageQuotaError,
  isServiceError,
  isDOMError,
  isNetworkError,
  isPermissionError,
  isUIError,
  isValidationError,
  isRecoverableError,
  createErrorContext,
  extractErrorMessage,
  extractErrorStack
} from './ErrorTypes';

// === Error Manager ===
export type { ErrorHandler, NotificationService as INotificationService, ErrorLogger as IErrorLogger } from './ErrorManager';
export { UnifiedErrorManager, errorManager } from './ErrorManager';

// === Retry Service ===
export type { RetryOptions, RetryState } from './RetryService';
export { 
  RetryService,
  BatchRetryService,
  DEFAULT_RETRY_OPTIONS,
  API_RETRY_OPTIONS,
  STORAGE_RETRY_OPTIONS,
  NETWORK_RETRY_OPTIONS,
  isRetryableError,
  getRetryDelay,
  shouldRetryError,
  retryable
} from './RetryService';

// === Notification Service ===
export type { 
  Notification, 
  NotificationOptions, 
  NotificationEvent 
} from './NotificationService';
export { 
  NotificationService, 
  notificationService,
  createRecoveryAction,
  showQuickError,
  showQuickSuccess,
  showQuickWarning
} from './NotificationService';

// === Error Logger ===
export type { LogEntry, LoggerOptions } from './ErrorLogger';
export { 
  ErrorLogger, 
  errorLogger,
  setupErrorLogger,
  logError,
  logWarning,
  logInfo,
  logDebug
} from './ErrorLogger';

// === Convenience Functions ===

/**
 * Initialize the unified error handling system
 */
export function initializeErrorHandling(options: {
  enableNotifications?: boolean;
  enableLogging?: boolean;
  logLevel?: ErrorSeverity;
  maxStoredLogs?: number;
} = {}): void {
  const {
    enableNotifications = true,
    enableLogging = true,
    logLevel = ErrorSeverity.WARN,
    maxStoredLogs = 100
  } = options;

  // Setup error manager
  const manager = errorManager;

  // Setup notification service
  if (enableNotifications) {
    manager.setNotificationService(notificationService);
  }

  // Setup logger
  if (enableLogging) {
    const logger = setupErrorLogger({
      logLevel,
      maxStoredLogs,
      enableConsoleOutput: true,
      enableStorageOutput: true
    });
    manager.setLogger(logger);
  }

  // Log initialization
  logInfo('Error handling system initialized', {
    enableNotifications,
    enableLogging,
    logLevel,
    maxStoredLogs
  });
}

/**
 * Handle an error with full error management pipeline
 */
export async function handleError(
  error: unknown, 
  context: ErrorContext
): Promise<ErrorResponse> {
  return errorManager.handleError(error, context);
}

/**
 * Handle API errors with automatic retry logic
 */
export async function handleAPIOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  retryOptions?: RetryOptions
): Promise<T> {
  try {
    return await RetryService.retryAPIOperation(operation, retryOptions);
  } catch (error) {
    await handleError(error, context);
    throw error;
  }
}

/**
 * Handle storage operations with error management
 */
export async function handleStorageOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  retryOptions?: RetryOptions
): Promise<T> {
  try {
    return await RetryService.retryStorageOperation(operation, retryOptions);
  } catch (error) {
    await handleError(error, context);
    throw error;
  }
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: Omit<ErrorContext, 'timestamp'>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, {
        ...context,
        timestamp: Date.now()
      });
      throw error;
    }
  }) as T;
}

/**
 * Create a type-safe error with context
 */
export function createError(
  message: string,
  type: 'api' | 'storage' | 'service' | 'network' | 'permission' | 'ui' | 'validation',
  context?: ErrorContext,
  additionalData?: Record<string, unknown>
): BaseError {
  switch (type) {
    case 'api':
      return new APIError(message, 500, undefined, true, context);
    case 'storage':
      return new StorageError(message, 'get', undefined, context);
    case 'service':
      return new ServiceError(message, (context?.service as string) || 'gmail', 'unknown', true, context);
    case 'network':
      return new NetworkError(message, 'connection', context);
    case 'permission':
      return new PermissionError(message, 'unknown', context);
    case 'ui':
      return new UIError(message, 'unknown', 'unknown', context);
    case 'validation':
      return new ValidationError(message, 'unknown', additionalData?.value, context);
    default:
      return new ServiceError(message, 'gmail', 'unknown', true, context);
  }
}

/**
 * Enhanced console logging with error context
 */
export const console = {
  debug: (message: string, data?: Record<string, unknown>) => logDebug(message, data),
  info: (message: string, data?: Record<string, unknown>) => logInfo(message, data),
  warn: (message: string, data?: Record<string, unknown>) => logWarning(message, data),
  error: (message: string, data?: Record<string, unknown>) => errorLogger.logError(message, data),
  log: (message: string, data?: Record<string, unknown>) => logInfo(message, data)
};

// === Error Boundary for React Components ===
export function createErrorBoundary() {
  if (typeof React !== 'undefined') {
    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        handleError(error, {
          service: 'ui',
          operation: 'react-error-boundary',
          timestamp: Date.now(),
          metadata: errorInfo
        });
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: {
              padding: '20px',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#dc2626'
            }
          }, 'UI エラーが発生しました。ページを更新してお試しください。');
        }

        return this.props.children;
      }
    };
  }

  return null;
}