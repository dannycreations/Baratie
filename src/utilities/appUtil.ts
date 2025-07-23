export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function isObjectLike(value?: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function canonicalStringify(obj: any, seen: Set<any>): string {
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

  let result: string;
  if (Array.isArray(obj)) {
    const arrStr = obj.map((v) => canonicalStringify(v, seen)).join(',');
    result = `[${arrStr}]`;
  } else {
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys
      .map((key) => {
        const val = obj[key];
        if (typeof val === 'function') {
          return '';
        }
        return `${JSON.stringify(key)}:${canonicalStringify(val, seen)}`;
      })
      .filter(Boolean);

    result = `{${pairs.join(',')}}`;
  }

  seen.delete(obj);
  return result;
}

export function getObjectHash(obj: object, namespace?: string): string {
  const str = (namespace || '') + canonicalStringify(obj, new Set());
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
