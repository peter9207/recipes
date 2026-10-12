/** UUID v7: 48-bit ms timestamp + random bits, so ids sort by creation time. */
export function newId(now: number = Date.now()): string {
  const bytes = new Uint8Array(new ArrayBuffer(16));
  randomFill(bytes);
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomFill(bytes: Uint8Array<ArrayBuffer>): void {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-crypto').getRandomValues(bytes);
}
