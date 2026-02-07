const canonicalStringify = (obj: unknown, seen: Set<unknown>): string => {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  const type = typeof obj;
  if (type !== 'object') {
    if (type === 'function') {
      return '';
    }
    return JSON.stringify(obj);
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  try {
    if (Array.isArray(obj)) {
      const arrayString = obj
        .map((value) => {
          return canonicalStringify(value, seen);
        })
        .join(',');
      return `[${arrayString}]`;
    }

    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys
      .map((key) => {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === 'function') {
          return '';
        }
        return `${JSON.stringify(key)}:${canonicalStringify(value, seen)}`;
      })
      .filter(Boolean);

    return `{${pairs.join(',')}}`;
  } finally {
    seen.delete(obj);
  }
};

export const getObjectHash = (obj: object, namespace?: string): string => {
  const stringToHash = (namespace || '') + canonicalStringify(obj, new Set());
  let hash = 5381;

  for (let i = 0; i < stringToHash.length; i++) {
    hash = (hash * 33) ^ stringToHash.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
};

export const isObjectLike = (value?: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
};

export const shallowEqual = <T>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true;
  if (!isObjectLike(a) || !isObjectLike(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as any)[key], (b as any)[key])) {
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

export const isMapEqual = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
  valueEqual: (v1: V, v2: V) => boolean = (v1, v2) => Object.is(v1, v2),
): boolean => {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    const bValue = b.get(key);
    if (bValue === undefined && !b.has(key)) return false;
    if (!valueEqual(value, bValue as V)) return false;
  }
  return true;
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
