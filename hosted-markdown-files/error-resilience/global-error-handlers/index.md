# Global Error Handlers

`ErrorUtils.setGlobalHandler` and unhandled promise rejections.

Highlights / Global Error Handlers

* ErrorUtils.setGlobalHandler is React Native's last-resort JS fatal error hook
* Always chain the previous handler - dev redbox and native crash reporting depend on it
* Register handlers once at app bootstrap, before other instrumentation
* Global handlers log and report - screen fallbacks still come from error boundaries
* Unhandled promise rejections need explicit .catch at API boundaries
* Use isFatal to decide whether to show recovery UI vs immediate crash reporting

React error boundaries only cover the render tree. **`ErrorUtils.setGlobalHandler`** is React Native's hook for uncaught JavaScript errors - including many failures that never touch a boundary. Pair it with disciplined **`async`/`await` error handling** so promise rejections are not silent in production.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// src/bootstrap/installGlobalErrorHandlers.ts
// Import this once from your app entry (index.js / _layout.tsx) before other app code.
 
type GlobalHandler = (error: Error, isFatal?: boolean) => void;
 
declare const ErrorUtils: {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
};
 
export function installGlobalErrorHandlers(report: (error: Error, meta: { isFatal: boolean }) => void) {
  const previous = ErrorUtils.getGlobalHandler();
 
  ErrorUtils.setGlobalHandler((error, isFatal = false) => {
    report(error, { isFatal });
    previous(error, isFatal);
  });
}
```

```tsx
// app/_layout.tsx (Expo Router root) - call before rendering providers
import { installGlobalErrorHandlers } from "@/bootstrap/installGlobalErrorHandlers";
import { Stack } from "expo-router";
 
installGlobalErrorHandlers((error, { isFatal }) => {
  console.error("[global]", isFatal ? "FATAL" : "non-fatal", error);
  // crashReporter.captureException(error, { extra: { isFatal } });
});
 
export default function RootLayout() {
  return <Stack />;
}
```

**When to reach for this:**

* You need a **single capture point** for uncaught JS errors in production builds.
* You integrate **Sentry**, Bugsnag, or an internal pipeline and want errors outside React's tree.
* Errors surface from native modules, timers, or microtasks that boundaries never see.
* You want consistent metadata (`isFatal`, build channel, route) on every crash report.
* You are hardening release builds where the dev redbox is disabled.

## Working Example

```tsx
// installGlobalErrorHandlers.ts - full bootstrap module
type GlobalHandler = (error: Error, isFatal?: boolean) => void;
 
declare const ErrorUtils: {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
};
 
export type ErrorReport = {
  message: string;
  stack?: string;
  isFatal: boolean;
  kind: "global" | "unhandled-rejection";
};
 
const reports: ErrorReport[] = [];
 
export function getCapturedReports() {
  return [...reports];
}
 
function normalizeError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  return new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
}
 
function record(error: Error, meta: { isFatal: boolean; kind: ErrorReport["kind"] }) {
  reports.push({
    message: error.message,
    stack: error.stack,
    isFatal: meta.isFatal,
    kind: meta.kind,
  });
  console.error(`[${meta.kind}]`, meta.isFatal ? "FATAL" : "non-fatal", error.message);
}
 
export function installGlobalErrorHandlers() {
  const previous = ErrorUtils.getGlobalHandler();
 
  ErrorUtils.setGlobalHandler((error, isFatal = false) => {
    record(error, { isFatal, kind: "global" });
    previous(error, isFatal);
  });
 
  // Belt-and-suspenders: explicit unhandled rejection logging (Hermes / RN dev tooling may also route these)
  const g = globalThis as typeof globalThis & {
    onunhandledrejection?: (event: { reason?: unknown }) => void;
  };
 
  g.onunhandledrejection = (event) => {
    const error = normalizeError(event.reason);
    record(error, { isFatal: false, kind: "unhandled-rejection" });
  };
}
 
// --- Demo screens ---
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
 
installGlobalErrorHandlers();
 
function causeUnhandledRejection() {
  void Promise.reject(new Error("billing sync failed"));
}
 
function causeThrowInTimer() {
  setTimeout(() => {
    throw new Error("timer throw outside React");
  }, 0);
}
 
export default function App() {
  const [tick, setTick] = useState(0);
 
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
 
  const latest = getCapturedReports().slice(-3);
 
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Global Error Handlers</Text>
      <Text style={styles.sub}>Clock: {tick}s (app still running)</Text>
 
      <Pressable style={styles.btn} onPress={causeUnhandledRejection}>
        <Text style={styles.btnLabel}>Trigger unhandled rejection</Text>
      </Pressable>
 
      <Pressable style={styles.btn} onPress={causeThrowInTimer}>
        <Text style={styles.btnLabel}>Trigger timer throw</Text>
      </Pressable>
 
      <Text style={styles.section}>Last captured reports</Text>
      {latest.length === 0 && <Text style={styles.meta}>None yet - tap a button above.</Text>}
      {latest.map((r, i) => (
        <View key={`${r.message}-${i}`} style={styles.card}>
          <Text style={styles.cardTitle}>
            [{r.kind}] {r.isFatal ? "FATAL" : "non-fatal"}
          </Text>
          <Text style={styles.cardBody}>{r.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { color: "#64748b" },
  section: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  meta: { color: "#94a3b8" },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8 },
  btnLabel: { color: "#fff", fontWeight: "600", textAlign: "center" },
  card: { backgroundColor: "#f1f5f9", padding: 12, borderRadius: 8 },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  cardBody: { color: "#334155" },
});
```

**What this demonstrates:**

* `ErrorUtils.setGlobalHandler` installed **once** at module load before UI renders.
* The **previous handler is chained** so React Native dev tooling still runs after your reporter.
* `isFatal` is recorded - production triage distinguishes hard stops from soft errors.
* `onunhandledrejection` catches floating promise failures that never hit a boundary.
* Timer throws (outside React) flow through the global handler - boundaries would not catch them.
* Reporting is **side-effect only** - user-facing recovery stays in error boundaries and screen UX.

## Deep Dive

### How It Works

* React Native installs a default global handler that shows the **redbox** in development and forwards fatals to native crash infrastructure in release.
* **`ErrorUtils.setGlobalHandler(fn)`** replaces that handler. Your function runs first; you typically log, enrich, then call the previous handler.
* **`isFatal`** hints whether the runtime treats the error as terminal. Fatals may end the JS bundle's healthy execution; always report them immediately.
* **Error boundaries** only cover React's render/lifecycle path. Timer callbacks, native module callbacks, and unhandled promise rejections require global hooks or local try/catch.
* **Unhandled promise rejections** occur when a Promise rejects and no `.catch` exists. In dev, LogBox surfaces them; in release, behavior depends on Hermes/RN version - never rely on luck.
* Register handlers at **bootstrap** (entry file or root `_layout.tsx` side effect) before routers, analytics, and feature code load.

### ErrorUtils API

| Method | Purpose |
| --- | --- |
| `getGlobalHandler()` | Returns the currently installed handler (chain this) |
| `setGlobalHandler(fn)` | Installs your handler for uncaught JS errors |

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `error` | `Error` | The thrown or normalized JS error |
| `isFatal` | `boolean` (optional) | When `true`, the runtime considers the error terminal - prioritize crash reporting |

`setGlobalHandler` and `getGlobalHandler` return `void` / a handler function respectively. There is no promise return - the handler runs synchronously on the crash path.

### Bootstrap Order (Expo Router)

```tsx
// app/_layout.tsx - top of file, before components
import { installGlobalErrorHandlers } from "@/bootstrap/installGlobalErrorHandlers";
import * as Sentry from "@sentry/react-native";
 
Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
 
installGlobalErrorHandlers((error, { isFatal }) => {
  Sentry.captureException(error, { extra: { isFatal } });
});
 
export default function RootLayout() {
  return <RootProviders />;
}
```

1. Crash reporter `init`
2. `installGlobalErrorHandlers`
3. Navigation / providers / feature imports

### Unhandled Promise Rejections

| Approach | Role |
| --- | --- |
| `.catch` / `try/catch` on every `async` API | Primary - prevents rejections from becoming global |
| `onunhandledrejection` on `globalThis` | Secondary logger in app code |
| `ErrorUtils` global handler | Catches many uncaught throws; some rejections route here in release |
| Crash reporter SDK | Often instruments both automatically |

```tsx
// API boundary - prefer fixing at the source
export async function fetchBalance(): Promise<number> {
  try {
    const res = await fetch("/api/balance");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { balance: number };
    return json.balance;
  } catch (error) {
    // Convert to Result type or rethrow to a controlled screen error state
    throw error instanceof Error ? error : new Error("balance fetch failed");
  }
}
 
// Fire-and-forget tasks must still handle failure
void syncAnalytics().catch((error) => {
  console.warn("analytics sync failed", error);
});
```

### Global Handler vs Error Boundary

| Layer | Catches | User experience |
| --- | --- | --- |
| try/catch | Known async/native calls | Inline error, toast, form message |
| Error boundary | Render/lifecycle throws | Screen fallback with Retry |
| ErrorUtils global | Uncaught JS outside boundaries | Log/report; default RN fatal UI in dev |
| Native crash SDK | Native + JS fatals | Crash dashboard, session replay |

Do not render React UI inside `setGlobalHandler` - the tree may be unstable. Defer product UX to boundaries and [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/).

### TypeScript Notes

```tsx
type ReportFn = (error: Error, meta: { isFatal: boolean }) => void;
 
declare const ErrorUtils: {
  getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
};
 
export function installGlobalErrorHandlers(report: ReportFn): void {
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal = false) => {
    report(error, { isFatal: !!isFatal });
    previous(error, isFatal);
  });
}
 
function normalizeReason(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  return new Error(String(reason));
}
```

* `ErrorUtils` is a **React Native global** - it is not imported from `react-native` in all templates; declare it once in a `globals.d.ts` if needed.
* Normalize non-`Error` rejection reasons before logging so reporters always receive an `Error` shape.

## Gotchas

* **Replacing the global handler without chaining** - Dev redbox and native crash plumbing stop working. **Fix:** Always call `const prev = ErrorUtils.getGlobalHandler()` and invoke `prev(error, isFatal)` after reporting.
* **Registering the handler multiple times** - Each hot reload or layout remount wraps another layer; reports duplicate. **Fix:** Guard with a module-level `let installed = false` flag.
* **Expecting the global handler to show friendly screen UI** - React may be mid-render or corrupted. **Fix:** Report in the handler; show recovery UI via error boundaries.
* **Unhandled `void someAsync()` calls** - Floating promises bypass try/catch and boundaries. **Fix:** `void someAsync().catch(handle)` or await inside an event handler with try/catch.
* **Swallowing fatals** - Returning early without calling the previous handler hides catastrophic errors in dev. **Fix:** Report, then always chain unless you fully own crash behavior in a custom dev client.
* **Installing handlers after lazy imports** - Errors during early module evaluation miss your handler. **Fix:** Import bootstrap first in `index.js` or the top of `app/_layout.tsx`.
* **Double registration with Sentry** - Sentry also patches handlers; order matters. **Fix:** `Sentry.init()` first, then custom enrichment that chains, or use Sentry's hooks exclusively.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `ErrorUtils.setGlobalHandler` | Baseline RN production hardening | You only need render-time containment (use boundaries) |
| Crash reporter SDK alone (Sentry) | Managed instrumentation, symbolication | You need custom local logging before third-party init |
| try/catch everywhere | Predictable async flows | Render throws from third-party components |
| React error boundaries | Screen-level fallback UX | Timer/native errors outside React |
| LogBox (dev only) | Local debugging | Production crash capture |

## FAQs

What is ErrorUtils in React Native?

`ErrorUtils` is a global object provided by the React Native runtime with `getGlobalHandler` and `setGlobalHandler`. It is the last-resort hook for uncaught JavaScript errors in the JS bundle.

Where do I call setGlobalHandler in an Expo Router app?

At the top of `app/_layout.tsx` (side-effect import) or in `index.js` before `registerRootComponent`. It must run once, as early as possible - before navigation and feature modules load.

What does isFatal mean?

When `true`, the runtime treats the error as terminal - the process or JS context may not continue reliably. Report immediately and avoid attempting complex recovery UI from the global handler.

Do error boundaries replace the global handler?

No - they solve different problems. Boundaries contain render errors per screen. The global handler captures uncaught errors outside React's render path (timers, some native callbacks, unhandled throws).

How are unhandled promise rejections handled in RN 0.86?

In development, LogBox warns. In production, behavior varies - some rejections route to the global handler, many do not. Treat explicit `.catch` at API boundaries as mandatory; use `onunhandledrejection` as a secondary safety net.

Should I show an Alert in the global handler?

Generally no - the tree may be unstable and alerts stack annoyingly. Report the error and let error boundaries or the next app launch present UX. Native fatals may end the session regardless.

How do I avoid duplicate reports on hot reload?

```tsx
let installed = false;
 
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  // setGlobalHandler...
}
```

Guard installation at module scope in development.

Can I import ErrorUtils from react-native?

Prefer the global `ErrorUtils` with a TypeScript ambient declaration. Templates vary; the runtime always exposes the global on the JS thread.

How does this integrate with Sentry?

Call `Sentry.init()` first, then either rely on Sentry's automatic handler patching or chain your enrichment after `getGlobalHandler()`. See [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/).

What errors never reach the global handler?

Errors caught by try/catch, handled promise rejections, and errors contained by React error boundaries (unless rethrown). Native-only crashes may bypass JS handlers entirely - need native SDKs.

Should global handlers restart the app?

Rarely. Prefer letting the user relaunch or navigating home from a boundary fallback. `expo-updates` `reloadAsync()` is a heavy hammer - reserve for OTA recovery flows, not every JS error.

How do I test global handlers in development?

Trigger a timer throw or `Promise.reject` without `.catch` as in the working example. Confirm your reporter logs fire, then verify the dev redbox still appears because you chained the previous handler.

Does Hermes change global error behavior?

Hermes is the default JS engine in React Native 0.86 / Expo SDK 57. Stack traces and promise rejection routing differ slightly from JSC, but `ErrorUtils` remains the stable integration point.

What belongs in the report payload?

* `error.message` and `stack`
* `isFatal`
* app version, route name, user id (hashed)
* build channel (dev/preview/production)

Avoid PII in global crash metadata.

How does this relate to Error Handling Basics?

Basics covers layering try/catch, boundaries, and globals. This page implements the global layer - see [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) for the full picture.

## Related

* [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) - three-layer model: try/catch, boundaries, globals
* [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - screen fallbacks the global handler cannot render
* [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - what users see vs what globals log
* [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/) - production crash reporting on EAS builds
* [Mobile Incident Basics](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/mobile-incident-basics/) - triage when crash rates spike
* [Hermes & the JS Runtime](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/hermes-and-the-js-runtime/) - engine behavior behind JS errors

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
