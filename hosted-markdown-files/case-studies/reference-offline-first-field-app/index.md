# Reference: Offline-First Field App

A composite reference for **offline-first field operations** - utility inspections, warehouse audits, or municipal asset surveys. Technicians capture photos, GPS fixes, and checklist answers without reliable connectivity. Stack: **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, **React 19.2.3**.

Highlights / Reference: Offline-First Field App

* SQLite is source of truth on device - TanStack Query mirrors server snapshots where online
* Outbox table replays mutations with Idempotency-Key on reconnect
* Background tasks flush outbox - foreground NetInfo reconnect remains primary
* Rugged Android (Zebra, Honeywell) tested on physical hardware, not simulators
* Four-state UX contract: live, stale, syncing, unavailable
* Server-authoritative reconciliation for inspection sign-off timestamps

## Context

**Operational reality:**

* 40% of work happens in basements, substations, and rural sites with **no signal for hours**.
* Losing a completed inspection because the app crashed before sync is a **contract failure**, not a UX annoyance.
* Devices are **rugged Android** (Zebra TC57, Honeywell CT40) plus a minority of corporate iPhones.
* Backend accepts REST batch uploads; conflict policy is **server-authoritative** on approval timestamps.

**Team constraints:** Four mobile engineers, one backend engineer, no on-call native specialist. Expo managed workflow with EAS internal distribution to fleet devices.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    Field app - offline-first data plane                   │
├──────────────────────────────────────────────────────────────────────────┤
│  Expo Router                                                             │
│    (app)/jobs/[jobId]/inspection/[id]   ← deep link from dispatch SMS    │
├──────────────────────────────────────────────────────────────────────────┤
│  UI layer                                                                │
│    DataFreshnessLabel (live|stale|syncing|unavailable)                   │
│    Optimistic save → SQLite immediately                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  expo-sqlite (source of truth)                                           │
│    inspections, answers, attachments_meta                                │
│    outbox (mutation queue, idempotency_key, payload_json)                │
│    sync_cursor (last_server_seq)                                         │
├──────────────────────────────────────────────────────────────────────────┤
│  TanStack Query                                                          │
│    job list / reference data - stale-while-revalidate when online          │
├──────────────────────────────────────────────────────────────────────────┤
│  NetInfo → onlineManager + foreground flush                              │
│  expo-background-task → deferred outbox drain (≥15 min interval)         │
├──────────────────────────────────────────────────────────────────────────┤
│  expo-file-system + expo-image                                           │
│    attachment files on disk; upload in background worker                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Write path (offline create):**

```text
User taps Save → SQLite INSERT (synced=0) → outbox INSERT
  → UI shows "Pending upload" → (later) NetInfo online
  → flushOutbox() → POST /inspections + Idempotency-Key
  → server ack → UPDATE synced=1, tombstone outbox row
```

**Sync path (background safety net):**

```text
OS schedules BACKGROUND_SYNC_TASK
  → open SQLite → flushOutbox (max 50 rows, 25 MB attachments)
  → return Success | Failed
```

Boot gate in root `_layout.tsx` runs `PRAGMA user_version` migrations before any screen reads tables - see [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/).

> **Related:** [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - connectivity assumptions and UX contract

---

## Recipe

> Quick-reference stack card for field capture on SDK 57.

```bash
npx create-expo-app@latest FieldInspect --template default@sdk-57
npx expo install expo-sqlite expo-background-task expo-task-manager \
  @react-native-community/netinfo @tanstack/react-query expo-file-system expo-image
```

```ts
// src/sync/outboxFlush.ts (excerpt)
export async function flushOutbox(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox ORDER BY created_at LIMIT 50`
  );
  for (const row of rows) {
    const res = await api.post("/inspections", row.payload_json, {
      headers: { "Idempotency-Key": row.idempotency_key },
    });
    if (res.ok) await markSynced(db, row.id);
  }
}
```

```ts
// index.ts - register background task in global scope
import "./src/background/syncTask";
import "expo-router/entry";
```

**Device lab minimum:** One rugged Android on Android 11+, one iPhone two generations behind current, both on **release** builds - not Expo Go.

---

## Decisions Made

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| 1 | Local source of truth | **expo-sqlite** with WAL | Relational inspections + outbox; not AsyncStorage blobs - [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) |
| 2 | Server snapshots | **TanStack Query** for job catalog | Reference lists can be stale; capture data cannot - [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) |
| 3 | Conflict policy | **Server-authoritative** on `approved_at` | Inspector edits after supervisor approval are discarded with audit note in UX |
| 4 | Mutation replay | **Outbox + Idempotency-Key** | Reconnect must not duplicate rows - [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) #19–20 |
| 5 | Background upload | **expo-background-task** supplement | Foreground flush on NetInfo is primary - [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) |
| 6 | Attachments | **FileSystem paths in SQLite meta** | Upload worker streams files; DB stores `local_path`, `remote_url`, `bytes_uploaded` |
| 7 | UX contract | **Four visible states** | Technicians trust "Pending upload" over silent failure - [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) #2 |
| 8 | Rugged testing | **Physical Zebra on internal track** | Scanner intents and battery saver modes do not exist on emulators - [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) |
| 9 | OTA scope | **JS-only fixes on `production` channel** | Schema migrations ship with store builds when `user_version` bumps |

**Rejected alternatives:**

* **CRDT for checklist answers** - backend had no merge engine; server-authoritative simpler for compliance.
* **Background sync as only path** - 15-minute minimum interval missed dispatch deadline; foreground flush mandatory.
* **AsyncStorage outbox** - 200+ pending items after multi-day outage exceeded comfortable JSON size.

---

## Outcomes

Pilot fleet: **120 rugged devices** on Android 11–14, SDK 57 build `1.6.0`.

| Metric | Before (online-first prototype) | After (SQLite + outbox) |
| --- | --- | --- |
| **Lost submissions / week** | 11 (user-reported) | 0 in 8-week pilot |
| **Median save latency offline** | N/A (blocked spinner) | <80ms local commit |
| **Sync within 5 min of connectivity** | 62% | 94% |
| **Background task success rate** | - | 78% (iOS stricter than Android) |
| **Support tickets: "frozen app"** | 23/month | 4/month |

Corruption recovery: one device with a failed OTA mid-migration triggered `safeParse` quarantine - app rendered last-known-good inspections without white-screening per [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) #13.

---

## Lessons

1. **SQLite migrations before first paint.** A `user_version` bump shipped in an OTA without a store build bricked cold start once - now native schema changes require binary bump.
2. **Show pending state per row, not global spinner.** Inspectors work on job B while job A uploads; per-row `synced` flag beat a blocking modal.
3. **Rugged devices lie about battery.** `BatterySaver` on Zebra delayed background tasks; document that foreground flush is the real delivery path.
4. **Photo uploads need byte progress.** `expo-file-system` upload with `onUploadProgress` reduced "did it save?" calls to dispatch.
5. **Logout clears all layers.** Stale inspection cache on shared devices was a privacy incident class - `queryClient.clear()` + SQLite user tables + attachment dirs.
6. **Pin SDK 57 in runbooks.** Field IT installs APKs months later; support docs must state which `runtimeVersion` accepts which OTA.

---

## Related

* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - UX contract and NetInfo
* [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - WAL, migrations, transactions
* [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - server reconciliation
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - rollback patterns
* [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) - deferred flush
* [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/) - attachment thumbnails and cache
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - banners and retry copy
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - fleet APK delivery

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiODk1fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
