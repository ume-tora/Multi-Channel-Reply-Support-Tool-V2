import type { ServiceStrategy } from '../interface';
import { errorNotificationService } from '../../../shared/errors/ErrorNotificationService';

/**
 * 自動送信戦略の基底クラス
 * 共通機能を提供し、サービス固有の実装を抽象化
 */
export abstract class BaseAutoSendStrategy implements ServiceStrategy {
  protected static readonly RETRY_DELAY = 500;
  protected static readonly TIMEOUT_SHORT = 3000;
  protected static readonly TIMEOUT_MEDIUM = 5000;
  protected static readonly TIMEOUT_LONG = 10000;

  /**
   * サービス名を取得（継承先で実装）
   */
  abstract getServiceName(): string;

  /**
   * ボタン挿入点を探す（継承先で実装）
   */
  abstract findInsertionPoint(): Promise<HTMLElement | null>;

  /**
   * メッセージを抽出（継承先で実装）
   */
  abstract extractMessages(): Message[];

  /**
   * 返信を挿入（継承先で実装）
   */
  abstract insertReply(text: string): Promise<void>;

  /**
   * スレッドIDを取得（継承先で実装）
   */
  abstract getThreadId(): string | null;

  /**
   * ボタンが既に注入されているかチェック
   */
  isButtonInjected(): boolean {
    const buttonId = this.getButtonId();
    return !!document.getElementById(buttonId);
  }

  /**
   * 要素が表示されているかチェック
   */
  protected isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * 要素を待機して取得
   */
  protected async waitForElement(
    selector: string, 
    timeout: number = BaseAutoSendStrategy.TIMEOUT_MEDIUM
  ): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isElementVisible(element)) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isElementVisible(element)) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        // DOM構造変更の可能性を通知
        errorNotificationService.showDOMError(this.getServiceName());
        resolve(null);
      }, timeout);
    });
  }

  /**
   * 複数のセレクタで要素を検索
   */
  protected findElementBySelectors(selectors: string[]): HTMLElement | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isElementVisible(element)) {
          console.log(`✅ Found element with selector: ${selector}`);
          return element;
        }
      } catch (error) {
        console.warn(`❌ Selector failed: ${selector}`, error);
      }
    }
    return null;
  }

  /**
   * 非同期遅延
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ボタンIDを生成
   */
  protected getButtonId(): string {
    return `gemini-reply-button-${this.getServiceName()}-autosend`;
  }

  /**
   * モーダルIDを生成
   */
  protected getModalId(): string {
    return `${this.getServiceName()}-autosend-modal`;
  }

  /**
   * 確認モーダルIDを生成
   */
  protected getConfirmModalId(): string {
    return `${this.getServiceName()}-confirm-modal`;
  }

  /**
   * エラーを安全にログ出力
   */
  protected logError(context: string, error: unknown): void {
    console.error(`❌ ${this.getServiceName()} ${context}:`, error);
  }

  /**
   * 成功を安全にログ出力
   */
  protected logSuccess(message: string): void {
    console.log(`✅ ${this.getServiceName()}: ${message}`);
  }

  /**
   * 情報を安全にログ出力
   */
  protected logInfo(message: string): void {
    console.log(`ℹ️ ${this.getServiceName()}: ${message}`);
  }
}