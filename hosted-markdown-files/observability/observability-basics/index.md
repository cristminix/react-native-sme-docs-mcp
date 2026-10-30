# Observability Basics

10 examples to get you started with mobile observability - 7 basic and 3 intermediate. Covers **native crashes**, **ANRs**, **JavaScript errors**, and how they fit into the **signal stack** every Expo team ships before store release.

Highlights / Observability Basics

* Mobile observability spans native crashes, JS fatals, ANRs, and product analytics - not one SDK
* Crash-free sessions measure user impact; raw crash counts hide low-traffic screens
* JS errors and native crashes need separate pipelines - Hermes stacks differ from iOS native frames
* Tag every event with release, OTA update id, and route - triage without reproducing on device
* ANRs on Android are slow main-thread work - profile before blaming React
* Pair crash reporters with structured logs - breadcrumbs alone miss offline-first failures

## Prerequisites

Scaffold a blank TypeScript app. Examples use built-in APIs and patterns that work on **Expo SDK 57** release builds - no vendor SDK required until you wire Sentry in a later page.

```bash
npx create-expo-app@latest MyObservabilityApp --template blank-typescript
cd MyObservabilityApp
npx expo start
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

The mobile **signal stack** has four layers teams instrument in order:

| Layer | What it catches | Typical tool |
| --- | --- | --- |
| **Crash / fatal** | Native SIGSEGV, fatal JS, process death | Sentry, Firebase Crashlytics |
| **Error / handled** | Caught API failures, boundary trips, global JS | Sentry + your logger |
| **Performance** | Cold start, navigation TT, API latency | Sentry transactions, OTel |
| **Product analytics** | Funnels, retention, feature usage | Amplitude, Segment |

Use all four. A crash-free dashboard with zero performance budgets still ships slow releases.

---

## Basic Examples

### 1. Define Crash vs Error vs ANR

Mobile platforms classify failures differently - your dashboards should too.

```ts
// src/observability/taxonomy.ts
export type MobileFailureKind =
  | "native_crash"      // process terminated - iOS/Android native
  | "js_fatal"          // ErrorUtils isFatal - bundle may be unhealthy
  | "js_non_fatal"      // caught, reported, app continues
  | "anr"               // Android: main thread blocked ~5s+ (Application Not Responding)
  | "handled_error";    // API 5xx surfaced in UI - still worth logging
 
export type FailureReport = {
  kind: MobileFailureKind;
  message: string;
  screen?: string;
  release: string;       // native build: 1.4.2 (42)
  otaUpdateId?: string;    // expo-updates manifest id
  sessionId: string;
};
```

* **Native crash** ends the session - user must relaunch
* **JS fatal** may or may not kill the process depending on engine and error site
* **ANR** is Android-specific - iOS watchdog kills are closer to native crash taxonomy
* **Handled errors** belong in logs and non-fatal issue trackers - not the crash-free rate numerator

> **Related:** [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - `ErrorUtils.setGlobalHandler` for JS fatals

---

### 2. Attach Release Context to Every Report

Without build identity, you cannot tie a spike to an OTA or a store build.

```ts
// src/observability/releaseContext.ts
import * as Application from "expo-application";
import * as Updates from "expo-updates";
 
export async function getReleaseContext() {
  const nativeVersion = Application.nativeApplicationVersion ?? "unknown";
  const buildNumber = Application.nativeBuildVersion ?? "unknown";
  const ota = Updates.updateId ?? "embedded";
  const channel = Updates.channel ?? "none";
 
  return {
    release: `${nativeVersion}+${buildNumber}`,
    otaUpdateId: ota,
    channel,
    runtimeVersion: Updates.runtimeVersion ?? "unknown",
  };
}
```

```bash
npx expo install expo-application expo-updates
```

* **`release`** should match what Sentry and your backend expect - `version+build` is a common shape
* **OTA update id** distinguishes a bad JavaScript bundle from a bad native binary - see [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/)
* **Runtime version** gates which OTAs apply - mismatches look like mysterious "old bug" reports
* Log context once at session start and attach to every error, log batch, and trace

---

### 3. Session ID for Correlation

Tie crashes, logs, and API traces to one user journey.

```ts
// src/observability/session.ts
import * as Crypto from "expo-crypto";
 
let sessionId: string | null = null;
 
export async function getSessionId() {
  if (!sessionId) {
    const bytes = await Crypto.getRandomBytesAsync(16);
    sessionId = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return sessionId;
}
```

* Generate a new session id on **cold start** - not on every foreground
* Rotate on **logout** when PII boundaries change - pair with [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)
* Send `sessionId` as a header (`X-Session-Id`) on API calls for server-side join
* Never use session id as user id - sessions are anonymous until auth

---

### 4. Screen Name as a Dimension

Route-aware crash grouping cuts triage time dramatically.

```tsx
// src/observability/useActiveRoute.ts
import { usePathname, useSegments } from "expo-router";
import { useEffect } from "react";
 
type RouteReporter = (route: string) => void;
 
export function useActiveRoute(report: RouteReporter) {
  const pathname = usePathname();
  const segments = useSegments();
 
  useEffect(() => {
    const route = pathname || segments.join("/") || "unknown";
    report(route);
  }, [pathname, segments, report]);
}
```

```tsx
// app/_layout.tsx - wire once at root
import { useCallback, useRef } from "react";
import { useActiveRoute } from "@/observability/useActiveRoute";
 
const currentRoute = { value: "boot" };
 
export default function RootLayout() {
  const report = useCallback((route: string) => {
    currentRoute.value = route;
    // crashSdk.setTag("route", route);
  }, []);
 
  useActiveRoute(report);
  return null; // Stack in real app
}
```

* Prefer **pathname** over component display names - refactors rename components, routes stay stable
* Update route tag on **every navigation** - stale route tags mis-attribute crashes
* For modals and nested stacks, include segments: `checkout/payment`
* Performance transactions should use the same route key - see [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/)

---

### 5. Breadcrumb Shape for Mobile

Breadcrumbs are a time-ordered trail - keep them small and structured.

```ts
// src/observability/breadcrumbs.ts
export type Breadcrumb = {
  ts: number;
  category: "navigation" | "network" | "auth" | "user" | "console";
  message: string;
  data?: Record<string, string | number | boolean>;
};
 
const MAX_BREADCRUMBS = 50;
const ring: Breadcrumb[] = [];
 
export function addBreadcrumb(crumb: Omit<Breadcrumb, "ts">) {
  ring.push({ ...crumb, ts: Date.now() });
  if (ring.length > MAX_BREADCRUMBS) ring.shift();
}
 
export function getBreadcrumbs() {
  return [...ring];
}
```

```ts
addBreadcrumb({
  category: "network",
  message: "GET /v1/feed failed",
  data: { status: 503, durationMs: 4200 },
});
```

* Cap ring size - unbounded arrays OOM on chatty screens
* **Never** put tokens, emails, or card numbers in `data` - hashes or booleans only
* Categories map cleanly to Sentry and structured log indexes
* Auth breadcrumbs (`login_success`, `logout`) help reproduce session bugs without storing credentials

---

### 6. Distinguish JS Errors from Native Crashes

Your dashboard needs two ingestion paths.

```ts
// src/observability/report.ts
import type { FailureReport } from "./taxonomy";
 
type Reporter = (report: FailureReport) => void;
 
export function reportJsError(
  report: Reporter,
  error: Error,
  meta: { isFatal: boolean; screen: string; release: string }
) {
  report({
    kind: meta.isFatal ? "js_fatal" : "js_non_fatal",
    message: error.message,
    screen: meta.screen,
    release: meta.release,
    sessionId: "…", // from getSessionId()
  });
}
 
// Native crashes are captured by @sentry/react-native / Crashlytics native SDKs.
// JS layer only sees them as "previous session ended unexpectedly" on next launch.
```

* Install the **React Native SDK** with native modules enabled - JS-only wrappers miss SIGABRT
* Symbolicate **both** Hermes bytecode maps and native dSYMs / ProGuard mappings
* After a native crash, **on-device logs are gone** unless you shipped them on prior foreground - see [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/)
* JS fatals may still allow `componentDidCatch` on sibling trees - native crashes do not

---

### 7. Crash-Free Sessions (Concept)

Product and engineering should agree on one north-star reliability metric.

```ts
// src/observability/metrics.ts
export type SessionOutcome = "clean" | "crashed" | "unknown";
 
export function crashFreeRate(sessions: SessionOutcome[]) {
  const known = sessions.filter((s) => s !== "unknown");
  const clean = known.filter((s) => s === "clean").length;
  return known.length === 0 ? 1 : clean / known.length;
}
 
// Example SLO: 99.5% crash-free sessions over 28 days (see slos-for-mobile-apps)
```

* A **session** ends on crash, force-quit, or background timeout - define the rule explicitly
* **Crash-free users** is a stricter metric - one bad device should not dominate
* Exclude **development** and **internal** builds from production SLO numerators
* Pair with **cold start** and **OTA success** SLOs - [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/)

---

## Intermediate Examples

### 8. Global Handler + Enriched Payload

Chain the previous handler and attach release context before forwarding to your reporter.

```tsx
// src/bootstrap/installObservability.ts
import { getReleaseContext } from "@/observability/releaseContext";
import { getBreadcrumbs } from "@/observability/breadcrumbs";
 
type GlobalHandler = (error: Error, isFatal?: boolean) => void;
 
declare const ErrorUtils: {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
};
 
export function installGlobalObservability(
  send: (payload: Record<string, unknown>) => void
) {
  const previous = ErrorUtils.getGlobalHandler();
 
  ErrorUtils.setGlobalHandler(async (error, isFatal = false) => {
    const release = await getReleaseContext();
    send({
      kind: isFatal ? "js_fatal" : "js_non_fatal",
      message: error.message,
      stack: error.stack,
      isFatal,
      breadcrumbs: getBreadcrumbs(),
      ...release,
    });
    previous(error, isFatal);
  });
}
```

* Call **once** at bootstrap - before providers and navigation
* Always **chain** `previous` - dev redbox and vendor SDKs depend on it
* Async work in the handler must be fire-and-forget - do not block the runtime
* Mirror the same payload shape in Sentry `beforeSend` for consistent dashboards

> **Related:** [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) - three-layer error model

---

### 9. Detect Main-Thread Risk (ANR Prevention)

ANRs come from synchronous work on the UI thread - often JSON parse, logging floods, or heavy `useMemo` on large arrays.

```tsx
import { useEffect, useRef } from "react";
import { InteractionManager } from "react-native";
 
export function useMainThreadWatchdog(thresholdMs = 2000) {
  const lastTick = useRef(Date.now());
 
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const gap = now - lastTick.current;
      lastTick.current = now;
      if (gap > thresholdMs) {
        console.warn("[perf] event loop gap ms", gap);
        // report non-fatal: possible ANR / JS thread stall
      }
    }, 500);
    return () => clearInterval(id);
  }, [thresholdMs]);
}
 
// Defer heavy work off the critical path
export function deferAfterInteractions(task: () => void) {
  InteractionManager.runAfterInteractions(task);
}
```

* **2000ms** gaps on a 500ms timer suggest JS thread blockage - investigate before users see ANR dialogs
* Large **FlatList** datasets without virtualization are a common ANR source - [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/)
* Image decode on the JS thread during scroll causes stalls - use appropriately sized assets
* Android Vitals reports ANRs in Play Console - correlate with your release and OTA tags

---

### 10. Minimal Signal Stack Bootstrap

Wire crash reporting, logging, and analytics behind one facade so screens stay clean.

```ts
// src/observability/index.ts
import { getReleaseContext } from "./releaseContext";
import { getSessionId } from "./session";
import { addBreadcrumb, getBreadcrumbs } from "./breadcrumbs";
 
export const observability = {
  async baseContext() {
    const [release, sessionId] = await Promise.all([
      getReleaseContext(),
      getSessionId(),
    ]);
    return { ...release, sessionId };
  },
  breadcrumb: addBreadcrumb,
  getBreadcrumbs,
  captureException(error: Error, extra?: Record<string, unknown>) {
    // forward to Sentry + log buffer
    console.error("[capture]", error.message, extra);
  },
  track(event: string, props?: Record<string, string | number | boolean>) {
    // forward to analytics with consent gate - see analytics-and-privacy
  },
};
```

```tsx
// app/_layout.tsx
import { useEffect } from "react";
import { installGlobalObservability } from "@/bootstrap/installObservability";
import { observability } from "@/observability";
 
installGlobalObservability((payload) => {
  observability.captureException(new Error(payload.message as string), payload);
});
 
export default function RootLayout() {
  useEffect(() => {
    observability.baseContext().then((ctx) => {
      observability.track("app_open", { channel: ctx.channel });
    });
  }, []);
  return null;
}
```

* One **facade** prevents every screen from importing three SDKs
* `baseContext()` runs once per session - cache internally
* **Analytics** calls must respect consent - stub `track` until gates resolve
* Expand this facade in [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) and [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/)

---

## FAQs

What is the difference between observability and analytics?

* **Observability** answers "what broke and why" - crashes, errors, latency, traces.
* **Analytics** answers "what did users do" - funnels, retention, experiments.
* Share release context and session ids; do not duplicate vendors without reason.

Do I need separate tools for iOS and Android crashes?

* Modern RN SDKs (Sentry, Crashlytics) ship **one package** with native modules for both platforms.
* You still need **platform-specific** symbol files - dSYM (iOS) and ProGuard/R8 mapping (Android).

Can Expo Go report production-like crashes?

* No - Expo Go uses a different native shell and bundle id. Validate on **development builds** and **EAS preview** binaries.

How do OTA updates affect crash attribution?

* Tag reports with `expo-updates` `updateId` and `runtimeVersion`.
* A spike after OTA publish without a store release almost always points to JavaScript - roll back the update channel first.

## Related

* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - production crash reporting and source maps
* [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/) - batched logs across crashes
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - ErrorUtils integration
* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - TTI and FPS vocabulary
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - what OTA can change vs store builds
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session boundaries and logout telemetry

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 3730363230327c3138396f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
