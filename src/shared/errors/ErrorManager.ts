/**
 * Unified Error Manager for centralized error handling, logging, and recovery
 */

import type { 
  ErrorContext, 
  ErrorResponse, 
  RecoveryAction 
} from './ErrorTypes';
import { 
  APIError,
  GeminiAPIError,
  StorageError,
  StorageQuotaError,
  ServiceError,
  DOMError,
  ErrorSeverity,
  getErrorSeverity,
  isRecoverableError,
  extractErrorMessage,
  extractErrorStack
} from './ErrorTypes';

// === Error Handler Interface ===

export interface ErrorHandler {
  canHandle(error: unknown): boolean;
  handle(error: unknown, context: ErrorContext): Promise<ErrorResponse>;
  getRecoveryActions(error: unknown, context: ErrorContext): RecoveryAction[];
}

// === Notification Service Interface ===

export interface NotificationService {
  showError(message: string, actions?: RecoveryAction[], persistent?: boolean): void;
  showWarning(message: string): void;
  showSuccess(message: string): void;
  clearNotifications(): void;
}

// === Logger Interface ===

export interface ErrorLogger {
  log(error: unknown, context: ErrorContext, severity: ErrorSeverity): void;
  logDebug(message: string, data?: Record<string, unknown>): void;
  logInfo(message: string, data?: Record<string, unknown>): void;
  logWarn(message: string, data?: Record<string, unknown>): void;
  logError(message: string, data?: Record<string, unknown>): void;
}

// === Unified Error Manager ===

export class UnifiedErrorManager {
  private static instance: UnifiedErrorManager;
  private handlers: Map<string, ErrorHandler> = new Map();
  private notificationService?: NotificationService;
  private logger?: ErrorLogger;
  private errorHistory: Array<{ error: unknown; context: ErrorContext; timestamp: number }> = [];
  private readonly MAX_HISTORY_SIZE = 100;

  private constructor() {
    this.registerDefaultHandlers();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): UnifiedErrorManager {
    if (!UnifiedErrorManager.instance) {
      UnifiedErrorManager.instance = new UnifiedErrorManager();
    }
    return UnifiedErrorManager.instance;
  }

  // === Configuration ===

  setNotificationService(service: NotificationService): void {
    this.notificationService = service;
  }

  setLogger(logger: ErrorLogger): void {
    this.logger = logger;
  }

  registerHandler(key: string, handler: ErrorHandler): void {
    this.handlers.set(key, handler);
  }

  // === Main Error Handling ===

  async handleError(error: unknown, context: ErrorContext): Promise<ErrorResponse> {
    try {
      // Record error in history
      this.recordError(error, context);

      // Log the error
      const severity = getErrorSeverity(error);
      this.logError(error, context, severity);

      // Find appropriate handler
      const handler = this.findHandler(error);
      let response: ErrorResponse;

      if (handler) {
        response = await handler.handle(error, context);
      } else {
        response = this.createDefaultErrorResponse(error, context);
      }

      // Show user notification if appropriate
      if (this.shouldShowNotification(error, severity)) {
        this.showUserNotification(response);
      }

      return response;
    } catch (handlingError) {
      // Fallback error handling if the error handler itself fails
      this.logError(handlingError, context, ErrorSeverity.CRITICAL);
      return this.createFallbackErrorResponse(error, context);
    }
  }

  // === Specific Error Handling Methods ===

  async handleAPIError(error: APIError, context: ErrorContext): Promise<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      userMessage: error instanceof GeminiAPIError 
        ? error.getUserMessage() 
        : 'API通信でエラーが発生しました。',
      canRetry: error.retryable,
      retryDelay: this.calculateRetryDelay(error.status),
      recoveryActions: this.getAPIErrorRecoveryActions(error, context),
      timestamp: Date.now(),
      debugInfo: {
        status: error.status,
        endpoint: error.endpoint,
        code: error.code
      }
    };

    return response;
  }

  async handleStorageError(error: StorageError, context: ErrorContext): Promise<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      userMessage: error.getUserMessage(),
      canRetry: true,
      recoveryActions: this.getStorageErrorRecoveryActions(error, context),
      timestamp: Date.now(),
      debugInfo: {
        operation: error.operation,
        key: error.key,
        code: error.code
      }
    };

    return response;
  }

  async handleServiceError(error: ServiceError, context: ErrorContext): Promise<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      userMessage: error.getUserMessage(),
      canRetry: error.recoverable,
      retryDelay: 2000, // 2 seconds for service errors
      recoveryActions: this.getServiceErrorRecoveryActions(error, context),
      timestamp: Date.now(),
      debugInfo: {
        service: error.service,
        operation: error.operation,
        code: error.code
      }
    };

    return response;
  }

  // === Recovery Actions ===

  private getAPIErrorRecoveryActions(error: APIError, context: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    if (error.retryable) {
      actions.push({
        id: 'retry',
        label: '再試行',
        action: async () => {
          // Emit retry event that components can listen to
          window.dispatchEvent(new CustomEvent('error-retry', { 
            detail: { error, context } 
          }));
        },
        isPrimary: true
      });
    }

    if (error instanceof GeminiAPIError && (error.status === 401 || error.status === 403)) {
      actions.push({
        id: 'check-api-key',
        label: 'APIキー設定',
        action: async () => {
          window.dispatchEvent(new CustomEvent('open-settings', { 
            detail: { tab: 'api-key' } 
          }));
        },
        isPrimary: true
      });
    }

    return actions;
  }

  private getStorageErrorRecoveryActions(error: StorageError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    if (error instanceof StorageQuotaError) {
      actions.push({
        id: 'clear-cache',
        label: 'キャッシュクリア',
        action: async () => {
          window.dispatchEvent(new CustomEvent('clear-storage-cache'));
        },
        isPrimary: true
      });

      actions.push({
        id: 'open-storage-settings',
        label: 'ストレージ設定',
        action: async () => {
          window.dispatchEvent(new CustomEvent('open-settings', { 
            detail: { tab: 'storage' } 
          }));
        }
      });
    }

    return actions;
  }

  private getServiceErrorRecoveryActions(error: ServiceError, context: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    if (error instanceof DOMError) {
      actions.push({
        id: 'refresh-page',
        label: 'ページ更新',
        action: async () => {
          window.location.reload();
        },
        isPrimary: true
      });
    }

    actions.push({
      id: 'retry-operation',
      label: '再試行',
      action: async () => {
        window.dispatchEvent(new CustomEvent('error-retry', { 
          detail: { error, context } 
        }));
      }
    });

    return actions;
  }

  // === Private Helper Methods ===

  private registerDefaultHandlers(): void {
    // API Error Handler
    this.registerHandler('api', {
      canHandle: (error) => error instanceof APIError,
      handle: async (error, context) => this.handleAPIError(error as APIError, context),
      getRecoveryActions: (error, context) => this.getAPIErrorRecoveryActions(error as APIError, context)
    });

    // Storage Error Handler  
    this.registerHandler('storage', {
      canHandle: (error) => error instanceof StorageError,
      handle: async (error, context) => this.handleStorageError(error as StorageError, context),
      getRecoveryActions: (error, context) => this.getStorageErrorRecoveryActions(error as StorageError, context)
    });

    // Service Error Handler
    this.registerHandler('service', {
      canHandle: (error) => error instanceof ServiceError,
      handle: async (error, context) => this.handleServiceError(error as ServiceError, context),
      getRecoveryActions: (error, context) => this.getServiceErrorRecoveryActions(error as ServiceError, context)
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          service: 'ui',
          operation: 'unhandled-promise-rejection',
          timestamp: Date.now(),
          metadata: { type: 'unhandledrejection' }
        });
      });

      // Global error handler
      window.addEventListener('error', (event) => {
        this.handleError(event.error || event.message, {
          service: 'ui',
          operation: 'global-error',
          timestamp: Date.now(),
          metadata: { 
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });
    }
  }

  private findHandler(error: unknown): ErrorHandler | undefined {
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(error)) {
        return handler;
      }
    }
    return undefined;
  }

  private createDefaultErrorResponse(error: unknown, context: ErrorContext): ErrorResponse {
    return {
      success: false,
      error: extractErrorMessage(error),
      userMessage: '予期しないエラーが発生しました。しばらくしてからお試しください。',
      canRetry: isRecoverableError(error),
      timestamp: Date.now(),
      debugInfo: {
        errorType: error?.constructor?.name || 'Unknown',
        context
      }
    };
  }

  private createFallbackErrorResponse(error: unknown, context: ErrorContext): ErrorResponse {
    return {
      success: false,
      error: 'Error handler failed',
      userMessage: 'システムエラーが発生しました。ページを更新してお試しください。',
      canRetry: false,
      timestamp: Date.now(),
      debugInfo: {
        originalError: extractErrorMessage(error),
        context
      }
    };
  }

  private calculateRetryDelay(statusCode: number): number {
    if (statusCode === 429) return 5000; // 5 seconds for rate limiting
    if (statusCode >= 500) return 3000;  // 3 seconds for server errors
    return 1000; // 1 second default
  }

  private shouldShowNotification(error: unknown, severity: ErrorSeverity): boolean {
    // Don't show notifications for debug/info level errors
    if (severity === ErrorSeverity.DEBUG || severity === ErrorSeverity.INFO) {
      return false;
    }

    // Show notifications for user-facing errors
    return true;
  }

  private showUserNotification(response: ErrorResponse): void {
    if (this.notificationService) {
      const persistent = !response.canRetry;
      this.notificationService.showError(
        response.userMessage, 
        response.recoveryActions,
        persistent
      );
    }
  }

  private logError(error: unknown, context: ErrorContext, severity: ErrorSeverity): void {
    if (this.logger) {
      this.logger.log(error, context, severity);
    } else {
      // Fallback console logging
      const logData = {
        error: extractErrorMessage(error),
        stack: extractErrorStack(error),
        context,
        severity,
        timestamp: new Date().toISOString()
      };

      switch (severity) {
        case ErrorSeverity.DEBUG:
          console.debug('Error:', logData);
          break;
        case ErrorSeverity.INFO:
          console.info('Error:', logData);
          break;
        case ErrorSeverity.WARN:
          console.warn('Error:', logData);
          break;
        case ErrorSeverity.ERROR:
        case ErrorSeverity.CRITICAL:
        default:
          console.error('Error:', logData);
          break;
      }
    }
  }

  private recordError(error: unknown, context: ErrorContext): void {
    this.errorHistory.push({
      error,
      context,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  // === Public Utility Methods ===

  getErrorHistory(): Array<{ error: unknown; context: ErrorContext; timestamp: number }> {
    return [...this.errorHistory];
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  getErrorStats(): { total: number; byService: Record<string, number>; bySeverity: Record<string, number> } {
    const stats = {
      total: this.errorHistory.length,
      byService: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    this.errorHistory.forEach(({ error, context }) => {
      // Count by service
      const service = context.service;
      stats.byService[service] = (stats.byService[service] || 0) + 1;

      // Count by severity
      const severity = getErrorSeverity(error);
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });

    return stats;
  }
}

// === Singleton Export ===
export const errorManager = UnifiedErrorManager.getInstance();