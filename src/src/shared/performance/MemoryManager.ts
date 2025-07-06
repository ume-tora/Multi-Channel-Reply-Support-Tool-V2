/**
 * Memory Manager for Chrome Extension Performance Optimization
 */

export interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  warning: boolean;
  critical: boolean;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Map<string, () => void> = new Map();
  private memoryCheckInterval: number | null = null;
  private readonly MEMORY_WARNING_THRESHOLD = 80; // 80% memory usage
  private readonly MEMORY_CRITICAL_THRESHOLD = 90; // 90% memory usage
  private readonly MEMORY_CHECK_INTERVAL = 300000; // 5 minutes

  private constructor() {
    // 緊急対策：監視を完全に無効化
    console.log('MemoryManager: Emergency mode - all functions disabled');
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a cleanup task (緊急対策：無効化)
   */
  registerCleanupTask(key: string, cleanupFn: () => void): void {
    // 緊急対策：無効化
    return;
  }

  /**
   * Unregister a cleanup task (緊急対策：無効化)
   */
  unregisterCleanupTask(key: string): void {
    // 緊急対策：無効化
    return;
  }

  /**
   * Force garbage collection and cleanup (緊急対策：無効化)
   */
  forceCleanup(): void {
    // 緊急対策：無効化
    return;
    
    // Run all registered cleanup tasks
    for (const [key, cleanupFn] of this.cleanupTasks) {
      try {
        cleanupFn();
        console.log(`MemoryManager: Cleanup task "${key}" completed`);
      } catch (error) {
        console.error(`MemoryManager: Error in cleanup task "${key}":`, error);
      }
    }

    // Clear expired cache
    this.clearExpiredCache();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    try {
      // Try to get actual memory usage if available
      if ('memory' in performance) {
        const memInfo = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        if (!memInfo) {
          throw new Error('Memory info not available');
        }
        const used = memInfo.usedJSHeapSize;
        const total = memInfo.totalJSHeapSize;
        const percentage = (used / total) * 100;
        
        return {
          used,
          total,
          percentage,
          warning: percentage > this.MEMORY_WARNING_THRESHOLD,
          critical: percentage > this.MEMORY_CRITICAL_THRESHOLD
        };
      }
      
      // Fallback: estimate based on storage usage
      const storageStats = await this.getStorageStats();
      const percentage = storageStats.percentage;
      
      return {
        used: storageStats.used,
        total: storageStats.total,
        percentage,
        warning: percentage > this.MEMORY_WARNING_THRESHOLD,
        critical: percentage > this.MEMORY_CRITICAL_THRESHOLD
      };
    } catch (error) {
      console.error('MemoryManager: Error getting memory stats:', error);
      return {
        used: 0,
        total: 0,
        percentage: 0,
        warning: false,
        critical: false
      };
    }
  }

  /**
   * Check if memory optimization is needed
   */
  async shouldOptimize(): Promise<boolean> {
    const stats = await this.getMemoryStats();
    return stats.warning || stats.critical;
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = window.setInterval(async () => {
      try {
        // Skip monitoring if extension context is invalid
        if (!chrome.runtime?.id) {
          console.warn('MemoryManager: Extension context invalid, skipping memory monitoring');
          return;
        }

        const stats = await this.getMemoryStats();
        
        if (stats.critical) {
          console.warn('MemoryManager: Critical memory usage detected, forcing cleanup');
          console.log('MemoryManager: Memory stats:', stats);
          this.forceCleanup();
        } else if (stats.warning) {
          console.warn('MemoryManager: High memory usage detected');
          console.log('MemoryManager: Memory stats:', stats);
          this.clearExpiredCache();
        } else {
          console.log('MemoryManager: Memory usage OK:', stats);
        }
      } catch (error) {
        if (error.message?.includes('Extension context invalidated') || 
            error.message?.includes('context invalidated')) {
          console.warn('MemoryManager: Extension context invalidated during memory monitoring');
          return;
        }
        console.error('MemoryManager: Error in memory monitoring:', error);
      }
    }, this.MEMORY_CHECK_INTERVAL);
  }

  /**
   * Clear expired cache entries
   */
  private async clearExpiredCache(): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('MemoryManager: Extension context invalidated, skipping cache cleanup');
        return;
      }

      // Double-check extension context before storage operation
      if (!chrome.runtime?.id) {
        console.warn('MemoryManager: Extension context lost during cache cleanup preparation');
        return;
      }

      const { ChromeStorageManager } = await import('../storage/ChromeStorageManager');
      const clearedCount = await ChromeStorageManager.clearExpiredCache();
      
      if (clearedCount > 0) {
        console.log(`MemoryManager: Cleared ${clearedCount} expired cache entries`);
      }
    } catch (error) {
      if (error.message?.includes('Extension context invalidated') || 
          error.message?.includes('context invalidated')) {
        console.warn('MemoryManager: Extension context invalidated during cache cleanup');
        return;
      }
      console.error('MemoryManager: Error clearing expired cache:', error);
    }
  }

  /**
   * Get storage statistics
   */
  private async getStorageStats(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const { ChromeStorageManager } = await import('../storage/ChromeStorageManager');
      return await ChromeStorageManager.getUsage();
    } catch (error) {
      console.error('MemoryManager: Error getting storage stats:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Cleanup resources and run cleanup tasks (緊急対策：無効化)
   */
  cleanup(): void {
    // 緊急対策：無効化
    return;
  }

  /**
   * Cleanup the memory manager itself (緊急対策：無効化)
   */
  destroy(): void {
    // 緊急対策：無効化
    return;
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();