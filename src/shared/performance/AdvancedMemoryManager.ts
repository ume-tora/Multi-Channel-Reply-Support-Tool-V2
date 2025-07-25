/**
 * Advanced Memory Manager - Gemini推奨の拡張版
 * 包括的なパフォーマンス監視機能を提供
 */

import { MemoryManager, type MemoryStats, type CleanupTask } from './MemoryManager';
import { MetricsCollector, type PerformanceReport } from './MetricsCollector';
import type { ServiceType } from '../types';

export interface AdvancedMemoryStats extends MemoryStats {
  heapSizeLimit: number;
  fragmentationRatio: number;
  gcPressure: number;
  cacheSize: number;
  activeConnections: number;
}

export interface MemoryLeakDetection {
  detected: boolean;
  suspiciousObjects: string[];
  growthRate: number; // bytes per minute
  recommendations: string[];
}

export interface PerformanceAlert {
  type: 'memory' | 'performance' | 'error' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  service?: ServiceType;
  action?: () => void;
}

export class AdvancedMemoryManager extends MemoryManager {
  private static advancedInstance: AdvancedMemoryManager;
  private metricsCollector: MetricsCollector;
  private memoryHistory: MemoryStats[] = [];
  private alertHandlers: Map<string, (alert: PerformanceAlert) => void> = new Map();
  private resourceTracking: Map<string, number> = new Map(); // resource name -> size
  private activeConnections: Set<string> = new Set();
  
  // Advanced thresholds
  private readonly MEMORY_LEAK_THRESHOLD = 5; // MB per minute growth
  private readonly FRAGMENTATION_THRESHOLD = 0.3; // 30% fragmentation
  private readonly GC_PRESSURE_THRESHOLD = 10; // GC events per minute
  
  private constructor() {
    super();
    this.metricsCollector = MetricsCollector.getInstance();
    this.initializeAdvancedMonitoring();
  }

  static getInstance(): AdvancedMemoryManager {
    if (!AdvancedMemoryManager.advancedInstance) {
      AdvancedMemoryManager.advancedInstance = new AdvancedMemoryManager();
    }
    return AdvancedMemoryManager.advancedInstance;
  }

  /**
   * 高度なメモリ統計を取得
   */
  async getAdvancedMemoryStats(): Promise<AdvancedMemoryStats> {
    const baseStats = await super.getMemoryStats();
    
    try {
      const memory = (performance as any).memory;
      const cacheSize = await this.calculateCacheSize();
      
      const fragmentationRatio = memory ? 
        (memory.totalJSHeapSize - memory.usedJSHeapSize) / memory.totalJSHeapSize : 0;
      
      const gcPressure = this.calculateGCPressure();

      const advancedStats: AdvancedMemoryStats = {
        ...baseStats,
        heapSizeLimit: memory?.jsHeapSizeLimit || 0,
        fragmentationRatio,
        gcPressure,
        cacheSize,
        activeConnections: this.activeConnections.size
      };

      // メモリ履歴に追加（最新20件を保持）
      this.memoryHistory.push(baseStats);
      if (this.memoryHistory.length > 20) {
        this.memoryHistory.shift();
      }

      // メトリクス記録
      this.metricsCollector.recordMetric({
        name: 'advanced_memory_stats',
        value: advancedStats.percentage,
        unit: '%',
        context: 'advanced_monitoring'
      });

      return advancedStats;
      
    } catch (error) {
      console.warn('AdvancedMemoryManager: Error getting advanced stats:', error);
      return {
        ...baseStats,
        heapSizeLimit: 0,
        fragmentationRatio: 0,
        gcPressure: 0,
        cacheSize: 0,
        activeConnections: 0
      };
    }
  }

  /**
   * メモリリーク検出
   */
  async detectMemoryLeaks(): Promise<MemoryLeakDetection> {
    if (this.memoryHistory.length < 5) {
      return {
        detected: false,
        suspiciousObjects: [],
        growthRate: 0,
        recommendations: []
      };
    }

    const recent = this.memoryHistory.slice(-5);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    // 成長率を計算（MB/分）
    const timeDiff = (newest.percentage - oldest.percentage) / recent.length; // 簡易計算
    const growthRate = timeDiff * 60; // 分あたりの成長率

    const detected = Math.abs(growthRate) > this.MEMORY_LEAK_THRESHOLD;
    
    const suspiciousObjects: string[] = [];
    const recommendations: string[] = [];

    // Always check for suspicious objects regardless of growth rate for testing
    if (this.activeConnections.size > 10) {
      suspiciousObjects.push('WebSocket/HTTP connections');
      recommendations.push('アクティブな接続数を確認し、不要な接続を閉じてください');
    }

    const cacheSize = await this.calculateCacheSize();
    if (cacheSize > 50) { // 50MB以上
      suspiciousObjects.push('Cache objects');
      recommendations.push('キャッシュサイズを監視し、定期的にクリアしてください');
    }

    if (this.resourceTracking.size > 100) {
      suspiciousObjects.push('Tracked resources');
      recommendations.push('リソーストラッキングを見直し、不要なリソースを解放してください');
    }

    if (detected || suspiciousObjects.length > 0) {
      recommendations.push('chrome://extensions/ でメモリ使用量を確認してください');
      recommendations.push('開発者ツールのMemoryタブでヒープスナップショットを取得してください');
    }

    return {
      detected: detected || suspiciousObjects.length > 0,
      suspiciousObjects,
      growthRate,
      recommendations
    };
  }

  /**
   * 包括的なパフォーマンスレポートを生成
   */
  async collectPerformanceMetrics(): Promise<PerformanceReport> {
    // メモリ統計を記録
    await this.metricsCollector.recordMemoryUsage('performance_report');
    
    // メモリリーク検出を実行
    const leakDetection = await this.detectMemoryLeaks();
    
    // 基本的なパフォーマンスレポートを取得
    const baseReport = await this.metricsCollector.generatePerformanceReport();
    
    // 高度な分析を追加
    const advancedStats = await this.getAdvancedMemoryStats();
    
    // 追加の警告とリコメンデーション
    const additionalWarnings: string[] = [];
    const additionalRecommendations: string[] = [];

    if (leakDetection.detected) {
      additionalWarnings.push(`メモリリークの疑い: ${leakDetection.growthRate.toFixed(2)} MB/分の成長`);
      additionalRecommendations.push(...leakDetection.recommendations);
    }

    if (advancedStats.fragmentationRatio > this.FRAGMENTATION_THRESHOLD) {
      additionalWarnings.push(`高いメモリ断片化: ${(advancedStats.fragmentationRatio * 100).toFixed(1)}%`);
      additionalRecommendations.push('メモリ断片化を減らすため、大きなオブジェクトの使用を見直してください');
    }

    if (advancedStats.gcPressure > this.GC_PRESSURE_THRESHOLD) {
      additionalWarnings.push(`高いGCプレッシャー: ${advancedStats.gcPressure} events/分`);
      additionalRecommendations.push('オブジェクト生成を最適化し、GCプレッシャーを軽減してください');
    }

    return {
      ...baseReport,
      warnings: [...baseReport.warnings, ...additionalWarnings],
      recommendations: [...baseReport.recommendations, ...additionalRecommendations],
      metrics: [
        ...baseReport.metrics,
        {
          name: 'memory_leak_growth_rate',
          value: leakDetection.growthRate,
          unit: 'bytes',
          timestamp: Date.now(),
          context: 'leak_detection'
        },
        {
          name: 'memory_fragmentation',
          value: advancedStats.fragmentationRatio * 100,
          unit: '%',
          timestamp: Date.now(),
          context: 'advanced_stats'
        }
      ]
    };
  }

  /**
   * リソースの追跡開始
   */
  trackResource(resourceId: string, size: number, type: string): void {
    this.resourceTracking.set(resourceId, size);
    
    this.metricsCollector.recordMetric({
      name: 'resource_allocated',
      value: size,
      unit: 'bytes',
      context: `resource_${type}`
    });
  }

  /**
   * リソースの追跡終了
   */
  untrackResource(resourceId: string, type: string): void {
    const size = this.resourceTracking.get(resourceId);
    if (size) {
      this.resourceTracking.delete(resourceId);
      
      this.metricsCollector.recordMetric({
        name: 'resource_deallocated',
        value: size,
        unit: 'bytes',
        context: `resource_${type}`
      });
    }
  }

  /**
   * 接続の追跡
   */
  trackConnection(connectionId: string): void {
    this.activeConnections.add(connectionId);
  }

  /**
   * 接続の追跡終了
   */
  untrackConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
  }

  /**
   * アラートハンドラーの登録
   */
  onAlert(handlerId: string, handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.set(handlerId, handler);
  }

  /**
   * アラートハンドラーの削除
   */
  offAlert(handlerId: string): void {
    this.alertHandlers.delete(handlerId);
  }

  /**
   * アラートの発火
   */
  private emitAlert(alert: PerformanceAlert): void {
    console.warn(`AdvancedMemoryManager Alert [${alert.severity}]:`, alert.message);
    
    for (const handler of this.alertHandlers.values()) {
      try {
        handler(alert);
      } catch (error) {
        console.error('AdvancedMemoryManager: Alert handler error:', error);
      }
    }
  }

  /**
   * 高度な監視の初期化
   */
  private initializeAdvancedMonitoring(): void {
    // 定期的なメモリチェック（5分間隔）
    setInterval(async () => {
      try {
        const stats = await this.getAdvancedMemoryStats();
        
        // 閾値チェックとアラート
        if (stats.critical) {
          this.emitAlert({
            type: 'memory',
            severity: 'critical',
            message: `クリティカルなメモリ使用量: ${stats.percentage}%`,
            timestamp: Date.now(),
            action: () => this.forceCleanup()
          });
        } else if (stats.warning) {
          this.emitAlert({
            type: 'memory',
            severity: 'medium',
            message: `高いメモリ使用量: ${stats.percentage}%`,
            timestamp: Date.now()
          });
        }

        // メモリリーク検出
        const leakDetection = await this.detectMemoryLeaks();
        if (leakDetection.detected) {
          this.emitAlert({
            type: 'memory',
            severity: 'high',
            message: `メモリリークの疑い: ${leakDetection.growthRate.toFixed(2)} MB/分`,
            timestamp: Date.now(),
            action: () => this.investigateMemoryLeak()
          });
        }
        
      } catch (error) {
        console.error('AdvancedMemoryManager: Monitoring error:', error);
      }
    }, 5 * 60 * 1000); // 5分間隔
  }

  /**
   * キャッシュサイズの計算
   */
  private async calculateCacheSize(): Promise<number> {
    try {
      const { ChromeStorageManager } = await import('../storage/ChromeStorageManager');
      const cacheKeys = await chrome.storage.local.get(null);
      
      const cacheEntries = Object.keys(cacheKeys).filter(key => key.startsWith('cache_'));
      let totalSize = 0;
      
      for (const key of cacheEntries) {
        const value = cacheKeys[key];
        totalSize += JSON.stringify(value).length;
      }
      
      return Math.round(totalSize / 1024 / 1024); // MB
    } catch (error) {
      console.warn('AdvancedMemoryManager: Failed to calculate cache size:', error);
      return 0;
    }
  }

  /**
   * GCプレッシャーの計算
   */
  private calculateGCPressure(): number {
    // 簡易実装: メモリ使用量の変動からGCプレッシャーを推定
    if (this.memoryHistory.length < 3) return 0;
    
    const recent = this.memoryHistory.slice(-3);
    let gcEvents = 0;
    
    for (let i = 1; i < recent.length; i++) {
      // メモリ使用量が大幅に減った場合をGCイベントと仮定
      if (recent[i-1].used - recent[i].used > 10 * 1024 * 1024) { // 10MB以上の減少
        gcEvents++;
      }
    }
    
    return gcEvents * 20; // 分あたりに換算（簡易計算）
  }

  /**
   * メモリリーク調査
   */
  private async investigateMemoryLeak(): Promise<void> {
    console.log('AdvancedMemoryManager: Starting memory leak investigation...');
    
    // 詳細なメモリダンプを試行
    try {
      const stats = await this.getAdvancedMemoryStats();
      console.log('Memory Stats:', stats);
      
      console.log('Active Resources:', this.resourceTracking.size);
      console.log('Active Connections:', this.activeConnections.size);
      
      // 大きなリソースを特定
      const largeResources = Array.from(this.resourceTracking.entries())
        .filter(([_, size]) => size > 1024 * 1024) // 1MB以上
        .sort(([_, a], [__, b]) => b - a);
      
      if (largeResources.length > 0) {
        console.log('Large Resources:', largeResources.slice(0, 5));
      }
      
    } catch (error) {
      console.error('AdvancedMemoryManager: Investigation failed:', error);
    }
  }

  /**
   * リソースクリーンアップ
   */
  cleanup(): void {
    super.cleanup();
    this.memoryHistory = [];
    this.resourceTracking.clear();
    this.activeConnections.clear();
    this.alertHandlers.clear();
  }

  /**
   * インスタンスの破棄
   */
  destroy(): void {
    this.cleanup();
    this.metricsCollector.destroy();
    AdvancedMemoryManager.advancedInstance = null;
  }
}

// Export singleton instance
export const advancedMemoryManager = AdvancedMemoryManager.getInstance();