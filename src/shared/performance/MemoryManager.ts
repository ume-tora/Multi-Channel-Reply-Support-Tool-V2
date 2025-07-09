/**
 * Lightweight Memory Manager for Chrome Extension Performance Optimization
 * Refactored for stability and Manifest V3 compliance
 */

export interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  warning: boolean;
  critical: boolean;
}

export interface CleanupTask {
  id: string;
  cleanup: () => void;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Lightweight memory manager focusing on essential functionality
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private isMonitoring = false;
  
  // Conservative thresholds to prevent false alarms
  private readonly MEMORY_WARNING_THRESHOLD = 85; // 85% memory usage
  private readonly MEMORY_CRITICAL_THRESHOLD = 95; // 95% memory usage
  
  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a cleanup task with priority
   */
  registerCleanupTask(id: string, cleanup: () => void, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.cleanupTasks.set(id, { id, cleanup, priority });
  }

  /**
   * Unregister a cleanup task
   */
  unregisterCleanupTask(id: string): void {
    this.cleanupTasks.delete(id);
  }

  /**
   * Force cleanup with priority ordering
   */
  forceCleanup(): void {
    console.log('MemoryManager: Running priority cleanup...');
    
    // Sort tasks by priority: high -> medium -> low
    const tasksByPriority = Array.from(this.cleanupTasks.values()).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    let cleaned = 0;
    for (const task of tasksByPriority) {
      try {
        task.cleanup();
        cleaned++;
      } catch (error) {
        console.warn(`MemoryManager: Cleanup task ${task.id} failed:`, error);
      }
    }

    console.log(`MemoryManager: Completed ${cleaned}/${tasksByPriority.length} cleanup tasks`);
    
    // Force garbage collection if available
    if ('gc' in window && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('MemoryManager: Forced garbage collection');
      } catch {
        // Ignore gc errors - not available in all contexts
      }
    }
  }

  /**
   * Get current memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    try {
      // Use performance.memory if available (Chrome)
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        
        return {
          used,
          total,
          percentage,
          warning: percentage > this.MEMORY_WARNING_THRESHOLD,
          critical: percentage > this.MEMORY_CRITICAL_THRESHOLD
        };
      }
      
      // Fallback: estimate based on cleanup tasks and storage
      const taskCount = this.cleanupTasks.size;
      const estimatedUsage = Math.min(taskCount * 10, 50); // Conservative estimate
      
      return {
        used: estimatedUsage,
        total: 100,
        percentage: estimatedUsage,
        warning: estimatedUsage > this.MEMORY_WARNING_THRESHOLD,
        critical: estimatedUsage > this.MEMORY_CRITICAL_THRESHOLD
      };
    } catch (error) {
      console.warn('MemoryManager: Error getting memory stats:', error);
      return {
        used: 0,
        total: 100,
        percentage: 0,
        warning: false,
        critical: false
      };
    }
  }

  /**
   * Initialize lightweight monitoring (only when needed)
   */
  private initializeMonitoring(): void {
    // Only monitor if we have tasks to clean up
    if (this.cleanupTasks.size === 0) {
      return;
    }

    // Use passive monitoring - only check on user interaction
    this.setupPassiveMonitoring();
  }

  /**
   * Setup passive monitoring that doesn't use timers
   */
  private setupPassiveMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Monitor on visibility change (tab switch, window focus)
    document.addEventListener('visibilitychange', this.checkMemoryOnDemand.bind(this));
    
    // Monitor on user interaction (less intrusive than timers)
    document.addEventListener('click', this.throttledMemoryCheck.bind(this), { passive: true });
  }

  private lastMemoryCheck = 0;
  private readonly MEMORY_CHECK_THROTTLE = 60000; // 1 minute

  /**
   * Throttled memory check to prevent excessive monitoring
   */
  private throttledMemoryCheck(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.MEMORY_CHECK_THROTTLE) {
      return;
    }
    
    this.lastMemoryCheck = now;
    this.checkMemoryOnDemand();
  }

  /**
   * Check memory only when needed
   */
  private async checkMemoryOnDemand(): Promise<void> {
    if (!this.isExtensionContextValid()) {
      return;
    }

    try {
      const stats = await this.getMemoryStats();
      
      if (stats.critical) {
        console.warn('MemoryManager: Critical memory usage detected:', stats);
        this.forceCleanup();
      } else if (stats.warning) {
        console.warn('MemoryManager: High memory usage detected:', stats);
        this.runExpiredCacheCleanup();
      }
    } catch (error) {
      console.error('MemoryManager: Error in on-demand memory check:', error);
    }
  }

  /**
   * Check if extension context is still valid
   */
  private isExtensionContextValid(): boolean {
    return !!(chrome?.runtime?.id);
  }

  /**
   * Run expired cache cleanup safely
   */
  private async runExpiredCacheCleanup(): Promise<void> {
    try {
      if (!this.isExtensionContextValid()) {
        return;
      }

      const { ChromeStorageManager } = await import('../storage/ChromeStorageManager');
      await ChromeStorageManager.clearExpiredCache();
    } catch (error) {
      console.warn('MemoryManager: Cache cleanup failed:', error);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.forceCleanup();
    this.cleanupTasks.clear();
    this.isMonitoring = false;
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.checkMemoryOnDemand.bind(this));
    document.removeEventListener('click', this.throttledMemoryCheck.bind(this));
  }

  /**
   * Destroy the memory manager
   */
  destroy(): void {
    this.cleanup();
    MemoryManager.instance = null as any;
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();