# Network Failure UX

Offline banners, retry queues, and stale-while-revalidate displays.

Highlights / Network Failure UX

* Detect connectivity with @react-native-community/netinfo - not a one-time fetch probe
* Show a persistent offline banner; distinguish offline from server errors
* TanStack Query onlineManager ties query retries to real network state
* Stale-while-revalidate: keep showing cached data with a clear last-updated label
* Queue failed mutations locally and flush when isConnected returns
* Retry buttons should call refetch - not reload the entire app

Mobile networks drop constantly - elevators, tunnels, flaky Wi‑Fi. Good network failure UX **detects connectivity**, **communicates state**, **shows cached data when possible**, and **retries safely** when the device is back online.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { onlineManager, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
// Sync TanStack Query's online state with the device
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  })
);
 
function OfflineBanner() {
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>You are offline. Showing saved data where available.</Text>
    </View>
  );
}
 
async function fetchPosts() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ id: number; title: string }[]>;
}
 
export function FeedScreen() {
  const { data, error, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    staleTime: 60_000,
    retry: 2,
  });
 
  return (
    <View style={styles.screen}>
      <OfflineBanner />
      {data && (
        <Text style={styles.stale}>
          {isFetching ? "Updating…" : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
        </Text>
      )}
      {isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error instanceof Error ? error.message : "Request failed"}</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      )}
      {data?.map((post) => (
        <Text key={post.id} style={styles.row}>{post.title}</Text>
      ))}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#fff" },
  banner: { backgroundColor: "#fef3c7", padding: 10, borderRadius: 8, marginBottom: 12 },
  bannerText: { color: "#92400e", fontWeight: "600" },
  stale: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  errorBox: { padding: 12, backgroundColor: "#fee2e2", borderRadius: 8, marginBottom: 12 },
  errorText: { color: "#991b1b", marginBottom: 8 },
  retry: { alignSelf: "flex-start", backgroundColor: "#dc2626", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  retryLabel: { color: "#fff", fontWeight: "600" },
  row: { fontSize: 14, marginBottom: 6 },
});
```

**When to reach for this:**

* Feed, catalog, or profile screens that should remain readable offline with cached data.
* Forms or actions that must **not** silently fail when the device loses connectivity.
* Apps using TanStack Query (or similar) that need correct pause/resume of retries.
* Any screen where users blame the app for "spinning forever" on a dead network.
* Mutation flows (post, pay, save) that should queue and flush when online returns.

## Working Example

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
 
const QUEUE_KEY = "offline-mutation-queue-v1";
 
type Todo = { id: string; title: string; pending?: boolean };
type QueuedCreate = { id: string; title: string };
 
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  })
);
 
async function loadTodos(): Promise<Todo[]> {
  const raw = await AsyncStorage.getItem("todos-cache");
  return raw ? (JSON.parse(raw) as Todo[]) : [];
}
 
async function saveTodos(todos: Todo[]) {
  await AsyncStorage.setItem("todos-cache", JSON.stringify(todos));
}
 
async function readQueue(): Promise<QueuedCreate[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedCreate[]) : [];
}
 
async function writeQueue(items: QueuedCreate[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}
 
async function createTodoOnServer(title: string): Promise<Todo> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) throw new TypeError("OFFLINE");
 
  // Simulated API - replace with your backend
  await new Promise((r) => setTimeout(r, 400));
  return { id: `srv-${Date.now()}`, title };
}
 
function ConnectivityChrome() {
  const net = useNetInfo();
  const offline = net.isConnected === false;
  const captive = net.isConnected && net.isInternetReachable === false;
 
  if (offline) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.bannerText}>Offline - changes will sync when you reconnect.</Text>
      </View>
    );
  }
  if (captive) {
    return (
      <View style={[styles.banner, styles.captive]}>
        <Text style={styles.bannerText}>Connected, but no internet reachability.</Text>
      </View>
    );
  }
  return null;
}
 
export default function App() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [queueLen, setQueueLen] = useState(0);
 
  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: loadTodos,
    staleTime: 30_000,
    // Stale-while-revalidate: show cached list immediately; refresh when online
    placeholderData: (prev) => prev,
  });
 
  const flushQueue = useCallback(async () => {
    const queue = await readQueue();
    if (queue.length === 0) return;
 
    const remaining: QueuedCreate[] = [];
    let todos = (await loadTodos()) ?? [];
 
    for (const item of queue) {
      try {
        const created = await createTodoOnServer(item.title);
        todos = todos.map((t) => (t.id === item.id ? created : t));
      } catch {
        remaining.push(item);
      }
    }
 
    await saveTodos(todos);
    await writeQueue(remaining);
    setQueueLen(remaining.length);
    queryClient.setQueryData(["todos"], todos);
  }, [queryClient]);
 
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushQueue();
      }
    });
    void readQueue().then((q) => setQueueLen(q.length));
    return () => unsub();
  }, [flushQueue]);
 
  const createMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const optimistic: Todo = { id: `local-${Date.now()}`, title: newTitle, pending: true };
      const current = (await loadTodos()) ?? [];
      const next = [optimistic, ...current];
      await saveTodos(next);
      queryClient.setQueryData(["todos"], next);
 
      try {
        const created = await createTodoOnServer(newTitle);
        const synced = next.map((t) => (t.id === optimistic.id ? created : t));
        await saveTodos(synced);
        queryClient.setQueryData(["todos"], synced);
        return created;
      } catch (e) {
        if (e instanceof TypeError && e.message === "OFFLINE") {
          const queue = await readQueue();
          await writeQueue([...queue, { id: optimistic.id, title: newTitle }]);
          setQueueLen((n) => n + 1);
          return optimistic;
        }
        throw e;
      }
    },
  });
 
  const todos = todosQuery.data ?? [];
 
  return (
    <View style={styles.screen}>
      <ConnectivityChrome />
      {todosQuery.isFetching && <Text style={styles.meta}>Refreshing…</Text>}
      {queueLen > 0 && (
        <Text style={styles.meta}>{queueLen} change(s) waiting to sync</Text>
      )}
 
      <Pressable
        style={styles.add}
        onPress={() => {
          const next = title.trim() || `Todo ${Date.now()}`;
          setTitle("");
          createMutation.mutate(next);
        }}
      >
        <Text style={styles.addLabel}>Add todo</Text>
      </Pressable>
 
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.pending ? "⏳ " : ""}
            {item.title}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.meta}>No todos yet.</Text>}
      />
 
      {todosQuery.isError && (
        <Pressable onPress={() => todosQuery.refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>Retry load</Text>
        </Pressable>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  banner: { padding: 10, borderRadius: 8, marginBottom: 10 },
  offline: { backgroundColor: "#fef3c7" },
  captive: { backgroundColor: "#ffedd5" },
  bannerText: { fontWeight: "600", color: "#78350f" },
  meta: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  add: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, marginBottom: 12 },
  addLabel: { color: "#fff", fontWeight: "600", textAlign: "center" },
  row: { fontSize: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
  retry: { marginTop: 12, padding: 12, backgroundColor: "#dc2626", borderRadius: 8, alignItems: "center" },
  retryLabel: { color: "#fff", fontWeight: "600" },
});
```

**What this demonstrates:**

* `useNetInfo` drives a **connectivity banner** with distinct offline vs captive-portal messaging.
* `onlineManager` syncs TanStack Query retry behavior with real device connectivity.
* **Stale-while-revalidate**: cached todos render immediately via `placeholderData` while a background refetch runs.
* **Optimistic UI** plus a persisted **retry queue** for creates that fail while offline.
* Automatic **queue flush** when `NetInfo` reports the device is back online.
* Per-screen **Retry** calls `refetch()` - not an app restart.

## Deep Dive

### How It Works

* **`@react-native-community/netinfo`** listens to OS connectivity events (Wi‑Fi, cellular, airplane mode). `isConnected` means a network interface exists; `isInternetReachable` adds a reachability probe (can be `null` while checking).
* **Offline banner** is a global or screen-level chrome element - always visible when offline so users understand why actions stall.
* **TanStack Query** pauses retries when `onlineManager` reports offline and resumes when online. Pair with `staleTime` and `gcTime` so cached data survives short outages.
* **Stale-while-revalidate (SWR)** shows the last successful payload while `isFetching` is true. Label it with `dataUpdatedAt` so users know data may be old.
* **Retry queue** persists failed mutations (AsyncStorage, MMKV, SQLite) and replays them idempotently when connectivity returns.
* Distinguish **offline** (no network), **timeout** (slow/dead server), and **HTTP errors** (4xx/5xx) - copy and actions differ for each.

### Connectivity Signals

| Signal | Meaning | UX response |
| --- | --- | --- |
| `isConnected === false` | Airplane mode, no interface | Offline banner; queue mutations |
| `isInternetReachable === false` | Wi‑Fi without DNS/captive portal | "Connected but no internet" banner |
| `isInternetReachable === null` | Probe in flight | Do not flash offline UI - keep previous state |
| Fetch throws `TypeError` / timeout | Server or DNS failure while "online" | Inline error + Retry; not the offline banner |
| HTTP 5xx | Server error | "Service unavailable" + Retry with backoff |

```bash
npx expo install @react-native-community/netinfo @react-native-async-storage/async-storage @tanstack/react-query
```

### TanStack Query Mobile Defaults

```tsx
import { AppState, Platform } from "react-native";
import { focusManager, QueryClient } from "@tanstack/react-query";
 
// Refetch on app foreground (pairs with network recovery)
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") handleFocus();
  });
  return () => sub.remove();
});
 
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
    },
  },
});
```

See [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) for full `focusManager` / `onlineManager` setup.

### Retry Queue Design

| Concern | Recommendation |
| --- | --- |
| Storage | AsyncStorage for small queues; MMKV/SQLite for high volume |
| Idempotency | Send client-generated idempotency keys to your API |
| Ordering | Process FIFO per entity; parallelize independent entities |
| Conflict | On 409, drop or merge using server version |
| UI | Show `pending` state on optimistic rows until flush succeeds |
| Failure cap | After N failures, surface item to user for manual retry/discard |

```tsx
type QueueItem = {
  idempotencyKey: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  attempts: number;
};
```

### Stale-While-Revalidate Display Patterns

| Pattern | User sees | When |
| --- | --- | --- |
| Cached list + banner | Last feed + "Offline" | `isConnected === false` |
| Cached + spinner | Old data + subtle "Updating…" | `isFetching && data` |
| Empty + error | Illustration + Retry | `isError && !data` |
| Skeleton first load | Placeholder rows | `isLoading && !data` |

Always show **when** data was last fresh: `dataUpdatedAt`, "Updated 2 min ago", or "Showing saved copy".

### TypeScript Notes

```tsx
import type { NetInfoState } from "@react-native-community/netinfo";
 
function isEffectivelyOffline(state: NetInfoState): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}
 
type NetworkFailure =
  | { kind: "offline" }
  | { kind: "timeout" }
  | { kind: "http"; status: number };
 
function classifyFetchError(error: unknown): NetworkFailure {
  if (error instanceof TypeError) return { kind: "offline" };
  return { kind: "timeout" };
}
```

* Treat `isInternetReachable === null` as **unknown**, not offline - avoids banner flicker.
* Type mutation queue items narrowly so replay logic stays exhaustive.

## Gotchas

* **Using a single failed fetch to mean "offline"** - Servers return 500 while Wi‑Fi is fine. **Fix:** Combine `NetInfo` with error type; show different copy for offline vs server errors.
* **Flashing the offline banner when `isInternetReachable` is `null`** - NetInfo probes take a moment on launch. **Fix:** Only show offline UI when `isConnected === false` or `isInternetReachable === false`, not during `null`.
* **Infinite retry spinners** - `retry: true` without `onlineManager` drains battery on airplane mode. **Fix:** Wire `onlineManager` to NetInfo and cap retries.
* **Reloading the app on Retry** - `Updates.reloadAsync()` discards in-memory state and feels broken. **Fix:** Call `refetch()` or replay the queue item.
* **Silent mutation loss offline** - Users think saves succeeded. **Fix:** Optimistic UI with `pending` marker + persisted queue until server ack.
* **Showing stale data without labeling it** - Users make decisions on outdated prices or balances. **Fix:** Display `dataUpdatedAt` or "Showing saved data from …".
* **Queue replay without idempotency** - Reconnect creates duplicate charges or posts. **Fix:** Idempotency keys on client and server; see [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| NetInfo + manual banners | Full control, any data layer | You already standardize on TanStack Query's `isFetching` / `isError` alone |
| TanStack Query only (no NetInfo) | Read-only apps with tolerant caching | You must gate mutations or explain offline state clearly |
| Full offline-first (SQLite sync) | Field apps with long offline windows | Simple CRUD apps that only need graceful failure |
| Expo `Network` module | Legacy Expo docs reference | Greenfield apps - prefer `@react-native-community/netinfo` |
| Background sync (TaskManager) | Large uploads that must finish later | Immediate user feedback on the same screen is enough |

## FAQs

How do I install NetInfo in an Expo SDK 57 app?

```bash
npx expo install @react-native-community/netinfo
```

Expo supports this module in development builds and production; no config plugin is required for basic connectivity listeners.

What is the difference between isConnected and isInternetReachable?

* `isConnected` - device has a network interface (Wi‑Fi or cellular).
* `isInternetReachable` - NetInfo probed actual internet access (can be `false` on captive portals).

Use both: show offline when disconnected; show a different message when connected but unreachable.

Why hook onlineManager to NetInfo?

TanStack Query pauses automatic retries when offline and resumes when `onlineManager` flips to true. Without this, queries retry uselessly in airplane mode.

What is stale-while-revalidate in mobile terms?

Show the last successful response immediately (`placeholderData` or persisted cache), fetch fresh data in the background, and label the timestamp. Users stay productive during slow or flaky networks.

Should the offline banner block interaction?

Usually no - use a slim non-blocking banner. Disable only actions that truly cannot work offline (e.g. payment capture), not entire read-only screens with cached data.

How do I persist query cache across app restarts?

Use TanStack Query's `persistQueryClient` with AsyncStorage or MMKV for read-mostly screens. Pair with `staleTime` and manual invalidation on logout.

What should a Retry button do?

```tsx
<Pressable onPress={() => refetch()}>
  <Text>Retry</Text>
</Pressable>
```

Refetch the failed query or replay the specific queue item - do not restart the app unless a fatal native error requires it.

How do I queue mutations offline?

On mutation failure when offline: write `{ idempotencyKey, payload }` to storage, show optimistic `pending` UI, subscribe to NetInfo, and flush the queue when connected. Increment `attempts` and stop after a cap.

How is a server 500 different from offline UX?

Offline: yellow banner, queue actions, show cache. Server 500: inline error on the affected section ("Service unavailable"), Retry with exponential backoff, no offline banner.

Should I use pull-to-refresh on error screens?

Yes - `RefreshControl` wired to `refetch()` is idiomatic on mobile and matches user expectations alongside an explicit Retry button.

Does NetInfo fire when the app is backgrounded?

Yes - subscribe in a root provider or hook and update global state. Flush queues on reconnect even if the user returns later; pair with `AppState` foreground refetch.

How long should staleTime be on mobile?

Start with 30–60 seconds for frequently changing feeds, longer for catalogs and profile shells. Balance freshness with battery - see [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/).

Can I show cached data and an error at the same time?

Yes - keep stale list visible, show a compact error bar ("Could not refresh"), and let Retry call `refetch()`. Hiding good cache on transient refresh failure feels worse than partial degradation.

How does this relate to offline-first architecture?

This page covers **failure UX** on networked screens. Full offline-first adds local databases, sync engines, and conflict resolution - see [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/).

## Related

* [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - timeouts, cancellation, and parsing at the edge
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - `focusManager`, `onlineManager`, foreground refetch
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - safe queue replay and server idempotency keys
* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - local source of truth beyond banners
* [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - wording for offline, timeout, and server errors
* [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) - QueryClient defaults for Expo apps

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
