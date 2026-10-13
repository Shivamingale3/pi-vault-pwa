// src/services/crypto/random.ts
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford Base32

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function generateRecoveryKey(): string {
  const chars: string[] = [];
  const limit = 256 - (256 % ALPHABET.length);

  while (chars.length < 16) {
    for (const byte of randomBytes(32)) {
      if (byte >= limit) continue; // reject, redraw
      chars.push(ALPHABET[byte % ALPHABET.length]);
      if (chars.length === 16) break;
    }
  }

  return chars.join("").replace(/(.{4})(?=.)/g, "$1-");
}

export function normalizeRecoveryKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/-|\s/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}
