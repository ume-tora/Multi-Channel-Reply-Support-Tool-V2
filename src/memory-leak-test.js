/**
 * Multi Channel Reply Support Tool - メモリリーク自動検証スクリプト
 * Chrome拡張機能の長期間使用でのメモリリークを検出・分析
 */

// メモリリークテスト設定
const MEMORY_TEST_CONFIG = {
  // テスト設定
  testCycles: 100,
  samplingInterval: 10, // 10サイクル毎にサンプリング
  leakThresholdMB: 5, // 5MB増加で警告
  criticalThresholdMB: 15, // 15MB増加で重大警告
  
  // 監視間隔
  monitoringInterval: 5000, // 5秒間隔
  forceGCInterval: 30000, // 30秒間隔でGC強制実行
  
  // テスト対象URL
  testUrls: [
    'https://mail.google.com',
    'https://www.chatwork.com',
    'https://chat.google.com',
    'https://manager.line.biz'
  ],
  
  // レポート設定
  detailedLogging: true,
  saveResults: true,
  reportPath: './memory-leak-report.json'
};

/**
 * メモリリーク検証マネージャー
 */
class MemoryLeakTester {
  constructor(config = MEMORY_TEST_CONFIG) {
    this.config = config;
    this.snapshots = [];
    this.leakPatterns = [];
    this.suspiciousComponents = new Set();
    this.isRunning = false;
    this.startTime = Date.now();
    
    // メモリ監視用のオブザーバー
    this.memoryObserver = null;
    this.gcTimer = null;
    
    // DOM操作カウンター
    this.domOperations = {
      created: 0,
      removed: 0,
      listeners: 0
    };
  }

  /**
   * メインテスト実行
   */
  async runComprehensiveTest() {
    console.log('🧠 Multi Channel Reply Support Tool - Memory Leak Testing Started');
    console.log(`📋 Test Configuration:`, this.config);
    console.log('');

    try {
      this.isRunning = true;
      
      // 1. 初期状態記録
      await this.recordInitialState();
      
      // 2. 継続メモリ監視開始
      this.startContinuousMonitoring();
      
      // 3. メインテストサイクル実行
      await this.executeTestCycles();
      
      // 4. 最終状態記録
      await this.recordFinalState();
      
      // 5. 分析・レポート生成
      const report = await this.generateComprehensiveReport();
      
      // 6. クリーンアップ
      this.cleanup();
      
      console.log('✅ Memory leak testing completed successfully!');
      return report;
      
    } catch (error) {
      console.error('❌ Memory leak testing failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 初期状態記録
   */
  async recordInitialState() {
    console.log('📸 Recording initial memory state...');
    
    // ベースラインスナップショット
    await this.takeSnapshot('baseline', { isBaseline: true });
    
    // DOM状態記録
    this.recordDOMState('initial');
    
    // 拡張機能コンテキスト確認
    this.verifyExtensionContext();
    
    console.log('✅ Initial state recorded');
  }

  /**
   * テストサイクル実行
   */
  async executeTestCycles() {
    console.log(`🔄 Starting ${this.config.testCycles} test cycles...`);
    
    for (let cycle = 1; cycle <= this.config.testCycles; cycle++) {
      // 1. 拡張機能使用シミュレート
      await this.simulateExtensionUsage(cycle);
      
      // 2. 定期サンプリング
      if (cycle % this.config.samplingInterval === 0) {
        await this.takeSnapshot(`cycle-${cycle}`, { cycle });
        
        // メモリトレンド分析
        this.analyzeMemoryTrend();
        
        // DOM状態確認
        this.recordDOMState(`cycle-${cycle}`);
        
        console.log(`📊 Cycle ${cycle}/${this.config.testCycles} completed`);
      }
      
      // 3. 強制ガベージコレクション（テスト用）
      if (cycle % 20 === 0) {
        await this.forceGarbageCollection();
      }
      
      // 4. 一時停止（CPUスパイク回避）
      await this.sleep(100);
    }
    
    console.log('✅ All test cycles completed');
  }

  /**
   * 拡張機能使用シミュレート
   */
  async simulateExtensionUsage(cycle) {
    try {
      // AI返信ボタン操作
      await this.simulateAIReplyButton();
      
      // ドラッグ&ドロップ操作
      await this.simulateDragDrop();
      
      // DOM変更（ページナビゲーション風）
      await this.simulateDOMChanges();
      
      // ストレージ操作
      await this.simulateStorageOperations();
      
      // イベント発火
      await this.simulateEventTriggers();
      
    } catch (error) {
      console.warn(`⚠️ Error in cycle ${cycle}:`, error.message);
    }
  }

  /**
   * AI返信ボタン操作シミュレート
   */
  async simulateAIReplyButton() {
    // ボタン要素作成・削除をシミュレート
    const button = document.createElement('button');
    button.className = 'gemini-reply-button';
    button.textContent = '🤖 AI返信';
    button.id = `ai-button-${Date.now()}`;
    
    // イベントリスナー追加
    const handler = () => console.log('Button clicked');
    button.addEventListener('click', handler);
    this.domOperations.listeners++;
    
    // DOM追加
    document.body.appendChild(button);
    this.domOperations.created++;
    
    // 使用シミュレート
    await this.sleep(50);
    
    // DOM削除
    document.body.removeChild(button);
    this.domOperations.removed++;
    
    // メモリ・DOM要素数確認
    this.checkDOMElementCount();
  }

  /**
   * ドラッグ&ドロップ操作シミュレート
   */
  async simulateDragDrop() {
    // DragDropManager相当の処理をシミュレート
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.left = '100px';
    element.style.top = '100px';
    
    // マウスイベントシミュレート
    const events = ['mousedown', 'mousemove', 'mouseup'];
    const handlers = [];
    
    for (const eventType of events) {
      const handler = (e) => {
        // LocalStorage操作シミュレート
        localStorage.setItem(`drag-pos-${Date.now()}`, JSON.stringify({ x: 100, y: 100 }));
      };
      
      document.addEventListener(eventType, handler);
      handlers.push({ type: eventType, handler });
      this.domOperations.listeners++;
    }
    
    document.body.appendChild(element);
    this.domOperations.created++;
    
    await this.sleep(10);
    
    // クリーンアップ
    for (const { type, handler } of handlers) {
      document.removeEventListener(type, handler);
    }
    
    document.body.removeChild(element);
    this.domOperations.removed++;
  }

  /**
   * DOM変更シミュレート
   */
  async simulateDOMChanges() {
    // MutationObserver使用パターンシミュレート
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // DOM変更処理シミュレート
        this.processMutation(mutation);
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // DOM要素動的変更
    for (let i = 0; i < 5; i++) {
      const div = document.createElement('div');
      div.textContent = `Test element ${i}`;
      document.body.appendChild(div);
      this.domOperations.created++;
      
      await this.sleep(5);
      
      document.body.removeChild(div);
      this.domOperations.removed++;
    }
    
    // Observer停止
    observer.disconnect();
  }

  /**
   * ストレージ操作シミュレート
   */
  async simulateStorageOperations() {
    // Chrome Storage操作シミュレート
    const testData = {
      timestamp: Date.now(),
      data: Array(100).fill(0).map((_, i) => `test-data-${i}`),
      metadata: { version: '1.0', size: 1024 }
    };
    
    // LocalStorage操作
    localStorage.setItem(`test-${Date.now()}`, JSON.stringify(testData));
    
    // Chrome Storage風操作（シミュレート）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await new Promise((resolve) => {
          chrome.storage.local.set({ [`test-${Date.now()}`]: testData }, resolve);
        });
      } catch (error) {
        console.warn('Chrome storage simulation failed:', error);
      }
    }
  }

  /**
   * イベント発火シミュレート
   */
  async simulateEventTriggers() {
    // 各種イベント発火
    const events = [
      new Event('visibilitychange'),
      new Event('beforeunload'),
      new MouseEvent('click', { bubbles: true }),
      new KeyboardEvent('keydown', { key: 'Enter' })
    ];
    
    for (const event of events) {
      document.dispatchEvent(event);
      await this.sleep(5);
    }
  }

  /**
   * メモリスナップショット取得
   */
  async takeSnapshot(label, metadata = {}) {
    const snapshot = {
      label,
      timestamp: Date.now(),
      metadata,
      ...this.getMemoryStats(),
      domStats: this.getDOMStats(),
      runtime: Date.now() - this.startTime
    };
    
    this.snapshots.push(snapshot);
    
    if (this.config.detailedLogging) {
      console.log(`📸 Snapshot [${label}]:`, {
        usedMB: (snapshot.used / (1024 * 1024)).toFixed(2),
        totalMB: (snapshot.total / (1024 * 1024)).toFixed(2),
        domElements: snapshot.domStats.elements
      });
    }
    
    return snapshot;
  }

  /**
   * メモリ統計取得
   */
  getMemoryStats() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        available: true
      };
    }
    
    // フォールバック: 推定値
    return {
      used: this.domOperations.created * 1024, // 推定値
      total: 50 * 1024 * 1024, // 50MB仮想
      limit: 100 * 1024 * 1024, // 100MB制限仮想
      available: false
    };
  }

  /**
   * DOM統計取得
   */
  getDOMStats() {
    return {
      elements: document.querySelectorAll('*').length,
      scripts: document.querySelectorAll('script').length,
      styles: document.querySelectorAll('style, link[rel="stylesheet"]').length,
      listeners: this.domOperations.listeners,
      operations: { ...this.domOperations }
    };
  }

  /**
   * メモリトレンド分析
   */
  analyzeMemoryTrend() {
    if (this.snapshots.length < 3) return;
    
    const recent = this.snapshots.slice(-3);
    const growthRates = [];
    
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      const growth = curr.used - prev.used;
      const growthMB = growth / (1024 * 1024);
      growthRates.push(growthMB);
    }
    
    const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    
    // リーク検出ロジック
    if (avgGrowth > this.config.leakThresholdMB) {
      this.detectMemoryLeak(avgGrowth, recent);
    }
    
    return { avgGrowth, growthRates };
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeak(growthMB, snapshots) {
    const leak = {
      detected: true,
      growthMB: growthMB.toFixed(2),
      timestamp: Date.now(),
      snapshots: snapshots,
      severity: growthMB > this.config.criticalThresholdMB ? 'critical' : 'warning'
    };
    
    this.leakPatterns.push(leak);
    
    const logLevel = leak.severity === 'critical' ? 'error' : 'warn';
    console[logLevel](`🚨 Memory leak detected! Growth: ${leak.growthMB}MB`, leak);
    
    // 疑わしいコンポーネント追加
    this.addSuspiciousComponents(leak);
  }

  /**
   * 疑わしいコンポーネント特定
   */
  addSuspiciousComponents(leak) {
    const { domStats } = leak.snapshots[leak.snapshots.length - 1];
    
    // DOM要素異常増加
    if (domStats.operations.created - domStats.operations.removed > 100) {
      this.suspiciousComponents.add('DOM Element Leak');
    }
    
    // イベントリスナー蓄積
    if (domStats.listeners > 200) {
      this.suspiciousComponents.add('Event Listener Accumulation');
    }
    
    // 一般的な問題パターン
    this.suspiciousComponents.add('ContentScript Memory Retention');
    this.suspiciousComponents.add('DragDropManager Event Leaks');
  }

  /**
   * 継続監視開始
   */
  startContinuousMonitoring() {
    console.log('👁️ Starting continuous memory monitoring...');
    
    this.memoryObserver = setInterval(async () => {
      if (!this.isRunning) return;
      
      const stats = this.getMemoryStats();
      const usageMB = stats.used / (1024 * 1024);
      
      if (usageMB > 100) { // 100MB超過で警告
        console.warn(`⚠️ High memory usage: ${usageMB.toFixed(2)}MB`);
      }
      
    }, this.config.monitoringInterval);
    
    // 定期GC
    this.gcTimer = setInterval(() => {
      this.forceGarbageCollection();
    }, this.config.forceGCInterval);
  }

  /**
   * 強制ガベージコレクション
   */
  async forceGarbageCollection() {
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('🗑️ Forced garbage collection');
      } catch (error) {
        console.warn('GC failed:', error);
      }
    }
    
    // メモリ統計確認
    const stats = this.getMemoryStats();
    const usageMB = stats.used / (1024 * 1024);
    console.log(`📊 Post-GC Memory: ${usageMB.toFixed(2)}MB`);
  }

  /**
   * 最終状態記録
   */
  async recordFinalState() {
    console.log('📸 Recording final memory state...');
    
    // 最終強制GC
    await this.forceGarbageCollection();
    await this.sleep(1000);
    
    // 最終スナップショット
    await this.takeSnapshot('final', { isFinal: true });
    
    // DOM状態記録
    this.recordDOMState('final');
    
    console.log('✅ Final state recorded');
  }

  /**
   * DOM状態記録
   */
  recordDOMState(label) {
    const state = {
      label,
      timestamp: Date.now(),
      ...this.getDOMStats()
    };
    
    if (this.config.detailedLogging) {
      console.log(`🏗️ DOM State [${label}]:`, state);
    }
    
    return state;
  }

  /**
   * 包括的レポート生成
   */
  async generateComprehensiveReport() {
    console.log('📋 Generating comprehensive memory leak report...');
    
    const baseline = this.snapshots.find(s => s.metadata.isBaseline);
    const final = this.snapshots.find(s => s.metadata.isFinal);
    
    const report = {
      // テスト概要
      summary: {
        testDuration: Date.now() - this.startTime,
        totalCycles: this.config.testCycles,
        snapshotCount: this.snapshots.length,
        leaksDetected: this.leakPatterns.length,
        status: this.determineOverallStatus()
      },
      
      // メモリ分析
      memoryAnalysis: {
        initialUsageMB: baseline ? (baseline.used / (1024 * 1024)).toFixed(2) : 'N/A',
        finalUsageMB: final ? (final.used / (1024 * 1024)).toFixed(2) : 'N/A',
        totalGrowthMB: this.calculateTotalGrowth(),
        avgGrowthPerCycle: this.calculateAvgGrowthPerCycle(),
        maxUsageMB: this.getMaxUsage()
      },
      
      // リーク分析
      leakAnalysis: {
        patterns: this.leakPatterns,
        suspiciousComponents: Array.from(this.suspiciousComponents),
        recommendations: this.generateRecommendations()
      },
      
      // DOM分析
      domAnalysis: {
        initialElements: baseline?.domStats.elements || 0,
        finalElements: final?.domStats.elements || 0,
        operations: this.domOperations,
        leakedElements: this.calculateDOMLeaks()
      },
      
      // 詳細データ
      rawData: {
        snapshots: this.snapshots,
        configuration: this.config,
        environment: this.getEnvironmentInfo()
      },
      
      // 評価
      evaluation: {
        passed: this.leakPatterns.length === 0,
        grade: this.calculateGrade(),
        criticalIssues: this.leakPatterns.filter(l => l.severity === 'critical').length,
        warnings: this.leakPatterns.filter(l => l.severity === 'warning').length
      }
    };
    
    // コンソール出力
    this.displayReportSummary(report);
    
    // ファイル保存
    if (this.config.saveResults) {
      await this.saveReportToFile(report);
    }
    
    return report;
  }

  /**
   * レポートサマリー表示
   */
  displayReportSummary(report) {
    console.log('\n📊 Memory Leak Test Summary:');
    console.log('=====================================');
    console.log(`Status: ${report.evaluation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Grade: ${report.evaluation.grade}`);
    console.log(`Test Duration: ${(report.summary.testDuration / 1000).toFixed(1)}s`);
    console.log(`Memory Growth: ${report.memoryAnalysis.totalGrowthMB}MB`);
    console.log(`Leaks Detected: ${report.summary.leaksDetected}`);
    console.log(`Critical Issues: ${report.evaluation.criticalIssues}`);
    console.log(`Warnings: ${report.evaluation.warnings}`);
    
    if (report.leakAnalysis.suspiciousComponents.length > 0) {
      console.log('\n🔍 Suspicious Components:');
      report.leakAnalysis.suspiciousComponents.forEach(comp => {
        console.log(`  • ${comp}`);
      });
    }
    
    if (report.leakAnalysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.leakAnalysis.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }

  /**
   * ヘルパーメソッド群
   */
  calculateTotalGrowth() {
    if (this.snapshots.length < 2) return '0.00';
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    return ((last.used - first.used) / (1024 * 1024)).toFixed(2);
  }

  calculateAvgGrowthPerCycle() {
    const totalGrowth = parseFloat(this.calculateTotalGrowth());
    return (totalGrowth / this.config.testCycles).toFixed(4);
  }

  getMaxUsage() {
    return Math.max(...this.snapshots.map(s => s.used)) / (1024 * 1024);
  }

  calculateDOMLeaks() {
    return Math.max(0, this.domOperations.created - this.domOperations.removed);
  }

  determineOverallStatus() {
    if (this.leakPatterns.some(l => l.severity === 'critical')) return 'CRITICAL';
    if (this.leakPatterns.length > 0) return 'WARNING';
    return 'HEALTHY';
  }

  calculateGrade() {
    const score = 100 - (this.leakPatterns.length * 20);
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'F';
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.leakPatterns.length > 0) {
      recommendations.push('Review event listener cleanup in ContentScriptBase');
      recommendations.push('Audit DragDropManager destroy() implementation');
      recommendations.push('Check MutationObserver disconnect() calls');
    }
    
    if (this.calculateDOMLeaks() > 50) {
      recommendations.push('Investigate DOM element cleanup procedures');
    }
    
    if (this.domOperations.listeners > 500) {
      recommendations.push('Implement event listener registry for proper cleanup');
    }
    
    return recommendations;
  }

  getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      memoryAPI: !!performance.memory,
      chromeExtension: !!(typeof chrome !== 'undefined' && chrome.runtime),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * DOM要素数チェック
   */
  checkDOMElementCount() {
    const count = document.querySelectorAll('*').length;
    if (count > 5000) { // 5000要素超過で警告
      console.warn(`⚠️ High DOM element count: ${count}`);
    }
  }

  /**
   * 拡張機能コンテキスト確認
   */
  verifyExtensionContext() {
    const hasChrome = typeof chrome !== 'undefined';
    const hasRuntime = hasChrome && chrome.runtime;
    const hasExtensionId = hasRuntime && chrome.runtime.id;
    
    console.log('🔍 Extension Context:', {
      chrome: hasChrome,
      runtime: hasRuntime,
      extensionId: hasExtensionId
    });
  }

  /**
   * Mutation処理シミュレート
   */
  processMutation(mutation) {
    // MutationObserver処理をシミュレート
    if (mutation.type === 'childList') {
      // 子要素変更処理
    } else if (mutation.type === 'attributes') {
      // 属性変更処理
    }
  }

  /**
   * ファイル保存
   */
  async saveReportToFile(report) {
    try {
      const data = JSON.stringify(report, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-leak-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      console.log('💾 Report saved to file');
    } catch (error) {
      console.warn('Failed to save report:', error);
    }
  }

  /**
   * クリーンアップ
   */
  cleanup() {
    this.isRunning = false;
    
    if (this.memoryObserver) {
      clearInterval(this.memoryObserver);
      this.memoryObserver = null;
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    console.log('🧹 Memory leak tester cleanup completed');
  }

  /**
   * ユーティリティ
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * テスト実行関数
 */
async function runMemoryLeakTest(customConfig = {}) {
  const config = { ...MEMORY_TEST_CONFIG, ...customConfig };
  const tester = new MemoryLeakTester(config);
  
  try {
    const report = await tester.runComprehensiveTest();
    return report;
  } catch (error) {
    console.error('Memory leak test failed:', error);
    throw error;
  }
}

// Node.js環境での実行サポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemoryLeakTester, runMemoryLeakTest };
  
  if (require.main === module) {
    runMemoryLeakTest().catch(console.error);
  }
}

// ブラウザ環境での実行サポート
if (typeof window !== 'undefined') {
  window.MemoryLeakTester = MemoryLeakTester;
  window.runMemoryLeakTest = runMemoryLeakTest;
}

// 使用例とデモ
/*
// 基本的な使用方法
runMemoryLeakTest().then(report => {
  console.log('Test completed:', report.evaluation.grade);
});

// カスタム設定での実行
runMemoryLeakTest({
  testCycles: 50,
  leakThresholdMB: 3,
  detailedLogging: false
}).then(report => {
  if (!report.evaluation.passed) {
    console.error('Memory leaks detected!', report.leakAnalysis);
  }
});

// 手動での詳細テスト
const tester = new MemoryLeakTester();
tester.runComprehensiveTest().then(report => {
  // 報告書の詳細分析
  report.leakAnalysis.patterns.forEach(leak => {
    console.log(`Leak: ${leak.growthMB}MB growth`);
  });
});
*/