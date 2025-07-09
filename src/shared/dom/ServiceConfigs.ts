/**
 * Service-specific DOM selector configurations
 * Centralized configuration for all supported services
 */

import type { SelectorConfig } from './DOMStrategy';

/**
 * Gmail selector configurations with priority ordering
 */
export const GMAIL_CONFIGS: SelectorConfig[] = [
  // High priority - Modern Gmail UI
  {
    selectors: [
      'div[role="toolbar"] div[data-tooltip*="返信"]',
      'div[role="toolbar"] div[data-tooltip*="Reply"]',
      'div[role="toolbar"] div[aria-label*="返信"]',
      'div[role="toolbar"] div[aria-label*="Reply"]'
    ],
    description: 'Modern Gmail toolbar reply buttons',
    priority: 100
  },

  // Medium-high priority - Compose areas
  {
    selectors: [
      'div[aria-label*="メッセージ本文"]',
      'div[aria-label*="Message body"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="compose"]'
    ],
    description: 'Gmail compose text areas',
    priority: 90
  },

  // Medium priority - Toolbar containers
  {
    selectors: [
      'div[role="toolbar"]:has(span[data-tooltip*="返信"])',
      'div[role="toolbar"]:has(span[data-tooltip*="Reply"])',
      'div[jsaction*="reply"]',
      'div[data-message-id] div[role="toolbar"]'
    ],
    description: 'Gmail toolbar containers',
    priority: 80
  },

  // Medium-low priority - Message containers
  {
    selectors: [
      'div[data-message-id] .adn:last-child',
      'div[data-message-id] .ii.gt div:last-child',
      'div[role="listitem"] .adn:last-child'
    ],
    description: 'Gmail message containers',
    priority: 70
  },

  // Low priority - Generic containers
  {
    selectors: [
      'div[role="main"] div:last-child',
      '.nH .nH .no .adn',
      '.ii.gt > div:last-child'
    ],
    description: 'Gmail generic containers',
    priority: 60
  },

  // Fallback - Very generic
  {
    selectors: [
      '[role="main"]',
      '.nH',
      'body'
    ],
    description: 'Gmail fallback containers',
    priority: 10
  }
];

/**
 * Chatwork selector configurations
 */
export const CHATWORK_CONFIGS: SelectorConfig[] = [
  // High priority - Message input areas
  {
    selectors: [
      '#_chatText',
      'textarea[name="message"]',
      '.chatInput textarea',
      '#chat_input_area textarea'
    ],
    description: 'Chatwork message input areas',
    priority: 100
  },

  // Medium-high priority - Input containers
  {
    selectors: [
      '#chat_input_area',
      '.chatInput',
      '.inputTools',
      '#_chatSendTool'
    ],
    description: 'Chatwork input containers',
    priority: 90
  },

  // Medium priority - Message forms
  {
    selectors: [
      '#chat_input_form',
      'form[name="chatForm"]',
      '.chatForm'
    ],
    description: 'Chatwork message forms',
    priority: 80
  },

  // Low priority - Chat containers
  {
    selectors: [
      '#_chatContent',
      '#chatWorkSpace',
      '.chatWork'
    ],
    description: 'Chatwork chat containers',
    priority: 70
  },

  // Fallback
  {
    selectors: [
      '#main',
      'body'
    ],
    description: 'Chatwork fallback containers',
    priority: 10
  }
];

/**
 * Google Chat selector configurations
 */
export const GOOGLE_CHAT_CONFIGS: SelectorConfig[] = [
  // High priority - Message input
  {
    selectors: [
      'div[contenteditable="true"][aria-label*="メッセージ"]',
      'div[contenteditable="true"][aria-label*="message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-tab-id="1"] div[contenteditable="true"]'
    ],
    description: 'Google Chat message input',
    priority: 100
  },

  // Medium-high priority - Input containers
  {
    selectors: [
      'div[jsaction*="sendMessage"]',
      'div[data-tab-id="1"] form',
      '.kO001e',
      '.notranslate div[contenteditable="true"]'
    ],
    description: 'Google Chat input containers',
    priority: 90
  },

  // Medium priority - Message areas
  {
    selectors: [
      'div[role="complementary"] form',
      'div[role="main"] form',
      '.XoqCub'
    ],
    description: 'Google Chat message areas',
    priority: 80
  },

  // Low priority - Chat containers
  {
    selectors: [
      'div[role="main"]',
      '.Riuhhf',
      '.nF6pT'
    ],
    description: 'Google Chat containers',
    priority: 70
  },

  // Fallback
  {
    selectors: [
      '[role="main"]',
      'body'
    ],
    description: 'Google Chat fallback',
    priority: 10
  }
];

/**
 * Get selector configs for a specific service
 */
export function getServiceConfigs(serviceName: string): SelectorConfig[] {
  switch (serviceName.toLowerCase()) {
    case 'gmail':
      return GMAIL_CONFIGS;
    case 'chatwork':
      return CHATWORK_CONFIGS;
    case 'google-chat':
    case 'googlechat':
      return GOOGLE_CHAT_CONFIGS;
    default:
      console.warn(`Unknown service: ${serviceName}`);
      return [];
  }
}

/**
 * Common popup selector configurations (used across services)
 */
export const POPUP_CONFIGS: SelectorConfig[] = [
  {
    selectors: [
      'div[role="dialog"] div[role="toolbar"]',
      'div[aria-modal="true"] div[role="toolbar"]',
      '.modal div[role="toolbar"]'
    ],
    description: 'Popup toolbar containers',
    priority: 100
  },
  {
    selectors: [
      'div[role="dialog"] form',
      'div[aria-modal="true"] form',
      '.modal form'
    ],
    description: 'Popup form containers',
    priority: 90
  },
  {
    selectors: [
      'div[role="dialog"]',
      'div[aria-modal="true"]',
      '.modal'
    ],
    description: 'Popup containers',
    priority: 80
  }
];