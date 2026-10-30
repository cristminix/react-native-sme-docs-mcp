# Analytics & Privacy

**Segment** and **Amplitude** with **consent gates** and **ATT alignment** on Expo SDK 57. Product analytics belongs in the observability program, but it follows privacy rules crash reporters do not.

Highlights / Analytics & Privacy

* Analytics is not crash reporting - separate consent, retention, and vendor contracts
* Gate all product analytics behind explicit consent resolved before first track call
* iOS ATT applies to tracking that links user data across apps - align SDK config with legal review
* Segment is a router - one identify() fans out to Amplitude, Braze, etc. with transformations
* Reset analytics identity on logout - same discipline as auth token clearing
* Use coarse event schemas - stable names, typed properties, no PII in property keys

## Prerequisites

```bash
npm install @segment/analytics-react-native @segment/sovran-react-native
# or Amplitude directly:
npm install @amplitude/analytics-react-native
npx expo install expo-tracking-transparency
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Recipe

> Quick-reference recipe card - copy-paste ready.

**1. Consent state**

```ts
// src/privacy/consent.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
 
export type ConsentState = {
  analytics: boolean;
  crashReporting: boolean; // often separate - may default on for stability
  marketing: boolean;
  decidedAt: string | null;
};
 
const KEY = "consent_v1";
 
const defaultState: ConsentState = {
  analytics: false,
  crashReporting: true,
  marketing: false,
  decidedAt: null,
};
 
export async function getConsent(): Promise<ConsentState> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : defaultState;
}
 
export async function setConsent(patch: Partial<ConsentState>) {
  const next = { ...(await getConsent()), ...patch, decidedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
```

**2. ATT prompt (iOS)**

```ts
// src/privacy/att.ts
import { Platform } from "react-native";
import * as TrackingTransparency from "expo-tracking-transparency";
 
export async function requestAttIfNeeded() {
  if (Platform.OS !== "ios") return "unavailable";
 
  const { status: existing } = await TrackingTransparency.getTrackingPermissionsAsync();
  if (existing === "granted" || existing === "denied") return existing;
 
  const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
  return status;
}
```

**3. Gated analytics facade**

```ts
// src/analytics/index.ts
import { getConsent } from "@/privacy/consent";
 
type Props = Record<string, string | number | boolean | null>;
 
let segmentClient: { track: (e: string, p?: Props) => void; identify: (id: string, t?: Props) => void; reset: () => void } | null = null;
 
export async function initAnalytics() {
  const consent = await getConsent();
  if (!consent.analytics) return;
 
  const { createClient } = await import("@segment/analytics-react-native");
  segmentClient = createClient({
    writeKey: process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY!,
    trackAppLifecycleEvents: true,
  });
}
 
export async function track(event: string, properties?: Props) {
  const consent = await getConsent();
  if (!consent.analytics || !segmentClient) return;
  segmentClient.track(event, sanitize(properties));
}
 
export async function identify(userId: string, traits?: Props) {
  const consent = await getConsent();
  if (!consent.analytics || !segmentClient) return;
  segmentClient.identify(userId, sanitize(traits));
}
 
export async function resetAnalytics() {
  segmentClient?.reset();
}
 
function sanitize(props?: Props): Props | undefined {
  if (!props) return props;
  const blocked = ["email", "phone", "name", "address"];
  return Object.fromEntries(
    Object.entries(props).filter(([k]) => !blocked.includes(k.toLowerCase()))
  );
}
```

**4. Consent UI gate in root layout**

```tsx
// src/privacy/ConsentGate.tsx
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { getConsent, setConsent } from "./consent";
import { requestAttIfNeeded } from "./att";
import { initAnalytics } from "@/analytics";
 
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
 
  useEffect(() => {
    (async () => {
      const consent = await getConsent();
      setShowBanner(!consent.decidedAt);
      if (consent.analytics) await initAnalytics();
      setReady(true);
    })();
  }, []);
 
  if (!ready) return null;
 
  if (showBanner) {
    return (
      <View style={{ padding: 24, gap: 12 }}>
        <Text>We use analytics to improve the app. You can change this in Settings.</Text>
        <Button
          title="Accept analytics"
          onPress={async () => {
            await requestAttIfNeeded();
            await setConsent({ analytics: true });
            await initAnalytics();
            setShowBanner(false);
          }}
        />
        <Button
          title="Decline"
          onPress={async () => {
            await setConsent({ analytics: false });
            setShowBanner(false);
          }}
        />
      </View>
    );
  }
 
  return <>{children}</>;
}
```

**When to reach for this:**

* Legal requires **opt-in** analytics in EU/UK and transparent ATT flows on iOS
* You route events to multiple destinations via **Segment** transformations
* **Amplitude** is your product source of truth - funnels, retention, experiments
* You must **reset identity on logout** alongside [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)

---

## Working Example

Segment → Amplitude with environment-specific sources and logout reset.

```ts
// app.config.ts - declare NSUserTrackingUsageDescription for iOS
export default {
  expo: {
    ios: {
      infoPlist: {
        NSUserTrackingUsageDescription:
          "This identifier helps us measure app performance and improve features.",
      },
    },
  },
};
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { ConsentGate } from "@/privacy/ConsentGate";
 
export default function RootLayout() {
  return (
    <ConsentGate>
      <Stack />
    </ConsentGate>
  );
}
```

```ts
// src/features/auth/logout.ts
import { resetAnalytics } from "@/analytics";
import * as SecureStore from "expo-secure-store";
 
export async function logout() {
  await SecureStore.deleteItemAsync("refresh_token");
  await resetAnalytics();
  // clear React state, invalidate queries...
}
```

```ts
// Stable event schema - version properties carefully
await track("checkout_completed", {
  order_id: order.id,
  item_count: order.items.length,
  currency: "USD",
  value_cents: order.totalCents,
});
```

---

## Segment vs Amplitude

| Approach | Pros | Cons |
| --- | --- | --- |
| **Segment router** | One SDK, many destinations, server-side filtering | Extra cost, another vendor |
| **Amplitude direct** | Rich product analytics UI, experimentation | Each new tool needs another SDK |
| **Both** | Segment → Amplitude common in enterprise | Two configs to keep in sync |

```ts
// Amplitude direct (when Segment is not required)
import { init, track, identify, reset } from "@amplitude/analytics-react-native";
 
export async function initAmplitude() {
  await init(process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY!, undefined, {
    trackingOptions: { ipAddress: false },
  });
}
```

* Disable **IP collection** on mobile when policy requires
* Use **Amplitude** groups for B2B `account_id` - not for PII
* Mirror `release` and `otaUpdateId` as super-properties for release correlation - [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/)

---

## ATT Alignment Checklist

1. **Info.plist** string explains *why* you request tracking - vague copy fails review
2. Request ATT **after** consent banner when analytics requires IDFA-linked data
3. If user denies ATT, **still allow** first-party analytics without cross-app tracking where legal permits
4. Document decision in privacy policy - link from Settings
5. Crash reporting (Sentry) is typically **not** ATT-gated - separate from marketing analytics

> **Related:** [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - do not conflate `track()` with `captureException()`

---

## Event Design Rules

* **Past tense verbs**: `checkout_completed`, not `completeCheckout`
* **Stable names** - renaming breaks year-over-year charts; version with `schema_version` property if needed
* **No PII** in keys or values - use opaque `user_id` from auth, never email
* **One event per user action** - avoid duplicate `screen_view` from both router and screen `useEffect`
* Coarse **performance** events (`cold_start_ms`) belong here or in [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/) - pick one owner

---

## FAQs

Can I fire analytics before consent?

* Only strictly necessary **technical** events (if legal approves) - not funnels or ads measurement.
* Default **off** until `decidedAt` is set.

Does GDPR require opt-in for all analytics?

* Jurisdiction and interpretation vary - this doc shows opt-in patterns common in EU-facing apps.
* Involve legal/compliance; engineering implements the gate, not the law.

Should crash reporting respect analytics consent?

* Often **no** - stability telemetry may run under legitimate interest with separate disclosure.
* Document two toggles in Settings: "Share crash reports" vs "Share usage analytics".

How do I test ATT in Simulator?

* Settings → Privacy → Tracking - reset and re-test.
* Physical device behavior is authoritative for release sign-off.

## Related

* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - signal stack separation
* [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/) - operational logs vs product events
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - identity lifecycle
* [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/) - no analytics in OAuth redirect URLs
* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - cold start metrics ownership
* [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/) - crash-free vs funnel metrics

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
