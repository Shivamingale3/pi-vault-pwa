// src/services/crypto/wrap.ts
import type { KdfParams, Sealed } from "@/interfaces/props/app.props";
import { fromBase64, toBase64 } from "@/lib/encoding";
import { seal, unseal } from "@/services/crypto/aes";
import { deriveWrappingKey } from "@/services/crypto/kdf";

// src/services/crypto/wrap.ts — add
import { normalizeRecoveryKey } from "@/services/crypto/random";

export async function wrapWithRecovery(
  vaultKey: CryptoKey,
  recoveryKey: string,
  kdf: KdfParams,
): Promise<string> {
  const key = await deriveWrappingKey(normalizeRecoveryKey(recoveryKey), kdf);
  const wrapped = await crypto.subtle.wrapKey("raw", vaultKey, key, "AES-KW");

  return toBase64(wrapped);
}

export async function unwrapWithRecovery(
  blob: string,
  recoveryKey: string,
  kdf: KdfParams,
): Promise<CryptoKey> {
  const key = await deriveWrappingKey(normalizeRecoveryKey(recoveryKey), kdf);

  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(blob),
    key,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function wrapWithPin(
  vaultKey: CryptoKey,
  pin: string,
  kdf: KdfParams,
  deviceKey: CryptoKey,
): Promise<Sealed> {
  const pinKey = await deriveWrappingKey(pin, kdf);
  const inner = await crypto.subtle.wrapKey("raw", vaultKey, pinKey, "AES-KW");

  return seal(deviceKey, toBase64(inner));
}

export async function unwrapWithPin(
  blob: Sealed,
  pin: string,
  kdf: KdfParams,
  deviceKey: CryptoKey,
): Promise<CryptoKey> {
  const inner = fromBase64(await unseal(deviceKey, blob));
  const pinKey = await deriveWrappingKey(pin, kdf);

  return crypto.subtle.unwrapKey(
    "raw",
    inner,
    pinKey,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}
