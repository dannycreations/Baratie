import { errorHandler } from '../app/container';

import type { ErrorOptions } from './ErrorHandler';

export class Storage {
  public get<T = unknown>(
    key: string,
    context: string,
    reviver?: (key: string, value: unknown) => unknown,
    options?: Partial<ErrorOptions>,
  ): T | null {
    const { result } = errorHandler.attempt<T | null>(
      () => {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          return JSON.parse(storedValue, reviver) as T;
        }
        return null;
      },
      `${context} Storage`,
      {
        genericMessage: `Could not load your ${context.toLowerCase()} data.`,
        ...options,
      },
    );
    return result;
  }

  public remove(key: string, context: string, options?: Partial<ErrorOptions>): boolean {
    const { error } = errorHandler.attempt(
      () => {
        localStorage.removeItem(key);
      },
      `${context} Storage Remove`,
      {
        genericMessage: `Failed to remove ${context.toLowerCase()} data from local storage.`,
        ...options,
      },
    );
    return !error;
  }

  public set(key: string, value: unknown, context: string, options?: Partial<ErrorOptions>): boolean {
    const { error } = errorHandler.attempt(
      () => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      `${context} Storage Save`,
      {
        genericMessage: `Failed to save ${context.toLowerCase()} data to local storage.`,
        shouldNotify: true,
        ...options,
      },
    );
    return !error;
  }
}
