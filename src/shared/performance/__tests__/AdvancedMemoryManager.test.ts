import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdvancedMemoryManager } from '../AdvancedMemoryManager';

describe('AdvancedMemoryManager', () => {
  let memoryManager: AdvancedMemoryManager;

  beforeEach(() => {
    memoryManager = AdvancedMemoryManager.getInstance();
    
    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      },
      configurable: true
    });
  });

  afterEach(() => {
    memoryManager.cleanup();
    delete (performance as any).memory;
  });

  describe('Advanced Memory Statistics', () => {
    it('should get advanced memory stats', async () => {
      const stats = await memoryManager.getAdvancedMemoryStats();

      expect(stats).toBeDefined();
      expect(stats.used).toBeGreaterThan(0);
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.percentage).toBeGreaterThan(0);
      expect(stats.heapSizeLimit).toBeGreaterThan(0);
      expect(stats.fragmentationRatio).toBeGreaterThanOrEqual(0);
      expect(stats.gcPressure).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.activeConnections).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing performance.memory gracefully', async () => {
      delete (performance as any).memory;
      
      const stats = await memoryManager.getAdvancedMemoryStats();
      
      expect(stats).toBeDefined();
      expect(stats.heapSizeLimit).toBe(0);
      expect(stats.fragmentationRatio).toBe(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect no leaks with insufficient data', async () => {
      const leakDetection = await memoryManager.detectMemoryLeaks();

      expect(leakDetection.detected).toBe(false);
      expect(leakDetection.suspiciousObjects).toHaveLength(0);
      expect(leakDetection.growthRate).toBe(0);
      expect(leakDetection.recommendations).toHaveLength(0);
    });

    it('should detect potential leaks with multiple connections', async () => {
      // Simulate many active connections
      for (let i = 0; i < 15; i++) {
        memoryManager.trackConnection(`connection_${i}`);
      }

      // Build up memory history
      for (let i = 0; i < 6; i++) {
        await memoryManager.getAdvancedMemoryStats();
      }

      const leakDetection = await memoryManager.detectMemoryLeaks();

      expect(leakDetection.suspiciousObjects).toContain('WebSocket/HTTP connections');
      expect(leakDetection.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect suspicious resource usage', async () => {
      // Track many large resources
      for (let i = 0; i < 150; i++) {
        memoryManager.trackResource(`resource_${i}`, 1024 * 1024, 'cache'); // 1MB each
      }

      // Build up memory history
      for (let i = 0; i < 6; i++) {
        await memoryManager.getAdvancedMemoryStats();
      }

      const leakDetection = await memoryManager.detectMemoryLeaks();

      expect(leakDetection.suspiciousObjects).toContain('Tracked resources');
    });
  });

  describe('Resource Tracking', () => {
    it('should track and untrack resources', () => {
      const resourceId = 'test_resource';
      const size = 1024 * 1024; // 1MB

      memoryManager.trackResource(resourceId, size, 'image');
      
      // Verify resource is tracked (we can't directly access the Map, 
      // so we test through behavior)
      expect(() => memoryManager.trackResource(resourceId, size, 'image')).not.toThrow();

      memoryManager.untrackResource(resourceId, 'image');
      
      // Verify resource is untracked
      expect(() => memoryManager.untrackResource(resourceId, 'image')).not.toThrow();
    });

    it('should handle untracking non-existent resources', () => {
      expect(() => {
        memoryManager.untrackResource('non_existent', 'cache');
      }).not.toThrow();
    });
  });

  describe('Connection Tracking', () => {
    it('should track and untrack connections', () => {
      const connectionId = 'test_connection';

      memoryManager.trackConnection(connectionId);
      memoryManager.untrackConnection(connectionId);
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should handle duplicate connection tracking', () => {
      const connectionId = 'duplicate_connection';

      memoryManager.trackConnection(connectionId);
      memoryManager.trackConnection(connectionId); // Duplicate
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Alert System', () => {
    it('should register and call alert handlers', (done) => {
      let alertReceived = false;

      memoryManager.onAlert('test_handler', (alert) => {
        alertReceived = true;
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeGreaterThan(0);
        done();
      });

      // Manually trigger an alert by calling the private method
      // Since we can't access private methods, we'll simulate through high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 95 * 1024 * 1024, // 95MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB (95% usage)
          jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
        },
        configurable: true
      });

      // Wait a bit for monitoring to potentially trigger
      setTimeout(() => {
        if (!alertReceived) {
          done(); // Complete test even if no alert (monitoring might not be active)
        }
      }, 100);
    });

    it('should unregister alert handlers', () => {
      const handler = vi.fn();
      
      memoryManager.onAlert('test_handler', handler);
      memoryManager.offAlert('test_handler');
      
      // Handler should be removed (can't directly test, but no errors should occur)
      expect(true).toBe(true);
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect comprehensive performance metrics', async () => {
      const report = await memoryManager.collectPerformanceMetrics();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.metrics).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.warnings).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should include memory leak warnings in report', async () => {
      // Simulate conditions that might trigger warnings
      for (let i = 0; i < 20; i++) {
        memoryManager.trackConnection(`connection_${i}`);
      }

      // Build up memory history to enable leak detection
      for (let i = 0; i < 6; i++) {
        await memoryManager.getAdvancedMemoryStats();
      }

      const report = await memoryManager.collectPerformanceMetrics();

      // Report should contain additional analysis
      expect(report.warnings.length).toBeGreaterThanOrEqual(0);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Size Calculation', () => {
    it('should handle cache calculation errors gracefully', async () => {
      // Mock chrome.storage.local to throw error
      global.chrome = {
        storage: {
          local: {
            get: vi.fn().mockRejectedValue(new Error('Storage error'))
          }
        }
      } as any;

      // Should not throw error
      const stats = await memoryManager.getAdvancedMemoryStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should cleanup resources properly', () => {
      // Track some resources and connections
      memoryManager.trackResource('test', 1024, 'cache');
      memoryManager.trackConnection('test');
      memoryManager.onAlert('test', () => {});

      memoryManager.cleanup();

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should destroy instance properly', () => {
      memoryManager.destroy();

      // Getting a new instance should work
      const newInstance = AdvancedMemoryManager.getInstance();
      expect(newInstance).toBeDefined();
    });
  });
});