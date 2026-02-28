const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const len = cleanHex.length;

  if (len % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(len >>> 1);
  for (let i = 0; i < len; i += 2) {
    const high = parseInt(cleanHex[i], 16);
    const low = parseInt(cleanHex[i + 1], 16);
    if (Number.isNaN(high) || Number.isNaN(low)) {
      throw new Error('Invalid hex string');
    }
    bytes[i >>> 1] = (high << 4) | low;
  }
  return bytes;
};

const HEX_REGEX = /^(?:0x)?[0-9a-fA-F]+$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

export const stringToUint8Array = (str: string): Uint8Array => {
  const cleanValue = str.trim();
  const len = cleanValue.length;
  if (len === 0) {
    return new Uint8Array();
  }

  if (len % 2 === 0 && HEX_REGEX.test(cleanValue)) {
    try {
      return hexToUint8Array(cleanValue);
    } catch {
      // Not valid hex, continue
    }
  }

  if (len % 4 === 0 && BASE64_REGEX.test(cleanValue)) {
    try {
      return base64ToUint8Array(cleanValue);
    } catch {
      // Not valid base64, continue
    }
  }

  return new TextEncoder().encode(str);
};

export const uint8ArrayToHex = (bytes: Uint8Array): string => {
  const len = bytes.length;
  let out = '';
  for (let i = 0; i < len; i++) {
    out += HEX_TABLE[bytes[i]];
  }
  return out;
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const CHUNK_SIZE = 8192;
  const len = bytes.length;
  if (len <= CHUNK_SIZE) {
    return btoa(String.fromCharCode(...bytes));
  }
  let binary = '';
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
};
