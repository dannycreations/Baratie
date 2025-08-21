import { stringToUint8Array, uint8ArrayToBase64, uint8ArrayToHex } from '../utilities/cryptoUtil';
import { isObjectLike } from '../utilities/objectUtil';

import type { PanelControlConfig, PanelCustomConfig } from './IngredientRegistry';

interface InputTypeMap {
  readonly array: ReadonlyArray<unknown>;
  readonly arraybuffer: ArrayBuffer;
  readonly base64: string;
  readonly boolean: boolean;
  readonly bytearray: Uint8Array;
  readonly hex: string;
  readonly number: number;
  readonly object: object;
  readonly string: string;
}

type InputDataType = keyof InputTypeMap;

type InputRenderProps = Omit<PanelControlConfig, 'config'> & Omit<PanelCustomConfig, 'mode'>;

type HandleFailure = <T>(e?: string) => InputType<T>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export class InputType<T = unknown> {
  public readonly value: T;
  // @internal
  public readonly panelControl?: PanelControlConfig;
  // @internal
  public readonly warningMessage?: string | null;

  public constructor(value: T, panelControl?: PanelControlConfig, warning?: string | null) {
    this.value = value;
    this.panelControl = panelControl;
    this.warningMessage = warning;
  }

  public cast<T = unknown>(type: 'array', options?: Readonly<{ value?: ReadonlyArray<T> }>): InputType<ReadonlyArray<T>>;
  public cast(type: 'arraybuffer', options?: Readonly<{ value?: ArrayBuffer }>): InputType<ArrayBuffer>;
  public cast(type: 'base64', options?: Readonly<{ value?: string }>): InputType<string>;
  public cast(type: 'boolean', options?: Readonly<{ value?: boolean }>): InputType<boolean>;
  public cast(type: 'bytearray', options?: Readonly<{ value?: Uint8Array }>): InputType<Uint8Array>;
  public cast(type: 'hex', options?: Readonly<{ value?: string }>): InputType<string>;
  public cast(type: 'number', options?: Readonly<{ max?: number; min?: number; value?: number }>): InputType<number>;
  public cast(type: 'object', options?: Readonly<{ value?: object }>): InputType<object>;
  public cast(type: 'string', options?: Readonly<{ value?: string }>): InputType<string>;
  public cast(
    type: InputDataType,
    options?: Readonly<{
      max?: number;
      min?: number;
      value?: unknown;
    }>,
  ): InputType<unknown> {
    const handleFailure = <U>(e?: string): InputType<U> => {
      if (typeof options?.value !== 'undefined') {
        return new InputType(options.value as U, this.panelControl, this.warningMessage);
      }
      throw new Error(e);
    };

    switch (type) {
      case 'array':
        return this.castToArray(handleFailure);
      case 'arraybuffer':
        return this.castToArrayBuffer(handleFailure);
      case 'base64':
        return this.castToBase64(handleFailure);
      case 'boolean':
        return this.castToBoolean(handleFailure);
      case 'bytearray':
        return this.castToByteArray(handleFailure);
      case 'hex':
        return this.castToHex(handleFailure);
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

  public get type(): InputDataType {
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

  public update<U>(newValue: U): InputType<U> {
    return new InputType(newValue, this.panelControl, this.warningMessage);
  }

  public render(panelControl: InputRenderProps): InputType<T> {
    const panelInstruction: PanelControlConfig = {
      panelType: panelControl.panelType,
      providerId: panelControl.providerId,
      config: {
        mode: 'custom',
        title: panelControl.title,
        actions: panelControl.actions,
        content: panelControl.content,
      },
    };

    return new InputType(this.value, panelInstruction, this.warningMessage);
  }

  public warning(message?: string): InputType<T> {
    return new InputType(this.value, this.panelControl, message || null);
  }

  // @internal
  private castToArray(handleFailure: HandleFailure): InputType<ReadonlyArray<unknown>> {
    if (Array.isArray(this.value)) {
      return this.cloneValue(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (Array.isArray(parsed)) {
          return this.cloneValue(parsed);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to array: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToArrayBuffer(handleFailure: HandleFailure): InputType<ArrayBuffer> {
    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(this.value);
    }
    if (this.value instanceof Uint8Array) {
      return this.cloneValue(this.value.slice().buffer);
    }
    if (typeof this.value === 'string') {
      return this.cloneValue(stringToUint8Array(this.value).slice().buffer);
    }
    return handleFailure(`Cannot cast to ArrayBuffer: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToBase64(handleFailure: HandleFailure): InputType<string> {
    if (this.value instanceof Uint8Array) {
      return this.cloneValue(uint8ArrayToBase64(this.value));
    }
    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(uint8ArrayToBase64(new Uint8Array(this.value)));
    }
    if (typeof this.value === 'string') {
      const utf8Bytes = textEncoder.encode(this.value);
      return this.cloneValue(uint8ArrayToBase64(utf8Bytes));
    }
    return handleFailure(`Cannot cast to Base64: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToBoolean(handleFailure: HandleFailure): InputType<boolean> {
    if (typeof this.value === 'boolean') {
      return this.cloneValue(this.value);
    }
    const stringValue = String(this.value ?? '')
      .trim()
      .toLowerCase();
    switch (stringValue) {
      case 'true':
      case '1':
        return this.cloneValue(true);
      case 'false':
      case '0':
      case '':
        return this.cloneValue(false);
      default:
        return handleFailure(`Cannot cast to boolean: Ambiguous value (${String(this.value)})`);
    }
  }

  // @internal
  private castToByteArray(handleFailure: HandleFailure): InputType<Uint8Array> {
    if (this.value instanceof Uint8Array) {
      return this.cloneValue(this.value);
    }
    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(new Uint8Array(this.value));
    }
    if (typeof this.value === 'string') {
      return this.cloneValue(stringToUint8Array(this.value));
    }
    return handleFailure(`Cannot cast to Uint8Array: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToHex(handleFailure: HandleFailure): InputType<string> {
    if (this.value instanceof Uint8Array) {
      return this.cloneValue(uint8ArrayToHex(this.value));
    }
    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(uint8ArrayToHex(new Uint8Array(this.value)));
    }
    if (typeof this.value === 'string') {
      const utf8Bytes = textEncoder.encode(this.value);
      return this.cloneValue(uint8ArrayToHex(utf8Bytes));
    }
    return handleFailure(`Cannot cast to Hex: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToNumber(
    handleFailure: HandleFailure,
    options?: Readonly<{
      max?: number;
      min?: number;
    }>,
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
    return this.cloneValue(numericValue);
  }

  // @internal
  private castToObject(handleFailure: HandleFailure): InputType<object> {
    if (isObjectLike(this.value) && !Array.isArray(this.value)) {
      return this.cloneValue<object>(this.value);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (isObjectLike(parsed) && !Array.isArray(parsed)) {
          return this.cloneValue(parsed);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to object: Invalid type (${typeof this.value})`);
  }

  // @internal
  private castToString(): InputType<string> {
    const toUtf8OrHex = (data: Uint8Array): string => {
      try {
        return textDecoder.decode(data);
      } catch {
        return uint8ArrayToHex(data);
      }
    };

    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(toUtf8OrHex(new Uint8Array(this.value)));
    }
    if (this.value instanceof Uint8Array) {
      return this.cloneValue(toUtf8OrHex(this.value));
    }
    if (isObjectLike(this.value)) {
      try {
        return this.cloneValue(JSON.stringify(this.value));
      } catch {}
    }
    return this.cloneValue(String(this.value ?? ''));
  }

  // @internal
  private cloneValue<U>(newValue: U): InputType<U> {
    return new InputType(newValue, this.panelControl, this.warningMessage);
  }
}
