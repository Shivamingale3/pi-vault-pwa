# Phase 13 — Client Replication

**Goal:** RxDB replication wired to the FastAPI endpoints, with last-write-wins
conflict resolution and the blocking sync UI.

**Depends on:** Phase 12.

**Produces:** a vault that syncs.

---

## Replication handler

```ts
// src/services/replication.service.ts
import { replicateRxCollection } from "rxdb/plugins/replication";

export function startReplication(
  collection: RxCollection,
  name: "notes" | "passwords"
): RxReplicationState<VaultRecord, Checkpoint>;
```

```ts
replicateRxCollection({
  collection,
  replicationIdentifier: `pidrive-${name}`,
  live: false,                 // triggered, not continuous
  retryTime: 5_000,
  push: {
    batchSize: 50,
    async handler(rows) {
      const { data } = await api.post(`/sync/${name}/push`, { rows });
      return data.conflicts;             // RxDB resolves these locally
    },
  },
  pull: {
    batchSize: 50,
    async handler(checkpoint, limit) {
      const { data } = await api.post(`/sync/${name}/pull`, { checkpoint, limit });
      return { documents: data.documents, checkpoint: data.checkpoint };
    },
  },
});
```

`live: false` because sync is triggered — app open, after a write, or the manual
button.

**Pull runs before push.** RxDB does this by design: pushing without pulling
first means your `assumedMasterState` is stale and the server rejects
everything, costing a round trip to learn what you could have asked for.

The push handler **returns** conflicts rather than throwing. Returning means
"you handle these"; throwing means "the request failed" and retries the same
doomed push.

---

## Conflict handler

```ts
const conflictHandler: RxConflictHandler<VaultRecord> = {
  isEqual: (a, b) => a.updatedAt === b.updatedAt,
  resolve: ({ realMasterState, newDocumentState }) =>
    newDocumentState.updatedAt > realMasterState.updatedAt
      ? newDocumentState
      : realMasterState,
};
```

Last write wins by `updatedAt`. No UI, no conflicts collection, no duplicates.
The loser is discarded silently.

Resolution is necessarily client-side — the server sees only ciphertext.
"Server always wins" was never available.

Accepted consequence: an edit made on two devices while both were offline loses
one version with no warning. Sync on app open keeps drift small enough that this
is rare.

Note the handler compares the **envelope**, not the payload. It never needs the
Vault Key, which is why it can be a plain object rather than a service.

---

## When sync runs

| Trigger | Blocking |
| --- | --- |
| App open, if online | **Yes** — full-screen loader |
| Manual button in settings | **Yes** — full-screen loader |
| After a local write, if online | No — silent background push |

**Offline means no sync, so the app opens normally.** The loader appears only
when sync actually runs.

**Timeout: 60 seconds.** Past that, proceed offline with a sync-failed notice
rather than trapping the user behind a loader.

**Failure never blocks entry.** Server error, signature rejection, network drop
— show it, let them in. The vault is on their device and works.

---

## SyncProvider

```ts
export interface SyncContextValue {
  status: "idle" | "syncing" | "synced" | "failed" | "offline";
  lastSyncedAt: string | null;
  progress: Record<string, { done: number; total: number }> | null;
  pendingUploads: number;
  syncNow(): Promise<void>;
}
```

Lives inside `VaultProvider` — replication needs both the collections and the
Vault Key's lifetime. On lock, replication stops with everything else.

`navigator.onLine` plus `online`/`offline` events for connectivity. Note it only
reports whether there is *a* network, not whether your server is reachable —
treat it as a hint and let the request failing be the real answer.

---

## Screens — match the design exports

`PiDrive Sync.dc.html` specifies six:

1. **Syncing** — blocking. Ring spinner with a percentage in the centre, then a
   per-collection checklist: completed rows get a filled check and a count
   ("Passwords · 42"), the in-progress row gets an outlined circle with the
   `breathe` animation and "7 of 12", pending rows are greyed with "waiting". A
   4px progress bar underneath using the `crawl` animation. Footer: "Keep the
   app open. This usually takes a few seconds."
2. **Sync failed** — "Couldn't reach your server", `PI.LOCAL · NO ANSWER` in the
   error colour, copy explaining the vault still works and changes go up next
   time. A panel showing last-synced time and pending upload count. Actions:
   "Continue offline" primary, "Try again" secondary.
3. **Sync timed out** — variant for the 60s limit.
4. **Offline** — a quiet status pill, not an interruption.
5. **Settings › Sync** — last synced, status, "Sync now".
6. **Sync complete** — brief dark success state.

```
src/screens/sync/
├── syncing.tsx
├── sync-failed.tsx
├── sync-timeout.tsx
├── sync-complete.tsx
└── components/
    ├── collection-progress.tsx
    └── sync-status-pill.tsx
```

The per-collection progress needs real counts. RxDB emits `received$` and
`sent$` — count from those. A spinner with no numbers looks frozen after ten
seconds.

The designs include a **Media index** row. Media is deferred; render the row
only when that phase exists, or leave it out for now.

---

## Ordering with unlock

```
unlock → open vault database → build services → start replication
       → if online: blocking sync → app
       → if offline: straight to app
```

Replication cannot start before the database exists, and the database does not
exist before unlock. Sync therefore always happens after the vault is open —
fine, since everything syncing is ciphertext anyway.

---

## Tests

Use a mock server, not the real API.

- push sends unsynced local docs
- pull writes remote docs into the collection
- a conflict resolves to the higher `updatedAt`
- a tombstone pulled in removes the local record
- **a tombstone pulled in does not get pushed back as a new record** — the
  resurrection test
- timeout after 60s proceeds offline — fake timers
- failure leaves the vault usable
- offline start performs no request at all
- **two rounds of sync converge two simulated clients**

The convergence test is the real proof: two collections, divergent edits, sync
both, assert identical state.

---

## Done when

1. Two browsers, same account, sync and converge.
2. Deleting on one device deletes on the other and stays deleted.
3. Offline edits sync on next app open.
4. Airplane mode opens the app with no loader and no error.
5. A stopped server shows the failure screen and still lets the user in.
6. The sync loader shows real per-collection progress.
