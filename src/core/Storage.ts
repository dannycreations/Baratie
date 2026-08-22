import { errorHandler } from '../app/container';

export class Storage {
  public get<T = unknown>(key: string, context: string): T | null {
    return errorHandler.attempt<T | null>(
      () => {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          return JSON.parse(storedValue) as T;
        }
        return null;
      },
      `${context} Storage`,
      {
        genericMessage: `Could not load your ${context.toLowerCase()} data.`,
      },
    ).result;
  }

  public set(key: string, value: unknown, context: string): boolean {
    return !errorHandler.attempt(() => localStorage.setItem(key, JSON.stringify(value)), `${context} Storage Save`, {
      genericMessage: `Failed to save ${context.toLowerCase()} data to local storage.`,
      shouldNotify: true,
    }).error;
  }
}
