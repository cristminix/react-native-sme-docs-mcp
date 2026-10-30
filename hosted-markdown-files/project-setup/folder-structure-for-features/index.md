# Folder Structure for Features

Feature slices group everything a product area needs in one directory; layer folders (`components/`, `hooks/`, `screens/` at the repo root) scatter related code across the tree. The split you pick on day one determines how painful the first 50 features feel.

Highlights / Folder Structure for Features

* Feature slices colocate screens, hooks, and components per product area - layers split by file type across the repo
* Keep app/ routes thin - import FeatureScreen from features/ and render it
* index.ts is each feature's public API - other features import from there, not deep paths
* Shared primitives live in components/ui/ - product-specific UI stays inside the feature folder
* Switch from layers to slices when cross-feature imports and god screens outnumber isolated changes

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
src/
├── components/
│   └── ui/                  # shared primitives (Button, Screen, TextField)
├── lib/                     # api client, storage, analytics helpers
├── features/
│   └── orders/
│       ├── index.ts         # public exports only
│       ├── screens/
│       │   └── OrdersScreen.tsx
│       ├── components/
│       │   └── OrderRow.tsx
│       ├── hooks/
│       │   └── useOrders.ts
│       └── types.ts
└── types/                   # truly global types (User, Session)
 
app/
└── (tabs)/
    └── orders/
        └── index.tsx        # export { OrdersScreen as default } from "@/features/orders"
```

```ts
// src/features/orders/index.ts
export { OrdersScreen } from "./screens/OrdersScreen";
export type { Order } from "./types";
```

```tsx
// app/(tabs)/orders/index.tsx - route stays one line when possible
export { OrdersScreen as default } from "@/features/orders";
```

**When to reach for this:**

* Onboarding engineers to a feature ("everything for Orders lives under `features/orders/`").
* Preventing god screens that import hooks from six unrelated folders.
* Drawing import boundaries so `features/inbox` never reaches into `features/orders/components/OrderRow.tsx`.
* Deciding whether a new screen belongs in a layer folder or a feature slice.

## Working Example

```tsx
// src/features/orders/types.ts
export type OrderStatus = "pending" | "shipped" | "delivered";
 
export type Order = {
  id: string;
  title: string;
  totalCents: number;
  status: OrderStatus;
};
```

```tsx
// src/features/orders/hooks/useOrders.ts
import { useCallback, useEffect, useState } from "react";
import type { Order } from "../types";
 
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("https://jsonplaceholder.typicode.com/todos?_limit=6");
      if (!response.ok) throw new Error("Failed to load orders");
      const data = (await response.json()) as Array<{ id: number; title: string; completed: boolean }>;
      setOrders(
        data.map((row) => ({
          id: String(row.id),
          title: row.title,
          totalCents: 1999,
          status: row.completed ? "delivered" : "pending",
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    refresh();
  }, [refresh]);
 
  return { orders, loading, error, refresh };
}
```

```tsx
// src/features/orders/components/OrderRow.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Order } from "../types";
 
type Props = {
  order: Order;
  onPress: (id: string) => void;
};
 
export function OrderRow({ order, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(order.id)} accessibilityRole="button">
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {order.title}
        </Text>
        <Text style={styles.meta}>
          ${(order.totalCents / 100).toFixed(2)} · {order.status}
        </Text>
      </View>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 16 },
  textBlock: { gap: 4 },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  meta: { fontSize: 13, color: "#64748b" },
});
```

```tsx
// src/features/orders/screens/OrdersScreen.tsx
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { OrderRow } from "../components/OrderRow";
import { useOrders } from "../hooks/useOrders";
 
export function OrdersScreen() {
  const { orders, loading, error, refresh } = useOrders();
 
  if (loading && orders.length === 0) {
    return <ActivityIndicator style={styles.centered} />;
  }
 
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
 
  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderRow order={item} onPress={() => {}} />}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      contentContainerStyle={styles.list}
    />
  );
}
 
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingVertical: 8 },
  error: { color: "#b91c1c", padding: 24, textAlign: "center" },
});
```

```ts
// tsconfig.json paths (Expo default template includes @/* → project root or src)
// "paths": { "@/*": ["./src/*"] }
```

**What this demonstrates:**

* **`features/orders/`** owns types, hooks, components, and the screen - a new engineer opens one folder to understand Orders.
* **`OrderRow`** is presentational; **`useOrders`** owns async work - the screen orchestrates, it does not fetch inline.
* **`index.ts`** exports only `OrdersScreen` and `Order` - internals stay private.
* **`app/(tabs)/orders/index.tsx`** re-exports the screen - Expo Router owns URLs; features own implementation.

## Deep Dive

### How It Works

* **Feature slices (vertical)** organize by product capability - `features/orders`, `features/inbox`. Changes to Orders touch files under one subtree.
* **Layers (horizontal)** organize by technical role - global `components/`, `hooks/`, `screens/`. Every feature sprinkles files across multiple top-level folders.
* **Expo Router `app/`** maps URLs to screens. Route files should stay thin entry points; heavy logic lives in `features/`.
* **`index.ts` public APIs** enforce import boundaries - cross-feature imports use `@/features/orders`, never `@/features/orders/components/OrderRow`.
* **Shared `components/ui/`** holds design-system primitives used by many features; feature `components/` holds product-specific composition.

### Feature Slice vs Layer Layout

| Approach | Structure | Strength | Weakness |
| --- | --- | --- | --- |
| **Feature slice** | `features/orders/{screens,hooks,components}` | Onboarding, refactors, and PRs stay local | Risk of duplicating similar list rows across features |
| **Layered** | `screens/`, `hooks/`, `components/` at root | Familiar to web devs; easy to find "all hooks" | Cross-folder imports explode; god screens emerge |
| **Hybrid (recommended)** | `components/ui/` + `features/*` + thin `app/` | Shared primitives without a global component graveyard | Requires discipline on `index.ts` exports |

```text
# Layered - fine for < 5 screens, painful at scale
src/
├── components/       # every feature's rows, cards, modals mixed together
├── hooks/
├── screens/
└── services/
 
# Feature slice - scales with team and feature count
src/
├── components/ui/
├── lib/
└── features/
    ├── orders/
    ├── inbox/
    └── settings/
```

### Import Rules

| Rule | Rationale |
| --- | --- |
| Route files import from `@/features/<name>` only | Keeps navigation decoupled from feature internals |
| Features import other features via their `index.ts` | Prevents deep-path coupling |
| Never import sibling feature `components/` directly | OrderRow is not a shared primitive - duplicate or promote to `ui/` |
| `lib/` and `components/ui/` are the shared layer | Cross-cutting utilities and design tokens live here |

```ts
// ✅ Cross-feature import through public API
import type { Order } from "@/features/orders";
 
// ❌ Reaching into another feature's internals
import { OrderRow } from "@/features/orders/components/OrderRow";
```

### When to Migrate Layers → Slices

| Signal | Action |
| --- | --- |
| Screen files exceed ~200 lines of orchestration | Extract to `features/<name>/` with container/presenter split |
| PRs routinely touch 4+ top-level folders for one feature | Create a feature folder and move related files |
| `components/` has dozens of single-use wrappers | Move product-specific components into feature folders |
| Onboarding doc says "search the repo for Orders" | Colocate Orders under `features/orders/` |

Migrate one feature at a time - start with the noisiest god screen, not a big-bang rewrite.

### TypeScript Notes

```tsx
// src/components/ui/Screen.tsx - shared primitive, no feature imports
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
 
type ScreenProps = {
  title: string;
  children: ReactNode;
};
 
export function Screen({ title, children }: ScreenProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  body: { flex: 1, gap: 8 },
});
```

```tsx
// features/settings/screens/SettingsScreen.tsx - feature screen uses shared primitive
import { Screen } from "@/components/ui/Screen";
import { Text } from "react-native";
 
export function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Text>Notifications, account, and privacy live here.</Text>
    </Screen>
  );
}
```

Keep `components/ui/` free of feature imports. If `Screen` needs feature data, pass it as props - do not import from `features/`.

## Gotchas

* **Global `components/` graveyard** - Every one-off card lands in `components/` because it is "reusable someday." **Fix:** Default to `features/<name>/components/`; promote to `ui/` only after the second consumer exists.
* **Fat route files in `app/`** - Business logic, fetch calls, and modals live in `app/(tabs)/orders/index.tsx`. **Fix:** Re-export from `features/orders`; keep routes under ~5 lines.
* **Deep imports across features** - `features/inbox` imports `features/orders/components/OrderRow`. **Fix:** Import types from `@/features/orders`; duplicate small presentational rows or extract shared UI to `components/ui/`.
* **No `index.ts` public API** - Fifty files per feature with no export boundary; everything is public. **Fix:** Export only screens and shared types from `index.ts`; treat other paths as private.
* **Layer folders plus feature folders** - `screens/OrdersScreen.tsx` and `features/orders/screens/OrdersScreen.tsx` both exist. **Fix:** Pick one scheme per app; hybrid confusion doubles search cost.
* **Shared hooks in the wrong layer** - `useOrders` in global `hooks/` but only Orders uses it. **Fix:** Colocate single-feature hooks under `features/orders/hooks/`; reserve global `hooks/` for truly shared behavior (`useAppTheme`).
* **Monorepo packages without feature boundaries** - Shared `@repo/ui` grows feature-specific props. **Fix:** Keep product features in the app; packages hold primitives only. See [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Feature slices (`features/*`) | Growing apps, multiple squads, frequent feature work | Single-screen spike - folder overhead not worth it |
| Layered (`components/`, `hooks/`, `screens/`) | Tiny apps with < 5 screens and one engineer | Cross-feature imports and god screens are already common |
| Domain packages in a monorepo (`packages/orders`) | Multiple apps share entire feature modules | One app - in-repo slices are simpler |
| Colocation only (no `features/` prefix) | Small teams prefer flat `src/orders/` | Large repos where feature name in path aids search |
| Route-driven only (`app/` holds everything) | Prototype due in days | Production apps - routes become god screens within weeks |

## FAQs

What is a feature slice?

A directory that contains everything one product area needs - screens, hooks, components, types - so engineers work in one subtree. Example: `src/features/orders/`.

What is a layered structure?

Top-level folders grouped by technical role: `components/`, `hooks/`, `screens/`, `services/`. Every feature spreads files across these folders instead of one slice.

What goes in app/ vs features/?

`app/` holds Expo Router route files - URL mapping and layout nesting. `features/` holds implementation - screens, hooks, and feature components. Route files should re-export feature screens.

What goes in components/ui/ vs features/\*/components/?

`components/ui/` - design-system primitives used by many features (Button, Screen, TextField). `features/*/components/` - product-specific UI used only inside that feature (OrderRow, InboxThread).

Why use index.ts in each feature?

It defines the public API. Other features and routes import `@/features/orders` - not deep paths. Internals can change without breaking consumers.

Can features import from other features?

Yes, but only through the other feature's `index.ts` - typically types or a single exported screen. Avoid importing internal components; that couples features silently.

When should I use layered folders instead?

Very small apps with few screens and one developer. Once PRs routinely touch multiple top-level folders for one feature, migrate to slices.

How do I migrate from layers to slices?

Pick the worst god screen. Create `features/<name>/`, move its screen, hooks, and components, add `index.ts`, and thin the route file. Repeat per feature - no big-bang rewrite required.

Where do API clients and auth live?

Cross-cutting infrastructure in `src/lib/` - `api.ts`, `storage.ts`, `analytics.ts`. Feature hooks call into `lib/`; `lib/` does not import from `features/`.

Should hooks be global or per-feature?

Per-feature when only one screen uses them (`useOrders` in `features/orders/hooks/`). Global in `src/hooks/` when shared across features (`useAppTheme`, `useSession`).

Gotcha: why did our global components/ folder become unmaintainable?

Single-use wrappers accumulate because "components/" feels like the right place for any JSX file. Default to feature-local components; promote to `ui/` only with a second real consumer.

How does this interact with container/presenter?

`features/<name>/screens/` holds containers (data, navigation). `features/<name>/components/` holds presenters (props-only UI). See [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/).

Does Expo Router require features/?

No - Router only requires an `app/` directory. `features/` is an organizational convention that keeps routes thin and implementation testable.

How do path aliases like @/\* work?

Expo templates ship `tsconfig.json` with `"paths": { "@/*": ["./*"] }` or `"./src/*"`. Point `@/` at `src/` so `@/features/orders` resolves consistently. Metro respects the same paths when configured via `expo/tsconfig` or `babel-plugin-module-resolver` if needed.

What about tests - colocate or \_\_tests\_\_ folder?

Colocate `OrderRow.test.tsx` next to `OrderRow.tsx` inside the feature folder. Feature integration tests live in `features/orders/__tests__/` if you prefer grouping. Keep tests inside the slice you are testing.

## Related

* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - default Expo app layout before you add `src/features/`
* [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - `default@sdk-57` ships the `app/` tree you extend with feature folders
* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - feature folder layout and container/presenter examples
* [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - symptoms of missing feature boundaries
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - naming and testing inside feature screens
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - shared `packages/ui` vs app-level `features/`

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
