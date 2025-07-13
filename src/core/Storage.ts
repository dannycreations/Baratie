import { errorHandler } from '../app/container';

export class Storage {
  public get<T = unknown>(key: string, context: string, reviver?: (key: string, value: unknown) => unknown): T {
    const { result } = errorHandler.attempt(
      () => {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          return JSON.parse(storedValue, reviver);
        }
        return null;
      },
      `${context} Storage`,
      {
        genericMessage: `Could not load your ${context.toLowerCase()} data.`,
      },
    );
    return result;
  }

  public set(key: string, value: unknown, context: string): boolean {
    const { error } = errorHandler.attempt(
      () => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      `${context} Storage Save`,
      {
        genericMessage: `Failed to save ${context.toLowerCase()} data to local storage.`,
        shouldNotify: false,
      },
    );
    return !error;
  }
}
