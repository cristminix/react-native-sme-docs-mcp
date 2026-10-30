# EAS Build Basics

Ten examples for **`eas.json`**, **build profiles**, and your **first cloud iOS/Android build** - the operational foundation for shipping Expo SDK 57 binaries without local Xcode or Android Studio on every machine.

Highlights / EAS Build Basics

* EAS Build runs expo prebuild + native compile in Expo-managed cloud runners
* eas.json profiles map development, preview, and production to credentials and env
* CNG teams upload JS + config - ios/ and android/ are generated on the build server
* developmentClient: true produces installable dev clients with expo-dev-client
* eas build --profile production --platform all is the first store-shaped compile
* Pair every profile with EAS environments - not laptop .env files

## Prerequisites

Start from a blank Expo app with SDK 57 pinned and EAS CLI installed globally or via `npx`:

```bash
npx create-expo-app@latest EasBuildBasics --template blank-typescript@sdk-57 --yes
cd EasBuildBasics
npm install -g eas-cli@latest
eas login
```

Confirm the stack pin before configuring builds:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Read [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) before your first EAS build under Continuous Native Generation (CNG).

---

## Basic Examples

### 1. What EAS Build Does

**EAS Build** is Expo's cloud compile service. For a typical CNG app it:

1. Uploads your JavaScript, `app.config.ts`, lockfile, and `modules/` (not gitignored `ios/` / `android/`)
2. Runs **`npx expo prebuild`** when native folders are absent
3. Installs CocoaPods and Gradle dependencies on macOS / Linux runners
4. Signs the artifact with credentials from **EAS Credentials**
5. Returns an **IPA**, **AAB/APK**, or **simulator build** download link

```bash
eas build:configure
```

* **`eas build:configure`** creates `eas.json` and links the project to your Expo account
* Local Xcode is optional - the compile happens on Expo infrastructure
* See [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) for when native dirs are generated vs checked in

---

### 2. Link the Project to EAS

Every build needs an Expo project ID in `app.config.ts`:

```bash
eas init
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "EasBuildBasics",
  slug: "eas-build-basics",
  version: "1.0.0",
  ios: {
    bundleIdentifier: "com.example.easbuildbasics",
  },
  android: {
    package: "com.example.easbuildbasics",
  },
  extra: {
    eas: {
      projectId: "00000000-0000-0000-0000-000000000000", // from eas init
    },
  },
};
 
export default config;
```

```bash
npx expo config --type public | jq '.extra.eas.projectId'
```

* **`eas init`** writes `projectId` - commit `app.config.ts` after linking
* Builds without `projectId` fail early with a clear config error
* White-label apps need **one project ID per store listing** - see [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/)

---

### 3. Minimal eas.json

`eas.json` is the build contract - profiles name credential sets, distribution channels, and environment variables:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

```bash
eas build --profile preview --platform ios
```

* **`cli.version`** pins the minimum EAS CLI - CI should match or exceed it
* **`appVersionSource: "remote"`** lets EAS auto-increment `buildNumber` / `versionCode` on store profiles
* Three profiles cover most teams: **development**, **preview**, **production**

---

### 4. Development Profile (Dev Client)

Engineers need a native binary with `expo-dev-client` embedded - not Expo Go:

```bash
npx expo install expo-dev-client
```

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```bash
# iOS Simulator binary (no device registration)
eas build --profile development --platform ios
 
# Android APK for USB sideload
eas build --profile development --platform android
```

* **`developmentClient: true`** compiles the dev menu and custom native modules
* Rebuild after **SDK bumps** or native dependency changes - OTA cannot upgrade the dev client
* Pair with [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) for runtime version alignment

---

### 5. Preview Profile (QA-Shaped)

Preview builds look like production but install via internal distribution - TestFlight internal, ad hoc, or APK links:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "channel": "preview",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```bash
eas build --profile preview --platform all
```

* **`distribution": "internal"`** skips public store release - see [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/)
* **`channel`** ties the binary to EAS Update bundles published with `eas update --channel preview`
* Use preview for push, universal links, and camera QA on physical devices

---

### 6. Production Profile (Store-Shaped)

Production compiles release binaries signed for App Store Connect and Google Play:

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "environment": "production",
      "channel": "production",
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

```bash
eas build --profile production --platform all --non-interactive
```

* **`distribution": "store"`** produces App Store / Play-ready artifacts
* **`buildType": "app-bundle"`** is required for Play production - AAB not APK
* **`autoIncrement": true`** bumps iOS `buildNumber` and Android `versionCode` remotely

---

### 7. First Cloud iOS Build

Interactive first build walks credential setup - accept EAS-managed credentials unless you have an existing cert chain:

```bash
eas build --profile production --platform ios
```

Prompt flow (first time):

```text
? Generate a new Apple Distribution Certificate? › Yes
? Generate a new Apple Provisioning Profile? › Yes
? Log in to your Apple Developer account › ...
```

After success:

```bash
eas build:list --platform ios --limit 3
```

* EAS stores certs and profiles encrypted - teammates run `--non-interactive` builds
* Deep dive: [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/)
* iOS platform context: [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/)

---

### 8. First Cloud Android Build

Android first build generates or uploads a keystore - let EAS create one for greenfield apps:

```bash
eas build --profile production --platform android
```

```text
? Generate a new Android Keystore? › Yes
```

Inspect stored credentials:

```bash
eas credentials --platform android
```

* Google Play expects **AAB** signed with your upload key - Play App Signing holds the app signing key
* Deep dive: [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/)
* Platform context: [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/)

---

### 9. Monitor Builds and Download Artifacts

Track in-flight compiles and retrieve install links:

```bash
# Watch the latest build
eas build --profile preview --platform ios --wait
 
# List recent builds
eas build:list --status finished --limit 5
 
# Open build page in browser
eas build:view
```

```json
// Example finished build metadata (abbreviated)
{
  "status": "FINISHED",
  "platform": "IOS",
  "artifacts": {
    "buildUrl": "https://expo.dev/artifacts/eas/....ipa"
  }
}
```

* Share **`buildUrl`** with QA for APK/IPA sideload or ad hoc installs
* Failed builds log prebuild, pod install, and Gradle errors - fix config plugins before retrying
* CI uses **`--non-interactive`** and polls `eas build:list` or EAS webhooks

---

### 10. CNG: Let EAS Run Prebuild

Standard CNG apps gitignore native folders - EAS regenerates them on every build:

```gitignore
# .gitignore
ios/
android/
```

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_NO_CAPABILITY_SYNC": "0"
      }
    }
  }
}
```

```bash
# Local sanity check before spending EAS minutes
npx expo-doctor
npx expo prebuild --no-install
eas build --profile production --platform all
```

* Upload **config + JS**, not hand-edited `Info.plist` - express native changes in plugins
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - what prebuild writes before compile
* [Fingerprint & Native Change Detection](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/) - when to rebuild vs OTA

---

## FAQs

Do I need a Mac for iOS builds?

* **No** for EAS Build - compiles run on Expo macOS runners.
* **Yes** for local `expo run:ios` or Xcode debugging on your laptop.
* Simulator-only profiles (`"simulator": true`) still use cloud macOS workers.

What is the difference between preview and production profiles?

* **preview** - internal distribution, staging APIs, QA install links.
* **production** - store distribution, production env vars, App Store / Play signing.
* Both should use release compile settings - preview is not a debug build.

Can I build without committing ios/ and android/?

* **Yes** - that is the CNG default. EAS runs `expo prebuild` when folders are absent.
* Commit native dirs only during brownfield migration with a dated cutover plan.

How do I speed up repeat builds?

* Pin dependencies in `package-lock.json` - upload size and install time drop.
* Avoid unnecessary native changes - fingerprint shifts force full recompiles.
* Use [Custom Build Hooks](https://docs.wahwei/reactnative.codeguides.io/eas-build/custom-build-hooks/) sparingly - extra steps add minutes.

## Related

* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - certs, profiles, and EAS managed credentials
* [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/) - upload keys and Play App Signing
* [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - dev, preview, production, white-label
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - App Store Connect and Play Console uploads
* [../cng-prebuild/prebuild-basics/prebuild-basics.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - generating native projects from config
* [../cng-prebuild/cng-in-ci/cng-in-ci.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) - when EAS generates vs checks in native dirs
* [../ios-platform/ios-basics-for-rn-devs/ios-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - Xcode concepts for RN teams
* [../android-platform/android-basics-for-rn-devs/android-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - Gradle and package identity
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - runtime version and channel hygiene

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
