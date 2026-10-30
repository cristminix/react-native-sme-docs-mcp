# Clean Architecture on Mobile

Clean Architecture separates **what the app does** (entities, use cases) from **how it talks to the world** (adapters). On React Native, that means testable use cases in TypeScript - not abstract factories for every button press.

Highlights / Clean Architecture on Mobile

* Entities are plain types + pure functions - zero React imports
* Use cases orchestrate one user intent - signIn, placeOrder, syncOfflineQueue
* Adapters implement ports - RestAuthGateway, SecureTokenStorage
* Screens call use cases through hooks - they never import fetch or AsyncStorage
* Add layers when tests need swappable IO - not on day one of a three-screen app
* One use case per file keeps mobile workflows readable without Java-style ceremony

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
src/features/auth/
├── domain/
│   ├── entities.ts          # User, Session
│   ├── ports.ts             # AuthGateway, TokenStorage (interfaces)
│   └── use-cases/
│       ├── signIn.ts
│       └── signOut.ts
├── adapters/
│   ├── restAuthGateway.ts
│   └── secureTokenStorage.ts
├── model/
│   └── useSignIn.ts         # hook wires use case + React state
└── ui/
    └── SignInScreen.tsx
```

```ts
// domain/ports.ts - interfaces only
import type { Session, User } from "./entities";
 
export type AuthGateway = {
  authenticate(email: string, password: string): Promise<User>;
};
 
export type TokenStorage = {
  save(session: Session): Promise<void>;
  load(): Promise<Session | null>;
  clear(): Promise<void>;
};
```

**When to reach for this:**

* You must swap API implementations (mock, staging, offline) without touching screens.
* Compliance or QA demands unit tests on business rules without a device farm.
* Multiple features share the same orchestration (`syncCart`, `validateCoupon`).
* A god hook mixes `fetch`, `AsyncStorage`, and navigation - and every change breaks tests.

## Working Example

```ts
// src/features/auth/domain/entities.ts
export type User = {
  id: string;
  email: string;
  displayName: string;
};
 
export type Session = {
  accessToken: string;
  user: User;
};
```

```ts
// src/features/auth/domain/ports.ts
import type { Session, User } from "./entities";
 
export type AuthGateway = {
  authenticate(email: string, password: string): Promise<User>;
};
 
export type TokenStorage = {
  save(session: Session): Promise<void>;
  load(): Promise<Session | null>;
  clear(): Promise<void>;
};
```

```ts
// src/features/auth/domain/use-cases/signIn.ts
import type { Session } from "../entities";
import type { AuthGateway, TokenStorage } from "../ports";
 
export type SignInDeps = {
  authGateway: AuthGateway;
  tokenStorage: TokenStorage;
  createSession: (user: Awaited<ReturnType<AuthGateway["authenticate"]>>) => Session;
};
 
export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; error: "invalid_credentials" | "network" | "unknown" };
 
export async function signIn(
  deps: SignInDeps,
  input: { email: string; password: string }
): Promise<SignInResult> {
  try {
    const user = await deps.authGateway.authenticate(input.email, input.password);
    const session = deps.createSession(user);
    await deps.tokenStorage.save(session);
    return { ok: true, session };
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_CREDENTIALS") {
      return { ok: false, error: "invalid_credentials" };
    }
    if (e instanceof Error && e.message === "NETWORK") {
      return { ok: false, error: "network" };
    }
    return { ok: false, error: "unknown" };
  }
}
```

```ts
// src/features/auth/adapters/restAuthGateway.ts
import type { AuthGateway } from "../domain/ports";
import type { User } from "../domain/entities";
 
export function createRestAuthGateway(baseUrl: string): AuthGateway {
  return {
    async authenticate(email, password) {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.status === 401) throw new Error("INVALID_CREDENTIALS");
      if (!response.ok) throw new Error("NETWORK");
      return response.json() as Promise<User>;
    },
  };
}
```

```ts
// src/features/auth/adapters/secureTokenStorage.ts
import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "../domain/ports";
import type { Session } from "../domain/entities";
 
const KEY = "session";
 
export function createSecureTokenStorage(): TokenStorage {
  return {
    async save(session) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(session));
    },
    async load() {
      const raw = await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    },
    async clear() {
      await SecureStore.deleteItemAsync(KEY);
    },
  };
}
```

```tsx
// src/features/auth/model/useSignIn.ts
import { useCallback, useState } from "react";
import { signIn } from "../domain/use-cases/signIn";
import { createRestAuthGateway } from "../adapters/restAuthGateway";
import { createSecureTokenStorage } from "../adapters/secureTokenStorage";
import { getAppConfig } from "@/shared/config/env";
import type { Session } from "../domain/entities";
 
const authGateway = createRestAuthGateway(getAppConfig().apiBaseUrl);
const tokenStorage = createSecureTokenStorage();
 
export function useSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const submit = useCallback(async (email: string, password: string): Promise<Session | null> => {
    setPending(true);
    setError(null);
    const result = await signIn(
      {
        authGateway,
        tokenStorage,
        createSession: (user) => ({ accessToken: `mock-token-${user.id}`, user }),
      },
      { email, password }
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.session;
  }, []);
 
  return { submit, pending, error };
}
```

```tsx
// src/features/auth/ui/SignInScreen.tsx
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/shared/ui/Button";
import { Screen } from "@/shared/ui/Screen";
import { useSignIn } from "../model/useSignIn";
 
type Props = { onSignedIn: () => void };
 
export function SignInScreen({ onSignedIn }: Props) {
  const { submit, pending, error } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 
  return (
    <Screen>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={pending ? "Signing in…" : "Sign in"}
          disabled={pending}
          onPress={async () => {
            const session = await submit(email, password);
            if (session) onSignedIn();
          }}
        />
      </View>
    </Screen>
  );
}
 
const styles = StyleSheet.create({
  form: { gap: 12, padding: 24 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12 },
  error: { color: "#dc2626" },
});
```

**What this demonstrates:**

* **`signIn` use case** is a pure async function - test it with in-memory gateway/storage doubles.
* **Adapters** own `fetch` and `expo-secure-store` - swappable per environment.
* **`useSignIn` hook** bridges React lifecycle to the use case - screens stay declarative.
* **Discriminated result** (`ok: true | false`) replaces thrown errors across layer boundaries.

## Deep Dive

### How It Works

#### Ring model on mobile

```
┌──────────────────────────────────────┐
│  UI (screens, components)            │
├──────────────────────────────────────┤
│  Interface adapters (hooks, presenters)│
├──────────────────────────────────────┤
│  Use cases (application rules)       │
├──────────────────────────────────────┤
│  Entities (enterprise rules)         │
└──────────────────────────────────────┘
         adapters implement ports →
```

| Piece | Mobile home | Test strategy |
| --- | --- | --- |
| Entity | `domain/entities.ts` | Pure unit tests |
| Port | `domain/ports.ts` | Type-only; mocked in use-case tests |
| Use case | `domain/use-cases/*.ts` | Inject fake adapters |
| Adapter | `adapters/*.ts` | Integration tests sparingly |
| Hook | `model/use*.ts` | `@testing-library/react-native` with mocked use case |

#### Right-sizing ceremony

| App size | Recommended shape |
| --- | --- |
| 1–5 screens | Entities + hooks; skip formal ports until second IO backend |
| 5–20 screens | Ports for auth, payments, sync - the expensive seams |
| 20+ screens / compliance | Full use cases per intent; adapters per vendor |

#### Use case vs hook

* **Use case:** one user intent, no React, returns data or result unions.
* **Hook:** calls use case, owns `useState`/`useTransition`, exposes UI-friendly API.

Do not put `useEffect` inside use cases - that re-couples domain to the renderer.

### TypeScript Notes

```ts
// Test double - no framework required
const fakeGateway: AuthGateway = {
  authenticate: async () => ({ id: "1", email: "a@b.c", displayName: "Test" }),
};
 
const fakeStorage: TokenStorage = {
  saved: null as Session | null,
  async save(s) { this.saved = s; },
  async load() { return this.saved; },
  async clear() { this.saved = null; },
};
```

## Gotchas

* **Use case per button click** - Hundreds of one-liner "use cases" add noise. **Fix:** Use cases for multi-step intents; keep trivial toggles in hooks.
* **Ports for everything including `Date.now()`** - Abstract time only when tests prove flakiness. **Fix:** Inject clocks in payment/expiry flows only.
* **Throwing errors across layers** - Callers cannot distinguish network vs validation failures. **Fix:** Return discriminated unions (`{ ok: false, error: "network" }`).
* **Hooks that call `fetch` directly** - Bypasses use cases; tests need MSW for every screen. **Fix:** Move IO to adapters; hooks call use cases.
* **Entities importing adapters** - Inverts dependency rule. **Fix:** Adapters import entity types; use cases depend on port interfaces.
* **God `domain/` shared across all features** - Becomes a monolith. **Fix:** Per-feature `domain/` unless entity is truly global (`User` → `entities/user`).
* **TanStack Query inside use cases** - Query is a presentation-cache concern. **Fix:** Use case returns data; hook or repository adapter feeds the query client.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Clean Architecture (this page) | Swappable IO, compliance testing | 3-screen MVP with one API |
| Feature hooks + API module | Simple CRUD features | Multiple IO backends per feature |
| TanStack Query as data layer | Server state dominates | Complex offline merge rules need use-case orchestration |
| Redux Toolkit slices | Global event sourcing | Local feature workflows with few shared reducers |
| FSD only (no use cases) | Structure without heavy domain | Payment/auth flows need audited business rules |

## FAQs

Is Clean Architecture overkill for React Native?

Full ceremony is overkill for small apps. Adopt **entities + use cases + adapters** for features with real business rules (auth, payments, offline sync). CRUD lists can stay hook + API module.

Where do use cases live?

Inside the feature: `src/features/auth/domain/use-cases/`. Cross-feature rules belong in `src/entities/<name>/` or a shared domain package.

Do I need interfaces for every adapter?

Add a port interface when you have **two implementations** (live API + mock, or REST + GraphQL). A single adapter can use a concrete type until the second implementation exists.

How does this work with Expo Router?

Routes stay thin. `SignInScreen` receives `onSignedIn` from the route; navigation is an outer layer concern - not inside the use case.

Should use cases return entities or DTOs?

Return **entities** or feature-specific result types. Map API DTOs to entities inside adapters - DTO shapes never leak to UI.

Can use cases call other use cases?

Yes, compose them - `checkout` may call `validateCoupon` and `reserveInventory`. Keep composition in a parent use case, not in UI.

Where does Zustand fit?

Zustand holds **client UI state** or a **session cache** updated by use-case results. Do not put fetch logic inside store actions - call use cases from actions instead.

How do I test signIn without a device?

Pass fake `AuthGateway` and `TokenStorage` objects to `signIn()`. Assert on the discriminated union - no renderer required.

What about offline-first sync?

Model `SyncQueue` as a port. Use case `enqueueMutation` writes to queue adapter; background worker adapter drains queue - UI calls use cases, not SQLite directly.

Is Redux a clean architecture layer?

Redux is infrastructure/presentation state. Use cases should not dispatch Redux actions - hooks dispatch after use cases succeed.

How is this different from FSD?

FSD is **folder taxonomy**. Clean Architecture is **dependency direction** inside those folders. Use FSD segments (`domain/`, `adapters/`) to host clean rings.

When should I extract entities to src/entities/?

When two or more features import the same noun (`User`, `Order`). Feature-local entities stay in `features/<name>/domain/` until shared.

Do I need Dagger/Hilt-style DI?

No. Plain factory functions and React context are sufficient - see Dependency Injection in RN.

How many lines before a hook becomes a use case?

Line count is a weak signal. Extract when the hook mixes **IO + branching business rules + UI state** and tests require mounting React - typically 40+ lines of orchestration.

## Related

* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - layers and adapter boundaries
* [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - where `domain/` and `adapters/` segments live
* [Dependency Injection in RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/) - wiring ports without a framework
* [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - server vs client state placement
* [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - detect god modules before release

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Y29kZWd1aWRlcy5pb3xjZ2lvODc0fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
