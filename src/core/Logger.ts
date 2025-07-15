import { AppError } from './ErrorHandler';

export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
  SILENT = Infinity,
}

export class Logger {
  public level: LogLevel;

  public constructor(level: LogLevel) {
    this.level = level;
  }

  public trace(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  public debug(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public fatal(message?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.FATAL, message, ...args);
  }

  private formatArgument(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    try {
      const cache = new Set();
      return JSON.stringify(value, (_key: string, val: unknown) => {
        if (typeof val === 'object' && val !== null) {
          if (cache.has(val)) {
            return '[Circular]';
          }
          cache.add(val);
        }

        if (val instanceof Error) {
          const errorObject: Record<string, unknown> = {
            message: val.message,
            name: val.name,
          };
          if (val instanceof AppError) {
            if (val.context) errorObject.context = val.context;
            if (val.userMessage) errorObject.userMessage = val.userMessage;
          }
          if ('cause' in val && val.cause) {
            const cause = val.cause;
            errorObject.cause = cause instanceof Error ? { name: cause.name, message: cause.message, stack: cause.stack } : String(cause);
          }
          if (val.stack) errorObject.stack = val.stack;
          return errorObject;
        }
        return val;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `[Unserializable object: ${message}]`;
    }
  }

  private log(level: LogLevel, message?: unknown, ...args: unknown[]): void {
    if (level < this.level) {
      return;
    }

    const prefix = `[${LogLevel[level]}]`;
    const data = [message, ...args].map((arg) => this.formatArgument(arg));

    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(prefix, ...data);
        break;
      case LogLevel.INFO:
        console.info(prefix, ...data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...data);
        break;
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(prefix, ...data);
        break;
    }
  }
}
