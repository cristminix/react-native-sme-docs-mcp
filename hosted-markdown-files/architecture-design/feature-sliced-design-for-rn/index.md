# Feature-Sliced Design for RN

Feature-Sliced Design (FSD) organizes front-end code into **layers** and **slices** with strict import rules. On Expo, map FSD to `app/`, `features/`, `entities/`, and `shared/` - you get the boundary benefits without seven top-level folders on day one.

Highlights / Feature-Sliced Design for RN

* Map FSD layers to app/, features/, entities/, and shared/ - skip pages/ and widgets/ until you need them
* Import rule: a layer may only import from layers below it
* Each slice exposes a public API via index.ts - @x notation is optional in RN
* Segments (ui, model, api, lib) group files inside a slice without inventing new top-level folders
* Expo Router lives in app/ - it is the FSD app layer, not a dumping ground for feature logic
* Enforce boundaries with ESLint no-restricted-imports before the graph becomes unmappable

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
src/
├── app/                    # FSD "app" layer - providers, init (NOT Expo Router's app/)
│   └── providers/
│       └── AppProviders.tsx
├── features/
│   ├── auth/
│   │   ├── index.ts        # public API
│   │   ├── ui/
│   │   ├── model/
│   │   └── api/
│   └── orders/
│       ├── index.ts
│       ├── ui/
│       ├── model/
│       └── api/
├── entities/
│   ├── user/
│   │   ├── index.ts
│   │   ├── model/
│   │   └── ui/             # UserAvatar - entity-scoped UI
│   └── order/
│       └── index.ts
└── shared/
    ├── ui/                 # Button, Screen
    ├── api/
    ├── config/
    └── lib/
 
app/                        # Expo Router - route files only
└── (tabs)/
    └── orders/
        └── index.tsx
```

```ts
// Import rule (enforced in ESLint):
// app → features → entities → shared
// features/auth must NOT import features/orders/ui/*
```

**When to reach for this:**

* The codebase has 10+ features and cross-imports are tangled.
* Onboarding requires a map ("where does checkout code live?").
* You want lint-enforceable boundaries without adopting Nx on day one.
* A web team already uses FSD and mobile should align.

## Working Example

```tsx
// src/entities/user/model/types.ts
export type User = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};
```

```tsx
// src/entities/user/ui/UserAvatar.tsx
import { Image, StyleSheet, View } from "react-native";
import type { User } from "../model/types";
 
type Props = { user: User; size?: number };
 
export function UserAvatar({ user, size = 40 }: Props) {
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.image} />
      ) : null}
    </View>
  );
}
 
const styles = StyleSheet.create({
  circle: { borderRadius: 999, overflow: "hidden", backgroundColor: "#e5e7eb" },
  image: { width: "100%", height: "100%" },
});
```

```ts
// src/entities/user/index.ts
export type { User } from "./model/types";
export { UserAvatar } from "./ui/UserAvatar";
```

```tsx
// src/features/orders/ui/OrderRow.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { UserAvatar, type User } from "@/entities/user";
import type { Order } from "@/entities/order";
 
type Props = {
  order: Order;
  placedBy: User;
  onPress: (orderId: string) => void;
};
 
export function OrderRow({ order, placedBy, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(order.id)}>
      <UserAvatar user={placedBy} size={36} />
      <View style={styles.meta}>
        <Text style={styles.title}>{order.title}</Text>
        <Text style={styles.sub}>{placedBy.displayName}</Text>
      </View>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 16 },
  meta: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 14, color: "#6b7280" },
});
```

```tsx
// src/features/orders/ui/OrdersScreen.tsx
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/shared/ui/Screen";
import { useOrdersScreen } from "../model/useOrdersScreen";
import { OrderRow } from "./OrderRow";
 
export function OrdersScreen() {
  const { orders, usersById, loading, refresh, onOrderPress } = useOrdersScreen();
 
  return (
    <Screen>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            placedBy={usersById[item.placedById] ?? { id: "", displayName: "Unknown", avatarUrl: null }}
            onPress={onOrderPress}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
      />
    </Screen>
  );
}
 
const styles = StyleSheet.create({
  empty: { textAlign: "center", marginTop: 48, color: "#6b7280" },
});
```

```ts
// src/features/orders/index.ts - public API
export { OrdersScreen } from "./ui/OrdersScreen";
```

```tsx
// app/(tabs)/orders/index.tsx
export { OrdersScreen as default } from "@/features/orders";
```

**What this demonstrates:**

* **`entities/user`** owns the `User` type and `UserAvatar` - reusable across features.
* **`features/orders`** composes entity UI into a product workflow without importing `features/auth`.
* **`shared/ui/Screen`** is a primitive with no domain knowledge.
* **Expo Router `app/`** re-exports the feature screen - the FSD `app` layer (`src/app/providers`) holds global providers separately from routes.

## Deep Dive

### How It Works

#### FSD layers adapted for Expo

| FSD layer | RN mapping | Contains |
| --- | --- | --- |
| **app** | `src/app/` + Expo `app/_layout.tsx` | Providers, analytics init, error boundaries |
| **pages** | Often skipped - Expo Router routes replace this | Thin route files in `app/` |
| **widgets** | Optional `src/widgets/` | Dashboard blocks reused on multiple routes |
| **features** | `src/features/<name>/` | User stories: auth, checkout, orders |
| **entities** | `src/entities/<name>/` | Business nouns: user, order, product |
| **shared** | `src/shared/` | UI kit, API client, config, utils |

#### Segments inside a slice

| Segment | Purpose | Example files |
| --- | --- | --- |
| `ui/` | Components and screens | `OrdersScreen.tsx`, `OrderRow.tsx` |
| `model/` | State, hooks, stores | `useOrdersScreen.ts`, `cartStore.ts` |
| `api/` | IO adapters | `ordersApi.ts`, DTO mappers |
| `lib/` | Slice-local pure helpers | `sortOrders.ts` |

#### Import rules

```
shared     ← imported by everyone
  ↑
entities   ← features may import entities; entities never import features
  ↑
features   ← no cross-feature imports; use entities or app-layer orchestration
  ↑
app        ← wires providers; routes import feature public APIs
```

### TypeScript Notes

```ts
// tsconfig.json paths - mirror FSD layers
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/entities/*": ["./src/entities/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  }
}
```

```js
// eslint.config.js (excerpt) - block cross-feature deep imports
{
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        {
          group: ["@/features/*/ui/*", "@/features/*/model/*", "@/features/*/api/*"],
          message: "Import from the feature public API (@/features/<name>) instead.",
        },
      ],
    }],
  },
}
```

### When to add widgets/ or pages/

| Signal | Action |
| --- | --- |
| Same dashboard header on 4 routes | Extract `src/widgets/dashboard-header/` |
| Marketing landing unrelated to features | `src/pages/landing/` or a `features/marketing` slice |
| Team confusion between `app/` and `src/app/` | Rename `src/app` → `src/providers` to avoid Expo collision |

## Gotchas

* **Putting feature logic in Expo `app/` routes** - Routes become god files. **Fix:** Re-export from `@/features/*`; parse params only.
* **Cross-feature imports for "just one component"** - Graph becomes cyclic within two sprints. **Fix:** Move shared UI to `entities/` or `shared/ui`; orchestrate in the route.
* **Empty `index.ts` barrels exporting everything** - Accidental public API bloat. **Fix:** Export deliberately; treat `index.ts` like a package manifest.
* **Creating `entities/` for every DTO** - Not every API response is a domain entity. **Fix:** Map DTOs in `api/`; promote to entity when two features need the type.
* **Skipping ESLint enforcement** - FSD without lint rules is folder theater. **Fix:** Add `no-restricted-imports` before feature count hits double digits.
* **Duplicating `shared/ui` and `entities/*/ui`** - Unclear ownership. **Fix:** Entity UI displays one noun (`UserAvatar`); shared UI is generic (`Button`).
* **Monolithic `features/orders/model/store.ts`** - Becomes a god module. **Fix:** Split by segment; one hook per screen orchestration.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| FSD (this page) | 8+ features, multi-squad, import rules needed | Solo dev, 3-screen MVP |
| Simple feature folders (`features/orders/components`) | Team outgrew layers but FSD feels heavy | Cross-feature imports already uncontrolled |
| Nx module boundaries | Monorepo with enforced graph in CI | Single-package Expo app |
| Clean Architecture rings | Heavy test coverage, swappable adapters | Prototype without test investment |
| Flat `src/screens` + `src/components` | Spike or throwaway demo | Long-lived product with 20+ routes |

## FAQs

Do I need all seven FSD layers on mobile?

No. Most Expo apps use **app** (providers), **features**, **entities**, and **shared**. Skip **pages** (Expo Router replaces it) and **widgets** until a composite block repeats across routes.

Where does Expo Router's app/ folder fit?

Expo `app/` is the **routing shell** - file-based routes and layouts. FSD `src/app/` holds global providers and bootstrap. Keep route files thin; product code lives in `src/features/`.

Can features import other features?

No - FSD forbids slice-to-slice imports at the same layer. Share through **entities**, **shared**, or orchestrate at the **route** / `src/app` layer.

What is a segment?

A subfolder inside a slice: `ui`, `model`, `api`, `lib`. Segments group files by technical role without creating new top-level layers.

Should I use @x public API notation?

Optional. The `@x` cross-export pattern from web FSD is less common in RN. A plain `index.ts` barrel per slice is sufficient.

Where do Zustand stores live?

In `features/<name>/model/` for feature-local state. Global session state may live in `src/app/providers/` or `features/session/model/` depending on scope.

How does FSD work with TanStack Query?

Query hooks belong in `features/<name>/model/` or `entities/<name>/api/`. Entity-level queries (`useUser`) serve multiple features; feature-level queries (`useCheckout`) stay in the feature.

What goes in shared/ui vs entities/user/ui?

`shared/ui/Button` is generic. `entities/user/ui/UserAvatar` knows about `User` - it displays domain data and may be reused by many features.

Can I mix FSD with a monorepo?

Yes. Packages typically hold `shared` and `entities`; the Expo app holds `features` and routes. See shared-packages Metro guide for workspace resolution.

How do I migrate from flat folders to FSD?

One feature per PR: move `screens/OrdersScreen.tsx` → `features/orders/ui/`, add `index.ts`, update imports. Enable ESLint rules after the second migrated feature.

Is app/\_layout.tsx part of FSD app layer?

Yes - root layout wraps providers and navigation chrome. Register `AppProviders` from `src/app/providers/` in `app/_layout.tsx`, not business logic.

When is a widget not a feature?

When it has **no standalone user story** - e.g. a `StatsCard` reused on home and dashboard. Features deliver user value ("place order"); widgets compose entities for layout.

Does FSD replace Clean Architecture?

They complement each other. FSD organizes **file structure**; Clean Architecture organizes **dependency direction** inside a feature (use cases, adapters). Use both when complexity warrants it.

How many features is too many?

There is no hard cap - slices should match product domains. If `features/misc` appears, split by user journey or merge into an existing slice.

## Related

* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - three-layer model and thin routes
* [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - use cases inside feature slices
* [../project-setup/folder-structure-for-features/folder-structure-for-features.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - simpler feature folders before FSD
* [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - boundary audit before releases
* [../linting-formatting/custom-eslint-rules-for-rn/custom-eslint-rules-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/) - enforce import boundaries in CI

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
