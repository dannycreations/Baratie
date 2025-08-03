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

    const consoleMethod =
      level >= LogLevel.ERROR ? console.error : level >= LogLevel.WARN ? console.warn : level >= LogLevel.INFO ? console.info : console.debug;

    const prefix = `[${LogLevel[level]}]`;
    const data = [message, ...args].map((arg) => objectStringify(arg));

    consoleMethod(prefix, ...data);
  }
}
