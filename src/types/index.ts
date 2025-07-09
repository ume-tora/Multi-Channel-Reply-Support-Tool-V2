// Re-export shared types for backward compatibility
export type {
  GeminiMessage as Message, // Legacy alias
  GeminiConfig,
  GeminiRequest,
  GeminiResponse,
  ConversationContext,
  ApiError,
  ServiceMessage,
  ServiceType,
  UserSettings,
  StorageKey,
  StorageItem,
  CacheOptions
} from '../shared/types';

// Legacy compatibility exports
export type { GeminiMessage } from '../shared/types';