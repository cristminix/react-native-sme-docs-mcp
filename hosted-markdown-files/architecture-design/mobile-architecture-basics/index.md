# Mobile Architecture Basics

10 examples to get you started with mobile architecture - 7 basic and 3 intermediate.

Highlights / Mobile Architecture Basics

* Keep app/ routes thin - they wire navigation; features/ owns product logic
* Dependency direction flows inward: app → features → entities → shared
* Each feature exposes a public API through index.ts - no deep imports
* shared/ holds primitives and infra; features never import sibling feature internals
* Entities model domain nouns; use cases orchestrate verbs without UI imports
* Start with feature slices; add clean-architecture layers only when tests demand seams

## Prerequisites

Scaffold a production-shaped Expo app with an explicit SDK 57 pin. The `default@sdk-57` template ships Expo Router, TypeScript, and the recommended folder layout to extend.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npm install
```

Add a `src/` tree beside `app/` for feature boundaries:

```text
MyApp/
├── app/                    # Expo Router - routes only
├── src/
│   ├── shared/             # UI primitives, API client, config
│   ├── entities/           # domain models (User, Order)
│   └── features/           # product slices (auth, orders, settings)
├── app.config.ts
└── package.json
```

Confirm the SDK pin before structuring features:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Three-Layer Mental Model

Mobile apps benefit from a simple inward dependency flow: **presentation** (screens, components) calls **domain** (entities, use cases), which calls **data** (API adapters, storage).

```text
┌─────────────────────────────────────────┐
│  app/ + features/*/screens, components  │  ← presentation
├─────────────────────────────────────────┤
│  entities/ + features/*/model, hooks    │  ← domain
├─────────────────────────────────────────┤
│  shared/api, shared/storage, adapters   │  ← data / infra
└─────────────────────────────────────────┘
         dependency direction: ↓ inward
```

```tsx
// src/features/orders/screens/OrdersScreen.tsx - presentation orchestrates
import { useOrders } from "../hooks/useOrders";
import { OrderList } from "../components/OrderList";
 
export function OrdersScreen() {
  const { orders, loading, error, refresh } = useOrders();
  return <OrderList orders={orders} loading={loading} error={error} onRefresh={refresh} />;
}
```

* **Presentation** never imports `fetch` directly - it calls hooks or use cases that hide IO
* **Domain** types (`Order`, `User`) live in `entities/` so multiple features share one shape
* **Data** adapters (`ordersApi.ts`, `secureStorage.ts`) sit in `shared/` or `features/*/api/`
* Violating direction (API client imported in a presentational `OrderRow`) makes unit tests painful

> **Related:** [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - formal slice layers adapted for Expo | [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - entities and use cases without ceremony

---

### 2. Thin Route Files

Expo Router maps filenames to URLs. Route files should **re-export** feature screens - not own business logic.

```tsx
// app/(tabs)/orders/index.tsx - one line when possible
export { OrdersScreen as default } from "@/features/orders";
```

```tsx
// src/features/orders/index.ts - public API for the feature
export { OrdersScreen } from "./screens/OrdersScreen";
export type { Order } from "./model/types";
```

* **`app/`** is navigation infrastructure - params parsing and layout nesting belong here at most
* **`features/orders/index.ts`** is the only import path other features should use
* Deep imports like `@/features/orders/components/OrderRow` couple consumers to internal refactors
* When a route needs param validation, parse once in the route file and pass typed props to the screen

> **Related:** [../project-setup/folder-structure-for-features/folder-structure-for-features.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - feature slice layout in growing codebases

---

### 3. Shared vs Feature-Local Code

`shared/` holds code with **no product opinion**. Feature folders hold product-specific UI and workflows.

```text
src/
├── shared/
│   ├── ui/              # Button, Screen, TextField - design-system primitives
│   ├── api/             # createApiClient(), error types
│   ├── config/          # env readers (no secrets in source)
│   └── lib/             # formatCurrency, date helpers
└── features/
    └── checkout/
        ├── components/  # PaymentSummary - checkout-specific
        └── hooks/       # useCheckout - checkout workflow
```

```tsx
// src/shared/ui/Button.tsx - primitive, no domain knowledge
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
 
type ButtonProps = PressableProps & { label: string };
 
export function Button({ label, style, ...rest }: ButtonProps) {
  return (
    <Pressable style={[styles.base, style]} {...rest}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#2563eb" },
  label: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
```

* Move code to **`shared/`** when two unrelated features need it **and** it has no product semantics
* Keep **checkout-specific** markup in `features/checkout/` even if only one screen uses it today
* **`shared/ui`** should not import from `features/` - dependency flows one way
* Resist a root-level `components/` junk drawer - unowned folders become god-module magnets

> **Related:** [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - `shared` layer rules and segment naming

---

### 4. Entity Types Without UI

Entities describe **nouns** in your domain - plain types and pure functions with zero React imports.

```tsx
// src/entities/order/model/types.ts
export type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";
 
export type Order = {
  id: string;
  title: string;
  totalCents: number;
  status: OrderStatus;
  placedAt: string;
};
```

```tsx
// src/entities/order/lib/formatOrderTotal.ts
import type { Order } from "../model/types";
 
export function formatOrderTotal(order: Order): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(order.totalCents / 100);
}
```

* **Entities** are importable from any feature - `features/orders` and `features/tracking` both use `Order`
* Pure formatters and validators belong with the entity, not inside screen files
* No `useState`, no `fetch`, no `StyleSheet` in `entities/` - keeps them testable without a renderer
* Start with one file per entity; split `model/`, `lib/`, `api/` when the entity grows past ~200 lines

> **Related:** [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - when to add use cases around entities

---

### 5. Feature Public API

Every feature folder exposes an **`index.ts`** barrel. Cross-feature imports go through that file only.

```ts
// src/features/orders/index.ts
export { OrdersScreen } from "./screens/OrdersScreen";
export { OrderRow } from "./components/OrderRow";
export { useOrders } from "./hooks/useOrders";
export type { OrdersFilter } from "./model/types";
```

```tsx
// src/features/dashboard/screens/DashboardScreen.tsx - imports public API only
import { OrderRow } from "@/features/orders";
import type { Order } from "@/entities/order";
```

* **Public API** is a contract - adding exports is intentional; removing them is a breaking change
* Do not export internal helpers (`normalizeRawOrder`) unless another feature truly needs them
* ESLint `no-restricted-imports` can enforce `@/features/*/index` and block `@/features/*/components/*`
* Smaller features export one screen; larger features export screens + hooks + types selectively

> **Related:** [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - audit items for boundary violations before release

---

### 6. API Adapter Boundary

Network and storage IO live behind adapters so screens swap implementations (mock, staging, prod) without edits.

```tsx
// src/shared/api/createApiClient.ts
type ApiClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
};
 
export function createApiClient(baseUrl: string): ApiClient {
  return {
    async get<T>(path: string) {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
      return response.json() as Promise<T>;
    },
    async post<T>(path: string, body: unknown) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`POST ${path} failed: ${response.status}`);
      return response.json() as Promise<T>;
    },
  };
}
```

```tsx
// src/features/orders/api/ordersApi.ts
import type { Order } from "@/entities/order";
import type { ApiClient } from "@/shared/api/createApiClient";
 
export function createOrdersApi(client: ApiClient) {
  return {
    list: () => client.get<Order[]>("/orders"),
    byId: (id: string) => client.get<Order>(`/orders/${id}`),
  };
}
```

* **Factory functions** (`createOrdersApi`) accept dependencies - easy to inject mocks in tests
* Raw `fetch` URLs should not appear in screen components
* Map DTO shapes to entity types inside the adapter - API snake\_case stays out of UI
* One adapter module per bounded context (`ordersApi`, `authApi`) beats a single god `api.ts`

> **Related:** [Dependency Injection in RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/) - wiring adapters without a DI framework

---

### 7. Config and Environment Boundaries

Runtime configuration flows through a single reader - not scattered `process.env` calls in feature code.

```tsx
// src/shared/config/env.ts
import Constants from "expo-constants";
 
type AppConfig = {
  apiBaseUrl: string;
  appVariant: "development" | "staging" | "production";
};
 
export function getAppConfig(): AppConfig {
  const extra = Constants.expoConfig?.extra as Partial<AppConfig> | undefined;
  return {
    apiBaseUrl: extra?.apiBaseUrl ?? "https://api.staging.example.com",
    appVariant: extra?.appVariant ?? "development",
  };
}
```

```ts
// app.config.ts (excerpt)
export default {
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    appVariant: process.env.APP_VARIANT ?? "development",
  },
};
```

* **`EXPO_PUBLIC_*`** vars are embedded in the JS bundle - never put secrets there
* **`getAppConfig()`** is the only module that reads `Constants.expoConfig?.extra` for app settings
* Features import `getAppConfig()` or receive config via context - they do not read env directly
* Pair with EAS build profiles that set `env` per channel - see project-setup environment guides

> **Related:** [Modular Monolith vs Multi-App](https://docs.wahwei/reactnative.codeguides.io/architecture-design/modular-monolith-vs-multi-app/) - one binary with variants vs separate apps

---

## Intermediate Examples

### 8. Cross-Feature Communication

Features should not import each other's internals. Use **shared entities**, **events**, or **orchestration at the app layer**.

```tsx
// src/features/cart/hooks/useCart.ts - cart owns its state
import { create } from "zustand";
 
type CartItem = { productId: string; qty: number };
 
type CartStore = {
  items: CartItem[];
  add: (item: CartItem) => void;
  clear: () => void;
};
 
export const useCart = create<CartStore>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  clear: () => set({ items: [] }),
}));
```

```tsx
// app/(tabs)/catalog/[id].tsx - route orchestrates navigation + cart, not features importing features
import { useLocalSearchParams, router } from "expo-router";
import { ProductDetailScreen } from "@/features/catalog";
import { useCart } from "@/features/cart";
 
export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const add = useCart((s) => s.add);
 
  return (
    <ProductDetailScreen
      productId={id ?? ""}
      onAddToCart={(productId) => {
        add({ productId, qty: 1 });
        router.push("/(tabs)/cart");
      }}
    />
  );
}
```

* **Route-level orchestration** keeps `features/catalog` ignorant of cart navigation
* Pass **callbacks** (`onAddToCart`) into screens instead of importing sibling feature stores
* Shared **entity types** (`Product`, `Order`) live in `entities/` - both features import those
* If many features need pub/sub, add a thin `shared/events` module - not direct store imports

> **Related:** [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - when global stores are justified

---

### 9. Testing Seams by Layer

Architecture pays off when each layer tests without booting the full app.

```tsx
// src/features/orders/hooks/useOrders.test.ts
import { renderHook, waitFor } from "@testing-library/react-native";
import { useOrders } from "./useOrders";
import type { Order } from "@/entities/order";
 
const mockOrders: Order[] = [
  { id: "1", title: "Widget", totalCents: 999, status: "pending", placedAt: "2026-01-01" },
];
 
jest.mock("../api/ordersApi", () => ({
  ordersApi: { list: jest.fn(() => Promise.resolve(mockOrders)) },
}));
 
it("loads orders on mount", async () => {
  const { result } = renderHook(() => useOrders());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.orders).toHaveLength(1);
});
```

```tsx
// src/entities/order/lib/formatOrderTotal.test.ts - pure, no renderer
import { formatOrderTotal } from "./formatOrderTotal";
 
it("formats cents as USD", () => {
  expect(
    formatOrderTotal({ id: "1", title: "A", totalCents: 2500, status: "pending", placedAt: "" })
  ).toBe("$25.00");
});
```

* **Entity tests** run in Node - no React Native environment required
* **Hook tests** mock the API adapter, not `fetch` globally
* **Screen tests** pass props and assert composition - avoid mounting Expo Router for every case
* If you cannot mock a module, the boundary is in the wrong place - move IO behind a factory

> **Related:** [Dependency Injection in RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/) - injectable services for test doubles

---

### 10. When to Extract a Shared Package

Stay in a single repo until **two apps** or **CI isolation** force a workspace package.

```text
monorepo/
├── apps/
│   └── mobile/              # Expo app - imports @acme/orders
├── packages/
│   ├── orders/              # entity + API types shared with web admin
│   └── ui/                  # design system
└── pnpm-workspace.yaml
```

```json
// apps/mobile/package.json
{
  "dependencies": {
    "@acme/orders": "workspace:*",
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

```ts
// packages/orders/src/index.ts
export type { Order, OrderStatus } from "./model/types";
export { formatOrderTotal } from "./lib/formatOrderTotal";
```

* Extract a package when the **same domain types** ship in mobile and another surface (web, widget)
* Keep **screens and hooks** in the app - packages hold entities, primitives, and isomorphic logic
* Run `npx expo-doctor` after adding workspace deps - Metro must resolve the symlink
* Do not extract prematurely - in-app `src/entities/` is free until a second consumer exists

> **Related:** [../project-setup/shared-packages-and-metro-resolution/shared-packages-and-metro-resolution.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/) - Metro and workspace packages

---

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
