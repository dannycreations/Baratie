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

const LOG_LEVEL_NAME_MAP: Readonly<Record<number, string>> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

function formatArgument(arg: unknown): unknown {
  if (typeof arg !== 'object' || arg === null) {
    return arg;
  }

  try {
    const cache = new Set();
    return JSON.stringify(arg, (_key: string, value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }

      if (value instanceof Error) {
        const errorObject: Record<string, unknown> = {
          message: value.message,
          name: value.name,
        };
        if (value instanceof AppError) {
          if (value.context) {
            errorObject.context = value.context;
          }
          if (value.userMessage) {
            errorObject.userMessage = value.userMessage;
          }
        }
        if ('cause' in value && value.cause) {
          const cause = value.cause;
          errorObject.cause = cause instanceof Error ? { name: cause.name, message: cause.message, stack: cause.stack } : String(cause);
        }
        if (value.stack) {
          errorObject.stack = value.stack;
        }
        return errorObject;
      }
      return value;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[Unserializable object: ${message}]`;
  }
}

export class Logger {
  public level: LogLevel;

  public constructor(level: LogLevel) {
    this.level = level;
  }

  public trace(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.TRACE, message, ...optionalParams);
  }

  public debug(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...optionalParams);
  }

  public info(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.INFO, message, ...optionalParams);
  }

  public warn(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.WARN, message, ...optionalParams);
  }

  public error(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...optionalParams);
  }

  public fatal(message?: unknown, ...optionalParams: unknown[]): void {
    this.log(LogLevel.FATAL, message, ...optionalParams);
  }

  private log(level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void {
    if (level < this.level) {
      return;
    }

    const prefix = `[${LOG_LEVEL_NAME_MAP[level]}]`;
    const args = [message, ...optionalParams].map(formatArgument);

    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
    }
  }
}
