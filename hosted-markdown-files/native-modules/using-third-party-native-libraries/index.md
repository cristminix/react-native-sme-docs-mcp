# Using Third-Party Native Libraries

A cookbook for evaluating, installing, and verifying **community native libraries** in an Expo SDK 57 CNG app - with explicit checks for **prebuild survivability** and **New Architecture** compatibility on React Native 0.86.

Highlights / Using Third-Party Native Libraries

* Run the compatibility checklist before npm install - rebuild cost is measured in days
* npx expo install pins SDK 57–compatible versions; manual npm ranges cause runtime crashes
* New Architecture support is mandatory on RN 0.86 - verify Fabric and TurboModule claims in issues
* Config plugins must encode permissions and Gradle/Pod changes - never post-prebuild hand edits
* Expo Go cannot load arbitrary native binaries - third-party libs require expo-dev-client

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# 1. Evaluate BEFORE install (see checklist below)
# 2. Install with Expo's resolver - not bare npm
npx expo install react-native-maps
 
# 3. Register config plugin in app.config.ts (if the library ships one)
# 4. Regenerate native projects and verify
npx expo prebuild --clean
npx expo-doctor
 
# 5. Build a development client - third-party native code is NOT in Expo Go
npx expo install expo-dev-client
npx expo run:ios
# or: eas build --profile development --platform all
```

```ts
// app.config.ts - typical third-party plugin registration
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    [
      "react-native-maps",
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    ],
  ],
});
```

**When to reach for this:**

* Adopting `react-native-maps`, `react-native-ble-plx`, `react-native-purchases`, or any npm package with `ios/` / `android/` folders.
* Auditing whether a library survives `npx expo prebuild --clean` in a CNG workflow.
* Confirming **RN 0.86 New Architecture** support before merging a dependency PR.
* Replacing a deprecated native wrapper with an Expo SDK equivalent.

## Working Example

### Compatibility checklist (run before merge)

| Check | Pass criteria | Fail action |
| --- | --- | --- |
| Expo SDK 57 / RN 0.86 | README or issues mention 0.86+ | Open issue or fork; do not ship |
| New Architecture | `newArchEnabled` issue closed or docs claim TurboModule/Fabric | Test on device; reject if redbox on launch |
| Config plugin | Ships `app.plugin.js` or documents `expo` config plugin | Plan a custom plugin - see [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) |
| `npx expo install` | Package listed in Expo ecosystem or install succeeds | Pin version manually with ADR |
| Expo Go | N/A - assume **not** in Expo Go | Add `expo-dev-client` to project |
| Maintenance | Commit within last 12 months | Prefer Expo SDK alternative |

```bash
#!/usr/bin/env bash
# scripts/verify-native-dep.sh - run after adding a native library
set -euo pipefail
 
PKG="${1:?Usage: ./verify-native-dep.sh <package-name>}"
 
echo "▶ Installing $PKG via expo install..."
npx expo install "$PKG"
 
echo "▶ Running expo-doctor..."
npx expo-doctor
 
echo "▶ Resolving autolinking (iOS)..."
npx expo-modules-autolinking resolve --platform ios | grep -i "${PKG##*/}" || true
 
echo "▶ Clean prebuild dry run..."
npx expo prebuild --clean --no-install
 
echo "✅ $PKG passed local verification - still build on device"
```

### End-to-end: add `react-native-maps`

```bash
npx create-expo-app@latest MapsCookbook --template blank-typescript@sdk-57 --yes
cd MapsCookbook
npx expo install expo-dev-client react-native-maps
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const defineConfig = ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: "MapsCookbook",
  slug: "maps-cookbook",
  plugins: [
    [
      "react-native-maps",
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY ?? "",
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? "",
      },
    ],
  ],
});
 
export default defineConfig;
```

```tsx
// App.tsx
import MapView, { Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{ latitude: 37.78825, longitude: -122.4324 }}
          title="San Francisco"
        />
      </MapView>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
```

```bash
# Regenerate native dirs and run on simulator
npx expo prebuild
npx expo run:ios
 
# Start Metro for the dev client (not Expo Go)
npx expo start --dev-client
```

**What this demonstrates:**

* **`npx expo install`** resolves a version compatible with SDK 57 native binaries.
* **Config plugin** injects API keys into `Info.plist` and `AndroidManifest.xml` during prebuild.
* **`expo prebuild`** wires autolinking - no manual `Podfile` edits in CNG apps.
* **Development build** is mandatory - `react-native-maps` is not bundled in Expo Go.

## Deep Dive

### New Architecture compatibility on RN 0.86

React Native 0.86 defaults to **New Architecture** (Fabric + TurboModules). Third-party libraries fall into three buckets:

| Bucket | Symptom | Mitigation |
| --- | --- | --- |
| Fully compatible | Builds and runs on device | Ship |
| Partial (bridge fallback) | Builds but sync JSI APIs fail | Test every API you call; open upstream issue |
| Incompatible | Compile error or instant crash | Do not adopt; find alternative or fork |

```bash
# Confirm New Architecture in generated project
grep -r "newArchEnabled" android/ ios/ 2>/dev/null || true
 
# Force-verify with a release build on device (not just debug Metro)
npx expo run:ios --configuration Release
```

Libraries using **old NativeModules bridge only** may still run via interoperability layer, but performance-sensitive paths (maps, video, BLE) should be validated on **physical hardware** - simulators hide threading bugs.

### Prebuild + CNG workflow

In Continuous Native Generation apps, `ios/` and `android/` are **outputs** of config, not source of truth:

```
package.json + app.config.ts + plugins
              │
              ▼
        npx expo prebuild
              │
              ▼
    ios/ android/ (generated)
              │
              ▼
    npx expo run:ios / eas build
```

Never document "add this line to `AndroidManifest.xml`" as a permanent step - encode it in a **config plugin** so regeneration stays clean. See [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) and [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/).

### When to prefer Expo SDK over third-party

| Need | Prefer Expo SDK | Third-party when |
| --- | --- | --- |
| Camera | `expo-camera` | Vendor SDK requires proprietary binary |
| Location | `expo-location` | Background BLE geofencing with hardware SDK |
| Maps | `expo-maps` (if fits) | Google Maps SDK features not exposed |
| Payments | `expo-in-app-purchases` / Stripe RN | Store-specific native SDK mandate |

Follow [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) Tier 1 before every third-party install.

### Autolinking verification

```bash
# List modules that will compile into the binary
npx expo-modules-autolinking resolve --platform ios
npx expo-modules-autolinking resolve --platform android
 
# React Native community autolinking (non-Expo packages)
npx react-native config
```

If a package appears in `package.json` but not in resolve output, the native build **never compiled it** - `requireNativeModule` will throw at runtime.

## Gotchas

* **Testing in Expo Go after `npm install`** - third-party native code is absent from the Go binary. **Fix:** `npx expo start --dev-client` with a custom build.
* **Skipping `prebuild` after plugin config change** - stale `Info.plist` entries. **Fix:** `npx expo prebuild --clean` locally before merge.
* **Assuming green CI TypeScript means native works** - Jest does not execute native code. **Fix:** Device QA or Maestro flow on development build.
* **Pinning `@latest` on native packages** - breaks SDK 57 ABI alignment. **Fix:** `npx expo install` or explicit version with ADR.
* **Mixing multiple map/BLE/payment SDKs in one PR** - bisect nightmare when prebuild fails. **Fix:** One native dependency per PR per Native Module Rules.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo SDK module | Feature exists in SDK 57 | Proprietary vendor mandates custom SDK |
| Config plugin + third-party | Community lib has plugin and RN 0.86 support | Unmaintained, no New Arch path |
| Local Expo module | Thin bridge to vendor SDK | Full SDK surface - still need native code |
| WebView + hosted UI | Vendor offers web-only integration | Offline, performance, or store policy blocks WebView |

## FAQs

Can I use any react-native-\* package with Expo?

Only if it supports prebuild/autolinking, has a config plugin (or you write one), and compiles on RN 0.86 New Architecture. `npx expo-doctor` catches common failures early.

Do I commit ios/ and android/ after adding a library?

Team policy varies. CNG teams often gitignore native dirs and regenerate in CI. If you commit them, still express changes via plugins - not manual drift. See [CNG best practices](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/).

How do I test New Architecture compatibility quickly?

`npx expo run:ios --configuration Release` on a physical device with the library's primary user flow. Debug Metro can mask native threading issues.

Library has no config plugin - what now?

Write a local plugin in `plugins/` or choose a maintained fork. Post-prebuild manual edits are technical debt in CNG apps.

expo install vs npm install?

`npx expo install` reads Expo's compatibility table for SDK 57. `npm install` may resolve JS that does not match native binaries in your build.

## Related

* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when JS is not enough
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - encode native manifest changes
* [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - monorepo resolution
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - tiered checklist
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - CNG workflow
* [Expo Prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - CI regeneration
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - dev client requirement

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiODg3fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
