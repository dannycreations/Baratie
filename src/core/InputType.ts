import { stringToUint8Array, uint8ArrayToBase64, uint8ArrayToHex } from '../utilities/cryptoUtil';
import { clamp, isObjectLike } from '../utilities/objectUtil';

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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

const toUtf8OrHex = (data: Uint8Array): string => {
  try {
    return textDecoder.decode(data);
  } catch {
    return uint8ArrayToHex(data);
  }
};

const castFail = (val: unknown, target: string, options?: Readonly<{ value?: unknown }>): never => {
  if (typeof options?.value !== 'undefined') {
    return options.value as never;
  }
  throw new Error(`Cannot cast to ${target}: Invalid type (${typeof val})`);
};

export class InputType<T = unknown> {
  public readonly value: T;
  public readonly panelControl?: PanelControlConfig;
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
    switch (type) {
      case 'array':
        return this.castToArray(options);
      case 'arraybuffer':
        return this.castToArrayBuffer(options);
      case 'base64':
        return this.castToBase64(options);
      case 'boolean':
        return this.castToBoolean(options);
      case 'bytearray':
        return this.castToByteArray(options);
      case 'hex':
        return this.castToHex(options);
      case 'number':
        return this.castToNumber(options);
      case 'object':
        return this.castToObject(options);
      case 'string':
        return this.castToString();
      default: {
        const unhandled = String(type);
        return this.cloneValue(castFail(this.value, unhandled, options));
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

  private castToArray(options?: Readonly<{ value?: unknown }>): InputType<ReadonlyArray<unknown>> {
    if (Array.isArray(this.value)) {
      return this.cloneValue(this.value);
    }
    const parsed = this.tryParseJson();
    if (Array.isArray(parsed)) {
      return this.cloneValue(parsed);
    }
    return this.cloneValue(castFail(this.value, 'array', options));
  }

  private castToArrayBuffer(options?: Readonly<{ value?: unknown }>): InputType<ArrayBuffer> {
    if (this.value instanceof ArrayBuffer) {
      return this.cloneValue(this.value);
    }
    try {
      const bytes = this.asUint8Array();
      return this.cloneValue(bytes.buffer as ArrayBuffer);
    } catch {
      return this.cloneValue(castFail(this.value, 'ArrayBuffer', options));
    }
  }

  private castToBase64(options?: Readonly<{ value?: unknown }>): InputType<string> {
    try {
      const bytes = typeof this.value === 'string' ? textEncoder.encode(this.value) : this.asUint8Array();
      return this.cloneValue(uint8ArrayToBase64(bytes));
    } catch {
      return this.cloneValue(castFail(this.value, 'Base64', options));
    }
  }

  private castToBoolean(options?: Readonly<{ value?: unknown }>): InputType<boolean> {
    const val = this.value;
    if (typeof val === 'boolean') {
      return this.cloneValue(val);
    }
    if (val === null || val === undefined || val === 0 || val === '') {
      return this.cloneValue(false);
    }
    if (val === 1) {
      return this.cloneValue(true);
    }

    const str = String(val).trim().toLowerCase();
    if (str === 'true' || str === '1') return this.cloneValue(true);
    if (str === 'false' || str === '0' || str === '') return this.cloneValue(false);

    return this.cloneValue(castFail(val, 'boolean', options));
  }

  private castToByteArray(options?: Readonly<{ value?: unknown }>): InputType<Uint8Array> {
    try {
      return this.cloneValue(this.asUint8Array());
    } catch {
      return this.cloneValue(castFail(this.value, 'Uint8Array', options));
    }
  }

  private castToHex(options?: Readonly<{ value?: unknown }>): InputType<string> {
    try {
      const bytes = typeof this.value === 'string' ? textEncoder.encode(this.value) : this.asUint8Array();
      return this.cloneValue(uint8ArrayToHex(bytes));
    } catch {
      return this.cloneValue(castFail(this.value, 'Hex', options));
    }
  }

  private castToNumber(
    options?: Readonly<{
      max?: number;
      min?: number;
      value?: unknown;
    }>,
  ): InputType<number> {
    const val = this.value;
    let num: number;

    if (typeof val === 'number') {
      num = val;
    } else if (typeof val === 'boolean') {
      num = val ? 1 : 0;
    } else {
      num = Number(val);
    }

    if (!Number.isFinite(num)) {
      return this.cloneValue(castFail(val, 'number', options));
    }

    const { min, max } = options || {};
    return this.cloneValue(clamp(num, min, max));
  }

  private castToObject(options?: Readonly<{ value?: unknown }>): InputType<object> {
    if (isObjectLike(this.value) && !Array.isArray(this.value)) {
      return this.cloneValue<object>(this.value);
    }
    const parsed = this.tryParseJson();
    if (isObjectLike(parsed) && !Array.isArray(parsed)) {
      return this.cloneValue(parsed);
    }
    return this.cloneValue(castFail(this.value, 'object', options));
  }

  private castToString(): InputType<string> {
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

  private tryParseJson(): unknown {
    if (typeof this.value === 'string') {
      try {
        return JSON.parse(this.value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private asUint8Array(): Uint8Array {
    if (this.value instanceof Uint8Array) {
      return this.value;
    }
    if (this.value instanceof ArrayBuffer) {
      return new Uint8Array(this.value);
    }
    if (typeof this.value === 'string') {
      return stringToUint8Array(this.value);
    }
    throw new Error('Not binary data');
  }

  private cloneValue<U>(newValue: U): InputType<U> {
    return new InputType(newValue, this.panelControl, this.warningMessage);
  }
}
