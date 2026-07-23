export function toHex(value: bigint | number, bitWidth: 32 | 64): string {
  const digits = bitWidth === 32 ? 8 : 16;
  const mask = bitWidth === 32 ? 0xffffffffn : 0xffffffffffffffffn;
  const v = (BigInt(value) & mask).toString(16).padStart(digits, "0");
  return `0x${v}`;
}

export function toDecimal(value: bigint | number, bitWidth: 32 | 64, signed: boolean): string {
  const bits = BigInt(bitWidth);
  const mask = (1n << bits) - 1n;
  let v = BigInt(value) & mask;
  if (signed && v >= 1n << (bits - 1n)) {
    v -= 1n << bits;
  }
  return v.toString(10);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function addressToHex(address: number): string {
  return `0x${address.toString(16).padStart(8, "0")}`;
}
