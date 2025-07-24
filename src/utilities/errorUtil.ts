import { AppError } from '../core/ErrorHandler';
import { isObjectLike } from './appUtil';

export function createErrorObject(error: Error): Record<string, unknown> {
  const errorObject: Record<string, unknown> = {
    message: error.message,
    name: error.name,
  };

  if (error instanceof AppError) {
    if (error.context) {
      errorObject.context = error.context;
    }
    if (error.userMessage) {
      errorObject.userMessage = error.userMessage;
    }
  }

  if ('cause' in error && error.cause) {
    const cause = error.cause;
    errorObject.cause = cause instanceof Error ? createErrorObject(cause) : String(cause);
  }

  if (error.stack) {
    errorObject.stack = error.stack.split('\n').map((line) => line.trim());
  }

  return errorObject;
}

export function objectStringify(data: unknown, space?: string | number): string {
  if (!isObjectLike(data)) {
    return String(data);
  }

  const cache = new Set<unknown>();

  const replacer = (_key: string, value: unknown): unknown => {
    if (isObjectLike(value)) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }

    if (value instanceof Error) {
      return createErrorObject(value);
    }

    return value;
  };

  try {
    const jsonString = JSON.stringify(data, replacer, space);
    return jsonString.replace(/[a-zA-Z0-9+/=]{30,}/g, '[REDACTED]');
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const fallback: Record<string, unknown> = {
      note: 'Could not stringify the object, possibly due to circular references.',
      stringifyError: error.message,
    };

    if (data instanceof Error) {
      fallback.name = data.name;
      fallback.message = data.message;
    }

    return JSON.stringify(fallback, null, space);
  }
}
