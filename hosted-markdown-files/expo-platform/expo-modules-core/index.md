# Expo Modules Core

The `expo` package is more than a version pin - it bootstraps **Expo Modules Core**, the JSI-native runtime that registers Expo SDK modules, exposes `requireNativeModule`, and connects JavaScript to Swift/Kotlin implementations in every Expo and bare React Native app.

Highlights / Expo Modules Core

* The expo package installs ExpoModulesCore native infrastructure at app launch
* requireNativeModule resolves JSI bindings first, then falls back to legacy bridge proxies
* registerRootComponent wires AppRegistry and dev-only Fast Refresh helpers
* NativeModule and SharedObject extend EventEmitter over JSI - same API on iOS and Android
* Works in managed, bare, and brownfield apps once the native entry point is configured

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// index.ts (custom entry) or App.tsx root
import { registerRootComponent } from "expo";
import { requireNativeModule, requireOptionalNativeModule } from "expo-modules-core";
import App from "./App";
 
// Optional: probe a native module at startup (dev diagnostics)
const ExpoDevice = requireOptionalNativeModule("ExpoDevice");
if (__DEV__ && ExpoDevice) {
  console.log("ExpoDevice native module loaded via JSI");
}
 
registerRootComponent(App);
```

```bash
# Ensure the core package matches SDK 57
npx expo install expo expo-modules-core
```

**When to reach for this:**

* Understanding why `import { Camera } from 'expo-camera'` works after only `npx expo install`.
* Debugging `Cannot find native module 'Expo…'` in bare or brownfield setups.
* Calling `requireNativeModule` from shared libraries without React components.
* Authoring or integrating native modules built with the Expo Modules API.

## Working Example

```tsx
// src/native/brightness.ts - thin typed wrapper over an Expo native module
import { requireNativeModule, NativeModule } from "expo-modules-core";
 
type BrightnessModule = NativeModule & {
  getBrightnessAsync: () => Promise<number>;
  setBrightnessAsync: (value: number) => Promise<void>;
};
 
const Brightness = requireNativeModule<BrightnessModule>("ExpoBrightness");
 
export async function dimToHalf(): Promise<number> {
  const current = await Brightness.getBrightnessAsync();
  await Brightness.setBrightnessAsync(0.5);
  return current;
}
```

```tsx
// App.tsx - root registration + runtime probe
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { registerRootComponent } from "expo";
import * as Device from "expo-device";
import { dimToHalf } from "./src/native/brightness";
 
function App() {
  const [model, setModel] = useState<string>("…");
  const [restored, setRestored] = useState<string>("");
 
  useEffect(() => {
    setModel(Device.modelName ?? "unknown");
  }, []);
 
  async function handleDim() {
    const previous = await dimToHalf();
    setRestored(`was ${previous.toFixed(2)}`);
  }
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Modules Core</Text>
      <Text>Device: {model}</Text>
      <Text>expo-device uses the same JSI registry as requireNativeModule</Text>
      <Button title="Dim screen to 50%" onPress={handleDim} />
      {restored ? <Text>{restored}</Text> : null}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
 
registerRootComponent(App);
```

```java
// android/app/src/main/java/.../MainActivity.java (bare) - required component name
@Override
protected String getMainComponentName() {
  return "main"; // matches registerRootComponent → AppRegistry.registerComponent("main", ...)
}
```

**What this demonstrates:**

* `registerRootComponent` registers `"main"` with React Native and web runtimes.
* `requireNativeModule` loads the JSI host object exported by Expo Modules Core.
* High-level packages (`expo-device`) and low-level `requireNativeModule` share the same native registry.
* Bare projects must align `MainActivity` / `AppDelegate` `moduleName` with `"main"`.

## Deep Dive

### How It Works

#### Bootstrap sequence (app launch)

1. Native app starts → **ExpoModulesCore** initializes the JSI host object (`global.expo.modules…`).
2. Each installed Expo module's native code **registers** itself (name → class) during native startup.
3. JavaScript loads → `expo` polyfills (`registerRootComponent`, web globals) run.
4. When JS calls `requireNativeModule("ExpoCamera")`, Core looks up the JSI binding and returns a **NativeModule** proxy.
5. If JSI binding is missing (legacy path), Core falls back to a bridge proxy - some sync APIs may be unavailable.

```
Native launch
    │
    ▼
ExpoModulesCore (Swift / Kotlin / C++)
    │ registers ExpoCamera, ExpoDevice, …
    ▼
JS bundle loads (Metro)
    │
    ▼
requireNativeModule("ExpoCamera") ──JSI──▶ native method calls
```

#### Key `expo` / `expo-modules-core` APIs

| API | Role |
| --- | --- |
| `registerRootComponent` | Registers root component as `"main"`; web entry + dev helpers |
| `requireNativeModule(name)` | Loads native module; throws if missing |
| `requireOptionalNativeModule(name)` | Same, returns `null` when absent |
| `requireNativeView` | Drop-in replacement for `requireNativeComponent` |
| `NativeModule` | Base class for native modules; extends `EventEmitter` |
| `SharedObject` / `SharedRef` | Long-lived native handles (video players, image refs) over JSI |
| `isRunningInExpoGo()` | Runtime check for Expo Go vs custom binary |

```tsx
import { EventEmitter, requireNativeModule } from "expo-modules-core";
 
// NativeModule methods are async by default unless marked sync in native code
const module = requireNativeModule("ExpoFileSystem");
```

#### Relationship to React Native New Architecture

* Expo Modules API targets **JSI** and supports **TurboModules / Fabric** on the New Architecture.
* Backwards compatible with older architecture - bridge proxy fallback exists but lacks sync JSI features.
* SDK 57 / RN 0.86 default to New Architecture; Expo modules auto-link through `expo-modules-autolinking`.

#### Package layout in SDK 57

| Package | Responsibility |
| --- | --- |
| `expo` | App entry helpers, re-exports, web polyfills, `expo/fetch` |
| `expo-modules-core` | `requireNativeModule`, `NativeModule`, `EventEmitter`, JSI types |
| `expo-modules-autolinking` | Gradle/Pod resolution of Expo modules at build time |
| `expo-*` libraries | Feature modules (camera, file-system, etc.) registering via Core |

```bash
# Autolinking inspect (debug missing modules)
npx expo-modules-autolinking resolve --platform ios
```

### Bare / Brownfield Setup Requirements

Expo Modules Core runs in **any** React Native app that:

1. Depends on `expo` and `expo-modules-core` (`npx expo install expo expo-modules-core`).
2. Applies **expo-modules-autolinking** in `settings.gradle` / Podfile (added by `npx install-expo-modules` or Expo prebuild).
3. Registers the JS root component name **`main`** via `registerRootComponent`.
4. Calls native entry setup in `AppDelegate` / `MainApplication` (prebuild templates do this automatically).

```bash
# Add Expo modules to an existing bare RN app
npx install-expo-modules@latest
```

### NativeModule Events

```tsx
import { useEventListener } from "expo";
import { requireNativeModule } from "expo-modules-core";
 
const ExpoAccelerometer = requireNativeModule("ExpoAccelerometer");
 
export function AccelerometerListener() {
  useEventListener(ExpoAccelerometer, "accelerometerDidUpdate", (event) => {
    console.log(event.x, event.y, event.z);
  });
  return null;
}
```

`EventEmitter` in Core is implemented in C++ shared across platforms - listeners fire synchronously on the JS thread.

### TypeScript Notes

```tsx
import type { NativeModule } from "expo-modules-core";
import { requireNativeModule } from "expo-modules-core";
 
interface ExpoHapticsModule extends NativeModule {
  impactAsync(style: "light" | "medium" | "heavy"): Promise<void>;
  selectionAsync(): Promise<void>;
}
 
export const Haptics = requireNativeModule<ExpoHapticsModule>("ExpoHaptics");
```

Typing the interface documents available native methods and catches typos at compile time.

## Gotchas

* **Wrong `MainComponent` name in bare apps** - Native entry still says `"MyApp"` while JS registers `"main"`. **Fix:** Set `getMainComponentName()` / `moduleName` to `"main"` or match your `registerRootComponent` name.
* **Missing autolinking after adding `expo-camera`** - Native build never compiles the module. **Fix:** Run `npx expo prebuild` or verify `expo-modules-autolinking` in Gradle/Podfile; rebuild native.
* **Calling `requireNativeModule` in Expo Go for unbundled modules** - Core works, but the native class was never shipped in Expo Go. **Fix:** Development build with the module installed.
* **Assuming bridge sync methods on fallback proxy** - When JSI binding is missing, some sync APIs noop or throw. **Fix:** Rebuild with New Architecture enabled; verify module supports sync functions.
* **Importing from `expo` vs `expo-modules-core`** - App authors can use either for `requireNativeModule`; library packages should import from `expo-modules-core` to avoid peer-dep cycles. **Fix:** Libraries → `expo-modules-core`; apps → `expo` re-exports.
* **Leaking SharedObjects** - Long-lived native handles (video players) retain memory until `release()` or hook cleanup. **Fix:** Use package hooks (`useVideoPlayer`) or call `release()` when done.
* **Skipping `npx expo install`** - Manual npm versions mismatch native binaries vs JS stubs. **Fix:** Always `npx expo install <pkg>` so autolinking resolves SDK 57-compatible builds.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo Modules API (`expo-modules-core`) | Expo SDK libraries, shared Swift/Kotlin modules | You need heavy C++ shared across platforms (consider Turbo Modules) |
| React Native Turbo Modules | C++ core, RN-first libraries without `expo` dep | You want Expo autolinking and Config Plugins integration |
| Legacy NativeModules bridge | Maintaining very old libraries | New SDK 57 projects - prefer JSI |
| `react-native-web` shims only | Web builds without native APIs | Device features (camera, sensors) |
| Direct `NativeModules` import | Quick spike in legacy code | Long-term - misses optional JSI sync APIs |

## FAQs

What is Expo Modules Core?

The native + JavaScript infrastructure behind the Expo Modules API. It registers native modules on a JSI host object, exposes `requireNativeModule`, and provides `NativeModule`, `EventEmitter`, and `SharedObject` primitives used by every `expo-*` package.

How is the expo package different from expo-modules-core?

`expo` is the umbrella runtime - `registerRootComponent`, `isRunningInExpoGo`, web polyfills, and re-exports. `expo-modules-core` is the low-level module loader and type layer library authors depend on.

What does registerRootComponent do?

It calls `AppRegistry.registerComponent("main", …)`, sets up web rendering, polyfills `process.nextTick`, and enables dev-only Fast Refresh helpers. Every Expo app ultimately registers `"main"` as the root component name.

How does requireNativeModule find native code?

It queries the JSI host object populated at native launch. If absent, it falls back to a bridge proxy module - still functional but missing some synchronous JSI methods.

Why do I get Cannot find native module ExpoSomething?

Common causes: native project not rebuilt after install, autolinking misconfigured in bare app, module not included in Expo Go, or typo in module name. Rebuild native and verify with `npx expo-modules-autolinking resolve`.

Does Expo Modules Core require Expo Go?

No. It runs in development builds, production binaries, and bare React Native apps once autolinking and the `"main"` entry name are configured.

How does this relate to the New Architecture?

Expo modules are JSI-first and support TurboModules/Fabric. SDK 57 defaults to New Architecture on RN 0.86; Core handles both paths with bridge fallback for older setups.

What is a SharedObject?

A JSI-backed native instance with methods and events - e.g. a video player. It extends `EventEmitter` and persists across JS calls until `release()` or hook teardown.

Gotcha: Why do high-level imports work but requireNativeModule fails?

You may be in Expo Go where the high-level JS package exists but the native module is not bundled, or the native name differs (`ExpoDevice` vs `Device`). Verify the exact native module name in the package docs and use a development build.

Can I use Expo Modules in a brownfield app?

Yes. Run `npx install-expo-modules`, align the root component name, rebuild native, and install SDK packages with `npx expo install`.

What is expo-modules-autolinking?

Build-time tooling that scans dependencies and wires Gradle/Podspec entries so native Expo modules compile into your app without manual linking.

How do native events reach JavaScript?

`NativeModule` extends `EventEmitter`. Native code emits events; JS subscribes via `addListener`, `useEventListener`, or `useEvent` from `expo`.

Should library code import from expo or expo-modules-core?

Library packages should depend on `expo-modules-core` for `requireNativeModule` to avoid circular peers. Application code may import from `expo` for ergonomics.

Does expo bundle global fetch in SDK 57?

Yes. SDK 57 installs WinterCG-compliant `fetch` globally on native unless `EXPO_PUBLIC_USE_RN_FETCH=1` is set. Named `import { fetch } from 'expo/fetch'` always uses the Expo implementation.

How do I inspect which modules will link?

```bash
npx expo-modules-autolinking resolve --platform android
npx expo-modules-autolinking resolve --platform ios
```

Compare output with `requireNativeModule` names your app uses.

## Related

* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - where Expo Modules sit in the managed workflow
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - when native modules are actually in your binary
* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - SDK 57 scaffold with modules pre-wired
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - config plugins that native modules depend on
* [Managed → Bare Migration](https://docs.wahwei/reactnative.codeguides.io/expo-platform/managed-to-bare-migration/) - autolinking when you eject to native dirs
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - JS thread vs native module calls

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [Expo GitHub & examples](https://github.com/expo/expo) - Expo monorepo + example projects
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
