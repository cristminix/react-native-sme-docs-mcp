# Error Boundaries in RN

Screen-level fallbacks and recovery UI patterns.

Highlights / Error Boundaries in RN

* Error boundaries are class components - they catch render, lifecycle, and child-constructor errors
* Wrap one boundary per screen (or route layout), not every leaf component
* Fallback UI should offer retry (reset) and a safe navigation escape hatch
* Log in componentDidCatch; never show raw stack traces to users
* Boundaries do not catch event handlers, async code, or errors inside the boundary itself
* Nest boundaries when a widget can fail without taking down the whole screen

React error boundaries prevent a single component failure from blanking the entire app. On mobile, the right granularity is usually **one boundary per screen** (or Expo Router layout) with a recovery UI that lets the user retry or navigate away.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
type Props = { children: ReactNode; onReset?: () => void };
type State = { hasError: boolean; message?: string };
 
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
 
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }
 
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ScreenErrorBoundary]", error, info.componentStack);
    // Forward to crash reporter here (Sentry, etc.)
  }
 
  private reset = () => {
    this.setState({ hasError: false, message: undefined });
    this.props.onReset?.();
  };
 
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>This screen hit an unexpected error.</Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
 
const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 16, color: "#64748b", textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonLabel: { color: "#fff", fontWeight: "600" },
});
```

**When to reach for this:**

* A screen renders data from an API or native module that can throw during render.
* You ship third-party widgets (maps, charts, WebViews) that occasionally crash the subtree.
* You want a contained fallback instead of the red React Native error screen in production.
* You need a **reset** path so users recover without force-quitting the app.
* You are layering defense: try/catch at async boundaries **plus** boundaries at the UI shell.

## Working Example

```tsx
import React, { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
 
type BoundaryProps = {
  children: ReactNode;
  screenName: string;
  onNavigateHome?: () => void;
};
 
type BoundaryState = { hasError: boolean };
 
class RouteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };
 
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }
 
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.screenName}]`, error.message, info.componentStack);
  }
 
  private reset = () => this.setState({ hasError: false });
 
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.fallback} edges={["top", "bottom"]}>
          <Text style={styles.title}>We could not load {this.props.screenName}</Text>
          <Text style={styles.body}>
            The rest of the app still works. Try again or go back to Home.
          </Text>
          <Pressable onPress={this.reset} style={styles.primary}>
            <Text style={styles.primaryLabel}>Try again</Text>
          </Pressable>
          <Pressable onPress={this.props.onNavigateHome} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Go to Home</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}
 
/** Demo widget that throws when count is a multiple of 3 - simulates a bad render path. */
function FlakyCounter() {
  const [count, setCount] = useState(0);
  if (count > 0 && count % 3 === 0) {
    throw new Error(`Render failed at count ${count}`);
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Flaky widget</Text>
      <Text style={styles.count}>{count}</Text>
      <Pressable onPress={() => setCount((c) => c + 1)} style={styles.primary}>
        <Text style={styles.primaryLabel}>Increment (crashes every 3rd tap)</Text>
      </Pressable>
    </View>
  );
}
 
function FeedScreen({ onNavigateHome }: { onNavigateHome: () => void }) {
  return (
    <RouteErrorBoundary screenName="Feed" onNavigateHome={onNavigateHome}>
      <View style={styles.screen}>
        <Text style={styles.screenTitle}>Feed</Text>
        <FlakyCounter />
      </View>
    </RouteErrorBoundary>
  );
}
 
function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Home</Text>
      <Text style={styles.body}>You escaped a broken screen safely.</Text>
    </View>
  );
}
 
export default function App() {
  const [route, setRoute] = useState<"feed" | "home">("feed");
 
  return (
    <SafeAreaProvider>
      {route === "feed" ? (
        <FeedScreen onNavigateHome={() => setRoute("home")} />
      ) : (
        <HomeScreen />
      )}
    </SafeAreaProvider>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: "#f8fafc" },
  screenTitle: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  card: { padding: 20, borderRadius: 12, backgroundColor: "#fff", gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  count: { fontSize: 32, fontWeight: "700" },
  fallback: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, color: "#64748b", marginBottom: 20 },
  primary: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center" },
  primaryLabel: { color: "#fff", fontWeight: "600" },
  secondary: { marginTop: 12, padding: 14, alignItems: "center" },
  secondaryLabel: { color: "#2563eb", fontWeight: "600" },
});
```

**What this demonstrates:**

* A **route-scoped** boundary isolates `FeedScreen` failures while `HomeScreen` stays healthy.
* Fallback UI offers **Try again** (`reset` clears boundary state) and **Go to Home** (navigation escape).
* `componentDidCatch` logs the error and component stack - the hook for crash reporters.
* A deliberately flaky child proves the boundary catches **render-time** throws, not button-handler throws.
* `SafeAreaView` on the fallback keeps recovery chrome clear of notches and home indicators.

## Deep Dive

### How It Works

* React walks the tree to render children. When a child throws during **render**, **lifecycle**, or **constructor**, React unwinds to the nearest class-based error boundary above it.
* `getDerivedStateFromError` runs first - return new state (e.g. `hasError: true`) so the next render shows fallback UI instead of re-throwing.
* `componentDidCatch` runs after commit - use it for logging, analytics, and crash reporting. It does not return JSX.
* **Reset** clears boundary state (`hasError: false`) so React attempts a normal render again. Pair reset with refetching data or remounting children via a `key` when stale state caused the crash.
* Error boundaries are **class components** in React 19 - there is no hook equivalent. A small boundary class (or `react-error-boundary`) is normal.
* Boundaries compose: an outer app shell boundary catches catastrophic failures; inner per-widget boundaries protect optional panels.

### What Boundaries Catch (and Miss)

| Caught | Not caught |
| --- | --- |
| Errors in child render | Errors in the boundary's own render |
| Child lifecycle methods | Event handlers (`onPress`, etc.) |
| Child constructors | `setTimeout`, `fetch`, `async/await` |
| Errors in child boundaries below | Server-side rendering (N/A on RN) |

```tsx
// NOT caught - handle with try/catch inside the handler
function BadButton() {
  return (
    <Pressable
      onPress={() => {
        throw new Error("Handler throw");
      }}
    >
      <Text>Tap me</Text>
    </Pressable>
  );
}
 
// Caught - throw during render
function BadRender({ value }: { value: string | null }) {
  if (!value) throw new Error("Missing value");
  return <Text>{value}</Text>;
}
```

Async and event-handler errors belong in **try/catch** at the API boundary or in **global handlers** - see [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/).

### Screen-Level Placement in Expo Router

Wrap at the **layout** or **screen export** - one boundary per route, not around every `Text` node.

```tsx
// app/(tabs)/feed/_layout.tsx
import { Stack } from "expo-router";
import { ScreenErrorBoundary } from "@/components/ScreenErrorBoundary";
 
export default function FeedLayout() {
  return (
    <ScreenErrorBoundary screenName="Feed">
      <Stack screenOptions={{ headerShown: false }} />
    </ScreenErrorBoundary>
  );
}
```

```tsx
// app/(tabs)/feed/index.tsx
import { ScreenErrorBoundary } from "@/components/ScreenErrorBoundary";
import { FeedScreenContent } from "@/features/feed/FeedScreenContent";
 
export default function FeedRoute() {
  return (
    <ScreenErrorBoundary screenName="Feed">
      <FeedScreenContent />
    </ScreenErrorBoundary>
  );
}
```

Pick **one** owner per screen - layout wrapper *or* screen wrapper, not both (avoids double fallbacks).

### Recovery UI Patterns

| Pattern | When | Implementation |
| --- | --- | --- |
| **Retry / reset** | Transient bad state or one-off render bug | `setState({ hasError: false })` + refetch |
| **Remount children** | Corrupted child state | Change `key` on children when resetting |
| **Navigate away** | Screen cannot self-heal | `router.replace("/")` or tab switch |
| **Reduced mode** | Optional module failed | Inner boundary shows inline "unavailable" card |
| **Support link** | Repeated failures | `Linking.openURL` to help center |

```tsx
function ScreenErrorBoundary({ children, resetKey }: { children: ReactNode; resetKey?: number }) {
  // Pass key={resetKey} to children wrapper to force remount on reset
  return <RouteErrorBoundary key={resetKey}>{children}</RouteErrorBoundary>;
}
```

### TypeScript Notes

```tsx
import type { ErrorInfo, ReactNode } from "react";
 
type FallbackRender = (args: {
  error: Error;
  reset: () => void;
}) => ReactNode;
 
// ErrorInfo.componentStack is the React component stack - not the JS stack trace
function logBoundaryError(error: Error, info: ErrorInfo, screen: string) {
  const payload = {
    screen,
    message: error.message,
    componentStack: info.componentStack,
  };
  console.error(JSON.stringify(payload));
}
```

* Keep boundary props minimal - `children`, `screenName`, optional `fallbackRender`, optional `onReset`.
* Do not store the `Error` object in state for UI; store a user-safe message. Log the full error in `componentDidCatch`.

## Gotchas

* **Expecting boundaries to catch `onPress` throws** - Event handlers run outside the render path. **Fix:** Wrap handler bodies in `try/catch` and surface a toast or inline error.
* **One boundary around the entire app only** - A single broken leaf takes down all navigation with a generic fallback. **Fix:** Add per-screen boundaries; keep a root boundary as a last resort.
* **Reset without remounting or refetching** - The same corrupt state re-throws immediately on retry. **Fix:** Bump a `key` on children or refetch screen data inside `onReset`.
* **Showing `error.message` or stack traces to users** - Leaks implementation details and confuses non-technical users. **Fix:** Generic copy in fallback; log details in `componentDidCatch`.
* **Throwing inside the boundary's own `render`** - The error propagates to the parent boundary (or crashes the app). **Fix:** Keep fallback JSX trivial; no data fetching in the boundary component.
* **Functional component "boundaries"** - Hooks cannot implement `getDerivedStateFromError`. **Fix:** Use a class component or the `react-error-boundary` package.
* **Missing logging in `componentDidCatch`** - Production crashes become invisible. **Fix:** Always log and forward to your crash reporter before calling `reset`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Class `ErrorBoundary` (this page) | Full control, zero extra dependencies | You want a `FallbackComponent` render-prop API out of the box |
| [`react-error-boundary`](https://github.com/bvaughn/react-error-boundary) | Declarative `FallbackComponent`, `onReset`, `resetKeys` | Bundle size is extremely constrained and a 30-line class suffices |
| try/catch at async API layer | `fetch`, mutations, native module calls | Render-time failures from bad props or third-party components |
| Global `ErrorUtils` handler | Unhandled native/JS fatals outside React | Replacing screen-level contained fallbacks |
| Feature flags / null guards | Known-bad code paths you can disable remotely | Unexpected throws you cannot predict at compile time |

## FAQs

Why must error boundaries be class components?

React only calls `getDerivedStateFromError` and `componentDidCatch` on class instances today (including React 19). There is no `useErrorBoundary` hook in core React. Use a small class or a library that wraps one.

Where should I place a boundary in an Expo Router app?

Wrap each screen's content - in `app/.../index.tsx` or the route's `_layout.tsx`. One boundary per screen is the usual mobile pattern. Avoid wrapping every list item.

What does the Try again button actually do?

It sets `hasError` back to `false`, so React re-renders children. For a reliable recovery, also refetch data or change a `key` on children to remount a corrupted subtree.

Will an error boundary catch a failed fetch?

No. Network errors inside `useEffect` or `async` functions are not render errors. Handle them with try/catch, Result types, or TanStack Query `isError` - see [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/).

Should I have a root boundary around the whole app?

Yes, as a safety net - but also add screen-level boundaries so one broken feature does not block navigation to the rest of the app.

How do I log errors for production crash reports?

```tsx
componentDidCatch(error: Error, info: ErrorInfo) {
  console.error(error, info.componentStack);
  // crashReporter.captureException(error, { extra: { componentStack: info.componentStack } });
}
```

Forward in `componentDidCatch`; never rely on users to report render crashes manually.

Can I use an error boundary inside a FlatList item?

Only for expensive or third-party rows that fail independently (e.g. a map cell). Do not wrap every row - it adds overhead and noisy logs. Prefer null guards for simple list data.

What is the difference between componentStack and JS stack?

`info.componentStack` is React's component tree path (which `<FeedList>` rendered which child). The JS stack trace shows functions and files. Log both in `componentDidCatch` for triage.

Does React 19 change error boundaries on React Native?

React 19 keeps the same boundary API. React Native 0.86 still surfaces uncaught render errors through the dev redbox and through native crash paths in release. Boundaries remain the idiomatic containment layer.

How do boundaries interact with Suspense?

Error boundaries catch render errors in suspended trees once content commits. They do not replace loading states - pair boundaries with Suspense fallbacks for loading, boundaries for failure.

Should fallback UI include a sign-out action?

Only when the screen is auth-specific and corrupted session state is a likely cause. For general feeds or settings, prefer retry and navigate-home over signing the user out automatically.

Can I pass a custom fallback component?

```tsx
render() {
  if (this.state.hasError) {
    return this.props.fallback ?? <DefaultFallback onReset={this.reset} />;
  }
  return this.props.children;
}
```

A render-prop or `fallback` prop keeps the boundary reusable across screens with different visual design.

Do error boundaries work in modals?

Yes - wrap modal content in its own boundary so a broken modal does not crash the screen beneath it. Reset or dismiss the modal on unrecoverable errors.

How does this relate to Error Handling Basics?

Use try/catch for async and imperative code; use error boundaries for render-time failures. Together they cover most client-side failure modes - see [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/).

## Related

* [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) - try/catch at async boundaries vs render-time boundaries
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - fatals and unhandled rejections outside React's tree
* [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - actionable fallback messaging
* [Graceful Degradation Patterns](https://docs.wahwei/reactnative.codeguides.io/error-resilience/graceful-degradation-patterns/) - inline reduced modes when a widget fails
* [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/) - wiring `componentDidCatch` to crash reports
* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - composition patterns for screen shells

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
