# @tanstack/react-query

Server state defaults for Expo apps. TanStack Query is the **default server-state layer** - it replaces hand-rolled `useEffect` fetches and keeps API data out of Zustand. For cache policies, offline persistence, and optimistic mutations, see the full guide at [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/).

Highlights / @tanstack/react-query

* QueryClient defaults: staleTime 30s, gcTime 5min, retry 2 - tuned for mobile LTE
* Wire onlineManager to NetInfo and focusManager to AppState at bootstrap
* One QueryClient per app - create in \_layout, never per screen
* Mutations invalidate related query keys - not manual Zustand cache copies
* JS-only install - npx expo install @tanstack/react-query plus NetInfo
* Full patterns in state-management/tanstack-query - this page is the defaults card

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo
```

```tsx
// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
 
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true, // wired via focusManager below
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
```

```tsx
// src/lib/setupMobileQuery.ts - call once at bootstrap
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { focusManager, onlineManager } from "@tanstack/react-query";
 
export function setupMobileQuery() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(online);
    })
  );
 
  const onAppStateChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  };
 
  const sub = AppState.addEventListener("change", onAppStateChange);
  return () => sub.remove();
}
```

```tsx
// app/_layout.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { createQueryClient } from "@/lib/queryClient";
import { setupMobileQuery } from "@/lib/setupMobileQuery";
 
export default function RootLayout() {
  const [client] = useState(createQueryClient);
 
  useEffect(() => setupMobileQuery(), []);
 
  return (
    <QueryClientProvider client={client}>
      <Stack />
    </QueryClientProvider>
  );
}
```

**When to reach for this:**

* Same API data on **multiple screens** - cache by `queryKey`.
* **Pull-to-refresh**, background refetch, or stale-while-revalidate on spotty LTE.
* **Mutations** should invalidate related queries after `createOrder`, `updateProfile`, etc.
* You need API data **out of** Redux, Zustand, and `useEffect` spaghetti.

## Working Example

```tsx
// api/orders.ts
export type Order = { id: string; status: string; totalCents: number };
 
export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const res = await fetch("https://api.example.com/orders", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

```tsx
// screens/OrdersScreen.tsx
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { fetchOrders } from "@/api/orders";
 
export function OrdersScreen() {
  const [refreshing, setRefreshing] = useState(false);
 
  const { data: orders = [], isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) => fetchOrders(signal),
    staleTime: 60_000,
  });
 
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
 
  if (isPending) return <Text>Loading…</Text>;
  if (isError) return <Text>Error: {(error as Error).message}</Text>;
 
  return (
    <View style={{ flex: 1 }}>
      {isFetching && !refreshing && <Text>Updating…</Text>}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Text>
            {item.id} - {item.status} - ${(item.totalCents / 100).toFixed(2)}
          </Text>
        )}
      />
    </View>
  );
}
```

**What this demonstrates:**

* **`staleTime: 60_000`** - navigating away and back within one minute does not refetch.
* **`signal` in queryFn** - Query cancels in-flight fetch when the screen unmounts.
* **`focusManager` + AppState** - returning from background refetches stale queries automatically.
* **`onlineManager` + NetInfo** - pauses retries offline; `refetchOnReconnect` fires on LTE return.
* **No Zustand** - order rows live in Query cache, not a global store.

## Deep Dive

### Default Options Reference

| Option | Default in recipe | Mobile guidance |
| --- | --- | --- |
| `staleTime` | `30_000` | Catalogs: 1–5 min; balances: 0–30s |
| `gcTime` | `5 * 60_000` | Inactive cache retention after unmount |
| `retry` | `2` | Stop sooner on mobile to save battery |
| `refetchOnReconnect` | `true` | Pair with `onlineManager` |
| `refetchOnWindowFocus` | `true` | Requires `focusManager` on RN |

### Query Key Conventions

```tsx
["products"][("products", { category: "shoes" })][("order", orderId)][
  // Invalidate all product queries after a mutation
  queryClient.invalidateQueries({ queryKey: ["products"] })
];
```

Include **stable serializable params** - not functions, class instances, or non-JSON values.

### Persistence (Optional)

For offline read-mostly shells, add persistence - full patterns in [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/):

```bash
npx expo install @react-native-async-storage/async-storage \
  @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

## Gotchas

* **Skipping `setupMobileQuery`** - Queries never refetch on foreground; retries continue offline. **Fix:** Wire `focusManager` and `onlineManager` at bootstrap.
* **Storing API responses in Zustand** - Manual cache invalidation on every mutation. **Fix:** Query owns server data; Zustand owns UI flags only.
* **New QueryClient per screen** - Cache does not share across routes. **Fix:** One client in `_layout.tsx` via `useState(createQueryClient)`.
* **`staleTime: 0` everywhere** - Refetch storm on every tab focus drains battery. **Fix:** Tune per query - stable settings can use minutes.
* **Missing `signal` in fetch** - In-flight requests complete after unmount, causing setState warnings. **Fix:** Forward `signal` from `queryFn` to `fetch`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| TanStack Query | Server cache, mutations, dedupe | Ephemeral UI-only toggles |
| Zustand | Cart badge, filters, onboarding flags | Product catalog from API |
| RTK Query | Team already on Redux Toolkit | Greenfield with only REST reads |
| SWR | Web-first monorepo sharing hooks | RN focus/online wiring is manual |
| Raw `useEffect` + `fetch` | Prototype only | Any screen reused twice |

## FAQs

Where is the full TanStack Query guide?

[TanStack Query in State Management](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - offline persistence, optimistic mutations, infinite queries, and SQLite persisters.

Does Query need a native rebuild?

No - `@tanstack/react-query` is JS-only. `@react-native-community/netinfo` is installed via `npx expo install` and may require a dev client refresh on some SDKs.

What staleTime should feeds use?

30–60 seconds is a sensible default. Increase for rarely changing data; decrease for live dashboards.

How do I test components using useQuery?

Wrap with `QueryClientProvider` using a test client with `retry: false` and `gcTime: Infinity`. See [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/).

Can Query replace Zustand?

No for client UI state. Yes for server-fetched entities. Use both - see [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/).

## Related

* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - full server-state cookbook
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - focus/online manager details
* [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/) - client state boundary
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline banners and mutation queues
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - `useInfiniteQuery`
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - pick and pin dependencies

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
