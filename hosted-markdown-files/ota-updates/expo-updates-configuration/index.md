# expo-updates Configuration

Runtime version, update URL, and check-on-launch policies - the `app.config` cookbook for wiring **EAS Update** into Expo SDK 57 apps so binaries and OTA bundles stay compatible.

Highlights / expo-updates Configuration

* runtimeVersion policy in app.config must match what eas build and eas update resolve
* updates.url points at your EAS project - verify with npx expo config --type public
* checkAutomatically and fallbackToCacheTimeout trade freshness for offline startup
* Channel headers in requestHeaders must align with eas.json build profile channel
* Run eas update:configure once after eas init - rebuild native after first-time setup
* SDK 55+ requires eas update --environment - local .env is ignored on update runners

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-updates
npx eas init
npx eas update:configure
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  version: "2.4.0",
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
  },
  updates: {
    url: "https://u.expo.dev/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    requestHeaders: {
      "expo-channel-name": "production",
    },
  },
};
 
export default config;
```

```bash
# Verify resolved public config
npx expo config --type public | jq '{runtimeVersion, updates}'
 
# Publish with EAS environment (SDK 55+)
eas update --channel production --environment production --message "Config verified"
```

**When to reach for this:**

* First-time EAS Update setup after `eas init`.
* Auditing why devices skip updates (`runtimeVersion` or channel mismatch).
* Tuning startup behavior - silent background check vs blocking fetch.
* White-label flavors that need per-variant `requestHeaders` and `projectId`.

**When to avoid:**

* Changing native permissions or plugins - config edit still needs `eas build`.
* Pointing production apps at `development` channel headers - use build profiles instead.
* Expecting `expo start` to apply OTA - updates are disabled in dev.

## Working Example

A production-ready `app.config.ts` with **profile-driven channel headers**, explicit runtime policy, and startup check policy.

**Step 1 - `eas.json` channels per build profile**

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

**Step 2 - Dynamic `app.config.ts`**

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const EAS_PROJECT_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
 
const channel =
  process.env.EAS_BUILD_PROFILE === "preview"
    ? "preview"
    : process.env.EAS_BUILD_PROFILE === "development"
      ? "development"
      : "production";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  version: "2.4.0",
  runtimeVersion: { policy: "appVersion" },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    requestHeaders: { "expo-channel-name": channel },
  },
  ios: { bundleIdentifier: "com.example.shopapp" },
  android: { package: "com.example.shopapp" },
};
 
export default config;
```

**Step 3 - First native build after configure**

```bash
eas build --profile preview --platform all
eas update --channel preview --environment preview --message "Smoke test channel wiring"
```

**What this demonstrates:**

* `runtimeVersion.policy: "appVersion"` ties OTA targeting to `expo.version`
* `updates.url` uses the EAS project UUID from `extra.eas.projectId`
* `requestHeaders["expo-channel-name"]` must match the profile's `channel` in `eas.json`
* `checkAutomatically: "ON_LOAD"` checks on every cold start; `fallbackToCacheTimeout: 0` never blocks launch on network

## Deep Dive

### runtimeVersion Options

| Policy | Resolves to | Best for |
| --- | --- | --- |
| `appVersion` | `expo.version` string | Most consumer apps; simple mental model |
| `nativeVersion` | Platform build numbers | Teams that bump build number per native change |
| `fingerprint` | Hash of native project state | Monorepos with frequent native drift |
| `"1.0.0"` (static string) | Literal value | Brownfield with fixed native runtime |

```ts
// Explicit static runtime (advanced / brownfield)
runtimeVersion: "shop-native-2026-q1",
```

* Pick **one policy per app** - document it in README and release tickets
* Changing policy mid-flight strands devices - coordinate with a store release
* See [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) for selection guidance

### checkAutomatically Values

| Value | Behavior |
| --- | --- |
| `ON_LOAD` | Check every cold start (default recommendation) |
| `ON_ERROR_RECOVERY` | Check only after crash recovery |
| `WIFI_ONLY` | Check on launch when on Wi-Fi |
| `NEVER` | No automatic check - you call `checkForUpdateAsync` manually |

```ts
updates: {
  checkAutomatically: "ON_LOAD",
  fallbackToCacheTimeout: 0, // 0 = never block launch waiting for network
},
```

* `fallbackToCacheTimeout: 3000` blocks launch up to 3s for a fresh bundle - use sparingly
* Pair automatic checks with user-consent reload for disruptive updates - see [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/)

### Channel Header Wiring

```text
eas.json build.profile.channel  →  embedded in binary at eas build
app.config updates.requestHeaders  →  sent on every update check
eas update --channel <name>     →  publishes bundle to that channel
```

* All three must agree - channel mismatch is the #1 "fix never arrived" incident
* `eas update:configure` scaffolds `updates.url` and `projectId` - it does not replace profile discipline
* White-label: separate `projectId`, channel, and bundle ID per app variant

### Environment Variables on Update Runners

```bash
# SDK 55+ - local .env is NOT used on EAS update runners
eas update --channel production --environment production
```

* Create matching EAS environments for `preview` and `production`
* Align `EXPO_PUBLIC_*` vars between `eas build` and `eas update` for the same channel
* Mismatched API URLs in OTA vs binary cause auth outages - treat env parity as a release gate

## Gotchas

* **Missing `updates.url`** - `Updates.isEnabled` is false. **Fix:** `eas update:configure` + rebuild.
* **runtimeVersion drift** - Build used `2.4.0`, update published under `2.5.0` after version bump without rebuild. **Fix:** Rebuild binaries or publish to matching runtime.
* **Hard-coded `production` header in dev profile** - Preview QA receives production OTAs. **Fix:** Drive header from `EAS_BUILD_PROFILE`.
* **First configure without rebuild** - Old binary lacks `expo-updates` native wiring. **Fix:** New `eas build` after adding updates config.
* **Blocking `fallbackToCacheTimeout` on slow networks** - Users stare at splash. **Fix:** Keep `0` unless you have a strong offline-update UX.
* **Publishing without `--environment`** - Stale or wrong API hosts baked into OTA bundle. **Fix:** Always pass `--environment` on SDK 55+.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `checkAutomatically: "ON_LOAD"` | Default freshness | You need fully manual control |
| `checkAutomatically: "NEVER"` + client API | Custom banner UX | Team forgets to implement checks |
| Static `runtimeVersion` string | Pinned brownfield host | Marketing version should drive targeting |
| `fingerprint` policy | Native changes without version bumps | Team lacks CI fingerprint validation |

## FAQs

Do I need to rebuild after changing checkAutomatically?

Yes - `checkAutomatically` and `fallbackToCacheTimeout` are embedded in the native manifest at build time. Changing them requires a new `eas build`.

Where does updates.url come from?

`eas update:configure` writes `https://u.expo.dev/<projectId>` using your `extra.eas.projectId`. Verify with `npx expo config --type public`.

Can I use app.config.js instead of .ts?

Yes. The same `updates` and `runtimeVersion` keys apply. Dynamic channel selection via `process.env.EAS_BUILD_PROFILE` is the common pattern.

How do I test configuration without production risk?

Build `preview` profile → publish `eas update --channel preview` → install internal build → confirm `Updates.channel` and `Updates.runtimeVersion` in logs.

Does expo-updates work in development builds?

Development clients can point at `development` channel, but `__DEV__` and dev tooling differ from production. Sign-off OTA behavior on `preview`/`production` profiles only.

## Related

* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs store boundaries
* [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) - policy comparison
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - channel promotion
* [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - programmatic check and reload
* [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - `eas.json` channel mapping
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - Tier 1 config checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
