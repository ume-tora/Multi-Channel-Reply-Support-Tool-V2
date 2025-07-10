# XSS脆弱性セキュリティレビューガイド

## 🔒 概要

Multi Channel Reply Support Tool のクロスサイトスクリプティング（XSS）脆弱性の包括的セキュリティレビュー。innerHTML、dangerouslySetInnerHTML、その他の潜在的攻撃ベクターを特定・修正・防止します。

## 🎯 検出されたXSS脆弱性箇所

### 🚨 高リスク脆弱性

#### 1. UIInjector.ts - Line 117-121, 207-230
**問題**: ユーザー制御可能なデータの直接HTML挿入
```javascript
// VULNERABLE CODE:
button.innerHTML = `
  <span style="font-size: 14px;">⏳</span>
  <span>生成中...</span>
`;

content.innerHTML = `
  <div style="margin-bottom: 16px;">
    <h3>AI返信案</h3>
  </div>
  <textarea>${reply}</textarea>  // ← XSS RISK
`;
```

**攻撃例**:
```javascript
// 悪意のあるreply値
const reply = '<script>alert("XSS")</script>';
const reply2 = '<img src=x onerror=alert("XSS")>';
const reply3 = '"><script>document.location="http://evil.com"</script>';
```

**影響度**: **CRITICAL**
- 任意JavaScriptの実行
- セッション盗取
- 悪意のあるサイトへの誘導

#### 2. ButtonFactory.ts - Line 91-94
**問題**: 固定文字列でもHTML構造に問題
```javascript
// POTENTIALLY VULNERABLE:
button.innerHTML = `
  <span style="font-size: 14px;">${icon}</span>  // ← icon値が制御可能
  <span>${text}</span>                           // ← text値が制御可能
`;
```

**攻撃例**:
```javascript
const maliciousConfig = {
  icon: '<script>alert("XSS")</script>',
  text: '<img src=x onerror=alert("XSS")>'
};
```

#### 3. DragDropManager.ts - Line 71
**問題**: 信頼できる値だが構造的脆弱性
```javascript
// LOW RISK (but structurally vulnerable):
handle.innerHTML = '⋮⋮';  // 固定値だが innerHTML 使用
```

## ⚠️ 中リスク脆弱性

### DOM操作関連

#### 1. 動的CSS挿入
複数ファイルでstyle.cssTextによる動的CSS挿入が確認されています:
```javascript
// Potentially dangerous if user input is involved:
element.style.cssText = userControlledValue;
```

#### 2. Event Handler文字列実行
現在は検出されていませんが、将来的なリスク要因:
```javascript
// DANGEROUS PATTERNS (not currently found):
setTimeout(userInput, 1000);  // String as code
setInterval(userInput, 1000); // String as code
eval(userInput);              // Direct code execution
```

## 🛠️ 修正実装

### 安全なHTML操作パターン

#### 1. UIInjector.ts の修正
```javascript
// BEFORE (Vulnerable):
button.innerHTML = `
  <span style="font-size: 14px;">⏳</span>
  <span>生成中...</span>
`;

// AFTER (Secure):
button.textContent = ''; // Clear existing content
const iconSpan = document.createElement('span');
iconSpan.style.fontSize = '14px';
iconSpan.textContent = '⏳';

const textSpan = document.createElement('span');
textSpan.textContent = '生成中...';

button.appendChild(iconSpan);
button.appendChild(textSpan);
```

#### 2. モーダル作成の修正
```javascript
// BEFORE (Vulnerable):
content.innerHTML = `
  <textarea>${reply}</textarea>
`;

// AFTER (Secure):
const createSecureModal = (reply: string, strategy: ServiceStrategy): HTMLElement => {
  const modal = document.createElement('div');
  modal.className = 'gemini-modal-backdrop';
  
  // CSS styling via style object (safer)
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const content = document.createElement('div');
  content.className = 'gemini-modal-content';
  
  // Create elements securely
  const title = document.createElement('h3');
  title.textContent = 'AI返信案';
  title.style.margin = '0';
  title.style.fontSize = '18px';
  
  const label = document.createElement('label');
  label.textContent = '生成された返信案';
  
  const textarea = document.createElement('textarea');
  textarea.id = 'reply-textarea';
  textarea.value = reply; // Safe assignment
  textarea.style.width = '100%';
  textarea.style.height = '120px';
  
  content.appendChild(title);
  content.appendChild(label);
  content.appendChild(textarea);
  modal.appendChild(content);
  
  return modal;
};
```

#### 3. ButtonFactory.ts の修正
```javascript
// BEFORE (Potentially vulnerable):
button.innerHTML = `
  <span style="font-size: 14px;">${icon}</span>
  <span>${text}</span>
`;

// AFTER (Secure):
static createAIButtonSecure(config: AIButtonConfig = {}): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = config.id || 'ai-reply-button';
  button.className = config.className || 'gemini-reply-button';
  button.title = config.title || 'AI返信案を生成';

  // Create icon span securely
  const iconSpan = document.createElement('span');
  iconSpan.style.fontSize = '14px';
  iconSpan.textContent = config.icon || '🤖';

  // Create text span securely
  const textSpan = document.createElement('span');
  textSpan.textContent = config.text || 'AI返信';

  button.appendChild(iconSpan);
  button.appendChild(textSpan);

  return button;
}
```

## 🛡️ セキュリティ強化策

### 1. HTMLサニタイゼーション関数
```javascript
/**
 * 安全なHTMLサニタイゼーション
 */
class HTMLSanitizer {
  /**
   * テキストをHTMLエスケープ
   */
  static escapeHTML(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 限定的なHTMLタグのみ許可
   */
  static sanitizeHTML(input: string): string {
    // 許可するタグのホワイトリスト
    const allowedTags = ['b', 'i', 'u', 'br', 'p'];
    const allowedTagsRegex = new RegExp(`<(\/?)(?:${allowedTags.join('|')})(\\s[^>]*)?>`, 'gi');
    
    // 許可されていないタグを除去
    return input.replace(/<[^>]*>/g, (match) => {
      return allowedTagsRegex.test(match) ? match : '';
    });
  }

  /**
   * 完全にテキストのみ抽出
   */
  static stripAllHTML(input: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = input;
    return temp.textContent || temp.innerText || '';
  }
}
```

### 2. 安全なDOM操作ヘルパー
```javascript
/**
 * 安全なDOM操作ユーティリティ
 */
class SafeDOM {
  /**
   * 安全な要素作成
   */
  static createElement(
    tagName: string, 
    options: {
      className?: string;
      id?: string;
      textContent?: string;
      attributes?: Record<string, string>;
      styles?: Record<string, string>;
    } = {}
  ): HTMLElement {
    const element = document.createElement(tagName);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.id) {
      element.id = options.id;
    }
    
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    if (options.styles) {
      Object.entries(options.styles).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
    }
    
    return element;
  }

  /**
   * 安全なテキスト設定
   */
  static setTextContent(element: HTMLElement, text: string): void {
    element.textContent = text;
  }

  /**
   * 安全な属性設定
   */
  static setAttribute(element: HTMLElement, name: string, value: string): void {
    // 危険な属性をブロック
    const dangerousAttributes = ['onclick', 'onload', 'onerror', 'onmouseover'];
    if (dangerousAttributes.includes(name.toLowerCase())) {
      console.warn(`Blocked dangerous attribute: ${name}`);
      return;
    }
    
    element.setAttribute(name, value);
  }
}
```

### 3. Content Security Policy強化
```javascript
// manifest.json の CSP強化
{
  "content_security_policy": {
    "extension_pages": [
      "script-src 'self';",
      "object-src 'none';",
      "connect-src 'self' https://generativelanguage.googleapis.com;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data:;",
      "frame-src 'none';",
      "base-uri 'self';"
    ].join(" ")
  }
}
```

## 🔍 セキュリティテスト実装

### 1. XSS自動テストスクリプト
```javascript
/**
 * XSS脆弱性自動テストスクリプト
 */
class XSSVulnerabilityTester {
  constructor() {
    this.testPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      '<svg onload=alert("XSS")>',
      '<iframe src=javascript:alert("XSS")>',
      '<object data="javascript:alert(\'XSS\')">',
      '<embed src="javascript:alert(\'XSS\')">',
      '<link rel=stylesheet href="javascript:alert(\'XSS\')">',
      '<style>@import"javascript:alert(\'XSS\')"</style>'
    ];
  }

  /**
   * 全体XSSテスト実行
   */
  async runComprehensiveXSSTest() {
    console.log('🔒 Starting comprehensive XSS vulnerability test...');
    
    const results = {
      vulnerabilities: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    // 1. innerHTML使用箇所テスト
    await this.testInnerHTMLVulnerabilities(results);
    
    // 2. 動的コンテンツ注入テスト
    await this.testDynamicContentInjection(results);
    
    // 3. イベントハンドラー注入テスト
    await this.testEventHandlerInjection(results);
    
    // 4. CSS注入テスト
    await this.testCSSInjection(results);
    
    return this.generateXSSReport(results);
  }

  /**
   * innerHTML使用箇所のテスト
   */
  async testInnerHTMLVulnerabilities(results) {
    console.log('🧪 Testing innerHTML vulnerabilities...');
    
    for (const payload of this.testPayloads) {
      results.totalTests++;
      
      try {
        // UIInjectorのモーダル作成テスト
        const testModal = this.createTestModal(payload);
        
        if (this.detectXSSExecution(testModal)) {
          results.vulnerabilities.push({
            type: 'innerHTML injection',
            payload: payload,
            location: 'UIInjector.createModal',
            severity: 'HIGH'
          });
          results.failedTests++;
        } else {
          results.passedTests++;
        }
        
        // テスト要素クリーンアップ
        if (testModal.parentNode) {
          testModal.parentNode.removeChild(testModal);
        }
        
      } catch (error) {
        console.error('Test error:', error);
        results.failedTests++;
      }
    }
  }

  /**
   * テスト用モーダル作成
   */
  createTestModal(replyText) {
    const modal = document.createElement('div');
    const content = document.createElement('div');
    
    // 脆弱な実装をシミュレート
    content.innerHTML = `
      <textarea>${replyText}</textarea>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    return modal;
  }

  /**
   * XSS実行検出
   */
  detectXSSExecution(element) {
    // スクリプトタグの存在確認
    const scripts = element.querySelectorAll('script');
    if (scripts.length > 0) {
      return true;
    }
    
    // イベントハンドラー属性確認
    const dangerousElements = element.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]');
    if (dangerousElements.length > 0) {
      return true;
    }
    
    // javascript: プロトコル確認
    const jsProtocol = element.innerHTML.includes('javascript:');
    if (jsProtocol) {
      return true;
    }
    
    return false;
  }

  /**
   * レポート生成
   */
  generateXSSReport(results) {
    const report = {
      summary: {
        totalTests: results.totalTests,
        passed: results.passedTests,
        failed: results.failedTests,
        vulnerabilities: results.vulnerabilities.length,
        securityStatus: results.vulnerabilities.length === 0 ? 'SECURE' : 'VULNERABLE'
      },
      vulnerabilities: results.vulnerabilities,
      recommendations: this.generateRecommendations(results.vulnerabilities)
    };
    
    console.log('🔒 XSS Security Report:', report);
    return report;
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations(vulnerabilities) {
    const recommendations = [];
    
    if (vulnerabilities.some(v => v.type === 'innerHTML injection')) {
      recommendations.push('Replace innerHTML with textContent or createElement methods');
      recommendations.push('Implement HTML sanitization for user inputs');
    }
    
    if (vulnerabilities.length > 0) {
      recommendations.push('Implement Content Security Policy (CSP) headers');
      recommendations.push('Use DOM-based XSS protection libraries');
      recommendations.push('Regular security code reviews');
    }
    
    return recommendations;
  }
}
```

### 2. セキュリティ監査チェックリスト
```javascript
/**
 * セキュリティ監査チェックリスト
 */
const XSS_SECURITY_CHECKLIST = {
  codeReview: [
    '✓ すべてのinnerHTML使用箇所を確認',
    '✓ ユーザー入力の適切なサニタイゼーション',
    '✓ 動的HTMLコンテンツの安全な生成',
    '✓ イベントハンドラーの適切な設定',
    '✓ CSS注入攻撃への対策'
  ],
  
  implementation: [
    '✓ HTMLSanitizerクラスの導入',
    '✓ SafeDOMヘルパーの使用',
    '✓ textContentの優先使用',
    '✓ createElement()による安全な要素作成',
    '✓ 属性値の適切なエスケープ'
  ],
  
  testing: [
    '✓ XSS自動テストの実行',
    '✓ ペネトレーションテストの実施',
    '✓ セキュリティスキャンの定期実行',
    '✓ 脆弱性データベースの確認',
    '✓ 第三者セキュリティ監査'
  ],
  
  deployment: [
    '✓ Content Security Policyの強化',
    '✓ HTTPヘッダーセキュリティ設定',
    '✓ セキュリティログ監視',
    '✓ インシデント対応計画',
    '✓ 定期的なセキュリティ更新'
  ]
};
```

## 📋 修正優先度と実装計画

### フェーズ1: 緊急修正（即座実施）
1. **UIInjector.ts innerHTML修正** - CRITICAL
2. **ButtonFactory.ts 安全な要素作成** - HIGH
3. **HTMLSanitizerクラス実装** - HIGH

### フェーズ2: セキュリティ強化（1週間以内）
1. **SafeDOMヘルパー実装**
2. **XSS自動テスト導入**
3. **CSP強化**

### フェーズ3: 継続監視（継続実施）
1. **定期セキュリティスキャン**
2. **セキュリティ監査プロセス**
3. **開発者セキュリティトレーニング**

## 🚀 実装例

実際の修正を以下のファイルで実施：

### 1. HTMLSanitizer実装
```bash
src/shared/security/HTMLSanitizer.ts
```

### 2. SafeDOM実装
```bash
src/shared/security/SafeDOM.ts
```

### 3. XSSテスト実装
```bash
src/security-tests/xss-vulnerability-test.js
```

---

**🔒 定期的なXSSセキュリティレビューにより、堅牢で安全な拡張機能を維持しましょう！**