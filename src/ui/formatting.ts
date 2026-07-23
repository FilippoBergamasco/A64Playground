export function toHex(value: bigint | number, bitWidth: 8 | 32 | 64): string {
  const digits = bitWidth / 4;
  const mask = (1n << BigInt(bitWidth)) - 1n;
  const v = (BigInt(value) & mask).toString(16).padStart(digits, "0");
  return `0x${v}`;
}

export function toDecimal(value: bigint | number, bitWidth: 8 | 32 | 64, signed: boolean): string {
  const bits = BigInt(bitWidth);
  const mask = (1n << bits) - 1n;
  let v = BigInt(value) & mask;
  if (signed && v >= 1n << (bits - 1n)) {
    v -= 1n << bits;
  }
  return v.toString(10);
}

export type DataFormat = "hex" | "udec" | "sdec";

export function formatValue(value: bigint, bitWidth: 8 | 32 | 64, format: DataFormat): string {
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
