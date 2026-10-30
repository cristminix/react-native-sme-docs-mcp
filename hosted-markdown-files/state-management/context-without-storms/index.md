# Context Without Storms

Split contexts, memoized providers, and selector patterns to avoid re-render storms. React Context is built-in and works for **infrequently changing** values - theme, locale, auth session. A single mega-context updating every second will tank list scroll performance on mid-range Android devices.

Highlights / Context Without Storms

* One Context value object forces every consumer to re-render on any field change
* Split by update frequency: ThemeContext vs SessionContext vs ActionsContext
* Memoize provider value with useMemo - stable action callbacks with useCallback
* use-context-selector or Zustand when many components need one slice
* Context fits theme, locale, and session - not API catalog caches
* Measure with React DevTools Profiler before adding a global store

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// Split: state context + dispatch context (or actions-only context)
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
 
type Theme = "light" | "dark";
 
const ThemeStateContext = createContext<Theme>("light");
const ThemeActionsContext = createContext<{ toggle: () => void } | null>(null);
 
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  const actions = useMemo(() => ({ toggle }), [toggle]);
 
  return (
    <ThemeStateContext.Provider value={theme}>
      <ThemeActionsContext.Provider value={actions}>{children}</ThemeActionsContext.Provider>
    </ThemeStateContext.Provider>
  );
}
 
export function useTheme() {
  return useContext(ThemeStateContext);
}
 
export function useThemeActions() {
  const ctx = useContext(ThemeActionsContext);
  if (!ctx) throw new Error("useThemeActions must be used within ThemeProvider");
  return ctx;
}
```

**When to reach for this:**

* **Theme, locale, or accessibility** settings change rarely - Context is appropriate.
* **Session identity** (user id, signOut) is read by many screens but updates on login/logout only.
* You want **zero extra dependencies** before Zustand is justified.
* Consumers need **actions without subscribing to state** - split contexts pattern.
* Profiler shows **wide re-renders** from one provider - split or add selectors.

## Working Example

```tsx
// session/SessionProvider.tsx - split state vs actions; memoized value
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
 
type User = { id: string; displayName: string };
 
type SessionState = {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
};
 
type SessionActions = {
  signIn: (user: User) => void;
  signOut: () => void;
};
 
const SessionStateContext = createContext<SessionState | null>(null);
const SessionActionsContext = createContext<SessionActions | null>(null);
 
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, status: "loading" });
 
  const signIn = useCallback((user: User) => {
    setState({ user, status: "authenticated" });
  }, []);
 
  const signOut = useCallback(() => {
    setState({ user: null, status: "anonymous" });
  }, []);
 
  const actions = useMemo(() => ({ signIn, signOut }), [signIn, signOut]);
 
  return (
    <SessionStateContext.Provider value={state}>
      <SessionActionsContext.Provider value={actions}>{children}</SessionActionsContext.Provider>
    </SessionStateContext.Provider>
  );
}
 
export function useSessionState() {
  const ctx = useContext(SessionStateContext);
  if (!ctx) throw new Error("useSessionState requires SessionProvider");
  return ctx;
}
 
export function useSessionActions() {
  const ctx = useContext(SessionActionsContext);
  if (!ctx) throw new Error("useSessionActions requires SessionProvider");
  return ctx;
}
 
// --- Consumer: header only needs displayName ---
import { Text, View } from "react-native";
 
export function HeaderGreeting() {
  const { user, status } = useSessionState();
  if (status === "loading") return <Text>…</Text>;
  return <Text>Hello, {user?.displayName ?? "Guest"}</Text>;
}
 
// --- Consumer: settings only needs signOut - does NOT re-render when user displayName changes
// if you only import useSessionActions and never useSessionState
import { Pressable } from "react-native";
 
export function SignOutButton() {
  const { signOut } = useSessionActions();
  return (
    <Pressable onPress={signOut}>
      <Text>Sign out</Text>
    </Pressable>
  );
}
```

```tsx
// Selector hook pattern without extra library - subscribe to one field
import { useRef, useSyncExternalStore } from "react";
 
function useSessionSelector<T>(selector: (state: SessionState) => T): T {
  const state = useSessionState();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
 
  return useSyncExternalStore(
    () => () => {},
    () => selectorRef.current(state),
    () => selectorRef.current(state)
  );
}
 
// Usage: only re-renders when user.id changes (manual optimization - Zustand does this natively)
export function UserIdLabel() {
  const userId = useSessionSelector((s) => s.user?.id ?? "anon");
  return <Text>ID: {userId}</Text>;
}
```

**What this demonstrates:**

* **Split contexts** - components that only call `signOut` avoid re-renders when `displayName` changes (if they never touch state context).
* **`useMemo` / `useCallback`** stabilize the actions object - prevents child memo breakage.
* **Selector pattern** with `useSyncExternalStore` is a bridge before Zustand - see limitations in Deep Dive.
* **Session** is identity, not API cache - profile details still come from TanStack Query.

## Deep Dive

### Why Re-render Storms Happen

React re-renders all **consumers** of a context when `Provider value={...}` identity or content triggers an update. A common mistake:

```tsx
// ❌ New object every render - all consumers re-render
<AppContext.Provider value={{ user, cart, theme, setTheme }}>
```

Even if only `cart` changed, `theme` consumers re-render because the value object is new.

### Split Context Checklist

| Context | Holds | Update frequency |
| --- | --- | --- |
| `ThemeStateContext` | `"light" | "dark"` | Rare |
| `SessionStateContext` | `user`, `status` | Login/logout |
| `SessionActionsContext` | `signIn`, `signOut` | Never (stable refs) |
| `QueryClientProvider` | Server cache | Per fetch - not React Context for data |

### Memoization Pattern

```tsx
const value = useMemo(
  () => ({ user, status }),
  [user, status]
);
```

Actions context should depend only on **stable callbacks** - never inline `() => signOut()` in the value object without `useCallback`.

### use-context-selector

For many subscribers needing different slices, `use-context-selector` avoids manual `useSyncExternalStore`:

```bash
npx expo install use-context-selector
```

```tsx
import { createContext, useContextSelector } from "use-context-selector";
 
const SessionContext = createContext<SessionState>({ user: null, status: "anonymous" });
 
export function useUserId() {
  return useContextSelector(SessionContext, (s) => s.user?.id);
}
```

### When to Graduate to Zustand

| Signal | Action |
| --- | --- |
| 5+ contexts nested at root | Flatten with Zustand slices |
| High-frequency updates (cart qty) | Zustand selectors |
| Profiler shows Context consumers > 20ms | Measure, then migrate hottest slice |

### Context vs Query

| Data | Tool |
| --- | --- |
| User session token / id | Context + secure store |
| User profile bio, avatar URL | `useQuery(["profile", id])` |
| Theme preference | Context or Zustand + persistence |

## Gotchas

* **Single context with { state, dispatch, extras }** - Every dispatch re-renders readers of `extras`. **Fix:** Split state and actions.
* **Inline functions in provider value** - `signOut: () => setUser(null)` breaks `React.memo`. **Fix:** `useCallback`.
* **Storing fetched arrays in Context** - Refetch updates re-render the tree. **Fix:** TanStack Query.
* **Provider inside FlatList renderItem** - N providers per row. **Fix:** One provider at `app/_layout.tsx`.
* **Default context value with real data** - `createContext({ user: guest })` masks missing provider. **Fix:** `null` + throw in hook.
* **useSyncExternalStore selector without store subscription** - Example above still re-renders when parent context updates - true fine-grained needs external store (Zustand/Jotai).
* **Passing entire API client in Context** - Stable but encourages fat context. **Fix:** Module singleton or DI - see [dependency injection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Split Context | Theme, session, rare updates | Cart qty changing per second |
| use-context-selector | Many slices, stay dependency-free-ish | Team already standardized on Zustand |
| Zustand | Global client state + selectors | Two values total in the app |
| TanStack Query | Server lists and details | Theme toggle |
| Expo Router params | Shareable filter/tab state | Auth tokens |

## FAQs

Is React Context slow on React Native?

Context itself is fast - **unnecessary consumers** are slow. Split contexts, memoize values, and avoid putting high-frequency state in Context.

How many providers at root is too many?

Three to five well-scoped providers is normal (`Query`, `Session`, `Theme`, `SafeArea`). More than eight nested suggests consolidation.

Should I use Context for React Navigation theme?

Expo Router / React Navigation accept a `theme` prop on the root navigator - often simpler than custom Context for colors alone.

Context vs Zustand for auth?

Both work. Context + `expo-secure-store` adapter is common. Zustand helps when many selectors read auth-adjacent UI flags - see [ADR Decision 7](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/).

How do I test providers?

Wrap with `SessionProvider` in tests; mock secure store at boundary. Prefer testing hooks with `renderHook` and stubbed context values.

Does React 19 improve Context?

React 19 continues concurrent rendering - context consumers still re-render when value changes. Splitting and selectors remain best practice on RN 0.86.

Can I combine useReducer with Context?

Yes - `useReducer` in provider, split dispatch into actions context. Pattern matches Redux without the dependency.

What about React.memo on list items?

Memo helps only if props are stable. Fix the provider first - memo on 200 rows is a band-aid on a storm.

Should locale live in Context?

Yes - i18n direction and strings change infrequently. Pair with `expo-localization` for device default; persist user override in AsyncStorage.

How do I debug re-render storms?

React DevTools Profiler → record interaction → find cascading renders from one context provider. Flip one split at a time.

Is passing dispatch via Context OK?

`dispatch` is stable - safe in actions context. Consumers that only dispatch never need state context.

When is one combined context acceptable?

Prototypes and apps with <10 screens where profiler shows no list jank. Refactor before shipping long lists.

## Related

* [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/) - provider tree at root
* [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - selector-native global store
* [useState & useReducer](https://docs.wahwei/reactnative.codeguides.io/state-management/usestate-and-usereducer/) - reducer inside provider
* [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - hydrate session on boot
* [../rn-fundamentals/props-state-and-re-renders-on-mobile/props-state-and-re-renders-on-mobile.md](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - what triggers re-renders
* [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - Context as 2nd choice for global UI

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
