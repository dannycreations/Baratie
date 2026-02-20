export const withCircularCache = <T, R>(fn: (value: T, cache: Set<unknown>) => R) => {
  const cache = new Set<unknown>();
  return (value: T): R => {
    try {
      return fn(value, cache);
    } finally {
      cache.clear();
    }
  };
};

const canonicalStringifyFn = (obj: unknown, seen: Set<unknown>): string => {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'function' ? '' : JSON.stringify(obj);
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    let res = '[';
    for (let i = 0; i < obj.length; i++) {
      if (i > 0) res += ',';
      res += canonicalStringifyFn(obj[i], seen);
    }
    return res + ']';
  }

  const keys = Object.keys(obj).sort();
  let res = '{';
  let first = true;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'function') continue;

    if (!first) res += ',';
    res += JSON.stringify(key) + ':' + canonicalStringifyFn(value, seen);
    first = false;
  }
  return res + '}';
};

const canonicalStringify = withCircularCache(canonicalStringifyFn);

export const getObjectHash = (obj: object, namespace?: string): string => {
  const stringToHash = (namespace || '') + canonicalStringify(obj);
  let hash = 5381;

  for (let i = 0; i < stringToHash.length; i++) {
    hash = (hash * 33) ^ stringToHash.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
};

export const isObjectLike = (value?: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const isNumber = (value: unknown): value is number => typeof value === 'number' && isFinite(value);

export const isString = (value: unknown): value is string => typeof value === 'string';

export const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
};

export const shallowEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true;
  if (!isObjectLike(a) || !isObjectLike(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const len = keysA.length;
  if (len !== keysB.length) return false;

  for (let i = 0; i < len; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || (a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }
  return true;
};

export const isSetEqual = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean => {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

export const isMapEqual = <K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>, valueEqual: (v1: V, v2: V) => boolean = Object.is): boolean => {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    const bValue = b.get(key);
    if (bValue === undefined && !b.has(key)) return false;
    if (!valueEqual(value, bValue as V)) return false;
  }
  return true;
};

export const isArrayEqual = <T>(
  a: ReadonlyArray<T> | undefined,
  b: ReadonlyArray<T> | undefined,
  itemEqual: (i1: T, i2: T) => boolean = Object.is,
): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, index) => itemEqual(item, b[index]));
};

export const toggleSetItem = <T>(set: ReadonlySet<T>, item: T, force?: boolean): Set<T> => {
  const nextSet = new Set(set);
  const shouldInclude = force ?? !nextSet.has(item);

  if (shouldInclude) {
    nextSet.add(item);
  } else {
    nextSet.delete(item);
  }
  return nextSet;
};

export const filterObject = <T extends object>(obj: T, predicate: (key: string, value: unknown) => boolean): Partial<T> => {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => predicate(key, value))) as Partial<T>;
};

export const pick = <T extends object, K extends keyof T>(obj: T, keys: ReadonlyArray<K>): Pick<T, K> => {
  const result = {} as Partial<T>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result as Pick<T, K>;
};
