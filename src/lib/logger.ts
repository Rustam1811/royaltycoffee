/**
 * Production-grade logger
 * - Development: logs to console
 * - Production: can be integrated with external services (Sentry, LogRocket)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isTest = import.meta.env.MODE === 'test';

  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false;
    if (!this.isDevelopment && level === 'debug') return false;
    return true;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('error', message, errorContext));
    } else {
      // In production, send to error tracking service (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(error, { extra: context });
    }
  }
}

export const logger = new Logger();
