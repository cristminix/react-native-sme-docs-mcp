# OTA Updates Basics

10 examples to get you started with **Over-The-Air (OTA) updates** on Expo SDK 57 - what EAS Update can change in minutes versus what still requires an App Store or Play Store submission.

Highlights / OTA Updates Basics

* OTA ships JavaScript, TypeScript, and assets - not new native code
* runtimeVersion must match between eas build and eas update or devices silently skip updates
* New native modules, config plugins, and permission strings require a store build
* Preview channel soak catches JS that assumes native APIs not yet in production binaries
* Feature flags kill bad JS paths faster than waiting for a second OTA
* Expo Go cannot receive production EAS Update payloads - test on preview builds

## Prerequisites

OTA updates require `expo-updates` in a **release or preview binary** - not Expo Go.

```bash
npx create-expo-app@latest MyOtaApp --template blank-typescript
cd MyOtaApp
npx expo install expo-updates
npx eas init
npx eas update:configure
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Two Delivery Paths: OTA vs Store

Every mobile release decision starts with one question: **does this change touch native code?**

```text
JavaScript / assets change only     →  eas update (minutes)
Native shell / permissions / SDK    →  eas build + store submit (days)
```

* **OTA** replaces the JS bundle and downloadable assets on devices that already have a compatible binary
* **Store build** replaces the native shell - Hermes runtime, native modules, entitlements, icons
* Users on old store versions stay on their **runtime line** until they upgrade the binary
* See [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) for the full promotion checklist

> **Related:** [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - checking and applying updates from app code

---

### 2. Fix a React Component Bug (OTA-Safe)

Pure JavaScript logic errors are the classic OTA use case - no native boundary crossed.

```tsx
// src/screens/CheckoutScreen.tsx - typo fix ships OTA
export function CheckoutScreen() {
  const total = useCartTotal();
 
  return (
    <View>
      <Text>Total: {formatCurrency(total)}</Text>
      {/* Fixed: was dividing by 100 twice */}
      <PrimaryButton label="Pay now" onPress={submitPayment} />
    </View>
  );
}
```

```bash
# After preview soak
eas update --channel production --environment production --message "Fix checkout total display"
```

* Component trees, hooks, styles, and navigation structure are **OTA-safe**
* Ship to `preview` first; soak before `production` on revenue paths
* Pair with crash monitoring - OTA is fast, not risk-free

> **Related:** [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - staging → production promotion

---

### 3. Swap Image Assets (OTA-Safe)

Bundled images, fonts referenced from JS, and Lottie JSON ship with the update manifest.

```tsx
// src/components/HeroBanner.tsx
import heroImage from "@/assets/hero-summer.png";
 
export function HeroBanner() {
  return <Image source={heroImage} style={{ width: "100%", height: 200 }} />;
}
```

* Asset changes in the Metro bundle are **OTA-safe**
* **App icon and splash screen** are native - they require a new binary
* Large asset additions affect bundle size and TTI - watch performance budgets

---

### 4. Add a Native Module (Store Required)

Installing a package with native code changes `ios/` and `android/` output - OTA cannot add it.

```bash
# This sequence requires eas build + store submit, NOT eas update alone
npx expo install react-native-vision-camera
```

```ts
// app.config.ts - new plugin = native rebuild
export default {
  expo: {
    plugins: [
      [
        "react-native-vision-camera",
        { cameraPermissionText: "We need camera access for barcode scan." },
      ],
    ],
  },
};
```

* `npx expo prebuild` diff is the signal - if native project changes, plan a store build
* **Never** ship JS that imports the new module over OTA before binaries exist in stores
* Gate new native-dependent screens behind feature flags until store adoption crosses your threshold

> **Related:** [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - cloud binaries that receive updates

---

### 5. Change Info.plist Permission Strings (Store Required)

Permission copy lives in native manifests - users see stale text if you OTA without rebuilding.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Scan barcodes to add items to your cart."
      }
    },
    "android": {
      "permissions": ["android.permission.CAMERA"]
    }
  }
}
```

* Any `infoPlist`, `permissions`, or `entitlements` change needs **eas build**
* App Review reads permission strings on the **binary**, not the JS bundle
* Document permission changes in store release notes, not only OTA changelogs

---

### 6. Bump Expo SDK (Store Required)

SDK upgrades change the native runtime, Hermes version, and default native dependencies.

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

* After SDK upgrade: `eas build` for all profiles, then resume `eas update` on the **new runtime line**
* Old binaries on the previous runtime **stop receiving** updates on the new line
* Plan user messaging when minimum native version enforcement is required

> **Related:** [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) - `appVersion`, `nativeVersion`, and fingerprint strategies

---

### 7. runtimeVersion Is the Compatibility Gate

`runtimeVersion` tells EAS Update which JS bundles a binary may download. Mismatch = silent skip.

```ts
// app.config.ts
export default {
  expo: {
    version: "2.4.0",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
  },
};
```

```bash
# Build embeds runtime 2.4.0
eas build --profile production --platform all
 
# Update must target the same runtime
eas update --channel production --environment production
```

* `eas build` artifacts and `eas update` bundles must share the same resolved `runtimeVersion`
* Verify with `npx expo config --type public | jq '.runtimeVersion'`
* Wrong policy strands users on stale JS without an obvious error - test on preview devices

> **Related:** [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/) - full `app.config` cookbook

---

### 8. OTA vs Store Decision Table

Copy this table into your release runbook and require a checkbox per change.

| Change | OTA? | Store? | Notes |
| --- | --- | --- | --- |
| JS bug fix | ✅ | - | Preview soak first |
| New React screen (no new native) | ✅ | - | Watch bundle size |
| New `expo install` native module | - | ✅ | Bump runtime; gate JS |
| Config plugin added/changed | - | ✅ | Prebuild diff required |
| App icon / adaptive icon | - | ✅ | Native asset pipeline |
| Push notification icon (Android) | - | ✅ | Native resource |
| Remote copy / theme tokens in JS | ✅ | - | No native touch |
| SQLite schema migration in JS | ✅ | ⚠️ | Test upgrade path; bad migration bricks |
| API breaking change | ✅ | ⚠️ | Old JS must tolerate old API |
| Hermes bytecode / bundle size | ✅ | - | Treat as release event |

* When a row says **⚠️**, OTA is technically possible but needs extra QA and rollback planning
* Revenue, auth, and payment rows default to **preview soak** regardless of "small" diffs

---

### 9. Gate JS Until Binaries Catch Up

OTA lets you ship JS fast; feature flags let you **control who executes it**.

```tsx
// src/features/barcode/useBarcodeScanner.ts
import * as Application from "expo-application";
 
const MIN_NATIVE_FOR_SCANNER = "2.4.0";
 
export function useBarcodeScannerEnabled(remoteFlag: boolean) {
  const nativeVersion = Application.nativeApplicationVersion ?? "0.0.0";
  const nativeReady = compareSemver(nativeVersion, MIN_NATIVE_FOR_SCANNER) >= 0;
  return remoteFlag && nativeReady;
}
```

* Remote flags disable bad paths **immediately** - faster than republishing an OTA
* `Application.nativeApplicationVersion` reflects the **store binary**, not the OTA bundle ID
* Server authorization still enforces access - flags are UX, not security

> **Related:** [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - kill switches alongside OTA

---

### 10. Know Which Bundle Is Running

Support and incident response need the update ID - not just the marketing version.

```tsx
// app/_layout.tsx (dev/preview diagnostics only)
import * as Updates from "expo-updates";
import { useEffect } from "react";
 
export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) return;
    console.info("[updates]", {
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
      channel: Updates.channel,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    });
  }, []);
 
  return <Stack />;
}
```

* `Updates.updateId` identifies the OTA bundle; `Updates.isEmbeddedLaunch` true means no OTA applied yet
* Log to analytics in preview/production - redact in public user-facing screens
* Keep **last known-good update ID** in release tickets for [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/)

---

## FAQs

Can OTA change native code?

No. OTA replaces JavaScript bundles and downloadable assets. Native modules, permissions, entitlements, SDK version, and app icons require `eas build` and store submission.

Does Expo Go receive EAS Updates?

No. Expo Go uses a generic native shell without your `expo-updates` channel configuration. Test OTA on **preview** or **production** profile builds from EAS.

How fast can a JS fix reach users?

After publish, devices check on launch (per your `checkAutomatically` policy). Users may need one restart. Critical fixes can prompt reload via [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/).

What if I OTA a change that needs native code?

The app crashes at import or first native call - often immediately on launch. Roll back the channel and ship a store build. Prevention: preview soak + runtime guards + [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/).

Do users on old store versions get new OTAs?

They receive OTAs for **their** `runtimeVersion` line only. Track runtime distribution weekly; enforce minimum native version when security requires it.

## Related

* [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/) - `runtimeVersion`, URL, check-on-launch
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - channel promotion workflow
* [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) - policy selection guide
* [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - client check/fetch/reload
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - binaries that receive OTA payloads
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - team enforcement checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
