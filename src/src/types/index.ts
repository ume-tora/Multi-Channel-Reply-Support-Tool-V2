export interface GeminiConfig {
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp?: number;
}

export interface GeminiRequest {
  contents: Array<{
    role: 'user' | 'model';
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
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<any>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface ConversationContext {
  messages: Message[];
  threadId?: string;
  channel: 'gmail' | 'chatwork' | 'google-chat';
  expiresAt?: number;
}

export interface ApiError {
  message: string;
  code?: number;
  details?: any;
}