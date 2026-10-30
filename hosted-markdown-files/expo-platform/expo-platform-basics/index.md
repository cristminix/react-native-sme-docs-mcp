# Expo Platform Basics

10 examples to get you started with Expo Platform - 7 basic and 3 intermediate.

Highlights / Expo Platform Basics

* Expo is a platform layer on React Native - you still write RN components, Expo handles native project wiring
* The managed workflow keeps ios/ and android/ generated; you opt into native folders only when needed
* Pin `expo` ~57.0.4 in package.json - every Expo module version is validated against that SDK
* `npx expo install` resolves compatible semver ranges; plain npm install can drift from the SDK matrix
* Expo Go is fastest for learning; custom native modules require a development build with expo-dev-client
* app.config.ts can branch on APP\_VARIANT without committing secrets to app.json
* Linking an EAS projectId early keeps builds, updates, and environment variables scoped to one Expo project

## Prerequisites

Expo projects are scaffolded with **create-expo-app**, which pins the SDK, Metro config, and default TypeScript layout in one step.

```bash
npx create-expo-app@latest MyExpoApp --template blank-typescript
cd MyExpoApp
```

Confirm the SDK pin in `package.json` before installing anything else:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Start the dev server and open the app on a device or simulator:

```bash
npx expo start
```

Press `i` for the iOS Simulator, `a` for Android, or scan the QR code with **Expo Go**. Every runnable example below can replace `App.tsx` in the project you just created.

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Expo as a Platform Layer

Expo wraps React Native with tooling, a curated module set, and a managed native project - your UI code stays standard RN.

```tsx
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo + React Native</Text>
      <Text style={styles.body}>
        Same View/Text primitives - Expo supplies the dev server, config, and
        native bootstrap.
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

* You still author **React Native components** - Expo is not a separate UI framework
* Packages like `expo-status-bar` ship as **Expo modules** with native code precompiled for the SDK
* The **managed workflow** means Expo owns `ios/` and `android/` generation via prebuild unless you eject or run bare
* Adopt Expo when you want faster iteration, consistent upgrades, and EAS Build/Update without maintaining native projects day one

> **Related:** [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - templates and first-run verification | [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - how native modules bootstrap

---

### 2. Default Project Layout

A fresh Expo app is a small, predictable tree - learn these files before adding features.

```text
MyExpoApp/
├── App.tsx              # Root component (entry UI)
├── app.json             # Static manifest (or app.config.ts)
├── package.json         # SDK-pinned dependencies and scripts
├── tsconfig.json
├── assets/              # Icons, splash, images bundled at build time
└── node_modules/
```

* **`App.tsx`** is the default root - Expo Router projects swap this for an `app/` directory instead
* **`app.json`** (or `app.config.ts`) is the single source of truth for app identity, icons, and native permissions
* **`assets/`** files are referenced by URI in config (`icon`, `splash`) and imported in components
* No `ios/` or `android/` folders yet in pure managed mode - they appear after `npx expo prebuild` or an EAS build

> **Related:** [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - template choices and script reference

---

### 3. SDK Pin in package.json

The `expo` package version is the contract every other Expo module must satisfy.

```json
{
  "name": "my-expo-app",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

* **`expo` ~57.0.4** locks the project to SDK 57 - mixing SDK 56 modules with SDK 57 `expo` causes native build failures
* `main: "expo/AppEntry.js"` wires Metro to Expo's bootstrap, which registers your root component
* Default scripts delegate to **`expo start`** so LAN, tunnel, and dev-client flags stay consistent across the team
* After cloning, run `npm install` then `npx expo doctor` to catch version skew before your first build

> **Related:** [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - intentional bumps and `expo install --fix`

---

### 4. app.json Identity Fields

These manifest keys define how the binary appears on device home screens and in app stores.

```json
{
  "expo": {
    "name": "My Expo App",
    "slug": "my-expo-app",
    "version": "1.0.0",
    "scheme": "myexpoapp",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.example.myexpoapp"
    },
    "android": {
      "package": "com.example.myexpoapp"
    }
  }
}
```

* **`name`** is the user-visible label; **`slug`** is the URL-safe Expo project identifier
* **`scheme`** registers a custom URL scheme for deep links (`myexpoapp://`)
* **`bundleIdentifier` / `package`** must be unique per app - changing them after store release creates a new listing
* Icons and splash paths are resolved at **build time**, not fetched over the network

> **Related:** [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - dynamic config and multi-environment manifests

---

### 5. Start the Dev Server

`expo start` launches Metro, prints a QR code, and hot-reloads `App.tsx` on save.

```bash
# Default: LAN URL for devices on the same network
npx expo start
 
# Clear Metro cache after dependency or babel changes
npx expo start --clear
 
# Tunnel when LAN/firewall blocks device ↔ laptop (slower, but reliable)
npx expo start --tunnel
```

```tsx
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export default function App() {
  const [count, setCount] = useState(0);
 
  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <Pressable style={styles.button} onPress={() => setCount((c) => c + 1)}>
        <Text style={styles.buttonText}>Increment - save to hot reload</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  count: { fontSize: 48, fontWeight: "700" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* Metro bundles JavaScript on demand - **Fast Refresh** preserves component state when possible
* Use **`--clear`** when imports resolve incorrectly after adding packages or changing `babel.config.js`
* **LAN** is fastest; **tunnel** trades latency for reachability on corporate Wi-Fi or remote devices
* The terminal also accepts `i` / `a` to boot simulators without retyping flags

> **Related:** [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - which client opens from this command

---

### 6. Version-Safe Installs with expo install

Always add Expo modules through the CLI so semver ranges match the SDK compatibility table.

```bash
# Adds a module tested against SDK 57
npx expo install expo-camera expo-file-system
 
# After a manual package.json edit or SDK bump - reconcile all Expo deps
npx expo install --fix
```

* **`npx expo install`** reads your pinned `expo` version and chooses compatible native module releases
* Plain **`npm install expo-camera@latest`** can pull a module built for a newer SDK and break iOS/Android compile
* **`--fix`** is the first command to run after upgrading `expo` in `package.json`
* Config plugins for some modules (camera, notifications) also require entries in `app.json` - installing is only step one

> **Related:** [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - doctor, changelog, and RN alignment

---

### 7. Preview with Expo Go

Expo Go is a sandbox app with prebuilt native modules - ideal for learning and UI work without compiling native code.

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
 
  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera access is required.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }
 
  return <CameraView style={styles.camera} facing="back" />;
}
 
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  message: { fontSize: 16, textAlign: "center" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  camera: { flex: 1 },
});
```

* Scan the QR from `npx expo start` with **Expo Go** - no Xcode or Android Studio required for this loop
* Expo Go only includes modules shipped in its store build; **custom native code or unreleased modules won't run**
* Permission APIs (`useCameraPermissions`) still execute real OS prompts inside the Expo Go shell
* When you outgrow Expo Go's module set, move to a **development build** - same JS bundle, your own native binary

> **Related:** [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - decision checklist and `expo-dev-client`

---

## Intermediate Examples

### 8. Environment-Aware app.config.ts

Replace static `app.json` with TypeScript config when bundle IDs, names, or API hosts differ per environment.

```ts
import { ExpoConfig, ConfigContext } from "expo/config";
 
const APP_VARIANT = process.env.APP_VARIANT ?? "development";
 
export default ({ config }: ConfigContext): ExpoConfig => {
  const isProd = APP_VARIANT === "production";
 
  return {
    ...config,
    name: isProd ? "My Expo App" : "My Expo App (Dev)",
    slug: "my-expo-app",
    ios: {
      ...config.ios,
      bundleIdentifier: isProd
        ? "com.example.myexpoapp"
        : "com.example.myexpoapp.dev",
    },
    android: {
      ...config.android,
      package: isProd ? "com.example.myexpoapp" : "com.example.myexpoapp.dev",
    },
    extra: {
      apiUrl: isProd ? "https://api.example.com" : "https://staging.example.com",
      appVariant: APP_VARIANT,
    },
  };
};
```

```bash
APP_VARIANT=development npx expo start
APP_VARIANT=production npx eas build --profile production
```

* **`app.config.ts`** is evaluated at build and prebuild time - not on every Metro reload
* Spread `...config` so Expo CLI merges defaults (plugins, updates) instead of silently dropping them
* Put **non-secret** environment switches in `extra` - read them with `expo-constants` in app code
* Never embed private API keys here; use **EAS environment variables** or CI secrets for sensitive values

> **Related:** [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - config plugins and secrets-safe patterns | [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - dev/staging/prod separation

---

### 9. When Expo Go Is Not Enough

Libraries with custom native code, private native modules, or config plugins not in Expo Go require a development build.

```bash
npx expo install expo-dev-client
npx expo run:ios
# or produce a installable dev client via EAS:
npx eas build --profile development --platform ios
```

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": { "deploymentTarget": "15.1" },
          "android": { "minSdkVersion": 24 }
        }
      ]
    ]
  }
}
```

* **`expo-dev-client`** replaces Expo Go as the native shell while keeping Metro fast refresh
* **`npx expo run:ios` / `run:android`** generates native projects locally via prebuild, then compiles a dev client
* **Config plugins** mutate native projects at prebuild - they are ignored by Expo Go even if JavaScript imports succeed
* Stay on the managed workflow: commit `app.config.ts` and let EAS Build run prebuild in CI instead of hand-editing `ios/` when possible

> **Related:** [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - feature matrix | [Managed to Bare Migration](https://docs.wahwei/reactnative.codeguides.io/expo-platform/managed-to-bare-migration/) - keeping upgrade paths when native folders exist

---

### 10. Link an Expo Account and EAS Project

Associating the app with an Expo project unlocks cloud builds, submit, updates, and org-scoped secrets.

```bash
npx expo login
npx eas init
```

```json
{
  "expo": {
    "name": "My Expo App",
    "slug": "my-expo-app",
    "owner": "my-org",
    "extra": {
      "eas": {
        "projectId": "00000000-0000-0000-0000-000000000000"
      }
    }
  }
}
```

```tsx
import Constants from "expo-constants";
import { Text, View } from "react-native";
 
export default function App() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
 
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>EAS project: {projectId ?? "not linked"}</Text>
    </View>
  );
}
```

* **`eas init`** creates or links a project under your Expo account and writes `extra.eas.projectId`
* **`owner`** set to an organization slug routes builds and credentials to the team, not a personal account
* The **projectId** is stable across bundle ID changes - EAS services key off it, not `slug` alone
* Link early in greenfield projects so preview, staging, and production build profiles share one credential store

> **Related:** [Expo Account, Projects & Permissions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-account-projects-and-permissions/) - roles and multi-app governance | [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - per-environment secrets

---

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [docs.expo.dev/tutorial](https://docs.expo.dev/tutorial/introduction/) - official Expo step-by-step tutorial
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
