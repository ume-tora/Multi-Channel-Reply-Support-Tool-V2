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
export {
  errorNotificationService as e
};
