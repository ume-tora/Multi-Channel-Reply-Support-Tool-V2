/**
 * Performance Tab for Extension Popup
 * パフォーマンス監視タブコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { performanceUtils } from '../shared/performance';
import type { PerformanceReport, AdvancedMemoryStats } from '../shared/performance';

export const PerformanceTab: React.FC = () => {
  const [memoryStats, setMemoryStats] = useState<AdvancedMemoryStats | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // データの更新
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const { memoryManager } = performanceUtils.initializeMonitoring();
      
      const [stats, report] = await Promise.all([
        memoryManager.getAdvancedMemoryStats(),
        memoryManager.collectPerformanceMetrics()
      ]);
      
      setMemoryStats(stats);
      setPerformanceReport(report);
    } catch (error) {
      console.error('Failed to refresh performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    refreshData();
  }, []);

  // パフォーマンステストの実行
  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const [quickTest, healthCheck] = await Promise.all([
        performanceUtils.runQuickPerformanceTest(),
        performanceUtils.runHealthCheck()
      ]);
      
      setTestResults({ quickTest, healthCheck });
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // メモリ使用量のカラークラス
  const getMemoryStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-error-600 bg-error-50';
    if (percentage >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  return (
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary-900">パフォーマンス監視</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          loading={isLoading}
          disabled={isLoading}
        >
          更新
        </Button>
      </div>

      {/* メモリ統計カード */}
      {memoryStats && (
        <div className="bg-white border border-secondary-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-secondary-700 mb-3">メモリ使用状況</h4>
          
          {/* メモリ使用量バー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-600">使用量</span>
              <span className={`font-medium px-2 py-1 rounded ${getMemoryStatusColor(memoryStats.percentage)}`}>
                {memoryStats.percentage}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  memoryStats.critical ? 'bg-error-500' :
                  memoryStats.warning ? 'bg-warning-500' : 'bg-success-500'
                }`}
                style={{ width: `${Math.min(memoryStats.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* 詳細メトリクス */}
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div className="bg-secondary-50 p-2 rounded">
              <div className="text-secondary-500">メモリ断片化</div>
              <div className="font-medium text-secondary-900">
                {(memoryStats.fragmentationRatio * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-secondary-50 p-2 rounded">
              <div className="text-secondary-500">アクティブ接続</div>
              <div className="font-medium text-secondary-900">
                {memoryStats.activeConnections}件
              </div>
            </div>
          </div>
        </div>
      )}

      {/* パフォーマンスサマリー */}
      {performanceReport && (
        <div className="bg-white border border-secondary-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-secondary-700 mb-3">パフォーマンス</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-blue-600">平均レスポンス</div>
              <div className="font-medium text-blue-900">
                {performanceReport.summary.avgResponseTime}ms
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-blue-600">エラー率</div>
              <div className="font-medium text-blue-900">
                {performanceReport.summary.errorRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-blue-600">総操作数</div>
              <div className="font-medium text-blue-900">
                {performanceReport.summary.totalOperations}
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-blue-600">監視期間</div>
              <div className="font-medium text-blue-900">
                {Math.round(performanceReport.duration / 60000)}分
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 警告 */}
      {performanceReport && performanceReport.warnings.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-warning-800 mb-2">⚠️ 警告</h5>
          <div className="space-y-1">
            {performanceReport.warnings.slice(0, 2).map((warning, index) => (
              <div key={index} className="text-xs text-warning-700">
                • {warning}
              </div>
            ))}
            {performanceReport.warnings.length > 2 && (
              <div className="text-xs text-warning-600">
                他 {performanceReport.warnings.length - 2} 件の警告
              </div>
            )}
          </div>
        </div>
      )}

      {/* テスト結果 */}
      {testResults && (
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-secondary-800 mb-2">🧪 テスト結果</h5>
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-secondary-600">CPU テスト</span>
              <span className="font-medium text-secondary-900">
                {testResults.quickTest.duration.toFixed(2)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">ヘルスステータス</span>
              <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                testResults.healthCheck.status === 'healthy' ? 'bg-success-100 text-success-800' :
                testResults.healthCheck.status === 'warning' ? 'bg-warning-100 text-warning-800' :
                'bg-error-100 text-error-800'
              }`}>
                {testResults.healthCheck.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={runPerformanceTest}
          loading={isLoading}
          disabled={isLoading}
          className="flex-1"
        >
          パフォーマンステスト
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const { metricsCollector } = require('../shared/performance');
            const data = metricsCollector.exportMetrics();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `metrics-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1"
        >
          エクスポート
        </Button>
      </div>

      {/* フッター */}
      <div className="text-xs text-secondary-500 text-center pt-2 border-t border-secondary-100">
        Advanced Performance Monitoring v2.0
      </div>
    </div>
  );
};