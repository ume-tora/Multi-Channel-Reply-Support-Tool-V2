/**
 * Notification Service for user-friendly error reporting and recovery actions
 */

import type { RecoveryAction } from './ErrorTypes';

// === Notification Types ===

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  title?: string;
  persistent?: boolean;
  duration?: number;
  actions?: RecoveryAction[];
  timestamp: number;
  dismissed?: boolean;
}

export interface NotificationOptions {
  title?: string;
  duration?: number;
  persistent?: boolean;
  actions?: RecoveryAction[];
  showInConsole?: boolean;
}

// === Event Types ===

export type NotificationEvent = 
  | { type: 'show'; notification: Notification }
  | { type: 'dismiss'; id: string }
  | { type: 'clear' }
  | { type: 'action'; notificationId: string; actionId: string };

// === Notification Service Implementation ===

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification> = new Map();
  private eventListeners: Array<(event: NotificationEvent) => void> = [];
  private container?: HTMLElement;
  private readonly maxNotifications = 5;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // === Public API ===

  showError(message: string, actions?: RecoveryAction[], persistent: boolean = false): string {
    return this.show({
      type: 'error',
      message,
      title: 'エラー',
      persistent,
      actions,
      duration: persistent ? undefined : 8000
    });
  }

  showWarning(message: string, options: NotificationOptions = {}): string {
    return this.show({
      type: 'warning',
      message,
      title: options.title || '警告',
      duration: options.duration || 6000,
      persistent: options.persistent || false,
      actions: options.actions
    });
  }

  showSuccess(message: string, options: NotificationOptions = {}): string {
    return this.show({
      type: 'success',
      message,
      title: options.title || '成功',
      duration: options.duration || 4000,
      persistent: options.persistent || false
    });
  }

  showInfo(message: string, options: NotificationOptions = {}): string {
    return this.show({
      type: 'info',
      message,
      title: options.title || '情報',
      duration: options.duration || 5000,
      persistent: options.persistent || false
    });
  }

  dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.dismissed = true;
      this.notifications.delete(id);
      this.removeFromDOM(id);
      this.emitEvent({ type: 'dismiss', id });
    }
  }

  clear(): void {
    this.notifications.clear();
    this.clearDOM();
    this.emitEvent({ type: 'clear' });
  }

  getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  addEventListener(listener: (event: NotificationEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: NotificationEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // === Private Implementation ===

  private show(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now()
    };

    // Limit the number of notifications
    this.enforceMaxNotifications();

    this.notifications.set(id, fullNotification);
    this.showInDOM(fullNotification);
    this.emitEvent({ type: 'show', notification: fullNotification });

    // Auto-dismiss if not persistent
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }

    return id;
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private enforceMaxNotifications(): void {
    const notifications = this.getNotifications();
    if (notifications.length >= this.maxNotifications) {
      // Remove oldest non-persistent notification
      const toRemove = notifications
        .filter(n => !n.persistent)
        .slice(-(notifications.length - this.maxNotifications + 1));
      
      toRemove.forEach(n => this.dismiss(n.id));
    }
  }

  private emitEvent(event: NotificationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Notification event listener error:', error);
      }
    });
  }

  // === DOM Management ===

  private setupEventListeners(): void {
    // Setup global keyboard shortcut to dismiss notifications
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          const notifications = this.getNotifications();
          if (notifications.length > 0) {
            this.dismiss(notifications[0].id);
          }
        }
      });
    }
  }

  private getOrCreateContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.querySelector('#notification-container') as HTMLElement;
      
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        this.setupContainerStyles();
        document.body.appendChild(this.container);
      }
    }
    
    return this.container;
  }

  private setupContainerStyles(): void {
    if (!this.container) return;

    // Inject styles if not already present
    if (!document.getElementById('notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = this.getNotificationCSS();
      document.head.appendChild(styles);
    }
  }

  private showInDOM(notification: Notification): void {
    const container = this.getOrCreateContainer();
    const element = this.createNotificationElement(notification);
    
    // Add with animation
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    container.appendChild(element);
    
    // Trigger animation
    requestAnimationFrame(() => {
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  private createNotificationElement(notification: Notification): HTMLElement {
    const element = document.createElement('div');
    element.id = `notification-${notification.id}`;
    element.className = `notification notification-${notification.type}`;

    const iconMap = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };

    element.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon">${iconMap[notification.type]}</span>
          ${notification.title ? `<span class="notification-title">${notification.title}</span>` : ''}
          <button class="notification-close" aria-label="閉じる">×</button>
        </div>
        <div class="notification-message">${notification.message}</div>
        ${notification.actions && notification.actions.length > 0 ? `
          <div class="notification-actions">
            ${notification.actions.map(action => `
              <button class="notification-action ${action.isPrimary ? 'primary' : 'secondary'}" 
                      data-action-id="${action.id}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Add event listeners
    const closeButton = element.querySelector('.notification-close') as HTMLButtonElement;
    closeButton?.addEventListener('click', () => this.dismiss(notification.id));

    const actionButtons = element.querySelectorAll('.notification-action') as NodeListOf<HTMLButtonElement>;
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const actionId = button.getAttribute('data-action-id');
        if (actionId) {
          this.executeAction(notification.id, actionId);
        }
      });
    });

    return element;
  }

  private removeFromDOM(id: string): void {
    const element = document.getElementById(`notification-${id}`);
    if (element) {
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      element.style.opacity = '0';
      element.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        element.remove();
      }, 300);
    }
  }

  private clearDOM(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  private executeAction(notificationId: string, actionId: string): void {
    const notification = this.notifications.get(notificationId);
    const action = notification?.actions?.find(a => a.id === actionId);
    
    if (action) {
      try {
        action.action();
        this.emitEvent({ type: 'action', notificationId, actionId });
        
        // Auto-dismiss after action unless persistent
        if (!notification.persistent) {
          setTimeout(() => this.dismiss(notificationId), 1000);
        }
      } catch (error) {
        console.error('Error executing notification action:', error);
        this.showError('アクションの実行中にエラーが発生しました。');
      }
    }
  }

  private getNotificationCSS(): string {
    return `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      }

      .notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        pointer-events: auto;
        border-left: 4px solid;
        overflow: hidden;
      }

      .notification-error {
        border-left-color: #ef4444;
      }

      .notification-warning {
        border-left-color: #f59e0b;
      }

      .notification-success {
        border-left-color: #10b981;
      }

      .notification-info {
        border-left-color: #3b82f6;
      }

      .notification-content {
        padding: 16px;
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .notification-icon {
        font-size: 16px;
      }

      .notification-title {
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        flex: 1;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .notification-close:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .notification-message {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .notification-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .notification-action {
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid;
      }

      .notification-action.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .notification-action.primary:hover {
        background: #2563eb;
        border-color: #2563eb;
      }

      .notification-action.secondary {
        background: white;
        color: #374151;
        border-color: #d1d5db;
      }

      .notification-action.secondary:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      /* Animation for mobile */
      @media (max-width: 640px) {
        .notification-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }

        .notification {
          margin-bottom: 8px;
        }

        .notification-actions {
          flex-direction: column;
        }

        .notification-action {
          width: 100%;
          justify-content: center;
        }
      }
    `;
  }
}

// === Singleton Export ===
export const notificationService = NotificationService.getInstance();

// === Utility Functions ===

export function createRecoveryAction(
  id: string,
  label: string,
  action: () => Promise<void>,
  isPrimary: boolean = false
): RecoveryAction {
  return { id, label, action, isPrimary };
}

export function showQuickError(message: string): void {
  notificationService.showError(message);
}

export function showQuickSuccess(message: string): void {
  notificationService.showSuccess(message);
}

export function showQuickWarning(message: string): void {
  notificationService.showWarning(message);
}