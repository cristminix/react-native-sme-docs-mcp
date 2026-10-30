# Feature Flags on Mobile

A cookbook for **LaunchDarkly** (or equivalent remote config) combined with **EAS Update channels** - controlled exposure patterns for enterprise mobile teams shipping Expo SDK 57 apps through store review and daily OTA trains.

Highlights / Feature Flags on Mobile

* Remote flags decouple binary live from feature visible - essential for store + OTA trains
* LaunchDarkly (or similar) provides kill switches, percentage rollouts, and cohort targeting
* EAS Update channels segment binaries - flags segment behavior within a bundle
* Cache flags locally so a dead config endpoint does not brick cold starts
* Default to safe (off) when flags are unknown - never assume a new screen is production-ready
* Pair flags with error boundaries - boundary reports; flag service decides exposure

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npm install @launchdarkly/react-native-client-sdk
```

```ts
// src/flags/launchDarkly.ts
import {
  ReactNativeLDClient,
  AutoEnvAttributes,
} from "@launchdarkly/react-native-client-sdk";
 
const client = new ReactNativeLDClient(
  process.env.EXPO_PUBLIC_LAUNCHDARKLY_MOBILE_KEY!,
  AutoEnvAttributes.Enabled,
);
 
export async function initFlags(user: { key: string; email?: string }) {
  await client.identify({ kind: "user", key: user.key, email: user.email });
  return client;
}
 
export function isEnabled(flag: string, defaultValue = false): boolean {
  return client.boolVariation(flag, defaultValue);
}
```

```tsx
// src/flags/FlagGate.tsx
import { type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useBoolVariation } from "@launchdarkly/react-native-client-sdk";
 
type Props = { flag: string; fallback?: ReactNode; children: ReactNode };
 
export function FlagGate({ flag, fallback, children }: Props) {
  const enabled = useBoolVariation(flag, false); // safe default: off
 
  if (enabled === undefined) {
    return <ActivityIndicator accessibilityLabel="Loading feature" />;
  }
 
  if (!enabled) {
    return (
      fallback ?? (
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text>This feature is temporarily unavailable.</Text>
        </View>
      )
    );
  }
 
  return <>{children}</>;
}
```

**When to reach for this:**

* Shipping a new screen behind a remote kill switch before full rollout.
* Coordinating store binary approval with JS that assumes a not-yet-live backend.
* Canary exposure - enable for internal builds or a percentage cohort before 100%.
* Instant hide during incidents - faster than OTA rollback for logic errors.

**When to avoid:**

* Permanent configuration that never changes - use `app.config.ts` or EAS environment variables.
* Secrets or API keys - flags are visible to clients; never store credentials in flag payloads.
* Replacing `runtimeVersion` discipline - flags cannot add native modules OTA cannot ship.

---

## Working Example

End-to-end **LaunchDarkly + EAS Update channels** for a checkout v3 rollout across store review, OTA, and staged flag ramp.

### Step 1 - Channel map for binaries

EAS Update **channels** segment which JS bundle a binary receives. LaunchDarkly **flags** segment behavior within that bundle.

```json
// eas.json
{
  "build": {
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

```markdown
| Layer | Tool | Purpose |
|-------|------|---------|
| Binary | eas build profile + channel | Which update stream the app listens to |
| Bundle | eas update --channel | Which JS version is on that stream |
| Behavior | LaunchDarkly flag | Whether checkout_v3 UI renders |
```

> **Related:** [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/)

---

### Step 2 - Initialize flags at boot with cache fallback

```ts
// src/flags/bootstrap.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { initFlags, isEnabled } from "./launchDarkly";
 
const CACHE_KEY = "flags:v1";
 
export async function bootstrapFlags(userKey: string) {
  const cached = await AsyncStorage.getItem(CACHE_KEY);
 
  try {
    await initFlags({ key: userKey });
    const snapshot = {
      checkout_v3: isEnabled("checkout_v3", false),
      api_v3: isEnabled("api_v3", false),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    // Config endpoint down - use cache so app still launches
    return cached ? JSON.parse(cached) : { checkout_v3: false, api_v3: false };
  }
}
```

```ts
// App.tsx - tag analytics with channel + updateId for incident correlation
import * as Updates from "expo-updates";
 
void Updates.updateId; // send to Sentry scope on init
```

* **Safe defaults** when LaunchDarkly is unreachable - new features stay off
* Tag events with `Updates.updateId` to correlate flag ramps with OTA publishes
* See [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) for crash-counter auto-disable

---

### Step 3 - Gate the risky screen

```tsx
// app/(tabs)/checkout.tsx
import { FlagGate } from "@/flags/FlagGate";
import { CheckoutV3Screen } from "@/features/checkout/CheckoutV3Screen";
import { LegacyCheckoutScreen } from "@/features/checkout/LegacyCheckoutScreen";
 
export default function CheckoutRoute() {
  return (
    <FlagGate flag="checkout_v3" fallback={<LegacyCheckoutScreen />}>
      <CheckoutV3Screen />
    </FlagGate>
  );
}
```

```tsx
// src/features/checkout/CheckoutV3Screen.tsx - also gate API version
import { useBoolVariation } from "@launchdarkly/react-native-client-sdk";
 
export function CheckoutV3Screen() {
  const useApiV3 = useBoolVariation("api_v3", false);
  const client = useApiV3 ? apiV3 : apiV2;
  // ...
}
```

* **Two flags** - `checkout_v3` (UI) and `api_v3` (backend) - ramp independently
* Backend deploys with `api_v3` at 0%; mobile OTA ships UI hidden; backend ramps first

---

### Step 4 - Target internal cohort via LaunchDarkly

```text
LaunchDarkly targeting rules (console):
1. Segment "employees" → checkout_v3: true (email ends with @company.com)
2. Segment "preview_builds" → checkout_v3: true (custom: channel == preview)
3. Default rule → checkout_v3: false
```

```ts
// Pass custom attributes at identify time
await client.identify({
  kind: "user",
  key: user.id,
  email: user.email,
  custom: {
    channel: Updates.channel ?? "unknown",
    runtimeVersion: Updates.runtimeVersion ?? "unknown",
    appVersion: Application.nativeApplicationVersion,
  },
});
```

* **Employees** see v3 on production binary before public ramp
* **`channel == preview`** lets QA test on preview builds without affecting production users
* Percentage rollouts in LaunchDarkly complement EAS `--rollout-percentage` - use both deliberately

---

### Step 5 - Coordinate OTA publish with flag state

```bash
# Ship JS to preview channel first - flags off for external users
eas update --channel preview --environment preview \
  --message "feat: checkout v3 UI (flag off)"
 
# After preview soak - publish to production channel; flag still off
eas update --channel production --environment production \
  --message "promote: checkout v3 bundle (flag off)"
 
# Ramp flag in LaunchDarkly: 1% → 10% → 50% → 100%
# Monitor crash-free and payment success at each step
```

| Phase | EAS channel | LaunchDarkly checkout\_v3 | Audience |
| --- | --- | --- | --- |
| Preview soak | preview | true (employees only) | QA + staff |
| Production bundle | production | false | Everyone gets JS; UI hidden |
| Canary | production | 10% | Cohort sees v3 |
| GA | production | 100% | Full rollout |

* **OTA first, flag second** - bundle is ready before users see the feature
* **Flag off first on incident** - hide UI in seconds; OTA rollback if bundle is defective
* [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) for EAS percentage gates

---

### Step 6 - Kill switch runbook

```text
Incident: checkout_v3 payment failures spike
 
T+0  LaunchDarkly: checkout_v3 → false (global off)
T+2  Verify payment success rate recovers
T+5  If bundle defect: eas update:rollback on production channel
T+60 Monitor crash-free for one hour
```

```bash
# Parallel: confirm which bundle is live
eas channel:view production
eas update:list --branch production --limit 3
```

* **Flag off** fixes logic errors in the current bundle without waiting for OTA
* **OTA rollback** fixes bundle-level defects (bad import, broken asset)
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - timed steps

---

## EAS Channels vs LaunchDarkly - When to Use Which

| Need | Use EAS Update channel | Use LaunchDarkly flag |
| --- | --- | --- |
| Different JS for QA vs prod binaries | ✅ `preview` vs `production` | ❌ |
| Hide feature on same bundle | ❌ | ✅ `checkout_v3: false` |
| Percentage of users on new UI | Partial (`--rollout-percentage`) | ✅ finer cohort rules |
| Instant kill switch | Slow (rollback minutes) | ✅ seconds |
| A/B test copy on same bundle | ❌ | ✅ multivariate flags |
| Ship JS during App Review | ✅ channel + flag off | ✅ flag off |

---

## Alternative: Expo EAS Environment + Simple Remote Config

Teams without LaunchDarkly can use a lightweight flags endpoint:

```ts
// src/flags/remoteConfig.ts
const FLAGS_URL = process.env.EXPO_PUBLIC_FLAGS_URL!;
 
export async function fetchFlags(): Promise<Record<string, boolean>> {
  const res = await fetch(FLAGS_URL, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error("flags unavailable");
  return res.json();
}
```

* Suitable for **< 10 flags** and internal tools - not percentage rollouts at scale
* Migrate to LaunchDarkly when you need segments, experiments, and audit trails
* Store flag service URL in EAS environment - [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/)

---

## FAQs

Should flags live in OTA bundles or only remote?

Remote only. Hard-coding `const CHECKOUT_V3 = true` in JS requires OTA to flip - defeating the kill-switch purpose. Default off in code; remote service enables.

Do flags work offline?

Yes, with AsyncStorage cache from the last successful fetch. New installs with no cache use safe defaults (off). Document offline behavior for field-sales apps.

Can we flag native code paths?

Flags can gate **whether** native modules are invoked - not add modules absent from the binary. Missing native module still crashes if flag flips on without Clock A build.

## Related

* [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - kill switches and crash counters
* [Mobile Delivery Basics](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/mobile-delivery-basics/) - store + OTA coordination
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - channel promotion
* [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) - EAS percentage rollouts
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - flag ramp on calendar
* [Canary OTA & Blue-Green](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/canary-ota-and-blue-green/) - progressive exposure patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
