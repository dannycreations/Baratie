const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const length = cleanHex.length;

  if (length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(length / 2);
  for (let i = 0; i < length; i += 2) {
    const high = parseInt(cleanHex[i], 16);
    const low = parseInt(cleanHex[i + 1], 16);
    if (isNaN(high) || isNaN(low)) {
      throw new Error('Invalid hex string');
    }
    bytes[i / 2] = (high << 4) | low;
  }
  return bytes;
};

export const stringToUint8Array = (str: string): Uint8Array => {
  const cleanValue = str.trim();
  if (!cleanValue) {
    return new Uint8Array();
  }

  try {
    return hexToUint8Array(cleanValue);
  } catch {}

  try {
    return base64ToUint8Array(cleanValue);
  } catch {}

  return new TextEncoder().encode(str);
};

export const uint8ArrayToHex = (bytes: Uint8Array): string => {
  const length = bytes.length;
  const out = new Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = HEX_TABLE[bytes[i]];
  }
  return out.join('');
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const CHUNK_SIZE = 8192;
  const length = bytes.length;
  const chunks: string[] = [];

  for (let i = 0; i < length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }

  return btoa(chunks.join(''));
};
