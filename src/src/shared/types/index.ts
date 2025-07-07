/**
 * Unified type definitions for the Multi Channel Reply Support Tool
 * This file consolidates all type definitions to eliminate duplication
 */

// === Core Message Types ===

/**
 * Unified message interface for API communication
 */
export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: number;
}

/**
 * Service-level message interface for extracting conversation data
 */
export interface ServiceMessage {
  author: string;
  text: string;
  timestamp?: Date;
}

/**
 * Internal conversation message with additional metadata
 */
export interface ConversationMessage extends ServiceMessage {
  id?: string;
  service: ServiceType;
  threadId?: string;
}

// === Service Types ===

export type ServiceType = 'gmail' | 'chatwork' | 'google-chat' | 'line-official-account';

export interface ServiceStrategy {
  /** ボタンを挿入すべきDOM要素を見つける */
  findInsertionPoint(): HTMLElement | null | Promise<HTMLElement | null>;

  /** 現在の会話の文脈（メッセージ履歴）を抽出する */
  extractMessages(): ServiceMessage[];

  /** 指定されたテキストを入力欄に挿入する */
  insertReply(text: string): void;

  /** AI返信ボタンが既に挿入済みかチェックする */
  isButtonInjected(): boolean;

  /** サービス名を返す */
  getServiceName(): ServiceType;

  /** スレッドIDまたは会話IDを取得する（キャッシュ用） */
  getThreadId(): string | null;
}

// === API Configuration Types ===

export interface GeminiConfig {
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// === Storage Types ===

export type StorageKey = 'settings.apiKey' | 'settings.userSettings' | string;

export interface StorageItem<T = any> {
  value: T;
  expiresAt?: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'ja' | 'en';
  autoSave?: boolean;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  enableNotifications?: boolean;
}

// === Context and Cache Types ===

export interface ConversationContext {
  messages: GeminiMessage[];
  threadId?: string;
  service: ServiceType;
  expiresAt?: number;
  metadata?: {
    lastUpdated: number;
    messageCount: number;
    participants: string[];
  };
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  service: ServiceType;
  threadId: string;
}

// === Error Types ===

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
  timestamp?: number;
}

export interface StorageError extends Error {
  key?: string;
  operation?: 'get' | 'set' | 'remove' | 'clear';
}

export interface ServiceError extends Error {
  service: ServiceType;
  operation?: string;
  element?: HTMLElement;
}

// === UI Component Types ===

export interface ButtonConfig {
  text?: string;
  icon?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export interface ModalConfig {
  title?: string;
  content?: string;
  showCloseButton?: boolean;
  showOverlay?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  maxWidth?: string;
  maxHeight?: string;
}

export interface NotificationConfig {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    text: string;
    action: () => void;
  }>;
}

// === Event Types ===

export interface ServiceEvent {
  type: 'button-injected' | 'reply-generated' | 'error' | 'context-extracted';
  service: ServiceType;
  data?: any;
  timestamp: number;
}

export interface StorageEvent {
  type: 'settings-updated' | 'cache-cleared' | 'storage-full';
  key?: string;
  data?: any;
  timestamp: number;
}

// === Utility Types ===

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// === Type Guards ===

export function isServiceMessage(obj: any): obj is ServiceMessage {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.author === 'string' &&
    typeof obj.text === 'string' &&
    (obj.timestamp === undefined || obj.timestamp instanceof Date)
  );
}

export function isGeminiMessage(obj: any): obj is GeminiMessage {
  return (
    obj &&
    typeof obj === 'object' &&
    (obj.role === 'user' || obj.role === 'model') &&
    typeof obj.content === 'string' &&
    (obj.timestamp === undefined || typeof obj.timestamp === 'number')
  );
}

export function isServiceType(value: any): value is ServiceType {
  return value === 'gmail' || value === 'chatwork' || value === 'google-chat' || value === 'line-official-account';
}

export function isApiError(obj: any): obj is ApiError {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.message === 'string'
  );
}

// === Type Conversion Utilities ===

export class MessageConverter {
  /**
   * Convert ServiceMessage to GeminiMessage
   */
  static serviceToGemini(serviceMessage: ServiceMessage): GeminiMessage {
    return {
      role: 'user', // Service messages are typically user messages
      content: `${serviceMessage.author}: ${serviceMessage.text}`,
      timestamp: serviceMessage.timestamp ? serviceMessage.timestamp.getTime() : Date.now()
    };
  }

  /**
   * Convert multiple ServiceMessages to GeminiMessages
   */
  static serviceArrayToGemini(serviceMessages: ServiceMessage[]): GeminiMessage[] {
    return serviceMessages.map(msg => this.serviceToGemini(msg));
  }

  /**
   * Convert ServiceMessages to conversation text
   */
  static serviceToText(serviceMessages: ServiceMessage[]): string {
    return serviceMessages
      .map(msg => `${msg.author}: ${msg.text}`)
      .join('\n\n');
  }

  /**
   * Create GeminiMessage from text and role
   */
  static createGeminiMessage(content: string, role: 'user' | 'model' = 'user'): GeminiMessage {
    return {
      role,
      content,
      timestamp: Date.now()
    };
  }
}

// === Configuration Constants ===

export const DEFAULT_CONFIG = {
  GEMINI: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topK: 1,
    topP: 1
  },
  CACHE: {
    defaultTTL: 60 * 60 * 1000, // 1 hour
    maxEntries: 100,
    cleanupInterval: 10 * 60 * 1000 // 10 minutes
  },
  UI: {
    buttonText: '🤖 AI返信生成',
    modalMaxWidth: '600px',
    modalMaxHeight: '80vh',
    notificationDuration: 5000
  },
  RETRY: {
    maxAttempts: 5,
    delay: 1000,
    backoff: 1.5
  }
} as const;

export type ConfigType = typeof DEFAULT_CONFIG;