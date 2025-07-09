export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function debounce<A extends unknown[], R>(
  func: (...args: A) => R,
  delay: number,
): ((...args: A) => void) & {
  cancel: () => void;
  flush: (...args: A) => R;
} {
  let timeoutId: number | null = null;

  const debounced = function (this: unknown, ...args: A): void {
    debounced.cancel();
    timeoutId = window.setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = function (this: unknown, ...args: A): R {
    debounced.cancel();
    return func.apply(this, args);
  };

  return debounced;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
