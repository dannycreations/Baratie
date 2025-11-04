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

  public trace(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  public debug(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public fatal(message?: unknown, ...args: Array<unknown>): void {
    this.log(LogLevel.FATAL, message, ...args);
  }

  private log(level: LogLevel, message?: unknown, ...args: Array<unknown>): void {
    if (level < this.level) {
      return;
    }

    let consoleMethod: (...data: Array<unknown>) => void;
    switch (true) {
      case level >= LogLevel.ERROR:
        consoleMethod = console.error;
        break;
      case level >= LogLevel.WARN:
        consoleMethod = console.warn;
        break;
      case level >= LogLevel.INFO:
        consoleMethod = console.info;
        break;
      default:
        consoleMethod = console.debug;
        break;
    }

    const prefix = `[${LogLevel[level]}]`;
    const data = args.map((arg) => objectStringify(arg));

    consoleMethod(prefix, message, ...data);
  }
}
