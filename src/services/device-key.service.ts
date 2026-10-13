// src/services/device-key.service.ts
import { TrustKeys } from "@/constants/trust.constants";
import { trustGet, trustSet } from "@/lib/store";
import { ulid } from "ulid";
import { canonicalJson } from "@/lib/canonical-json";
import { toBase64 } from "@/lib/encoding";

// src/services/device-key.service.ts — add
export async function getDeviceWrappingKey(): Promise<CryptoKey | undefined> {
  return trustGet<CryptoKey>(TrustKeys.deviceWrappingKey);
}

export async function generateDeviceWrappingKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  await trustSet(TrustKeys.deviceWrappingKey, key);

  return key;
}

export async function signPayload(payload: unknown): Promise<string> {
  const privateKey = await getDevicePrivateKey();

  if (!privateKey) {
    throw new Error("This device has no identity key");
  }

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(canonicalJson(payload)),
  );

  return toBase64(signature);
}

export async function getDevicePrivateKey(): Promise<CryptoKey | undefined> {
  return trustGet<CryptoKey>(TrustKeys.devicePrivateKey);
}

export async function getDeviceId(): Promise<string | undefined> {
  return trustGet<string>(TrustKeys.deviceId);
}

export async function generateDeviceIdentity(): Promise<{
  deviceId: string;
  publicKeyJwk: JsonWebKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const deviceId = ulid();

  await trustSet(TrustKeys.devicePrivateKey, keyPair.privateKey);
  await trustSet(TrustKeys.deviceId, deviceId);

  return { deviceId, publicKeyJwk };
}
