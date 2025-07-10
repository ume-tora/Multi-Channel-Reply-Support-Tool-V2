(function() {
  "use strict";
  const _ErrorNotificationService = class _ErrorNotificationService {
    constructor() {
      this.notificationContainer = null;
      this.activeNotifications = /* @__PURE__ */ new Map();
      this.createNotificationContainer();
    }
    static getInstance() {
      if (!_ErrorNotificationService.instance) {
        _ErrorNotificationService.instance = new _ErrorNotificationService();
      }
      return _ErrorNotificationService.instance;
    }
    /**
     * API関連エラーの表示
     */
    showAPIError(error) {
      if (this.isInvalidAPIKeyError(error)) {
        this.show({
          level: "error",
          title: "APIキーエラー",
          message: "Gemini APIキーが無効です。設定を確認してください。",
          persistent: true,
          actions: [
            {
              label: "設定を開く",
              action: () => this.openSettings(),
              style: "primary"
            },
            {
              label: "APIキー取得方法",
              action: () => this.openAPIKeyGuide(),
              style: "secondary"
            }
          ]
        });
      } else if (this.isRateLimitError(error)) {
        this.show({
          level: "warning",
          title: "レート制限",
          message: "API使用量制限に達しました。しばらく待ってから再試行してください。",
          autoHide: 8e3,
          actions: [
            {
              label: "30秒後に再試行",
              action: () => this.scheduleRetry(3e4),
              style: "primary"
            }
          ]
        });
      } else if (this.isNetworkError(error)) {
        this.show({
          level: "warning",
          title: "ネットワークエラー",
          message: "インターネット接続を確認してください。自動で再試行します。",
          autoHide: 5e3
        });
      } else {
        this.show({
          level: "error",
          title: "APIエラー",
          message: "AI返信の生成中にエラーが発生しました。",
          autoHide: 5e3,
          actions: [
            {
              label: "再試行",
              action: () => this.triggerRetry(),
              style: "primary"
            }
          ]
        });
      }
    }
    /**
     * ストレージエラーの表示
     */
    showStorageError(error) {
      if (this.isQuotaExceededError(error)) {
        this.show({
          level: "error",
          title: "ストレージ容量不足",
          message: "設定の保存容量が不足しています。不要なデータを削除してください。",
          persistent: true,
          actions: [
            {
              label: "キャッシュクリア",
              action: () => this.clearCache(),
              style: "primary"
            },
            {
              label: "ヘルプ",
              action: () => this.openStorageHelp(),
              style: "secondary"
            }
          ]
        });
      } else {
        this.show({
          level: "warning",
          title: "ストレージエラー",
          message: "設定の保存に失敗しました。",
          autoHide: 5e3
        });
      }
    }
    /**
     * DOM関連エラーの表示（開発者向け + ユーザー向け）
     */
    showDOMError(serviceName) {
      console.warn(`🔧 DOM構造変更検出: ${serviceName}のUI要素が見つかりません`);
      this.show({
        level: "warning",
        title: "UI読み込みエラー",
        message: `${serviceName}のページ読み込みに時間がかかっています。`,
        autoHide: 3e3
      });
    }
    /**
     * 成功メッセージの表示
     */
    showSuccess(message) {
      this.show({
        level: "success",
        message,
        autoHide: 3e3
      });
    }
    /**
     * 汎用通知表示
     */
    show(notification) {
      if (!this.notificationContainer) {
        this.createNotificationContainer();
      }
      const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const element = this.createNotificationElement(notificationId, notification);
      this.notificationContainer.appendChild(element);
      this.activeNotifications.set(notificationId, element);
      requestAnimationFrame(() => {
        element.style.transform = "translateX(0)";
        element.style.opacity = "1";
      });
      if (!notification.persistent && notification.autoHide) {
        setTimeout(() => {
          this.hideNotification(notificationId);
        }, notification.autoHide);
      }
    }
    /**
     * 通知を非表示
     */
    hideNotification(id) {
      const element = this.activeNotifications.get(id);
      if (element) {
        element.style.transform = "translateX(100%)";
        element.style.opacity = "0";
        setTimeout(() => {
          if (element.parentElement) {
            element.parentElement.removeChild(element);
          }
          this.activeNotifications.delete(id);
        }, 300);
      }
    }
    /**
     * 通知コンテナの作成
     */
    createNotificationContainer() {
      if (document.getElementById("gemini-notifications")) {
        this.notificationContainer = document.getElementById("gemini-notifications");
        return;
      }
      const container = document.createElement("div");
      container.id = "gemini-notifications";
      container.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
      max-width: 400px !important;
      pointer-events: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
      document.body.appendChild(container);
      this.notificationContainer = container;
    }
    /**
     * 通知要素の作成
     */
    createNotificationElement(id, notification) {
      const element = document.createElement("div");
      element.id = id;
      const levelColors = {
        info: "#2196F3",
        warning: "#FF9800",
        error: "#F44336",
        success: "#4CAF50"
      };
      const levelIcons = {
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        success: "✅"
      };
      element.style.cssText = `
      background: white !important;
      border-left: 4px solid ${levelColors[notification.level]} !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      margin-bottom: 12px !important;
      padding: 16px !important;
      max-width: 100% !important;
      transform: translateX(100%) !important;
      opacity: 0 !important;
      transition: all 0.3s ease !important;
      pointer-events: auto !important;
      position: relative !important;
    `;
      const closeButton = `
      <button onclick="document.getElementById('${id}').style.display='none'" 
              style="position: absolute; top: 8px; right: 8px; background: none; border: none; 
                     font-size: 16px; cursor: pointer; color: #666; padding: 4px;">×</button>
    `;
      const actionsHTML = notification.actions ? `<div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${notification.actions.map((action) => {
        const bgColor = action.style === "primary" ? levelColors[notification.level] : action.style === "danger" ? "#F44336" : "#6c757d";
        return `<button onclick="(${action.action.toString()})()" 
                         style="background: ${bgColor}; color: white; border: none; padding: 8px 16px; 
                                border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                    ${action.label}
                  </button>`;
      }).join("")}
      </div>` : "";
      element.innerHTML = `
      ${closeButton}
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 18px; flex-shrink: 0;">${levelIcons[notification.level]}</div>
        <div style="flex: 1; min-width: 0;">
          ${notification.title ? `<div style="font-weight: 600; color: #333; margin-bottom: 4px; font-size: 14px;">${notification.title}</div>` : ""}
          <div style="color: #666; font-size: 13px; line-height: 1.4;">${notification.message}</div>
          ${actionsHTML}
        </div>
      </div>
    `;
      return element;
    }
    // === Error Type Detection ===
    isInvalidAPIKeyError(error) {
      return error instanceof Error && (error.message.includes("API key") || error.message.includes("401") || error.message.includes("Unauthorized"));
    }
    isRateLimitError(error) {
      return error instanceof Error && (error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("Too Many Requests"));
    }
    isNetworkError(error) {
      return error instanceof Error && (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("offline") || error.message.includes("connection"));
    }
    isQuotaExceededError(error) {
      return error instanceof Error && (error.message.includes("quota") || error.message.includes("QUOTA_EXCEEDED") || error.message.includes("storage"));
    }
    // === Action Handlers ===
    openSettings() {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(console.error);
    }
    openAPIKeyGuide() {
      chrome.tabs.create({
        url: "https://ai.google.dev/gemini-api/docs/api-key"
      }).catch(console.error);
    }
    async clearCache() {
      try {
        const keys = await chrome.storage.local.get(null);
        const cacheKeys = Object.keys(keys).filter((key) => key.startsWith("cache_"));
        if (cacheKeys.length > 0) {
          await chrome.storage.local.remove(cacheKeys);
          this.showSuccess(`${cacheKeys.length}件のキャッシュを削除しました`);
        } else {
          this.showSuccess("削除するキャッシュはありませんでした");
        }
      } catch (error) {
        console.error("Cache clear error:", error);
      }
    }
    openStorageHelp() {
      chrome.tabs.create({
        url: "https://developer.chrome.com/docs/extensions/reference/storage/"
      }).catch(console.error);
    }
    scheduleRetry(delayMs) {
      setTimeout(() => {
        this.showSuccess("再試行可能になりました");
        window.dispatchEvent(new CustomEvent("gemini-retry-ready"));
      }, delayMs);
    }
    triggerRetry() {
      window.dispatchEvent(new CustomEvent("gemini-manual-retry"));
    }
    /**
     * 全ての通知をクリア
     */
    clearAll() {
      this.activeNotifications.forEach((element, id) => {
        this.hideNotification(id);
      });
    }
    /**
     * インスタンスの破棄
     */
    destroy() {
      if (this.notificationContainer) {
        this.notificationContainer.remove();
        this.notificationContainer = null;
      }
      this.activeNotifications.clear();
      _ErrorNotificationService.instance = null;
    }
  };
  _ErrorNotificationService.instance = null;
  let ErrorNotificationService = _ErrorNotificationService;
  const errorNotificationService = ErrorNotificationService.getInstance();
  const _BaseAutoSendStrategy = class _BaseAutoSendStrategy {
    /**
     * ボタンが既に注入されているかチェック
     */
    isButtonInjected() {
      const buttonId = this.getButtonId();
      return !!document.getElementById(buttonId);
    }
    /**
     * 要素が表示されているかチェック
     */
    isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }
    /**
     * 要素を待機して取得
     */
    async waitForElement(selector, timeout = _BaseAutoSendStrategy.TIMEOUT_MEDIUM) {
      return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          resolve(element);
          return;
        }
        const observer = new MutationObserver(() => {
          const element2 = document.querySelector(selector);
          if (element2 && this.isElementVisible(element2)) {
            observer.disconnect();
            resolve(element2);
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          observer.disconnect();
          errorNotificationService.showDOMError(this.getServiceName());
          resolve(null);
        }, timeout);
      });
    }
    /**
     * 複数のセレクタで要素を検索
     */
    findElementBySelectors(selectors) {
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
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
    async delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * ボタンIDを生成
     */
    getButtonId() {
      return `gemini-reply-button-${this.getServiceName()}-autosend`;
    }
    /**
     * モーダルIDを生成
     */
    getModalId() {
      return `${this.getServiceName()}-autosend-modal`;
    }
    /**
     * 確認モーダルIDを生成
     */
    getConfirmModalId() {
      return `${this.getServiceName()}-confirm-modal`;
    }
    /**
     * エラーを安全にログ出力
     */
    logError(context, error) {
      console.error(`❌ ${this.getServiceName()} ${context}:`, error);
    }
    /**
     * 成功を安全にログ出力
     */
    logSuccess(message) {
      console.log(`✅ ${this.getServiceName()}: ${message}`);
    }
    /**
     * 情報を安全にログ出力
     */
    logInfo(message) {
      console.log(`ℹ️ ${this.getServiceName()}: ${message}`);
    }
  };
  _BaseAutoSendStrategy.RETRY_DELAY = 500;
  _BaseAutoSendStrategy.TIMEOUT_SHORT = 3e3;
  _BaseAutoSendStrategy.TIMEOUT_MEDIUM = 5e3;
  _BaseAutoSendStrategy.TIMEOUT_LONG = 1e4;
  let BaseAutoSendStrategy = _BaseAutoSendStrategy;
  class SendButtonManager {
    constructor(serviceName) {
      this.serviceName = serviceName;
    }
    /**
     * 送信ボタンを探してクリック
     */
    async findAndClickSendButton(selectors) {
      console.log(`🎯 ${this.serviceName}: Starting send button search...`);
      const button = await this.findSendButton(selectors);
      if (!button) {
        console.error(`❌ ${this.serviceName}: No send button found`);
        return false;
      }
      return await this.clickButtonWithStrategies(button);
    }
    /**
     * 送信ボタンを検索（強化版）
     */
    async findSendButton(selectors) {
      console.log(`🔍 ${this.serviceName}: Checking ${selectors.length} selectors...`);
      for (const [index2, selector] of selectors.entries()) {
        console.log(`🔍 Phase 1 - Checking selector ${index2 + 1}/${selectors.length}: ${selector}`);
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const button = element;
            if (this.isValidSendButton(button)) {
              console.log(`✅ Found valid send button with selector: ${selector}`);
              return button;
            }
          }
        } catch (error) {
          console.warn(`❌ Selector error: ${selector}`, error);
        }
      }
      console.log(`⏳ ${this.serviceName}: Phase 1 failed, waiting for dynamic elements...`);
      await this.delay(1e3);
      for (const [index2, selector] of selectors.entries()) {
        console.log(`🔍 Phase 2 - Rechecking selector ${index2 + 1}/${selectors.length}: ${selector}`);
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const button = element;
            if (this.isValidSendButton(button)) {
              console.log(`✅ Found valid send button in Phase 2 with selector: ${selector}`);
              return button;
            }
          }
        } catch (error) {
          console.warn(`❌ Phase 2 Selector error: ${selector}`, error);
        }
      }
      console.log(`🔍 ${this.serviceName}: Phase 3 - Content-based search as last resort...`);
      return await this.findSendButtonByContent();
    }
    /**
     * コンテンツ解析による送信ボタン検索（強化版）
     */
    async findSendButtonByContent() {
      const allInteractiveElements = document.querySelectorAll(`
      button, 
      input[type="submit"], 
      input[type="button"],
      div[role="button"],
      span[role="button"],
      a[role="button"],
      [onclick],
      [data-testid*="button"],
      [class*="button"],
      [class*="btn"]
    `);
      console.log(`🔍 Analyzing ${allInteractiveElements.length} interactive elements...`);
      const sortedElements = Array.from(allInteractiveElements).sort((a, b) => {
        return this.calculateSendButtonScore(b) - this.calculateSendButtonScore(a);
      });
      for (const element of sortedElements) {
        const button = element;
        if (this.isValidSendButton(button)) {
          const score = this.calculateSendButtonScore(button);
          console.log(`🔍 Checking element with score ${score}:`, {
            tag: button.tagName,
            text: button.textContent?.substring(0, 30),
            class: button.className,
            id: button.id
          });
          if (score > 0) {
            console.log(`✅ Found send button by content analysis (score: ${score})`);
            return button;
          }
        }
      }
      console.log(`🔍 Last resort: Looking for form submit buttons...`);
      return this.findFormSubmitButton();
    }
    /**
     * 送信ボタンの可能性スコアを計算（ファイル関連ボタンを強力に除外）
     */
    calculateSendButtonScore(button) {
      let score = 0;
      const text = (button.textContent || "").toLowerCase().trim();
      const value = (button.value || "").toLowerCase().trim();
      const type = button.getAttribute("type") || "";
      const className = button.className.toLowerCase();
      const id = button.id.toLowerCase();
      if (this.isFileRelatedButton(button)) {
        return -100;
      }
      if (text === "送信" || text === "send") score += 15;
      if (value === "送信" || value === "send") score += 15;
      if (type === "submit" && !this.isFileRelatedButton(button)) score += 10;
      if (text.includes("送信") || text.includes("send")) score += 8;
      if (className.includes("send") || className.includes("submit")) score += 6;
      if (id.includes("send") || id.includes("submit")) score += 6;
      if (text.includes("メッセージ") && text.includes("送信")) score += 12;
      if (className.includes("message") && className.includes("send")) score += 10;
      if (text.includes("投稿") || text.includes("post")) score += 3;
      if (className.includes("primary") || className.includes("btn-primary")) score += 2;
      if (text.includes("cancel") || text.includes("キャンセル")) score -= 10;
      if (text.includes("delete") || text.includes("削除")) score -= 10;
      if (text.includes("file") || text.includes("ファイル")) score -= 15;
      if (text.includes("attach") || text.includes("添付")) score -= 15;
      if (text.includes("upload") || text.includes("アップロード")) score -= 15;
      if (button.hasAttribute("disabled")) score -= 20;
      return score;
    }
    /**
     * フォーム内の送信ボタンを検索
     */
    findFormSubmitButton() {
      const forms = document.querySelectorAll("form");
      for (const form of forms) {
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
        if (submitButtons.length > 0) {
          const lastButton = submitButtons[submitButtons.length - 1];
          if (this.isValidSendButton(lastButton)) {
            console.log(`✅ Found form submit button:`, {
              tag: lastButton.tagName,
              text: lastButton.textContent?.substring(0, 30),
              form: form.id || form.className
            });
            return lastButton;
          }
        }
      }
      return null;
    }
    /**
     * 有効な送信ボタンかチェック（ファイル関連ボタンを除外）
     */
    isValidSendButton(button) {
      if (!this.isElementVisible(button)) return false;
      if (button.hasAttribute("disabled")) return false;
      if (this.isFileRelatedButton(button)) {
        console.log(`❌ Excluded file-related button: ${button.textContent?.trim()}`);
        return false;
      }
      return true;
    }
    /**
     * ファイル関連ボタンかどうかをチェック
     */
    isFileRelatedButton(button) {
      const text = (button.textContent || "").toLowerCase().trim();
      const className = button.className.toLowerCase();
      const id = button.id.toLowerCase();
      const type = button.type?.toLowerCase() || "";
      const onclick = button.getAttribute("onclick") || "";
      const fileKeywords = [
        "file",
        "ファイル",
        "upload",
        "アップロード",
        "attach",
        "添付",
        "browse",
        "参照",
        "choose",
        "選択",
        "select"
      ];
      if (type === "file") return true;
      if (fileKeywords.some(
        (keyword) => text.includes(keyword) || className.includes(keyword) || id.includes(keyword) || onclick.includes(keyword)
      )) {
        return true;
      }
      const nearbyFileInput = button.parentElement?.querySelector('input[type="file"]') || button.querySelector('input[type="file"]');
      if (nearbyFileInput) return true;
      return false;
    }
    /**
     * コンテンツから送信ボタンを判定
     */
    isSendButtonByContent(button) {
      const text = (button.textContent || "").toLowerCase().trim();
      const value = (button.value || "").toLowerCase().trim();
      const type = button.getAttribute("type") || "";
      const sendPatterns = ["送信", "send", "submit"];
      return sendPatterns.some(
        (pattern) => text.includes(pattern) || value.includes(pattern) || type === "submit"
      );
    }
    /**
     * 複数戦略でボタンをクリック
     */
    async clickButtonWithStrategies(button) {
      console.log(`🎯 ${this.serviceName}: Attempting to click send button...`);
      console.log(`🎯 Button details:`, {
        tag: button.tagName,
        id: button.id,
        class: button.className,
        text: button.textContent?.substring(0, 50)
      });
      const strategies = [
        () => this.clickWithPointerEvents(button),
        () => this.clickWithMouseEvents(button),
        () => this.clickWithDirectMethod(button),
        () => this.clickWithFormSubmit(button)
      ];
      for (const [index2, strategy] of strategies.entries()) {
        console.log(`🎯 Trying click strategy ${index2 + 1}/${strategies.length}`);
        try {
          await strategy();
          console.log(`✅ Strategy ${index2 + 1} executed successfully`);
          await this.delay(1500);
          const success = await this.verifyClickSuccess();
          if (success) {
            console.log(`✅ Send button clicked successfully with strategy ${index2 + 1}`);
            return true;
          } else {
            console.log(`⚠️ Strategy ${index2 + 1} executed but verification failed`);
          }
        } catch (error) {
          console.warn(`❌ Strategy ${index2 + 1} failed:`, error);
        }
        await this.delay(500);
      }
      console.error(`❌ All click strategies failed`);
      return false;
    }
    /**
     * PointerEventsを使ったクリック
     */
    async clickWithPointerEvents(button) {
      console.log("🎯 Attempting click with Pointer Events");
      button.focus();
      await this.delay(100);
      button.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true
      }));
      await this.delay(50);
      button.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true
      }));
      await this.delay(50);
      button.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      }));
    }
    /**
     * MouseEventsを使ったクリック
     */
    async clickWithMouseEvents(button) {
      console.log("🎯 Attempting click with Mouse Events");
      button.focus();
      await this.delay(100);
      const rect = button.getBoundingClientRect();
      const eventOptions = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      };
      button.dispatchEvent(new MouseEvent("mousedown", eventOptions));
      await this.delay(50);
      button.dispatchEvent(new MouseEvent("mouseup", eventOptions));
      await this.delay(50);
      button.dispatchEvent(new MouseEvent("click", eventOptions));
    }
    /**
     * 直接メソッド呼び出し
     */
    async clickWithDirectMethod(button) {
      console.log("🎯 Attempting direct click method");
      button.focus();
      await this.delay(100);
      button.click();
    }
    /**
     * フォーム送信を試行
     */
    async clickWithFormSubmit(button) {
      console.log("🎯 Attempting form submit method");
      const form = button.closest("form");
      if (form) {
        console.log("🎯 Found form, trying form submit");
        form.submit();
      } else {
        console.log("🎯 No form found, trying submit input");
        const submitInput = document.querySelector('input[type="submit"]');
        if (submitInput) {
          submitInput.click();
        }
      }
    }
    /**
     * クリック成功を検証
     */
    async verifyClickSuccess() {
      console.log("🔍 Verifying click success...");
      const googleChatSelectors = [
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="message"]',
        'div[contenteditable="true"][aria-label*="compose"]',
        'div[contenteditable="true"][data-tab="compose"]'
      ];
      const generalSelectors = [
        "#_chatText",
        'textarea[name="message"]',
        'input[type="text"]',
        "textarea"
      ];
      const allSelectors = [...googleChatSelectors, ...generalSelectors];
      for (const selector of allSelectors) {
        try {
          const inputs = document.querySelectorAll(selector);
          for (const input of inputs) {
            const element = input;
            const isEmpty = this.isInputEmpty(element);
            console.log(`🔍 Checking input with selector '${selector}': isEmpty=${isEmpty}`);
            if (isEmpty) {
              console.log("✅ Input field cleared - click success confirmed");
              return true;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error checking selector '${selector}':`, error);
        }
      }
      const sendButtons = document.querySelectorAll('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="送信"]');
      for (const button of sendButtons) {
        const btn = button;
        if (btn.disabled) {
          console.log("✅ Send button disabled - click success confirmed");
          return true;
        }
      }
      console.log("❌ Click success verification failed");
      return false;
    }
    /**
     * 入力フィールドが空かチェック
     */
    isInputEmpty(element) {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value.trim() === "";
      }
      if (element.contentEditable === "true") {
        const text = element.textContent || element.innerText || "";
        return text.trim() === "";
      }
      return false;
    }
    /**
     * 要素が表示されているかチェック
     */
    isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }
    /**
     * 遅延
     */
    async delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
  class ModalManager {
    constructor(serviceName, config) {
      this.serviceName = serviceName;
      this.serviceDisplayName = config.displayName;
      this.serviceColor = config.color;
    }
    /**
     * 自動送信モーダルを表示
     */
    showAutoSendModal(text, chatInfo, onSend) {
      const modalId = `${this.serviceName}-autosend-modal`;
      const existing = document.getElementById(modalId);
      if (existing) existing.remove();
      const modal = this.createAutoSendModal(modalId, text, chatInfo);
      document.body.appendChild(modal);
      this.setupAutoSendEvents(modal, onSend);
    }
    /**
     * 自動送信モーダルを作成
     */
    createAutoSendModal(modalId, text, chatInfo) {
      const modal = document.createElement("div");
      modal.id = modalId;
      modal.style.cssText = this.getModalStyles();
      modal.innerHTML = `
      <div style="${this.getModalContentStyles()}">
        <div style="color: ${this.serviceColor}; font-size: 28px; margin-bottom: 16px; font-weight: 500;">
          💬 ${this.serviceDisplayName}自動送信
        </div>
        
        <div style="color: #5f6368; font-size: 14px; margin-bottom: 24px;">
          AI生成された返信を確認して${this.serviceDisplayName}に送信してください
        </div>
        
        <div style="${this.getChatInfoStyles()}">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px;">
            <div style="color: #5f6368; font-weight: 500;">チャット:</div>
            <div style="color: #202124;">${chatInfo.chatName}</div>
            <div style="color: #5f6368; font-weight: 500;">ルーム:</div>
            <div style="color: #202124;">${chatInfo.roomName}</div>
          </div>
          
          <div style="color: #5f6368; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            📝 返信内容:
          </div>
          <textarea id="chat-content" style="${this.getTextareaStyles()}">${text}</textarea>
        </div>
        
        <div style="${this.getWarningStyles()}">
          ⚠️ <strong>重要:</strong> この機能は${this.serviceDisplayName}の送信ボタンを自動でクリックします。<br>
          内容を十分確認してから送信してください。送信後の取り消しはできません。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="send-btn" style="${this.getSendButtonStyles()}">
            📤 送信実行
          </button>
          
          <button id="cancel-btn" style="${this.getCancelButtonStyles()}">
            ✖️ キャンセル
          </button>
        </div>
        
        <div style="${this.getInstructionStyles()}">
          <strong>💡 操作手順:</strong><br>
          1. 上記の返信内容を確認・編集<br>
          2. チャット情報が正しいことを確認<br>
          3. 「送信実行」ボタンをクリック<br>
          4. 最終確認ダイアログで「送信」を選択
        </div>
      </div>
    `;
      return modal;
    }
    /**
     * 自動送信モーダルのイベントを設定
     */
    setupAutoSendEvents(modal, onSend) {
      const textarea = modal.querySelector("#chat-content");
      const sendBtn = modal.querySelector("#send-btn");
      const cancelBtn = modal.querySelector("#cancel-btn");
      sendBtn?.addEventListener("click", async () => {
        const content = textarea?.value || "";
        if (!content.trim()) {
          this.showButtonError(sendBtn, "内容が空です");
          return;
        }
        const confirmed = await this.showConfirmationModal({
          chatName: "チャット",
          roomName: "ルーム",
          message: content
        });
        if (confirmed) {
          await this.handleSendExecution(sendBtn, modal, content, onSend);
        }
      });
      cancelBtn?.addEventListener("click", () => modal.remove());
      this.setupEscapeHandler(modal);
    }
    /**
     * 送信実行処理
     */
    async handleSendExecution(sendBtn, modal, content, onSend) {
      sendBtn.innerHTML = "🔄 送信中...";
      sendBtn.disabled = true;
      try {
        console.log("🔄 ModalManager: Calling onSend...");
        const success = await onSend(content);
        console.log(`🎯 ModalManager: onSend returned: ${success}`);
        if (success) {
          console.log("✅ ModalManager: Send success, calling showSendSuccess...");
          this.showSendSuccess(sendBtn, modal);
        } else {
          console.log("❌ ModalManager: Send failed, calling handleSendFailure...");
          await this.handleSendFailure(sendBtn, modal, content);
        }
      } catch (error) {
        console.error("💥 Send execution error:", error);
        this.showButtonError(sendBtn, "送信エラー");
        this.scheduleModalClose(modal, 8e3);
      }
    }
    /**
     * 送信成功処理
     */
    showSendSuccess(sendBtn, modal) {
      console.log("🎉 showSendSuccess: Starting success handler...");
      sendBtn.innerHTML = "✅ 送信完了";
      sendBtn.style.background = "#34a853 !important";
      console.log("🎉 Send completed successfully, closing modal in 2 seconds");
      if (!modal || !modal.parentElement) {
        console.error("❌ Modal element not found or already removed");
        return;
      }
      setTimeout(() => {
        console.log("🎉 Removing modal after successful send");
        try {
          if (modal && modal.parentElement) {
            modal.remove();
            console.log("✅ Modal successfully removed");
          } else {
            console.warn("⚠️ Modal already removed or not found");
          }
        } catch (error) {
          console.error("❌ Error removing modal:", error);
        }
      }, 2e3);
    }
    /**
     * 送信失敗処理（フォールバック検証付き）
     */
    async handleSendFailure(sendBtn, modal) {
      console.log("⚠️ Send reported as failed, starting fallback verification...");
      const messageInput = document.querySelector('#_chatText, textarea[name="message"]');
      if (messageInput && messageInput.value.trim() === "") {
        console.log("✅ Input field is empty, assuming send was successful");
        this.showSendSuccess(sendBtn, modal);
        return;
      }
      console.log("❌ Send failed and input not cleared");
      this.showButtonError(sendBtn, "送信失敗");
      this.scheduleModalClose(modal, 8e3);
    }
    /**
     * 確認モーダルを表示
     */
    showConfirmationModal(data) {
      return new Promise((resolve) => {
        const confirmModalId = `${this.serviceName}-confirm-modal`;
        const existing = document.getElementById(confirmModalId);
        if (existing) existing.remove();
        const confirmModal = document.createElement("div");
        confirmModal.id = confirmModalId;
        confirmModal.style.cssText = this.getConfirmModalStyles();
        confirmModal.innerHTML = `
        <div style="${this.getConfirmModalContentStyles()}">
          <div style="color: #ea4335; font-size: 24px; margin-bottom: 24px; font-weight: bold;">
            🚨 最終確認
          </div>
          
          <div style="${this.getConfirmContentStyles()}">
            <div style="margin-bottom: 12px;"><strong>メッセージ:</strong></div>
            <div style="${this.getMessagePreviewStyles()}">
              ${data.message.replace(/\n/g, "<br>")}
            </div>
          </div>
          
          <div style="color: #d93025; font-size: 14px; margin-bottom: 24px; font-weight: 500;">
            この内容で${this.serviceDisplayName}にメッセージを送信します。送信後の取り消しはできません。
          </div>
          
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="final-send-btn" style="${this.getConfirmSendButtonStyles()}">
              📤 確認しました。送信実行
            </button>
            
            <button id="final-cancel-btn" style="${this.getConfirmCancelButtonStyles()}">
              ✖️ キャンセル
            </button>
          </div>
        </div>
      `;
        document.body.appendChild(confirmModal);
        confirmModal.querySelector("#final-send-btn")?.addEventListener("click", () => {
          confirmModal.remove();
          resolve(true);
        });
        confirmModal.querySelector("#final-cancel-btn")?.addEventListener("click", () => {
          confirmModal.remove();
          resolve(false);
        });
        confirmModal.addEventListener("click", (e) => {
          if (e.target === confirmModal) {
            confirmModal.remove();
            resolve(false);
          }
        });
      });
    }
    /**
     * ボタンエラー表示
     */
    showButtonError(button, message) {
      const originalText = button.innerHTML;
      const originalBg = button.style.background;
      button.innerHTML = `❌ ${message}`;
      button.style.background = "#ea4335 !important";
      button.disabled = true;
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = originalBg;
        button.disabled = false;
      }, 5e3);
    }
    /**
     * モーダルを指定時間後に閉じる
     */
    scheduleModalClose(modal, delay) {
      setTimeout(() => {
        console.log(`🕐 Force closing modal after ${delay}ms`);
        modal.remove();
      }, delay);
    }
    /**
     * ESCキーハンドラーを設定
     */
    setupEscapeHandler(modal) {
      const escHandler = (e) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", escHandler);
        }
      };
      document.addEventListener("keydown", escHandler);
    }
    // === スタイル定義メソッド ===
    getModalStyles() {
      return `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.7) !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: 'Hiragino Sans', 'Meiryo', sans-serif !important;
    `;
    }
    getModalContentStyles() {
      return `
      background: white !important;
      border-radius: 16px !important;
      padding: 32px !important;
      max-width: 700px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3) !important;
      text-align: center !important;
    `;
    }
    getChatInfoStyles() {
      return `
      background: #f8f9fa !important;
      border: 2px solid ${this.serviceColor} !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin: 20px 0 !important;
      text-align: left !important;
    `;
    }
    getTextareaStyles() {
      return `
      width: 100% !important;
      min-height: 120px !important;
      border: 1px solid #dadce0 !important;
      border-radius: 8px !important;
      padding: 12px !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      font-family: inherit !important;
      resize: vertical !important;
      box-sizing: border-box !important;
      outline: none !important;
    `;
    }
    getWarningStyles() {
      return `
      background: #fef7e0 !important;
      border: 1px solid #f9ab00 !important;
      border-radius: 8px !important;
      padding: 16px !important;
      margin: 20px 0 !important;
      font-size: 13px !important;
      color: #b06000 !important;
    `;
    }
    getSendButtonStyles() {
      return `
      background: ${this.serviceColor} !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      min-width: 140px !important;
    `;
    }
    getCancelButtonStyles() {
      return `
      background: #ea4335 !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      min-width: 140px !important;
    `;
    }
    getInstructionStyles() {
      return `
      margin-top: 24px !important;
      padding: 16px !important;
      background: #e3f2fd !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      color: ${this.serviceColor} !important;
      text-align: left !important;
    `;
    }
    getConfirmModalStyles() {
      return `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 99999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;
    }
    getConfirmModalContentStyles() {
      return `
      background: white !important;
      border-radius: 16px !important;
      padding: 32px !important;
      max-width: 600px !important;
      width: 90% !important;
      max-height: 70vh !important;
      overflow-y: auto !important;
      text-align: center !important;
    `;
    }
    getConfirmContentStyles() {
      return `
      text-align: left !important;
      margin-bottom: 24px !important;
      background: #f8f9fa !important;
      padding: 20px !important;
      border-radius: 8px !important;
    `;
    }
    getMessagePreviewStyles() {
      return `
      background: white !important;
      padding: 12px !important;
      border-radius: 4px !important;
      max-height: 150px !important;
      overflow-y: auto !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    `;
    }
    getConfirmSendButtonStyles() {
      return `
      background: ${this.serviceColor} !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: bold !important;
      cursor: pointer !important;
    `;
    }
    getConfirmCancelButtonStyles() {
      return `
      background: #5f6368 !important;
      color: white !important;
      border: none !important;
      padding: 16px 32px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      cursor: pointer !important;
    `;
    }
  }
  const CHATWORK_CONFIG = {
    serviceName: "chatwork",
    displayName: "Chatwork",
    color: "#00a0e9",
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
      "#_chatText",
      'textarea[name="message"]',
      ".chatInput textarea",
      "#chat_input_area textarea",
      "#_chatSendTool textarea",
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
      "textarea:not([readonly]):not([disabled])",
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
      "[data-message-id]",
      "[data-message-key]",
      "[data-message-index]",
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
      ".chatMessage",
      ".message",
      ".timeline_message",
      '[class*="message"]',
      '[class*="Message"]',
      ".message-wrapper",
      ".message_content",
      "._message",
      "._chatMessage",
      // 構造的セレクタ
      '[role="article"]',
      '[role="listitem"]',
      'li[class*="message"]',
      'div[class*="message"]',
      'article[class*="message"]',
      // タイムライン系
      "#_timeLine > *",
      ".timeline > *",
      ".chat-timeline > *",
      ".conversation-timeline > *"
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
      "#_body",
      "#_mainContent",
      "#_roomMemberWrapper",
      "#_timeLine",
      "#_chatText",
      "#_chatSendTool",
      "#chat_input_area",
      ".chatInput",
      ".chatInput textarea",
      'textarea[name="message"]',
      "#chatWorkSpace",
      "#_roomTitle",
      ".room_title",
      ".chat_title",
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
      "chatwork.com",
      "chatwork.jp"
    ],
    timeouts: {
      short: 3e3,
      medium: 5e3,
      long: 1e4
    }
  };
  class ChatworkAutoSendStrategy extends BaseAutoSendStrategy {
    constructor() {
      super();
      this.sendButtonManager = new SendButtonManager(CHATWORK_CONFIG.serviceName);
      this.modalManager = new ModalManager(CHATWORK_CONFIG.serviceName, {
        displayName: CHATWORK_CONFIG.displayName,
        color: CHATWORK_CONFIG.color
      });
    }
    getServiceName() {
      return "chatwork";
    }
    /**
     * ボタン配置点を探す
     */
    async findInsertionPoint() {
      this.logInfo("Starting insertion point search...");
      this.debugPageStructure();
      if (!this.isChatworkPage()) {
        this.logInfo("Not on Chatwork chat page");
        this.debugPageDetection();
        return null;
      }
      this.logSuccess("Chatwork chat page detected");
      const searchMethods = [
        { name: "Input Area", method: () => this.findInputArea() },
        { name: "Chat Form", method: () => this.findChatForm() },
        { name: "Chat Container", method: () => this.findChatContainer() }
      ];
      for (const searchMethod of searchMethods) {
        this.logInfo(`Trying search method: ${searchMethod.name}`);
        const element = await searchMethod.method();
        if (element) {
          this.logSuccess(`Found insertion point via ${searchMethod.name}: ${element.tagName}.${element.className}`);
          return element;
        }
      }
      this.logError("insertion point search", "No suitable insertion point found");
      this.debugInsertionPointFailure();
      return null;
    }
    /**
     * メッセージを抽出
     */
    extractMessages() {
      this.logInfo("Extracting messages...");
      this.debugMessageStructure();
      const messageData = this.extractMessageData();
      const messages = [];
      messageData.forEach((data, index2) => {
        if (data.text.trim() && this.isValidMessageText(data.text)) {
          messages.push({
            author: data.author || `ユーザー${index2 + 1}`,
            text: data.text.trim(),
            timestamp: data.timestamp || /* @__PURE__ */ new Date()
          });
        }
      });
      console.log("🔍 Chatwork: Extracted message data:", messageData);
      console.log("🔍 Chatwork: Processed messages:", messages);
      this.logInfo(`Extracted ${messages.length} valid messages from ${messageData.length} raw data`);
      if (messages.length === 0) {
        this.debugMessageExtractionFailure();
      }
      return messages.slice(-5);
    }
    /**
     * 返信処理（モーダル表示）
     */
    async insertReply(text) {
      this.logInfo("Showing auto-send modal...");
      const chatInfo = this.extractChatInfo();
      this.modalManager.showAutoSendModal(
        text,
        chatInfo,
        (content) => this.executeSend(content)
      );
    }
    /**
     * スレッドIDを取得
     */
    getThreadId() {
      const match = window.location.pathname.match(/\/room\/(\d+)/);
      return match ? match[1] : null;
    }
    // === プライベートメソッド ===
    /**
     * Chatworkページかチェック
     */
    isChatworkPage() {
      this.logInfo("Checking for Chatwork page...");
      const urlCheck = this.isValidChatworkUrl();
      if (!urlCheck) {
        this.logInfo("Not a valid Chatwork URL");
        return false;
      }
      const elementCheck = this.hasChatworkElements();
      const result = urlCheck && elementCheck;
      this.logInfo(`Final Chatwork page check: ${result ? "Valid" : "Invalid"}`);
      return result;
    }
    /**
     * 有効なChatworkのURLかチェック
     */
    isValidChatworkUrl() {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      const search = window.location.search;
      const isDomain = CHATWORK_CONFIG.urlPatterns.some(
        (pattern) => hostname.includes(pattern)
      );
      const hasRoomId = search.includes("rid=") || pathname.includes("/room/");
      return isDomain && (hasRoomId || pathname === "/" || search.includes("rid="));
    }
    /**
     * Chatworkの特徴的な要素が存在するかチェック
     */
    hasChatworkElements() {
      for (const selector of CHATWORK_CONFIG.pageDetectionSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          const visibleElements = Array.from(elements).filter(
            (el) => this.isElementVisible(el)
          );
          if (visibleElements.length > 0) {
            this.logInfo(`Found ${visibleElements.length} visible elements with: ${selector}`);
            return true;
          }
        } catch {
        }
      }
      return false;
    }
    /**
     * 入力エリアを探す（待機機能付き）
     */
    async findInputArea() {
      let element = this.findElementBySelectors([
        "#chat_input_area",
        ".chatInput",
        "#_chatSendTool",
        'div[class*="input"]',
        'div[class*="chat"]'
      ]);
      if (element) return element;
      this.logInfo("Input area not immediately found, waiting for dynamic load...");
      element = await this.waitForElement([
        "#chat_input_area",
        ".chatInput",
        "#_chatSendTool",
        'div[class*="input"]',
        "textarea",
        '[contenteditable="true"]'
      ].join(", "), 3e3);
      return element;
    }
    /**
     * チャット入力フォームを探す（待機機能付き）
     */
    async findChatForm() {
      let element = this.findElementBySelectors([
        "form:has(#_chatText)",
        'form:has(textarea[name="message"])',
        ".chat-form",
        ".message-form",
        'form[class*="chat"]',
        'form[class*="message"]'
      ]);
      if (element) return element;
      this.logInfo("Chat form not immediately found, waiting...");
      element = await this.waitForElement("form", 2e3);
      return element;
    }
    /**
     * チャットコンテナを探す（待機機能付き）
     */
    async findChatContainer() {
      let element = this.findElementBySelectors([
        "#chatWorkSpace",
        "#_mainContent",
        ".chat-container",
        ".main-content",
        'div[class*="workspace"]',
        'div[class*="main"]'
      ]);
      if (element) return element;
      this.logInfo("Chat container not immediately found, waiting...");
      element = await this.waitForElement([
        "#chatWorkSpace",
        "#_mainContent",
        "main",
        '[role="main"]'
      ].join(", "), 2e3);
      return element;
    }
    /**
     * メッセージテキストを抽出
     */
    extractMessageData() {
      const messageData = [];
      const messageContainers = this.findMessageContainers();
      messageContainers.forEach((container) => {
        const text = this.extractSingleMessageText(container);
        if (text) {
          const author = this.extractAuthorFromContainer(container);
          const timestamp = this.extractTimestampFromContainer(container);
          messageData.push({
            text,
            author,
            timestamp
          });
        }
      });
      const uniqueData = messageData.filter(
        (data, index2, array) => array.findIndex((d) => d.text === data.text) === index2
      );
      return uniqueData;
    }
    extractMessageTexts() {
      const messageTexts = [];
      const messageContainers = this.findMessageContainers();
      messageContainers.forEach((container) => {
        const messageText = this.extractSingleMessageText(container);
        if (messageText) {
          messageTexts.push(messageText);
        }
      });
      return [...new Set(messageTexts)];
    }
    /**
     * メッセージコンテナを検索（強化版）
     */
    findMessageContainers() {
      for (const selector of CHATWORK_CONFIG.messageSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          this.logInfo(`Found ${elements.length} message containers using: ${selector}`);
          return Array.from(elements);
        }
      }
      const timeline = document.querySelector('#_timeLine, .timeline, .chat-timeline, [class*="timeline"], [class*="message-list"], [class*="chat-list"]');
      if (timeline) {
        const children = Array.from(timeline.children).filter((child) => {
          const text = child.textContent?.trim() || "";
          return text.length > 10 && this.isValidMessageText(text);
        });
        this.logInfo(`Found ${children.length} potential message elements in timeline`);
        if (children.length > 0) {
          return children;
        }
      }
      const fallbackSelectors = [
        'div[class*="message"]:not([class*="input"])',
        'li[class*="message"]',
        'div[class*="chat"]:not([class*="input"])',
        'li[class*="chat"]',
        '[role="listitem"]',
        'div[data-*="message"]',
        'div[data-*="chat"]'
      ];
      for (const selector of fallbackSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            const validElements = Array.from(elements).filter((el) => {
              const text = el.textContent?.trim() || "";
              return text.length > 10 && this.isValidMessageText(text);
            });
            if (validElements.length > 0) {
              this.logInfo(`Found ${validElements.length} message containers using fallback: ${selector}`);
              return validElements;
            }
          }
        } catch {
        }
      }
      return [];
    }
    /**
     * 単一のメッセージからテキストを抽出
     */
    extractSingleMessageText(container) {
      const textSelectors = [
        '[data-testid="message-text"]',
        ".message-text",
        ".messageBody",
        "._messageText",
        ".timeline_message_text"
      ];
      for (const selector of textSelectors) {
        const textElement = container.querySelector(selector);
        if (textElement) {
          const text = this.cleanMessageText(textElement.textContent || "");
          if (this.isValidMessageText(text)) {
            return text;
          }
        }
      }
      const fullText = container.textContent || "";
      const cleanedText = this.cleanMessageText(fullText);
      return this.isValidMessageText(cleanedText) ? cleanedText : null;
    }
    /**
     * メッセージテキストをクリーンアップ
     */
    cleanMessageText(text) {
      return text.trim().replace(/\s+/g, " ").replace(/^(TO|From|送信者|宛先)[:：]\s*/i, "").replace(/^\d{1,2}:\d{2}\s*/, "").replace(/^[\d/-\s]+\s*/, "").trim();
    }
    /**
     * 有効なメッセージテキストかチェック
     */
    isValidMessageText(text) {
      if (!text || text.length < 5 || text.length > 3e3) {
        return false;
      }
      const excludePatterns = [
        /^(ログイン|ログアウト|参加|退出|作成|削除|変更)/,
        /^(login|logout|joined|left|created|deleted|changed)/i,
        /検索条件をクリアし、初期状態に戻します/,
        /^(TO|From|送信者|宛先|時刻|日付)[:：]/,
        /^(送信|キャンセル|削除|編集|返信|転送)/,
        /^\d+$/,
        /^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/,
        /^(はい|いいえ|yes|no|ok|ng)$/i,
        /^\s*$/
      ];
      return !excludePatterns.some((pattern) => pattern.test(text));
    }
    /**
     * チャット情報を抽出
     */
    extractChatInfo() {
      const chatName = document.querySelector("#_roomTitle, .room_title, .chat_title")?.textContent || document.querySelector("h1, h2")?.textContent || "マイチャット";
      const roomName = document.querySelector(".group_name, .room_name")?.textContent || "個別チャット";
      return { chatName, roomName };
    }
    /**
     * 送信を実行
     */
    async executeSend(content) {
      try {
        this.logInfo("========== Starting Chatwork Send Execution ==========");
        this.logInfo("Step 1: Inserting content to input field...");
        const insertSuccess = await this.insertContentToChatwork(content);
        if (!insertSuccess) {
          this.logError("send execution", "Could not insert content to input field");
          return false;
        }
        this.logSuccess("Content inserted to input field");
        this.logInfo("Step 2: Finding and clicking send button...");
        this.debugSendButtonsInDetail();
        const clickSuccess = await this.sendButtonManager.findAndClickSendButton(
          CHATWORK_CONFIG.buttonSelectors
        );
        if (!clickSuccess) {
          this.logError("send execution", "Could not find or click send button");
          this.debugSendButtonFailure();
          return false;
        }
        this.logSuccess("Send button clicked and message sent");
        this.logInfo("========== Chatwork Send Execution Complete ==========");
        return true;
      } catch (error) {
        this.logError("send execution", error);
        return false;
      }
    }
    /**
     * Chatworkの入力欄にコンテンツを挿入
     */
    async insertContentToChatwork(content) {
      this.debugInputElements();
      const messageInput = this.findElementBySelectors(CHATWORK_CONFIG.inputSelectors);
      if (!messageInput) {
        this.logError("content insertion", "Message input not found");
        this.debugInputElementsFailure();
        return false;
      }
      try {
        messageInput.focus();
        await this.delay(100);
        messageInput.value = "";
        messageInput.value = content;
        const events = ["input", "change", "keyup", "keydown", "blur", "focus"];
        events.forEach((eventType) => {
          messageInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        messageInput.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: content
        }));
        this.logSuccess("Content inserted to message input");
        return true;
      } catch (error) {
        this.logError("content insertion", error);
        return false;
      }
    }
    // === デバッグメソッド ===
    debugPageStructure() {
      console.log("🔍 === Chatwork Page Structure Debug ===");
      console.log("URL:", window.location.href);
      console.log("Title:", document.title);
      console.log("Body classes:", document.body.className);
      const containers = ["#app", "#root", "[data-reactroot]", "#_body", "#chatWorkSpace"];
      containers.forEach((selector) => {
        const element = document.querySelector(selector);
        console.log(`${selector}:`, element ? "Found" : "Not found");
      });
    }
    debugPageDetection() {
      console.log("🔍 === Page Detection Debug ===");
      console.log("URL patterns check:");
      CHATWORK_CONFIG.urlPatterns.forEach((pattern) => {
        const matches = window.location.hostname.includes(pattern);
        console.log(`  ${pattern}: ${matches ? "✅" : "❌"}`);
      });
      console.log("Element detection check:");
      CHATWORK_CONFIG.pageDetectionSelectors.slice(0, 5).forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`  ${selector}: ${elements.length} found`);
        } catch {
          console.log(`  ${selector}: Error`);
        }
      });
    }
    debugInsertionPointFailure() {
      console.log("🔍 === Insertion Point Failure Debug ===");
      const basicSelectors = ["form", "textarea", "input", "button", "[contenteditable]"];
      basicSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        console.log(`${selector}: ${elements.length} found`);
      });
      console.log("Document structure:");
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.slice(0, 10).forEach((child, index2) => {
        console.log(`  ${index2 + 1}. ${child.tagName}${child.id ? "#" + child.id : ""}${child.className ? "." + child.className.split(" ")[0] : ""}`);
      });
    }
    debugInputElements() {
      console.log("🔍 === Input Elements Debug ===");
      CHATWORK_CONFIG.inputSelectors.slice(0, 10).forEach((selector, index2) => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`${index2 + 1}. ${selector}: ${elements.length} found`);
          if (elements.length > 0) {
            const first = elements[0];
            console.log(`   Type: ${first.tagName}, Visible: ${this.isElementVisible(first)}`);
          }
        } catch {
          console.log(`${index2 + 1}. ${selector}: Error`);
        }
      });
    }
    debugInputElementsFailure() {
      console.log("🔍 === Input Elements Failure Debug ===");
      const allInputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
      console.log(`Total input elements found: ${allInputs.length}`);
      Array.from(allInputs).slice(0, 5).forEach((input, index2) => {
        const element = input;
        console.log(`${index2 + 1}.`, {
          tag: element.tagName,
          type: element.type,
          id: element.id,
          class: element.className,
          visible: this.isElementVisible(element),
          placeholder: element.getAttribute("placeholder")
        });
      });
    }
    debugMessageStructure() {
      console.log("🔍 === Message Structure Debug ===");
      const timeline = document.querySelector("#_timeLine, .timeline, .chat-timeline");
      if (timeline) {
        console.log("Timeline found:", {
          id: timeline.id,
          class: timeline.className,
          children: timeline.children.length
        });
      } else {
        console.log("❌ Timeline not found");
      }
      CHATWORK_CONFIG.messageSelectors.slice(0, 8).forEach((selector, index2) => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`${index2 + 1}. ${selector}: ${elements.length} found`);
          }
        } catch {
          console.log(`${index2 + 1}. ${selector}: Error`);
        }
      });
    }
    debugMessageExtractionFailure() {
      console.log("🔍 === Message Extraction Failure Debug ===");
      const generalSelectors = [
        'div[class*="message"]',
        'div[class*="chat"]',
        'div[class*="timeline"]',
        "li",
        '[role="listitem"]',
        ".message",
        ".msg"
      ];
      generalSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`${selector}: ${elements.length} found`);
            const first = elements[0];
            const text = first.textContent?.trim() || "";
            console.log(`  Sample: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
          }
        } catch {
          console.log(`${selector}: Error`);
        }
      });
      const bodyText = document.body.textContent || "";
      console.log(`Total body text length: ${bodyText.length}`);
      if (bodyText.length > 0) {
        console.log(`Body text sample: "${bodyText.substring(0, 200)}..."`);
      }
    }
    debugSendButtonsInDetail() {
      console.log("🔍 === Detailed Send Button Analysis ===");
      const allButtons = document.querySelectorAll('button, input[type="submit"], div[role="button"], span[role="button"]');
      console.log(`Total interactive elements: ${allButtons.length}`);
      let candidateCount = 0;
      Array.from(allButtons).forEach((element, index2) => {
        const button = element;
        const text = (button.textContent || "").trim();
        const value = (button.value || "").trim();
        const className = button.className;
        const id = button.id;
        const type = button.getAttribute("type");
        const role = button.getAttribute("role");
        const isSendCandidate = text.includes("送信") || text.includes("Send") || value.includes("送信") || value.includes("Send") || type === "submit" || className.includes("send") || className.includes("submit") || id.includes("send") || id.includes("submit");
        if (isSendCandidate || candidateCount < 10) {
          candidateCount++;
          console.log(`Button ${index2 + 1} ${isSendCandidate ? "(CANDIDATE)" : ""}:`, {
            tag: button.tagName,
            text: text.substring(0, 30),
            value: value.substring(0, 30),
            class: className,
            id,
            type,
            role,
            visible: this.isElementVisible(button),
            disabled: button.hasAttribute("disabled"),
            position: this.getElementPosition(button)
          });
        }
      });
      console.log(`Found ${candidateCount} potential send button candidates`);
    }
    debugSendButtonFailure() {
      console.log("🔍 === Send Button Failure Debug ===");
      const forms = document.querySelectorAll("form");
      console.log(`Forms on page: ${forms.length}`);
      forms.forEach((form, index2) => {
        console.log(`Form ${index2 + 1}:`, {
          id: form.id,
          class: form.className,
          action: form.action,
          method: form.method,
          visible: this.isElementVisible(form)
        });
        const formButtons = form.querySelectorAll('button, input[type="submit"]');
        console.log(`  Buttons in form: ${formButtons.length}`);
        formButtons.forEach((btn, btnIndex) => {
          const button = btn;
          console.log(`    ${btnIndex + 1}. ${button.tagName} - "${button.textContent?.trim()}" (visible: ${this.isElementVisible(button)})`);
        });
      });
      const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
      console.log(`Input elements: ${inputs.length}`);
      inputs.forEach((input, index2) => {
        const inputElement = input;
        if (this.isElementVisible(inputElement)) {
          console.log(`Visible input ${index2 + 1}:`, {
            tag: inputElement.tagName,
            id: inputElement.id,
            class: inputElement.className
          });
          const parent = inputElement.closest("form, div, section");
          if (parent) {
            const nearbyButtons = parent.querySelectorAll('button, input[type="submit"]');
            console.log(`  Nearby buttons: ${nearbyButtons.length}`);
            nearbyButtons.forEach((btn, btnIndex) => {
              const button = btn;
              console.log(`    ${btnIndex + 1}. "${button.textContent?.trim()}" (${button.tagName})`);
            });
          }
        }
      });
    }
    getElementPosition(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }
    /**
     * コンテナから作成者を抽出
     */
    extractAuthorFromContainer(container) {
      const authorSelectors = [
        '[class*="name"]',
        '[class*="author"]',
        '[class*="user"]',
        '[class*="sender"]',
        ".userName",
        ".member-name",
        ".message-name",
        ".chat-name",
        "strong",
        "b",
        "[data-name]",
        "[data-user]"
      ];
      for (const selector of authorSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          const name = element.textContent?.trim();
          if (name && name.length > 0 && name.length < 50) {
            console.log(`👥 Found author: ${name} using selector: ${selector}`);
            return name;
          }
        }
      }
      const strongElement = container.querySelector("strong");
      if (strongElement) {
        const name = strongElement.textContent?.trim();
        if (name && name.length > 0 && name.length < 50) {
          console.log(`👥 Found author (fallback): ${name}`);
          return name;
        }
      }
      return null;
    }
    /**
     * コンテナからタイムスタンプを抽出
     */
    extractTimestampFromContainer(container) {
      const timestampSelectors = [
        '[class*="time"]',
        '[class*="date"]',
        '[class*="timestamp"]',
        "[data-time]",
        "[data-date]",
        '[title*=":"]',
        "time"
      ];
      for (const selector of timestampSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          const timeText = element.textContent?.trim() || element.getAttribute("title") || element.getAttribute("data-time");
          if (timeText) {
            const timestamp = this.parseTimestamp(timeText);
            if (timestamp) {
              console.log(`🕰️ Found timestamp: ${timestamp.toISOString()} from: ${timeText}`);
              return timestamp;
            }
          }
        }
      }
      return null;
    }
    /**
     * タイムスタンプ文字列を解析
     */
    parseTimestamp(timeText) {
      const patterns = [
        /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
        // 2024-01-01 12:00:00
        /\d{2}:\d{2}/,
        // 12:00
        /\d{1,2}月\d{1,2}日 \d{1,2}:\d{2}/,
        // 1月1日 12:00
        /\d{1,2}\/\d{1,2} \d{1,2}:\d{2}/
        // 1/1 12:00
      ];
      for (const pattern of patterns) {
        if (pattern.test(timeText)) {
          const date = new Date(timeText);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    }
  }
  class MemoryManager {
    // 95% memory usage
    constructor() {
      this.cleanupTasks = /* @__PURE__ */ new Map();
      this.isMonitoring = false;
      this.MEMORY_WARNING_THRESHOLD = 85;
      this.MEMORY_CRITICAL_THRESHOLD = 95;
      this.lastMemoryCheck = 0;
      this.MEMORY_CHECK_THROTTLE = 6e4;
      this.initializeMonitoring();
    }
    static getInstance() {
      if (!MemoryManager.instance) {
        MemoryManager.instance = new MemoryManager();
      }
      return MemoryManager.instance;
    }
    /**
     * Register a cleanup task with priority
     */
    registerCleanupTask(id, cleanup, priority = "medium") {
      this.cleanupTasks.set(id, { id, cleanup, priority });
    }
    /**
     * Unregister a cleanup task
     */
    unregisterCleanupTask(id) {
      this.cleanupTasks.delete(id);
    }
    /**
     * Force cleanup with priority ordering
     */
    forceCleanup() {
      console.log("MemoryManager: Running priority cleanup...");
      const tasksByPriority = Array.from(this.cleanupTasks.values()).sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      let cleaned = 0;
      for (const task of tasksByPriority) {
        try {
          task.cleanup();
          cleaned++;
        } catch (error) {
          console.warn(`MemoryManager: Cleanup task ${task.id} failed:`, error);
        }
      }
      console.log(`MemoryManager: Completed ${cleaned}/${tasksByPriority.length} cleanup tasks`);
      if ("gc" in window && typeof window.gc === "function") {
        try {
          window.gc();
          console.log("MemoryManager: Forced garbage collection");
        } catch {
        }
      }
    }
    /**
     * Get current memory statistics
     */
    async getMemoryStats() {
      try {
        if ("memory" in performance) {
          const memory = performance.memory;
          if (memory) {
            const used = memory.usedJSHeapSize;
            const total = memory.totalJSHeapSize;
            const percentage = total > 0 ? Math.round(used / total * 100) : 0;
            return {
              used,
              total,
              percentage,
              warning: percentage > this.MEMORY_WARNING_THRESHOLD,
              critical: percentage > this.MEMORY_CRITICAL_THRESHOLD
            };
          }
        }
        const taskCount = this.cleanupTasks.size;
        const estimatedUsage = Math.min(taskCount * 10, 50);
        return {
          used: estimatedUsage,
          total: 100,
          percentage: estimatedUsage,
          warning: estimatedUsage > this.MEMORY_WARNING_THRESHOLD,
          critical: estimatedUsage > this.MEMORY_CRITICAL_THRESHOLD
        };
      } catch (error) {
        console.warn("MemoryManager: Error getting memory stats:", error);
        return {
          used: 0,
          total: 100,
          percentage: 0,
          warning: false,
          critical: false
        };
      }
    }
    /**
     * Initialize lightweight monitoring (only when needed)
     */
    initializeMonitoring() {
      if (this.cleanupTasks.size === 0) {
        return;
      }
      this.setupPassiveMonitoring();
    }
    /**
     * Setup passive monitoring that doesn't use timers
     */
    setupPassiveMonitoring() {
      if (this.isMonitoring) {
        return;
      }
      this.isMonitoring = true;
      document.addEventListener("visibilitychange", this.checkMemoryOnDemand.bind(this));
      document.addEventListener("click", this.throttledMemoryCheck.bind(this), { passive: true });
    }
    // 1 minute
    /**
     * Throttled memory check to prevent excessive monitoring
     */
    throttledMemoryCheck() {
      const now = Date.now();
      if (now - this.lastMemoryCheck < this.MEMORY_CHECK_THROTTLE) {
        return;
      }
      this.lastMemoryCheck = now;
      this.checkMemoryOnDemand();
    }
    /**
     * Check memory only when needed
     */
    async checkMemoryOnDemand() {
      if (!this.isExtensionContextValid()) {
        return;
      }
      try {
        const stats = await this.getMemoryStats();
        if (stats.critical) {
          console.warn("MemoryManager: Critical memory usage detected:", stats);
          this.forceCleanup();
        } else if (stats.warning) {
          console.warn("MemoryManager: High memory usage detected:", stats);
          this.runExpiredCacheCleanup();
        }
      } catch (error) {
        console.error("MemoryManager: Error in on-demand memory check:", error);
      }
    }
    /**
     * Check if extension context is still valid
     */
    isExtensionContextValid() {
      return !!chrome?.runtime?.id;
    }
    /**
     * Run expired cache cleanup safely
     */
    async runExpiredCacheCleanup() {
      try {
        if (!this.isExtensionContextValid()) {
          return;
        }
        const { ChromeStorageManager: ChromeStorageManager2 } = await Promise.resolve().then(() => ChromeStorageManager$1);
        await ChromeStorageManager2.clearExpiredCache();
      } catch (error) {
        console.warn("MemoryManager: Cache cleanup failed:", error);
      }
    }
    /**
     * Cleanup all resources
     */
    cleanup() {
      this.forceCleanup();
      this.cleanupTasks.clear();
      this.isMonitoring = false;
      document.removeEventListener("visibilitychange", this.checkMemoryOnDemand.bind(this));
      document.removeEventListener("click", this.throttledMemoryCheck.bind(this));
    }
    /**
     * Destroy the memory manager
     */
    destroy() {
      this.cleanup();
      MemoryManager.instance = null;
    }
  }
  const memoryManager = MemoryManager.getInstance();
  class DragDropManager {
    // 5px移動でドラッグ開始
    constructor(element, options = {}) {
      this.isDragging = false;
      this.startPos = { x: 0, y: 0 };
      this.elementOffset = { x: 0, y: 0 };
      this.dragHandle = null;
      this.hasMoved = false;
      this.DRAG_THRESHOLD = 5;
      this.element = element;
      this.options = {
        constrainToViewport: options.constrainToViewport ?? true,
        dragOpacity: options.dragOpacity ?? 0.8,
        snapToGrid: options.snapToGrid ?? false,
        gridSize: options.gridSize ?? 20,
        storageKey: options.storageKey ?? "ai-button-position"
      };
      this.originalPosition = this.getCurrentPosition();
      this.init();
    }
    init() {
      this.restorePosition();
      this.makeDraggable();
      this.setupDragStyles();
    }
    setupDragStyles() {
      this.element.style.cursor = "grab";
      this.element.style.userSelect = "none";
      this.element.style.position = "fixed";
      this.addDragHandle();
    }
    addDragHandle() {
      const handle = document.createElement("div");
      handle.innerHTML = "⋮⋮";
      handle.className = "drag-handle";
      handle.style.cssText = `
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
      transition: opacity 0.2s ease !important;
    `;
      handle.addEventListener("mouseenter", () => {
        handle.style.opacity = "1";
      });
      handle.addEventListener("mouseleave", () => {
        handle.style.opacity = "0.7";
      });
      this.dragHandle = handle;
      this.element.appendChild(handle);
    }
    makeDraggable() {
      this.element.addEventListener("mousedown", this.onMouseDown.bind(this));
      document.addEventListener("mousemove", this.onMouseMove.bind(this));
      document.addEventListener("mouseup", this.onMouseUp.bind(this));
      this.element.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
      document.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
      document.addEventListener("touchend", this.onTouchEnd.bind(this));
    }
    onMouseDown(e) {
      if (e.button !== 0) return;
      if (this.dragHandle && (e.target === this.dragHandle || this.dragHandle.contains(e.target))) {
        this.startDrag(e.clientX, e.clientY);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.startPos = { x: e.clientX, y: e.clientY };
      this.hasMoved = false;
      const rect = this.element.getBoundingClientRect();
      this.elementOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    onTouchStart(e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (this.dragHandle && (e.target === this.dragHandle || this.dragHandle.contains(e.target))) {
        this.startDrag(touch.clientX, touch.clientY);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.startPos = { x: touch.clientX, y: touch.clientY };
      this.hasMoved = false;
      const rect = this.element.getBoundingClientRect();
      this.elementOffset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    startDrag(clientX, clientY) {
      this.isDragging = true;
      this.hasMoved = true;
      if (this.elementOffset.x === 0 && this.elementOffset.y === 0) {
        const rect = this.element.getBoundingClientRect();
        this.elementOffset = {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      }
      this.element.style.opacity = this.options.dragOpacity.toString();
      this.element.style.cursor = "grabbing";
      this.element.style.zIndex = "999999";
      this.element.style.transform = "scale(1.05)";
      this.element.style.transition = "transform 0.1s ease";
      console.log("🎯 Drag started");
    }
    onMouseMove(e) {
      if (this.isDragging) {
        this.updatePosition(e.clientX, e.clientY);
        return;
      }
      if (this.startPos.x !== 0 || this.startPos.y !== 0) {
        const deltaX = Math.abs(e.clientX - this.startPos.x);
        const deltaY = Math.abs(e.clientY - this.startPos.y);
        if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
          this.hasMoved = true;
          this.startDrag(e.clientX, e.clientY);
        }
      }
    }
    onTouchMove(e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (this.isDragging) {
        this.updatePosition(touch.clientX, touch.clientY);
        e.preventDefault();
        return;
      }
      if (this.startPos.x !== 0 || this.startPos.y !== 0) {
        const deltaX = Math.abs(touch.clientX - this.startPos.x);
        const deltaY = Math.abs(touch.clientY - this.startPos.y);
        if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
          this.hasMoved = true;
          this.startDrag(touch.clientX, touch.clientY);
          e.preventDefault();
        }
      }
    }
    updatePosition(clientX, clientY) {
      let newX = clientX - this.elementOffset.x;
      let newY = clientY - this.elementOffset.y;
      if (this.options.constrainToViewport) {
        const rect = this.element.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      }
      if (this.options.snapToGrid) {
        newX = Math.round(newX / this.options.gridSize) * this.options.gridSize;
        newY = Math.round(newY / this.options.gridSize) * this.options.gridSize;
      }
      this.element.style.left = `${newX}px`;
      this.element.style.top = `${newY}px`;
    }
    onMouseUp() {
      if (this.isDragging) {
        this.endDrag();
      } else {
        this.startPos = { x: 0, y: 0 };
        this.hasMoved = false;
      }
    }
    onTouchEnd() {
      if (this.isDragging) {
        this.endDrag();
      } else {
        this.startPos = { x: 0, y: 0 };
        this.hasMoved = false;
      }
    }
    endDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.startPos = { x: 0, y: 0 };
      this.elementOffset = { x: 0, y: 0 };
      this.element.style.opacity = "1";
      this.element.style.cursor = "grab";
      this.element.style.transform = "scale(1)";
      this.element.style.transition = "transform 0.2s ease";
      this.savePosition();
      console.log("🎯 Drag ended, position saved");
    }
    getCurrentPosition() {
      const rect = this.element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    savePosition() {
      try {
        const position = this.getCurrentPosition();
        localStorage.setItem(this.options.storageKey, JSON.stringify(position));
      } catch (error) {
        console.warn("DragDropManager: Failed to save position:", error);
      }
    }
    restorePosition() {
      try {
        const saved = localStorage.getItem(this.options.storageKey);
        if (saved) {
          const position = JSON.parse(saved);
          if (this.isValidPosition(position)) {
            this.element.style.left = `${position.x}px`;
            this.element.style.top = `${position.y}px`;
            console.log("🎯 Position restored:", position);
          } else {
            console.log("🎯 Saved position invalid, using default");
          }
        }
      } catch (error) {
        console.warn("DragDropManager: Failed to restore position:", error);
      }
    }
    isValidPosition(position) {
      return position.x >= 0 && position.y >= 0 && position.x < window.innerWidth && position.y < window.innerHeight;
    }
    /**
     * 位置をリセット
     */
    resetPosition() {
      this.element.style.left = `${this.originalPosition.x}px`;
      this.element.style.top = `${this.originalPosition.y}px`;
      this.savePosition();
      console.log("🎯 Position reset to original");
    }
    /**
     * ドラッグ機能を有効/無効切り替え
     */
    setEnabled(enabled) {
      this.element.style.cursor = enabled ? "grab" : "default";
      this.element.style.pointerEvents = enabled ? "auto" : "none";
    }
    /**
     * ドラッグで移動したかどうかを確認
     * クリックイベントで呼び出して使用
     */
    didMove() {
      return this.hasMoved;
    }
    /**
     * ムーブフラグをリセット
     * クリックイベント処理後に呼び出し
     */
    resetMoveFlag() {
      this.hasMoved = false;
    }
    /**
     * ドラッグ中かどうかを確認
     */
    isDraggingNow() {
      return this.isDragging;
    }
    /**
     * クリーンアップ
     */
    destroy() {
      console.log("🎯 DragDropManager destroyed");
    }
  }
  const _ButtonFactory = class _ButtonFactory {
    /**
     * Create an AI reply button with consistent styling
     */
    static createAIButton(config = {}) {
      const {
        id = "ai-reply-button",
        className = "gemini-reply-button",
        title = "AI返信案を生成",
        text = "AI返信",
        icon = "🤖",
        variant = "standard",
        onClick,
        draggable = false,
        position = "static"
      } = config;
      const button = document.createElement("button");
      button.id = id;
      button.className = className;
      button.title = title;
      button.innerHTML = `
      <span style="font-size: 14px;">${icon}</span>
      <span>${text}</span>
    `;
      this.applyStyles(button, {
        ...this.DEFAULT_STYLES,
        ...this.VARIANT_STYLES[variant],
        position
      });
      this.addHoverEffects(button);
      if (onClick) {
        button.addEventListener("click", onClick);
      }
      if (draggable) {
        this.addDragHandle(button);
      }
      return button;
    }
    /**
     * Create a button specifically for a service
     */
    static createServiceButton(service, onClick, options = {}) {
      const serviceConfigs = {
        gmail: {
          id: "gemini-reply-button-gmail",
          variant: "gmail",
          text: "AI返信生成",
          position: "fixed",
          draggable: true
        },
        chatwork: {
          id: "gemini-reply-button-chatwork",
          variant: "chatwork",
          text: "AI返信生成",
          position: "fixed",
          draggable: true
        },
        "google-chat": {
          id: "gemini-reply-button-google-chat",
          variant: "google-chat",
          text: "AI返信生成",
          draggable: true
        },
        "line-official-account": {
          id: "gemini-reply-button-line",
          variant: "line-official-account",
          text: "AI返信生成",
          position: "fixed",
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
    static applyStyles(button, styles) {
      Object.entries(styles).forEach(([property, value]) => {
        const cssProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase();
        button.style.setProperty(cssProperty, value, "important");
      });
    }
    /**
     * Add hover effects to button
     */
    static addHoverEffects(button) {
      button.addEventListener("mouseenter", () => {
        button.style.setProperty("background-color", this.DEFAULT_STYLES.hoverBackgroundColor, "important");
      });
      button.addEventListener("mouseleave", () => {
        button.style.setProperty("background-color", this.DEFAULT_STYLES.backgroundColor, "important");
      });
    }
    /**
     * Add drag handle to button for draggable functionality
     */
    static addDragHandle(button) {
      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
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
      dragHandle.textContent = "⋮⋮";
      button.style.position = "relative";
      button.appendChild(dragHandle);
      button.style.cursor = "grab";
      button.style.userSelect = "none";
    }
    /**
     * Update button state
     */
    static updateButtonState(button, state) {
      if (state.loading !== void 0) {
        if (state.loading) {
          button.innerHTML = '<span class="loading-spinner"></span> 生成中...';
          button.setAttribute("disabled", "true");
        }
      }
      if (state.disabled !== void 0) {
        if (state.disabled) {
          button.setAttribute("disabled", "true");
          button.style.opacity = "0.5";
        } else {
          button.removeAttribute("disabled");
          button.style.opacity = "1";
        }
      }
      if (state.text) {
        const textSpan = button.querySelector("span:last-child");
        if (textSpan) {
          textSpan.textContent = state.text;
        }
      }
    }
  };
  _ButtonFactory.DEFAULT_STYLES = {
    backgroundColor: "#16a34a",
    hoverBackgroundColor: "#15803d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  };
  _ButtonFactory.VARIANT_STYLES = {
    standard: {
      padding: "6px 12px"
    },
    gmail: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "2px solid #16a34a",
      fontWeight: "bold",
      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.5)",
      width: "140px",
      height: "40px",
      textAlign: "center"
    },
    chatwork: {
      padding: "8px 12px",
      margin: "4px",
      boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)",
      flexShrink: "0"
    },
    "google-chat": {
      padding: "6px 12px"
    },
    "line-official-account": {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "2px solid #16a34a",
      fontWeight: "bold",
      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
      width: "140px",
      height: "40px",
      textAlign: "center"
    }
  };
  let ButtonFactory = _ButtonFactory;
  class ChatworkContentScript {
    constructor() {
      this.strategy = null;
      this.observer = null;
      this.currentUrl = "";
      this.retryCount = 0;
      this.MAX_RETRIES = 3;
      this.RETRY_DELAY = 1e3;
      this.dragDropManager = null;
      console.log("💬 Chatwork Content Script: Initializing...");
      this.init();
      this.registerMemoryCleanup();
    }
    init() {
      console.log("💬 Chatwork Content Script: Starting initialization");
      this.injectStyles();
      this.currentUrl = window.location.href;
      this.strategy = new ChatworkAutoSendStrategy();
      setTimeout(() => {
        this.checkAndInjectButton();
      }, 500);
      this.startObserving();
      this.startUrlMonitoring();
      window.addEventListener("beforeunload", () => this.cleanup());
    }
    injectStyles() {
      const styleId = "gemini-reply-styles-chatwork";
      if (document.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
      .gemini-reply-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 0 8px;
        box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
        z-index: 1000;
        position: relative;
      }
      
      .gemini-reply-button:hover {
        background: linear-gradient(135deg, #15803d, #166534);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(22, 163, 74, 0.3);
      }
      
      .gemini-reply-button:disabled {
        background: #9CA3AF;
        cursor: not-allowed;
        transform: none;
      }
      
      .gemini-reply-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .gemini-reply-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        margin: auto;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .gemini-reply-textarea {
        width: 100%;
        min-height: 150px;
        max-height: 400px;
        padding: 12px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s ease;
      }
      
      .gemini-reply-textarea:focus {
        border-color: #0084ff;
        box-shadow: 0 0 0 3px rgba(0, 132, 255, 0.1);
      }
      
      .gemini-reply-buttons {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-top: 8px;
        align-items: center;
      }
      
      .gemini-reply-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
        box-sizing: border-box;
      }
      
      .gemini-reply-btn-primary {
        background: linear-gradient(135deg, #0084ff, #0066cc);
        color: white;
      }
      
      .gemini-reply-btn-secondary {
        background: #F3F4F6;
        color: #374151;
        border: 1px solid #D1D5DB;
      }
    `;
      (document.head || document.documentElement).appendChild(style);
    }
    async checkAndInjectButton() {
      try {
        console.log("🔍 Chatwork: Starting button injection process...");
        if (!this.strategy) {
          console.log("❌ No strategy available");
          return;
        }
        if (this.strategy.isButtonInjected()) {
          console.log("ℹ️ Button already injected");
          return;
        }
        const insertionPoint = await this.strategy.findInsertionPoint();
        if (insertionPoint) {
          console.log("✅ Insertion point found, injecting button...");
          this.injectReplyButton(insertionPoint);
          this.retryCount = 0;
          console.log("🎉 Chatwork button injection completed successfully!");
        } else {
          console.log("❌ Insertion point not found, scheduling retry...");
          this.scheduleRetry();
        }
      } catch (error) {
        console.error("💥 Error in Chatwork checkAndInjectButton:", error);
        this.scheduleRetry();
      }
    }
    injectReplyButton(container) {
      if (!this.strategy) return;
      const buttonId = "gemini-reply-button-chatwork-autosend";
      if (document.getElementById(buttonId)) {
        console.log("Button already exists, skipping injection");
        return;
      }
      const button = ButtonFactory.createServiceButton(
        "chatwork",
        () => {
        },
        // 仮のハンドラー
        {
          id: buttonId,
          title: "AI返信生成 - ドラッグ&ドロップ対応"
        }
      );
      container.appendChild(button);
      this.dragDropManager = new DragDropManager(button, {
        constrainToViewport: true,
        dragOpacity: 0.8,
        snapToGrid: true,
        gridSize: 20,
        storageKey: "chatwork-ai-button-position"
      });
      this.setupDragAwareClickHandler(button);
      console.log("✅ Chatwork button with drag & drop injected successfully");
    }
    /**
     * ドラッグ対応のクリックハンドラーを設定
     */
    setupDragAwareClickHandler(button) {
      button.addEventListener("click", (event) => {
        if (this.dragDropManager?.isDraggingNow()) {
          console.log("👍 Chatwork: Click ignored - currently dragging");
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (this.dragDropManager?.didMove()) {
          console.log("👍 Chatwork: Click ignored - just moved by drag");
          this.dragDropManager.resetMoveFlag();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        console.log("💬 Chatwork button clicked!");
        this.handleButtonClick();
      });
    }
    async handleButtonClick() {
      try {
        console.log("💬 Chatwork Button clicked, starting handleButtonClick...");
        if (!chrome?.runtime?.id) {
          console.error("❌ Extension context is invalid");
          alert("拡張機能のコンテキストが無効です。ページを再読み込みしてください。");
          return;
        }
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          console.log("❌ No API key found");
          alert("Gemini APIキーが設定されていません。\n\n拡張機能のポップアップを開いて「設定」タブからGemini APIキーを入力してください。");
          return;
        }
        const messages = this.strategy.extractMessages();
        if (messages.length === 0) {
          console.log("❌ No messages found");
          alert("会話履歴が見つかりませんでした。");
          return;
        }
        console.log(`✅ Found ${messages.length} messages, processing...`);
        if (this.strategy instanceof ChatworkAutoSendStrategy) {
          const { MessageConverter: MessageConverter2 } = await Promise.resolve().then(() => index);
          const geminiMessages = MessageConverter2.serviceArrayToGemini(messages);
          const response = await this.generateReply(apiKey, geminiMessages);
          if (response.success && response.text) {
            await this.strategy.insertReply(response.text);
          } else {
            alert(`エラーが発生しました: ${response.error || "Unknown error"}`);
          }
        }
      } catch (error) {
        console.error("💥 Error handling Chatwork button click:", error);
        alert(`エラーが発生しました: ${error.message || "Unknown error"}`);
      }
    }
    async getApiKey() {
      try {
        if (!chrome?.runtime?.id) {
          throw new Error("Extension context invalid");
        }
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Background communication timeout after 5 seconds"));
          }, 5e3);
          chrome.runtime.sendMessage({
            type: "GET_API_KEY",
            timestamp: Date.now()
          }, (response2) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              console.error("🔥 Runtime error:", chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response2);
            }
          });
        });
        if (response.success && response.apiKey) {
          return response.apiKey;
        } else {
          console.warn("❌ Failed to get API key from background:", response.error);
          return null;
        }
      } catch (error) {
        console.error("💥 Error getting API key:", error);
        if (error.message?.includes("Extension context invalid")) {
          throw error;
        }
        return null;
      }
    }
    async generateReply(apiKey, messages) {
      try {
        const requestData = {
          type: "GENERATE_REPLY",
          messages,
          apiKey,
          timestamp: Date.now()
        };
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Background communication timeout after 60 seconds"));
          }, 6e4);
          chrome.runtime.sendMessage(requestData, (response2) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response2);
            }
          });
        });
        return response;
      } catch (error) {
        console.error("💥 Error generating reply:", error);
        return { success: false, error: error.message };
      }
    }
    scheduleRetry() {
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        setTimeout(async () => await this.checkAndInjectButton(), this.RETRY_DELAY * this.retryCount);
      }
    }
    startObserving() {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            shouldCheck = true;
            break;
          }
        }
        if (shouldCheck && this.retryCount < this.MAX_RETRIES) {
          setTimeout(async () => await this.checkAndInjectButton(), 500);
        }
      });
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    startUrlMonitoring() {
      const checkUrlChange = () => {
        if (window.location.href !== this.currentUrl) {
          console.log("Chatwork URL changed, reinitializing...");
          this.currentUrl = window.location.href;
          this.retryCount = 0;
          setTimeout(async () => {
            await this.checkAndInjectButton();
          }, 1e3);
        }
      };
      setInterval(checkUrlChange, 2e3);
      window.addEventListener("popstate", checkUrlChange);
      window.addEventListener("pushstate", checkUrlChange);
      window.addEventListener("replacestate", checkUrlChange);
    }
    registerMemoryCleanup() {
      memoryManager.registerCleanupTask("chatwork-content-script", () => {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        this.strategy = null;
      });
    }
    cleanup() {
      try {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        if (this.dragDropManager) {
          this.dragDropManager.destroy();
          this.dragDropManager = null;
        }
        try {
          memoryManager.cleanup();
        } catch (error) {
          console.warn("Chatwork ContentScript: Error during memory cleanup:", error);
        }
        console.log("Chatwork ContentScript: Cleanup completed successfully");
      } catch (error) {
        console.error("Chatwork ContentScript: Error during cleanup:", error);
      }
    }
  }
  const chatworkScript = new ChatworkContentScript();
  window.chatworkScript = chatworkScript;
  window.chatworkStrategy = chatworkScript["strategy"];
  console.log("🔧 Debug helpers available:");
  console.log("🔧 - window.chatworkScript: Main script instance");
  console.log("🔧 - window.chatworkStrategy: Strategy instance");
  console.log("🔧 - chatworkStrategy.debugFindSendButton(): Find send button manually");
  const _ChromeStorageManager = class _ChromeStorageManager {
    /**
     * Get a value from Chrome storage
     */
    static async get(key) {
      try {
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
      } catch (error) {
        console.error(`ChromeStorageManager: Error getting key "${key}":`, error);
        return null;
      }
    }
    /**
     * Set a value in Chrome storage
     */
    static async set(key, value) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (error) {
        console.error(`ChromeStorageManager: Error setting key "${key}":`, error);
        throw error;
      }
    }
    /**
     * Get multiple values from Chrome storage
     */
    static async getMultiple(keys) {
      try {
        const result = await chrome.storage.local.get(keys);
        return result;
      } catch (error) {
        console.error("ChromeStorageManager: Error getting multiple keys:", error);
        return {};
      }
    }
    /**
     * Set multiple values in Chrome storage
     */
    static async setMultiple(items) {
      try {
        await chrome.storage.local.set(items);
      } catch (error) {
        console.error("ChromeStorageManager: Error setting multiple items:", error);
        throw error;
      }
    }
    /**
     * Remove a key from Chrome storage
     */
    static async remove(key) {
      try {
        await chrome.storage.local.remove(key);
      } catch (error) {
        console.error(`ChromeStorageManager: Error removing key "${key}":`, error);
        throw error;
      }
    }
    /**
     * Clear all data from Chrome storage
     */
    static async clear() {
      try {
        await chrome.storage.local.clear();
      } catch (error) {
        console.error("ChromeStorageManager: Error clearing storage:", error);
        throw error;
      }
    }
    /**
     * Get storage usage information
     */
    static async getUsage() {
      try {
        const used = await chrome.storage.local.getBytesInUse();
        const total = chrome.storage.local.QUOTA_BYTES || 5242880;
        return {
          used,
          total,
          percentage: used / total * 100
        };
      } catch (error) {
        console.error("ChromeStorageManager: Error getting storage usage:", error);
        return { used: 0, total: 0, percentage: 0 };
      }
    }
    // === Cached Storage Methods ===
    /**
     * Get a cached value with automatic expiration
     */
    static async getCached(channel, threadId) {
      try {
        const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
        const cached = await this.get(cacheKey);
        if (!cached) {
          return null;
        }
        if (cached.expiresAt && Date.now() > cached.expiresAt) {
          await this.remove(cacheKey);
          return null;
        }
        return cached.value;
      } catch (error) {
        console.error("ChromeStorageManager: Error getting cached value:", error);
        return null;
      }
    }
    /**
     * Set a cached value with TTL
     */
    static async setCached(channel, threadId, value, options = {}) {
      try {
        const cacheKey = `${this.CACHE_PREFIX}_${channel}_${threadId}`;
        const ttl = options.ttl || this.DEFAULT_TTL;
        const cacheItem = {
          value,
          expiresAt: Date.now() + ttl
        };
        await this.set(cacheKey, cacheItem);
      } catch (error) {
        console.error("ChromeStorageManager: Error setting cached value:", error);
        throw error;
      }
    }
    /**
     * Clear expired cache entries safely with proper error handling
     */
    static async clearExpiredCache() {
      try {
        if (!this.isExtensionContextValid()) {
          return 0;
        }
        let allData;
        try {
          allData = await chrome.storage.local.get();
        } catch {
          console.warn("ChromeStorageManager: Storage access failed during cache cleanup");
          return 0;
        }
        const now = Date.now();
        const keysToRemove = [];
        for (const [key, value] of Object.entries(allData)) {
          if (this.isCacheKey(key) && this.isCacheItemExpired(value, now)) {
            keysToRemove.push(key);
          }
        }
        if (keysToRemove.length > 0) {
          try {
            await chrome.storage.local.remove(keysToRemove);
            console.log(`ChromeStorageManager: Cleared ${keysToRemove.length} expired cache entries`);
          } catch (removeError) {
            console.warn("ChromeStorageManager: Failed to remove expired entries:", removeError);
            return 0;
          }
        }
        return keysToRemove.length;
      } catch (error) {
        if (this.isExtensionContextError(error)) {
          console.warn("ChromeStorageManager: Extension context invalidated during cache cleanup");
          return 0;
        }
        console.error("ChromeStorageManager: Unexpected error during cache cleanup:", error);
        return 0;
      }
    }
    /**
     * Check if extension context is valid
     */
    static isExtensionContextValid() {
      try {
        return !!(chrome?.runtime?.id && chrome?.storage?.local);
      } catch {
        return false;
      }
    }
    /**
     * Check if a key is a cache key
     */
    static isCacheKey(key) {
      return key.startsWith(this.CACHE_PREFIX);
    }
    /**
     * Check if a cache item is expired
     */
    static isCacheItemExpired(value, now) {
      return value && typeof value === "object" && "expiresAt" in value && typeof value.expiresAt === "number" && value.expiresAt < now;
    }
    /**
     * Check if error is related to extension context
     */
    static isExtensionContextError(error) {
      if (!error || typeof error !== "object" || !("message" in error)) return false;
      const message = error.message.toLowerCase();
      return message.includes("extension context invalidated") || message.includes("context invalidated") || message.includes("extension is disabled");
    }
    /**
     * Clear all cache entries
     */
    static async clearAllCache() {
      try {
        const allData = await chrome.storage.local.get();
        const cacheKeys = Object.keys(allData).filter((key) => key.startsWith(this.CACHE_PREFIX));
        if (cacheKeys.length > 0) {
          await chrome.storage.local.remove(cacheKeys);
          console.log(`ChromeStorageManager: Cleared ${cacheKeys.length} cache entries`);
        }
      } catch (error) {
        console.error("ChromeStorageManager: Error clearing all cache:", error);
        throw error;
      }
    }
    // === Promise-based wrapper for callback-style code ===
    /**
     * Promise-based get for use in content scripts or callback contexts
     */
    static getPromised(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            console.error(`ChromeStorageManager: Runtime error for key "${key}":`, chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result[key] || null);
          }
        });
      });
    }
    /**
     * Promise-based set for use in content scripts or callback contexts
     */
    static setPromised(key, value) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error(`ChromeStorageManager: Runtime error setting key "${key}":`, chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  };
  _ChromeStorageManager.DEFAULT_TTL = 60 * 60 * 1e3;
  _ChromeStorageManager.CACHE_PREFIX = "cache";
  let ChromeStorageManager = _ChromeStorageManager;
  const ChromeStorageManager$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    ChromeStorageManager
  }, Symbol.toStringTag, { value: "Module" }));
  class MessageConverter {
    /**
     * Convert ServiceMessage to GeminiMessage
     */
    static serviceToGemini(serviceMessage) {
      return {
        role: "user",
        // Service messages are typically user messages
        content: `${serviceMessage.author}: ${serviceMessage.text}`,
        timestamp: serviceMessage.timestamp ? serviceMessage.timestamp.getTime() : Date.now()
      };
    }
    /**
     * Convert multiple ServiceMessages to GeminiMessages
     */
    static serviceArrayToGemini(serviceMessages) {
      return serviceMessages.map((msg) => this.serviceToGemini(msg));
    }
    /**
     * Convert ServiceMessages to conversation text
     */
    static serviceToText(serviceMessages) {
      return serviceMessages.map((msg) => `${msg.author}: ${msg.text}`).join("\n\n");
    }
    /**
     * Create GeminiMessage from text and role
     */
    static createGeminiMessage(content, role = "user") {
      return {
        role,
        content,
        timestamp: Date.now()
      };
    }
  }
  const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    MessageConverter
  }, Symbol.toStringTag, { value: "Module" }));
})();
