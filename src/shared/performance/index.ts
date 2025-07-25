/**
 * Performance Monitoring Module - Entry Point
 * パフォーマンス監視機能の統合エクスポート
 */

// Core Performance Classes
export { MemoryManager } from './MemoryManager';
export { AdvancedMemoryManager, advancedMemoryManager } from './AdvancedMemoryManager';
export { MetricsCollector, metricsCollector } from './MetricsCollector';

// React Components
export { PerformanceDashboard } from './PerformanceDashboard';

// Types
export type { 
  MemoryStats, 
  CleanupTask 
} from './MemoryManager';

export type { 
  AdvancedMemoryStats, 
  MemoryLeakDetection, 
  PerformanceAlert 
} from './AdvancedMemoryManager';

export type { 
  PerformanceMetric, 
  PerformanceReport, 
  PerformanceThresholds 
} from './MetricsCollector';

// Utility Functions
export const performanceUtils = {
  /**
   * パフォーマンス監視を初期化
   */
  initializeMonitoring: () => {
    const memoryManager = advancedMemoryManager;
    const metrics = metricsCollector;
    
    console.log('🚀 Performance monitoring initialized');
    
    return {
      memoryManager,
      metrics,
      cleanup: () => {
        memoryManager.destroy();
        metrics.destroy();
      }
    };
  },

  /**
   * 簡易パフォーマンステスト
   */
  runQuickPerformanceTest: async () => {
    const metrics = metricsCollector;
    
    console.log('🧪 Running quick performance test...');
    
    // CPU集約的なタスクをシミュレート
    metrics.startOperation('performance_test');
    
    const start = performance.now();
    
    // 計算処理をシミュレート
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random() * Math.sin(i);
    }
    
    const duration = metrics.endOperation('performance_test', undefined, 'cpu_intensive');
    
    // メモリ使用量を記録
    await metrics.recordMemoryUsage('performance_test');
    
    console.log(`✅ Performance test completed in ${duration.toFixed(2)}ms`);
    
    return {
      duration,
      result,
      memoryUsage: await advancedMemoryManager.getAdvancedMemoryStats()
    };
  },

  /**
   * メモリリークテスト
   */
  runMemoryLeakTest: async () => {
    console.log('🔍 Running memory leak test...');
    
    const manager = advancedMemoryManager;
    
    // 意図的にメモリを消費
    const testData: any[] = [];
    for (let i = 0; i < 1000; i++) {
      testData.push(new Array(1000).fill(`test-data-${i}`));
    }
    
    // リーク検出を実行
    const leakDetection = await manager.detectMemoryLeaks();
    
    // テストデータをクリア
    testData.length = 0;
    
    console.log('📊 Memory leak test results:', leakDetection);
    
    return leakDetection;
  },

  /**
   * 包括的なヘルスチェック
   */
  runHealthCheck: async () => {
    console.log('🏥 Running comprehensive health check...');
    
    const results = {
      timestamp: Date.now(),
      memory: await advancedMemoryManager.getAdvancedMemoryStats(),
      performance: await advancedMemoryManager.collectPerformanceMetrics(),
      leakDetection: await advancedMemoryManager.detectMemoryLeaks(),
      status: 'healthy' as 'healthy' | 'warning' | 'critical'
    };
    
    // 健康状態の判定
    if (results.memory.critical || results.performance.summary.errorRate > 10) {
      results.status = 'critical';
    } else if (results.memory.warning || results.performance.warnings.length > 0) {
      results.status = 'warning';
    }
    
    console.log(`💊 Health check completed - Status: ${results.status}`);
    
    return results;
  }
};