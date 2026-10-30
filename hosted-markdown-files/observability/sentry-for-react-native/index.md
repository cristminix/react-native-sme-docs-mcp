# Sentry for React Native

`@sentry/react-native` on Expo SDK 57 - initialization, **source maps**, **release health**, and **breadcrumbs** wired for EAS builds. This cookbook assumes you already understand the signal stack from [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/).

Highlights / Sentry for React Native

* Initialize Sentry before any other app imports in \_layout or index.js
* Upload source maps on every EAS build - unsymbolicated Hermes stacks are unreadable
* Set release to native version+build and dist to OTA update id when applicable
* Enable native crash capture - @sentry/react-native includes iOS and Android native layers
* Breadcrumbs from navigation and fetch beat post-mortem guesswork
* Release Health tracks crash-free sessions - align numerators with your SLO doc

## Prerequisites

```bash
npx expo install @sentry/react-native
npx @sentry/wizard@latest -i reactNative
```

The wizard adds Metro plugin config, native hooks, and EAS build steps. For manual setup, pin versions compatible with RN 0.86:

```json
{
  "dependencies": {
    "@sentry/react-native": "^6.0.0",
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Recipe

> Quick-reference recipe card - copy-paste ready.

**1. Initialize at the earliest entry point**

```tsx
// app/_layout.tsx - must run before other imports side effects
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
 
const nativeVersion = Application.nativeApplicationVersion ?? "0.0.0";
const buildNumber = Application.nativeBuildVersion ?? "0";
const release = `${nativeVersion}+${buildNumber}`;
const dist = Updates.updateId ?? buildNumber;
 
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  release,
  dist,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
  attachStacktrace: true,
  beforeSend(event) {
    // Strip PII - never send raw emails or tokens
    if (event.user?.email) delete event.user.email;
    return event;
  },
});
 
function RootLayout() {
  return <Stack />;
}
 
export default Sentry.wrap(RootLayout);
```

**2. EAS build - upload source maps**

```json
// eas.json excerpt
{
  "build": {
    "production": {
      "env": {
        "SENTRY_AUTH_TOKEN": "@sentry-auth-token",
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "your-rn-app"
      }
    }
  }
}
```

```bash
# After EAS Build completes, sentry-expo / wizard hooks upload:
# - Hermes source maps (JS)
# - Debug symbols for native frames (iOS dSYM, Android NDK if used)
eas build --platform all --profile production
```

**3. Navigation breadcrumbs (Expo Router)**

```tsx
import { useEffect } from "react";
import { usePathname } from "expo-router";
import * as Sentry from "@sentry/react-native";
 
export function useSentryRouteBreadcrumb() {
  const pathname = usePathname();
 
  useEffect(() => {
    Sentry.addBreadcrumb({
      category: "navigation",
      message: pathname,
      level: "info",
    });
    Sentry.setTag("route", pathname);
  }, [pathname]);
}
```

**4. Network breadcrumb wrapper**

```ts
export async function sentryFetch(input: RequestInfo, init?: RequestInit) {
  const start = Date.now();
  const url = typeof input === "string" ? input : input.url;
 
  try {
    const res = await fetch(input, init);
    Sentry.addBreadcrumb({
      category: "http",
      message: `${init?.method ?? "GET"} ${url}`,
      data: { status: res.status, durationMs: Date.now() - start },
      level: res.ok ? "info" : "warning",
    });
    return res;
  } catch (err) {
    Sentry.addBreadcrumb({
      category: "http",
      message: `${init?.method ?? "GET"} ${url} failed`,
      data: { durationMs: Date.now() - start },
      level: "error",
    });
    throw err;
  }
}
```

**When to reach for this:**

* You need **native + JS** crash capture in production EAS binaries
* Stack traces must resolve to **TypeScript source**, not Hermes bytecode offsets
* Release Health should gate store submissions alongside [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) budgets
* You want breadcrumbs for navigation and API without building a custom ring buffer

---

## Working Example

Full bootstrap with session context, auth-aware user scope, and error boundary integration.

```tsx
// src/observability/sentry.ts
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
 
export function initSentry() {
  const version = Application.nativeApplicationVersion ?? "0.0.0";
  const build = Application.nativeBuildVersion ?? "0";
 
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV,
    release: `${version}+${build}`,
    dist: Updates.updateId ?? build,
    enableAutoSessionTracking: true,
    enableNative: true,
    enableNativeCrashHandling: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.15,
    integrations: [
      Sentry.reactNativeTracingIntegration(),
    ],
  });
}
 
export function setSentryUser(userId: string | null) {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}
 
export function captureWithContext(error: unknown, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setContext("extra", context);
    Sentry.captureException(error);
  });
}
```

```tsx
// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { initSentry, setSentryUser } from "@/observability/sentry";
import { useSentryRouteBreadcrumb } from "@/observability/useSentryRouteBreadcrumb";
import { useAuth } from "@/features/auth/useAuth";
 
initSentry();
 
function RootLayout() {
  const { userId } = useAuth();
  useSentryRouteBreadcrumb();
 
  useEffect(() => {
    setSentryUser(userId);
  }, [userId]);
 
  return (
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <Stack />
    </Sentry.ErrorBoundary>
  );
}
 
function CrashFallback() {
  return null; // your recovery UI
}
 
export default Sentry.wrap(RootLayout);
```

```ts
// Pair with auth logout - clear user scope
// setSentryUser(null) on logout - see ../auth-session/mobile-auth-basics/
```

---

## Source Maps on EAS

Hermes ships **bytecode** in release builds. Without uploaded maps, Sentry shows `index.android.bundle:1:234567`.

| Artifact | When | Purpose |
| --- | --- | --- |
| Hermes `.map` | Every EAS production build | JS stack → `.tsx` lines |
| iOS dSYM | Native iOS build | Native frame → Swift/ObjC |
| ProGuard mapping | Android release | Obfuscated Java → symbols |

```bash
# Verify release exists in Sentry before shipping OTA
sentry-cli releases list | grep "1.4.2+42"
```

* **`release`** in `Sentry.init` must **exactly match** the CLI upload release string
* **`dist`** differentiates OTA bundles sharing the same native `release` - use `Updates.updateId`
* Re-upload maps after **OTA-only** JS changes if your pipeline treats OTA as a new dist
* Failed map upload is a **release blocker** - treat like missing tests

> **Related:** [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - when JS changes ship without store review

---

## Release Health

Sentry **Release Health** tracks sessions and crash-free rates per `release` + `environment`.

```ts
// Sessions start automatically with enableAutoSessionTracking: true
// End on crash, or background beyond sessionTrackingIntervalMillis (default 30s)
 
Sentry.init({
  // ...
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
});
```

* Compare **crash-free sessions** across `production` vs `preview` environments
* A bad OTA appears as a drop on the **same native release** with a new `dist`
* Align thresholds with [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/)
* Do not count **development** sessions in production SLO numerators - filter `environment`

---

## Breadcrumbs Best Practices

| Category | Source | Example |
| --- | --- | --- |
| `navigation` | Expo Router pathname | `/checkout/payment` |
| `http` | Wrapped `fetch` | `POST /v1/orders 201` |
| `auth` | Login/logout handlers | `refresh_token_rotated` |
| `ui` | Primary user actions | `tap_place_order` |
| `console` | `Sentry.captureConsoleIntegration` | dev warnings only |

```ts
Sentry.addBreadcrumb({
  category: "auth",
  message: "token_refresh_failed",
  level: "warning",
  data: { reason: "invalid_grant" }, // no raw tokens
});
```

* Cap automated console breadcrumbs in production - noisy logs hide signal
* Redact **Authorization** headers in HTTP breadcrumbs
* Mirror breadcrumb categories in [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/) for cross-vendor correlation

---

## Performance Transactions (Preview)

Sentry tracing integrates with navigation and fetch - expanded in [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/).

```ts
Sentry.startSpan({ name: "load_feed", op: "ui.load" }, async () => {
  await fetchFeed();
});
```

---

## FAQs

Does @sentry/react-native work in Expo Go?

* Partially - native crash capture requires a **development build** or store binary.
* Validate integrations on `eas build --profile development` before production.

Where should Sentry.init live with Expo Router?

* Top of `app/_layout.tsx` as a side effect, or a dedicated `instrumentation.ts` imported first.
* Must run before routed screens mount and before other global handlers overwrite ErrorUtils.

How do I avoid duplicate error reports?

* Use `Sentry.wrap` on the root component once.
* Do not call both `captureException` and rethrow from boundaries unless intentional.
* Chain `ErrorUtils` handlers - see [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/).

What goes in release vs dist?

* **release** = native app version users see in the store (`1.4.2+42`).
* **dist** = OTA update id or build number - distinguishes JS bundles under the same release.

## Related

* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - signal stack and taxonomy
* [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/) - navigation and API transactions
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - chaining ErrorUtils
* [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) - defer Sentry-heavy work after TTI
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - user scope on login/logout
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - when release health drops after OTA

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
