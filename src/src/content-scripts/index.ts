import { createServiceStrategy } from './services';
import { uiInjector } from './ui/injector';

class ContentScriptManager {
  private strategy: any = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('Multi Channel Reply Support Tool: Content script initialized');
    
    // スタイルシートを注入
    uiInjector.injectStyles();
    
    // 現在のURLを記録
    this.currentUrl = window.location.href;
    
    // 初期チェック
    this.checkAndInjectButton();
    
    // DOM変更の監視を開始
    this.startObserving();
    
    // URL変更の監視（SPA対応）
    this.startUrlMonitoring();
    
    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private checkAndInjectButton(): void {
    try {
      // 現在のURLに対応するStrategyを取得
      this.strategy = createServiceStrategy(window.location.href);
      
      if (!this.strategy) {
        console.log('No strategy found for current URL:', window.location.href);
        return;
      }

      console.log(`Strategy loaded: ${this.strategy.getServiceName()}`);

      // ボタンが既に注入されているかチェック
      if (this.strategy.isButtonInjected()) {
        console.log('Button already injected');
        return;
      }

      // 挿入ポイントを探す
      const insertionPoint = this.strategy.findInsertionPoint();
      
      if (insertionPoint) {
        console.log('Insertion point found, injecting button...');
        uiInjector.injectReplyButton(insertionPoint, this.strategy);
        this.retryCount = 0; // 成功したらリトライカウントをリセット
      } else {
        console.log('Insertion point not found');
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('Error in checkAndInjectButton:', error);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      console.log(`Scheduling retry ${this.retryCount}/${this.MAX_RETRIES} in ${this.RETRY_DELAY}ms`);
      
      setTimeout(() => {
        this.checkAndInjectButton();
      }, this.RETRY_DELAY * this.retryCount); // 指数バックオフ
    } else {
      console.log('Max retries reached, giving up');
    }
  }

  private startObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      // DOM変更が大量にある場合の性能対策
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        // 新しいノードが追加された場合のみチェック
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // HTMLElementが追加された場合のみ処理
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }

      if (shouldCheck) {
        // デバウンス処理：連続する変更を1つにまとめる
        this.debounceCheck();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('DOM observer started');
  }

  private debounceTimeout: number | null = null;

  private debounceCheck(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = window.setTimeout(() => {
      this.checkAndInjectButton();
      this.debounceTimeout = null;
    }, 500); // 500ms でデバウンス
  }

  private startUrlMonitoring(): void {
    // URLの変更を監視（SPA対応）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state, title, url) {
      originalPushState.call(history, state, title, url);
      window.dispatchEvent(new CustomEvent('urlchange'));
    };

    history.replaceState = function(state, title, url) {
      originalReplaceState.call(history, state, title, url);
      window.dispatchEvent(new CustomEvent('urlchange'));
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('urlchange'));
    });

    window.addEventListener('urlchange', () => {
      this.handleUrlChange();
    });

    console.log('URL monitoring started');
  }

  private handleUrlChange(): void {
    const newUrl = window.location.href;
    
    if (newUrl !== this.currentUrl) {
      console.log('URL changed:', this.currentUrl, '->', newUrl);
      this.currentUrl = newUrl;
      
      // 古いボタンを削除
      if (this.strategy) {
        uiInjector.removeReplyButton(this.strategy.getServiceName());
      }
      
      // リトライカウントをリセット
      this.retryCount = 0;
      
      // 新しいページに対してボタンを注入
      setTimeout(() => {
        this.checkAndInjectButton();
      }, 1000); // ページ遷移後少し待つ
    }
  }

  private cleanup(): void {
    console.log('Cleaning up content script');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    uiInjector.cleanup();
  }
}

// ページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScriptManager();
  });
} else {
  new ContentScriptManager();
}