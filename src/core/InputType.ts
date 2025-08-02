import { base64ToUint8Array, hexToUint8Array, isObjectLike, uint8ArrayToBase64, uint8ArrayToHex } from '../utilities/appUtil';

import type { PanelControlConfig, PanelCustomConfig } from './IngredientRegistry';

interface InputTypeMap {
  array: Array<unknown>;
  arraybuffer: ArrayBuffer;
  base64: string;
  boolean: boolean;
  bytearray: Uint8Array;
  hex: string;
  number: number;
  object: object;
  string: string;
}

type InputDataType = keyof InputTypeMap;

type InputRenderProps = Omit<PanelControlConfig, 'config'> & Omit<PanelCustomConfig, 'mode'>;

type HandleFailure = <T>(e?: string) => InputType<T>;

export class InputType<T = unknown> {
  public readonly value: T;
  public readonly panelControl?: PanelControlConfig;
  public readonly warningMessage?: string | null;

  public constructor(value: T, panelControl?: PanelControlConfig, warning?: string | null) {
    this.value = value;
    this.panelControl = panelControl;
    this.warningMessage = warning;
  }

  public cast<T = unknown>(type: 'array', options?: { readonly value?: Array<T> }): InputType<Array<T>>;
  public cast(type: 'arraybuffer', options?: { readonly value?: ArrayBuffer }): InputType<ArrayBuffer>;
  public cast(type: 'base64', options?: { readonly value?: string }): InputType<string>;
  public cast(type: 'boolean', options?: { readonly value?: boolean }): InputType<boolean>;
  public cast(type: 'bytearray', options?: { readonly value?: Uint8Array }): InputType<Uint8Array>;
  public cast(type: 'hex', options?: { readonly value?: string }): InputType<string>;
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

  private castToArray(handleFailure: HandleFailure): InputType<Array<unknown>> {
    if (Array.isArray(this.value)) {
      return new InputType(this.value, this.panelControl, this.warningMessage);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (Array.isArray(parsed)) {
          return new InputType(parsed, this.panelControl, this.warningMessage);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to array: Invalid type (${typeof this.value})`);
  }

  private castToArrayBuffer(handleFailure: HandleFailure): InputType<ArrayBuffer> {
    if (this.value instanceof ArrayBuffer) {
      return new InputType(this.value, this.panelControl, this.warningMessage);
    }
    if (this.value instanceof Uint8Array) {
      return new InputType(
        this.value.buffer.slice(this.value.byteOffset, this.value.byteOffset + this.value.byteLength),
        this.panelControl,
        this.warningMessage,
      );
    }
    if (typeof this.value === 'string') {
      const cleanValue = this.value.trim();
      try {
        return new InputType(hexToUint8Array(cleanValue).buffer, this.panelControl, this.warningMessage);
      } catch {
        try {
          return new InputType(base64ToUint8Array(cleanValue).buffer, this.panelControl, this.warningMessage);
        } catch {
          const encoder = new TextEncoder();
          return new InputType(encoder.encode(this.value).buffer, this.panelControl, this.warningMessage);
        }
      }
    }
    return handleFailure(`Cannot cast to ArrayBuffer: Invalid type (${typeof this.value})`);
  }

  private castToBase64(handleFailure: HandleFailure): InputType<string> {
    if (this.value instanceof Uint8Array) {
      return new InputType(uint8ArrayToBase64(this.value), this.panelControl, this.warningMessage);
    }
    if (this.value instanceof ArrayBuffer) {
      return new InputType(uint8ArrayToBase64(new Uint8Array(this.value)), this.panelControl, this.warningMessage);
    }
    if (typeof this.value === 'string') {
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(this.value);
      return new InputType(uint8ArrayToBase64(utf8Bytes), this.panelControl, this.warningMessage);
    }
    return handleFailure(`Cannot cast to Base64: Invalid type (${typeof this.value})`);
  }

  private castToBoolean(handleFailure: HandleFailure): InputType<boolean> {
    if (typeof this.value === 'boolean') {
      return new InputType(this.value, this.panelControl, this.warningMessage);
    }
    const stringValue = String(this.value ?? '')
      .trim()
      .toLowerCase();
    switch (stringValue) {
      case 'true':
      case '1':
        return new InputType(true, this.panelControl, this.warningMessage);
      case 'false':
      case '0':
      case '':
        return new InputType(false, this.panelControl, this.warningMessage);
      default:
        return handleFailure(`Cannot cast to boolean: Ambiguous value (${String(this.value)})`);
    }
  }

  private castToByteArray(handleFailure: HandleFailure): InputType<Uint8Array> {
    if (this.value instanceof Uint8Array) {
      return new InputType(this.value, this.panelControl, this.warningMessage);
    }
    if (this.value instanceof ArrayBuffer) {
      return new InputType(new Uint8Array(this.value), this.panelControl, this.warningMessage);
    }
    if (typeof this.value === 'string') {
      const cleanValue = this.value.trim();
      try {
        return new InputType(hexToUint8Array(cleanValue), this.panelControl, this.warningMessage);
      } catch {
        try {
          return new InputType(base64ToUint8Array(cleanValue), this.panelControl, this.warningMessage);
        } catch {
          const encoder = new TextEncoder();
          return new InputType(encoder.encode(this.value), this.panelControl, this.warningMessage);
        }
      }
    }
    return handleFailure(`Cannot cast to Uint8Array: Invalid type (${typeof this.value})`);
  }

  private castToHex(handleFailure: HandleFailure): InputType<string> {
    if (this.value instanceof Uint8Array) {
      return new InputType(uint8ArrayToHex(this.value), this.panelControl, this.warningMessage);
    }
    if (this.value instanceof ArrayBuffer) {
      return new InputType(uint8ArrayToHex(new Uint8Array(this.value)), this.panelControl, this.warningMessage);
    }
    if (typeof this.value === 'string') {
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(this.value);
      return new InputType(uint8ArrayToHex(utf8Bytes), this.panelControl, this.warningMessage);
    }
    return handleFailure(`Cannot cast to Hex: Invalid type (${typeof this.value})`);
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
    return new InputType(numericValue, this.panelControl, this.warningMessage);
  }

  private castToObject(handleFailure: HandleFailure): InputType<object> {
    if (isObjectLike(this.value) && !Array.isArray(this.value)) {
      return new InputType<object>(this.value, this.panelControl, this.warningMessage);
    }
    if (typeof this.value === 'string') {
      try {
        const parsed = JSON.parse(this.value);
        if (isObjectLike(parsed) && !Array.isArray(parsed)) {
          return new InputType(parsed, this.panelControl, this.warningMessage);
        }
      } catch {}
    }
    return handleFailure(`Cannot cast to object: Invalid type (${typeof this.value})`);
  }

  private castToString(): InputType<string> {
    const toUtf8OrHex = (data: Uint8Array): string => {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(data);
      } catch {
        return uint8ArrayToHex(data);
      }
    };

    if (this.value instanceof ArrayBuffer) {
      return new InputType(toUtf8OrHex(new Uint8Array(this.value)), this.panelControl, this.warningMessage);
    }
    if (this.value instanceof Uint8Array) {
      return new InputType(toUtf8OrHex(this.value), this.panelControl, this.warningMessage);
    }
    if (isObjectLike(this.value)) {
      try {
        return new InputType(JSON.stringify(this.value), this.panelControl, this.warningMessage);
      } catch {}
    }
    return new InputType(String(this.value ?? ''), this.panelControl, this.warningMessage);
  }
}
