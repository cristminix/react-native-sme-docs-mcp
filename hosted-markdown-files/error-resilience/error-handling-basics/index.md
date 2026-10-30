# Error Handling Basics

10 examples to get you started with Error Handling - 7 basic and 3 intermediate.

Highlights / Error Handling Basics

* try/catch handles async and event-handler failures; Error Boundaries catch render-time crashes
* Model screens as loading / error / success - never leave users staring at a blank View
* Error Boundaries still require a class component; there is no hook equivalent in React 19
* Retry buttons should re-run the failing operation, not just dismiss the error message
* Offline banners belong at the app shell level so every screen inherits connectivity context
* ErrorUtils.setGlobalHandler is the last line of defense for uncaught JS errors on device

## Prerequisites

Mobile apps fail in ways web apps rarely do - spotty LTE, backgrounded fetches, and native module crashes. Start from a blank Expo TypeScript project so every example below can replace `App.tsx` and run immediately.

```bash
npx create-expo-app@latest MyResilientApp --template blank-typescript
cd MyResilientApp
npx expo start
```

Examples **8** and **10** use network connectivity detection. Install NetInfo once:

```bash
npx expo install @react-native-community/netinfo
```

> **Tooling:** These examples target **Expo SDK 57**, **React Native 0.86**, and **React 19.2.3**. TypeScript (`.tsx`) is used throughout.

Two error layers appear throughout this section:

| Layer | Catches | Tool |
| --- | --- | --- |
| **Imperative** | Failed `fetch`, rejected promises, bad JSON, thrown event handlers | `try/catch` + state |
| **Declarative** | Render crashes, bad props, `undefined` access during JSX | React Error Boundary |

Use both. `try/catch` cannot catch errors thrown while React is rendering; Error Boundaries cannot catch errors inside `async` functions or `onPress` handlers.

---

## Basic Examples

### 1. try/catch Around an Async Fetch

Wrap network calls in `try/catch` so a thrown error becomes UI state instead of an unhandled rejection.

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
type Post = { id: number; title: string };
 
async function fetchPosts(): Promise<Post[]> {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=3");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
 
export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      try {
        setPosts(await fetchPosts());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
 
  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} />;
  if (error) return <Text style={{ padding: 16, color: "#b91c1c" }}>{error}</Text>;
 
  return (
    <View style={{ padding: 16, gap: 8 }}>
      {posts.map((p) => (
        <Text key={p.id}>{p.title}</Text>
      ))}
    </View>
  );
}
```

* **`try/catch` belongs at the boundary** where async work meets React state - typically inside `useEffect` or an event handler
* Check `res.ok` explicitly; `fetch` only rejects on network failure, not HTTP 4xx/5xx
* `finally` guarantees `loading` clears even when the request throws
* Use `err instanceof Error` before reading `.message` - thrown values are not always `Error` objects

> **Related:** [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - retry queues and stale-while-revalidate | [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - writing messages users can act on

---

### 2. try/catch in an Event Handler

Synchronous throws inside `onPress` bypass Error Boundaries. Catch them locally.

```tsx
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
 
function parseQuantity(input: string): number {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Enter a positive number");
  }
  return value;
}
 
export default function App() {
  const [qty, setQty] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
 
  function handleCalculate() {
    try {
      setError(null);
      setTotal(parseQuantity(qty) * 9.99);
    } catch (err) {
      setTotal(null);
      setError(err instanceof Error ? err.message : "Invalid input");
    }
  }
 
  return (
    <View style={styles.container}>
      <Text>Quantity: {qty}</Text>
      <Pressable onPress={() => setQty("0")} style={styles.chip}>
        <Text>Set invalid (0)</Text>
      </Pressable>
      <Pressable onPress={handleCalculate} style={styles.button}>
        <Text style={styles.buttonText}>Calculate total</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {total !== null && <Text>Total: ${total.toFixed(2)}</Text>}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  chip: { alignSelf: "flex-start", padding: 8, backgroundColor: "#e5e7eb", borderRadius: 8 },
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b91c1c" },
});
```

* **Error Boundaries do not catch event-handler throws** - the handler runs outside React's render phase
* Clear the previous error before retrying so stale messages do not linger beside fresh success state
* Validate at the boundary closest to user input; push parsing logic into pure functions that throw predictable errors
* Prefer actionable copy (`"Enter a positive number"`) over generic `"Error"` strings

> **Related:** [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - actionable messages vs opaque failures

---

### 3. Loading / Error / Success States

A discriminated status union prevents impossible UI combinations like showing a spinner and an error banner simultaneously.

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
type Profile = { name: string; email: string };
 
type Status =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "success"; data: Profile };
 
async function loadProfile(): Promise<Profile> {
  const res = await fetch("https://jsonplaceholder.typicode.com/users/1");
  if (!res.ok) throw new Error("Could not load profile");
  const json = await res.json();
  return { name: json.name, email: json.email };
}
 
export default function App() {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
 
  useEffect(() => {
    loadProfile()
      .then((data) => setStatus({ phase: "success", data }))
      .catch((err) =>
        setStatus({
          phase: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
  }, []);
 
  switch (status.phase) {
    case "loading":
      return <ActivityIndicator style={{ marginTop: 48 }} />;
    case "error":
      return <Text style={{ padding: 16, color: "#b91c1c" }}>{status.message}</Text>;
    case "success":
      return (
        <View style={{ padding: 16, gap: 4 }}>
          <Text style={{ fontWeight: "600" }}>{status.data.name}</Text>
          <Text style={{ color: "#6b7280" }}>{status.data.email}</Text>
        </View>
      );
  }
}
```

* **`phase` as a discriminant** lets TypeScript narrow `status.data` only inside the `"success"` branch
* One `status` object replaces parallel `loading`, `error`, and `data` booleans that can drift out of sync
* `.then/.catch` is equivalent to `try/catch` inside an async IIFE - pick whichever reads clearer in the effect
* Every screen that fetches data should have an explicit error branch; a blank `View` is a failure mode

> **Related:** [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - stale-while-revalidate when errors are transient

---

### 4. Minimal Error Boundary

React Error Boundaries must be class components. They catch render-time crashes in child trees and show fallback UI.

```tsx
import React, { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
 
type Props = { children: ReactNode };
type State = { hasError: boolean };
 
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
 
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
 
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Boundary caught:", error, info.componentStack);
  }
 
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontWeight: "600" }}>This section failed to render.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
 
function BrokenWidget() {
  const config = undefined as unknown as { label: string };
  return <Text>{config.label}</Text>; // throws during render
}
 
export default function App() {
  return (
    <ErrorBoundary>
      <BrokenWidget />
    </ErrorBoundary>
  );
}
```

* **`getDerivedStateFromError`** flips UI to the fallback; **`componentDidCatch`** is for logging and telemetry
* Boundaries catch errors in lifecycle methods and child render - not in the boundary's own render
* React 19 still has no `useErrorBoundary` hook - a small class wrapper remains the idiomatic pattern
* Log `info.componentStack` in `componentDidCatch`; it pinpoints which screen component crashed

> **Related:** [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - screen-level fallbacks and recovery UI

---

### 5. Error Boundary with a Retry Button

Reset a boundary by changing a `key` on the wrapper so React remounts the failed subtree.

```tsx
import React, { Component, useState, type ReactNode } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
 
type BoundaryProps = { children: ReactNode; onRetry?: () => void };
type BoundaryState = { hasError: boolean };
 
class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };
 
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }
 
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.title}>Something went wrong</Text>
          <Pressable onPress={this.props.onRetry} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
 
function FlakyChart({ shouldFail }: { shouldFail: boolean }) {
  if (shouldFail) throw new Error("Chart render failed");
  return <Text>Chart rendered successfully</Text>;
}
 
export default function App() {
  const [attempt, setAttempt] = useState(0);
  const shouldFail = attempt < 2; // fails twice, succeeds on third try
 
  return (
    <ErrorBoundary key={attempt} onRetry={() => setAttempt((n) => n + 1)}>
      <FlakyChart shouldFail={shouldFail} />
    </ErrorBoundary>
  );
}
 
const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  title: { fontWeight: "600" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* **Changing `key` remounts the boundary** and clears `hasError` - calling `setState` alone inside the boundary cannot recover
* Pair the retry button with a parent state bump (`attempt`) so both the boundary and the child reset together
* Use this pattern for isolated widgets (charts, maps) - not as a substitute for fixing the underlying bug
* Forward `onRetry` as a prop so the boundary stays reusable across screens

> **Related:** [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - wrapping navigators and tab screens

---

### 6. Retry UI for a Failed Fetch

A retry button should re-invoke the fetch function, not merely hide the error text.

```tsx
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from "react-native";
 
type Weather = { temperature: string };
 
async function fetchWeather(): Promise<Weather> {
  const res = await fetch("https://example.com/api/weather");
  if (!res.ok) throw new Error("Weather service unavailable");
  return res.json();
}
 
export default function App() {
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
 
  const reload = useCallback(() => setNonce((n) => n + 1), []);
 
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
 
    fetchWeather()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Request failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
 
    return () => {
      cancelled = true;
    };
  }, [nonce]);
 
  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} />;
 
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={reload} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
 
  return (
    <View style={styles.center}>
      <Text>Temperature: {data?.temperature}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  error: { color: "#b91c1c", textAlign: "center" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* A **`nonce` counter** retriggers the effect cleanly - avoids duplicating fetch logic inside the retry handler
* The **`cancelled` flag** prevents stale responses from overwriting state after a fast double-tap on Retry
* Clear `error` and set `loading` at the start of each attempt so the UI shows progress feedback
* Disable the retry button while `loading` if you want to prevent duplicate in-flight requests

> **Related:** [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - exponential backoff and offline queues

---

### 7. When to Use try/catch vs Error Boundary

Combine both layers: boundaries contain render crashes; `try/catch` handles everything asynchronous.

```tsx
import React, { Component, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
class ScreenBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <Text style={{ padding: 16 }}>Screen crashed - boundary caught it.</Text>;
    }
    return this.props.children;
  }
}
 
function UserListScreen() {
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://jsonplaceholder.typicode.com/users");
        if (!res.ok) throw new Error("Fetch failed");
        const users = await res.json();
        setNames(users.map((u: { name: string }) => u.name));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
 
  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} />;
  if (error) return <Text style={{ padding: 16, color: "#b91c1c" }}>{error}</Text>;
 
  return (
    <View style={{ padding: 16, gap: 4 }}>
      {names.map((name) => (
        <Text key={name}>{name}</Text>
      ))}
    </View>
  );
}
 
export default function App() {
  return (
    <ScreenBoundary>
      <UserListScreen />
    </ScreenBoundary>
  );
}
```

* **`try/catch` for effects and handlers; Error Boundary for render** - the split is mechanical, not optional
* Wrap each screen (or tab stack) in a boundary so one bad widget does not white-screen the entire app
* Fetch errors never reach a boundary - they must be caught imperatively and mapped to state
* A boundary catching an error means there is a code bug to fix; a fetch error often means a network condition to handle

> **Related:** [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - placement around navigators | [Error Boundaries Best Practices](https://docs.wahwei/reactnative.codeguides.io/error-resilience/best-practices/) - fail contained, log loudly

---

## Intermediate Examples

### 8. Offline Banner

Surface connectivity loss at the shell level so every screen inherits the same offline context.

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
 
function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>You are offline. Some actions may not work.</Text>
    </View>
  );
}
 
function AppShell({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false);
 
  useEffect(() => {
    const sync = (state: NetInfoState) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    };
    const unsubscribe = NetInfo.addEventListener(sync);
    NetInfo.fetch().then(sync);
    return unsubscribe;
  }, []);
 
  return (
    <View style={styles.shell}>
      <OfflineBanner visible={offline} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}
 
export default function App() {
  return (
    <AppShell>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Main content continues below the banner.</Text>
      </View>
    </AppShell>
  );
}
 
const styles = StyleSheet.create({
  shell: { flex: 1 },
  banner: { backgroundColor: "#fef3c7", paddingVertical: 8, paddingHorizontal: 16 },
  bannerText: { color: "#92400e", textAlign: "center", fontWeight: "500" },
  content: { flex: 1 },
});
```

* **`NetInfo.addEventListener`** fires when the device roams between Wi-Fi, LTE, and airplane mode
* Check both `isConnected` and `isInternetReachable` - captive portals can report connected but unreachable
* Place the banner in the root layout (`app/_layout.tsx` in Expo Router) so it persists across navigation
* Banners inform; they do not replace per-request retry UX for failed mutations

> **Related:** [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline queues and cached reads | [Graceful Degradation Patterns](https://docs.wahwei/reactnative.codeguides.io/error-resilience/graceful-degradation-patterns/) - reduced modes without connectivity

---

### 9. Global Error Handler Intro

`ErrorUtils.setGlobalHandler` catches JS errors that escape every boundary - register it once at app startup.

```tsx
import { useEffect } from "react";
import { Text, View } from "react-native";
 
type GlobalHandler = (error: Error, isFatal?: boolean) => void;
 
function installGlobalHandler() {
  const g = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler: () => GlobalHandler;
      setGlobalHandler: (handler: GlobalHandler) => void;
    };
  };
 
  const ErrorUtils = g.ErrorUtils;
  if (!ErrorUtils) return;
 
  const defaultHandler = ErrorUtils.getGlobalHandler();
 
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Ship to Sentry / Datadog / your backend here
    console.error("[global]", error.message, { isFatal });
 
    // Preserve the redbox in development
    defaultHandler(error, isFatal);
  });
}
 
export default function App() {
  useEffect(() => {
    installGlobalHandler();
  }, []);
 
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Global handler registered on mount.</Text>
    </View>
  );
}
```

* **Call `setGlobalHandler` once** - typically in `app/_layout.tsx` or a dedicated `bootstrap.ts` imported before navigation
* Always **chain to `defaultHandler`** so developers still see the redbox in `__DEV__`
* `isFatal === true` means the runtime may tear down the JS context - persist logs synchronously
* Global handlers complement boundaries; they do not replace per-screen fallback UI

> **Related:** [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - unhandled promise rejections and production logging

---

### 10. Resilience Shell: Boundary + Offline + Retry

Compose the primitives from this page into a reusable screen wrapper - the pattern most production apps converge on.

```tsx
import React, { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
 
class ScreenBoundary extends Component<
  { children: ReactNode; resetKey: number },
  { hasError: boolean }
> {
  state = { hasError: false };
 
  static getDerivedStateFromError() {
    return { hasError: true };
  }
 
  render() {
    if (this.state.hasError) {
      return <Text style={styles.inlineError}>This screen crashed.</Text>;
    }
    return this.props.children;
  }
}
 
function OfflineBanner() {
  const [offline, setOffline] = useState(false);
 
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
  }, []);
 
  if (!offline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Offline</Text>
    </View>
  );
}
 
function OrdersScreen({ reloadKey }: { reloadKey: number }) {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
 
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
 
    fetch("https://jsonplaceholder.typicode.com/posts?_limit=2")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load orders");
        return res.json();
      })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
 
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);
 
  if (status === "loading") return <ActivityIndicator style={{ marginTop: 24 }} />;
  if (status === "error") {
    return <Text style={styles.inlineError}>Could not load orders.</Text>;
  }
  return <Text style={{ padding: 16 }}>Orders loaded.</Text>;
}
 
export default function App() {
  const [screenKey, setScreenKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => {
    setScreenKey((k) => k + 1);
    setReloadKey((k) => k + 1);
  }, []);
 
  return (
    <View style={styles.shell}>
      <OfflineBanner />
      <ScreenBoundary resetKey={screenKey}>
        <OrdersScreen reloadKey={reloadKey} />
      </ScreenBoundary>
      <Pressable onPress={retry} style={styles.retry}>
        <Text style={styles.retryText}>Retry screen</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  shell: { flex: 1, paddingTop: 48 },
  banner: { backgroundColor: "#fef3c7", padding: 8 },
  bannerText: { textAlign: "center", color: "#92400e", fontWeight: "600" },
  inlineError: { padding: 16, color: "#b91c1c" },
  retry: {
    margin: 16,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
```

* **Shell concerns stack: connectivity → render safety → data retry** - each layer handles a different failure class
* A single Retry button bumps both `screenKey` (remounts the boundary) and `reloadKey` (re-runs the fetch)
* Extract `ScreenBoundary`, `OfflineBanner`, and `ResilienceShell` into `components/` as the app grows
* Feature flags can short-circuit a crashing screen before the boundary fires - see the dedicated article

> **Related:** [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - navigator placement | [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - kill switches for crashing screens | [Error Boundaries Best Practices](https://docs.wahwei/reactnative.codeguides.io/error-resilience/best-practices/) - production checklist

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
