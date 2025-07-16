import { objectStringify } from '../utilities/errorUtil';

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

  private log(level: LogLevel, message?: unknown, ...args: unknown[]): void {
    if (level < this.level) {
      return;
    }

    const prefix = `[${LogLevel[level]}]`;
    const data = [message, ...args].map((arg) => objectStringify(arg));

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
