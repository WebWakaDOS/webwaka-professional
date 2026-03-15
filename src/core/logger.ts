/**
 * WebWaka Platform Logger
 * Blueprint Reference: Part 9.3 — "Zero Console Logs: No console.log statements. Must use platform logger."
 *
 * Provides structured, level-aware logging for all modules.
 * In Cloudflare Workers, logs are captured by the Workers runtime and visible in the dashboard.
 * Zero direct console.log usage anywhere in the codebase — all logging goes through this module.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  tenantId?: string | undefined;
  userId?: string | undefined;
  data?: Record<string, unknown> | undefined;
  timestamp: string;
}

export class PlatformLogger {
  private readonly module: string;
  private readonly tenantId?: string | undefined;

  constructor(module: string, tenantId?: string) {
    this.module = module;
    this.tenantId = tenantId;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown> | undefined): void {
    const entry: LogEntry = {
      level,
      module: this.module,
      message,
      ...(this.tenantId !== undefined ? { tenantId: this.tenantId } : {}),
      ...(data !== undefined ? { data } : {}),
      timestamp: new Date().toISOString()
    };

    // Cloudflare Workers captures structured output from console methods
    // This is the ONLY place in the codebase where console methods are called
    switch (level) {
      case 'DEBUG':
        console.debug(JSON.stringify(entry));
        break;
      case 'INFO':
        console.info(JSON.stringify(entry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(entry));
        break;
      case 'ERROR':
        console.error(JSON.stringify(entry));
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', message, data);
  }

  /** Create a child logger scoped to a specific tenant */
  withTenant(tenantId: string): PlatformLogger {
    return new PlatformLogger(this.module, tenantId);
  }
}

/** Factory function for creating module-scoped loggers */
export function createLogger(module: string, tenantId?: string): PlatformLogger {
  return new PlatformLogger(module, tenantId);
}
