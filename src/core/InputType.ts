import { base64ToUint8Array, isObjectLike, uint8ArrayToBase64 } from '../utilities/appUtil';

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

  public cast(type: 'array', options?: { readonly value?: unknown[] }): InputType<unknown[]>;
  public cast(type: 'arraybuffer', options?: { readonly value?: ArrayBuffer }): InputType<ArrayBuffer>;
  public cast(type: 'boolean', options?: { readonly value?: boolean }): InputType<boolean>;
  public cast(type: 'bytearray', options?: { readonly value?: Uint8Array }): InputType<Uint8Array>;
  public cast(type: 'number', options?: { readonly max?: number; readonly min?: number; readonly value?: number }): InputType<number>;
  public cast(type: 'object', options?: { readonly value?: object }): InputType<object>;
  public cast(type: 'string', options?: { readonly trim?: boolean; readonly value?: string }): InputType<string>;
  public cast(
    type: InputDataType,
    options?: {
      readonly max?: number;
      readonly min?: number;
      readonly trim?: boolean;
      readonly value?: unknown;
    },
  ): InputType<unknown> {
    const handleFailure = (e?: Error): InputType<unknown> => {
      if (typeof options?.value !== 'undefined') {
        return new InputType(options.value);
      }
      const error = e || new CastError(`Casting to ${type} failed for value '${String(this.value)}' and no fallback was provided.`);
      throw error;
    };

    switch (type) {
      case 'array':
        return this.castToArray(handleFailure);
      case 'arraybuffer':
        return this.castToArrayBuffer(handleFailure);
      case 'boolean':
        return this.castToBoolean(handleFailure);
      case 'bytearray':
        return this.castToByteArray(handleFailure);
      case 'number':
        return this.castToNumber(options, handleFailure);
      case 'object':
        return this.castToObject(handleFailure);
      case 'string':
        return this.castToString(options);
      default: {
        const unhandled = String(type);
        return handleFailure(new CastError(`Unhandled cast target type: ${unhandled}`));
      }
    }
  }

  public getType(): InputDataType {
    const value = this.value;
    if (value instanceof Uint8Array) {
      return 'bytearray';
    }
    if (value instanceof ArrayBuffer) {
      return 'arraybuffer';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (typeof value === 'string') {
      return 'string';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (isObjectLike(value)) {
      return 'object';
    }
    throw new CastError(`Cannot determine InputDataType for value: ${String(value)}`);
  }

  public getValue(): T {
    return this.value;
  }

  public update<U>(newValue: U): InputType<U> {
    return new InputType(newValue);
  }

  private castToArray(handleFailure: (e?: Error) => InputType<unknown>): InputType<unknown[]> {
    if (Array.isArray(this.value)) {
      return new InputType(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (Array.isArray(parsed)) {
          return new InputType(parsed);
        }
      } catch (error) {}
    }
    return handleFailure(new CastError(`Cannot cast to array from type ${typeof this.value}`)) as InputType<unknown[]>;
  }

  private castToArrayBuffer(handleFailure: (e?: Error) => InputType<unknown>): InputType<ArrayBuffer> {
    if (this.value instanceof ArrayBuffer) {
      return new InputType(this.value);
    }
    if (this.value instanceof Uint8Array) {
      return new InputType(this.value.buffer);
    }
    if (typeof this.value === 'string') {
      try {
        return new InputType(base64ToUint8Array(this.value).buffer);
      } catch (error) {
        const inputError = error instanceof Error ? error : new Error(String(error));
        return handleFailure(
          new CastError(`Value is not a valid Base64 string for ArrayBuffer conversion: ${inputError.message}`),
        ) as InputType<ArrayBuffer>;
      }
    }
    return handleFailure(new CastError(`Cannot cast to ArrayBuffer from type ${typeof this.value}`)) as InputType<ArrayBuffer>;
  }

  private castToBoolean(handleFailure: (e?: Error) => InputType<unknown>): InputType<boolean> {
    if (typeof this.value === 'boolean') {
      return new InputType(this.value);
    }
    const stringValue = String(this.value ?? '')
      .trim()
      .toLowerCase();
    switch (stringValue) {
      case 'true':
      case '1':
        return new InputType(true);
      case 'false':
      case '0':
      case '':
        return new InputType(false);
      default:
        return handleFailure(new CastError(`Cannot unambiguously cast value to boolean: ${String(this.value)}`)) as InputType<boolean>;
    }
  }

  private castToByteArray(handleFailure: (e?: Error) => InputType<unknown>): InputType<Uint8Array> {
    if (this.value instanceof Uint8Array) {
      return new InputType(this.value);
    }
    if (this.value instanceof ArrayBuffer) {
      return new InputType(new Uint8Array(this.value));
    }
    if (typeof this.value === 'string') {
      try {
        return new InputType(base64ToUint8Array(this.value));
      } catch (error) {
        const inputError = error instanceof Error ? error : new Error(String(error));
        return handleFailure(
          new CastError(`Value is not a valid Base64 string for Uint8Array conversion: ${inputError.message}`),
        ) as InputType<Uint8Array>;
      }
    }
    return handleFailure(new CastError(`Cannot cast to Uint8Array from type ${typeof this.value}`)) as InputType<Uint8Array>;
  }

  private castToNumber(
    options: { readonly max?: number; readonly min?: number; readonly value?: unknown } | undefined,
    handleFailure: (e?: Error) => InputType<unknown>,
  ): InputType<number> {
    const stringValue = String(this.value ?? '').trim();
    let numericValue = Number(stringValue);

    if (isNaN(numericValue) || !isFinite(numericValue)) {
      return handleFailure() as InputType<number>;
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

  private castToObject(handleFailure: (e?: Error) => InputType<unknown>): InputType<object> {
    if (isObjectLike(this.value) && !Array.isArray(this.value)) {
      return new InputType(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (isObjectLike(parsed) && !Array.isArray(parsed)) {
          return new InputType(parsed);
        }
      } catch (error) {}
    }
    return handleFailure(new CastError(`Cannot cast to object from type ${typeof this.value}`)) as InputType<object>;
  }

  private castToString(options: { readonly trim?: boolean; readonly value?: unknown } | undefined): InputType<string> {
    const { trim = true } = options || {};
    let stringValue: string;
    if (this.value instanceof ArrayBuffer) {
      stringValue = uint8ArrayToBase64(new Uint8Array(this.value));
    } else if (this.value instanceof Uint8Array) {
      stringValue = uint8ArrayToBase64(this.value);
    } else if (isObjectLike(this.value)) {
      try {
        stringValue = JSON.stringify(this.value);
      } catch {
        stringValue = String(this.value ?? '');
      }
    } else {
      stringValue = String(this.value ?? '');
    }
    return new InputType(trim ? stringValue.trim() : stringValue);
  }
}
