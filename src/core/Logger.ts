import { objectStringify } from '../utilities/errorUtil';

export const LogLevel = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
  SILENT: Infinity,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LOG_LEVEL_NAMES = Object.fromEntries((Object.keys(LogLevel) as Array<keyof typeof LogLevel>).map((key) => [LogLevel[key], key])) as Record<
  LogLevel,
  string
>;

const getConsoleMethod = (level: LogLevel): ((...data: Array<unknown>) => void) => {
  if (level >= LogLevel.ERROR) {
    return console.error;
  }
  if (level >= LogLevel.WARN) {
    return console.warn;
  }
  if (level >= LogLevel.INFO) {
    return console.info;
  }
  return console.debug;
};

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

    const prefix = `[${LOG_LEVEL_NAMES[level] ?? 'UNKNOWN'}]`;
    const data = args.map((arg) => objectStringify(arg));

    getConsoleMethod(level)(prefix, message, ...data);
  }
}
