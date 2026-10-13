// src/services/crypto/kdf.ts
import type { KdfParams } from "@/interfaces/props/app.props";
import { randomBytes } from "@/services/crypto/random";

const DEFAULT_ITERATIONS = 600_000;

export function defaultKdfParams(): KdfParams {
  return { salt: randomBytes(16), iterations: DEFAULT_ITERATIONS };
}

export async function deriveWrappingKey(
  secret: string,
  params: KdfParams,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: params.salt,
      iterations: params.iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}
