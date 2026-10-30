# iOS Basics for RN Devs

Xcode essentials without becoming an iOS engineer full-time - the minimum mental model React Native developers need when `npx expo run:ios`, EAS Build, or a native crash log pulls you into Apple's toolchain on SDK 57.

Highlights / iOS Basics for RN Devs

* Open the .xcworkspace - never the .xcodeproj when CocoaPods is present
* Schemes select which target builds; Debug vs Release changes signing and optimizations
* npx expo run:ios wraps prebuild + xcodebuild - you rarely open Xcode daily
* Simulator is fast; device is truth for push, camera, universal links, and performance
* Signing lives in Apple Developer + EAS - local Xcode signing is for USB debugging
* When ios/ is gitignored (CNG), treat Xcode as a debugger - not the source of truth

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Generate ios/ from app.config.ts (CNG) and run on simulator
npx expo prebuild --platform ios
npx expo run:ios
 
# Pick a specific simulator
npx expo run:ios --simulator "iPhone 16 Pro"
 
# USB device (requires Apple Developer account + Xcode)
npx expo run:ios --device
 
# Open the workspace when you must inspect native build settings
open ios/*.xcworkspace
 
# List simulators and connected devices
xcrun simctl list devices available
xcrun xctrace list devices
```

**When to reach for this:**

* First time opening `ios/` after `npx expo prebuild`.
* A native build fails in EAS and you need to reproduce locally in Xcode.
* QA reports a device-only bug (push, camera, biometrics, universal links).
* You need to read a crash log or attach the native debugger to a Hermes issue.
* Someone on the team asks "which file do I edit?" - answer: usually `app.config.ts`, not `pbxproj`.

## Working Example

**Step 1 - Understand what prebuild generated**

```text
ios/
├── Podfile                 ← CocoaPods dependency manifest (autolinking writes here)
├── Podfile.lock            ← Pinned pod versions (commit if ios/ is in git)
├── YourApp.xcworkspace     ← OPEN THIS in Xcode (includes Pods project)
├── YourApp.xcodeproj       ← App target only - wrong entry when Pods exist
└── YourApp/
    ├── AppDelegate.swift   ← RN entry; rarely hand-edit under CNG
    ├── Info.plist          ← Permissions strings; prefer app.config plugins
    └── YourApp.entitlements ← Push, associated domains, app groups
```

**Step 2 - Run from CLI (daily path)**

```bash
npx expo install expo-dev-client
npx expo prebuild --platform ios
npx expo run:ios --simulator "iPhone 16 Pro"
npx expo start --dev-client
```

**Step 3 - Open Xcode only when needed**

```bash
open ios/ShopApp.xcworkspace
```

In Xcode:

1. **Scheme** (toolbar): `ShopApp` → selects the app target to build.
2. **Destination**: simulator or plugged-in iPhone.
3. **Product → Run** (`⌘R`): same as `npx expo run:ios` but with GUI breakpoints in native code.
4. **Signing & Capabilities** tab: bundle ID, team, entitlements mirror - should match `app.config.ts`.

**Step 4 - Read a native build failure**

```text
▸ Compiling SomePod.m
❌ 'SomeHeader.h' file not found
```

Typical RN/Expo fix order:

```bash
cd ios && pod install && cd ..
npx expo prebuild --platform ios --no-clean   # only if ios/ is committed
npx expo run:ios
```

If the error is signing:

```text
error: No profiles for 'com.example.app' were found
```

Fix in [EAS iOS credentials](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) or Xcode → Signing → select your Team - not by disabling signing.

**What this demonstrates:**

* **Workspace vs project** - CocoaPods requires `.xcworkspace`.
* **CLI-first workflow** - Expo commands wrap Xcode; you do not live in Interface Builder.
* **Config is source of truth** - entitlements and Info.plist keys should flow from `app.config.ts` plugins.
* **Simulator vs device** - choose the right hardware for the feature under test.

## Deep Dive

### Xcode concepts mapped to RN

| Xcode term | RN / Expo equivalent |
| --- | --- |
| **Target** | The `.app` binary (your app, or a widget extension) |
| **Scheme** | Build + run configuration for a target (Debug/Release) |
| **Workspace** | App project + `Pods.xcodeproj` |
| **Bundle Identifier** | `ios.bundleIdentifier` in `app.config.ts` |
| **Provisioning Profile** | Apple-signed permission slip tying cert + bundle ID + devices |
| **Capabilities / Entitlements** | `ios.associatedDomains`, push, keychain - see [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/) |
| **Info.plist** | Permission usage strings, URL schemes, background modes |
| **Archive** | Release build for TestFlight - `eas build` does this in CI |

### Debug vs Release

|  | Debug | Release |
| --- | --- | --- |
| Hermes | Dev tools enabled | Optimized bytecode |
| JS bundle | Metro dev server | Embedded production bundle |
| Signing | Development cert | Distribution cert |
| Use when | Daily dev, USB debugging | TestFlight, App Store |

`npx expo run:ios` builds **Debug** by default. Store binaries come from `eas build --profile production`.

### Simulator essentials

```bash
# Boot a simulator without running the app
xcrun simctl boot "iPhone 16 Pro"
 
# Open a URL (universal link smoke test)
xcrun simctl openurl booted "https://shop.example.com/orders/42"
 
# Erase state (stuck keychain / cached AASA)
xcrun simctl erase booted
```

* Apple Silicon Macs run **arm64 simulators** natively - prefer them over Rosetta-x86\_64 simulators.
* Simulators **cannot** receive real APNs push, do not run BGTaskScheduler faithfully, and fake some sensors.
* iOS **16+** physical devices require **Developer Mode** (Settings → Privacy & Security).

### CNG vs committed `ios/`

| Model | You edit | Xcode role |
| --- | --- | --- |
| **CNG** (gitignored `ios/`) | `app.config.ts`, plugins | Debugger only; regenerated on prebuild |
| **Committed native** | `ios/` + plugins | Merge native changes carefully on SDK bumps |

SDK 57 default: `npx expo prebuild` runs `--clean` - see [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).

### When you actually need Xcode

* Native module compile errors in a specific pod.
* Inspecting **Signing & Capabilities** after a rejection.
* Attaching to a **native** crash (not JS redbox) in `AppDelegate` or a third-party SDK.
* Profiling with Instruments (memory leaks in native image pipelines).

For JS debugging, prefer React Native DevTools and Metro - not Xcode breakpoints in application code.

## Gotchas

* **Opening `.xcodeproj` instead of `.xcworkspace`** - `Pods` headers missing, build fails. **Fix:** always `open ios/*.xcworkspace`.
* **Editing `Info.plist` / entitlements by hand under CNG** - wiped on next prebuild. **Fix:** config plugin or `app.config.ts` `ios` fields.
* **Assuming simulator proves push or Live Activities** - APNs requires device + proper entitlements. **Fix:** USB device testing.
* **Bundle ID mismatch** - `app.config.ts`, Apple Developer portal, and AASA `appID` must match exactly.
* **Chasing Xcode UI on every RN upgrade** - if `ios/` is generated, delete and `prebuild --clean` before deep manual merges.
* **Using Expo Go for iOS entitlement features** - universal links, Sign in with Apple, and app groups need your bundle ID in a dev client or store build.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `eas build --local` | Reproduce cloud iOS build on your Mac | You only need a quick simulator Debug run |
| Xcode Cloud | Team already on Apple CI | Standard Expo teams - EAS Build is simpler |
| `npx react-native run-ios` | Bare RN without Expo prebuild | Expo projects - loses config plugin pipeline |
| VS Code + sweetpad | Lighter editor integration | Complex signing issues - use Xcode GUI |

## FAQs

Do I need a paid Apple Developer account for simulator builds?

* No - simulator builds work with free Apple ID.
* Physical device, TestFlight, and App Store require the **$99/year** program.

Where is the iOS version / deployment target set?

* `expo.ios.deploymentTarget` in `app.config.ts`, or `expo-build-properties` plugin.
* Rebuild native after changing - not an OTA change.

Why does Metro say "No bundle URL present" on device?

* Phone and Mac not on same network, or dev client cannot reach Metro.
* Try `npx expo start --dev-client --tunnel` or USB with appropriate hostname flags.

How do I see native logs?

* Xcode → Window → Devices and Simulators → Open Console.
* CLI: `npx react-native log-ios` or `xcrun simctl spawn booted log stream --predicate 'processImagePath contains "YourApp"'`.

Can I delete DerivedData?

* Yes when builds act haunted: `rm -rf ~/Library/Developer/Xcode/DerivedData`.
* Then `cd ios && pod install && cd ..` and rebuild.

What folder do I commit?

* **CNG:** commit `app.config.ts`, not `ios/`.
* **Bare:** commit `ios/` including `Podfile.lock` - see [CocoaPods & Pod Install](https://docs.wahwei/reactnative.codeguides.io/ios-platform/cocoapods-and-pod-install/).

## Related

* [CocoaPods & Pod Install](https://docs.wahwei/reactnative.codeguides.io/ios-platform/cocoapods-and-pod-install/) - `pod install` and Apple Silicon quirks
* [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/) - push, domains, keychain
* [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB and wireless debugging
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - CNG workflow
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - associated domains and AASA
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - certs and profiles

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
