/**
 * Common button factory for creating AI reply buttons
 * Centralizes button creation logic to eliminate code duplication
 */

import type { ServiceType } from '../types';

export interface AIButtonConfig {
  id?: string;
  className?: string;
  title?: string;
  text?: string;
  icon?: string;
  variant?: 'standard' | 'gmail' | 'chatwork' | 'google-chat';
  onClick?: () => void;
  draggable?: boolean;
  position?: 'static' | 'fixed';
}

export class ButtonFactory {
  private static readonly DEFAULT_STYLES = {
    backgroundColor: '#16a34a',
    hoverBackgroundColor: '#15803d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  };

  private static readonly VARIANT_STYLES = {
    standard: {
      padding: '6px 12px'
    },
    gmail: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '2px solid #16a34a',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.5)',
      width: '140px',
      height: '40px',
      textAlign: 'center' as const
    },
    chatwork: {
      padding: '8px 12px',
      margin: '4px',
      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
      flexShrink: '0'
    },
    'google-chat': {
      padding: '6px 12px'
    },
    'line-official-account': {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '2px solid #16a34a',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
      width: '140px',
      height: '40px',
      textAlign: 'center' as const
    }
  };

  /**
   * Create an AI reply button with consistent styling
   */
  static createAIButton(config: AIButtonConfig = {}): HTMLButtonElement {
    const {
      id = 'ai-reply-button',
      className = 'gemini-reply-button',
      title = 'AI返信案を生成',
      text = 'AI返信',
      icon = '🤖',
      variant = 'standard',
      onClick,
      draggable = false,
      position = 'static'
    } = config;

    const button = document.createElement('button');
    button.id = id;
    button.className = className;
    button.title = title;
    button.innerHTML = `
      <span style="font-size: 14px;">${icon}</span>
      <span>${text}</span>
    `;

    // Apply base styles
    this.applyStyles(button, {
      ...this.DEFAULT_STYLES,
      ...this.VARIANT_STYLES[variant],
      position: position
    });

    // Add hover effects
    this.addHoverEffects(button);

    // Add click handler
    if (onClick) {
      button.addEventListener('click', onClick);
    }

    // Add drag handle if requested
    if (draggable) {
      this.addDragHandle(button);
    }

    return button;
  }

  /**
   * Create a button specifically for a service
   */
  static createServiceButton(
    service: ServiceType,
    onClick: () => void,
    options: Partial<AIButtonConfig> = {}
  ): HTMLButtonElement {
    const serviceConfigs = {
      gmail: {
        id: 'gemini-reply-button-gmail',
        variant: 'gmail' as const,
        text: 'AI返信生成',
        position: 'fixed' as const,
        draggable: true
      },
      chatwork: {
        id: 'gemini-reply-button-chatwork',
        variant: 'chatwork' as const,
        text: 'AI返信生成',
        position: 'fixed' as const,
        draggable: true
      },
      'google-chat': {
        id: 'gemini-reply-button-google-chat',
        variant: 'google-chat' as const,
        text: 'AI返信生成',
        draggable: true
      },
      'line-official-account': {
        id: 'gemini-reply-button-line',
        variant: 'line-official-account' as const,
        text: 'AI返信生成',
        position: 'fixed' as const,
        draggable: true
      }
    };

    return this.createAIButton({
      ...serviceConfigs[service],
      ...options,
      onClick
    });
  }

  /**
   * Apply styles to button element
   */
  private static applyStyles(button: HTMLElement, styles: Record<string, string>): void {
    Object.entries(styles).forEach(([property, value]) => {
      // Convert camelCase to kebab-case for CSS properties
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      button.style.setProperty(cssProperty, value, 'important');
    });
  }

  /**
   * Add hover effects to button
   */
  private static addHoverEffects(button: HTMLElement): void {
    button.addEventListener('mouseenter', () => {
      button.style.setProperty('background-color', this.DEFAULT_STYLES.hoverBackgroundColor, 'important');
    });

    button.addEventListener('mouseleave', () => {
      button.style.setProperty('background-color', this.DEFAULT_STYLES.backgroundColor, 'important');
    });
  }

  /**
   * Add drag handle to button for draggable functionality
   */
  private static addDragHandle(button: HTMLElement): void {
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.cssText = `
      position: absolute !important;
      top: -2px !important;
      left: -2px !important;
      width: 12px !important;
      height: 12px !important;
      background: rgba(0, 0, 0, 0.6) !important;
      color: white !important;
      font-size: 8px !important;
      line-height: 6px !important;
      text-align: center !important;
      border-radius: 3px !important;
      cursor: grab !important;
      z-index: 1 !important;
      opacity: 0.7 !important;
      transition: opacity 0.2s !important;
    `;
    dragHandle.textContent = '⋮⋮';

    button.style.position = 'relative';
    button.appendChild(dragHandle);

    // Add grab cursor
    button.style.cursor = 'grab';
    button.style.userSelect = 'none';
  }

  /**
   * Update button state
   */
  static updateButtonState(button: HTMLElement, state: {
    loading?: boolean;
    disabled?: boolean;
    text?: string;
  }): void {
    if (state.loading !== undefined) {
      if (state.loading) {
        button.innerHTML = '<span class="loading-spinner"></span> 生成中...';
        button.setAttribute('disabled', 'true');
      }
    }

    if (state.disabled !== undefined) {
      if (state.disabled) {
        button.setAttribute('disabled', 'true');
        button.style.opacity = '0.5';
      } else {
        button.removeAttribute('disabled');
        button.style.opacity = '1';
      }
    }

    if (state.text) {
      const textSpan = button.querySelector('span:last-child');
      if (textSpan) {
        textSpan.textContent = state.text;
      }
    }
  }
}