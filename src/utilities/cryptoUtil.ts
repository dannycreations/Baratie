const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

const textEncoder = new TextEncoder();

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length >>> 1);

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i >>> 1] = (parseInt(cleanHex[i], 16) << 4) | parseInt(cleanHex[i + 1], 16);
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
    return hexToUint8Array(cleanValue);
  }

  if (len % 4 === 0 && BASE64_REGEX.test(cleanValue)) {
    try {
      return base64ToUint8Array(cleanValue);
    } catch {
      // Not valid base64, continue
    }
  }

  return textEncoder.encode(str);
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
