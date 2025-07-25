/**
 * Performance Dashboard Component
 * リアルタイムパフォーマンス監視UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { advancedMemoryManager } from './AdvancedMemoryManager';
import { metricsCollector } from './MetricsCollector';
import type { PerformanceReport, PerformanceAlert, AdvancedMemoryStats } from './AdvancedMemoryManager';
import { cn } from '../utils/cn';

interface PerformanceDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 30000 // 30秒
}) => {
  const [memoryStats, setMemoryStats] = useState<AdvancedMemoryStats | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // データ更新関数
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stats, report] = await Promise.all([
        advancedMemoryManager.getAdvancedMemoryStats(),
        advancedMemoryManager.collectPerformanceMetrics()
      ]);
      
      setMemoryStats(stats);
      setPerformanceReport(report);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('PerformanceDashboard: Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期データ読み込み
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // アラート監視
  useEffect(() => {
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // 最新10件を保持
    };

    advancedMemoryManager.onAlert('dashboard', handleAlert);
    return () => advancedMemoryManager.offAlert('dashboard');
  }, []);

  // メモリ使用量のカラークラス
  const getMemoryColorClass = (percentage: number) => {
    if (percentage >= 90) return 'text-error-600 bg-error-50';
    if (percentage >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  // アラート重要度のカラークラス
  const getAlertColorClass = (severity: PerformanceAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-error-100 border-error-300 text-error-800';
      case 'high': return 'bg-error-50 border-error-200 text-error-700';
      case 'medium': return 'bg-warning-50 border-warning-200 text-warning-700';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  // メトリクスカードコンポーネント
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    unit?: string;
    status?: 'good' | 'warning' | 'critical';
    description?: string;
  }> = ({ title, value, unit, status = 'good', description }) => {
    const statusColors = {
      good: 'border-success-200 bg-success-50',
      warning: 'border-warning-200 bg-warning-50', 
      critical: 'border-error-200 bg-error-50'
    };

    return (
      <div className={cn(
        'p-4 rounded-lg border-2 transition-all duration-200',
        statusColors[status]
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary-600">{title}</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-secondary-900">
              {value}{unit && <span className="text-sm text-secondary-500 ml-1">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-secondary-500 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6 p-6 bg-white rounded-xl shadow-soft', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">パフォーマンス監視</h2>
          <p className="text-sm text-secondary-500">
            最終更新: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            loading={isLoading}
          >
            更新
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const data = metricsCollector.exportMetrics();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-metrics-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            エクスポート
          </Button>
        </div>
      </div>

      {/* メモリ統計 */}
      {memoryStats && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary-800">メモリ統計</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="メモリ使用量"
              value={memoryStats.percentage}
              unit="%"
              status={memoryStats.critical ? 'critical' : memoryStats.warning ? 'warning' : 'good'}
              description={`${Math.round(memoryStats.used / 1024 / 1024)} MB / ${Math.round(memoryStats.total / 1024 / 1024)} MB`}
            />
            
            <MetricCard
              title="メモリ断片化"
              value={(memoryStats.fragmentationRatio * 100).toFixed(1)}
              unit="%"
              status={memoryStats.fragmentationRatio > 0.3 ? 'warning' : 'good'}
            />
            
            <MetricCard
              title="GCプレッシャー"
              value={memoryStats.gcPressure}
              unit="events/分"
              status={memoryStats.gcPressure > 10 ? 'warning' : 'good'}
            />
            
            <MetricCard
              title="アクティブ接続"
              value={memoryStats.activeConnections}
              unit="件"
              status={memoryStats.activeConnections > 10 ? 'warning' : 'good'}
            />
          </div>

          {/* メモリ使用量バー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-600">メモリ使用量</span>
              <span className={cn('font-medium', getMemoryColorClass(memoryStats.percentage))}>
                {memoryStats.percentage}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-3">
              <div
                className={cn(
                  'h-3 rounded-full transition-all duration-500',
                  memoryStats.critical ? 'bg-error-500' :
                  memoryStats.warning ? 'bg-warning-500' : 'bg-success-500'
                )}
                style={{ width: `${Math.min(memoryStats.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* パフォーマンスサマリー */}
      {performanceReport && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary-800">パフォーマンスサマリー</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="平均レスポンス時間"
              value={performanceReport.summary.avgResponseTime}
              unit="ms"
              status={performanceReport.summary.avgResponseTime > 3000 ? 'warning' : 'good'}
            />
            
            <MetricCard
              title="エラー率"
              value={performanceReport.summary.errorRate.toFixed(1)}
              unit="%"
              status={performanceReport.summary.errorRate > 5 ? 'critical' : 'good'}
            />
            
            <MetricCard
              title="総操作数"
              value={performanceReport.summary.totalOperations}
              unit="回"
            />
            
            <MetricCard
              title="監視期間"
              value={Math.round(performanceReport.duration / 1000 / 60)}
              unit="分"
            />
          </div>
        </div>
      )}

      {/* 警告・推奨事項 */}
      {performanceReport && (performanceReport.warnings.length > 0 || performanceReport.recommendations.length > 0) && (
        <div className="space-y-4">
          {performanceReport.warnings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-warning-800 mb-2">⚠️ 警告</h3>
              <div className="space-y-2">
                {performanceReport.warnings.map((warning, index) => (
                  <div key={index} className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-800">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {performanceReport.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 推奨事項</h3>
              <div className="space-y-2">
                {performanceReport.recommendations.map((recommendation, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* リアルタイムアラート */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary-800">🚨 リアルタイムアラート</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'p-3 border rounded-lg transition-all duration-200',
                  getAlertColorClass(alert.severity)
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                      {alert.service && ` • ${alert.service}`}
                    </p>
                  </div>
                  {alert.action && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={alert.action}
                    >
                      対処
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フッター */}
      <div className="pt-4 border-t border-secondary-200">
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span>Multi Channel Reply Support Tool - Performance Monitor</span>
          <span>
            自動更新: {autoRefresh ? `${refreshInterval / 1000}秒間隔` : 'オフ'}
          </span>
        </div>
      </div>
    </div>
  );
};