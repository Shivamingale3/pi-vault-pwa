# Phase 2 — PWA Shell

**Goal:** the app is installable, refuses to run outside an installed PWA, and
has every non-content screen state built.

**Depends on:** Phase 1.

**Produces:** an installable app that shows the gate in a browser tab and a
splash when launched from the home screen.

---

## Why the gate exists

Safari deletes script-writable storage, IndexedDB included, after 7 days of no
visits. Sites installed to the home screen are exempt. Since the vault lives in
IndexedDB, an uninstalled Safari user loses everything after a week away.

This is data-loss prevention, not a stylistic choice.

---

## 1. Service worker

```bash
npm i -D vite-plugin-pwa
```

```ts
VitePWA({
  registerType: "prompt",
  manifest: {
    name: "PiDRIVE Vault",
    short_name: "PiDRIVE",
    display: "standalone",
    background_color: "#0e0f11",
    theme_color: "#0e0f11",
    icons: [/* 192, 512, maskable */],
  },
  workbox: { globPatterns: ["**/*.{js,css,html,woff2}"] },
})
```

`registerType: "prompt"` rather than `autoUpdate` — silently swapping app code
while a vault is unlocked is not something to do behind the user's back.

**Precache the app shell only.** Never cache API responses; RxDB owns freshness.

---

## 2. Install detection

```ts
// src/lib/pwa.ts
export function isInstalled(): boolean;
export function isIos(): boolean;
export function isInAppBrowser(): boolean;
```

- Installed: `window.matchMedia("(display-mode: standalone)").matches`, plus
  `navigator.standalone === true` for iOS Safari, which predates the standard.
- iOS has **no** `beforeinstallprompt`. The user must use Share → Add to Home
  Screen. There is no API to trigger it.
- In-app browsers (LinkedIn, WhatsApp, Instagram) block installation *and*
  WebAuthn, often silently. Detect and show a dedicated "open in your browser"
  message rather than a generic failure.

---

## 3. `PwaGate`

First thing rendered. Nothing else initialises until it passes.

| Condition | Screen |
| --- | --- |
| installed | render children |
| Android, installable | "Install PiDRIVE" + button wired to `beforeinstallprompt` |
| iOS Safari | Share → Add to Home Screen, illustrated |
| in-app browser | "Open in Safari/Chrome to continue" |
| desktop browser | install instructions for that browser |

Capture `beforeinstallprompt` in a `useEffect` and `preventDefault()` it, or the
browser shows its own banner and you lose control of the moment.

---

## 4. Persistent storage

```ts
export async function requestPersistence(): Promise<boolean>;
```

`navigator.storage.persist()`, called once immediately after the gate passes. It
asks the browser not to evict your data under disk pressure. It can be refused;
refusal is not fatal.

`navigator.storage.estimate()` is worth exposing — the media phase will want it.

---

## 5. State screens

Build these now as pure presentational components. Later phases only compose
them.

```
src/screens/states/
├── splash.tsx        brand mark (π on ink, 46px, 16px radius), PI.LOCAL label
├── loading.tsx       ring spinner + message
├── empty.tsx         icon, message, optional action
├── error.tsx         recoverable — message + retry
└── fatal.tsx         unrecoverable — e.g. IndexedDB unavailable
```

Every one takes props and holds no state. A screen that fetches is a screen you
cannot reuse.

Match the design exports: the π mark on `#101010` with a `PI.LOCAL` mono label
below in `#a09d97`, letter-spacing `0.22em`.

**Fatal is not hypothetical.** IndexedDB genuinely does not exist in Firefox
private browsing and under some Safari configurations.

---

## 6. ErrorBoundary

Must be a class — React has no hook equivalent for `componentDidCatch`.

Renders `fatal.tsx` on catch. **Do not log the error object anywhere it could
include decrypted data** — a thrown error from a service can carry a record.

---

## 7. Composition

```tsx
<ErrorBoundary>
  <PwaGate>
    {/* TrustProvider — Phase 8 */}
    {/* VaultProvider — Phase 9 */}
    <Splash />
  </PwaGate>
</ErrorBoundary>
```

---

## Tests

- `isInstalled()` across display-mode and `navigator.standalone` combinations
- `PwaGate` renders the right branch per platform
- `ErrorBoundary` catches a throwing child
- state screens render their props

Mock `matchMedia` in setup — jsdom does not implement it.

---

## Done when

1. Served over HTTPS or localhost, the browser offers to install.
2. As a normal tab, the gate blocks with correct per-platform copy.
3. From the home screen, the gate passes and the splash renders.
4. `navigator.storage.persisted()` returns true after first run on Chrome.
5. Airplane mode + installed app still loads the shell.
