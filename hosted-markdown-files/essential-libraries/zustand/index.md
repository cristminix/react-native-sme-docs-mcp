# zustand

Minimal global store patterns for Expo SDK 57. Zustand fits **client UI state** that survives screen changes - cart, preferences, feature tour completion. Pair with [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) for API data. For slices, devtools, immer, and testing patterns, see [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/).

Highlights / zustand

* No Provider tree - import useStore hook anywhere in the JS bundle
* Selectors prevent list screens from re-rendering on unrelated slice updates
* One store per domain: cart, preferences, onboarding flags
* persist + MMKV or AsyncStorage for non-secret preferences only
* Never store API responses - TanStack Query owns server cache
* Full patterns in state-management/zustand - this page is the minimal cookbook

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
  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  totalQty: () => get().items.reduce((n, i) => n + i.qty, 0),
}));
```

```tsx
// Consumer - selector limits re-renders
import { useCartStore } from "@/features/cart/cartStore";
 
const qty = useCartStore((s) => s.totalQty());
```

**When to reach for this:**

* **Multiple screens** read/write the same client state (cart badge, filters).
* Context causes **profiler-visible** re-render storms - selectors fix it.
* You want **~1KB** global state without Redux ceremony.
* Updates are **synchronous UI** - not server cache with stale times.

## Working Example

```tsx
// stores/preferencesStore.ts - separate domain from cart
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
      toggleHaptics: () =>
        set((s) => ({ hapticsEnabled: !s.hapticsEnabled }), false, "preferences/toggleHaptics"),
    }),
    { name: "PreferencesStore", enabled: __DEV__ }
  )
);
```

```tsx
// screens/SettingsScreen.tsx
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { useCartStore } from "@/features/cart/cartStore";
 
export function SettingsScreen() {
  const theme = usePreferencesStore((s) => s.theme);
  const hapticsEnabled = usePreferencesStore((s) => s.hapticsEnabled);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const toggleHaptics = usePreferencesStore((s) => s.toggleHaptics);
  const cartQty = useCartStore((s) => s.totalQty());
 
  function onToggleHaptics() {
    if (hapticsEnabled) void Haptics.selectionAsync();
    toggleHaptics();
  }
 
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Cart items: {cartQty}</Text>
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
```

```tsx
// stores/draftStore.ts - persist non-secret drafts (AsyncStorage)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
 
// npx expo install @react-native-async-storage/async-storage
 
type DraftState = { text: string; setText: (text: string) => void };
 
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      text: "",
      setText: (text) => set({ text }),
    }),
    {
      name: "composer-draft",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ text: s.text }),
    }
  )
);
```

**What this demonstrates:**

* **Selectors** - `useCartStore((s) => s.totalQty())` avoids re-render when `theme` changes.
* **One store per domain** - `cartStore` and `preferencesStore` stay independent modules.
* **`devtools` in dev only** - action names appear in Redux DevTools adapters.
* **`persist` + `partialize`** - only draft text persists; actions are excluded.
* **No API data** - cart items are client-side until checkout calls the server.

## Deep Dive

### Store Layout

```text
src/
  features/cart/cartStore.ts       ← domain store
  stores/preferencesStore.ts       ← cross-cutting UI prefs
  stores/draftStore.ts             ← persist middleware
```

Keep stores **colocated with features** when only one screen uses them; promote to `stores/` when shared.

### Persist Backends

| Backend | Install | Use When |
| --- | --- | --- |
| AsyncStorage | `npx expo install @react-native-async-storage/async-storage` | Small JSON, boot hydration |
| MMKV | `npx expo install react-native-mmkv` | Sync reads every keystroke - see [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/) |
| None | - | Ephemeral UI - cart cleared on logout |

### Logout Cleanup

```tsx
import { useCartStore } from "@/features/cart/cartStore";
import { queryClient } from "@/lib/queryClient";
 
export function onLogout() {
  useCartStore.setState({ items: [] });
  queryClient.clear();
  // Also clear SecureStore tokens - see auth-session docs
}
```

Client and server caches must clear together.

## Gotchas

* **Selecting entire store** - `useCartStore()` re-renders on every cart change. **Fix:** Always pass a selector.
* **Storing API responses** - Cache invalidation becomes manual. **Fix:** TanStack Query.
* **Side effects inside `set`** - `fetch` in `add()` couples store to network. **Fix:** Component calls API, then `set`.
* **One giant store** - Import cycles and hot reload pain. **Fix:** Split by domain.
* **persist everything** - Large JSON slows cold start. **Fix:** `partialize`, TTL, or Query persistence for server reads.
* **Secrets in persist** - Tokens in AsyncStorage/MMKV are a security defect. **Fix:** `expo-secure-store` only.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Zustand | Global client UI + selectors | Server list cache |
| Context (split) | Theme/session, zero deps | High-frequency cart updates |
| Redux Toolkit | Audit + middleware ecosystem | Greenfield with only cart + theme |
| TanStack Query | API data with stale times | Synchronous UI toggles |
| MMKV raw | Speed-critical flags without store semantics | You need update actions |

## FAQs

Where is the full Zustand guide?

[Zustand in State Management](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - immer, subscribeWithSelector, testing reset, and Expo Router patterns.

Does Zustand need a Provider?

No - stores are module singletons. Import hooks in any route file.

Can Zustand replace TanStack Query?

No for server state. Zustand holds optimistic UI flags; Query owns fetched entities and cache keys.

AsyncStorage or MMKV for persist?

AsyncStorage for infrequent reads at boot. MMKV when profiling shows async hydration flicker on hot paths.

How do I reset stores in tests?

`beforeEach(() => useCartStore.setState({ items: [] }, true))` - see [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/).

## Related

* [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - full cookbook with slices and testing
* [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) - server state boundary
* [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/) - sync persist backend
* [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - cold start patterns
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - pick and pin dependencies

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
