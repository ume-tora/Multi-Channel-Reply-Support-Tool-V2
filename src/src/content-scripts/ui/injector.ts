import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ServiceStrategy } from '../services/interface';
import { ReplyButton } from './ReplyButton';

class UIInjector {
  private roots: Map<string, Root> = new Map();

  injectReplyButton(
    insertionPoint: HTMLElement,
    strategy: ServiceStrategy
  ): void {
    const buttonId = this.getButtonId(strategy.getServiceName());
    
    // 既にボタンが注入されている場合はスキップ
    if (document.getElementById(buttonId)) {
      return;
    }

    try {
      // ボタン用のコンテナを作成
      const container = document.createElement('div');
      container.id = buttonId;
      container.className = 'gemini-reply-button-container';
      
      // CSS スタイルを設定（Tailwind CSS が適用されない場合の基本スタイル）
      container.style.cssText = `
        display: inline-flex;
        margin-left: 8px;
        z-index: 1000;
        position: relative;
      `;

      // 挿入位置を決定
      if (insertionPoint.children.length > 0) {
        // 最初の子要素の後に挿入
        insertionPoint.insertBefore(container, insertionPoint.children[0].nextSibling);
      } else {
        // 子要素がない場合は末尾に追加
        insertionPoint.appendChild(container);
      }

      // React ルートを作成
      const root = createRoot(container);
      this.roots.set(buttonId, root);

      // ReplyButton コンポーネントをレンダリング
      root.render(
        React.createElement(ReplyButton, {
          extractMessages: () => strategy.extractMessages(),
          onReplyGenerated: (reply: string) => strategy.insertReply(reply),
          className: 'gemini-reply-btn',
        })
      );

      console.log(`AI Reply button injected for ${strategy.getServiceName()}`);
    } catch (error) {
      console.error('Failed to inject reply button:', error);
    }
  }

  removeReplyButton(serviceName: string): void {
    const buttonId = this.getButtonId(serviceName);
    const root = this.roots.get(buttonId);
    
    if (root) {
      root.unmount();
      this.roots.delete(buttonId);
    }

    const element = document.getElementById(buttonId);
    if (element) {
      element.remove();
    }
  }

  private getButtonId(serviceName: string): string {
    return `gemini-reply-button-${serviceName}`;
  }

  // Tailwind CSS のスタイルシートを注入
  injectStyles(): void {
    if (document.getElementById('gemini-reply-styles')) {
      return; // 既に注入済み
    }

    const styleId = 'gemini-reply-styles';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 基本的なスタイル（Tailwindが読み込まれない場合のフォールバック） */
      .gemini-reply-button-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .gemini-reply-btn {
        background-color: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .gemini-reply-btn:hover {
        background-color: #2563eb;
      }
      
      .gemini-reply-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* モーダルの基本スタイル */
      .gemini-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gemini-modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
      }

      /* 各サービスのUIとの調和を図るためのスタイル調整 */
      /* Gmail */
      .gmail .gemini-reply-btn {
        background-color: #1a73e8;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      }

      /* Chatwork */
      .chatwork .gemini-reply-btn {
        background-color: #ff6600;
      }

      /* Google Chat */
      .google-chat .gemini-reply-btn {
        background-color: #1a73e8;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      }
    `;

    document.head.appendChild(style);
  }

  // クリーンアップ
  cleanup(): void {
    // すべてのReactルートをアンマウント
    this.roots.forEach((root, buttonId) => {
      root.unmount();
      const element = document.getElementById(buttonId);
      if (element) {
        element.remove();
      }
    });
    this.roots.clear();

    // スタイルシートを削除
    const styles = document.getElementById('gemini-reply-styles');
    if (styles) {
      styles.remove();
    }
  }
}

export const uiInjector = new UIInjector();