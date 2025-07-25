/**
 * Advanced Metrics Collector for Chrome Extension Performance Monitoring
 * Gemini推奨のパフォーマンス監視機能実装
 */

import type { ServiceType } from '../types';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | '%';
  timestamp: number;
  service?: ServiceType;
  context?: string;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    avgResponseTime: number;
    memoryUsage: number;
    errorRate: number;
    totalOperations: number;
  };
  warnings: string[];
  recommendations: string[];
}

export interface PerformanceThresholds {
  maxResponseTime: number; // ms
  maxMemoryUsage: number; // %
  maxErrorRate: number; // %
  warningMemoryUsage: number; // %
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: PerformanceMetric[] = [];
  private operations: Map<string, number> = new Map(); // operation name -> start time
  private errors: number = 0;
  private totalRequests: number = 0;
  
  // デフォルトしきい値
  private thresholds: PerformanceThresholds = {
    maxResponseTime: 3000, // 3秒
    maxMemoryUsage: 90, // 90%
    maxErrorRate: 5, // 5%
    warningMemoryUsage: 70 // 70%
  };

  private readonly MAX_METRICS = 1000; // メモリ制限のためメトリクス数を制限

  private constructor() {
    this.initializeWebVitalsTracking();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * パフォーマンスメトリクスを記録
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // メトリクス数制限（メモリ節約のため）
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS / 2); // 半分に削減
    }

    // リアルタイム警告チェック
    this.checkThresholds(fullMetric);
  }

  /**
   * 操作の開始を記録
   */
  startOperation(operationName: string): void {
    this.operations.set(operationName, performance.now());
  }

  /**
   * 操作の終了を記録し、レスポンス時間を測定
   */
  endOperation(operationName: string, service?: ServiceType, context?: string): number {
    const startTime = this.operations.get(operationName);
    if (!startTime) {
      console.warn(`MetricsCollector: Operation ${operationName} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.operations.delete(operationName);
    this.totalRequests++;

    this.recordMetric({
      name: `${operationName}_duration`,
      value: duration,
      unit: 'ms',
      service,
      context
    });

    return duration;
  }

  /**
   * エラーを記録
   */
  recordError(errorType: string, service?: ServiceType, context?: string): void {
    this.errors++;
    this.recordMetric({
      name: 'error',
      value: 1,
      unit: 'count',
      service,
      context: `${errorType}${context ? ` - ${context}` : ''}`
    });
  }

  /**
   * メモリ使用量を記録
   */
  async recordMemoryUsage(context?: string): Promise<void> {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          const percentage = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

          this.recordMetric({
            name: 'memory_used',
            value: usedMB,
            unit: 'bytes',
            context
          });

          this.recordMetric({
            name: 'memory_percentage',
            value: percentage,
            unit: '%',
            context
          });
        }
      }
    } catch (error) {
      console.warn('MetricsCollector: Failed to record memory usage:', error);
    }
  }

  /**
   * API呼び出しの測定開始
   */
  startApiCall(apiName: string, service: ServiceType): void {
    this.startOperation(`api_${apiName}_${service}`);
  }

  /**
   * API呼び出しの測定終了
   */
  endApiCall(apiName: string, service: ServiceType, success: boolean = true): number {
    const duration = this.endOperation(`api_${apiName}_${service}`, service, 'api_call');
    
    if (!success) {
      this.recordError('api_error', service, apiName);
    }

    return duration;
  }

  /**
   * 包括的なパフォーマンスレポートを生成
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);

    // レスポンス時間の分析
    const responseTimes = recentMetrics
      .filter(m => m.name.endsWith('_duration'))
      .map(m => m.value);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // メモリ使用量の分析
    const memoryMetrics = recentMetrics.filter(m => m.name === 'memory_percentage');
    const currentMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0;

    // エラー率の計算
    const recentErrors = recentMetrics.filter(m => m.name === 'error').length;
    const errorRate = this.totalRequests > 0 ? (recentErrors / this.totalRequests) * 100 : 0;

    // 警告とリコメンデーション生成
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (avgResponseTime > this.thresholds.maxResponseTime) {
      warnings.push(`高い平均レスポンス時間: ${Math.round(avgResponseTime)}ms`);
      recommendations.push('API呼び出しの最適化とキャッシュ戦略の見直しを検討してください');
    }

    if (currentMemoryUsage > this.thresholds.warningMemoryUsage) {
      warnings.push(`高いメモリ使用量: ${currentMemoryUsage}%`);
      recommendations.push('メモリリークの確認とcleanup処理の強化を検討してください');
    }

    if (errorRate > this.thresholds.maxErrorRate) {
      warnings.push(`高いエラー率: ${errorRate.toFixed(1)}%`);
      recommendations.push('エラーハンドリングの改善とリトライロジックの追加を検討してください');
    }

    // Web Vitalsの追加
    await this.recordWebVitals();

    return {
      timestamp: now,
      duration: 60 * 60 * 1000, // 1時間
      metrics: recentMetrics,
      summary: {
        avgResponseTime: Math.round(avgResponseTime),
        memoryUsage: currentMemoryUsage,
        errorRate: Math.round(errorRate * 100) / 100,
        totalOperations: this.totalRequests
      },
      warnings,
      recommendations
    };
  }

  /**
   * しきい値設定の更新
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * しきい値チェック
   */
  private checkThresholds(metric: PerformanceMetric): void {
    if (metric.name.endsWith('_duration') && metric.value > this.thresholds.maxResponseTime) {
      console.warn(`MetricsCollector: Slow operation detected: ${metric.name} took ${metric.value}ms`);
    }

    if (metric.name === 'memory_percentage' && metric.value > this.thresholds.warningMemoryUsage) {
      console.warn(`MetricsCollector: High memory usage: ${metric.value}%`);
    }
  }

  /**
   * Web Vitalsの初期化
   */
  private initializeWebVitalsTracking(): void {
    // FCP (First Contentful Paint) の測定
    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric({
              name: 'web_vitals_fcp',
              value: entry.startTime,
              unit: 'ms',
              context: 'web_vitals'
            });
          }
        }
      }).observe({ entryTypes: ['paint'] });

      // LCP (Largest Contentful Paint) の測定
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric({
            name: 'web_vitals_lcp',
            value: lastEntry.startTime,
            unit: 'ms',
            context: 'web_vitals'
          });
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

    } catch (error) {
      console.warn('MetricsCollector: Web Vitals tracking not supported:', error);
    }
  }

  /**
   * Web Vitalsの記録
   */
  private async recordWebVitals(): Promise<void> {
    try {
      // Navigation Timing APIを使用
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        this.recordMetric({
          name: 'web_vitals_ttfb',
          value: navTiming.responseStart - navTiming.requestStart,
          unit: 'ms',
          context: 'web_vitals'
        });

        this.recordMetric({
          name: 'web_vitals_dom_load',
          value: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          unit: 'ms',
          context: 'web_vitals'
        });
      }
    } catch (error) {
      console.warn('MetricsCollector: Failed to record web vitals:', error);
    }
  }

  /**
   * メトリクスをJSONでエクスポート
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: {
        totalMetrics: this.metrics.length,
        totalRequests: this.totalRequests,
        totalErrors: this.errors,
        thresholds: this.thresholds
      }
    }, null, 2);
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics(): void {
    this.metrics = [];
    this.operations.clear();
    this.errors = 0;
    this.totalRequests = 0;
  }

  /**
   * インスタンスを破棄
   */
  destroy(): void {
    this.clearMetrics();
    MetricsCollector.instance = null;
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();