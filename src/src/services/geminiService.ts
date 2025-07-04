import type { GeminiConfig, GeminiRequest, GeminiResponse, Message, ApiError } from '../types';

export class GeminiService {
  private static readonly API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private static readonly DEFAULT_CONFIG = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };

  static async generateReply(
    messages: Message[],
    config: GeminiConfig
  ): Promise<string> {
    try {
      const request: GeminiRequest = {
        contents: messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: config.temperature ?? this.DEFAULT_CONFIG.temperature,
          topK: 1,
          topP: 1,
          maxOutputTokens: config.maxOutputTokens ?? this.DEFAULT_CONFIG.maxOutputTokens,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response candidates received from Gemini API');
      }

      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Invalid response format from Gemini API');
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw this.handleApiError(error);
    }
  }

  private static handleApiError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error,
      };
    }
    return {
      message: 'Unknown error occurred while calling Gemini API',
      details: error,
    };
  }

  static validateApiKey(apiKey: string): boolean {
    return !!(apiKey && apiKey.trim().length > 0 && apiKey.startsWith('AIza'));
  }
}