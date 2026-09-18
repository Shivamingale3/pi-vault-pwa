# Phase 3 — Trust Store & Device Keys

**Goal:** the device can generate and persist its identity and sign with it. No
vault yet, no PIN yet.

**Depends on:** Phase 2.

**Produces:** a device that generates a key pair once, reuses it across reloads,
and signs a payload.

---

## The store

Plain IndexedDB via `idb-keyval`, its own database, separate from RxDB.

**Why not RxDB.** RxDB documents must be JSON. It validates against a schema and
hashes documents by serializing them. A `CryptoKey` has no serializable content
— `JSON.stringify(cryptoKey)` returns `{}`. Plain IndexedDB works because it
uses structured clone, which handles `CryptoKey` natively. A storage-layer
constraint, not a preference.

```ts
// src/trust/store.ts
import { createStore, get, set, del } from "idb-keyval";

const store = createStore("pidrive-trust", "trust");

export const TrustKeys = {
  devicePrivateKey: "device.private",
  deviceWrappingKey: "device.wrapping",
  vaultKeyPin: "vault.wrapped.pin",
  vaultKeyBiometric: "vault.wrapped.biometric",
  pinSalt: "pin.salt",
  pinIterations: "pin.iterations",
  deviceId: "device.id",
  setupState: "setup.state",
} as const;

export function trustGet<T>(key: string): Promise<T | undefined>;
export function trustSet(key: string, value: unknown): Promise<void>;
export function trustDel(key: string): Promise<void>;
export function trustClear(): Promise<void>;
```

Centralise the key names. Scattered string literals are how you end up writing
to `"device.privatekey"` and losing an evening.

---

## Device identity keys

```ts
// src/services/device-key.service.ts
export async function generateDeviceKeyPair(): Promise<CryptoKeyPair>;
export async function getDevicePrivateKey(): Promise<CryptoKey | undefined>;
export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey>;
export async function signPayload(payload: unknown): Promise<string>;
```

```ts
const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  false,                    // extractable: false — permanent, irreversible
  ["sign", "verify"]
);

await trustSet(TrustKeys.devicePrivateKey, keyPair.privateKey);   // the handle
const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
```

### What `extractable: false` means

`keyPair.privateKey` is **not bytes**. It is a handle — a reference to material
the browser holds internally. Log it and you get four metadata fields:

```
CryptoKey { type: "private", extractable: false, algorithm: {...}, usages: ["sign"] }
```

`JSON.stringify` on it returns `{}`. `exportKey()` throws `InvalidAccessError`.
There is no API, anywhere, that returns those bytes.

Signing happens **inside** the browser. You pass the handle in and get a
signature out; the key never crosses back into JavaScript. It is a stored
procedure, not a SELECT.

Mental model: a database connection object, not a database password.

The flag is set once at generation and cannot be changed later.

Store the handle directly — no `JSON.stringify`, no base64. IndexedDB stores the
object natively.

The public key is the opposite case: export it, send it, store it plaintext.
Wrapping a public key would break the only thing it is for.

---

## Signing

```ts
const signature = await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" },
  privateKey,
  new TextEncoder().encode(canonicalJson(payload))
);
```

**Canonicalisation matters.** The server re-serializes to verify. One byte of
difference in key order or whitespace and verification fails. Write a
`canonicalJson()` that sorts keys recursively and emits no whitespace, and use
the same algorithm on both sides. Full contract in Phase 6.

---

## Device wrapping key

The second non-extractable key. Phase 4 uses it; generate it here.

```ts
const wrappingKey = await crypto.subtle.generateKey(
  { name: "AES-KW", length: 256 },
  false,
  ["wrapKey", "unwrapKey"]
);
```

A non-extractable key can still *perform* wrapping. It just cannot be exported.

---

## Device ID

A ULID generated at setup, stored in the trust store, sent with registration.
Gives the server a stable handle without fingerprinting anything.

---

## Deliberately absent

- No backup of the private key. It cannot be exported and should not be. A
  device identity that can be copied elsewhere is not a device identity.
- No expiry, no session. Losing the key means this device registers a fresh pair
  on next login.

---

## Tests

- generate → store → read back → sign → verify with the exported public key
- `exportKey()` on the private key rejects
- setup called twice does not overwrite an existing key
- `trustClear()` empties the store
- `canonicalJson()` gives identical output for objects differing only in key
  order

`fake-indexeddb` covers storage; Node's Web Crypto satisfies `crypto.subtle`.

---

## Done when

1. First load generates a key pair; reload reuses the same one.
2. A signed payload verifies against the exported public key, in a test.
3. `exportKey()` on the private key throws.
4. Clearing site data produces a new, different key pair.
