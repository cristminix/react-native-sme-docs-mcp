# expo-dev-client

`expo-dev-client` turns your debug binary into a proper development environment: a **launcher** for switching Metro servers, an extensible **dev menu**, and support for every native module your project installs - the standard path beyond Expo Go on SDK 57.

Highlights / expo-dev-client

* npx expo install expo-dev-client adds the development-build launcher and dev menu
* Configure launchMode and defaultLaunchURL in app.json - requires a native rebuild
* registerDevMenuItems adds team shortcuts without forking native code
* npx expo start --dev-client serves JS to your custom binary, not Expo Go
* Native module changes need eas build or npx expo run:\* - JS still hot-reloads

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Add the library (pins compatible version for SDK 57)
npx expo install expo-dev-client
 
# Build and install a development client
npx expo run:ios          # local simulator / USB device
npx expo run:android --device
# - or cloud -
eas build --profile development --platform all
 
# Serve JavaScript to the dev client (not Expo Go)
npx expo start --dev-client
```

```json
// app.json - launcher behavior (rebuild required after changes)
{
  "expo": {
    "plugins": [
      [
        "expo-dev-client",
        {
          "launchMode": "most-recent",
          "ios": { "launchMode": "launcher" }
        }
      ]
    ]
  }
}
```

**When to reach for this:**

* Installing any native module not bundled in Expo Go (`react-native-maps` with custom config, Stripe, etc.).
* QA needs to switch between `localhost`, staging, and PR preview Metro URLs.
* Adding custom entries to the shake / three-finger dev menu.
* Testing universal links, push, and app icons with your real bundle identifier.
* Staying on managed workflow while outgrowing Expo Go's fixed native surface.

## Working Example

```tsx
// App.tsx - custom dev menu items + runtime banner
import { useEffect } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import * as DevClient from "expo-dev-client";
import * as Expo from "expo";
 
async function registerDevTools() {
  if (!__DEV__) return;
 
  await DevClient.registerDevMenuItems([
    {
      name: "Log app config",
      callback: () => {
        console.log("Running in Expo Go?", Expo.isRunningInExpoGo());
      },
      shouldCollapse: true,
    },
    {
      name: "Throw test error",
      callback: () => {
        throw new Error("Intentional dev-menu crash for QA");
      },
      shouldCollapse: true,
    },
  ]);
}
 
export default function App() {
  useEffect(() => {
    registerDevTools().catch(console.error);
  }, []);
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-dev-client demo</Text>
      <Text style={styles.row}>Platform: {Platform.OS}</Text>
      <Text style={styles.row}>
        Running in Expo Go: {Expo.isRunningInExpoGo() ? "yes" : "no"}
      </Text>
      <Text style={styles.hint}>
        Shake device (or press m in terminal) → open dev menu → try custom items.
      </Text>
      <Button title="Open dev menu" onPress={() => DevClient.openMenu()} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  row: { fontSize: 14, color: "#475569", marginBottom: 4 },
  hint: { marginTop: 16, fontSize: 12, color: "#64748b", textAlign: "center" },
});
```

```json
// eas.json - development profile with dev client enabled
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "gradleCommand": ":app:assembleDebug" }
    }
  }
}
```

```bash
# First-time flow after adding expo-dev-client
npx expo prebuild   # skip if android/ and ios/ already exist
eas build --profile development --platform ios
# Install build → then daily:
npx expo start --dev-client
```

**What this demonstrates:**

* `registerDevMenuItems` for team-specific diagnostics without editing native code.
* `DevClient.openMenu()` as a programmatic fallback to shake gestures.
* `eas.json` `developmentClient: true` so EAS produces a debug binary with the launcher baked in.
* `--dev-client` flag so Metro never assumes Expo Go is the host.

## Deep Dive

### How It Works

* **`expo-dev-client`** is a native module plus a **config plugin** that wires a launcher UI, deep-link scheme, and enhanced dev menu into debug builds.
* **Development builds** (debug binaries with `expo-dev-client`) load JavaScript from Metro - same Fast Refresh story as Expo Go, but the native side is **your** app id, icons, and installed modules.
* **`launchMode`** controls cold start: `most-recent` jumps into the last project URL; `launcher` shows the server picker (useful for QA switching environments).
* **`defaultLaunchURL`** skips the picker entirely when set - pair with per-platform overrides for Android emulator (`10.0.2.2`) vs iOS simulator (`localhost`).
* **Native changes** (new config plugin, `expo prebuild`, Gradle/Pod edits) require **`npx expo run:*` or `eas build`**; pure JS/TS changes hot-reload via `npx expo start --dev-client`.

### Launcher Config Plugin Options

| Property | Default | Effect |
| --- | --- | --- |
| `launchMode` | `"most-recent"` | `most-recent` auto-opens last server; `launcher` shows picker |
| `defaultLaunchURL` | - | Cold-start URL when Metro is at a fixed host |
| `addGeneratedScheme` | `true` | Registers `exp+<slug>://` deep link for opening projects |
| `ios.launchMode` / `android.launchMode` | inherits top-level | Per-platform launch behavior |
| `ios.defaultLaunchURL` / `android.defaultLaunchURL` | - | Per-platform Metro URL |

```json
{
  "expo": {
    "plugins": [
      [
        "expo-dev-client",
        {
          "launchMode": "most-recent",
          "defaultLaunchURL": "http://localhost:8081",
          "android": { "defaultLaunchURL": "http://10.0.2.2:8081" }
        }
      ]
    ]
  }
}
```

Rebuild native after plugin changes: `npx expo run:ios` or `eas build --profile development`.

### Dev Menu API

| Method | Purpose |
| --- | --- |
| `DevClient.openMenu()` | Show the dev menu programmatically |
| `DevClient.closeMenu()` | Dismiss the menu |
| `DevClient.hideMenu()` | Hide without animation side effects |
| `DevClient.registerDevMenuItems(items)` | Add custom rows with `name`, `callback`, optional `shouldCollapse` |

Custom items run on the JS thread - keep callbacks fast; defer heavy work with `queueMicrotask` or `InteractionManager`.

### Native Module Iteration Loop

```bash
# 1. Add a native dependency
npx expo install expo-camera
 
# 2. Regenerate native projects if using CNG
npx expo prebuild
 
# 3. Recompile the dev client (native change)
npx expo run:android --device
 
# 4. Iterate on JS - no rebuild needed until native changes again
npx expo start --dev-client
```

### TypeScript Notes

```tsx
const items = [
  {
    name: "Clear async storage",
    shouldCollapse: true,
    callback: () => {
      console.log("Wire AsyncStorage.clear() here");
    },
  },
];
 
if (__DEV__) {
  void import("expo-dev-client").then((DevClient) =>
    DevClient.registerDevMenuItems(items)
  );
}
```

Guard all dev-client APIs with `__DEV__` so production release builds tree-shake the calls (the APIs are no-ops in release, but guarding keeps bundles clean).

## Gotchas

* **Starting Metro without `--dev-client`** - CLI may wait for Expo Go or show the wrong QR. **Fix:** Always `npx expo start --dev-client` once the project depends on `expo-dev-client`.
* **Editing `app.json` plugin config without rebuilding** - Launcher settings are compile-time. **Fix:** Run `npx expo run:*` or `eas build` after plugin changes.
* **Android emulator cannot reach `localhost:8081`** - Emulator maps host loopback to `10.0.2.2`. **Fix:** Set `android.defaultLaunchURL` to `http://10.0.2.2:8081` or use `--lan`.
* **registerDevMenuItems after hot reload duplicates entries** - Items append per registration. **Fix:** Register once in a module-level `if (__DEV__ && !globalThis.__DEV_MENU__)` guard.
* **Expecting Expo Go to load custom native modules** - Expo Go ships a fixed binary. **Fix:** Install your development build; `Native module cannot be null` means you need a rebuild.
* **Using development builds for store performance testing** - Debug dev clients include extra tooling. **Fix:** Profile on `preview` or release builds for FPS and startup metrics.
* **iOS Simulator Expo Go confusion** - Simulator may still have Expo Go installed alongside your dev client. **Fix:** Open the correct app icon (your app name, not "Expo Go").

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-dev-client` + development build | Custom native modules, real bundle id, extensible dev menu | Pure JS spike with only Expo SDK modules |
| Expo Go | Fastest day-one learning, no native compile | Any custom native dependency or config plugin |
| `expo run:ios/android` without EAS | Local native compile, USB device | Teammates on Windows who need iOS builds |
| EAS `development` profile | Whole team installs same dev client from a link | You change native code hourly and have full local toolchains |
| Bare React Native (`@react-native-community/cli`) | Full native repo control without Expo | You want EAS, Expo modules, and managed upgrades |
| Production release builds | Performance and store submission | Daily JSX iteration - rebuild cost is too high |

## FAQs

What is expo-dev-client?

A library and config plugin that adds a **development launcher**, enhanced **dev menu**, and debugging tools to your own debug app binary - Expo's name for a "development build."

How do I install expo-dev-client on SDK 57?

```bash
npx expo install expo-dev-client
```

Never pin the version manually - `expo install` resolves the SDK 57-compatible release.

Why must I run expo start --dev-client?

The flag tells Expo CLI to generate URLs and QR codes for your custom binary. Without it, tooling assumes Expo Go is the target host.

What is launchMode most-recent vs launcher?

**most-recent** opens the last Metro URL directly (falls back to launcher if unreachable).**launcher** always shows the server picker - better for QA switching branches.

When do I need to rebuild the native app?

After adding/removing native modules, changing config plugins, editing `app.json` icons/splash/bundle id, or upgrading Expo SDK. Pure JS edits hot-reload without rebuild.

How do I add custom dev menu buttons?

```tsx
import * as DevClient from "expo-dev-client";
 
await DevClient.registerDevMenuItems([
  { name: "My action", callback: () => console.log("run"), shouldCollapse: true },
]);
```

Register once at app startup in `__DEV__` only.

How do I open the dev menu without shaking the phone?

Press **`m`** in the Metro terminal, call `DevClient.openMenu()` from JS, or use the three-finger long press on iOS simulators.

Can I use expo-dev-client with Expo Router?

Yes - the default SDK 57 template includes Router. The dev client loads your router entry (`app/_layout.tsx`) like any other app.

What eas.json profile builds a dev client?

Set `"developmentClient": true` on a build profile (commonly named `development`). Run `eas build --profile development`.

Does expo-dev-client work on simulators?

Yes. Use `"ios": { "simulator": true }` in the development profile for simulator IPAs, or `npx expo run:ios` locally.

What URL should Android emulators use for Metro?

`http://10.0.2.2:8081` - the emulator's alias for the host machine's `localhost`. Set `android.defaultLaunchURL` in the plugin config.

Is expo-dev-client included in production builds?

The native shell is the same project, but dev-client UI is stripped from release builds. Ship `eas build --profile production` for store binaries.

How is this different from Expo Go?

Expo Go is a shared app with a fixed native module set. A dev client is **your** app binary with **your** native dependencies and bundle identifier.

Gotcha: Native module cannot be null - what now?

Install `expo-dev-client`, rebuild with `npx expo run:android` or `eas build --profile development`, install the new binary, then start Metro with `--dev-client`.

## Related

* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - decision guide before adding expo-dev-client
* [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB, wireless, and internal builds for dev clients
* [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - run dev clients on virtual devices
* [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/) - inspector and performance tooling inside dev builds
* [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/) - JS iteration limits inside dev clients
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - plugins array and config plugin wiring

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T0RjM2ZESXdNall3Tnc9PQ==

Reviewed by Chris St. John·Last updated Jul 19, 2026
