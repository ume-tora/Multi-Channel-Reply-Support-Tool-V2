import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsCollector } from '../MetricsCollector';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = MetricsCollector.getInstance();
    metricsCollector.clearMetrics();
  });

  afterEach(() => {
    metricsCollector.clearMetrics();
  });

  describe('Metric Recording', () => {
    it('should record basic metrics', () => {
      metricsCollector.recordMetric({
        name: 'test_metric',
        value: 100,
        unit: 'ms'
      });

      const exported = JSON.parse(metricsCollector.exportMetrics());
      expect(exported.metrics).toHaveLength(1);
      expect(exported.metrics[0].name).toBe('test_metric');
      expect(exported.metrics[0].value).toBe(100);
      expect(exported.metrics[0].unit).toBe('ms');
    });

    it('should record metrics with service and context', () => {
      metricsCollector.recordMetric({
        name: 'api_call',
        value: 250,
        unit: 'ms',
        service: 'gmail',
        context: 'reply_generation'
      });

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const metric = exported.metrics[0];
      expect(metric.service).toBe('gmail');
      expect(metric.context).toBe('reply_generation');
    });

    it('should limit metrics count to prevent memory issues', () => {
      // Record more than MAX_METRICS
      for (let i = 0; i < 1200; i++) {
        metricsCollector.recordMetric({
          name: `metric_${i}`,
          value: i,
          unit: 'count'
        });
      }

      const exported = JSON.parse(metricsCollector.exportMetrics());
      expect(exported.metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Operation Tracking', () => {
    it('should track operation duration', () => {
      metricsCollector.startOperation('test_operation');
      
      // Simulate some work
      const startTime = performance.now();
      while (performance.now() - startTime < 10) {
        // Wait 10ms
      }
      
      const duration = metricsCollector.endOperation('test_operation');
      
      expect(duration).toBeGreaterThan(8); // Allow some variance
      expect(duration).toBeLessThan(50); // Should be reasonable
    });

    it('should handle missing operation gracefully', () => {
      const duration = metricsCollector.endOperation('non_existent_operation');
      expect(duration).toBe(0);
    });

    it('should record operation metrics', () => {
      metricsCollector.startOperation('api_call');
      metricsCollector.endOperation('api_call', 'gmail');

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const durationMetric = exported.metrics.find(m => m.name === 'api_call_duration');
      
      expect(durationMetric).toBeDefined();
      expect(durationMetric.unit).toBe('ms');
      expect(durationMetric.service).toBe('gmail');
    });
  });

  describe('API Call Tracking', () => {
    it('should track successful API calls', () => {
      metricsCollector.startApiCall('gemini', 'gmail');
      const duration = metricsCollector.endApiCall('gemini', 'gmail', true);

      expect(duration).toBeGreaterThanOrEqual(0);

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const apiMetric = exported.metrics.find(m => m.name === 'api_gemini_gmail_duration');
      
      expect(apiMetric).toBeDefined();
      expect(apiMetric.service).toBe('gmail');
    });

    it('should track failed API calls', () => {
      metricsCollector.startApiCall('gemini', 'chatwork');
      metricsCollector.endApiCall('gemini', 'chatwork', false);

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const errorMetric = exported.metrics.find(m => m.name === 'error');
      
      expect(errorMetric).toBeDefined();
      expect(errorMetric.service).toBe('chatwork');
      expect(errorMetric.context).toContain('gemini');
    });
  });

  describe('Error Recording', () => {
    it('should record errors with context', () => {
      metricsCollector.recordError('network_error', 'gmail', 'API timeout');

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const errorMetric = exported.metrics.find(m => m.name === 'error');
      
      expect(errorMetric).toBeDefined();
      expect(errorMetric.service).toBe('gmail');
      expect(errorMetric.context).toContain('network_error');
      expect(errorMetric.context).toContain('API timeout');
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate basic performance report', async () => {
      // Record some test metrics
      metricsCollector.recordMetric({
        name: 'test_duration',
        value: 100,
        unit: 'ms'
      });

      metricsCollector.recordError('test_error');

      const report = await metricsCollector.generatePerformanceReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.metrics).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.warnings).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should include warnings for high response times', async () => {
      // Record slow operation
      metricsCollector.recordMetric({
        name: 'slow_operation_duration',
        value: 5000, // 5 seconds
        unit: 'ms'
      });

      const report = await metricsCollector.generatePerformanceReport();
      
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.includes('レスポンス時間'))).toBe(true);
    });

    it('should include error rate warnings', async () => {
      // Record some operations first to establish a baseline
      for (let i = 0; i < 20; i++) {
        metricsCollector.startOperation(`test_op_${i}`);
        metricsCollector.endOperation(`test_op_${i}`);
      }

      // Record multiple errors
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordError('test_error');
      }

      const report = await metricsCollector.generatePerformanceReport();
      
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.includes('エラー率'))).toBe(true);
    });
  });

  describe('Threshold Management', () => {
    it('should update thresholds correctly', () => {
      metricsCollector.updateThresholds({
        maxResponseTime: 5000,
        maxErrorRate: 10
      });

      // Record metrics that would trigger old thresholds but not new ones
      metricsCollector.recordMetric({
        name: 'test_duration',
        value: 4000,
        unit: 'ms'
      });

      // Should not trigger warning with new threshold
      const exported = JSON.parse(metricsCollector.exportMetrics());
      expect(exported.summary.thresholds.maxResponseTime).toBe(5000);
      expect(exported.summary.thresholds.maxErrorRate).toBe(10);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should record memory usage when available', async () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024 // 100MB
      };
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      await metricsCollector.recordMemoryUsage('test');

      const exported = JSON.parse(metricsCollector.exportMetrics());
      const memoryMetrics = exported.metrics.filter(m => m.name.startsWith('memory_'));
      
      expect(memoryMetrics.length).toBeGreaterThan(0);
      
      // Cleanup
      delete (performance as any).memory;
    });

    it('should handle missing memory API gracefully', async () => {
      await metricsCollector.recordMemoryUsage('test');
      
      // Should not throw error
      const exported = JSON.parse(metricsCollector.exportMetrics());
      expect(exported).toBeDefined();
    });
  });

  describe('Data Export and Cleanup', () => {
    it('should export metrics as valid JSON', () => {
      metricsCollector.recordMetric({
        name: 'test',
        value: 1,
        unit: 'count'
      });

      const exported = metricsCollector.exportMetrics();
      const parsed = JSON.parse(exported);
      
      expect(parsed.timestamp).toBeGreaterThan(0);
      expect(parsed.metrics).toBeInstanceOf(Array);
      expect(parsed.summary).toBeDefined();
    });

    it('should clear all metrics', () => {
      metricsCollector.recordMetric({
        name: 'test',
        value: 1,
        unit: 'count'
      });

      metricsCollector.clearMetrics();

      const exported = JSON.parse(metricsCollector.exportMetrics());
      expect(exported.metrics).toHaveLength(0);
      expect(exported.summary.totalRequests).toBe(0);
      expect(exported.summary.totalErrors).toBe(0);
    });
  });
});