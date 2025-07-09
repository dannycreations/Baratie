import { base64ToUint8Array, uint8ArrayToBase64 } from '../utilities/appUtil';

export type InputDataType = keyof TypeMap;

interface TypeMap {
  array: unknown[];
  arraybuffer: ArrayBuffer;
  boolean: boolean;
  bytearray: Uint8Array;
  number: number;
  object: object;
  string: string;
}

class CastError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CastError';
  }
}

export class InputType<T = unknown> {
  private readonly value: T;

  public constructor(value: T) {
    this.value = value;
  }

  public asFileName(fallbackName = 'file'): string {
    const name = this.cast('string', { trim: true }).getValue();
    const MAX_BASENAME_LENGTH = 200;

    if (!name) {
      return `${fallbackName}.dat`;
    }

    let sanitized = name.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_');

    if (sanitized === '.' || sanitized === '..') {
      sanitized = `${fallbackName}.dat`;
    }

    const extensionIndex = sanitized.lastIndexOf('.');
    let baseName: string;
    let extension: string;

    if (extensionIndex <= 0) {
      baseName = sanitized;
      extension = '';
    } else {
      baseName = sanitized.substring(0, extensionIndex);
      extension = sanitized.substring(extensionIndex);
    }

    if (!baseName) {
      baseName = fallbackName;
    }

    if (baseName.length > MAX_BASENAME_LENGTH) {
      baseName = baseName.substring(0, MAX_BASENAME_LENGTH).replace(/_$/, '');
    }

    return `${baseName.toLowerCase()}${extension.toLowerCase()}`;
  }

  public cast(targetType: 'array', options?: { readonly value?: unknown[] }): InputType<unknown[]>;
  public cast(targetType: 'arraybuffer', options?: { readonly value?: ArrayBuffer }): InputType<ArrayBuffer>;
  public cast(targetType: 'boolean', options?: { readonly value?: boolean }): InputType<boolean>;
  public cast(targetType: 'bytearray', options?: { readonly value?: Uint8Array }): InputType<Uint8Array>;
  public cast(targetType: 'number', options?: { readonly max?: number; readonly min?: number; readonly value?: number }): InputType<number>;
  public cast(targetType: 'object', options?: { readonly value?: object }): InputType<object>;
  public cast(targetType: 'string', options?: { readonly trim?: boolean; readonly value?: string }): InputType<string>;
  public cast(
    targetType: InputDataType,
    options?: {
      readonly max?: number;
      readonly min?: number;
      readonly trim?: boolean;
      readonly value?: unknown;
    },
  ): InputType<unknown> {
    const { value } = options || {};
    const originalValue = this.value;

    const handleFailure = (e?: Error): InputType<unknown> => {
      if (typeof value !== 'undefined') {
        return new InputType(value);
      }
      const error = e || new CastError(`Casting to ${targetType} failed for value '${String(originalValue)}' and no fallback was provided.`);
      throw error;
    };

    switch (targetType) {
      case 'number': {
        const stringValue = new InputType(originalValue).cast('string', { trim: true }).getValue();
        let numericValue = Number(stringValue);

        if (isNaN(numericValue) || !isFinite(numericValue)) {
          return handleFailure();
        }

        const { min, max } = options || {};
        if (min !== undefined) {
          numericValue = Math.max(min, numericValue);
        }
        if (max !== undefined) {
          numericValue = Math.min(max, numericValue);
        }

        return new InputType(numericValue);
      }

      case 'boolean': {
        if (typeof originalValue === 'boolean') {
          return new InputType(originalValue);
        }
        if (originalValue === null || typeof originalValue === 'undefined') {
          return new InputType(false);
        }

        const stringValue = new InputType(originalValue).cast('string', { trim: true }).getValue();
        if (stringValue.toLowerCase() === 'true' || stringValue === '1') {
          return new InputType(true);
        }
        if (stringValue.toLowerCase() === 'false' || stringValue === '0' || stringValue === '') {
          return new InputType(false);
        }

        return handleFailure(new CastError(`Cannot unambiguously cast value to boolean: ${String(originalValue)}`));
      }

      case 'object': {
        if (typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue)) {
          return new InputType(originalValue);
        }
        if (typeof originalValue === 'string') {
          try {
            const parsed = JSON.parse(originalValue);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              return new InputType(parsed);
            }
          } catch (e) {}
        }
        return handleFailure(new CastError(`Cannot cast to object from type ${typeof originalValue}`));
      }

      case 'array': {
        if (Array.isArray(originalValue)) {
          return new InputType(originalValue);
        }
        if (typeof originalValue === 'string') {
          try {
            const parsed = JSON.parse(originalValue);
            if (Array.isArray(parsed)) {
              return new InputType(parsed);
            }
          } catch (e) {}
        }
        return handleFailure(new CastError(`Cannot cast to array from type ${typeof originalValue}`));
      }

      case 'bytearray': {
        if (originalValue instanceof Uint8Array) {
          return new InputType(originalValue);
        }
        if (originalValue instanceof ArrayBuffer) {
          return new InputType(new Uint8Array(originalValue));
        }
        if (typeof originalValue === 'string') {
          try {
            return new InputType(base64ToUint8Array(originalValue));
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            return handleFailure(new CastError(`Value is not a valid Base64 string for Uint8Array conversion: ${error.message}`));
          }
        }
        return handleFailure(new CastError(`Cannot cast to Uint8Array from type ${typeof originalValue}`));
      }

      case 'arraybuffer': {
        if (originalValue instanceof ArrayBuffer) {
          return new InputType(originalValue);
        }
        if (originalValue instanceof Uint8Array) {
          return new InputType(originalValue.buffer);
        }
        if (typeof originalValue === 'string') {
          try {
            return new InputType(base64ToUint8Array(originalValue).buffer);
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            return handleFailure(new CastError(`Value is not a valid Base64 string for ArrayBuffer conversion: ${error.message}`));
          }
        }
        return handleFailure(new CastError(`Cannot cast to ArrayBuffer from type ${typeof originalValue}`));
      }

      case 'string': {
        const { trim = true } = options || {};
        let stringValue: string;
        if (originalValue instanceof ArrayBuffer) {
          stringValue = uint8ArrayToBase64(new Uint8Array(originalValue));
        } else if (originalValue instanceof Uint8Array) {
          stringValue = uint8ArrayToBase64(originalValue);
        } else if (Array.isArray(originalValue) || (typeof originalValue === 'object' && originalValue !== null)) {
          try {
            stringValue = JSON.stringify(originalValue);
          } catch {
            stringValue = String(originalValue ?? '');
          }
        } else {
          stringValue = String(originalValue ?? '');
        }
        return new InputType(trim ? stringValue.trim() : stringValue);
      }

      default: {
        const unhandled: never = targetType;
        return handleFailure(new CastError(`Unhandled cast target type: ${unhandled}`));
      }
    }
  }

  public getValue(): T {
    return this.value;
  }

  public update<U>(newValue: U): InputType<U> {
    return new InputType(newValue);
  }
}
