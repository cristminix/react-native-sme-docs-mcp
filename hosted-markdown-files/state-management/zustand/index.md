# Zustand

Lightweight global stores with minimal boilerplate. Zustand fits **client UI state** that survives screen changes - cart, preferences, feature tour completion. Pair with TanStack Query for API data; do not duplicate server caches in Zustand.

Highlights / Zustand

* No provider tree - import useStore hook anywhere in the JS bundle
* Selectors prevent list screens from re-rendering on unrelated slice updates
* One store per domain: cart, preferences, onboarding flags
* persist middleware + AsyncStorage for non-secret preferences only
* devtools middleware works with Flipper / Redux DevTools adapters in dev
* Reset store state in tests with useStore.setState(initial)

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install zustand
```

```tsx
// src/features/cart/cartStore.ts
import { create } from "zustand";
 
type CartItem = { productId: string; qty: number };
 
type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string) => void;
  totalQty: () => number;
};
 
export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i
          ),
        };
      }
      return { items: [...s.items, item] };
    }),
  remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  totalQty: () => get().items.reduce((n, i) => n + i.qty, 0),
}));
```

```tsx
// Consumer - selector limits re-renders
import { useCartStore } from "@/features/cart/cartStore";
 
const qty = useCartStore((s) => s.totalQty());
```

**When to reach for this:**

* **Multiple screens** read/write the same client state (cart badge, filters persisted locally).
* Context causes **profiler-visible** re-render storms - selectors fix it.
* You want **small bundle** (~1KB) without Redux ceremony.
* State updates are **synchronous** UI - not server cache with stale times.
* Team default from [ADR](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) for global client UI.

## Working Example

```tsx
// stores/preferencesStore.ts - slice pattern + devtools in dev
import { create } from "zustand";
import { devtools } from "zustand/middleware";
 
type ThemeMode = "system" | "light" | "dark";
 
type PreferencesState = {
  theme: ThemeMode;
  hapticsEnabled: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleHaptics: () => void;
};
 
export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    (set) => ({
      theme: "system",
      hapticsEnabled: true,
      setTheme: (theme) => set({ theme }, false, "preferences/setTheme"),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled }), false, "preferences/toggleHaptics"),
    }),
    { name: "PreferencesStore", enabled: __DEV__ }
  )
);
 
// stores/cartStore.ts - separate domain store
import { create } from "zustand";
 
type CartItem = { productId: string; title: string; qty: number };
 
type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  clear: () => void;
};
 
export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  clear: () => set({ items: [] }),
}));
 
// --- UI ---
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
 
export function SettingsScreen() {
  const theme = usePreferencesStore((s) => s.theme);
  const hapticsEnabled = usePreferencesStore((s) => s.hapticsEnabled);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const toggleHaptics = usePreferencesStore((s) => s.toggleHaptics);
 
  function onToggleHaptics() {
    if (hapticsEnabled) void Haptics.selectionAsync();
    toggleHaptics();
  }
 
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Theme: {theme}</Text>
      <Pressable onPress={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Text>Toggle theme</Text>
      </Pressable>
      <Pressable onPress={onToggleHaptics}>
        <Text>Haptics: {hapticsEnabled ? "On" : "Off"}</Text>
      </Pressable>
    </View>
  );
}
 
export function CartBadge() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  return <Text>Cart ({count})</Text>;
}
```

```tsx
// cartStore.test.ts
import { useCartStore } from "./cartStore";
 
const initial = useCartStore.getState();
 
beforeEach(() => {
  useCartStore.setState(initial, true);
});
 
test("add merges quantity", () => {
  useCartStore.getState().add({ productId: "1", title: "Pack", qty: 1 });
  useCartStore.getState().add({ productId: "1", title: "Pack", qty: 2 });
  expect(useCartStore.getState().items).toHaveLength(2); // or merge policy per product rules
});
```

**What this demonstrates:**

* **Separate stores per domain** - preferences changes do not touch cart subscribers.
* **`devtools` middleware** names actions for Redux DevTools in development only.
* **Selectors** on `useCartStore` keep tab badge updates cheap.
* **`setState(..., true)`** replaces entire state in tests - deterministic reset.
* **Haptics** stay in the component - store holds flags, not native side effects.

## Deep Dive

### Slices in One Store (Optional)

Combine related slices when they share devtools namespace:

```tsx
import { create } from "zustand";
 
type BearSlice = { bears: number; addBear: () => void };
type FishSlice = { fish: number; addFish: () => void };
 
type Store = BearSlice & FishSlice;
 
export const useBoundStore = create<Store>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));
 
function createBearSlice(set: Parameters<typeof create<BearSlice>>[0]): BearSlice {
  return {
    bears: 0,
    addBear: () => set((s) => ({ bears: s.bears + 1 })),
  };
}
```

Prefer **multiple `create()` stores** until cross-slice transactions are required.

### persist Middleware

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
 
export const usePreferencesStore = create(
  persist<PreferencesState>(
    (set) => ({
      theme: "system",
      hapticsEnabled: true,
      setTheme: (theme) => set({ theme }),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
    }),
    {
      name: "preferences-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ theme: s.theme, hapticsEnabled: s.hapticsEnabled }),
    }
  )
);
```

* **`partialize`** excludes actions from disk - only serialize data fields.
* **Never persist tokens** - use `expo-secure-store` via custom storage adapter - see [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/).
* Bump **`name`** (`preferences-v2`) when schema changes - or run migration in `onRehydrateStorage`.

### Devtools on Device

`devtools` middleware sends actions to Redux DevTools Extension when debugging JS via Flipper or remote desktop. Disable in production: `enabled: __DEV__`.

### subscribeWithSelector

```tsx
import { subscribeWithSelector } from "zustand/middleware";
 
useCartStore.subscribe(
  (s) => s.items.length,
  (len) => console.log("cart size", len)
);
```

Use for analytics side effects - not React renders.

### Immer (Optional)

```bash
npm install immer
```

```tsx
import { immer } from "zustand/middleware/immer";
 
create<CartState>()(
  immer((set) => ({
    items: [],
    add: (item) =>
      set((state) => {
        state.items.push(item);
      }),
  }))
);
```

## Gotchas

* **Selecting entire store** - `useCartStore()` without selector re-renders on every cart change. **Fix:** `useCartStore((s) => s.items.length)`.
* **Derived data in store without memoization** - `get().items.map(...)` in render via selector runs each time. **Fix:** Computed selector or `useMemo` on result.
* **Storing API responses** - Cache invalidation becomes manual. **Fix:** TanStack Query.
* **Side effects inside `set`** - Calling `fetch` in `add()` couples store to network. **Fix:** Component or thunk calls API, then `set`.
* **One giant store** - Import cycles and hot reload pain. **Fix:** `features/cart/cartStore.ts`, `features/settings/preferencesStore.ts`.
* **persist everything** - Large cart JSON slows cold start. **Fix:** `partialize`, TTL, or Query persistence for server reads.
* **Forgetting test reset** - Tests leak state order-dependent. **Fix:** `beforeEach(() => useCartStore.setState(initial, true))`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Zustand | Global client UI + selectors | Server list cache |
| Context (split) | Theme/session, zero deps | High-frequency cart updates |
| Redux Toolkit | Audit + middleware ecosystem | Greenfield with only cart + theme |
| Jotai | Atomic derived UI graphs | Team unfamiliar with atoms |
| MMKV raw | Speed-critical persistence | You still need update semantics |

## FAQs

Does Zustand need a Provider?

No - stores are module singletons. Multiple React roots (rare in RN) would share the same store unless you pass `createStore` via context.

Zustand vs Redux Toolkit in 2026?

Default Zustand for client global state. Redux when DevTools, middleware, and organizational standards require centralized reducers - see [Redux Toolkit](https://docs.wahwei/reactnative.codeguides.io/state-management/redux-toolkit/).

How do I use Zustand with Expo Router?

Import hooks in any route file. Orchestrate navigation in the route; store holds data. Avoid importing `router` inside store modules.

Can Zustand replace TanStack Query?

No for server state. Zustand can hold optimistic UI flags; Query owns fetched entities and cache keys.

How big is the bundle impact?

Zustand is ~1–3KB gzipped - negligible vs a single image asset. Redux Toolkit is larger but includes RTK Query.

Async actions pattern?

Keep async in hooks or services:

```tsx
async function checkout() {
  set({ status: "pending" });
  try {
    await api.checkout(get().items);
    set({ status: "done", items: [] });
  } catch (e) {
    set({ status: "error" });
  }
}
```

TypeScript best practice?

Define `CartState` type explicitly; use `create<CartState>()(...)` with middleware for inferred middleware types.

How do I hydrate on app boot?

Use `persist` + `onRehydrateStorage` callback to gate UI - see [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/).

Multiple components same selector?

Zustand uses `Object.is` on selector result - return primitives or stable references to avoid extra renders.

Integration with React Compiler?

Selectors are still recommended - compiler memoization does not replace cross-component store subscriptions.

Logout cleanup?

`useCartStore.setState({ items: [] })` plus `queryClient.clear()` - client and server caches must clear together.

Can I use Zustand with immer and devtools together?

Yes - middleware order matters: `devtools(persist(immer(...)))` - check Zustand docs for your middleware chain.

## Related

* [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/) - when global client state is justified
* [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - before reaching for Zustand
* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server state boundary
* [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - persist and rehydrate safely
* [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - Zustand as best for global UI
* [../testing/mobile-testing-basics/mobile-testing-basics.md](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - reset stores between tests

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
