# Dependency Injection in RN

Dependency injection on mobile means **passing dependencies in** - API clients, storage, analytics - instead of importing singletons. React Native teams get testable services with **factory functions**, **React context**, and **module boundaries** - not Dagger, Spring, or a global service locator.

Highlights / Dependency Injection in RN

* Factory functions (createOrdersApi) are DI - no container framework required
* React context wires production implementations at the app root
* Module boundaries expose ports; adapters are swappable in tests via props or overrides
* Prefer constructor injection via factories over service locator singletons
* expo-router root \_layout.tsx is the composition root for most Expo apps
* Jest module mocks replace adapters - keep use cases ignorant of React

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// src/shared/di/AppServicesContext.tsx
import { createContext, useContext, type ReactNode } from "react";
import { createApiClient } from "@/shared/api/createApiClient";
import { createOrdersApi, type OrdersApi } from "@/features/orders/api/ordersApi";
import { getAppConfig } from "@/shared/config/env";
 
export type AppServices = {
  ordersApi: OrdersApi;
};
 
const AppServicesContext = createContext<AppServices | null>(null);
 
export function AppServicesProvider({ children, overrides }: { children: ReactNode; overrides?: Partial<AppServices> }) {
  const client = createApiClient(getAppConfig().apiBaseUrl);
  const value: AppServices = {
    ordersApi: overrides?.ordersApi ?? createOrdersApi(client),
  };
  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
}
 
export function useAppServices(): AppServices {
  const ctx = useContext(AppServicesContext);
  if (!ctx) throw new Error("AppServicesProvider missing - wrap app/_layout.tsx");
  return ctx;
}
```

```tsx
// app/_layout.tsx (excerpt) - composition root
import { Stack } from "expo-router";
import { AppServicesProvider } from "@/shared/di/AppServicesContext";
 
export default function RootLayout() {
  return (
    <AppServicesProvider>
      <Stack />
    </AppServicesProvider>
  );
}
```

**When to reach for this:**

* Unit tests need fake APIs without `jest.mock("fetch")` in every file.
* Staging vs production clients must swap without `if (__DEV__)` scattered in features.
* Clean architecture ports need concrete adapters wired in one place.
* A `lib/api.ts` singleton imports `getAppConfig()` and creates hidden globals.

## Working Example

```ts
// src/shared/api/createApiClient.ts
export type ApiClient = {
  get<T>(path: string): Promise<T>;
};
 
export function createApiClient(baseUrl: string): ApiClient {
  return {
    async get<T>(path: string) {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) throw new Error(`GET ${path} failed`);
      return response.json() as Promise<T>;
    },
  };
}
```

```ts
// src/features/orders/api/ordersApi.ts
import type { Order } from "@/entities/order";
import type { ApiClient } from "@/shared/api/createApiClient";
 
export type OrdersApi = {
  list(): Promise<Order[]>;
};
 
export function createOrdersApi(client: ApiClient): OrdersApi {
  return {
    list: () => client.get<Order[]>("/orders"),
  };
}
```

```tsx
// src/features/orders/model/useOrders.ts
import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/entities/order";
import { useAppServices } from "@/shared/di/AppServicesContext";
 
export function useOrders() {
  const { ordersApi } = useAppServices();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const refresh = useCallback(async () => {
    try {
      setError(null);
      setOrders(await ordersApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [ordersApi]);
 
  useEffect(() => {
    refresh();
  }, [refresh]);
 
  return { orders, loading, error, refresh };
}
```

```tsx
// src/features/orders/model/useOrders.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppServicesProvider } from "@/shared/di/AppServicesContext";
import type { OrdersApi } from "../api/ordersApi";
import { useOrders } from "./useOrders";
 
const mockOrdersApi: OrdersApi = {
  list: jest.fn(() =>
    Promise.resolve([{ id: "1", title: "Test", totalCents: 100, status: "pending", placedAt: "" }])
  ),
};
 
function wrapper({ children }: { children: ReactNode }) {
  return <AppServicesProvider overrides={{ ordersApi: mockOrdersApi }}>{children}</AppServicesProvider>;
}
 
it("loads orders from injected api", async () => {
  const { result } = renderHook(() => useOrders(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(mockOrdersApi.list).toHaveBeenCalled();
  expect(result.current.orders).toHaveLength(1);
});
```

**What this demonstrates:**

* **`createOrdersApi(client)`** receives its HTTP dependency - test with a fake `ApiClient` without network.
* **`AppServicesProvider`** is the **composition root** - one place binds production implementations.
* **`overrides`** prop injects test doubles without `jest.mock` on the hook file.
* Hooks call **`useAppServices()`** - not `createOrdersApi` directly.

## Deep Dive

### How It Works

#### DI patterns on RN (lightest → heaviest)

| Pattern | Mechanism | Best for |
| --- | --- | --- |
| **Factory functions** | `createX(deps)` | Adapters, use cases |
| **Parameter injection** | Pass deps as hook arguments | Storybook, isolated tests |
| **React context** | Provider at root | App-wide services (API, analytics) |
| **Module overrides** | `jest.mock` / Metro alias | Integration tests, e2e stubs |
| **DI container library** | tsyringe, Inversify | Rarely justified on mobile |

#### Composition root placement

| Location | Role |
| --- | --- |
| `app/_layout.tsx` | Global providers (API, auth session, theme) |
| `features/auth/model/AuthProvider.tsx` | Feature-scoped services |
| Test `wrapper` | Per-suite overrides via `overrides` prop |

#### Service locator anti-pattern

```ts
// ❌ Hidden global - hard to test, hard to swap per variant
export const ordersApi = createOrdersApi(createApiClient(getAppConfig().apiBaseUrl));
```

```ts
// ✅ Explicit wiring at composition root
const client = createApiClient(getAppConfig().apiBaseUrl);
const ordersApi = createOrdersApi(client);
```

#### Factory + use case wiring

```ts
// useSignIn hook - inject ports from context or factories
export function createSignInRunner(services: AppServices) {
  return (email: string, password: string) =>
    signIn(
      {
        authGateway: services.authGateway,
        tokenStorage: services.tokenStorage,
        createSession: services.createSession,
      },
      { email, password }
    );
}
```

Use cases stay framework-free; the hook pulls deps from context once.

### TypeScript Notes

```ts
// Narrow AppServices as the app grows - split contexts if needed
export type AppServices = {
  ordersApi: OrdersApi;
  authGateway: AuthGateway;
  tokenStorage: TokenStorage;
  analytics: AnalyticsPort;
};
 
// Feature-specific context avoids god provider
export const CheckoutServicesContext = createContext<CheckoutServices | null>(null);
```

## Gotchas

* **God context with 40 services** - Everything re-renders on any override change. **Fix:** Split by feature or use stable `useMemo` service objects.
* **Creating new service instances every render** - Breaks `useCallback` deps and refetches endlessly. **Fix:** Memoize services in provider with `useMemo(() => create..., [baseUrl])`.
* **Importing concrete adapters in use cases** - Inverts clean architecture. **Fix:** Use cases accept port interfaces; only composition root imports `restAuthGateway`.
* **jest.mock hoisting surprises** - Mock path must match exact import. **Fix:** Prefer `overrides` prop on provider over module mocks when possible.
* **Expo Go vs dev build service URLs** - Hidden `__DEV__` branches in factories. **Fix:** `getAppConfig().apiBaseUrl` from `app.config.ts` extra per variant.
* **Singleton analytics in every file** - Untestable event spam. **Fix:** `AnalyticsPort` injected; noop implementation in tests.
* **tsyringe for three services** - Reflection metadata pain in Metro. **Fix:** Plain factories until you have 20+ wired types.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Context + factories (this page) | Most Expo apps | - |
| Prop drilling deps | One screen tests, Storybook stories | App-wide API client |
| Module singleton | Throwaway spike only | Production features with tests |
| jest.mock per test file | Quick isolation | Consistent override story across suite |
| DI container (tsyringe) | Large brownfield porting from backend | Greenfield RN - adds Metro/babel complexity |
| Parametric hooks `useOrders(api)` | Library hooks reused outside your app | Internal app - verbose at every call site |

## FAQs

Do React Native apps need a DI framework?

No. Factory functions plus React context cover 95% of mobile needs. Containers add indirection without solving RN-specific problems (Metro bundling, Fast Refresh).

What is the composition root?

The single place where concrete implementations bind to abstractions - typically `app/_layout.tsx` or `AppServicesProvider`. No other file should call `createRestAuthGateway` with production URLs.

How do I test hooks that use API clients?

Wrap with `AppServicesProvider overrides={{ ordersApi: mock }}`. Alternatively pass the API as a hook argument in tests only.

Context vs Zustand for services?

Context wires **immutable service instances** (API, storage). Zustand holds **mutable app state** (cart, session). Do not store fetch clients in Zustand unless they hold session tokens that change.

Can I use expo-router loaders for DI?

Expo Router does not have RSC loaders. Wire services in root layout providers - not per-route unless route-scoped deps are truly isolated.

How do environment variants get different APIs?

`getAppConfig()` reads `extra` from `app.config.ts` - composition root passes the correct `baseUrl` when creating clients. No `if` in feature code.

What about @tanstack/react-query?

Inject a `QueryClient` via context (built-in `QueryClientProvider`). Repository adapters feed query functions - `queryFn: () => ordersApi.list()`.

Is jest.mock bad?

Acceptable for integration tests. Prefer provider `overrides` for unit tests - clearer and typed.

How do I avoid circular imports with DI?

Ports live in `domain/ports.ts`. Adapters import ports + entities. Composition root imports adapters. Features import ports through context - never adapters from domain.

Should SecureStore be injected?

Yes - wrap in `TokenStorage` port. Tests use in-memory storage; production uses `createSecureTokenStorage()`.

Fast Refresh with context providers?

Changing provider implementation hot-reloads fine. Changing context **shape** may need full reload - keep `AppServices` type stable.

Multiple apps in monorepo - shared DI?

Shared `packages/services` exports factories; each `apps/*` composition root passes app-specific config. Do not share a singleton across apps.

When does a DI library make sense?

Rarely on RN. Consider it when porting a large backend team’s patterns or when you have 30+ wired interfaces with automated contract tests - still evaluate Metro cost first.

How does DI relate to clean architecture?

Ports are interfaces; adapters are implementations; composition root binds them. Use cases receive deps as function arguments - the purest form of injection.

## Related

* [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - ports, use cases, adapters
* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - API adapter boundary
* [Modular Monolith vs Multi-App](https://docs.wahwei/reactnative.codeguides.io/architecture-design/modular-monolith-vs-multi-app/) - per-variant service wiring
* [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - where mutable state vs services split
* [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - find singletons before release

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
