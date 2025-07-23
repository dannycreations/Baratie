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
    errorObject.stack = error.stack.split('\n').map((l) => l.trim());
  }
  return errorObject;
}

const BASE64_DATA_REGEX = /^data:[\w/+-]+;base64,/;
const BASE64_CANDIDATE_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MIN_BASE64_LENGTH = 100;

function isStringPossiblyBase64(s: string): boolean {
  if (s.length < MIN_BASE64_LENGTH) {
    return false;
  }
  if (BASE64_DATA_REGEX.test(s)) {
    return true;
  }
  if (s.length % 4 !== 0) {
    return false;
  }
  return BASE64_CANDIDATE_REGEX.test(s);
}

export function objectStringify(data: unknown, space?: string | number): string {
  if (!isObjectLike(data)) {
    return String(data);
  }

  const cache = new Set();
  const replacer = (_key: string, value: unknown) => {
    if (typeof value === 'string' && isStringPossiblyBase64(value)) {
      const prefixMatch = value.match(BASE64_DATA_REGEX);
      if (prefixMatch) {
        const prefix = prefixMatch[0];
        const dataLength = value.length - prefix.length;
        return `${prefix}[Redacted Base64 (${dataLength} bytes)]`;
      }
      return `[Redacted Base64 (${value.length} bytes)]`;
    }
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
    return JSON.stringify(data, replacer, space);
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
