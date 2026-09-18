# Phase 1 — Project Setup

**Goal:** an empty but correctly wired React + TypeScript + Tailwind + shadcn
project with linting, path aliases, a testing harness, and the folder structure
every later phase will fill in.

**Depends on:** nothing.

**Produces:** a running dev server showing a single styled test page, and a
passing test suite.

---

## 1. Scaffold

```bash
npm create vite@latest pwa -- --template react-ts
cd pwa
npm install
```

### TypeScript version trap — read before continuing

The scaffold installs whatever `typescript` is current. If that is
**TypeScript 7**, `npm install` fails once `typescript-eslint` is added:

```
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint
```

TypeScript 7 is the Go-native rewrite. Its programmatic API is not stable until
7.1, and `typescript-eslint` reads that API. The fix is Microsoft's sanctioned
side-by-side arrangement:

```json
"devDependencies": {
  "@typescript/native": "npm:typescript@^7.0.2",
  "typescript": "npm:@typescript/typescript6@^6.0.2"
}
```

`tsc` resolves to TypeScript 7; the `typescript` package name resolves to the
6.0 API. Both work at once.

**Do not "clean this up" later.** Revisit only when 7.1 ships.

```bash
npx tsc --version    # 7.x
npx tsc6 --version   # 6.x
```

---

## 2. Dependencies

```bash
npm i tailwindcss @tailwindcss/vite
npm i -D @types/node

npm i rxdb idb-keyval
npm i ulid zod
npm i axios
npm i lucide-react motion

npm i @tiptap/react @tiptap/starter-kit \
      @tiptap/extension-task-list @tiptap/extension-task-item
```

There is **no crypto package**. All cryptography uses the browser's built-in
`crypto.subtle`. A JavaScript library cannot provide non-extractable keys — that
guarantee comes from the browser holding key material outside JavaScript.

---

## 3. Path alias

shadcn requires `@/` before its CLI will run.

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Add the same `baseUrl` and `paths` inside `tsconfig.app.json`'s existing
`compilerOptions`.

`vite.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
```

---

## 4. Tailwind and design tokens

Tailwind v4 has no `tailwind.config.ts`. Theme configuration lives in CSS.

Replace `src/index.css`:

```css
@import "tailwindcss";

@font-face {
  /* Plus Jakarta Sans 400–800 — self-hosted from public/fonts/.
     Never a CDN: no third-party origin on a page holding decrypted data. */
}

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --color-ink: #101010;
  --color-ink-surface: #0e0f11;
  --color-canvas: #e7e5e0;
  --color-surface: #ffffff;
  --color-surface-subtle: #f5f4f1;
  --color-border-subtle: #eceae5;
  --color-text-muted: #77746e;
  --color-text-faint: #a09d97;
  --color-icon-muted: #8d8a84;
  --color-on-ink: #fefefe;
  --color-error: #c23c1a;
  --color-error-bg: #fdeeea;
  --color-error-text: #8f2b12;

  --radius-input: 18px;
  --radius-card: 24px;
  --radius-pill: 30px;

  --shadow-primary: 0 10px 26px rgba(16, 16, 16, 0.18);
}

@keyframes rise    { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes spin    { to { transform: rotate(360deg) } }
@keyframes shake   { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(5px) } 60% { transform: translateX(-3px) } 80% { transform: translateX(2px) } }
@keyframes crawl   { 0% { transform: translateX(-100%) } 100% { transform: translateX(320%) } }
@keyframes breathe { 0%,100% { opacity: 1 } 50% { opacity: .5 } }

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 3px;
  border-radius: 8px;
}
```

These five keyframes and the reduced-motion block are lifted from the design
exports. `crawl` drives the sync progress bar; `breathe` marks the in-progress
row in the sync checklist.

**Self-host the font.** The design exports link Google Fonts — that is fine for
a design document, wrong for the app.

---

## 5. shadcn

```bash
npx shadcn@latest init
```

Base colour **Neutral**, CSS variables **yes**. The CLI detects Tailwind v4.

Add components only in the phase that first needs them. Unused component source
in the repo is dead code you now own.

---

## 6. Folder structure

```
src/
├── app/                 App shell, provider composition, routing
│   └── providers/       PwaGate, TrustProvider, VaultProvider, ErrorBoundary
├── components/
│   ├── ui/              shadcn (CLI-managed)
│   └── common/          shared hand-written components
├── screens/             one folder per screen area
├── contexts/            React contexts only — no logic
├── hooks/               React-facing API
├── services/            crypto + domain. THE ONLY LAYER THAT DECRYPTS
├── repositories/        persistence only — never touches keys
├── database/
│   └── schemas/         RxDB JSON schemas
├── trust/               idb-keyval trust store access
├── types/
├── validation/          Zod schemas
└── lib/
```

### The layering rule

```
screens / components
      ↓
    hooks
      ↓
   services        ← encryption and decryption live here, nowhere else
      ↓
 repositories      ← never touch keys
      ↓
     RxDB
```

Never skip a layer. Never import upward.

---

## 7. ESLint

```js
"no-restricted-imports": ["error", {
  patterns: [
    { group: ["**/repositories/*"],
      message: "Repositories are reached through services only." },
    { group: ["rxdb", "rxdb/*"],
      message: "RxDB imports belong in database/ and repositories/ only." },
  ],
}],
"no-restricted-globals": ["error", {
  name: "localStorage",
  message: "localStorage is forbidden. Use idb-keyval or RxDB.",
}],
```

Per-directory overrides let `database/` and `repositories/` import RxDB.

Rules beat memory. The `localStorage` ban is one a tired developer will
otherwise break at 1am.

---

## 8. Testing harness

```bash
npm i -D vitest @vitest/coverage-v8 jsdom \
         @testing-library/react @testing-library/user-event \
         @testing-library/jest-dom fake-indexeddb
```

`vitest.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
```

`fake-indexeddb` matters — jsdom has no IndexedDB, and from Phase 3 onward
almost everything touches it.

### What to test, and what not to

Test what is expensive to get wrong: crypto round-trips, repository queries,
conflict resolution, service encrypt/decrypt boundaries.

Do not test that React renders a heading. Do not chase a coverage number — it
measures lines executed, not correctness.

---

## 9. Principles for every later phase

**Dependencies point inward.** Services know about repositories; repositories
know nothing about services.

**Make illegal states unrepresentable.** Prefer a type that cannot express the
bad case over a runtime check. This is why services are constructed with a Vault
Key rather than checking for one.

**One reason to change per module.** If one file changes for two reasons, split
it.

**Name by role, not pattern.** `NoteRepository` is a role. `NoteManager`,
`NoteHelper`, `NoteUtils` are not.

**Errors are values at boundaries.** Unexpected failures throw to the
ErrorBoundary. Expected failures — wrong PIN, offline sync — are outcomes to
return.

**No secrets in logs, ever.** A `console.log` left in a service is a plaintext
vault in devtools.

---

## Done when

1. `npm run dev` serves a page using design tokens.
2. `npm run build` completes with no type errors.
3. `npm run lint` passes, and importing a repository from a screen fails it.
4. `npm run test` passes.
5. `npx tsc --version` reports 7.x.
6. Plus Jakarta Sans renders from `public/fonts/` with no font-CDN request in
   the Network tab.
