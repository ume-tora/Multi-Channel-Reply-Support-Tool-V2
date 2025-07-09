/**
 * サービス固有の設定を統一管理
 */
export interface ServiceConfig {
  serviceName: string;
  displayName: string;
  color: string;
  buttonSelectors: string[];
  inputSelectors: string[];
  messageSelectors: string[];
  pageDetectionSelectors: string[];
  urlPatterns: string[];
  timeouts: {
    short: number;
    medium: number;
    long: number;
  };
}

export const CHATWORK_CONFIG: ServiceConfig = {
  serviceName: 'chatwork',
  displayName: 'Chatwork',
  color: '#00a0e9',
  
  buttonSelectors: [
    // 2025年最新のChatwork UI対応 - ファイル関連ボタンを除外して確実性を重視
    'button[data-testid*="send"]:not([data-testid*="file"]):not([data-testid*="attach"])',
    'button[data-testid*="submit"]:not([data-testid*="file"]):not([data-testid*="attach"])',
    'div[role="button"][aria-label*="送信"]:not([aria-label*="ファイル"]):not([aria-label*="添付"])',
    'div[role="button"][title*="送信"]:not([title*="ファイル"]):not([title*="添付"])',
    'button[aria-label*="送信"]:not([aria-label*="ファイル"]):not([aria-label*="添付"])',
    'button[title*="送信"]:not([title*="ファイル"]):not([title*="添付"])',
    'button[aria-label*="Send"]:not([aria-label*="file"]):not([aria-label*="attach"])',
    'button[title*="Send"]:not([title*="file"]):not([title*="attach"])',
    'button[type="submit"]:not([disabled]):not([class*="file"]):not([class*="attach"])',
    'input[type="submit"]:not([disabled]):not([class*="file"]):not([class*="attach"])',
    
    // React/Vue.js系の動的セレクタ (確実性重視)
    'div[role="button"]:has-text("送信")',
    'div[role="button"]:has-text("Send")',
    'button:has-text("送信")',
    'button:has-text("Send")',
    'button[class*="send-button"]',
    'button[class*="SendButton"]',
    'button[class*="submit-button"]',
    'button[class*="SubmitButton"]',
    'button[class*="message-send"]',
    'button[class*="MessageSend"]',
    'div[class*="send-button"]',
    'div[class*="submit-button"]',
    'button[id*="send"]',
    'button[id*="submit"]',
    
    // Chatwork特有のセレクタ (ファイル関連を除外)
    '#_sendButton:not([class*="file"]):not([class*="attach"])',
    '#_chatSendTool input[type="submit"]:not([class*="file"])',
    '#_chatSendTool button:not([class*="file"]):not([class*="attach"])',
    '.send_button:not([class*="file"])', 
    '.chatSendButton:not([class*="file"])',
    '.chat-send-button:not([class*="file"])',
    '.message-send-button:not([class*="file"])',
    'input[value="送信"]:not([class*="file"])',
    'button[value="送信"]:not([class*="file"])',
    '[data-action="send"]:not([data-action*="file"]):not([data-action*="attach"])',
    '[data-tip*="送信"]:not([data-tip*="ファイル"]):not([data-tip*="添付"])',
    '[data-tooltip*="送信"]:not([data-tooltip*="ファイル"]):not([data-tooltip*="添付"])',
    
    // Chatworkメッセージ送信に特化したセレクタ
    'button[class*="message"][class*="send"]:not([class*="file"])',
    'button[id*="message"][id*="send"]:not([id*="file"])',
    'div[role="button"][class*="chat"][class*="send"]:not([class*="file"])',
    
    // フォーム系 (より具体的)
    'form[action*="send"] button[type="submit"]',
    'form[action*="message"] input[type="submit"]',
    '.chatInput button[type="submit"]',
    '.chat-input button[type="submit"]',
    '#chat_input_area button[type="submit"]',
    '#_chatText ~ * button[type="submit"]',
    'textarea[name="message"] ~ * button[type="submit"]',
    
    // 現代的なSPA構造対応
    'div[role="button"][data-action="send"]',
    'span[role="button"][data-action="send"]',
    'button:has-text("送信")',
    'button:has-text("Send")',
    'button:has-text("投稿")',
    'button:has-text("Post")',
    
    // 汎用セレクタ (最後の手段)
    'button:contains("送信")',
    'button:contains("Send")',
    'input[type="submit"]:contains("送信")',
    'input[type="submit"]:contains("Send")'
  ],
  
  inputSelectors: [
    // 2025年最新のChatwork UI対応
    'textarea[data-testid="message-input"]',
    'textarea[data-testid="chat-input"]',
    'textarea[data-testid="text-input"]',
    'div[contenteditable="true"][data-testid="message-input"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="メッセージ"]',
    'div[contenteditable="true"][aria-label*="message"]',
    
    // React/Vue.js系の動的セレクタ
    'textarea[class*="message-input"]',
    'textarea[class*="MessageInput"]',
    'textarea[class*="chat-input"]',
    'textarea[class*="ChatInput"]',
    'textarea[class*="text-input"]',
    'textarea[class*="TextInput"]',
    'div[contenteditable="true"][class*="message-input"]',
    'div[contenteditable="true"][class*="MessageInput"]',
    'div[contenteditable="true"][class*="chat-input"]',
    'div[contenteditable="true"][class*="ChatInput"]',
    
    // レガシーなChatwork特有のセレクタ
    '#_chatText',
    'textarea[name="message"]',
    '.chatInput textarea',
    '#chat_input_area textarea',
    '#_chatSendTool textarea',
    
    // プレースホルダー基準
    'textarea[placeholder*="メッセージ"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="入力"]',
    'textarea[placeholder*="Input"]',
    'textarea[placeholder*="テキスト"]',
    'textarea[placeholder*="Text"]',
    'textarea[placeholder*="送信"]',
    'textarea[placeholder*="Send"]',
    'textarea[placeholder*="Shift"]',
    'div[contenteditable="true"][placeholder*="メッセージ"]',
    'div[contenteditable="true"][placeholder*="message"]',
    'div[contenteditable="true"][placeholder*="Message"]',
    
    // 汎用セレクタ (最後の手段)
    'textarea:not([readonly]):not([disabled])',
    'div[contenteditable="true"]:not([readonly]):not([disabled])',
    'input[type="text"]:not([readonly]):not([disabled])',
    '[role="textbox"]:not([readonly]):not([disabled])'
  ],
  
  messageSelectors: [
    // 2025年最新のChatwork UI対応
    '[data-testid="message"]',
    '[data-testid="chat-message"]',
    '[data-testid="message-item"]',
    '[data-testid="conversation-message"]',
    '[data-message-id]',
    '[data-message-key]',
    '[data-message-index]',
    
    // React/Vue.js系の動的セレクタ
    '[class*="message-item"]',
    '[class*="MessageItem"]',
    '[class*="chat-message"]',
    '[class*="ChatMessage"]',
    '[class*="conversation-message"]',
    '[class*="ConversationMessage"]',
    '[class*="timeline-message"]',
    '[class*="TimelineMessage"]',
    
    // レガシーなChatwork特有のセレクタ
    '.chatMessage',
    '.message',
    '.timeline_message',
    '[class*="message"]',
    '[class*="Message"]',
    '.message-wrapper',
    '.message_content',
    '._message',
    '._chatMessage',
    
    // 構造的セレクタ
    '[role="article"]',
    '[role="listitem"]',
    'li[class*="message"]',
    'div[class*="message"]',
    'article[class*="message"]',
    
    // タイムライン系
    '#_timeLine > *',
    '.timeline > *',
    '.chat-timeline > *',
    '.conversation-timeline > *'
  ],
  
  pageDetectionSelectors: [
    // 2025年最新のChatwork UI対応
    '[data-testid="chat-room"]',
    '[data-testid="chat-workspace"]',
    '[data-testid="message-input"]',
    '[data-testid="send-button"]',
    '[data-testid="chat-content"]',
    '[data-testid="message-list"]',
    '[data-testid="room-header"]',
    '[data-testid="chat-area"]',
    '[data-app-name="chatwork"]',
    '[data-page-type="chat"]',
    
    // React/Vue.js系の動的セレクタ
    '[class*="chat-room"]',
    '[class*="ChatRoom"]',
    '[class*="chat-workspace"]',
    '[class*="ChatWorkspace"]',
    '[class*="message-input"]',
    '[class*="MessageInput"]',
    '[class*="chat-input"]',
    '[class*="ChatInput"]',
    '[class*="chat-content"]',
    '[class*="ChatContent"]',
    '[class*="message-list"]',
    '[class*="MessageList"]',
    
    // レガシーなChatwork特有のセレクタ
    '#_body',
    '#_mainContent',
    '#_roomMemberWrapper',
    '#_timeLine',
    '#_chatText',
    '#_chatSendTool',
    '#chat_input_area',
    '.chatInput',
    '.chatInput textarea',
    'textarea[name="message"]',
    '#chatWorkSpace',
    '#_roomTitle',
    '.room_title',
    '.chat_title',
    
    // 構造的セレクタ
    'main[class*="chat"]',
    'main[class*="Chat"]',
    'section[class*="chat"]',
    'section[class*="Chat"]',
    'div[role="main"][class*="chat"]',
    'div[role="application"][class*="chat"]',
    
    // メタ情報
    'meta[name="application-name"][content*="Chatwork"]',
    'title:contains("Chatwork")',
    'body[class*="chatwork"]',
    'body[data-app*="chatwork"]'
  ],
  
  urlPatterns: [
    'chatwork.com',
    'chatwork.jp'
  ],
  
  timeouts: {
    short: 3000,
    medium: 5000,
    long: 10000
  }
};

export const GMAIL_CONFIG: ServiceConfig = {
  serviceName: 'gmail',
  displayName: 'Gmail',
  color: '#1a73e8',
  
  buttonSelectors: [
    'div[role="button"][data-tooltip*="Send"]',
    'div[role="button"][aria-label*="Send"]',
    'div[role="button"][data-tooltip*="送信"]',
    'div[role="button"][aria-label*="送信"]',
    'div[command="Send"]',
    'div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3',
    'td.gU.Up > div[role="button"]'
  ],
  
  inputSelectors: [
    'div[role="textbox"][aria-label*="compose"]',
    'div[role="textbox"][aria-label*="作成"]',
    'div[contenteditable="true"][role="textbox"]',
    'div.Am.Al.editable',
    'div[g_editable="true"]'
  ],
  
  messageSelectors: [
    'div[role="listitem"] div.ii.gt',
    '.message .ii.gt',
    '.gmail_quote',
    'div[dir="ltr"]'
  ],
  
  pageDetectionSelectors: [
    'div[role="dialog"][aria-label*="作成"]',
    'div[role="dialog"][aria-label*="compose"]',
    'div[role="dialog"][aria-label*="新しいメッセージ"]',
    'div[role="dialog"][aria-label*="New message"]',
    'div[aria-label="書式設定オプション"]',
    'div[aria-label="Formatting options"]'
  ],
  
  urlPatterns: [
    'mail.google.com'
  ],
  
  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000
  }
};

export const LINE_CONFIG: ServiceConfig = {
  serviceName: 'line-official-account',
  displayName: 'LINE公式アカウント',
  color: '#00c300',
  
  buttonSelectors: [
    'button[data-testid="send-button"]',
    'button[aria-label*="送信"]',
    'button[type="submit"]',
    '.send-button',
    '.line-send-button',
    'button[class*="send"]'
  ],
  
  inputSelectors: [
    'textarea[placeholder*="メッセージ"]',
    'textarea[data-testid="message-input"]',
    '.message-input textarea',
    'div[contenteditable="true"]'
  ],
  
  messageSelectors: [
    '[data-message-id]',
    '.message',
    '.chat-message',
    '.line-message'
  ],
  
  pageDetectionSelectors: [
    '.line-manager',
    '.official-account',
    '[data-testid="chat-room"]'
  ],
  
  urlPatterns: [
    'manager.line.biz',
    'line.me/R/oa'
  ],
  
  timeouts: {
    short: 3000,
    medium: 5000,
    long: 10000
  }
};

export const GOOGLE_CHAT_CONFIG: ServiceConfig = {
  serviceName: 'google-chat',
  displayName: 'Google Chat',
  color: '#4285f4',
  
  buttonSelectors: [
    // 2025年最新のGoogle Chat送信ボタン
    'button[data-testid="send-button"]',
    'button[data-testid*="send"]:not([disabled])',
    'button[aria-label*="Send message"]',
    'button[aria-label*="メッセージを送信"]',
    'button[aria-label*="送信"]:not([disabled])',
    'button[aria-label*="Send"]:not([disabled])',
    'button[title*="送信"]:not([disabled])',
    'button[title*="Send"]:not([disabled])',
    
    // アイコンベースのセレクタ
    'button:has([data-icon="send"])',
    'button:has(.google-material-icons:contains("send"))',
    'button[class*="send"]:not([class*="file"]):not([disabled])',
    
    // Google Chat特有のセレクタ
    'div[role="button"][aria-label*="送信"]',
    'div[role="button"][aria-label*="Send"]',
    'button[id*="send"]:not([id*="file"]):not([disabled])',
    'div[data-testid*="send"]',
    
    // 構造ベースのセレクタ
    '[role="main"] button[type="submit"]:not([disabled])',
    '.VfPpkd-LgbsSe button:not([disabled])',
    
    // Gmail統合版Google Chat
    'button[class*="T-I"][class*="J-J5-Ji"]',
    'div[role="button"][data-tooltip*="送信"]',
    'div[role="button"][data-tooltip*="Send"]',
    
    // フォーム系とコンテナベース
    'form button[type="submit"]:not([disabled])',
    'form input[type="submit"]:not([disabled])',
    '.DuMIQc button:not([disabled])', // Google Chat compose area
    '.HM .qP button:not([disabled])', // Chat input area button
    
    // フォールバック
    'button[type="submit"]:not([disabled])',
    'input[type="submit"]:not([disabled])'
  ],
  
  inputSelectors: [
    // 2025年最新のGoogle Chat入力エリア
    'div[data-testid="message-input"]',
    'div[data-testid="chat-input"]',
    'div[role="textbox"][contenteditable="true"]',
    'div[aria-label*="メッセージを送信"]',
    'div[aria-label*="Send a message"]',
    'div[placeholder*="メッセージ"]',
    'div[placeholder*="message"]',
    
    // Google Chat入力エリア（既存）
    'div[contenteditable="true"][aria-label*="メッセージ"]',
    'div[contenteditable="true"][aria-label*="message"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[aria-label*="メッセージ"]',
    'textarea[aria-label*="message"]',
    'input[placeholder*="メッセージ"]',
    'input[placeholder*="message"]',
    
    // Google Chat特有のセレクタ
    'div[contenteditable="true"][data-testid*="input"]',
    'div[contenteditable="true"].editable',
    '.DuMIQc div[contenteditable="true"]',
    '.HM .qP div[contenteditable="true"]',
    
    // 新しいGoogle Chat UI構造
    '[data-tab-id="chat-messages"] div[contenteditable="true"]',
    '[role="main"] div[contenteditable="true"]',
    '.VfPpkd-fmcmS-wGMbrd div[contenteditable="true"]',
    
    // Gmail統合版
    'div[contenteditable="true"][aria-label*="履歴がオンになっています"]',
    'div[contenteditable="true"][aria-label*="History is on"]',
    
    // フォールバック
    'div[contenteditable="true"]:not([readonly])',
    'textarea:not([readonly]):not([disabled])',
    'input[type="text"]:not([readonly]):not([disabled])'
  ],
  
  messageSelectors: [
    // Google Chat メッセージセレクタ
    '[data-message-id]',
    '[role="listitem"]',
    '[jsname="bgckF"]',
    '.Zc1Emd', // Google Chat message class
    '.nF6pT', // Message text class
    '[data-topic-id]',
    
    // Gmail統合版
    'div[data-p*="{"]', // JSON data attributes
    '.zA .y6', // Gmail-like message structure
    '.aOz .aot', // Chat message content
    
    // 一般的なメッセージセレクタ
    '[class*="message"]',
    '[class*="Message"]',
    'div[role="article"]',
    '.message-content',
    '.chat-message'
  ],
  
  pageDetectionSelectors: [
    // Google Chat ページ検出
    '[data-app-name="dynamite"]', // Google Chat app
    '.gb_ec[aria-label*="Google Chat"]',
    '[role="main"][aria-label*="Chat"]',
    '.nH[role="navigation"]', // Gmail navigation
    
    // URL-based detection
    '.DuMIQc', // Chat compose area
    '.HM .qP', // Chat input area
    '[data-ved*="chat"]',
    
    // Gmail統合版
    '.nH.aHU', // Gmail-like structure
    '.zA.yW', // Message list area
    '#msgs', // Messages container
    '.Tm .Ya' // Chat content area
  ],
  
  urlPatterns: [
    'chat.google.com',
    'mail.google.com'
  ],
  
  timeouts: {
    short: 2000,
    medium: 4000,
    long: 8000
  }
};

/**
 * サービス設定を取得
 */
export function getServiceConfig(serviceName: string): ServiceConfig | null {
  switch (serviceName) {
    case 'chatwork':
      return CHATWORK_CONFIG;
    case 'gmail':
      return GMAIL_CONFIG;
    case 'line-official-account':
      return LINE_CONFIG;
    case 'google-chat':
      return GOOGLE_CHAT_CONFIG;
    default:
      return null;
  }
}