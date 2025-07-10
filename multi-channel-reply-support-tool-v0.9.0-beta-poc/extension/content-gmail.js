(function() {
  "use strict";
  const _GmailAutoSendStrategy = class _GmailAutoSendStrategy {
    getServiceName() {
      return "gmail";
    }
    /**
     * ボタン配置点を探す
     */
    async findInsertionPoint() {
      console.log("🔍 Gmail AutoSend: Starting insertion point search...");
      if (!this.isComposeWindowOpen()) {
        console.log("📝 No compose window detected");
        return null;
      }
      console.log("✅ Compose window detected");
      const toolbarArea = this.findToolbarArea();
      if (toolbarArea) {
        console.log("✅ Found toolbar area");
        return toolbarArea;
      }
      const sendButtonArea = this.findSendButtonArea();
      if (sendButtonArea) {
        console.log("✅ Found send button area");
        return sendButtonArea;
      }
      const composeArea = this.findComposeArea();
      return composeArea;
    }
    /**
     * 作成ウィンドウが開いているかチェック
     */
    isComposeWindowOpen() {
      console.log("🔍 Checking for compose window...");
      const composeSelectors = [
        // 2024年現在のGmail作成ウィンドウ用セレクタ
        'div[role="dialog"][aria-label*="作成"]',
        'div[role="dialog"][aria-label*="compose"]',
        'div[role="dialog"][aria-label*="新しいメッセージ"]',
        'div[role="dialog"][aria-label*="New message"]',
        // 作成ウィンドウのツールバー
        'div[aria-label="書式設定オプション"]',
        'div[aria-label="Formatting options"]',
        // 作成ウィンドウのテキストエリア
        'div[aria-label*="メッセージ本文"]',
        'div[aria-label*="Message body"]',
        'div[contenteditable="true"][aria-label*="compose"]',
        'div[contenteditable="true"][role="textbox"]',
        // レガシーセレクタ（フォールバック）
        ".nH .if",
        "div.AD",
        'div[jscontroller][jsaction*="compose"]',
        // より一般的なダイアログ検出
        'div[role="dialog"]:has(div[contenteditable="true"])',
        'div[role="dialog"]:has(button[data-tooltip*="送信"])',
        'div[role="dialog"]:has(button[aria-label*="送信"])',
        'div[role="dialog"]:has(button[data-tooltip*="Send"])',
        'div[role="dialog"]:has(button[aria-label*="Send"])'
      ];
      for (let i = 0; i < composeSelectors.length; i++) {
        const selector = composeSelectors[i];
        try {
          const element = document.querySelector(selector);
          if (element && this.isElementVisible(element)) {
            console.log(`✅ Found compose window with selector ${i + 1}/${composeSelectors.length}: ${selector}`);
            return true;
          } else {
            console.log(`❌ Selector ${i + 1}/${composeSelectors.length} failed: ${selector}`);
          }
        } catch (error) {
          console.log(`❌ Error with selector ${i + 1}/${composeSelectors.length}: ${selector}`, error);
        }
      }
      console.log("❌ No compose window found with any selector");
      return false;
    }
    /**
     * ツールバーエリアを探す
     */
    findToolbarArea() {
      console.log("🔍 Searching for toolbar area...");
      const toolbarSelectors = [
        // 現在のGmailツールバー
        'div[aria-label="書式設定オプション"]',
        'div[aria-label="Formatting options"]',
        'div[role="toolbar"]',
        'div[role="dialog"] div[role="toolbar"]',
        // 作成ウィンドウ内のツールバー
        'div[aria-label*="メッセージ本文"] + div',
        'div[aria-label*="Message body"] + div',
        'div[contenteditable="true"] + div[role="toolbar"]',
        // レガシーセレクタ
        ".btC",
        ".gU",
        'div[jscontroller][jsaction*="toolbar"]',
        // 送信ボタン周辺
        'div:has(button[data-tooltip*="送信"])',
        'div:has(button[aria-label*="送信"])',
        'div:has(button[data-tooltip*="Send"])',
        'div:has(button[aria-label*="Send"])'
      ];
      for (let i = 0; i < toolbarSelectors.length; i++) {
        const selector = toolbarSelectors[i];
        try {
          const element = document.querySelector(selector);
          if (element && this.isElementVisible(element)) {
            console.log(`✅ Found toolbar with selector ${i + 1}/${toolbarSelectors.length}: ${selector}`);
            return element;
          } else {
            console.log(`❌ Toolbar selector ${i + 1}/${toolbarSelectors.length} failed: ${selector}`);
          }
        } catch (error) {
          console.log(`❌ Error with toolbar selector ${i + 1}/${toolbarSelectors.length}: ${selector}`, error);
        }
      }
      console.log("❌ No toolbar area found");
      return null;
    }
    /**
     * 送信ボタンエリアを探す
     */
    findSendButtonArea() {
      const sendButton = this.findSendButton();
      if (sendButton) {
        return sendButton.parentElement || sendButton;
      }
      return null;
    }
    /**
     * 作成エリアを探す
     */
    findComposeArea() {
      console.log("🔍 Searching for compose area...");
      const composeSelectors = [
        // 現在のGmail作成ダイアログ
        'div[role="dialog"][aria-label*="作成"]',
        'div[role="dialog"][aria-label*="compose"]',
        'div[role="dialog"][aria-label*="新しいメッセージ"]',
        'div[role="dialog"][aria-label*="New message"]',
        // 一般的なダイアログ
        'div[role="dialog"]',
        // レガシーセレクタ
        ".nH .if",
        "div.AD",
        // フォールバック - ページ内のメイン要素
        'div[role="main"]',
        "main",
        "body"
      ];
      for (let i = 0; i < composeSelectors.length; i++) {
        const selector = composeSelectors[i];
        try {
          const element = document.querySelector(selector);
          if (element && this.isElementVisible(element)) {
            console.log(`✅ Found compose area with selector ${i + 1}/${composeSelectors.length}: ${selector}`);
            return element;
          } else {
            console.log(`❌ Compose area selector ${i + 1}/${composeSelectors.length} failed: ${selector}`);
          }
        } catch (error) {
          console.log(`❌ Error with compose area selector ${i + 1}/${composeSelectors.length}: ${selector}`, error);
        }
      }
      console.log("❌ No compose area found");
      return null;
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
     * ボタンが既に注入されているかチェック
     */
    isButtonInjected() {
      return !!document.getElementById(_GmailAutoSendStrategy.BUTTON_ID);
    }
    /**
     * メール内容を抽出
     */
    extractMessages() {
      console.log("📧 Gmail AutoSend: Extracting email content...");
      const messages = [];
      const emailBodies = this.extractEmailBodies();
      emailBodies.forEach((body, index2) => {
        if (body.trim()) {
          messages.push({
            author: index2 === emailBodies.length - 1 ? "最新の送信者" : "過去の送信者",
            text: body.trim()
          });
        }
      });
      console.log(`📧 Extracted ${messages.length} email messages`);
      return messages.slice(-5);
    }
    /**
     * メール本文を抽出
     */
    extractEmailBodies() {
      const bodies = [];
      const messageSelectors = [
        'div[role="listitem"] div.ii.gt',
        ".message .ii.gt",
        ".gmail_quote",
        'div[dir="ltr"]'
      ];
      for (const selector of messageSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const text = element.textContent?.trim();
          if (text && text.length > 10 && text.length < 5e3) {
            bodies.push(text);
          }
        });
        if (bodies.length > 0) break;
      }
      return bodies;
    }
    /**
     * 返信処理（自動送信モーダル版）
     */
    async insertReply(text) {
      console.log("📧 Gmail AutoSend: Showing auto-send modal...");
      this.showAutoSendModal(text);
    }
    /**
     * 自動送信モーダルを表示
     */
    showAutoSendModal(text) {
      const existing = document.getElementById(_GmailAutoSendStrategy.MODAL_ID);
      if (existing) existing.remove();
      const emailInfo = this.extractEmailInfo();
      const modal = document.createElement("div");
      modal.id = _GmailAutoSendStrategy.MODAL_ID;
      modal.style.cssText = `
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
      font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
    `;
      modal.innerHTML = `
      <div style="
        background: white !important;
        border-radius: 16px !important;
        padding: 32px !important;
        max-width: 700px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
      ">
        <div style="color: #1a73e8; font-size: 28px; margin-bottom: 16px; font-weight: 500;">
          📧 Gmail自動送信
        </div>
        
        <div style="color: #5f6368; font-size: 14px; margin-bottom: 24px;">
          AI生成された返信を確認して送信してください
        </div>
        
        <div style="
          background: #f8f9fa !important;
          border: 2px solid #1a73e8 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          text-align: left !important;
        ">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px;">
            <div style="color: #5f6368; font-weight: 500;">宛先:</div>
            <div style="color: #202124;">${emailInfo.to}</div>
            <div style="color: #5f6368; font-weight: 500;">件名:</div>
            <div style="color: #202124;">${emailInfo.subject}</div>
          </div>
          
          <div style="color: #5f6368; font-size: 12px; font-weight: 500; margin-bottom: 8px;">
            📝 返信内容:
          </div>
          <textarea id="email-content" style="
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
          ">${text}</textarea>
        </div>
        
        <div style="
          background: #fef7e0 !important;
          border: 1px solid #f9ab00 !important;
          border-radius: 8px !important;
          padding: 16px !important;
          margin: 20px 0 !important;
          font-size: 13px !important;
          color: #b06000 !important;
        ">
          ⚠️ <strong>重要:</strong> この機能はGmailの送信ボタンを自動でクリックします。<br>
          内容を十分確認してから送信してください。送信後の取り消しはできません。
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button id="send-btn" style="
            background: #1a73e8 !important;
            color: white !important;
            border: none !important;
            padding: 16px 32px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            min-width: 140px !important;
          ">
            📤 送信実行
          </button>
          
          
          <button id="cancel-btn" style="
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
          ">
            ✖️ キャンセル
          </button>
        </div>
        
        <div style="
          margin-top: 24px !important;
          padding: 16px !important;
          background: #e8f0fe !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #1a73e8 !important;
          text-align: left !important;
        ">
          <strong>💡 操作手順:</strong><br>
          1. 上記の返信内容を確認・編集<br>
          2. 宛先と件名が正しいことを確認<br>
          3. 「送信実行」ボタンをクリック<br>
          4. 最終確認ダイアログで「送信」を選択
        </div>
      </div>
    `;
      document.body.appendChild(modal);
      this.setupAutoSendModalEvents(modal, emailInfo);
    }
    /**
     * メール情報を抽出
     */
    extractEmailInfo() {
      const toField = document.querySelector('input[name="to"], span[email]')?.textContent || document.querySelector("div[email]")?.getAttribute("email") || "確認できませんでした";
      const subjectField = document.querySelector('input[name="subjectbox"], input[placeholder*="件名"], input[placeholder*="Subject"]');
      const subject = subjectField?.value || document.querySelector("h2")?.textContent || "確認できませんでした";
      return {
        to: toField,
        subject
      };
    }
    /**
     * 自動送信モーダルのイベントを設定
     */
    setupAutoSendModalEvents(modal, emailInfo) {
      const textarea = modal.querySelector("#email-content");
      const sendBtn = modal.querySelector("#send-btn");
      const cancelBtn = modal.querySelector("#cancel-btn");
      sendBtn?.addEventListener("click", async () => {
        const content = textarea?.value || "";
        if (!content.trim()) {
          this.showError(sendBtn, "内容が空です");
          return;
        }
        const risks = this.validateEmailContent(content);
        if (risks.length > 0) {
          const proceed = await this.showRiskWarning(risks);
          if (!proceed) return;
        }
        const confirmed = await this.showFinalConfirmation({
          to: emailInfo.to,
          subject: emailInfo.subject,
          body: content
        });
        if (confirmed) {
          sendBtn.innerHTML = "🔄 送信中...";
          sendBtn.disabled = true;
          const success = await this.executeGmailSend(content);
          if (success) {
            sendBtn.innerHTML = "✅ 送信完了";
            sendBtn.style.background = "#34a853 !important";
            setTimeout(() => modal.remove(), 2e3);
          } else {
            this.showError(sendBtn, "送信失敗");
          }
        }
      });
      cancelBtn?.addEventListener("click", () => modal.remove());
      const escHandler = (e) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", escHandler);
        }
      };
      document.addEventListener("keydown", escHandler);
    }
    /**
     * メール内容を検証
     */
    validateEmailContent(content) {
      const risks = [];
      if (content.includes("機密") || content.includes("confidential")) {
        risks.push("機密情報が含まれている可能性があります");
      }
      if (content.length < 10) {
        risks.push("メール本文が短すぎる可能性があります");
      }
      if (!content.includes("。") && !content.includes(".")) {
        risks.push("文章が不完全な可能性があります");
      }
      return risks;
    }
    /**
     * リスク警告を表示
     */
    showRiskWarning(risks) {
      return new Promise((resolve) => {
        const warning = document.createElement("div");
        warning.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: white !important;
        border: 2px solid #ea4335 !important;
        border-radius: 12px !important;
        padding: 24px !important;
        z-index: 99999999 !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3) !important;
        max-width: 400px !important;
        text-align: center !important;
      `;
        warning.innerHTML = `
        <div style="color: #ea4335; font-size: 20px; margin-bottom: 16px; font-weight: bold;">
          ⚠️ 警告
        </div>
        <div style="margin-bottom: 16px;">
          ${risks.map((risk) => `• ${risk}`).join("<br>")}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="proceed-btn" style="background: #ea4335; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            続行
          </button>
          <button id="stop-btn" style="background: #5f6368; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            中止
          </button>
        </div>
      `;
        document.body.appendChild(warning);
        warning.querySelector("#proceed-btn")?.addEventListener("click", () => {
          warning.remove();
          resolve(true);
        });
        warning.querySelector("#stop-btn")?.addEventListener("click", () => {
          warning.remove();
          resolve(false);
        });
      });
    }
    /**
     * 最終確認ダイアログを表示
     */
    showFinalConfirmation(emailData) {
      return new Promise((resolve) => {
        const existing = document.getElementById(_GmailAutoSendStrategy.CONFIRM_MODAL_ID);
        if (existing) existing.remove();
        const confirmModal = document.createElement("div");
        confirmModal.id = _GmailAutoSendStrategy.CONFIRM_MODAL_ID;
        confirmModal.style.cssText = `
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
        confirmModal.innerHTML = `
        <div style="
          background: white !important;
          border-radius: 16px !important;
          padding: 32px !important;
          max-width: 600px !important;
          width: 90% !important;
          max-height: 70vh !important;
          overflow-y: auto !important;
          text-align: center !important;
        ">
          <div style="color: #ea4335; font-size: 24px; margin-bottom: 24px; font-weight: bold;">
            🚨 最終確認
          </div>
          
          <div style="text-align: left; margin-bottom: 24px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 12px;"><strong>宛先:</strong> ${emailData.to}</div>
            <div style="margin-bottom: 12px;"><strong>件名:</strong> ${emailData.subject}</div>
            <div style="margin-bottom: 12px;"><strong>本文:</strong></div>
            <div style="background: white; padding: 12px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 13px; line-height: 1.4;">
              ${emailData.body.replace(/\n/g, "<br>")}
            </div>
          </div>
          
          <div style="color: #d93025; font-size: 14px; margin-bottom: 24px; font-weight: 500;">
            この内容でメールを送信します。送信後の取り消しはできません。
          </div>
          
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="final-send-btn" style="
              background: #1a73e8 !important;
              color: white !important;
              border: none !important;
              padding: 16px 32px !important;
              border-radius: 8px !important;
              font-size: 16px !important;
              font-weight: bold !important;
              cursor: pointer !important;
            ">
              📤 確認しました。送信実行
            </button>
            
            <button id="final-cancel-btn" style="
              background: #5f6368 !important;
              color: white !important;
              border: none !important;
              padding: 16px 32px !important;
              border-radius: 8px !important;
              font-size: 16px !important;
              cursor: pointer !important;
            ">
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
     * Gmail送信を実行
     */
    async executeGmailSend(content) {
      try {
        console.log("📤 Executing Gmail send...");
        const success = await this.insertContentToGmail(content);
        if (!success) {
          console.log("❌ Failed to insert content");
          return false;
        }
        const sendButton = await this.findAndClickSendButton();
        if (!sendButton) {
          console.log("❌ Send button not found or click failed");
          return false;
        }
        const sent = await this.confirmSentStatus();
        console.log(sent ? "✅ Email sent successfully" : "❌ Email send confirmation failed");
        return sent;
      } catch (error) {
        console.error("❌ Gmail send execution failed:", error);
        return false;
      }
    }
    /**
     * Gmailの入力欄にコンテンツを挿入
     */
    async insertContentToGmail(content) {
      const composeBody = await this.findComposeBody();
      if (!composeBody) return false;
      try {
        composeBody.focus();
        composeBody.innerHTML = "";
        composeBody.innerHTML = content.replace(/\n/g, "<br>");
        const events = ["input", "change", "keyup"];
        events.forEach((eventType) => {
          composeBody.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        console.log("✅ Content inserted to Gmail compose body");
        return true;
      } catch (error) {
        console.error("❌ Failed to insert content:", error);
        return false;
      }
    }
    /**
     * 作成エリアの本文部分を探す
     */
    async findComposeBody() {
      const selectors = [
        'div[role="textbox"][aria-label*="compose"]',
        'div[role="textbox"][aria-label*="作成"]',
        'div[contenteditable="true"][role="textbox"]',
        "div.Am.Al.editable",
        'div[g_editable="true"]'
      ];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return element;
        }
      }
      return null;
    }
    /**
     * 送信ボタンを見つけてクリック
     */
    async findAndClickSendButton() {
      const sendButton = await this.findSendButton();
      if (!sendButton) return false;
      try {
        sendButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        sendButton.focus();
        sendButton.click();
        console.log("✅ Send button clicked");
        return true;
      } catch (error) {
        console.error("❌ Failed to click send button:", error);
        return false;
      }
    }
    /**
     * 送信ボタンを探す
     */
    async findSendButton() {
      const selectors = [
        'div[role="button"][data-tooltip*="Send"]',
        'div[role="button"][aria-label*="Send"]',
        'div[role="button"][data-tooltip*="送信"]',
        'div[role="button"][aria-label*="送信"]',
        'div[command="Send"]',
        "div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3",
        'td.gU.Up > div[role="button"]'
      ];
      return new Promise((resolve) => {
        let found = false;
        const checkForButton = () => {
          if (found) return;
          for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button && this.isValidSendButton(button)) {
              found = true;
              resolve(button);
              return;
            }
          }
        };
        checkForButton();
        if (!found) {
          const observer = new MutationObserver(() => {
            checkForButton();
            if (found) observer.disconnect();
          });
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => {
            if (!found) {
              observer.disconnect();
              resolve(null);
            }
          }, 5e3);
        }
      });
    }
    /**
     * 有効な送信ボタンかチェック
     */
    isValidSendButton(button) {
      if (!this.isElementVisible(button)) return false;
      const text = button.textContent?.toLowerCase() || "";
      const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || "";
      const tooltip = button.getAttribute("data-tooltip")?.toLowerCase() || "";
      return (text.includes("send") || text.includes("送信") || ariaLabel.includes("send") || ariaLabel.includes("送信") || tooltip.includes("send") || tooltip.includes("送信")) && !button.hasAttribute("disabled");
    }
    /**
     * 送信完了を確認
     */
    async confirmSentStatus() {
      const confirmationSelectors = [
        "div[data-message-id]",
        // 送信されたメッセージ
        'span:contains("送信済み")',
        'span:contains("Sent")',
        ".vh"
        // 送信完了通知
      ];
      return new Promise((resolve) => {
        let confirmed = false;
        const checkConfirmation = () => {
          if (confirmed) return;
          const composeOpen = this.isComposeWindowOpen();
          if (!composeOpen) {
            confirmed = true;
            resolve(true);
            return;
          }
          for (const selector of confirmationSelectors) {
            if (document.querySelector(selector)) {
              confirmed = true;
              resolve(true);
              return;
            }
          }
        };
        setTimeout(checkConfirmation, 1e3);
        const observer = new MutationObserver(checkConfirmation);
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          if (!confirmed) {
            observer.disconnect();
            resolve(false);
          }
        }, 1e4);
      });
    }
    /**
     * エラー表示
     */
    showError(button, message) {
      const originalText = button.innerHTML;
      const originalBg = button.style.background;
      button.innerHTML = `❌ ${message}`;
      button.style.background = "#ea4335 !important";
      button.disabled = true;
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = originalBg;
        button.disabled = false;
      }, 3e3);
    }
    /**
     * スレッドIDを取得
     */
    getThreadId() {
      const match = window.location.hash.match(/#.*\/([^/]+)$/);
      return match ? match[1] : null;
    }
  };
  _GmailAutoSendStrategy.BUTTON_ID = "gemini-reply-button-gmail-autosend";
  _GmailAutoSendStrategy.MODAL_ID = "gmail-autosend-modal";
  _GmailAutoSendStrategy.CONFIRM_MODAL_ID = "gmail-confirm-modal";
  let GmailAutoSendStrategy = _GmailAutoSendStrategy;
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
  class GmailContentScript {
    constructor() {
      this.strategy = null;
      this.observer = null;
      this.currentUrl = "";
      this.retryCount = 0;
      this.MAX_RETRIES = 3;
      this.RETRY_DELAY = 1e3;
      this.dragDropManager = null;
      console.log("🚀 Gmail Content Script: Initializing...");
      this.init();
      this.registerMemoryCleanup();
    }
    init() {
      console.log("📧 Gmail Content Script: Starting initialization");
      this.injectStyles();
      this.currentUrl = window.location.href;
      this.strategy = new GmailAutoSendStrategy();
      setTimeout(() => {
        this.checkAndInjectButton();
      }, 500);
      this.startObserving();
      this.startUrlMonitoring();
      window.addEventListener("beforeunload", () => this.cleanup());
    }
    injectStyles() {
      const styleId = "gemini-reply-styles-gmail";
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
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        z-index: 1000;
        position: relative;
      }
      
      .gemini-reply-button:hover {
        background: linear-gradient(135deg, #15803d, #14532d);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
      }
      
      .gemini-reply-button:disabled {
        background: #9CA3AF;
        cursor: not-allowed;
        transform: none;
      }
    `;
      (document.head || document.documentElement).appendChild(style);
    }
    async checkAndInjectButton() {
      try {
        console.log("🔍 Gmail: Starting button injection process...");
        console.log("🔍 Current URL:", window.location.href);
        console.log("🔍 Document ready state:", document.readyState);
        if (!this.strategy) {
          console.log("❌ No strategy available");
          return;
        }
        if (this.strategy.isButtonInjected()) {
          console.log("ℹ️ Button already injected");
          return;
        }
        console.log("🔍 Attempting to find insertion point...");
        const insertionPoint = await this.strategy.findInsertionPoint();
        if (insertionPoint) {
          console.log("✅ Insertion point found, injecting button...");
          console.log("✅ Insertion point element:", insertionPoint.tagName, insertionPoint.className);
          this.injectReplyButton(insertionPoint);
          this.retryCount = 0;
          console.log("🎉 Gmail button injection completed successfully!");
        } else {
          console.log(`❌ Insertion point not found (attempt ${this.retryCount + 1}/${this.MAX_RETRIES}), scheduling retry...`);
          this.scheduleRetry();
        }
      } catch (error) {
        console.error("💥 Error in Gmail checkAndInjectButton:", error);
        this.scheduleRetry();
      }
    }
    injectReplyButton(container) {
      if (!this.strategy) return;
      const buttonId = "gemini-reply-button-gmail-autosend";
      if (document.getElementById(buttonId)) {
        console.log("Button already exists, skipping injection");
        return;
      }
      const button = ButtonFactory.createServiceButton(
        "gmail",
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
        storageKey: "gmail-ai-button-position"
      });
      this.setupDragAwareClickHandler(button);
      console.log("✅ Gmail button with drag & drop injected successfully!");
    }
    /**
     * ドラッグ対応のクリックハンドラーを設定
     */
    setupDragAwareClickHandler(button) {
      button.addEventListener("click", (event) => {
        if (this.dragDropManager?.isDraggingNow()) {
          console.log("👍 Gmail: Click ignored - currently dragging");
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (this.dragDropManager?.didMove()) {
          console.log("👍 Gmail: Click ignored - just moved by drag");
          this.dragDropManager.resetMoveFlag();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        console.log("🚀 Gmail button clicked!");
        this.handleButtonClick();
      });
    }
    async handleButtonClick() {
      try {
        console.log("🚀 Gmail Button clicked, starting handleButtonClick...");
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
        if (this.strategy instanceof GmailAutoSendStrategy) {
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
        console.error("💥 Error handling Gmail button click:", error);
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
          console.log("Gmail URL changed, reinitializing...");
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
      memoryManager.registerCleanupTask("gmail-content-script", () => {
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
          console.warn("Gmail ContentScript: Error during memory cleanup:", error);
        }
        console.log("Gmail ContentScript: Cleanup completed successfully");
      } catch (error) {
        console.error("Gmail ContentScript: Error during cleanup:", error);
      }
    }
  }
  new GmailContentScript();
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
