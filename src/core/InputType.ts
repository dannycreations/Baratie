import { base64ToUint8Array, isObjectLike, uint8ArrayToBase64 } from '../utilities/appUtil';

interface TypeMap {
  array: Array<unknown>;
  arraybuffer: ArrayBuffer;
  boolean: boolean;
  bytearray: Uint8Array;
  number: number;
  object: object;
  string: string;
}

type InputDataType = keyof TypeMap;

type HandleFailure = <T>(e?: string) => InputType<T>;

export class InputType<T = unknown> {
  private readonly value: T;

  public constructor(value: T) {
    this.value = value;
  }

  public cast<T = unknown>(type: 'array', options?: { readonly value?: Array<T> }): InputType<Array<T>>;
  public cast(type: 'arraybuffer', options?: { readonly value?: ArrayBuffer }): InputType<ArrayBuffer>;
  public cast(type: 'boolean', options?: { readonly value?: boolean }): InputType<boolean>;
  public cast(type: 'bytearray', options?: { readonly value?: Uint8Array }): InputType<Uint8Array>;
  public cast(type: 'number', options?: { readonly max?: number; readonly min?: number; readonly value?: number }): InputType<number>;
  public cast(type: 'object', options?: { readonly value?: object }): InputType<object>;
  public cast(type: 'string', options?: { readonly value?: string }): InputType<string>;
  public cast(
    type: InputDataType,
    options?: {
      readonly max?: number;
      readonly min?: number;
      readonly value?: unknown;
    },
  ): InputType<unknown> {
    const handleFailure = <T>(e?: string): InputType<T> => {
      if (typeof options?.value !== 'undefined') {
        return new InputType(options.value as T);
      }
      throw new Error(e);
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
        return this.castToNumber(handleFailure, options);
      case 'object':
        return this.castToObject(handleFailure);
      case 'string':
        return this.castToString();
      default: {
        const unhandled = String(type);
        return handleFailure(`Cannot cast to unknown type: ${unhandled}`);
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
    throw new Error(`Cannot determine InputDataType: Unknown value type (${String(value)})`);
  }

  public getValue(): T {
    return this.value;
  }

  public update<U>(newValue: U): InputType<U> {
    return new InputType(newValue);
  }

  private castToArray(handleFailure: HandleFailure): InputType<Array<unknown>> {
    if (Array.isArray(this.value)) {
      return new InputType(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (Array.isArray(parsed)) {
          return new InputType(parsed);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to array: Invalid type (${typeof this.value})`);
  }

  private castToArrayBuffer(handleFailure: HandleFailure): InputType<ArrayBuffer> {
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
        const inputError = error instanceof Error ? error.message : String(error);
        return handleFailure(`Cannot cast to ArrayBuffer: Invalid Base64 string (${inputError})`);
      }
    }
    return handleFailure(`Cannot cast to ArrayBuffer: Invalid type (${typeof this.value})`);
  }

  private castToBoolean(handleFailure: HandleFailure): InputType<boolean> {
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
        return handleFailure(`Cannot cast to boolean: Ambiguous value (${String(this.value)})`);
    }
  }

  private castToByteArray(handleFailure: HandleFailure): InputType<Uint8Array> {
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
        const inputError = error instanceof Error ? error.message : String(error);
        return handleFailure(`Cannot cast to Uint8Array: Invalid Base64 string (${inputError})`);
      }
    }
    return handleFailure(`Cannot cast to Uint8Array: Invalid type (${typeof this.value})`);
  }

  private castToNumber(
    handleFailure: HandleFailure,
    options?: {
      readonly max?: number;
      readonly min?: number;
    },
  ): InputType<number> {
    const stringValue = String(this.value ?? '').trim();
    let numericValue = Number(stringValue);

    if (isNaN(numericValue) || !isFinite(numericValue)) {
      return handleFailure(`Cannot cast to number: Invalid value (${stringValue})`);
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

  private castToObject(handleFailure: HandleFailure): InputType<object> {
    if (isObjectLike(this.value) && !Array.isArray(this.value)) {
      return new InputType(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (isObjectLike(parsed) && !Array.isArray(parsed)) {
          return new InputType(parsed);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to object: Invalid type (${typeof this.value})`);
  }

  private castToString(): InputType<string> {
    let stringValue = String(this.value ?? '');
    if (this.value instanceof ArrayBuffer) {
      stringValue = uint8ArrayToBase64(new Uint8Array(this.value));
    } else if (this.value instanceof Uint8Array) {
      stringValue = uint8ArrayToBase64(this.value);
    } else if (isObjectLike(this.value)) {
      try {
        stringValue = JSON.stringify(this.value);
      } catch {}
    }
    return new InputType(stringValue);
  }
}
