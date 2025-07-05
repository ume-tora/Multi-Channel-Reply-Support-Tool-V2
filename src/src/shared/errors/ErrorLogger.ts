/**
 * Error Logger for structured logging and debugging support
 */

import type { ErrorContext } from './ErrorTypes';
import { ErrorSeverity, extractErrorMessage, extractErrorStack } from './ErrorTypes';

// === Log Entry Types ===

export interface LogEntry {
  timestamp: string;
  level: ErrorSeverity;
  message: string;
  context?: ErrorContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
  sessionId: string;
  userAgent?: string;
  url?: string;
}

export interface LoggerOptions {
  enableConsoleOutput?: boolean;
  enableStorageOutput?: boolean;
  enableRemoteOutput?: boolean;
  maxStoredLogs?: number;
  logLevel?: ErrorSeverity;
  includeStackTrace?: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
}

// === Logger Implementation ===

export class ErrorLogger {
  private static instance: ErrorLogger;
  private options: Required<LoggerOptions>;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private readonly storageKey = 'error-logs';

  private constructor(options: LoggerOptions = {}) {
    this.options = {
      enableConsoleOutput: true,
      enableStorageOutput: true,
      enableRemoteOutput: false,
      maxStoredLogs: 100,
      logLevel: ErrorSeverity.DEBUG,
      includeStackTrace: true,
      remoteEndpoint: '',
      apiKey: '',
      ...options
    };

    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
    this.setupPeriodicFlush();
  }

  static getInstance(options?: LoggerOptions): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger(options);
    }
    return ErrorLogger.instance;
  }

  // === Public API ===

  log(error: unknown, context: ErrorContext, severity: ErrorSeverity = ErrorSeverity.ERROR): void {
    if (!this.shouldLog(severity)) {
      return;
    }

    const entry = this.createLogEntry(error, context, severity);
    this.processLogEntry(entry);
  }

  logDebug(message: string, data?: Record<string, unknown>): void {
    this.logMessage(message, ErrorSeverity.DEBUG, data);
  }

  logInfo(message: string, data?: Record<string, unknown>): void {
    this.logMessage(message, ErrorSeverity.INFO, data);
  }

  logWarn(message: string, data?: Record<string, unknown>): void {
    this.logMessage(message, ErrorSeverity.WARN, data);
  }

  logError(message: string, data?: Record<string, unknown>): void {
    this.logMessage(message, ErrorSeverity.ERROR, data);
  }

  logCritical(message: string, data?: Record<string, unknown>): void {
    this.logMessage(message, ErrorSeverity.CRITICAL, data);
  }

  // === Log Management ===

  getLogs(filter?: {
    severity?: ErrorSeverity[];
    service?: string[];
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.severity) {
        logs = logs.filter(log => filter.severity!.includes(log.level));
      }

      if (filter.service) {
        logs = logs.filter(log => 
          filter.service!.includes(log.context?.service || 'unknown')
        );
      }

      if (filter.timeRange) {
        const startTime = filter.timeRange.start.getTime();
        const endTime = filter.timeRange.end.getTime();
        logs = logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime >= startTime && logTime <= endTime;
        });
      }

      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  clearLogs(): void {
    this.logBuffer = [];
    this.saveLogsToStorage();
  }

  exportLogs(format: 'json' | 'csv' | 'text' = 'json'): string {
    const logs = this.getLogs();

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);

      case 'csv':
        return this.logsToCSV(logs);

      case 'text':
        return this.logsToText(logs);

      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byService: Record<string, number>;
    byDate: Record<string, number>;
    sessionId: string;
  } {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {} as Record<string, number>,
      byService: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      sessionId: this.sessionId
    };

    this.logBuffer.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Count by service
      const service = log.context?.service || 'unknown';
      stats.byService[service] = (stats.byService[service] || 0) + 1;

      // Count by date
      const date = log.timestamp.split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }

  // === Configuration ===

  updateOptions(newOptions: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  setLogLevel(level: ErrorSeverity): void {
    this.options.logLevel = level;
  }

  // === Private Implementation ===

  private logMessage(message: string, severity: ErrorSeverity, data?: Record<string, unknown>): void {
    if (!this.shouldLog(severity)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: severity,
      message,
      metadata: data,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    this.processLogEntry(entry);
  }

  private createLogEntry(error: unknown, context: ErrorContext, severity: ErrorSeverity): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: severity,
      message: extractErrorMessage(error),
      context,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        code: (error as any).code,
      };

      if (this.options.includeStackTrace) {
        entry.error.stack = extractErrorStack(error);
      }
    }

    return entry;
  }

  private processLogEntry(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);
    this.enforceLogLimit();

    // Console output
    if (this.options.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Storage output
    if (this.options.enableStorageOutput) {
      this.saveLogsToStorage();
    }

    // Remote output
    if (this.options.enableRemoteOutput && this.options.remoteEndpoint) {
      this.sendToRemote(entry);
    }
  }

  private shouldLog(severity: ErrorSeverity): boolean {
    const levels = Object.values(ErrorSeverity);
    const currentLevelIndex = levels.indexOf(this.options.logLevel);
    const messageLevelIndex = levels.indexOf(severity);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private outputToConsole(entry: LogEntry): void {
    const logData = {
      message: entry.message,
      context: entry.context,
      error: entry.error,
      metadata: entry.metadata,
      timestamp: entry.timestamp
    };

    switch (entry.level) {
      case ErrorSeverity.DEBUG:
        console.debug(`[${entry.sessionId}]`, logData);
        break;
      case ErrorSeverity.INFO:
        console.info(`[${entry.sessionId}]`, logData);
        break;
      case ErrorSeverity.WARN:
        console.warn(`[${entry.sessionId}]`, logData);
        break;
      case ErrorSeverity.ERROR:
        console.error(`[${entry.sessionId}]`, logData);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`[CRITICAL][${entry.sessionId}]`, logData);
        break;
    }
  }

  private saveLogsToStorage(): void {
    try {
      const logsToStore = this.logBuffer.slice(-this.options.maxStoredLogs);
      const serialized = JSON.stringify(logsToStore);
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, serialized);
      }
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private loadStoredLogs(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const logs = JSON.parse(stored) as LogEntry[];
          this.logBuffer = logs.filter(log => this.isValidLogEntry(log));
        }
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.options.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  private enforceLogLimit(): void {
    if (this.logBuffer.length > this.options.maxStoredLogs) {
      this.logBuffer = this.logBuffer.slice(-this.options.maxStoredLogs);
    }
  }

  private setupPeriodicFlush(): void {
    // Flush logs to storage every 30 seconds
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.options.enableStorageOutput) {
          this.saveLogsToStorage();
        }
      }, 30000);
    }

    // Save logs before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveLogsToStorage();
      });
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidLogEntry(entry: any): entry is LogEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.timestamp === 'string' &&
      typeof entry.level === 'string' &&
      typeof entry.message === 'string' &&
      typeof entry.sessionId === 'string'
    );
  }

  private logsToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'message', 'service', 'operation', 'sessionId'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      `"${log.message.replace(/"/g, '""')}"`,
      log.context?.service || '',
      log.context?.operation || '',
      log.sessionId
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private logsToText(logs: LogEntry[]): string {
    return logs.map(log => {
      const lines = [
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`,
        `  Session: ${log.sessionId}`
      ];

      if (log.context) {
        lines.push(`  Service: ${log.context.service}`);
        lines.push(`  Operation: ${log.context.operation}`);
      }

      if (log.error?.stack) {
        lines.push(`  Stack: ${log.error.stack}`);
      }

      return lines.join('\n');
    }).join('\n\n');
  }
}

// === Singleton Export ===
export const errorLogger = ErrorLogger.getInstance();

// === Utility Functions ===

export function setupErrorLogger(options: LoggerOptions): ErrorLogger {
  return ErrorLogger.getInstance(options);
}

export function logError(error: unknown, context: ErrorContext): void {
  errorLogger.log(error, context, ErrorSeverity.ERROR);
}

export function logWarning(message: string, data?: Record<string, unknown>): void {
  errorLogger.logWarn(message, data);
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
  errorLogger.logInfo(message, data);
}

export function logDebug(message: string, data?: Record<string, unknown>): void {
  errorLogger.logDebug(message, data);
}