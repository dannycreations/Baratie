function canonicalStringify(obj: unknown, seen: ReadonlySet<unknown>): string {
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

  const newSeen = new Set(seen).add(obj);

  if (Array.isArray(obj)) {
    const arrayString = obj
      .map((value) => {
        return canonicalStringify(value, newSeen);
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
      return `${JSON.stringify(key)}:${canonicalStringify(value, newSeen)}`;
    })
    .filter(Boolean);

  return `{${pairs.join(',')}}`;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function getObjectHash(obj: object, namespace?: string): string {
  const stringToHash = (namespace || '') + canonicalStringify(obj, new Set());
  let hash = 5381;

  for (let i = 0; i < stringToHash.length; i++) {
    hash = (hash * 33) ^ stringToHash.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
}

export function isObjectLike(value?: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const length = bytes.byteLength;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
