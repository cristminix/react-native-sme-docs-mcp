# sentry-expo / @sentry/react-native

Crash reporting setup on EAS builds. `@sentry/react-native` captures JS and native crashes on store binaries. The legacy `sentry-expo` package is **deprecated** - use `@sentry/react-native` with the Sentry wizard on SDK 57. For source maps, release health, breadcrumbs, and performance transactions, see [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/).

Highlights / sentry-expo / @sentry/react-native

* Initialize Sentry before other app imports in \_layout or index.js
* Upload source maps on every EAS production build - Hermes stacks need symbolication
* Set release to native version+build and dist to OTA update id when applicable
* Sentry.wrap on root component - one wrap, not duplicate captureException
* Wizard configures Metro plugin and EAS build hooks for SDK 57
* Full observability patterns in sentry-for-react-native deep guide

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @sentry/react-native
npx @sentry/wizard@latest -i reactNative
```

The wizard adds Metro plugin config, native hooks, and EAS build steps. Manual pin for SDK 57:

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

**1. Initialize at the earliest entry point**

```tsx
// app/_layout.tsx - must run before other imports' side effects
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
# Wizard hooks upload Hermes source maps after EAS Build
eas build --platform all --profile production
```

Store `SENTRY_AUTH_TOKEN` in EAS secrets - never commit to git.

**3. Environment variables**

```bash
# .env.local (not committed)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@o000.ingest.sentry.io/000
EXPO_PUBLIC_APP_ENV=development
```

```json
// eas.json - per-profile environments
{
  "build": {
    "preview": {
      "env": { "EXPO_PUBLIC_APP_ENV": "preview" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_APP_ENV": "production" }
    }
  }
}
```

**When to reach for this:**

* Any app shipping to TestFlight or Play Store - console logs are not crash telemetry.
* You need **symbolicated Hermes stacks** from production users.
* Release health SLOs - crash-free session rate tracked per `release` + `dist`.
* Pairing with [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) and error boundaries.

## Working Example

```tsx
// app/_layout.tsx - full bootstrap with route breadcrumbs
import * as Sentry from "@sentry/react-native";
import { Stack, usePathname } from "expo-router";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { useEffect } from "react";
 
const release = `${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`;
const dist = Updates.updateId ?? Application.nativeBuildVersion ?? "0";
 
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  release,
  dist,
  enableAutoSessionTracking: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
});
 
function useSentryRouteBreadcrumb() {
  const pathname = usePathname();
  useEffect(() => {
    Sentry.addBreadcrumb({ category: "navigation", message: pathname, level: "info" });
    Sentry.setTag("route", pathname);
  }, [pathname]);
}
 
function RootLayout() {
  useSentryRouteBreadcrumb();
  return <Stack />;
}
 
export default Sentry.wrap(RootLayout);
```

```tsx
// components/ErrorFallback.tsx - boundary reports to Sentry
import * as Sentry from "@sentry/react-native";
import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
 
type Props = { children: ReactNode };
type State = { hasError: boolean };
 
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
 
  static getDerivedStateFromError() {
    return { hasError: true };
  }
 
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }
 
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Something went wrong.</Text>
          <Pressable onPress={() => this.setState({ hasError: false })}>
            <Text>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
```

```ts
// lib/sentryFetch.ts - HTTP breadcrumbs without raw tokens
import * as Sentry from "@sentry/react-native";
 
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
      level: "error",
    });
    throw err;
  }
}
```

**What this demonstrates:**

* **`Sentry.init` first** - before routed screens mount.
* **`release` + `dist`** - distinguishes native builds from OTA bundles.
* **`Sentry.wrap`** - root component wrapped once for unhandled errors.
* **Navigation breadcrumbs** - pathname in crash reports.
* **`componentDidCatch`** - React boundary errors reach Sentry without double-reporting if you do not rethrow.

## Deep Dive

### EAS + Sentry Pipeline

```text
eas build (production)
  → Metro bundles with Sentry plugin
  → Native compile (iOS dSYM, Android symbols)
  → Post-build: upload source maps (wizard hook)
  → Store binary + symbolicated JS stacks in Sentry
```

### User Scope on Login

```ts
import * as Sentry from "@sentry/react-native";
 
export function setSentryUser(userId: string) {
  Sentry.setUser({ id: userId }); // never set email or PII without redaction
}
 
export function clearSentryUser() {
  Sentry.setUser(null);
}
```

Call on login/logout alongside `queryClient.clear()` and MMKV wipe.

### What Not to Send

* Raw JWTs, refresh tokens, or `Authorization` headers
* Email, phone, or free-text PII in breadcrumbs
* Full request/response bodies with user data

Use `beforeSend` to strip fields - see full guide for PII policy.

## Gotchas

* **Initializing Sentry late** - Misses early boot crashes. **Fix:** Top of `_layout.tsx` before other side effects.
* **Skipping source map upload** - Hermes stacks show bytecode offsets. **Fix:** Wizard EAS hook + `SENTRY_AUTH_TOKEN` secret.
* **Duplicate error reports** - `captureException` + rethrow from boundary. **Fix:** Capture once in `componentDidCatch`; do not rethrow to global handler.
* **Testing only in Expo Go** - Native crash capture incomplete. **Fix:** Validate on `eas build --profile development`.
* **DSN in private repo** - DSN is public by design but rotate if leaked; use EAS env per profile.
* **Two crash reporters** - Duplicate events and SDK bloat. **Fix:** One vendor - Sentry or enterprise alternative.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| @sentry/react-native | Default Expo crash + perf | You already standardized on another APM |
| Firebase Crashlytics | Google-centric org mandate | Need JS Hermes symbolication depth |
| Bugsnag / Datadog | Enterprise existing contracts | Greenfield with no vendor |
| console.log | Local dev only | Production store builds |

## FAQs

Is sentry-expo still used?

No - `sentry-expo` is deprecated. Use `@sentry/react-native` with `npx @sentry/wizard@latest -i reactNative` on SDK 57.

Where is the full Sentry guide?

[Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - release health, performance spans, and breadcrumb taxonomy.

Does Sentry work in Expo Go?

Partially - native crash capture requires a development build or store binary. Validate integrations on EAS development profile.

What goes in release vs dist?

**release** = native app version (`1.4.2+42`). **dist** = OTA update id or build number - distinguishes JS bundles under the same release.

Do I need a new EAS build after adding Sentry?

Yes - native crash capture requires native hooks. Run wizard, then `eas build`.

## Related

* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - full observability cookbook
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - chaining ErrorUtils
* [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - boundary + Sentry wiring
* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - signal stack taxonomy
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - production build profiles
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - one crash reporter policy

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
