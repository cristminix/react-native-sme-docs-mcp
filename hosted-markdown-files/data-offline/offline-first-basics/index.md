# Offline-First Basics

10 examples to get you started with offline-first mobile data - 7 basic and 3 intermediate. Mobile users lose signal constantly; treat connectivity as a **feature state**, not an exception.

Highlights / Offline-First Basics

* Assume the network is unreliable - design reads from local storage first
* Publish a UX contract: what users see offline, stale, syncing, and failed
* NetInfo drives banners and TanStack Query onlineManager - not one-time fetch probes
* Stale-while-revalidate: show cached data with a last-updated label
* Distinguish offline from server errors - different copy and retry behavior
* Queue mutations locally when disconnected; replay with idempotency on reconnect
* Pick storage by shape: AsyncStorage for small JSON, SQLite for relational, MMKV for hot paths

## Prerequisites

Scaffold a production-shaped Expo app with an explicit SDK 57 pin. Offline examples assume Expo Router, TypeScript, and TanStack Query as the server-state layer.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npm install
```

Confirm the SDK pin and install connectivity + server-state dependencies:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Connectivity Assumption: Network Is Unreliable

Offline-first starts in product and architecture - not in a NetInfo hook added after launch. Document the assumption in your data layer README or ADR.

```text
Offline-first assumptions (team contract):
 
1. Reads succeed from local cache even when isConnected === false
2. Writes are accepted locally immediately; server confirmation is async
3. Conflicts are resolved by a documented strategy (server wins, LWW, or CRDT)
4. Users always know whether data is live, stale, or pending sync
5. Cold start must render last-known-good within one frame budget where possible
```

```tsx
// src/data/offlinePolicy.ts
export const offlinePolicy = {
  maxStaleAgeMs: 24 * 60 * 60 * 1000,
  showOfflineBanner: true,
  allowOptimisticWrites: true,
  conflictStrategy: "server-authoritative" as const,
};
```

* **Local-first reads** mean screens never block on `fetch` when cached data exists
* **Async writes** require a queue or mutation persistence - see [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/)
* **`conflictStrategy`** must match backend capabilities - do not promise CRDTs without server support

> **Related:** [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - LWW, CRDT overview, server reconciliation

---

### 2. UX Contract: Four Visible States

Users need predictable copy for four states. Design and engineering should agree on labels before implementation.

| State | User sees | Engineering signal |
| --- | --- | --- |
| **Live** | Normal UI, optional subtle "Updated just now" | `isFetching === false`, online, fresh cache |
| **Stale** | Data visible + "Saved data from 2:14 PM" | `dataUpdatedAt` older than `staleTime` or offline read |
| **Syncing** | Same data + "Updating…" indicator | `isFetching === true` with existing `data` |
| **Unavailable** | Empty or skeleton + retry | No cache and fetch failed, or auth expired |

```tsx
// src/components/DataFreshnessLabel.tsx
import { Text, StyleSheet } from "react-native";
 
type Props = {
  dataUpdatedAt: number;
  isFetching: boolean;
  isOffline: boolean;
};
 
export function DataFreshnessLabel({ dataUpdatedAt, isFetching, isOffline }: Props) {
  if (isFetching) {
    return <Text style={styles.muted}>Updating…</Text>;
  }
  const label = isOffline ? "Offline - showing saved data from" : "Updated";
  return (
    <Text style={styles.muted}>
      {label} {new Date(dataUpdatedAt).toLocaleTimeString()}
    </Text>
  );
}
 
const styles = StyleSheet.create({
  muted: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
});
```

* **Stale is not an error** - hide spinners when cached rows exist; show freshness instead
* **Unavailable** gets a single primary action (Retry) - not a full-screen blocker over stale data
* Pair with [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) for banner placement

> **Related:** [../error-resilience/network-failure-ux/network-failure-ux.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline banners and retry queues

---

### 3. NetInfo: Detect Connectivity Changes

Use `@react-native-community/netinfo` for ongoing reachability - not a one-time `fetch` probe on mount.

```bash
npx expo install @react-native-community/netinfo
```

```tsx
// src/hooks/useConnectivity.ts
import { useNetInfo } from "@react-native-community/netinfo";
 
export function useConnectivity() {
  const net = useNetInfo();
 
  const isOffline =
    net.isConnected === false || net.isInternetReachable === false;
 
  const isReachabilityUnknown =
    net.isConnected == null || net.isInternetReachable == null;
 
  return { net, isOffline, isReachabilityUnknown };
}
```

```tsx
// src/components/OfflineBanner.tsx
import { StyleSheet, Text, View } from "react-native";
import { useConnectivity } from "@/hooks/useConnectivity";
 
export function OfflineBanner() {
  const { isOffline, isReachabilityUnknown } = useConnectivity();
  if (isReachabilityUnknown || !isOffline) return null;
 
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>You are offline. Changes will sync when connected.</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  banner: { backgroundColor: "#fef3c7", padding: 10 },
  text: { color: "#92400e", textAlign: "center" },
});
```

* **`isInternetReachable === null`** on cold start is unknown - do not show the offline banner yet
* **`isConnected === false`** is stronger than a failed HTTP call - trust NetInfo for connectivity UX
* Subscribe once at the root; derive screen state from the hook - avoid duplicate listeners

> **Related:** [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - `onlineManager` wiring

---

### 4. Wire TanStack Query to NetInfo

Pause query retries when the device is offline - uncapped retries on airplane mode drain battery and spam logs.

```tsx
// src/lib/setupMobileQuery.ts
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { focusManager, onlineManager } from "@tanstack/react-query";
 
export function setupMobileQuery() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const online =
        !!state.isConnected && state.isInternetReachable !== false;
      setOnline(online);
    })
  );
 
  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  };
 
  const sub = AppState.addEventListener("change", onChange);
  return () => sub.remove();
}
```

```tsx
// app/_layout.tsx (excerpt)
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createQueryClient } from "@/lib/queryClient";
import { setupMobileQuery } from "@/lib/setupMobileQuery";
 
export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
 
  useEffect(() => setupMobileQuery(), []);
 
  return (
    <QueryClientProvider client={queryClient}>
      {/* routes */}
    </QueryClientProvider>
  );
}
```

* **`onlineManager`** controls whether Query considers the client online for retries and `refetchOnReconnect`
* **`focusManager`** ties `refetchOnWindowFocus` to AppState - refetch when the app returns to foreground
* Call **`setupMobileQuery()` once** at bootstrap - duplicate listeners cause flip-flopping online state

> **Related:** [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - cache policies on mobile

---

### 5. Stale-While-Revalidate: Show Cache First

Configure `staleTime` so tabs and back navigation do not flash empty spinners when cached data exists.

```tsx
// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
 
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        retry: 2,
        refetchOnReconnect: true,
      },
    },
  });
}
```

```tsx
// app/(tabs)/jobs/index.tsx
import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { DataFreshnessLabel } from "@/components/DataFreshnessLabel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useConnectivity } from "@/hooks/useConnectivity";
import { fetchJobs } from "@/api/jobs";
 
export default function JobsScreen() {
  const { isOffline } = useConnectivity();
  const { data, isFetching, isPending, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });
 
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      {data && (
        <DataFreshnessLabel
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          isOffline={isOffline}
        />
      )}
      {isPending && !data && <Text>Loading jobs…</Text>}
      {isError && !data && <Text onPress={() => refetch()}>Could not load. Tap to retry.</Text>}
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />
    </View>
  );
}
```

* **`isPending && !data`** is the only case for a full-screen loader - if `data` exists, SWR applies
* **`staleTime: 60_000`** keeps the jobs list fresh for one minute without refetch on every focus
* Per-query overrides beat global defaults - catalog lists can be staler than account balances

> **Related:** [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) - persist Query cache for cold start

---

### 6. Distinguish Offline from Server Errors

A 500 from a healthy network is not the same as airplane mode - use different headlines and recovery paths.

```tsx
// src/lib/classifyFetchError.ts
import type { NetInfoState } from "@react-native-community/netinfo";
 
export type FailureKind = "offline" | "server" | "auth" | "unknown";
 
export function classifyFailure(error: unknown, net: NetInfoState): FailureKind {
  const offline =
    net.isConnected === false || net.isInternetReachable === false;
  if (offline) return "offline";
 
  if (error instanceof Response) {
    if (error.status === 401 || error.status === 403) return "auth";
    if (error.status >= 500) return "server";
  }
 
  if (error instanceof Error && error.message.includes("Network request failed")) {
    return "offline";
  }
 
  return "unknown";
}
```

```tsx
const copy: Record<FailureKind, { title: string; action: string }> = {
  offline: { title: "You are offline", action: "Showing saved data" },
  server: { title: "Service temporarily unavailable", action: "Try again" },
  auth: { title: "Session expired", action: "Sign in again" },
  unknown: { title: "Something went wrong", action: "Try again" },
};
```

* **Offline + cached data** → no blocking error modal; freshness label is enough
* **Server error + cached data** → show inline warning; offer retry without clearing the list
* **Auth errors** must clear sensitive cache - `queryClient.removeQueries()` on logout

> **Related:** [../error-resilience/user-facing-error-copy/user-facing-error-copy.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - category-specific copy

---

### 7. Local Write Acceptance Contract

When offline, the app should still accept user intent - store locally and surface sync status.

```tsx
// src/data/outbox.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
 
export type OutboxItem = {
  id: string;
  type: "create_note";
  payload: { text: string };
  createdAt: number;
  idempotencyKey: string;
};
 
const OUTBOX_KEY = "sync:outbox:v1";
 
export async function enqueueOutbox(item: OutboxItem) {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  const queue: OutboxItem[] = raw ? JSON.parse(raw) : [];
  queue.push(item);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
}
 
export async function readOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  return raw ? JSON.parse(raw) : [];
}
```

```tsx
// UI indicator on a note composer
{pendingSync && (
  <Text style={{ color: "#6b7280" }}>Saved on device - will sync when online</Text>
)}
```

* Every queued item needs an **`idempotencyKey`** - replays after reconnect must not duplicate server rows
* **Outbox schema is versioned** (`sync:outbox:v1`) - migrations follow [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/)
* Flush the outbox on `NetInfo` reconnect and on app foreground - see [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/)

> **Related:** [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - instant UI with rollback on failure

---

## Intermediate Examples

### 8. Persisted Query Cache for Cold Start

Hydrate TanStack Query from AsyncStorage so catalog screens render immediately after process kill.

```bash
npx expo install @react-native-async-storage/async-storage @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

```tsx
// src/lib/queryPersister.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
 
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_OFFLINE_CACHE",
  throttleTime: 1000,
});
```

```tsx
// app/_layout.tsx (excerpt)
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { asyncStoragePersister } from "@/lib/queryPersister";
 
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.queryKey[0] !== "session",
    },
  }}
>
  {children}
</PersistQueryClientProvider>
```

* **`maxAge`** caps how old persisted cache can be - stale financial data may need shorter TTL
* **Exclude secrets** from dehydration - never persist auth tokens in the Query cache
* Logout must call **`queryClient.clear()`** and wipe the persister key

> **Related:** [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - SQLite-backed persister for large caches

---

### 9. Feature-Level Offline Mode Toggle

Field apps sometimes need a forced offline mode (tunnel, airplane hangar) independent of NetInfo.

```tsx
// src/stores/offlineModeStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
 
type OfflineModeStore = {
  forcedOffline: boolean;
  setForcedOffline: (value: boolean) => void;
};
 
export const useOfflineModeStore = create<OfflineModeStore>()(
  persist(
    (set) => ({
      forcedOffline: false,
      setForcedOffline: (forcedOffline) => set({ forcedOffline }),
    }),
    { name: "offline-mode", storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

```tsx
// src/hooks/useEffectiveConnectivity.ts
import { useNetInfo } from "@react-native-community/netinfo";
import { useOfflineModeStore } from "@/stores/offlineModeStore";
 
export function useEffectiveConnectivity() {
  const net = useNetInfo();
  const forcedOffline = useOfflineModeStore((s) => s.forcedOffline);
 
  const netOffline =
    net.isConnected === false || net.isInternetReachable === false;
 
  return {
    isOffline: forcedOffline || netOffline,
    forcedOffline,
    netOffline,
  };
}
```

* **Forced offline** should disable background sync and show a distinct banner ("Offline mode enabled")
* Gate **`onlineManager.setOnline(false)`** when forced - Query must not refetch in hangar mode
* Document QA scenarios: forced offline + queued writes + manual sync button

> **Related:** [MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/) - faster reads for mode flags

---

### 10. End-to-End Offline Read Path

Tie connectivity, cache, storage, and UX into one checklist screen teams can copy.

```tsx
// src/features/checklist/OfflineChecklistScreen.tsx
import { useQuery } from "@tanstack/react-query";
import { Switch, Text, View } from "react-native";
import { DataFreshnessLabel } from "@/components/DataFreshnessLabel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useEffectiveConnectivity } from "@/hooks/useEffectiveConnectivity";
import { useOfflineModeStore } from "@/stores/offlineModeStore";
import { fetchChecklist } from "@/api/checklist";
 
export function OfflineChecklistScreen() {
  const { isOffline, forcedOffline } = useEffectiveConnectivity();
  const setForcedOffline = useOfflineModeStore((s) => s.setForcedOffline);
 
  const { data, isFetching, isPending, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["checklist"],
    queryFn: fetchChecklist,
    staleTime: 5 * 60_000,
    // Skip network refetch in forced-offline mode; cached data still renders via SWR
    enabled: !forcedOffline,
  });
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <OfflineBanner />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ flex: 1 }}>Force offline mode</Text>
        <Switch value={forcedOffline} onValueChange={setForcedOffline} />
      </View>
      {data && (
        <DataFreshnessLabel
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          isOffline={isOffline}
        />
      )}
      {isPending && !data && <Text>Loading checklist…</Text>}
      {!data && isOffline && (
        <Text onPress={() => refetch()}>No saved checklist. Connect to download.</Text>
      )}
      {data?.map((item) => (
        <Text key={item.id}>• {item.label}</Text>
      ))}
    </View>
  );
}
```

```text
Offline read path checklist:
 
✓ NetInfo + onlineManager wired at bootstrap
✓ staleTime configured per screen sensitivity
✓ Cached data shown with freshness label
✓ Offline vs server errors classified
✓ Writes enqueue locally with idempotency keys
✓ Persisted Query cache for cold start (optional)
✓ Forced offline mode for field testing (optional)
```

* This screen is a **template** - replace `fetchChecklist` with your domain API
* Add **relational offline data** in SQLite when lists exceed AsyncStorage comfort - see [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/)
* Promote patterns to [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) before shipping v1

> **Related:** [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) - section summary | [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - reconciliation rules

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiOTMwfDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
