# State Management Basics

10 examples to get you started with State Management - 7 basic and 3 intermediate. Mobile users lose signal constantly; classify state before picking a library.

Highlights / State Management Basics

* Classify state first: server, client UI, URL/navigation, form - then pick a tool
* TanStack Query owns API data; Zustand or useState own client UI that survives screen changes
* Expo Router search params are URL state - prefer them over global stores for filters
* Intermittent networks need stale-while-revalidate, not spinners on every tab focus
* Default greenfield stack: Query + Zustand (or Context) + Router params
* One global store per domain beats a single god object for the whole app
* Secure tokens belong in expo-secure-store - not Query cache or Redux persist

## Prerequisites

Scaffold a production-shaped Expo app with an explicit SDK 57 pin. State examples assume Expo Router and TypeScript.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npm install
```

Confirm the SDK pin before adding state libraries:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Install the default server-state layer most teams adopt on day one:

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Local State for Ephemeral UI

Modal open, sheet expanded, pressed tab index - state that dies when the screen unmounts belongs in **`useState`** on that screen.

```tsx
// app/(tabs)/catalog/index.tsx
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
 
export default function CatalogScreen() {
  const [filterOpen, setFilterOpen] = useState(false);
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable onPress={() => setFilterOpen(true)}>
        <Text>Filters</Text>
      </Pressable>
 
      <Modal visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={{ flex: 1, padding: 24 }}>
          <Text>Filter sheet - local state only</Text>
          <Pressable onPress={() => setFilterOpen(false)}>
            <Text>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
```

* **`filterOpen`** does not need Redux, Zustand, or Context - no other screen reads it
* Unmounting the screen resets state automatically - no manual cleanup
* If three sibling components on the **same screen** need it, lift state to a parent or a screen-level hook - still not global

> **Related:** [useState & useReducer](https://docs.wahwei/reactnative.codeguides.io/state-management/usestate-and-usereducer/) - when local state outgrows a single screen

---

### 2. Props vs Owned State

**Props** flow down; **state** is owned by the component that updates it. Mobile list items should stay presentational.

```tsx
// src/features/catalog/components/ProductRow.tsx
import { Pressable, Text, View } from "react-native";
 
type Props = {
  title: string;
  priceLabel: string;
  selected: boolean;
  onPress: () => void;
};
 
export function ProductRow({ title, priceLabel, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={{ padding: 12, backgroundColor: selected ? "#e0f2fe" : "#fff" }}>
      <Text style={{ fontWeight: "600" }}>{title}</Text>
      <Text>{priceLabel}</Text>
    </Pressable>
  );
}
```

```tsx
// Parent owns selection state
import { useState } from "react";
import { FlatList } from "react-native";
import { ProductRow } from "@/features/catalog/components/ProductRow";
 
const PRODUCTS = [
  { id: "1", title: "Trail Pack", priceLabel: "$89" },
  { id: "2", title: "Day Pack", priceLabel: "$49" },
];
 
export function ProductList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
 
  return (
    <FlatList
      data={PRODUCTS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ProductRow
          title={item.title}
          priceLabel={item.priceLabel}
          selected={selectedId === item.id}
          onPress={() => setSelectedId(item.id)}
        />
      )}
    />
  );
}
```

* **`ProductRow`** has no `useState` - re-renders only when props change
* Parent **`selectedId`** is the single source of truth for highlight state
* Passing **`onPress`** keeps navigation and side effects in the container layer

> **Related:** [../component-patterns/container-presenter-on-mobile/container-presenter-on-mobile.md](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - split data hooks from JSX

---

### 3. Server State vs Client State

**Server state** comes from an API and goes stale. **Client state** is UI the user controls. Mixing them in one `useState` blob causes refetch bugs.

```tsx
// ❌ Anti-pattern - API data in useState with manual useEffect
const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
 
useEffect(() => {
  fetch("/orders")
    .then((r) => r.json())
    .then(setOrders)
    .finally(() => setLoading(false));
}, []);
```

```tsx
// ✅ Server state in TanStack Query; client state stays local
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
 
function OrdersScreen() {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
 
  const { data: orders = [], isPending, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 60_000,
  });
 
  const sorted = [...orders].sort((a, b) =>
    sort === "newest" ? b.placedAt.localeCompare(a.placedAt) : a.placedAt.localeCompare(b.placedAt)
  );
 
  // render sorted, isPending, isError, refetch, setSort...
}
```

* **`orders`** are server-owned - cache, dedupe, and background refresh belong in Query
* **`sort`** is client-owned - no network round-trip when the user toggles
* Pull-to-refresh calls **`refetch()`** - not a manual `setOrders`

> **Related:** [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - cache policies for mobile | [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - decision matrix

---

### 4. Global Client State (When Screens Share It)

Cart badge, theme mode, onboarding completion - state that **survives navigation** but is not API data fits a small global store or split Context.

```tsx
// src/features/cart/useCartStore.ts
import { create } from "zustand";
 
type CartItem = { productId: string; qty: number };
 
type CartStore = {
  items: CartItem[];
  add: (item: CartItem) => void;
  count: () => number;
};
 
export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  count: () => get().items.reduce((n, i) => n + i.qty, 0),
}));
```

```tsx
// Tab bar reads count via selector - not the whole store
import { useCartStore } from "@/features/cart/useCartStore";
import { Text, View } from "react-native";
 
export function CartTabIcon() {
  const count = useCartStore((s) => s.count());
  return (
    <View>
      <Text>Cart</Text>
      {count > 0 && <Text>{count}</Text>}
    </View>
  );
}
```

* **Zustand selectors** limit re-renders - tab icon updates without re-rendering the catalog list
* Do not put **fetched product catalog** in this store - that is server state
* Install with **`npx expo install zustand`** - pure JS, no native module

> **Related:** [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - slices, devtools, and tests

---

### 5. URL State with Expo Router

Filters, tabs, and pagination that should restore on deep link belong in **route search params** - not a global store.

```tsx
// app/(tabs)/catalog/index.tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
 
type Params = { category?: string };
 
export default function CatalogRoute() {
  const { category = "all" } = useLocalSearchParams<Params>();
 
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text>Category: {category}</Text>
      {(["all", "gear", "apparel"] as const).map((c) => (
        <Pressable key={c} onPress={() => router.setParams({ category: c })}>
          <Text style={{ fontWeight: category === c ? "700" : "400" }}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

* **`useLocalSearchParams`** reads the current route's query string equivalent
* **`router.setParams`** updates params without losing stack position - OS back restores prior filter
* Shareable links (`myapp://catalog?category=gear`) work when **`scheme`** is set in `app.config.ts`

> **Related:** [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - typed params in SDK 57

---

### 6. Intermittent Networks and Stale Data

On mobile, assume the user is offline in an elevator. Show **last good data** with a subtle offline banner - not a blank screen.

```tsx
import NetInfo from "@react-native-community/netinfo";
import { onlineManager, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
 
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
);
 
function ProductList() {
  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 2,
  });
 
  const showOfflineCache = !isPending && data && isError;
 
  return (
    <View>
      {showOfflineCache && <Text>Offline - showing saved results</Text>}
      {isFetching && !isPending && <Text>Updating…</Text>}
      {/* render data */}
    </View>
  );
}
```

* **`staleTime`** keeps cached data visible while a background refetch runs
* **`onlineManager`** tells Query when the device reconnects - triggers `refetchOnReconnect`
* **`gcTime`** (formerly `cacheTime`) controls how long unused cache survives in memory

> **Related:** [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - `focusManager` on AppState | [../error-resilience/network-failure-ux/network-failure-ux.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline UX patterns

---

### 7. Root Provider Tree (Minimal)

Wire server-state and session providers once in **`app/_layout.tsx`** - avoid nesting providers per screen.

```tsx
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { SessionProvider } from "@/features/auth/SessionProvider";
 
export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 2 },
        },
      })
  );
 
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
```

* **`QueryClient`** is created once per app session - `useState(() => new QueryClient())` avoids sharing between tests and prod accidentally in the same module
* **`SessionProvider`** exposes auth identity - tokens live behind `expo-secure-store`, not in Query cache
* Keep the tree **flat** - deep provider nesting slows cold start and complicates tests

> **Related:** [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - split contexts when providers re-render too much

---

## Intermediate Examples

### 8. Splitting Server and Client in One Screen

A checkout screen combines **cart (client)**, **shipping options (server)**, and **selected method (client)**. Three buckets, three tools.

```tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useCartStore } from "@/features/cart/useCartStore";
 
export function CheckoutScreen() {
  const items = useCartStore((s) => s.items);
  const [shippingId, setShippingId] = useState<string | null>(null);
 
  const { data: methods = [], isPending } = useQuery({
    queryKey: ["shipping-methods", items.length],
    queryFn: () => fetchShippingMethods(items),
    enabled: items.length > 0,
  });
 
  // UI: cart summary from Zustand, methods from Query, selection from useState
}
```

* **Cart items** are client-global (Zustand) - user added them across screens
* **Shipping methods** depend on cart contents - Query key includes `items.length` for invalidation
* **`shippingId`** is ephemeral UI on this screen - `useState` until submit, then mutation

> **Related:** [../architecture-design/clean-architecture-on-mobile/clean-architecture-on-mobile.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - use cases vs hooks

---

### 9. Last-Known-Good on Cold Start

Persist Query cache to AsyncStorage so catalog screens render immediately after process kill - hydrate before first paint when possible.

```tsx
// src/lib/queryPersister.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
 
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_OFFLINE_CACHE",
});
```

```tsx
// app/_layout.tsx (excerpt)
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { asyncStoragePersister } from "@/lib/queryPersister";
 
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }}
>
  {children}
</PersistQueryClientProvider>
```

```bash
npx expo install @react-native-async-storage/async-storage @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

* **`maxAge`** caps how old persisted cache can be - pair with `staleTime` per query
* Show a **hydration gate** or skeleton only when no persisted data exists - see persistence guide
* Logout must **`queryClient.clear()`** and wipe the persister - stale user data is a security bug

> **Related:** [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - cold-start without jank

---

### 10. Decision Checklist Before Adding a Library

Run this checklist when a teammate proposes Redux, Jotai, or another store.

```text
State checklist (answer before npm install):
 
1. Is it from an API?           → TanStack Query (or RTK Query if Redux already)
2. Is it shareable in a URL?    → Expo Router search params
3. Is it a multi-field form?    → React Hook Form + mutation on submit
4. Is it global client UI?      → Zustand or split Context
5. Is it ephemeral on one screen? → useState / useReducer
6. Is it a secret token?        → expo-secure-store + thin SessionProvider
7. Does compliance need audit?  → Redux Toolkit + DevTools
 
If two libraries answer the same "yes" - pick one and document in an ADR.
```

```tsx
// Document the team default in a comment or ADR link at the store boundary
/** @see docs/adr-state-management - server: Query, client: Zustand, URL: Router */
export const usePreferences = create<PreferencesStore>(/* ... */);
```

* **Seven questions** prevent installing three overlapping global stores
* New squads should read the ADR before introducing MobX, Jotai, or a second Query wrapper
* Revisit when requirements change - offline sync, collaborative editing, or mandated DevTools

> **Related:** [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - ranked decisions | [Best Practices](https://docs.wahwei/reactnative.codeguides.io/state-management/best-practices/) - section summary

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
