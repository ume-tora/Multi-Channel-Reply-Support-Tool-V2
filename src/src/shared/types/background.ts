/**
 * Background script specific type definitions
 */

// === Background Message Types ===

export type BackgroundMessageType = 
  | 'GET_API_KEY'
  | 'SET_API_KEY'
  | 'GET_CACHED_CONTEXT'
  | 'SET_CACHED_CONTEXT'
  | 'CLEAR_CACHE'
  | 'GET_STORAGE_INFO';

export interface BaseBackgroundMessage {
  type: BackgroundMessageType;
  timestamp?: number;
}

export interface GetApiKeyMessage extends BaseBackgroundMessage {
  type: 'GET_API_KEY';
}

export interface SetApiKeyMessage extends BaseBackgroundMessage {
  type: 'SET_API_KEY';
  apiKey: string;
}

export interface GetCachedContextMessage extends BaseBackgroundMessage {
  type: 'GET_CACHED_CONTEXT';
  channel: string;
  threadId: string;
}

export interface SetCachedContextMessage extends BaseBackgroundMessage {
  type: 'SET_CACHED_CONTEXT';
  channel: string;
  threadId: string;
  context: unknown; // Will be typed as ConversationContext at runtime
}

export interface ClearCacheMessage extends BaseBackgroundMessage {
  type: 'CLEAR_CACHE';
}

export interface GetStorageInfoMessage extends BaseBackgroundMessage {
  type: 'GET_STORAGE_INFO';
}

export type BackgroundMessage = 
  | GetApiKeyMessage
  | SetApiKeyMessage
  | GetCachedContextMessage
  | SetCachedContextMessage
  | ClearCacheMessage
  | GetStorageInfoMessage;

// === Background Response Types ===

export interface BaseBackgroundResponse {
  success: boolean;
  error?: string;
  timestamp?: number;
}

export interface ApiKeyResponse extends BaseBackgroundResponse {
  apiKey?: string | null;
}

export interface CachedContextResponse extends BaseBackgroundResponse {
  context?: unknown | null;
}

export interface StorageInfoResponse extends BaseBackgroundResponse {
  info?: {
    storageUsage: number;
    hasApiKey: boolean;
    maxStorage: number;
  };
}

export type BackgroundResponse = 
  | BaseBackgroundResponse
  | ApiKeyResponse
  | CachedContextResponse
  | StorageInfoResponse;

// === Runtime Types ===

export interface ChromeRuntimeSender {
  tab?: chrome.tabs.Tab;
  frameId?: number;
  id?: string;
  url?: string;
  tlsChannelId?: string;
}

export type ChromeRuntimeSendResponse = (response: BackgroundResponse) => void;

// === Installation Details ===

export interface InstallationDetails {
  reason: chrome.runtime.OnInstalledReason;
  previousVersion?: string;
  id?: string;
}

// === Type Guards ===

export function isBackgroundMessage(obj: unknown): obj is BackgroundMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as any).type === 'string'
  );
}

export function isGetApiKeyMessage(msg: BackgroundMessage): msg is GetApiKeyMessage {
  return msg.type === 'GET_API_KEY';
}

export function isSetApiKeyMessage(msg: BackgroundMessage): msg is SetApiKeyMessage {
  return msg.type === 'SET_API_KEY';
}

export function isGetCachedContextMessage(msg: BackgroundMessage): msg is GetCachedContextMessage {
  return msg.type === 'GET_CACHED_CONTEXT';
}

export function isSetCachedContextMessage(msg: BackgroundMessage): msg is SetCachedContextMessage {
  return msg.type === 'SET_CACHED_CONTEXT';
}

export function isClearCacheMessage(msg: BackgroundMessage): msg is ClearCacheMessage {
  return msg.type === 'CLEAR_CACHE';
}

export function isGetStorageInfoMessage(msg: BackgroundMessage): msg is GetStorageInfoMessage {
  return msg.type === 'GET_STORAGE_INFO';
}

// === Error Handling ===

export interface BackgroundError extends Error {
  type: BackgroundMessageType;
  context?: Record<string, unknown>;
}

export function createBackgroundError(
  message: string,
  type: BackgroundMessageType,
  context?: Record<string, unknown>
): BackgroundError {
  const error = new Error(message) as BackgroundError;
  error.type = type;
  error.context = context;
  return error;
}