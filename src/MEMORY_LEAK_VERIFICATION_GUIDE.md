# メモリリーク検証ガイド

## 🔍 概要

Multi Channel Reply Support Tool のメモリリーク検証プロセス。Chrome DevToolsを使用して、長時間使用時のメモリ増加を監視し、潜在的なリークを特定・修正します。

## 🎯 検証対象コンポーネント

### 高リスクコンポーネント
1. **ContentScriptBase.ts**: イベントリスナー、MutationObserver、setInterval
2. **DragDropManager.ts**: DOM イベントリスナー、LocalStorage操作
3. **MemoryManager.ts**: クリーンアップタスク管理、イベントリスナー
4. **Background Service Worker**: 長時間実行される永続化プロセス
5. **各サービス固有スクリプト**: Gmail、Chatwork、Google Chat、LINE

### メモリリーク発生可能性
- ✅ **低リスク**: 適切なクリーンアップ実装済み
- ⚠️ **中リスク**: 一部クリーンアップが不完全
- ❌ **高リスク**: クリーンアップ未実装

## 📊 Step 1: ベースライン測定

### 1.1 初期メモリ状態記録
```javascript
// Chrome DevTools → Memory タブ
1. 拡張機能インストール後、Chrome再起動
2. 新しいタブで任意のページを開く
3. "Take heap snapshot" でベースライン取得
4. スナップショット名: "baseline-initial"

初期メモリ使用量目標:
- JS Heap Used: < 10MB
- Total Heap Size: < 20MB
- Extension Memory: < 5MB
```

### 1.2 拡張機能無効時の比較
```javascript
// 比較基準値取得
1. chrome://extensions/ で拡張機能無効化
2. Chrome再起動
3. 同一サイトで "Take heap snapshot"
4. スナップショット名: "baseline-disabled"

差分分析:
- 拡張機能による純粋なメモリ使用量を算出
- バックグラウンドプロセスの影響確認
```

## 🔄 Step 2: 操作サイクルテスト

### 2.1 反復操作シナリオ
```javascript
// Gmail操作サイクル (100回反復)
for (let i = 0; i < 100; i++) {
  1. Gmail でメールスレッドを開く
  2. "🤖 AI返信" ボタンをクリック
  3. 返信生成を待つ (3秒)
  4. 生成された返信をコピー
  5. ページを再読み込み
  6. 2分待機
}

記録ポイント:
- 10回目: "snapshot-gmail-10cycles"
- 50回目: "snapshot-gmail-50cycles"  
- 100回目: "snapshot-gmail-100cycles"
```

### 2.2 複数サービス横断テスト
```javascript
// サービス間切り替えテスト (50回反復)
services = ['Gmail', 'Chatwork', 'Google Chat', 'LINE']

for (let i = 0; i < 50; i++) {
  for (service in services) {
    1. サービスにアクセス
    2. AI返信ボタン使用
    3. ドラッグ&ドロップ操作
    4. タブを閉じる
    5. 1分待機
  }
}

記録ポイント:
- 10サイクル目: "snapshot-multiservice-10"
- 25サイクル目: "snapshot-multiservice-25"
- 50サイクル目: "snapshot-multiservice-50"
```

## 🛠️ Step 3: Memory タブ詳細分析

### 3.1 Heap Snapshot比較
```javascript
// スナップショット比較手順
1. Memory タブで最新スナップショットを選択
2. "Comparison" ドロップダウンでベースラインと比較
3. "Delta" カラムで増加量確認

警告閾値:
- JS Objects数: +1000個以上
- Retained Size: +5MB以上
- Shallow Size: +2MB以上
```

### 3.2 オブジェクト種別分析
```javascript
// メモリ増加の内訳確認
重点チェック項目:
├── HTMLElement: DOM要素の未解放
├── EventListener: イベントリスナーの蓄積
├── Timer: setInterval/setTimeout未クリア
├── Closure: クロージャによる参照保持
├── Array/Object: データ構造の肥大化
└── String: 文字列キャッシュの増大

実際の漏れパターン:
- "HTMLDivElement": ボタン要素の重複生成
- "MutationObserver": Observer未disconnect
- "Function": イベントハンドラー未削除
```

### 3.3 Retained Objects分析
```javascript
// 参照保持されているオブジェクト特定
1. 疑わしいオブジェクトを選択
2. "Retainers" パネルで参照元確認
3. 不適切な参照保持パターンを特定

よくある問題:
- Window → ContentScript → DOM要素
- EventTarget → Handler → Large Object
- Closure → Outer Scope → Heavy Data
```

## ⚡ Step 4: Performance プロファイリング

### 4.1 Timeline分析
```javascript
// Performance タブでの長期間監視
1. Performance タブで "Record" 開始
2. 拡張機能を30分間継続使用
3. 記録停止して "Memory" セクション確認

監視指標:
- JS Heap: 右肩上がりでないか
- DOM Nodes: 増加し続けていないか
- Event Listeners: 蓄積していないか
- GPU Memory: 異常な増加がないか
```

### 4.2 ガベージコレクション効率
```javascript
// GC実行タイミング分析
記録中に確認:
├── Major GC頻度: 5-10分間隔が正常
├── Minor GC効率: 80%以上の回収率
├── GC実行時間: 100ms以下
└── Post-GC Memory: 定期的な減少

異常パターン:
- GC後もメモリが減らない
- GC頻度が異常に高い
- GC実行時間が長時間
```

## 🔍 Step 5: 特定コンポーネントの詳細検証

### 5.1 ContentScriptBase検証
```javascript
// content-scripts/base/ContentScriptBase.ts の問題箇所

潜在的リーク箇所:
1. Line 106-114: urlCheckInterval
   問題: setInterval未クリア（一部ケース）
   検証: clearInterval呼び出し確認

2. Line 87-101: MutationObserver
   問題: observer.disconnect()漏れ
   検証: DOM切り替え時のdisconnect確認

3. Line 196-204: イベントリスナー
   問題: addEventListener未削除
   検証: removeEventListener呼び出し確認

検証コマンド:
console.log('Active Intervals:', window.setInterval.length);
console.log('DOM Observers:', document.observers?.length);
```

### 5.2 DragDropManager検証
```javascript
// shared/ui/DragDropManager.ts の問題箇所

潜在的リーク箇所:
1. Line 105-112: イベントリスナー
   問題: document-levelリスナー未削除
   検証: destroy()メソッド実装不完全

2. Line 290-296: localStorage操作
   問題: 大量データ蓄積
   検証: ストレージサイズ監視

改善提案:
private eventHandlers = new Map();
// イベントハンドラー参照保持で確実削除
```

### 5.3 MemoryManager検証
```javascript
// shared/performance/MemoryManager.ts の問題箇所

設計上の問題:
1. Singleton パターン: 解放困難
2. Line 162-165: passive監視
   改善: 明示的リスナー削除実装

メモリ監視:
const manager = MemoryManager.getInstance();
setInterval(() => {
  const stats = await manager.getMemoryStats();
  console.log('Memory:', stats);
}, 10000);
```

## 🚨 Step 6: 自動検証スクリプト

### 6.1 メモリリーク検出スクリプト
```javascript
// memory-leak-detector.js
class MemoryLeakDetector {
  constructor() {
    this.snapshots = [];
    this.alertThreshold = 10; // 10MB増加で警告
  }

  async takeSnapshot(label) {
    if (!performance.memory) {
      console.warn('Memory API not available');
      return null;
    }

    const snapshot = {
      label,
      timestamp: Date.now(),
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };

    this.snapshots.push(snapshot);
    console.log(`📸 Snapshot [${label}]:`, snapshot);
    
    if (this.snapshots.length > 1) {
      this.analyzeLeakTrend();
    }
    
    return snapshot;
  }

  analyzeLeakTrend() {
    const recent = this.snapshots.slice(-5); // 直近5回
    const growth = recent.map((s, i) => 
      i > 0 ? s.used - recent[i-1].used : 0
    ).slice(1);

    const avgGrowth = growth.reduce((a, b) => a + b, 0) / growth.length;
    const growthMB = avgGrowth / (1024 * 1024);

    console.log(`📈 Average Growth: ${growthMB.toFixed(2)} MB`);
    
    if (growthMB > this.alertThreshold) {
      console.error('🚨 MEMORY LEAK DETECTED!');
      this.generateLeakReport();
    }
  }

  generateLeakReport() {
    const report = {
      detected: true,
      samples: this.snapshots.length,
      timespan: Date.now() - this.snapshots[0].timestamp,
      totalGrowth: (this.snapshots[this.snapshots.length-1].used - this.snapshots[0].used) / (1024 * 1024),
      suspiciousComponents: this.getSuspiciousComponents()
    };
    
    console.table(report);
    return report;
  }

  getSuspiciousComponents() {
    // 実際の実装では、タイミングベースで推測
    return [
      'ContentScriptBase intervals',
      'DragDropManager listeners', 
      'MutationObserver accumulation'
    ];
  }

  async runAutomatedTest(cycles = 50) {
    await this.takeSnapshot('test-start');
    
    for (let i = 1; i <= cycles; i++) {
      // 拡張機能操作シミュレート
      await this.simulateExtensionUsage();
      
      if (i % 10 === 0) {
        await this.takeSnapshot(`cycle-${i}`);
        
        // 強制GC（可能であれば）
        if (window.gc) window.gc();
      }
    }
    
    await this.takeSnapshot('test-end');
    return this.generateLeakReport();
  }

  async simulateExtensionUsage() {
    // AI返信ボタンクリック
    const button = document.querySelector('.gemini-reply-button');
    if (button) {
      button.click();
      await this.sleep(1000);
    }
    
    // DOM変更トリガー
    const div = document.createElement('div');
    document.body.appendChild(div);
    document.body.removeChild(div);
    
    await this.sleep(100);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用例
const detector = new MemoryLeakDetector();
detector.runAutomatedTest(100).then(report => {
  console.log('Final Report:', report);
});
```

## 📋 Step 7: 修正パターンと予防策

### 7.1 よくあるメモリリーク修正
```javascript
// パターン1: イベントリスナー適切削除
class ComponentWithListeners {
  private handlers = new Map<string, EventListener>();

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.handlers.set(`${element.id}-${event}`, { element, event, handler });
  }

  destroy() {
    for (const [key, { element, event, handler }] of this.handlers) {
      element.removeEventListener(event, handler);
    }
    this.handlers.clear();
  }
}

// パターン2: 循環参照回避
class NoCircularRef {
  constructor() {
    this.data = new WeakMap(); // 循環参照を自動解決
  }
}

// パターン3: タイマー適切管理
class TimerManager {
  private timers = new Set<number>();

  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.timers.add(id);
    return id;
  }

  clearAll() {
    for (const id of this.timers) {
      clearInterval(id);
    }
    this.timers.clear();
  }
}
```

### 7.2 予防的実装パターン
```javascript
// WeakMap/WeakSet使用で自動解放
const elementData = new WeakMap();
const activeElements = new WeakSet();

// AbortController for 一括イベント削除
const controller = new AbortController();
element.addEventListener('click', handler, { 
  signal: controller.signal 
});
// controller.abort(); で一括削除

// IntersectionObserver适切管理
class ObserverManager {
  private observers = new Set<IntersectionObserver>();

  createObserver(callback, options) {
    const observer = new IntersectionObserver(callback, options);
    this.observers.add(observer);
    return observer;
  }

  destroyAll() {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}
```

## ⚠️ Step 8: 監視・アラート設定

### 8.1 継続監視設定
```javascript
// 本番環境でのメモリ監視
class ProductionMemoryMonitor {
  constructor() {
    this.checkInterval = setInterval(this.checkMemory.bind(this), 300000); // 5分間隔
  }

  async checkMemory() {
    if (!performance.memory) return;

    const memory = performance.memory;
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
    const usage = (usedMB / limitMB) * 100;

    if (usage > 80) {
      console.warn(`High memory usage: ${usage.toFixed(1)}%`);
      this.triggerCleanup();
    }

    if (usage > 95) {
      console.error(`Critical memory usage: ${usage.toFixed(1)}%`);
      this.emergencyCleanup();
    }
  }

  triggerCleanup() {
    // MemoryManager経由でクリーンアップ
    import('./shared/performance/MemoryManager').then(({ memoryManager }) => {
      memoryManager.forceCleanup();
    });
  }

  emergencyCleanup() {
    // 緊急時のより積極的なクリーンアップ
    this.triggerCleanup();
    
    // キャッシュクリア
    if ('storage' in chrome) {
      chrome.storage.local.clear();
    }
  }
}
```

### 8.2 ユーザーへの通知機能
```javascript
// メモリ不足時のユーザー通知
function notifyMemoryIssue(severity) {
  const notifications = {
    warning: '⚠️ Memory usage is high. Performance may be affected.',
    critical: '🚨 Critical memory usage detected. Please restart your browser.'
  };

  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Multi Channel Reply Support Tool',
      message: notifications[severity]
    });
  }
}
```

## 📊 検証結果評価基準

### 合格基準
- **メモリ増加**: 1時間使用で +10MB以下
- **GC効率**: 80%以上の回収率維持
- **リーク検出**: 自動テストでリーク検出なし
- **応答性**: メモリ不足による遅延なし

### 改善要求基準
- **メモリ増加**: 1時間使用で +10-20MB
- **GC効率**: 60-80%の回収率
- **軽微なリーク**: 局所的なメモリリーク
- **軽微な遅延**: 使用体験に影響しない範囲

### 不合格基準
- **メモリ増加**: 1時間使用で +20MB以上
- **GC効率**: 60%未満の回収率
- **重大なリーク**: 明確なメモリリーク検出
- **応答性劣化**: ユーザー体験に明確な影響

---

**🧠 定期的なメモリリーク検証により、長期間快適にご利用いただけます！**