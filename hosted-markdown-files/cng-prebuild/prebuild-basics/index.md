# Prebuild Basics

Ten examples for generating `ios/` and `android/` from **Expo config** without manual drift - the foundation of Continuous Native Generation (CNG) on Expo SDK 57 and React Native 0.86.

Highlights / Prebuild Basics

* CNG (Continuous Native Generation) turns app.config.ts + plugins into ios/ and android/
* SDK 57 runs expo prebuild with --clean by default - stale native folders are deleted first
* Gitignore ios/ and android/ under CNG; regenerate on EAS Build or local prebuild
* Every native permission, entitlement, and manifest entry should flow from config plugins
* expo run:ios and expo run:android invoke prebuild then compile a dev client locally
* Pair with Native Module Rules before adding packages that touch native code

## Prerequisites

Start from a blank Expo app with SDK 57 pinned. Prebuild reads `app.config.ts`, applies config plugins, and writes native projects:

```bash
npx create-expo-app@latest PrebuildBasics --template blank-typescript@sdk-57 --yes
cd PrebuildBasics
```

Confirm the stack pin before running prebuild:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Read [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) before adding native dependencies.

---

## Basic Examples

### 1. What Prebuild Does

`npx expo prebuild` is the bridge between your **JavaScript config** and **Xcode/Gradle projects**. It:

1. Evaluates `app.config.ts` (or `app.json`)
2. Runs registered **config plugins** in order
3. Copies the SDK 57 native template into `ios/` and `android/`
4. Applies plugin mutations to `Info.plist`, `AndroidManifest.xml`, Gradle, and Podfile

```bash
npx expo prebuild
```

After a successful run:

```text
PrebuildBasics/
├── app.config.ts
├── ios/                 # Generated - do not hand-edit under CNG
├── android/             # Generated - do not hand-edit under CNG
└── package.json
```

* **CNG teams gitignore** `ios/` and `android/` - EAS Build runs the same prebuild step in CI
* **Hand-edited native files** are overwritten on `expo prebuild --clean` (the SDK 57 default)
* Express durable changes as **config plugins**, not Xcode clicks - see [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/)

---

### 2. Minimal app.config.ts for Prebuild

Prebuild needs bundle identifiers, display name, and icon paths at minimum:

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "PrebuildBasics",
  slug: "prebuild-basics",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "prebuildbasics",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.example.prebuildbasics",
    supportsTablet: true,
  },
  android: {
    package: "com.example.prebuildbasics",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
};
 
export default config;
```

```bash
npx expo prebuild --no-install
```

* **`--no-install`** skips `pod install` and Gradle sync - useful for CI diff checks
* **`npx expo config --type public`** prints the resolved manifest without writing native folders
* Bundle ID and package name flow into generated `PRODUCT_BUNDLE_IDENTIFIER` and `applicationId`

---

### 3. Gitignore Native Folders Under CNG

Standard CNG projects **do not commit** generated native directories:

```gitignore
# .gitignore (CNG pattern)
ios/
android/
```

```bash
# Verify prebuild reproduces the same tree locally
rm -rf ios android
npx expo prebuild --no-install
```

* **Committed `ios/` from SDK 56** blocks RN 0.86 templates on upgrade - delete and regenerate
* **EAS Build** runs prebuild automatically when folders are absent
* Brownfield teams that commit native dirs inherit manual merge work - see [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/)

> **Related:** [../expo-rules/expo-project-rules-checklist/expo-project-rules-checklist.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - CNG gitignore is a Tier 3 non-negotiable

---

### 4. SDK 57 Clean Regen Default

In SDK 57, `expo prebuild` **deletes existing `ios/` and `android/`** before regenerating:

```bash
# Default behavior (SDK 57): clean then generate
npx expo prebuild
 
# Opt out: layer changes onto existing native projects
npx expo prebuild --no-clean
```

| Flag | Behavior |
| --- | --- |
| (default) | Remove `ios/` and `android/`, then generate fresh projects |
| `--no-clean` | Keep existing folders; apply template updates incrementally |
| `--platform ios` | Generate iOS only |
| `--platform android` | Generate Android only |

* Use **default clean** after SDK upgrades or when plugin output looks corrupted
* Use **`--no-clean`** when iterating on a local native patch you are migrating into a plugin
* Full workflow checklist: [expo prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/)

---

### 5. Inspecting Generated Output

Before merging plugin changes, diff what prebuild produced:

```bash
npx expo prebuild --no-install
git diff ios android   # only if folders are tracked (brownfield)
```

```bash
# Print resolved config without writing files
npx expo config --type introspect
```

* **`--type introspect`** shows mod results plugins would apply - faster than full prebuild during plugin development
* **`expo-doctor`** catches invalid config fields that fail silently until prebuild
* Plugin order in `app.config.ts` matters when multiple plugins touch the same file

---

### 6. Registering a Config Plugin

Native permissions and entitlements belong in **plugins**, not post-prebuild edits:

```ts
// app.config.ts
const config: ExpoConfig = {
  // ...name, slug, ios, android
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to scan barcodes.",
      },
    ],
  ],
};
```

```bash
npx expo install expo-camera
npx expo prebuild --platform ios --no-install
```

* **`expo-camera`** ships a config plugin that adds `NSCameraUsageDescription` to `Info.plist`
* Third-party libraries with native code often expose plugins - check their README for SDK 57 support
* Deep dive: [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) and [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/)

---

### 7. Prebuild + Development Client

Custom native modules require a **development build**, not Expo Go. Prebuild generates the native shell:

```bash
npx expo install expo-dev-client
npx expo prebuild
npx expo run:ios
```

```json
// package.json scripts
{
  "scripts": {
    "prebuild": "expo prebuild",
    "ios:native": "expo run:ios",
    "android:native": "expo run:android"
  }
}
```

* **`expo run:ios`** runs prebuild if `ios/` is missing, installs pods, then compiles
* **Rebuild the dev client** after every SDK bump or native dependency change - OTA cannot replace native code
* [../native-modules/native-modules-basics/native-modules-basics.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when JS-only is not enough

---

### 8. Platform-Specific Config

Prebuild reads platform keys and generates matching native settings:

```ts
// app.config.ts excerpt
ios: {
  bundleIdentifier: "com.example.prebuildbasics",
  infoPlist: {
    UIBackgroundModes: ["fetch"],
  },
  associatedDomains: ["applinks:shop.example.com"],
},
android: {
  package: "com.example.prebuildbasics",
  intentFilters: [
    {
      action: "VIEW",
      autoVerify: true,
      data: [{ scheme: "https", host: "shop.example.com", pathPrefix: "/orders" }],
      category: ["BROWSABLE", "DEFAULT"],
    },
  ],
},
```

```bash
npx expo prebuild --no-install
```

* **Universal Links and App Links** require native entitlements - config fields map to `associatedDomains` and intent filters
* Prefer **library config plugins** (e.g. `expo-router`, `expo-notifications`) over raw `infoPlist` when available
* Rebuild store binaries after changing domains or schemes - OTA cannot add entitlements

---

### 9. New Architecture Defaults

SDK 57 targets RN 0.86 with the **New Architecture** enabled in prebuild templates:

```ts
// app.config.ts
const config: ExpoConfig = {
  // ...
  newArchEnabled: true,
};
```

```bash
npx expo-doctor
npx expo prebuild --no-install
```

* **`newArchEnabled: false`** is a temporary escape hatch - document an ADR if you disable it
* Third-party native libraries must support TurboModules/Fabric on RN 0.86 - check GitHub issues before installing
* Clean rebuild after changing `newArchEnabled`: `rm -rf ios android && npx expo prebuild`

---

### 10. Prebuild in the Upgrade Path

SDK bumps delete stale native folders under CNG:

```bash
npx expo install expo@^57.0.0
npx expo install --fix
npx expo-doctor
rm -rf ios android
npx expo prebuild --no-install
```

* **Never bump `react-native` independently** - `expo install --fix` pins RN 0.86.0 for SDK 57
* **EAS Build** regenerates native projects when `ios/`/`android/` are absent from the upload
* Full upgrade recipe: [../expo-platform/upgrading-expo-sdk-versions/upgrading-expo-sdk-versions.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/)

---

## Intermediate Examples

### 11. Monorepo Prebuild from App Root

In a pnpm/Turborepo workspace, run prebuild from the **app package directory**:

```bash
cd apps/mobile
npx expo prebuild --no-install
```

```ts
// apps/mobile/app.config.ts
const config: ExpoConfig = {
  name: "Mobile",
  slug: "mobile",
  // ...
};
```

* Metro and prebuild both resolve from the app root - not the monorepo root
* Shared packages do not need their own `ios/` - only deployable apps run prebuild
* [../project-setup/shared-packages-and-metro-resolution/shared-packages-and-metro-resolution.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/)

---

### 12. Environment Variants Without Forked Native Projects

Drive staging and production bundle IDs from env vars - one config file, multiple binaries:

```ts
// app.config.ts
const IS_DEV = process.env.APP_VARIANT === "development";
 
const config: ExpoConfig = {
  name: IS_DEV ? "PrebuildBasics (Dev)" : "PrebuildBasics",
  slug: "prebuild-basics",
  ios: {
    bundleIdentifier: IS_DEV
      ? "com.example.prebuildbasics.dev"
      : "com.example.prebuildbasics",
  },
  android: {
    package: IS_DEV
      ? "com.example.prebuildbasics.dev"
      : "com.example.prebuildbasics",
  },
};
 
export default config;
```

```bash
APP_VARIANT=development npx expo prebuild --no-install
APP_VARIANT=production npx expo prebuild --no-install
```

* **EAS profiles** set `env.APP_VARIANT` per build - prebuild runs with the correct bundle ID in CI
* Each bundle ID needs its own credentials and EAS `projectId` if binaries ship separately
* Never commit secrets into `app.config.ts` - use EAS Secrets for signing keys

---

### 13. Validating Prebuild Before Merge

Add a CI gate that proves config produces reproducible native output:

```bash
#!/usr/bin/env bash
# scripts/verify-prebuild.sh
set -euo pipefail
 
npx expo-doctor
rm -rf ios android
npx expo prebuild --no-install
 
# Optional: fail if unexpected native diff when folders are tracked
if git diff --quiet ios android 2>/dev/null; then
  echo "Prebuild output matches committed native projects."
else
  echo "Native diff detected - migrate changes to config plugins."
  exit 1
fi
```

* CNG teams skip the git diff step - folders are gitignored
* Run twice locally when authoring plugins - second run should produce **zero diff**
* [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) - when EAS generates vs when you check in native dirs

---

## FAQs

What is the difference between prebuild and eject?

* **Prebuild** regenerates native projects from config on demand - you can delete `ios/` and recreate them.
* **Eject** (legacy) permanently copied native projects into your repo with no regeneration path.
* Modern Expo uses **CNG** - config + plugins, not one-way eject.

Do I need Xcode or Android Studio for prebuild?

* **Prebuild itself** only writes files - no compilers required.
* **`expo run:ios`** and **`expo run:android`** need platform toolchains to compile.
* **EAS Build** runs prebuild + compile in the cloud if local toolchains are unavailable.

Can I run prebuild without creating ios/ and android/ locally?

* Yes - delete local folders and let **EAS Build** run prebuild in CI.
* Many teams never commit native dirs and only prebuild locally when debugging plugins.

Why did my hand-edited Info.plist change disappear?

* SDK 57 default prebuild **cleans** native folders - unencoded edits are lost.
* Move the change into a **config plugin** or library plugin array entry.

## Related

* [expo prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - clean regen, `--no-clean`, local iteration checklist
* [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - composable native changes
* [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/) - `expo run:ios/android` and committing native dirs
* [../native-modules/autolinking-and-expo-modules-core/autolinking-and-expo-modules-core.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - how modules link after prebuild
* [../expo-rules/native-module-rules/native-module-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - when to use plugins vs custom native code
* [../expo-platform/expo-platform-basics/expo-platform-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - managed workflow and platform layer

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

pbqrthvqrf.vb|ptvb882|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
