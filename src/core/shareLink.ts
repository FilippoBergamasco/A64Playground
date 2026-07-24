import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

const HASH_PREFIX = "#code=";

export function buildShareUrl(source: string): string {
  const encoded = compressToEncodedURIComponent(source);
  return `${location.origin}${location.pathname}${location.search}${HASH_PREFIX}${encoded}`;
}

export function readSourceFromLocation(): string | null {
  if (!location.hash.startsWith(HASH_PREFIX)) return null;
  const encoded = location.hash.slice(HASH_PREFIX.length);
  const source = decompressFromEncodedURIComponent(encoded);
  return source === "" || source === null ? null : source;
}
