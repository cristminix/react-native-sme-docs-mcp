# Expo SDK Basics

10 examples to get you started with Expo SDK packages - 7 basic and 3 intermediate. Covers installing with `npx expo install`, SDK versioning, and how native modules boot inside your app.

Highlights / Expo SDK Basics

* `npx expo install` pins semver ranges tested against your SDK - plain npm install can drift
* Every Expo module version is validated against the `expo` package in package.json
* Config plugins require a development build or prebuild - Expo Go ignores many native plugins
* Import side effects at app entry for TaskManager and some native listeners
* Run `npx expo doctor` after SDK bumps to catch incompatible native modules early
* Unimodules share a single native bootstrap - one mismatched package breaks the whole binary

## Prerequisites

Scaffold an Expo app with SDK 57 before adding SDK packages:

```bash
npx create-expo-app@latest SdkBasics --template blank-typescript
cd SdkBasics
```

Confirm the SDK pin:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. What Expo SDK Packages Are

Expo SDK packages are **native modules** with a JavaScript API - camera, filesystem, notifications, and dozens more ship as npm packages versioned against a single `expo` release.

```tsx
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo SDK packages</Text>
      <Text style={styles.body}>
        JavaScript imports call into native code compiled for SDK 57 - not
        browser polyfills.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 15, color: "#4b5563", lineHeight: 22 },
});
```

* Each package (`expo-camera`, `expo-location`, …) is an **Expo module** with iOS and Android implementations
* The **`expo`** package is the SDK root - its version defines which module versions are compatible
* Packages work in **Expo Go** when listed in the Go client; custom native code requires a **development build**
* Prefer curated Expo modules over unmaintained community forks when both cover the same capability

> **Related:** [../expo-platform/expo-platform-basics/expo-platform-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - platform layer overview | [../expo-platform/expo-modules-core/expo-modules-core.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - native bootstrap

---

### 2. Install Packages with npx expo install

Always add Expo modules through the CLI so semver ranges match the SDK compatibility matrix.

```bash
# One or more packages - versions resolved for SDK 57
npx expo install expo-notifications expo-location
 
# After manual package.json edits or an SDK bump
npx expo install --fix
 
# Verify no version skew before your first native build
npx expo doctor
```

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "expo-notifications": "~0.32.0",
    "expo-location": "~19.0.0"
  }
}
```

* **`npx expo install`** reads your `expo` version and picks tested ranges - `npm install expo-camera@latest` can pull SDK-incompatible native code
* **`--fix`** reconciles every Expo dependency after upgrading `expo` in `package.json`
* **`expo doctor`** flags duplicate React Native copies, wrong module versions, and missing config plugins
* Commit `package-lock.json` / `yarn.lock` so CI installs the same native ABI your laptop built

> **Related:** [./expo-notifications.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-notifications/) - first push notification install | [./expo-location.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-location/) - location permissions

---

### 3. SDK Version as the Contract

The `expo` field in `package.json` is the single source of truth every other Expo package must satisfy.

```text
SDK 57 contract
 
expo ~57.0.4          ← root SDK pin
├── react 19.2.3      ← paired by create-expo-app
├── react-native 0.86.0
├── expo-camera ~17.x ← resolved by expo install
├── expo-file-system ~19.x
└── …                 ← all modules validated against SDK 57 matrix
```

```bash
# Intentional SDK bump - read the changelog first
npx expo install expo@~57.0.4
npx expo install --fix
npx expo prebuild --clean   # when native folders exist
```

* Mixing **SDK 56 modules** with **SDK 57 `expo`** causes native compile errors - the matrix is not advisory
* **`~57.0.4`** allows patch releases within SDK 57 - pin intentionally for reproducible CI
* After a bump, run **`--fix`** before debugging runtime crashes - version skew often surfaces as obscure native exceptions
* Native folders (`ios/`, `android/`) must be regenerated or rebuilt after SDK jumps

> **Related:** [../expo-platform/upgrading-expo-sdk-versions/upgrading-expo-sdk-versions.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - upgrade runbook

---

### 4. Import and Use a Module

Expo modules export a namespace or named classes - import once, call async APIs from effects or handlers.

```bash
npx expo install expo-haptics
```

```tsx
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      >
        <Text style={styles.label}>Tap for haptic feedback</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  label: { color: "#fff", fontWeight: "600" },
});
```

* Most APIs are **async** - permissions, hardware access, and I/O return Promises
* TypeScript types ship with the package - no `@types/` package needed for first-party Expo modules
* Test on a **physical device** when the API touches sensors, push, or background execution
* Wrap calls in try/catch - permission denials and hardware absence throw or return structured errors

> **Related:** [../rn-fundamentals/platform-specific-code/platform-specific-code.md](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - `Platform.OS` guards

---

### 5. Permissions in app.config

Many SDK packages require manifest entries - declare them in `app.json` or `app.config.ts` before requesting runtime permission.

```bash
npx expo install expo-camera expo-location
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
export default (): ExpoConfig => ({
  name: "SdkBasics",
  slug: "sdk-basics",
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow SdkBasics to take photos for work order attachments.",
        microphonePermission:
          "Allow SdkBasics to record audio with video inspections.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "SdkBasics uses your location to tag field visits even when the app is in the background.",
        locationWhenInUsePermission:
          "SdkBasics uses your location to show nearby job sites.",
      },
    ],
  ],
});
```

* **Config plugin strings** become iOS `Info.plist` usage descriptions and Android permission rationale - App Review rejects vague copy
* Plugins run at **prebuild** - changing them requires a new native binary, not only a JS OTA update
* Request runtime permission **after** explaining value in UI - see [./best-practices.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/)
* Pair manifest copy with in-app pre-prompt screens before `requestPermissionsAsync`

> **Related:** [./expo-camera-and-expo-image-picker.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture permissions | [./expo-location.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-location/) - disclosure strings

---

### 6. Expo Go vs Development Build

Expo Go bundles a fixed set of native modules. Packages with custom native code or unpublished plugins need a dev client.

```bash
npx expo install expo-dev-client
npx expo run:ios
# or cloud dev client:
npx eas build --profile development --platform ios
```

```text
┌────────────────────┬─────────────────────┬──────────────────────────┐
│ Capability         │ Expo Go             │ Development build        │
├────────────────────┼─────────────────────┼──────────────────────────┤
│ expo-notifications │ Limited push setup  │ Full push + custom icons │
│ expo-camera        │ Yes                 │ Yes + custom plugins     │
│ Config plugins     │ Ignored             │ Applied at prebuild      │
│ expo-updates       │ Limited             │ Production OTA channel   │
└────────────────────┴─────────────────────┴──────────────────────────┘
```

* **Expo Go** is fastest for learning and UI work - not for final QA of push, background location, or OTA
* **`expo-dev-client`** replaces Go as the native shell while keeping Metro fast refresh
* If `npx expo start` opens Go but your feature needs a plugin, install dev-client before debugging "module not found" native errors
* Store submission always uses an **EAS build** or local release binary - never Expo Go

> **Related:** [../expo-platform/expo-go-vs-development-builds/expo-go-vs-development-builds.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - feature matrix

---

### 7. Module Lifecycle and App Entry

Some modules require registration before React mounts - background tasks, notification handlers, and update listeners belong in global scope.

```bash
npx expo install expo-notifications expo-task-manager
```

```ts
// index.ts - side-effect imports BEFORE registerRootComponent
import "./src/notifications/notificationHandler";
import "./src/background/locationTask";
import { registerRootComponent } from "expo";
import App from "./App";
 
registerRootComponent(App);
```

```ts
// src/notifications/notificationHandler.ts
import * as Notifications from "expo-notifications";
 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

* **`TaskManager.defineTask`** must run in global scope - defining inside a component fails on cold start from the OS
* **Notification handlers** set before the first notification arrives - import the module at entry
* Expo Router apps use **`app/_layout.tsx`** top-level imports for the same side effects
* Keep entry side effects **small** - heavy work still belongs in lazy-loaded modules

> **Related:** [./expo-task-manager-and-background-tasks.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-task-manager-and-background-tasks/) - global task registration | [./expo-notifications.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-notifications/) - foreground handler

---

## Intermediate Examples

### 8. Autolinking and Native Project Generation

Expo autolinking discovers native modules from `package.json` and wires them into generated `ios/` and `android/` projects.

```bash
npx expo prebuild
# inspect native projects without opening Xcode
ls ios/Pods 2>/dev/null || ls android/app/build.gradle
```

```json
{
  "expo": {
    "plugins": ["expo-notifications"]
  }
}
```

* **`npx expo prebuild`** generates native folders from `app.config` + installed modules - CNG keeps them out of git in managed workflow
* **Autolinking** reads `expo-module.config.json` in each package - manual `pod install` edits get overwritten on next prebuild
* Adding a package with a **config plugin** changes native projects - commit config, not hand-edited `Info.plist`, when using CNG
* Bare workflow teams still run **`npx expo install`** for version safety - autolinking works the same

> **Related:** [../cng-prebuild/prebuild-basics/prebuild-basics.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - when to prebuild | [../native-modules/native-modules-basics/native-modules-basics.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - module architecture

---

### 9. Legacy vs Modern APIs Within a Package

Some SDK packages ship both a modern API and a `/legacy` entry - migrate deliberately, not in one PR.

```bash
npx expo install expo-file-system
```

```ts
// Modern SDK 57 API - File, Directory, Paths
import { Directory, File, Paths } from "expo-file-system";
 
const cacheDir = new Directory(Paths.cache, "downloads");
cacheDir.create();
const meta = new File(cacheDir, "manifest.json");
meta.create();
meta.write(JSON.stringify({ version: 1 }));
 
// Legacy API - still available during migration
import * as FileSystem from "expo-file-system/legacy";
 
const legacyUri = meta.uri;
const text = await FileSystem.readAsStringAsync(legacyUri);
```

* Prefer **`File` / `Directory` / `Paths`** for new code on SDK 57 - object-oriented paths reduce URI string bugs
* Import **`expo-file-system/legacy`** only for unmigrated call sites - plan removal per release
* Read each package changelog on SDK bump - renames and deprecations are per-module, not only in `expo` release notes
* See [./expo-file-system.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) for sandbox paths and download patterns

> **Related:** [./expo-file-system.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) - sandboxed paths and downloads

---

### 10. Environment-Specific Package Behavior

Use `app.config.ts` and EAS environments to vary permissions, plugins, and API keys - not `if (__DEV__)` forks in production paths.

```ts
// app.config.ts
const IS_DEV = process.env.APP_VARIANT === "development";
 
export default {
  name: IS_DEV ? "SdkBasics (Dev)" : "SdkBasics",
  slug: "sdk-basics",
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
    pushEnabled: !IS_DEV,
  },
  plugins: [
    ...(IS_DEV ? [] : [["expo-notifications", { icon: "./assets/notification-icon.png" }]]),
  ],
};
```

```tsx
import Constants from "expo-constants";
 
const pushEnabled = Constants.expoConfig?.extra?.pushEnabled ?? false;
```

* **`extra`** is available at runtime via `expo-constants` - suitable for feature flags resolved at build time
* **`EXPO_PUBLIC_*`** inlines into JS - never put secrets there; API URLs only when intentionally public
* Disable push plugins in **dev** when testing without APNs/FCM credentials - reduces native setup friction
* Align variants with [../expo-platform/environments-and-eas-environment-variables/environments-and-eas-environment-variables.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/)

> **Related:** [../expo-platform/app-json-and-app-config-js/app-json-and-app-config-js.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - dynamic config

---

## FAQs

Can I use npm install instead of npx expo install?

* Plain `npm install` ignores the SDK compatibility table - use it only for non-Expo packages (`zod`, `@tanstack/react-query`).
* For any `expo-*` package, always `npx expo install <package>`.

How do I know if a package works in Expo Go?

* Check the package docs header - "Included in Expo Go" means the module ships in the Go client for your SDK.
* Config plugins and custom native code require a development build regardless.

Do I need to rebuild after adding a JS-only Expo package?

* If the package has **no native code** and **no config plugin**, Metro restart is enough.
* If it adds native code or a plugin, run `npx expo prebuild` or a new EAS build.

Where do I find compatible versions?

```bash
npx expo install expo-camera
npx expo doctor
```

* The [Expo SDK reference](https://docs.expo.dev/versions/v57.0.0/) lists every module version for SDK 57.

## Related

* [expo-notifications](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-notifications/) - push and local notifications
* [expo-location](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-location/) - foreground and background location
* [expo-file-system](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) - device storage
* [expo-secure-store & expo-crypto](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/) - secrets and hashing
* [../expo-platform/expo-platform-basics/expo-platform-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - platform fundamentals
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
