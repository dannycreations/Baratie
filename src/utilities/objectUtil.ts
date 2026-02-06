function canonicalStringify(obj: unknown, seen: Set<unknown>): string {
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
}

export function getObjectHash(obj: object, namespace?: string): string {
  const stringToHash = (namespace || '') + canonicalStringify(obj, new Set());
  let hash = 5381;

  for (let i = 0; i < stringToHash.length; i++) {
    hash = (hash * 33) ^ stringToHash.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
}

export function isObjectLike(value?: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toggleSetItem<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const nextSet = new Set(set);
  if (nextSet.has(item)) {
    nextSet.delete(item);
  } else {
    nextSet.add(item);
  }
  return nextSet;
}
