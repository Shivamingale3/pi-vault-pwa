# PiDRIVE Vault — Decision Log

Living record of locked architectural and product decisions.
Once every section is locked, this file is the project context for development.

Status legend:
- **LOCKED** — settled, do not revisit without an explicit decision to reopen
- **OPEN** — still under discussion
- **DEFERRED** — intentionally postponed, tracked as future scope

> **There is no existing code.** An earlier spike validating RxDB was discarded.
> The application is written from scratch against this document.

---

## Section 1 — Project Description — LOCKED

PiDRIVE Vault is a secure, offline-first password and notes vault built as a
Progressive Web App (PWA). The PWA is the only client, now and later.

### Purpose

1. Personal vault for a small closed group (~3–5 people)
2. Learning vehicle
3. Portfolio/resume showcase demonstrating offline-first architecture

### Responsibility split

**Client** owns: local vault operation, local persistence, all cryptography,
offline-first behaviour.

**Server** is a dumb encrypted-data store. Its only jobs:
- account and authentication APIs
- device public key registry
- storage of the recovery-wrapped Vault Key
- sync push/pull of encrypted vault records

The server never receives keys or plaintext and cannot decrypt anything. A full
server breach yields ciphertext only.

The server exists for **durability** — the vault survives the client being wiped
from the user's device. It is not a business-logic tier and performs no
per-record CRUD on meaningful data.

### Product shape

- One account, one vault
- Multiple devices per account, required from day one
- Notes and passwords are two separate RxDB collections
- Registration is closed; accounts are created manually
- First run requires network; after that the vault is fully usable offline

### Multi-device onboarding

A new device obtains the Vault Key by the user entering the **Recovery Key**,
which unwraps the blob pulled from the server.

Consequences:
- The Recovery Key is a **routine-use** item, not break-glass only.
- No per-device *encryption* key pair is required; the ECDSA signing pair is
  sufficient, since device-to-device key wrapping is not used.

### Threat model

Defending against:
1. Server operator or server database breach
2. Stolen unlocked device
3. Malicious browser extension or XSS on the page

Order of work: **build first, harden second.** Hardening is a deliberate later
phase, not skipped.

Known limitation for the hardening phase: hostile JavaScript running inside the
app's origin while the vault is unlocked can *use* the live key regardless of
non-extractability. Mitigation is blast-radius reduction (strict CSP, no
third-party scripts, minimal dependencies, lock on hide), not elimination.

### Deferred — future scope

- **Guest/demo user** — single active device session, ~1 day lifetime, full
  feature demo for recruiters. Mechanism undecided.
- **Media phase** — server-stored, internet-dependent. Encryption approach
  undecided. (Appears in the sync designs as a "Media index" row.)
- **Private vault** — second PIN, separate folder tree.
- **XSS hardening specifics** — CSP, dependency minimisation.

---

## Section 2 — Core Technology Stack — LOCKED

### Frontend

| Concern | Choice |
| --- | --- |
| UI | React 19 |
| Language | TypeScript 7 (Go-native compiler) |
| Build | Vite 8 |
| Optimisation | React Compiler (auto-memoises; no hand-written `useMemo`/`useCallback`) |
| Styling | Tailwind v4 + shadcn/ui |
| Validation | Zod 4 |
| IDs | ULID |
| HTTP | axios |
| Rich text | TipTap |
| Motion | Motion + `tailwindcss-animate` |
| Icons | lucide-react; Iconify where colour is wanted |

### Client database

```
RxDB
  ↓
Dexie storage adapter
  ↓
IndexedDB
```

RxDB is the application-facing client database layer. Application code must not
use raw IndexedDB APIs for vault data.

A direct `dexie` package is **not** installed and not required —
`rxdb/plugins/storage-dexie` bundles what it needs, and raw Dexie queries are
forbidden by the architecture.

**Free / open-source RxDB only — hard constraint.** No premium packages.

Consequence: RxDB's encryption plugin is premium, therefore **vault encryption
is hand-rolled with Web Crypto at the service layer**.

### Backend

Python · FastAPI · PostgreSQL · SQLAlchemy

### Zod's role

Form/user input validation and any boundary needing strict types, including
build-time env validation. Zod does **not** replace RxDB's collection JSON
schema; the two coexist at different layers.

### TanStack Query — REJECTED (twice)

Rejected as an API cache: server data is sync-only and RxDB is the local
database, so there is no server-state cache worth maintaining.

Rejected again as a decryption cache — see Section 7.

### TypeScript 7 — the alias is deliberate, do not "clean it up"

`package.json` intentionally contains:

```json
"@typescript/native": "npm:typescript@^7.0.2",
"typescript": "npm:@typescript/typescript6@^6.0.2"
```

Microsoft's sanctioned side-by-side arrangement. It gives simultaneously:
- `tsc` → real TypeScript 7 (Go-native, 8–12x faster) for builds
- the `typescript` package name → the TypeScript 6.0 API that tooling reads

**Why it cannot be removed yet.** TypeScript 7's programmatic API is not stable
until 7.1. `typescript-eslint` uses that API and publishes a peer range of
`>=4.8.4 <6.1.0`, excluding TS 7 entirely. Removing the alias produces:

```
npm error ERESOLVE unable to resolve dependency tree
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint
```

`--force` / `--legacy-peer-deps` is not a workaround — install succeeds, then
ESLint crashes inside `typescript-estree`. A TS 7.0.2 support issue was filed
against typescript-eslint on GA day (8 July 2026) and closed as "not planned".

**Revisit when TypeScript 7.1 ships.**

Separate note: TypeScript 7 makes `strict` the default, so previously-hidden
type errors surface on first build. This is desirable.

### Rejected dependency

**`dotenv`** — a Node.js package that reads `.env` from disk via `fs` and writes
to `process.env`. It cannot run in a browser. Vite's native `loadEnv` covers
build-time needs. If the FastAPI backend wants equivalent behaviour that is
Python's `python-dotenv`, unrelated to this package.

### Client env var rule

Vite only exposes `VITE_`-prefixed variables via `import.meta.env`, and anything
exposed that way is **baked into the shipped bundle and readable by anyone**.
No secret may ever live in a `VITE_` variable. Non-sensitive configuration only.

---

## Section 3 — Current Packages — DROPPED

Merged into Section 2. A hand-maintained package list goes stale on the next
`npm install`; `package.json` is the source of truth for versions. Only the
rationale was worth keeping.

---

## Section 4 — Application Architecture — LOCKED

### Layers

```
React components
      ↓
React hooks          (useNotes)
      ↓
Services             (encrypt / decrypt, domain logic)
      ↓
Repositories         (persistence only — never touch crypto)
      ↓
RxDB
      ↓
Dexie storage → IndexedDB
```

Rules:
- Repositories deal in data and the database only. They never encrypt, decrypt,
  or hold keys.
- Services are the **only** layer that performs cryptography.
- Components never see RxDB types and never see ciphertext.

### Composition root — `AppDatabase`

Creates the RxDB instance, registers collections, constructs repositories, wraps
them in services, and exposes **only services**.

The `RxDatabase` instance and the repositories are both **private**. A public
`RxDatabase` would let any component call `db.database.notes.find(...)` and
bypass both the repository and encryption.

`AppDatabase.create()` is singleton-safe (cached promise) — React StrictMode
double-invokes effects in development and two RxDB instances on one database
name is an error.

### Reactive reads

Services expose their own observables. A service `findAll$()` pipes the
repository's RxDB stream through decryption and emits plaintext domain objects.
Hooks subscribe to the **service**, never to the repository.

Decryption is async, so the pipe needs `concatMap` rather than `map`, preserving
emission order.

### Lock behaviour

When the vault locks, the Vault Key leaves memory and decryption becomes
impossible. Service streams stop emitting and the UI falls to the lock screen.

### Encryption boundary

| Encrypted | Plaintext |
| --- | --- |
| `title`, `content`, password payloads | `id`, `createdAt`, `updatedAt` |

Titles are encrypted deliberately. A plaintext title leaks as much as the secret
itself ("HDFC net banking", "AWS root account") and would break Section 1's
guarantee that a server breach yields ciphertext only.

Consequences that must be respected everywhere:
1. **No index on any encrypted field.** Only date fields remain indexable.
2. **Search is in-memory after decryption.** No RxDB query can filter or sort on
   title or content.
3. **Equality matching on encrypted fields is impossible.** AES-GCM with a fresh
   IV means identical plaintext produces different ciphertext every time — not
   merely slow, it cannot work.

### Schema validation

**Always on**, development and production, via RxDB's Ajv validator wrapping the
Dexie storage. Without a validator wrapper RxDB does not enforce the schema at
runtime.

### Folder layout

Crypto and domain services share `services/`.

---

## Section 5 — React Database Integration — LOCKED

### Provider stack

```
ErrorBoundary
  └── PwaGate                installed PWA? if not: "Only PWA allowed"
        └── TrustProvider    trust store read, persist() requested,
                             account session, device identity key,
                             PIN + biometric verification,
                             unwraps the Vault Key
              └── VaultProvider   receives the Vault Key, opens the RxDB
                                  vault database, builds services
                    └── App
```

**There is no DatabaseProvider.** The RxDB vault database is opened by
VaultProvider *after* unlock, not at app start — before unlock every record in
it is ciphertext and no Vault Key exists. The trust store needs no provider: it
is plain IndexedDB read directly by TrustProvider.

### Responsibility split

**TrustProvider** owns everything trust-related and hands the raw Vault Key
down. **VaultProvider** performs no crypto verification; it receives the key and
constructs services.

Trust decides *whether you get in*. Vault decides *what you can do once in*.

### Service construction — built only after unlock

`AppDatabase` builds only RxDB and repositories. It exposes a factory:

```ts
AppDatabase.createServices(vaultKey)
```

VaultProvider calls it on unlock and **drops the services on lock**, which tears
down their RxDB subscriptions and decryption caches in one step.

**Why this shape.** A service cannot be constructed without a Vault Key, so
"locked" is unrepresentable rather than handled — TypeScript enforces the rule
instead of developer discipline. Rejected alternatives:

- *A mutable key holder* filled on unlock. "Locked" becomes a runtime throw;
  nothing prevents calling a service before unlock.
- *Passing the key to every method.* Forces hooks and components to hold the
  Vault Key, against the goal that it lives in one place. Also fits observables
  badly — a stream needs the key at subscribe time, not per call.

`useNoteService()` throws outside an unlocked vault.

### Screens

No provider renders bare `null` while initialising. States: splash, loading,
empty, error, fatal.

### Error handling

An ErrorBoundary sits above the whole tree with a real error UI. IndexedDB is
genuinely unavailable in Firefox private browsing and under some Safari storage
restrictions. For an offline-first vault that is fatal and needs an explicit
message, not a white screen.

---

## Section 6 — RxDB Usage & Storage Layout — LOCKED

### Two separate stores

**Trust store** — plain IndexedDB via `idb-keyval`, its own database. Holds the
device identity private key handle, device wrapping key handle, PIN-wrapped and
biometric-wrapped Vault Key blobs, salts and iteration counts. Must be readable
**before** unlock.

**Why not RxDB — a hard constraint, not a preference.** RxDB documents must be
JSON; it validates against a schema and hashes documents by serializing them. A
`CryptoKey` has no serializable content — `JSON.stringify(cryptoKey)` returns
`{}`. Plain IndexedDB works because structured clone supports `CryptoKey`
natively. RxDB sits on IndexedDB but imposes the JSON constraint that breaks it.

**Vault database** — RxDB, encrypted vault records, opened only after unlock.
Side benefit: it can be dropped and rebuilt during recovery without touching
device keys.

### Record shape — one encrypted blob per record

```
{
  id, createdAt, updatedAt,             ← plaintext, queryable
  payload: { ciphertext, iv }           ← everything secret, one lump
}
```

Consequences:
- Adding or changing a secret field never touches the RxDB schema.
- An attacker sees one opaque blob per record — no field structure, no per-field
  length hints.
- All-or-nothing decryption. **Accepted.**

Per-field encryption was rejected: its only gain is selective decryption, worth
little when the list view needs every title anyway, and it costs an IV per
field, a schema field per secret field, and leaked value lengths.

### Migrations — never migrate encrypted content

RxDB runs migrations at **database open**, which is before unlock, when no Vault
Key exists. A migration that needs to decrypt is impossible.

The single-blob shape removes the problem: schema changes can only involve
plaintext metadata. The payload carries its own `v` field **inside** the
encrypted JSON, upgraded lazily on decrypt.

### Querying

Only `id` and timestamps are queryable. Every list view: fetch sorted by date →
decrypt in memory → filter in JavaScript. **Accepted at this scale.**

---

## Section 7 — React Hooks — LOCKED

### Consolidated domain hooks

```
useNotes({ search })
├── data
├── loading
├── error
├── getById()
├── create()
├── update()
└── remove()
```

No `useCreateNote` / `useUpdateNote` split — that multiplies into a hook per
operation per domain for no benefit.

### Hook return shape

`{ data, loading, error }` alongside operations. `loading` is **initial load
only** — true before the first emission, false thereafter. Mutations do not
toggle it; the reactive stream re-emits when a write lands.

### Search

`useNotes({ search })`. **The service performs the filtering**, since it owns
the cache of decrypted records. **No debounce** — with the cache warm it is an
in-memory array filter.

### Decryption cache

A plain `Map` held **as a field on the service**:

```ts
private cache = new Map<string, DecryptedNote>();   // key: `${id}:${updatedAt}`
```

A changed record gets a new `updatedAt`, so its key changes and only that record
is re-decrypted. Without this, every stream emission re-decrypts every record,
since any single write re-emits the whole list.

**Unbounded.** Lifetime is the service's lifetime — dropped on lock, so there is
no clear-cache call that can be forgotten.

### TanStack Query — rejected a second time

1. **It does not memoize per record.** It caches query *results*; one list query
   means one entry, so changing one record re-decrypts the whole list. Per-record
   behaviour needs `useQueries` with `['note', id, updatedAt]` keys — substantial
   machinery for what a `Map` does in ten lines.
2. **Push/pull mismatch.** TanStack pulls; RxDB pushes. Bridging means calling
   `setQueryData` per emission, at which point it is a `Map` minus the features
   being paid for.
3. **It survives lock.** The `queryClient` lives in React above the services and
   holds **decrypted vault data**. Without an explicit `clear()` on every lock
   path, plaintext remains in memory. The service-owned `Map` cannot have this
   bug.

### Trust hooks

`useTrust()` — `isUnlocked`, `unlock()`, `lock()`, `changePin()`,
`registerDevice()`, `recoveryKey`. Provisional; will be revised during
implementation.

---

## Section 8 — Offline-First Architecture — LOCKED

### What requires network

Only two things:
1. **New device login / setup** — authentication, device registration, fetching
   the recovery-wrapped Vault Key.
2. **Sync** — RxDB replication push/pull.

Everything else works offline indefinitely, **including daily unlock** — the
wrapped blob, salts and iterations are local, and the device wrapping key is in
the browser.

### No sessions, no expiry

There is **no session concept**. Authentication is per-request payload signing
with the device private key, verified against the registered public key. Nothing
expires, so an offline device never degrades. **Offline duration is unlimited.**

> **OPEN — replay protection.** With no session the server needs a way to reject
> a captured signed request being replayed. Resolved in the auth phase as a
> timestamp window plus a nonce cache.

### No per-operation online checks

Application code must never contain `if (navigator.onLine) { await api.post() }`
for vault mutations. Writes go to RxDB; replication moves them later.

### Boot sequence

```
app load
  → PWA installed? no → "Only PWA allowed" screen, stop
  → yes → splash
       → read trust store
       → is this device set up?  no → account login + setup flow
       → yes → unlock screen (biometric primary, PIN fallback)
            → unlock → open RxDB vault database → build services
                 → app
```

The PWA check is the **first** thing on load.

### Auto-lock

**Trigger: page hidden only. No timer of any kind.** On mobile this is partly
reinforced for free — backgrounding a PWA often gets the tab discarded.

**Lock discards unsaved form state.** Preserving it would mean plaintext vault
data surviving the lock.

**Re-unlock** uses biometric if configured, PIN fallback.

> **OPEN — idle-while-visible.** With hidden-only triggering, an app left open
> and untouched stays unlocked. On a phone the screen sleeps and the PWA hides;
> on desktop it does not. Deliberately left open; revisit after v1.

---

## Section 9 — Synchronization — LOCKED

### Architecture

```
                 PWA
                  │
                 RxDB
              ┌───┴───┐
           Local   Replication
           state       │ HTTP (signed requests)
              │        ▼
          IndexedDB  FastAPI
                       │
                   PostgreSQL
```

The backend does **not** run RxDB. It implements the HTTP contract RxDB
replication expects — push/pull with checkpoints.

**What syncs: vault records only.** The recovery-wrapped blob is uploaded once
during setup and is not part of replication.

### Deletion — permanent, no recycle bin

Deletion is **immediate and permanent**, guarded by a confirmation dialog only.
No trash, no undo, no `deletedAt` field on vault records.

### Tombstones

On permanent delete the row is **not** removed. It is kept flagged
`_deleted: true` with the **encrypted payload stripped** — a few dozen bytes
carrying nothing sensitive.

**Why they are required — the resurrection problem:**

```
Day 1    phone, laptop, tablet all have note X
Day 2    phone deletes X; server and laptop drop it
         tablet is offline, hears nothing
Day 180  tablet syncs: "I have X, you don't — take it"
         → X resurrects everywhere
```

The tablet is not malfunctioning: pushing records the server lacks is exactly
what sync does. Without a marker it cannot distinguish "deleted while I was
away" from "new, never seen".

**Tombstones are kept indefinitely.** Purging reopens the window for any device
offline longer than the retention period. (Same problem distributed databases
solve with retention windows — Cassandra's `gc_grace_seconds`.)

### Conflict resolution — last write wins

Highest `updatedAt` wins. **No conflict UI, no conflicts collection, no warning,
no duplicate copies.** The loser is discarded.

Resolution is necessarily **client-side**: the server sees only ciphertext and
cannot merge or inspect. "Server always wins" was never available.

### When sync runs

| Trigger | Blocking? |
| --- | --- |
| App open, if online | **Yes** — full-screen loader |
| Manual button in settings | **Yes** — full-screen loader |
| After a local write, if online | No — silent background push |

**Offline means no sync, so the app opens normally.** **Timeout: 60 seconds**,
then proceed offline with a notice. **Failure never blocks entry.**

### Rejected: blocking the app until sync completes unconditionally

It would break Section 8's guarantee — no connectivity means sync cannot run,
leaving the app blocked, and a server outage would prevent every user from
opening a vault sitting decryptable on their own device. It also undercuts the
portfolio purpose: an offline-first app that will not start without its server
is the first thing a reviewer would question.

---

## Key & Crypto Architecture — LOCKED

Supersedes the original Sections 11–20.

### Ground rule

All cryptography uses **browser-native Web Crypto** (`crypto.subtle`). No npm
crypto packages. A JavaScript library *cannot* offer non-extractable keys,
because that guarantee comes from the browser holding key material outside
JavaScript. A library is JavaScript.

### The secrets

| Secret | Generated | On client | On server |
| --- | --- | --- | --- |
| PIN (6 digits) | by user | never stored | never |
| PIN-derived key | derived at each unlock | memory only | never |
| Vault Key (AES-256-GCM) | client, random | encrypted blob | encrypted blob (recovery copy) |
| Recovery Key (16 chars) | client, random | never stored | never |
| Device identity pair (ECDSA P-256) | client | private: non-extractable handle | public: plaintext JWK |
| Device wrapping key (AES) | client | non-extractable handle | never |

### Why the Vault Key is encrypted twice

```
vault key
   ↓ encrypt with PIN-derived key      (inner — guessable secret)
   ↓ encrypt with device wrapping key  (outer — unguessable secret)
blob stored in IndexedDB
```

Unlock reverses it: the device key removes the outer layer automatically, then
the typed PIN removes the inner layer.

**Order is mandatory and must not be reversed.** AES-GCM fails loudly on a wrong
key, so a correct guess announces itself. With the PIN layer outermost, an
attacker holding a stolen database could brute-force the PIN and *know* when
they hit it — they still could not open the vault, but they would have learned a
PIN the user probably reuses elsewhere. With the device layer outermost, every
attempt fails identically and the PIN never leaks.

Guessable secret innermost. Unguessable secret outermost.

### Why the device wrapping key is necessary

The KDF salt and iteration count are stored in **plaintext** beside the blob —
they must be, since the app needs them to reproduce the key. An attacker with a
database dump has everything the KDF needs except the PIN.

A 6-digit PIN is 1,000,000 possibilities. At ~0.3s per PBKDF2 attempt that is
~3.5 days on one CPU and a few **hours** on a consumer GPU in parallel. "Not
stored" does not mean "not obtainable".

The device wrapping key is random, `extractable: false`, and never written as
bytes. A stolen database therefore contains a blob whose outer layer cannot be
attacked at all, and the brute-force loop never runs.

The two keys cover two different thefts:
- **Device key** defeats a stolen disk or database copy.
- **PIN** defeats a stolen *unlocked device*.

### Non-extractable keys — what they are

`crypto.subtle.generateKey(..., extractable: false, ...)` returns a `CryptoKey`
that is a **handle**, not bytes. The real material lives in the browser's
internal store.

- `exportKey()` and `wrapKey()` **throw** on such a key.
- The handle stores directly in IndexedDB — structured clone supports
  `CryptoKey` natively. No serialization, no base64.
- It survives reload, app close, and reboot.
- Signing and wrapping happen **inside** the browser; the key never crosses back
  into JavaScript.

Mental model: a database *connection object*, not a database *password*. You can
use it; you cannot read the secret out of it.

Honest limit: this defeats JavaScript-level theft, including XSS. It is not an
absolute guarantee against an attacker with full OS access to the browser
profile directory.

### Device identity key pair

- ECDSA P-256 + SHA-256, `extractable: false`.
- Private half: handle in IndexedDB. **Never wrapped, never backed up, never
  sent to the server** — it cannot be, and should not be.
- Public half: exported as JWK, stored **plaintext** on the server. Wrapping it
  would break the only thing it exists for; a public key can only verify.
- Device loss = key loss = that device's session ends. A new device generates a
  fresh pair and registers it.

### Three wrapped copies of the Vault Key

| Copy | Opened by | Stored | Purpose |
| --- | --- | --- | --- |
| Biometric | WebAuthn PRF-derived key | client | primary unlock |
| PIN | PIN key, then device key | client | fallback unlock |
| Recovery | recovery-key-derived key | server | new device / wiped storage |

The **recovery copy is deliberately single-wrapped** — no device layer. It must
open on a fresh device that has no device key.

### Key derivation

**PBKDF2-HMAC-SHA-256 for both the PIN and the Recovery Key.** Argon2id is
stronger against GPU attacks but needs a WASM dependency on the most
security-critical path, conflicting with the minimal-dependency stance.
Deferred to hardening.

HKDF was considered for the Recovery Key and **rejected**: HKDF assumes input
already strong (~128+ bits). A 16-character Crockford Base32 key is ~80 bits —
not brute-forceable, but below that line.

Every wrap uses a unique random salt, stored plaintext beside the blob.

### PIN

- **6 digits.**
- **Not stored in any form — no hash.** Verification is attempting the unwrap;
  AES integrity checking means a wrong PIN fails. A stored hash would be an
  extra attackable artifact for no benefit.
- PIN change re-wraps the local blob only; the server's recovery copy is
  untouched.

### Recovery Key

- 16 characters, Crockford Base32 (A–Z + 0–9 minus I, L, O, U) — ~80 bits.
- Displayed as `XXXX-XXXX-XXXX-XXXX`.
- Generated **on the client**, wrapping done **on the client**; only the blob is
  uploaded. The server never sees the key.
- Shown once at setup.
- **Routine-use item** — required for every new device.
- Protects the Vault Key only. Nothing else has a recovery path.

### Biometric unlock (WebAuthn PRF)

Biometric is the **primary** unlock path; PIN is the fallback.

- Android has the broadest PRF support; Google Password Manager passkeys include
  it by default.
- Apple: works with iCloud Keychain platform passkeys via Face ID / Touch ID in
  Safari 18+. **Requires iCloud Keychain enabled** — feature-detect and fall
  back silently.
- PRF does not work with roaming authenticators on iOS.
- Data encrypted with a PRF-derived key is bound to that passkey; losing the
  passkey locks that copy permanently. Biometric can never be the only path in.
- Many in-app browsers block WebAuthn entirely, with no clear error.

**There is no biometric screen to design** — the OS renders its own prompt and
it cannot be overridden. The PIN screen is the fallback, with a biometric
re-trigger button.

### Storage durability

- `navigator.storage.persist()` is called during init. Prevents automatic
  eviction under disk pressure; does not prevent deliberate deletion.
- **Safari deletes script-writable storage, IndexedDB included, after 7 days of
  no visits** — sites installed to the home screen are exempt. Primary
  justification for the PWA-only gate.

### PWA-only gate

The app refuses to run outside an installed PWA. First screen states "Only PWA
allowed" with install instructions.

- Any installed PWA qualifies, desktop or mobile. Mobile is the design target.
- Android Chrome exposes `beforeinstallprompt`; iOS Safari has no install API —
  per-platform instruction screens required.
- **Recruiters and demo users must install too.** Deliberate: the PWA install is
  part of what the portfolio piece demonstrates.

### What the server never receives

The PIN. The PIN-derived key. The Vault Key in plaintext. The Recovery Key. Any
private key. The device wrapping key.

The server holds: account data, device **public** keys in plaintext, one
recovery-wrapped Vault Key blob it cannot open, and encrypted vault records.

---

## Design System — LOCKED

Source: `docs/designs/*.dc.html`. Those files are the visual source of truth.

### Typography

- **Plus Jakarta Sans**, weights 400–800 (self-hosted, not from a CDN)
- `ui-monospace` for numerals, countdowns, and tracked labels
- Tight tracking on headings: `-0.03em` to `-0.035em`

### Colour

| Token | Value | Use |
| --- | --- | --- |
| ink | `#101010` | primary text, primary buttons |
| ink-surface | `#0e0f11` | dark panels, success overlays |
| canvas | `#e7e5e0` | design canvas background |
| surface | `#ffffff` | screen background (light) |
| surface-subtle | `#f5f4f1` | inputs, cards, panels |
| border-subtle | `#eceae5` | card and input borders |
| text-muted | `#77746e` | body copy |
| text-faint | `#a09d97` / `#a3a19c` | labels, placeholders |
| icon-muted | `#8d8a84` | input icons |
| on-ink | `#fefefe` / `#fdfdfd` | text on dark |
| error | `#c23c1a` | error accent (rust) |
| error-bg | `#fdeeea` | error banner background |
| error-text | `#8f2b12` | error banner text |

Both light and dark themes exist throughout.

### Geometry

- Inputs: 58px tall, 18px radius, 1.5px border
- Primary buttons: 60px tall, fully pilled (30px radius)
- Cards / panels: 24–26px radius
- Small controls: 12–19px radius
- Primary button shadow: `0 10px 26px rgba(16,16,16,0.18)`
- Device frames: 402 × 874

### Motion

Keyframes in the designs: `rise`, `spin`, `shake`, `crawl`, `breathe`. All
wrapped in `@media (prefers-reduced-motion: reduce)` — **carry this into the
build**.

Libraries: **Motion** for transitions, `tailwindcss-animate` for shadcn's
built-ins.

### Focus

`outline: 2px solid #101010; outline-offset: 3px` on `:focus-visible`.

---

## Design Reconciliation — LOCKED

The designs were produced before these decisions were locked. Resolutions:

| Conflict | Resolution |
| --- | --- |
| Biometric unlock had no screen | **No conflict.** The prompt is OS-native and cannot be overridden. The PIN screen *is* the fallback, with a biometric re-trigger. |
| Design: forgot-password via 6-digit email OTP. Locked: Recovery Key | **Both.** OTP recovers the **account password** on the server; the Recovery Key recovers the **vault**. Neither replaces the other. |
| Design: permanent delete. Locked: recycle bin | **Permanent delete wins.** Recycle bin dropped. |
| Escalating lockouts 30s → 5m → 1h | **Kept for both login and PIN.** For login this is a real server control. For the PIN it is a **deterrent against a stolen phone**, not a defence against a database dump — an attacker with the data never runs the app. Documented so it is not mistaken for cryptographic protection. |
| Private vault — second PIN, separate folder tree | **Deferred to phase 2.** |
| Login screen had "Create an account" | **Removed.** Registration is closed. |
| Copy: "the app reads the vault straight from it" | **Copy rewritten.** The vault is read from local RxDB, never from the server directly. |
| Rich text notes (bold, lists, checkboxes) | **In scope** — TipTap. |
| No sync UI designed | **Designed** — `PiDrive Sync.dc.html`, six screens. |

### Sync screens as designed

1. **Syncing** — blocking, ring spinner with percentage, per-collection progress
   (Passwords ✓ 42, Notes 7 of 12, Media index waiting), crawl progress bar,
   "Keep the app open."
2. **Sync failed** — "Couldn't reach your server", explains the vault still
   works, shows last-synced time and pending change count.
3. **Sync timed out** — variant for the 60s limit.
4. **Offline** — quiet status pill, not an interruption.
5. **Settings › Sync** — last synced, status, "Sync now".
6. **Sync complete** — brief dark success state.

Note the designs include a **Media index** row in sync progress. Media is
deferred; the row is a placeholder for phase 2.

---

## Section 21 — Implementation Status — REMOVED

The application is written from scratch against this document. Build order lives
in `docs/phase-*.md`.

---

## Section 22 — Architectural Rules — LOCKED

### Layering

- RxDB is the local vault source of truth.
- Hooks → services → repositories → RxDB. Never skip a layer.
- Services are the **only** layer that performs cryptography.
- Repositories never encrypt, decrypt, or hold keys.
- RxDB types never reach React components.
- `AppDatabase` exposes only services; repositories and the `RxDatabase`
  instance stay private.
- Services cannot be constructed without a Vault Key.

### Cryptography

- Web Crypto only. No npm crypto packages.
- All cryptography is client-side.
- The PIN is never stored — not plaintext, **not even hashed**.
- Wrap order is fixed: **PIN key inner, device key outer.** Never reverse it.
- The device private key is never wrapped, never backed up, never sent to the
  server.
- The device public key is stored plaintext and never wrapped.
- The Recovery Key never reaches the server.
- The Vault Key never reaches the server **in plaintext**; the recovery-wrapped
  blob does, by design.
- The backend cannot decrypt vault contents.
- No new security secrets unless genuinely required.

### Storage

- Trust material never goes in RxDB — `CryptoKey` cannot survive JSON
  serialization.
- No sensitive secrets in `localStorage`.
- No indexes on encrypted fields.
- Encrypted content is never migrated.
- Plaintext vault data and the live Vault Key exist only in memory, only while
  unlocked.
- No decrypted-data cache outlives the service that owns it.

### Offline and sync

- Application CRUD never depends on network availability.
- No per-operation `navigator.onLine` checks.
- RxDB replication handles synchronization; application code never pushes
  mutations manually.
- Sync failure or absence never blocks entry to the vault.
- Tombstones carry no payload.

### Honesty

- Never claim more security than is provided. Device revocation is not remote
  wipe. PIN lockout does not protect against a database dump. An account
  password change does not rotate vault encryption.

---

## Still to design

- **Media architecture** — phase 2, server-stored, internet-dependent.
- **Guest / demo user** — single active device session, ~1 day lifetime.
- **Private vault** — second PIN, separate folder tree.
- **Idle-while-visible auto-lock** — see the OPEN note in Section 8.
