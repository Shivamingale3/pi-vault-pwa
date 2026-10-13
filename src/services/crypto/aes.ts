// src/services/crypto/aes.ts
import type { Sealed } from "@/interfaces/props/app.props";
import { fromBase64, toBase64 } from "@/lib/encoding";
import { randomBytes } from "@/services/crypto/random";

export function createVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const iv = randomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv.buffer) };
}

export async function unseal(key: CryptoKey, sealed: Sealed): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(sealed.iv) },
    key,
    fromBase64(sealed.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}
