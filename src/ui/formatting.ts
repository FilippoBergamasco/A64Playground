export function toHex(value: bigint | number, bitWidth: 8 | 16 | 32 | 64): string {
  const digits = bitWidth / 4;
  const mask = (1n << BigInt(bitWidth)) - 1n;
  const v = (BigInt(value) & mask).toString(16).padStart(digits, "0");
  return `0x${v}`;
}

export function toDecimal(value: bigint | number, bitWidth: 8 | 16 | 32 | 64, signed: boolean): string {
  const bits = BigInt(bitWidth);
  const mask = (1n << bits) - 1n;
  let v = BigInt(value) & mask;
  if (signed && v >= 1n << (bits - 1n)) {
    v -= 1n << bits;
  }
  return v.toString(10);
}

export type DataFormat = "hex" | "udec" | "sdec";

export function formatValue(value: bigint, bitWidth: 8 | 16 | 32 | 64, format: DataFormat): string {
  if (format === "hex") return toHex(value, bitWidth);
  if (format === "udec") return toDecimal(value, bitWidth, false);
  const dec = toDecimal(value, bitWidth, true);
  return dec.startsWith("-") ? dec : `+${dec}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function addressToHex(address: number): string {
  return `0x${address.toString(16).padStart(8, "0")}`;
}

export function bytesToLEBigInt(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(bytes[i]);
  }
  return v;
}

export function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
    .join("");
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
