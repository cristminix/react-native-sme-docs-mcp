# AsyncStorage Patterns

Small key-value persistence and migration versioning. `@react-native-async-storage/async-storage` is the default **string KV store** for Expo SDK 57 - ideal for preferences, small outboxes, feature flags, and TanStack Query persistence. It is not a database.

Highlights / AsyncStorage Patterns

* Use @react-native-async-storage/async-storage for small JSON blobs - not relational data
* Version every persisted schema with a meta key and stepwise migrations
* Wrap read/write in try/catch - corrupted JSON should reset to defaults, not crash boot
* Namespace keys by domain: prefs:v1, sync:outbox:v1 - never one global dump
* Pair with TanStack Query persister for server-state hydration on cold start
* AsyncStorage is async and relatively slow - batch writes and avoid hot-path reads

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @react-native-async-storage/async-storage
```

```ts
// src/storage/keys.ts
export const STORAGE_KEYS = {
  meta: "app:storage:meta:v1",
  preferences: "user:preferences:v1",
  outbox: "sync:outbox:v1",
} as const;
 
export type StorageMeta = { schemaVersion: number };
```

```ts
// src/storage/safeJson.ts
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
```

```ts
// src/storage/preferences.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./keys";
import { safeParse } from "./safeJson";
 
export type Preferences = { theme: "light" | "dark"; locale: string };
 
const DEFAULTS: Preferences = { theme: "light", locale: "en" };
 
export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.preferences);
  return safeParse(raw, DEFAULTS);
}
 
export async function savePreferences(prefs: Preferences) {
  await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(prefs));
}
```

**When to reach for this:**

* User preferences, onboarding progress, small offline outboxes (< few hundred KB)
* TanStack Query `createAsyncStoragePersister` for last-known-good API cache
* Feature-flag defaults and last-sync timestamps
* Anything that fits in JSON and does not need SQL queries

## Working Example

```bash
npx expo install @react-native-async-storage/async-storage
```

```ts
// src/storage/keys.ts
export const STORAGE_KEYS = {
  meta: "app:storage:meta:v1",
  preferences: "user:preferences:v1",
  outbox: "sync:outbox:v1",
} as const;
 
export const CURRENT_SCHEMA_VERSION = 2;
 
export type StorageMeta = { schemaVersion: number };
```

```ts
// src/storage/migrations.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, type StorageMeta } from "./keys";
import { safeParse } from "./safeJson";
 
async function readMeta(): Promise<StorageMeta> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.meta);
  return safeParse(raw, { schemaVersion: 0 });
}
 
async function writeMeta(meta: StorageMeta) {
  await AsyncStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(meta));
}
 
async function migrateV0ToV1() {
  // v0 had unversioned key "preferences"
  const legacy = await AsyncStorage.getItem("preferences");
  if (legacy) {
    await AsyncStorage.setItem(STORAGE_KEYS.preferences, legacy);
    await AsyncStorage.removeItem("preferences");
  }
}
 
async function migrateV1ToV2() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.preferences);
  const prefs = safeParse(raw, { theme: "light" });
  const next = { ...prefs, locale: prefs.locale ?? "en" };
  await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next));
}
 
const STEPS: Record<number, () => Promise<void>> = {
  0: migrateV0ToV1,
  1: migrateV1ToV2,
};
 
export async function runStorageMigrations() {
  const meta = await readMeta();
  let version = meta.schemaVersion;
 
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = STEPS[version];
    if (!step) throw new Error(`Missing migration for schema v${version}`);
    await step();
    version += 1;
    await writeMeta({ schemaVersion: version });
  }
}
```

```tsx
// app/_layout.tsx (excerpt)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { runStorageMigrations } from "@/storage/migrations";
 
export default function RootLayout() {
  const [ready, setReady] = useState(false);
 
  useEffect(() => {
    runStorageMigrations()
      .then(() => setReady(true))
      .catch(async () => {
        // Corruption recovery: reset non-critical keys and boot
        await AsyncStorage.clear();
        setReady(true);
      });
  }, []);
 
  if (!ready) return null;
  return <Stack />;
}
```

```ts
// src/storage/outbox.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./keys";
import { safeParse } from "./safeJson";
 
export type OutboxItem = {
  id: string;
  type: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: number;
};
 
export async function readOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.outbox);
  return safeParse(raw, []);
}
 
export async function appendOutbox(item: OutboxItem) {
  const queue = await readOutbox();
  queue.push(item);
  await AsyncStorage.setItem(STORAGE_KEYS.outbox, JSON.stringify(queue));
}
 
export async function writeOutbox(queue: OutboxItem[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.outbox, JSON.stringify(queue));
}
```

```bash
# Optional: TanStack Query persistence
npx expo install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

## Deep Dive

### Key namespacing

Treat every domain as an isolated document with a version suffix in the key:

| Key | Contents | Max size guidance |
| --- | --- | --- |
| `user:preferences:v1` | Theme, locale | < 4 KB |
| `sync:outbox:v1` | Pending mutations | < 500 KB - flush often |
| `REACT_QUERY_OFFLINE_CACHE` | Dehydrated Query cache | Monitor growth; exclude secrets |
| `app:storage:meta:v1` | `{ schemaVersion }` | Tiny |

Bump the `:v1` suffix when the **shape** changes irreversibly - migrations handle in-place upgrades; key renames handle breaking rewrites.

### Stepwise migrations

```text
Boot sequence:
 
1. Read app:storage:meta:v1 → schemaVersion (default 0)
2. While version < CURRENT_SCHEMA_VERSION:
     run STEPS[version]()
     version++
     persist meta
3. App renders - no screen reads un-migrated keys
```

* Migrations run **once per version step** - idempotent steps are safer for crash mid-migration
* Log migration failures to your crash reporter - silent `clear()` loses user data
* For large transforms, write to a **new key** then swap - avoids half-written JSON on kill

### Corruption recovery

```ts
export async function loadWithRecovery<T>(
  key: string,
  fallback: T,
  onCorrupt?: () => void
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return safeParse(raw, fallback);
  } catch {
    onCorrupt?.();
    await AsyncStorage.removeItem(key);
    return fallback;
  }
}
```

* **Preferences corruption** → reset to defaults and show a one-time toast
* **Outbox corruption** → quarantine to `sync:outbox:corrupt:<timestamp>` for support export before clearing
* Never call **`AsyncStorage.clear()`** on auth errors only - scope clears to affected namespaces

### Batching and multi-set

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
 
export async function saveDraftBundle(draft: object, updatedAt: number) {
  await AsyncStorage.multiSet([
    ["draft:composer:v1", JSON.stringify(draft)],
    ["draft:composer:meta:v1", JSON.stringify({ updatedAt })],
  ]);
}
```

`multiSet` reduces bridge round-trips compared to sequential `setItem` calls - still async, not synchronous like MMKV.

## Gotchas

* **Storing large lists in one JSON array** - Parsing 5 MB on the JS thread blocks UI. **Fix:** Move relational data to [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/); keep AsyncStorage for metadata and outbox pointers.
* **No schema version** - Shipping a new shape without migration crashes `JSON.parse` assumptions. **Fix:** Always maintain `app:storage:meta:v1` and step migrations.
* **Storing secrets in AsyncStorage** - It is not encrypted. **Fix:** Tokens in `expo-secure-store`; only non-sensitive prefs in AsyncStorage.
* **Race on concurrent writes** - Two screens appending to the same outbox can drop items. **Fix:** Read-modify-write in one function; serialize flushes with a mutex or queue service.
* **Assuming persistence is synchronous** - `await getItem` on every render causes jank. **Fix:** Load once at boot or hydrate Zustand/Query; use MMKV for sync hot paths.
* **Unbounded Query persister growth** - Dehydrating every query fills disk. **Fix:** `shouldDehydrateQuery` filter + `maxAge`; see [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/).
* **Forgetting logout cleanup** - Prior user's cache leaks to the next login. **Fix:** `multiRemove` on session keys + `queryClient.clear()` on sign-out.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `@react-native-async-storage/async-storage` | Small JSON, prefs, Query persister | You need SQL, full-text search, or sync joins |
| `expo-sqlite/kv-store` | Already on SQLite; want AsyncStorage-compatible API + sync reads | You only need a few keys and no DB yet |
| `react-native-mmkv` | Hot-path flags, session-adjacent cache, frequent reads | Expo Go without a dev build; multi-MB blobs |
| `expo-secure-store` | Tokens, refresh secrets | Large payloads (> ~2 KB per key on some platforms) |
| TanStack Query cache only | Pure server-state with no local-only writes | Offline-created rows that never hit the server |

## FAQs

How do I install AsyncStorage on Expo SDK 57?

```bash
npx expo install @react-native-async-storage/async-storage
```

Always use `expo install` - manual npm versions may not match the SDK native module matrix.

When should I bump schema version vs rename the key?

* **Bump `schemaVersion`** when you can migrate data in place (add field, rename property).
* **Rename key** (`:v1` → `:v2`) when the old data is unusable or migration cost exceeds re-download.
* Never read new code against old keys without running migrations at boot.

How big is too big for AsyncStorage?

Stay under **~500 KB per key** for smooth boot. Multi-megabyte JSON parse blocks the JS thread for hundreds of milliseconds. Split large datasets into SQLite tables or paginated cache keys.

Can AsyncStorage replace a server database?

No. It is a local convenience layer. Treat contents as **best-effort cache** with TTL, version, and server reconciliation - see [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/).

How do I persist TanStack Query offline?

```bash
npx expo install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

Wire `PersistQueryClientProvider` with `createAsyncStoragePersister`. Exclude auth and PII queries from dehydration.

What if migration throws mid-boot?

* Retry once - transient I/O errors happen on low storage.
* On second failure, quarantine corrupt keys, reset non-critical namespaces, and log to telemetry.
* Offer support export for outbox quarantine before wipe in field apps.

Should I use Zustand persist with AsyncStorage?

Yes for client UI state (filters, draft forms). Use `createJSONStorage(() => AsyncStorage)` and the same migration/version discipline. Server API data still belongs in TanStack Query.

Is AsyncStorage encrypted?

Not by default. Assume rooted/jailbroken devices can read it. Secrets → SecureStore; sensitive PII → minimize retention or encrypt at rest with a server-derived key.

## Related

* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - connectivity UX and SWR patterns
* [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - relational data and typed queries
* [MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/) - when AsyncStorage is too slow
* [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - cache persistence and mobile lifecycle
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - outbox replay after failed mutations
* [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
