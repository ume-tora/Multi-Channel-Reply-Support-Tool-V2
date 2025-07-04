# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Multi Channel Reply Support Tool" that provides AI-powered reply suggestions across multiple communication channels (Gmail, Chatwork, Google Chat). The tool generates contextual replies using Google's Gemini API and provides a unified interface for managing customer support responses.

## Technology Stack

- **Language**: TypeScript
- **Extension**: Chrome Manifest V3
- **UI Framework**: React
- **CSS Framework**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Zustand
- **AI API**: Google Gemini API

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
src/
├── components/
│   ├── ui/              # Generic UI components (Button, Modal, LoadingSpinner)
│   └── features/        # Feature-specific components (ReplyModal, GenerateButton)
├── content-scripts/     # Scripts injected into web pages
├── background/          # Service Worker for background tasks
├── popup/              # Extension popup interface
├── hooks/              # Custom React hooks (e.g., useGemini)
├── services/           # External API services (geminiService)
├── store/              # Zustand state management
├── styles/             # Global styles and Tailwind CSS
└── types/              # TypeScript type definitions
```

## Key Architecture Components

### Content Scripts
- Inject UI elements into Gmail, Chatwork, and Google Chat interfaces
- Handle DOM manipulation and message extraction
- Communicate with background scripts via Chrome messaging API

### Background Service Worker
- Manages Gemini API communications
- Handles cross-tab messaging and storage operations
- Implements caching strategy for conversation context

### Storage Strategy
- Uses `chrome.storage.local` for API keys and settings
- Implements conversation context caching with TTL expiration
- Cache keys follow pattern: `cache_[channel]_[threadId]`

### API Integration
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Authentication**: API key via `x-goog-api-key` header
- **Context**: Sends conversation history for better reply generation

## Development Commands

Since this is a planning phase project, no build system is currently implemented. When implemented, the following commands will be available:

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build extension for production
- `npm run lint` - Run TypeScript and ESLint checks
- `npm run test` - Run test suite

## Chrome Extension Manifest

The extension uses Manifest V3 with the following key permissions:
- `activeTab` - Access current tab content
- `storage` - Local storage for settings and cache
- `scripting` - Inject content scripts
- Host permissions for Gmail, Chatwork, and Google Chat domains

## UI/UX Design Principles

- **Minimal & Non-intrusive**: Blends naturally with existing service UIs
- **Intuitive Operation**: Self-explanatory interface requiring no manual
- **Fast Response**: Sub-3-second response time for reply generation
- **Consistent Design**: Unified experience across all supported channels

## Security Considerations

- API keys stored securely in `chrome.storage.local`
- Content Security Policy compliance for Manifest V3
- No server-side data storage - all data remains local
- Gemini API safety settings configured to block harmful content

## Multi-Channel Support

The extension is designed with modularity to support multiple communication channels:
- **Gmail**: Email thread context extraction
- **Chatwork**: Chat room message parsing
- **Google Chat**: Conversation thread analysis
- **Future channels**: Slack, Facebook Messenger (planned)

## Testing Strategy

- Unit tests for core utilities and API services
- Integration tests for Chrome extension APIs
- Manual testing across supported channels
- Performance testing for reply generation speed

## Deployment Notes

- Extension will be packaged for Chrome Web Store distribution
- API keys must be obtained by users from Google AI Studio
- No backend infrastructure required - fully client-side operation

## Gemini CLI 連携ガイド

### 目的
ユーザーが **「Geminiと相談しながら進めて」** （または同義語）と指示した場合、Claude は以降のタスクを **Gemini CLI** と協調しながら進める。
Gemini から得た回答はそのまま提示し、Claude 自身の解説・統合も付け加えることで、両エージェントの知見を融合する。

---

### トリガー
- 正規表現: `/Gemini.*相談しながら/`
- 例:
- 「Geminiと相談しながら進めて」
- 「この件、Geminiと話しつつやりましょう」

---

### 基本フロー
1. **PROMPT 生成**
Claude はユーザーの要件を 1 つのテキストにまとめ、環境変数 `$PROMPT` に格納する。

2. **Gemini CLI 呼び出し**
```bash
gemini <<EOF
$PROMPT
EOF
```