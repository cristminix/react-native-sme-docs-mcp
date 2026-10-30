# Expo Go vs Development Builds

Expo Go is a fast playground with a fixed native surface. A **development build** is your own debug binary with `expo-dev-client`, carrying every native module your project installs - the environment production apps are actually built from.

Highlights / Expo Go vs Development Builds

* Expo Go is a fixed native binary - only its preinstalled native modules are callable from your JS
* Development builds include expo-dev-client and YOUR native dependencies
* Switch before custom native modules, push credentials, or universal/app links
* npx expo install expo-dev-client then eas build --profile development
* JS hot reload works in both; native code changes require a new native build

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Still prototyping with only Expo SDK modules? Expo Go is enough:
npx expo start
# Scan QR with Expo Go (simulator/emulator or device with matching SDK)
 
# Need custom native code? Add the dev client and create a development build:
npx expo install expo-dev-client
eas build --profile development --platform ios
# Install the .ipa/.apk, then:
npx expo start --dev-client
```

**When to reach for this:**

* Deciding whether day-one Expo Go is sufficient for your SDK 57 spike.
* Hitting `Native module cannot be null` after `npm install`ing a library not bundled in Expo Go.
* Testing push notifications, app/universal links, or custom splash/icon behavior realistically.
* Onboarding teammates who confuse Expo Go limitations with Expo platform limitations.

## Working Example

```bash
# 1. Add expo-dev-client to an existing SDK 57 project
npx expo install expo-dev-client
```

```json
// eas.json - development profile (installable debug build)
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

```bash
# 2. Build and install (simulator example)
eas build --profile development --platform ios
# Download/install the build, then start Metro for dev-client:
npx expo start --dev-client
```

```tsx
// App.tsx - detect runtime for conditional diagnostics
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import * as Expo from "expo";
import Constants from "expo-constants";
 
export default function App() {
  const [inGo, setInGo] = useState<boolean | null>(null);
 
  useEffect(() => {
    setInGo(Expo.isRunningInExpoGo());
  }, []);
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Runtime probe</Text>
      <Text>expo-dev-client: {Constants.expoConfig?.plugins?.includes("expo-dev-client") ? "configured" : "n/a"}</Text>
      <Text>Running in Expo Go: {inGo === null ? "…" : inGo ? "yes" : "no"}</Text>
      <Text style={styles.hint}>
        Development builds load your native modules. Expo Go only loads modules shipped inside Expo Go.
      </Text>
      <Button title="Reload" onPress={() => Expo.reloadAppAsync("manual")} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  hint: { fontSize: 14, color: "#555", marginTop: 8 },
});
```

**What this demonstrates:**

* `expo-dev-client` turns your app into a development client with a launcher UI and network inspector.
* `eas build --profile development` produces an installable binary with your native dependency graph.
* `npx expo start --dev-client` serves JS to the custom binary instead of Expo Go.
* `Expo.isRunningInExpoGo()` branches diagnostics or feature gates during migration.

## Deep Dive

### How It Works

#### Two layers: native app vs JavaScript bundle

| Layer | What it is | Changes when |
| --- | --- | --- |
| **Native app** | Binary on device (Expo Go or your dev build) | New native module, icon, entitlements, SDK upgrade |
| **JavaScript bundle** | Metro output from `npx expo start` | Every Fast Refresh / reload |

Your JS can only call native APIs that exist in the **installed native app**. Installing `react-native-foo` adds JS stubs to `node_modules`, but until the native code is compiled into your binary, calls fail at runtime.

#### Expo Go

* Prebuilt app from the store with a **fixed set** of native modules (the Expo SDK subset Expo Go ships).
* Loads your JS bundle over the network - instant iteration for learning and early UI work.
* **Cannot** gain new native modules after install.
* Shows an **emulated** splash (app icon on solid color) - not your real `app.json` splash assets.
* Supports **one SDK version** on iOS App Store builds - older SDKs require simulator/Android sideload from expo.dev/go.

#### Development build (`expo-dev-client`)

* **Your** debug binary with the same native modules you ship to TestFlight / Play Internal Testing.
* Includes a **launcher** to switch Metro servers, open updates, and inspect network traffic.
* Rebuild required when native dependencies or `app.config` native fields change - JS-only work still hot-reloads.
* Required for realistic push notification, app/universal link, and custom native module testing.

```
┌─────────────────────┐         ┌──────────────────────────────┐
│     Expo Go         │         │   Development build          │
│  Fixed native mods  │         │  Your native mods + dev-client│
│  + your JS bundle   │         │  + your JS bundle            │
└─────────────────────┘         └──────────────────────────────┘
         │                                    │
         └────────── npx expo start ──────────┘
                    (Metro serves JS)
```

### Decision Matrix

| Need | Expo Go | Development build |
| --- | --- | --- |
| UI with Expo SDK modules only | ✓ | ✓ (overkill early) |
| `expo-camera`, `expo-router`, etc. in SDK 57 | ✓ if included in Expo Go | ✓ |
| `@react-native-firebase/*`, custom native SDKs | ✗ | ✓ |
| Remote push notifications (APNs/FCM) | ✗ | ✓ |
| iOS Universal Links / Android App Links | ✗ | ✓ |
| Custom app icon / splash on device | Limited / emulated | ✓ |
| Native code you wrote (Expo Modules API) | ✗ | ✓ |
| Same binary as production CI | ✗ | ✓ (debug variant) |

### Migration Path (Expo Go → dev client)

```bash
npx expo install expo-dev-client
# Ensure plugins includes expo-dev-client (auto-added by install)
 
eas build:configure   # if eas.json missing
eas build --profile development --platform all
 
# Daily loop after install:
npx expo start --dev-client
```

Local alternative when you have Xcode/Android Studio:

```bash
npx expo run:ios
npx expo run:android
```

These compile a debug binary with `expo-dev-client` embedded.

### TypeScript Notes

```tsx
import * as Expo from "expo";
 
export function RuntimeBanner() {
  if (Expo.isRunningInExpoGo()) {
    return <Text>Expo Go - some native features disabled</Text>;
  }
  return <Text>Development / production native binary</Text>;
}
```

Use runtime detection only for diagnostics - do not fork product logic permanently on `isRunningInExpoGo()` unless the feature is genuinely unavailable.

## Gotchas

* **Installing a native library and expecting Expo Go to work** - JS installs succeed but native calls throw. **Fix:** `npx expo install expo-dev-client` and create a development build.
* **Testing push notifications in Expo Go** - Remote push requires your certificates in **your** binary. **Fix:** Development build with configured push credentials.
* **Assuming splash/icon changes appear in Expo Go** - Expo Go shows its own shell; your branding ships with native builds. **Fix:** Validate assets in a development or preview build.
* **Forgetting `--dev-client` flag** - Metro defaults to Expo Go QR flow; your custom binary won't connect correctly. **Fix:** `npx expo start --dev-client` after installing a dev build.
* **iOS device stuck on wrong SDK Expo Go** - App Store only offers the latest Expo Go. **Fix:** Development build, or use simulator with a downloadable Expo Go build from expo.dev/go.
* **Rebuilding for every JS change** - Unnecessary. Native rebuilds are only for native dependency or config plugin changes. **Fix:** Keep Metro running; reload JS for component edits.
* **Shipping `expo-dev-client` to production stores** - Dev client belongs in debug/internal profiles. **Fix:** Separate `development` and `production` EAS profiles; production omits dev-client launcher UI.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo Go | Learning, UI spikes, SDK-only modules | Custom native modules or store-realistic testing |
| EAS development build | Team distribution, no local Xcode/Android setup | You need instant native iteration with no cloud queue |
| `npx expo run:ios/android` (local) | Fast native iteration on one machine | CI-only teams without local native toolchains |
| Preview build (release config, internal dist) | QA testing performance near production | Daily dev loop - slower than dev client + Metro |
| Production build only | Tiny apps with no native customizations | Any project that iterated in Expo Go and hit native walls |
| Simulator web (`expo start --web`) | Component logic without native APIs | Camera, push, sensors, or platform-specific native code |

## FAQs

What is Expo Go?

Expo Go is a prebuilt Expo playground app from the app stores. It loads your JavaScript bundle over the network so you can preview UI quickly without compiling native code yourself.

What is a development build?

A development build is a debug version of **your** app with the `expo-dev-client` library installed. It includes your native dependencies and connects to Metro for JavaScript hot reload - the same architecture production uses, minus release optimizations.

When is Expo Go enough?

When you only use native modules already bundled inside Expo Go (most `expo-*` SDK packages), you are learning RN, or you are building UI that does not depend on custom native code, push, or app links.

When must I switch to a development build?

Before integrating libraries with native code outside Expo Go's bundle, testing remote push, configuring universal/app links, or validating real icons, splash screens, and entitlements.

What does expo-dev-client add?

A development launcher, switchable Metro URLs, network inspection, and support for loading your custom native module graph - capabilities Expo Go cannot replicate because its native binary is fixed.

How do I create a development build on EAS?

```bash
npx expo install expo-dev-client
eas build --profile development --platform ios
```

Set `"developmentClient": true` in the EAS profile. Install the artifact, then run `npx expo start --dev-client`.

Do I need to rebuild for every code change?

No. JavaScript and React changes hot-reload through Metro in both Expo Go and development builds. Rebuild when you add/remove native modules or change native config plugins.

Gotcha: Why does my new native package work on npm install but crash at runtime?

`npm install` adds JavaScript and native source to `node_modules`, but Expo Go's binary does not include that native code. Create a development build so the native module is compiled into your app.

Can I use Expo Go with SDK 57?

Yes on simulators/emulators and Android devices when Expo Go versions align. iOS physical devices must use the App Store Expo Go version compatible with SDK 57 - if mismatched, use a development build.

What command starts Metro for a development build?

```bash
npx expo start --dev-client
```

Without `--dev-client`, the CLI optimizes for Expo Go QR codes.

How do I detect Expo Go at runtime?

```tsx
import * as Expo from "expo";
Expo.isRunningInExpoGo(); // boolean
```

Use for diagnostics, not as a permanent feature flag strategy.

Are development builds the same as production builds?

They share native modules and config plugins, but development builds include dev-client tooling, debug symbols, and internal distribution. Production profiles strip dev-only code and apply release signing.

Can I test deep links in Expo Go?

Custom URL schemes partially work, but **App Links / Universal Links** need two-way association baked into your native binary - impossible in Expo Go. Use a development build.

What is the daily workflow after I have a dev build installed?

Start Metro once (`npx expo start --dev-client`), open the dev client app, pick your server, iterate on JS with Fast Refresh. Rebuild native only when native dependencies change.

Does expo-dev-client ship to the App Store?

No. Keep it in development/internal profiles. Production store builds use a `production` EAS profile without the dev launcher.

## Related

* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - scaffold the project before choosing a runtime
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - native fields dev builds actually apply
* [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - how native modules register in your binary
* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - managed workflow overview
* [Managed → Bare Migration](https://docs.wahwei/reactnative.codeguides.io/expo-platform/managed-to-bare-migration/) - when you need full native directory control
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-platform/best-practices/) - team defaults for dev-client adoption timing

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [docs.expo.dev/tutorial](https://docs.expo.dev/tutorial/introduction/) - official Expo step-by-step tutorial
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
