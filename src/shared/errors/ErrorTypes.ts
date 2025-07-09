/**
 * Unified error types and interfaces for consistent error handling
 */

import type { ServiceType } from '../types';

// === Base Error Interface ===

export interface ErrorContext {
  service: ServiceType | 'background' | 'storage' | 'ui';
  operation: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  userMessage: string;
  canRetry: boolean;
  retryDelay?: number;
  recoveryActions?: RecoveryAction[];
  timestamp: number;
  debugInfo?: Record<string, unknown>;
}

export interface RecoveryAction {
  id: string;
  label: string;
  action: () => Promise<void>;
  isPrimary?: boolean;
}

// === Custom Error Classes ===

export class BaseError extends Error {
  public readonly timestamp: number;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.context = context;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack,
      context: this.context
    };
  }
}

// === API Errors ===

export class APIError extends BaseError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint?: string,
    public readonly retryable: boolean = false,
    context?: ErrorContext
  ) {
    super(message, `API_ERROR_${status}`, retryable, context);
  }

  static fromResponse(response: Response, endpoint?: string, context?: ErrorContext): APIError {
    const retryable = response.status >= 500 || response.status === 429;
    return new APIError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      endpoint,
      retryable,
      context
    );
  }
}

export class GeminiAPIError extends APIError {
  constructor(
    message: string,
    status: number,
    public readonly apiKey?: string,
    context?: ErrorContext
  ) {
    super(message, status, 'gemini-api', status !== 401 && status !== 403, context);
  }

  getUserMessage(): string {
    switch (this.status) {
      case 401:
      case 403:
        return 'APIキーが無効です。拡張機能の設定でAPIキーを確認してください。';
      case 429:
        return 'API利用制限に達しました。しばらく待ってからお試しください。';
      case 500:
      case 502:
      case 503:
        return 'Gemini APIで一時的な問題が発生しています。しばらく待ってからお試しください。';
      default:
        return 'AI返信生成でエラーが発生しました。';
    }
  }
}

// === Storage Errors ===

export class StorageError extends BaseError {
  constructor(
    message: string,
    public readonly operation: 'get' | 'set' | 'remove' | 'clear',
    public readonly key?: string,
    context?: ErrorContext
  ) {
    super(message, `STORAGE_ERROR_${operation.toUpperCase()}`, true, context);
  }

  getUserMessage(): string {
    switch (this.operation) {
      case 'set':
        return 'データの保存に失敗しました。ストレージ容量を確認してください。';
      case 'get':
        return 'データの読み込みに失敗しました。';
      case 'clear':
        return 'データの削除に失敗しました。';
      default:
        return 'ストレージ操作でエラーが発生しました。';
    }
  }
}

export class StorageQuotaError extends StorageError {
  constructor(
    public readonly used: number,
    public readonly quota: number,
    context?: ErrorContext
  ) {
    super(
      `Storage quota exceeded: ${used}/${quota} bytes`,
      'set',
      undefined,
      context
    );
    this.code = 'STORAGE_QUOTA_EXCEEDED';
  }

  getUserMessage(): string {
    return 'ストレージ容量が不足しています。不要なデータを削除してください。';
  }
}

// === Service Errors ===

export class ServiceError extends BaseError {
  constructor(
    message: string,
    public readonly service: ServiceType,
    public readonly operation: string,
    recoverable: boolean = true,
    context?: ErrorContext
  ) {
    super(message, `SERVICE_ERROR_${service.toUpperCase()}`, recoverable, context);
  }

  getUserMessage(): string {
    switch (this.service) {
      case 'gmail':
        return 'Gmailでの操作中にエラーが発生しました。ページを更新してお試しください。';
      case 'chatwork':
        return 'Chatworkでの操作中にエラーが発生しました。ページを更新してお試しください。';
      case 'google-chat':
        return 'Google Chatでの操作中にエラーが発生しました。ページを更新してお試しください。';
      default:
        return 'サービス操作中にエラーが発生しました。';
    }
  }
}

export class DOMError extends ServiceError {
  constructor(
    message: string,
    service: ServiceType,
    public readonly selector?: string,
    context?: ErrorContext
  ) {
    super(message, service, 'dom-manipulation', true, context);
    this.code = 'DOM_ERROR';
  }

  getUserMessage(): string {
    return `${this.service}のページ構造が変更されている可能性があります。ページを更新してお試しください。`;
  }
}

// === Network Errors ===

export class NetworkError extends BaseError {
  constructor(
    message: string,
    public readonly type: 'timeout' | 'offline' | 'connection' | 'dns',
    context?: ErrorContext
  ) {
    super(message, `NETWORK_ERROR_${type.toUpperCase()}`, true, context);
  }

  getUserMessage(): string {
    switch (this.type) {
      case 'timeout':
        return 'リクエストがタイムアウトしました。インターネット接続を確認してお試しください。';
      case 'offline':
        return 'オフラインです。インターネット接続を確認してお試しください。';
      case 'connection':
        return 'ネットワーク接続エラーが発生しました。';
      case 'dns':
        return 'DNS解決エラーが発生しました。';
      default:
        return 'ネットワークエラーが発生しました。';
    }
  }
}

// === Permission Errors ===

export class PermissionError extends BaseError {
  constructor(
    message: string,
    public readonly permission: string,
    context?: ErrorContext
  ) {
    super(message, 'PERMISSION_ERROR', false, context);
  }

  getUserMessage(): string {
    return `必要な権限（${this.permission}）がありません。拡張機能の設定を確認してください。`;
  }
}

// === UI Errors ===

export class UIError extends BaseError {
  constructor(
    message: string,
    public readonly component: string,
    public readonly action: string,
    context?: ErrorContext
  ) {
    super(message, 'UI_ERROR', true, context);
  }

  getUserMessage(): string {
    return 'UIでエラーが発生しました。ページを更新してお試しください。';
  }
}

// === Validation Errors ===

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    context?: ErrorContext
  ) {
    super(message, 'VALIDATION_ERROR', false, context);
  }

  getUserMessage(): string {
    return `入力値（${this.field}）が不正です。`;
  }
}

// === Error Type Guards ===

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isGeminiAPIError(error: unknown): error is GeminiAPIError {
  return error instanceof GeminiAPIError;
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

export function isStorageQuotaError(error: unknown): error is StorageQuotaError {
  return error instanceof StorageQuotaError;
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function isDOMError(error: unknown): error is DOMError {
  return error instanceof DOMError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError;
}

export function isUIError(error: unknown): error is UIError {
  return error instanceof UIError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof BaseError) {
    return error.recoverable;
  }
  return false;
}

// === Error Severity Levels ===

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isPermissionError(error) || (isAPIError(error) && error.status === 401)) {
    return ErrorSeverity.CRITICAL;
  }
  
  if (isStorageQuotaError(error) || (isAPIError(error) && error.status >= 500)) {
    return ErrorSeverity.ERROR;
  }
  
  if (isNetworkError(error) || isDOMError(error)) {
    return ErrorSeverity.WARN;
  }
  
  if (isValidationError(error)) {
    return ErrorSeverity.INFO;
  }
  
  return ErrorSeverity.ERROR;
}

// === Utility Functions ===

export function createErrorContext(
  service: ErrorContext['service'],
  operation: string,
  metadata?: Record<string, unknown>
): ErrorContext {
  return {
    service,
    operation,
    timestamp: Date.now(),
    metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error occurred';
}

export function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  
  return undefined;
}