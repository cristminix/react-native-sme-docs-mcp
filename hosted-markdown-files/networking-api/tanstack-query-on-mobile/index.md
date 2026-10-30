# TanStack Query on Mobile

`focusManager`, `onlineManager`, and refetch on app foreground - the mobile-specific wiring TanStack Query needs beyond web tutorials.

Highlights / TanStack Query on Mobile

* Wire focusManager to AppState - refetch stale queries when users return from background
* Wire onlineManager to NetInfo - pause retries offline, resume on reconnect
* Default staleTime 30–60s on feeds - balance freshness with battery on LTE
* Forward AbortSignal from queryFn to fetch for automatic cancellation
* persistQueryClient pairs with AsyncStorage for read-mostly offline shells

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// src/lib/queryClient.ts
import NetInfo from "@react-native-community/netinfo";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
 
// Refetch when app returns to foreground
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") handleFocus();
  });
  return () => sub.remove();
});
 
// Pause retries when offline; resume when connected
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    const online =
      state.isConnected !== false && state.isInternetReachable !== false;
    setOnline(online);
  });
});
 
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

```tsx
// app/_layout.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";
 
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* routes */}
    </QueryClientProvider>
  );
}
```

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo
```

**When to reach for this:**

* Any Expo app with multiple screens reading the same API data.
* Feeds, profiles, or settings that should refresh when users foreground the app.
* Apps that must stop useless retries in airplane mode.

## Working Example

```tsx
import NetInfo from "@react-native-community/netinfo";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
const API = "https://jsonplaceholder.typicode.com";
 
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") handleFocus();
  });
  return () => sub.remove();
});
 
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  })
);
 
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 45_000, retry: 2, refetchOnReconnect: true },
  },
});
 
async function fetchPosts({ signal }: { signal?: AbortSignal }) {
  const res = await fetch(`${API}/posts?_limit=12`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ id: number; title: string }[]>;
}
 
function PostsScreen() {
  const { data, error, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
 
  return (
    <View style={styles.screen}>
      <Text style={styles.meta}>
        {isFetching ? "Updating…" : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
      </Text>
 
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => <Text style={styles.row}>{item.title}</Text>}
        ListEmptyComponent={isError ? null : <Text>Loading…</Text>}
      />
 
      {isError && (
        <View style={styles.error}>
          <Text>{error instanceof Error ? error.message : "Failed"}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
 
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PostsScreen />
    </QueryClientProvider>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#fff" },
  meta: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
  error: { padding: 12, backgroundColor: "#fee2e2", borderRadius: 8 },
  retry: { color: "#2563eb", fontWeight: "600", marginTop: 8 },
});
```

**What this demonstrates:**

* **`focusManager` + `AppState`** refetches stale queries when the app becomes `active`.
* **`onlineManager` + NetInfo** pauses retries offline and triggers `refetchOnReconnect` when LTE returns.
* **`signal` in `queryFn`** cancels fetch when the query unmounts or key changes.
* **Pull-to-refresh** calls `refetch()` - idiomatic mobile UX alongside foreground refetch.
* **`dataUpdatedAt`** labels staleness for users on flaky networks.

## Deep Dive

### focusManager and App Foreground

| AppState | TanStack behavior |
| --- | --- |
| `active` | `handleFocus()` - refetch stale queries if `refetchOnWindowFocus` |
| `background` | Queries stay cached; in-flight requests may complete |
| `inactive` (iOS) | Treat like brief interruption - same listener |

```tsx
// Optional: only refetch "important" queries on focus
queryClient.refetchQueries({ queryKey: ["inbox"], type: "active" });
```

* Users **expect fresh inbox counts** after switching back from another app - `staleTime: 0` for those keys only
* **Do not refetch everything** on every focus - battery and API rate limits suffer; tune per `queryKey`
* Pair with [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) banners when refetch fails offline

### onlineManager and NetInfo

```tsx
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    // null reachability = unknown - do not force offline
    if (state.isConnected === false) {
      setOnline(false);
      return;
    }
    if (state.isInternetReachable === false) {
      setOnline(false);
      return;
    }
    setOnline(true);
  });
});
```

* **`refetchOnReconnect: true`** (default) refetches stale queries when `onlineManager` flips true
* Mutations should use `networkMode: "offlineFirst"` only when you have a persisted queue - see [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/)
* Flush offline mutation queues in a NetInfo listener **in addition to** onlineManager - queues are app logic, not built into Query

### Mobile QueryClient Defaults

| Option | Suggested mobile value | Why |
| --- | --- | --- |
| `staleTime` | 30–60 s feeds; 5–15 min catalogs | Reduces LTE chatter |
| `gcTime` | 24 h | Survive short offline sessions |
| `retry` | 2 | LTE blips recover; cap avoids battery drain |
| `retryDelay` | exponential 1s → 4s | See [Retries doc](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) |
| `refetchOnWindowFocus` | `true` with focusManager | Mobile "window" = app foreground |
| `refetchOnReconnect` | `true` with onlineManager | Catch up after subway |

### Persist Cache to Device Storage

```bash
npx expo install @tanstack/react-query-persist-client @react-native-async-storage/async-storage
```

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
 
const persister = createAsyncStoragePersister({ storage: AsyncStorage });
 
// Wrap QueryClientProvider with PersistQueryClientProvider in root layout
```

* Persist **read-mostly** keys only - exclude PII-heavy queries unless encrypted
* **Clear persister on logout** - pair with [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)
* For high-performance KV, swap AsyncStorage for MMKV - [MMKV patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/)

### Auth-Aware Queries

```tsx
useQuery({
  queryKey: ["profile", userId],
  queryFn: fetchProfile,
  enabled: !!userId,
});
```

* **`enabled: false`** until session exists - avoids 401 storms on launch
* Invalidate `["profile"]` on logout: `queryClient.clear()` or `removeQueries`
* Attach tokens in `queryFn` via shared client - not inside every hook

## Gotchas

* **Skipping focusManager** - Data looks stale after users return from background. **Fix:** `AppState` listener in app bootstrap.
* **Treating `isInternetReachable: null` as offline** - Banner and retry flicker on launch. **Fix:** Only set offline on explicit `false`.
* **No `signal` in queryFn** - Requests complete after unmount. **Fix:** `fetch(url, { signal })` with Query's injected signal.
* **`staleTime: 0` globally** - Refetch on every focus drains battery. **Fix:** Per-query tuning.
* **Persisting auth errors** - Cached 401 profile survives restarts. **Fix:** Clear cache on logout and failed refresh.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| TanStack Query + managers | Default server state for Expo | Pure local state with no network |
| SWR | Team already on SWR from web | Greenfield Expo - Query has richer RN docs in this site |
| Redux + thunks | Legacy store already central | New apps - duplicate cache logic |
| Manual useEffect fetch | One screen, no shared cache | Multiple screens reading same API |

## FAQs

Where do I call focusManager.setEventListener?

Once at module load in `queryClient.ts` or root `_layout.tsx` before any queries run - not inside individual screens.

Does refetchOnWindowFocus work without focusManager on RN?

No - React Native has no `window` focus events. You must wire `AppState` to `focusManager`.

Should mutations retry automatically?

Only **idempotent** mutations with server-side keys. Default `retry: 0` for POST payments - see [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/).

How do I prefetch for the next screen?

```tsx
queryClient.prefetchQuery({ queryKey: ["post", id], queryFn: () => fetchPost(id) });
```

Call on `onPressIn` of list rows for snappy navigation.

How does this relate to offline-first?

TanStack Query gives **stale-while-revalidate** and optional persistence. Full offline-first adds SQLite sync - [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/).

## Related

* [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - fetch timeouts and parsing under `queryFn`
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - `retryDelay` and mutation safety
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - banners and offline queues
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - `useMutation` patterns on device
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - `enabled` queries and cache clear on logout
* [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
