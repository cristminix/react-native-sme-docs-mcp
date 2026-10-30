# react-native-mmkv

Fast storage when AsyncStorage is too slow. `react-native-mmkv` is a **memory-mapped synchronous KV store** - ideal for feature flags, composer drafts, and Zustand persist middleware on screens that read storage every render. Reach for it when profiling shows AsyncStorage `await` on the critical path.

Highlights / react-native-mmkv

* Synchronous mmap reads - orders of magnitude faster than AsyncStorage await
* Ideal for feature flags, drafts, Zustand persist on hot paths
* Requires a development build - not available in stock Expo Go
* Multiple named instances isolate domains: app, cache, experiments
* Not a database - no queries; use expo-sqlite for relational offline data
* Secrets need encryption key from expo-secure-store

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install react-native-mmkv
```

```ts
// src/storage/mmkv.ts
import { MMKV } from "react-native-mmkv";
 
export const storage = new MMKV({ id: "app-storage" });
export const cacheStorage = new MMKV({ id: "hot-cache" });
 
export function getJson<T>(key: string, fallback: T, instance = storage): T {
  const raw = instance.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
 
export function setJson(key: string, value: unknown, instance = storage) {
  instance.set(key, JSON.stringify(value));
}
```

```ts
// src/stores/draftStore.ts - Zustand persist adapter
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { storage } from "@/storage/mmkv";
 
const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => { storage.set(name, value); },
  removeItem: (name) => { storage.delete(name); },
};
 
type DraftStore = { text: string; setText: (text: string) => void };
 
export const useDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      text: "",
      setText: (text) => set({ text }),
    }),
    { name: "composer-draft", storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

**When to reach for this:**

* Synchronous read on every keystroke or animation frame.
* Zustand persist where AsyncStorage hydration flickers empty state.
* Small encrypted blobs with key from SecureStore.
* Replacing repeated `AsyncStorage.getItem` in list `renderItem` paths.

**When to avoid:**

* Relational data, full-text search, or server sync queues → `expo-sqlite`.
* Secrets without encryption wrapper → `expo-secure-store`.
* Expo Go-only workflows without a dev build.

## Working Example

```bash
npx expo install react-native-mmkv expo-secure-store
```

```ts
// src/storage/flags.ts
import { getJson, setJson, storage } from "./mmkv";
 
export type FeatureFlags = {
  offlineChecklist: boolean;
  newComposer: boolean;
};
 
const FLAGS_KEY = "flags:v1";
const DEFAULTS: FeatureFlags = { offlineChecklist: true, newComposer: false };
 
export function readFlags(): FeatureFlags {
  return getJson(FLAGS_KEY, DEFAULTS);
}
 
export function writeFlags(flags: FeatureFlags) {
  setJson(FLAGS_KEY, flags);
}
 
// Synchronous read in render - no await, no flash
export function isNewComposerEnabled(): boolean {
  return readFlags().newComposer;
}
```

```tsx
// src/components/Composer.tsx
import { TextInput } from "react-native";
import { useDraftStore } from "@/stores/draftStore";
 
export function Composer() {
  const text = useDraftStore((s) => s.text);
  const setText = useDraftStore((s) => s.setText);
 
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      placeholder="Draft saves instantly"
      multiline
    />
  );
}
```

```ts
// src/storage/migrations.ts - MMKV has no PRAGMA; use explicit version keys
import { storage } from "./mmkv";
 
const VERSION_KEY = "meta:schemaVersion";
const CURRENT_VERSION = 2;
 
export function runMmkvMigrations() {
  const version = storage.getNumber(VERSION_KEY) ?? 0;
 
  if (version < 1) {
    const legacy = storage.getString("flags");
    if (legacy) {
      storage.set("flags:v1", legacy);
      storage.delete("flags");
    }
    storage.set(VERSION_KEY, 1);
  }
 
  if (version < 2) {
    const raw = storage.getString("flags:v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      storage.set("flags:v1", JSON.stringify({ ...parsed, newComposer: false }));
    }
    storage.set(VERSION_KEY, 2);
  }
}
```

```tsx
// app/_layout.tsx (excerpt) - run migrations before UI reads flags
import { useEffect } from "react";
import { runMmkvMigrations } from "@/storage/migrations";
 
export default function RootLayout() {
  useEffect(() => {
    runMmkvMigrations();
  }, []);
 
  return /* routes */;
}
```

**What this demonstrates:**

* **`getJson` / `setJson`** - typed helpers avoid parse boilerplate in every caller.
* **Zustand + MMKV** - rehydrates synchronously; no empty-state flash after persist.
* **Feature flags** - read synchronously in render without `useEffect` hydration.
* **Explicit migrations** - version key + incremental transforms; no SQL migrations.
* **Named instances** - `app-storage` vs `hot-cache` isolate eviction domains.

## Deep Dive

### Storage Decision Matrix

| Store | Latency | Shape | Expo Go |
| --- | --- | --- | --- |
| AsyncStorage | Async | Small JSON blobs | Yes |
| MMKV | Sync | Key-value strings/numbers/bools | No - dev build |
| expo-sqlite | Async SQL | Relational rows | Dev build |
| expo-secure-store | Async | Secrets | Yes (limited) |

### Optional Encryption

```ts
import * as SecureStore from "expo-secure-store";
import { MMKV } from "react-native-mmkv";
 
const KEY_ID = "mmkv-encryption-key";
 
export async function createSecureStorage(): Promise<MMKV> {
  let key = await SecureStore.getItemAsync(KEY_ID);
  if (!key) {
    key = crypto.randomUUID();
    await SecureStore.setItemAsync(KEY_ID, key);
  }
  return new MMKV({ id: "user-secure", encryptionKey: key });
}
```

Encryption key lives in SecureStore; MMKV holds encrypted blobs - not raw tokens in plaintext.

### Logout

```ts
import { storage, cacheStorage } from "@/storage/mmkv";
 
export function clearUserMmkv() {
  storage.clearAll();
  cacheStorage.clearAll();
  // Also: queryClient.clear(), SecureStore.deleteItemAsync for tokens
}
```

## Gotchas

* **Using MMKV for large catalogs** - Multi-MB JSON blocks the JS thread on parse. **Fix:** SQLite or TanStack Query persistence with eviction.
* **Skipping migrations** - Renamed keys strand users on old shapes. **Fix:** `meta:schemaVersion` + incremental migration functions.
* **Storing JWTs unencrypted** - MMKV is fast plaintext storage. **Fix:** SecureStore for tokens; MMKV for non-secret prefs only.
* **Testing in Expo Go** - Native module missing. **Fix:** `eas build --profile development` or Expo dev client.
* **Reading MMKV in every list row without memoization** - Sync is fast but parse still costs. **Fix:** Read once at screen level; pass props down.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| MMKV | Hot-path sync KV | Relational queries |
| AsyncStorage | Infrequent boot hydration | Every-frame reads |
| expo-sqlite | Offline relational data | Single boolean flag |
| TanStack Query persist | Server cache offline reads | UI-only draft text |
| SecureStore | Tokens, small secrets | Feature flag JSON |

## FAQs

How do I install MMKV on Expo SDK 57?

```bash
npx expo install react-native-mmkv
eas build --profile development --platform all
```

Rebuild the dev client after install - autolinking adds the native module.

MMKV vs AsyncStorage for Zustand persist?

AsyncStorage is fine for settings loaded once at boot. MMKV when users see a flash of empty state before async rehydration completes.

Can I use MMKV in Expo Go?

No - it requires custom native code. Use a development build.

Where is the full MMKV guide?

[MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/) - encryption bootstrap, multi-instance patterns, and Zustand integration.

Does MMKV need a config plugin?

Standard Expo autolinking handles install for SDK 57 - no custom plugin in most apps. Run `npx expo-doctor` after adding.

## Related

* [MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/) - advanced patterns
* [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) - when async KV is enough
* [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/) - persist middleware
* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - storage pick order
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - audit before adopting native deps

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

NzA2MjAyfDYyOW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
