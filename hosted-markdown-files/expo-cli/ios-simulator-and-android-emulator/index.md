# iOS Simulator & Android Emulator

Virtual devices give you fast iteration on macOS and any desktop - no USB cables, instant resets, and repeatable screenshots for layout QA. Pair them with Expo CLI shortcuts so SDK 57 projects open on the right simulator or AVD every time.

Highlights / iOS Simulator & Android Emulator

* Press i or a in Expo CLI to launch iOS Simulator or Android Emulator
* Shift+I and Shift+A pick a specific device when the default is wrong
* Android 16 (API 36) SDK is required to compile RN 0.86 - install it in Android Studio
* Capture simulator screenshots with xcrun simctl and adb for visual regression baselines
* Run a device matrix across phone, tablet, and OS versions before release

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Start Metro, then open the default virtual device
npx expo start
# Press i → iOS Simulator (macOS only)
# Press a → Android Emulator (ANDROID_HOME + one AVD required)
 
# Pick a specific device interactively
# Shift+I → iOS simulator list
# Shift+A → Android emulator / device list
 
# Launch directly without the interactive menu
npx expo start --ios
npx expo start --android
 
# Capture a screenshot from the booted simulator/emulator
xcrun simctl io booted screenshot ./snapshots/ios-$(date +%Y%m%d-%H%M%S).png
adb exec-out screencap -p > ./snapshots/android-$(date +%Y%m%d-%H%M%S).png
```

**When to reach for this:**

* Daily feature work when a physical device is inconvenient or unavailable.
* Verifying layouts on multiple screen sizes (iPhone SE, Pro Max, Pixel Fold, tablet).
* Capturing baseline screenshots before a styling refactor.
* Reproducing OS-specific bugs on a pinned iOS or Android API level.
* CI smoke tests that boot an emulator and load a development build.

## Working Example

```bash
#!/usr/bin/env bash
# scripts/device-matrix.sh - boot key simulators, capture snapshots, log dimensions
set -euo pipefail
 
OUT_DIR="${1:-./snapshots/matrix-$(date +%Y%m%d)}"
mkdir -p "$OUT_DIR"
 
echo "▶ Starting Metro in background (dev-client assumed)…"
npx expo start --dev-client --non-interactive &
METRO_PID=$!
sleep 8
 
capture_ios() {
  local UDID="$1"
  local LABEL="$2"
  xcrun simctl boot "$UDID" 2>/dev/null || true
  xcrun simctl bootstatus "$UDID" -b
  # Expo CLI targets the most recently opened simulator
  open -a Simulator --args -CurrentDeviceUDID "$UDID"
  sleep 4
  xcrun simctl io "$UDID" screenshot "$OUT_DIR/ios-${LABEL}.png"
  xcrun simctl list devices booted | grep "$UDID" || true
}
 
capture_android() {
  local AVD="$1"
  local LABEL="$2"
  emulator -avd "$AVD" -no-snapshot-load -no-boot-anim &
  adb wait-for-device
  while [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" != "1" ]; do sleep 2; done
  adb exec-out screencap -p > "$OUT_DIR/android-${LABEL}.png"
  adb emu kill
}
 
# iOS matrix - list available runtimes first: xcrun simctl list devices available
capture_ios "iPhone-16-Pro" "iphone-16-pro" || echo "⚠️  Create iPhone 16 Pro in Xcode > Settings > Components"
capture_ios "iPad-mini-A17-Pro" "ipad-mini" || echo "⚠️  Create iPad mini in Xcode Components"
 
# Android matrix - list AVDs: emulator -list-avds
capture_android "Pixel_8_API_36" "pixel-8" || echo "⚠️  Create Pixel 8 API 36 AVD in Android Studio"
 
kill "$METRO_PID" 2>/dev/null || true
echo "✅ Snapshots written to $OUT_DIR"
```

```tsx
// App.tsx - on-screen size label for snapshot review
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
export default function App() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
 
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>Device matrix probe</Text>
      <Text style={styles.row}>Window: {Math.round(width)} × {Math.round(height)}</Text>
      <Text style={styles.row}>Font scale: {fontScale.toFixed(2)}</Text>
      <Text style={styles.row}>Safe top: {insets.top}px · bottom: {insets.bottom}px</Text>
      <View style={styles.card}>
        <Text>Card should stay inside safe area on notched phones and tablets.</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: "#f8fafc" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  row: { fontSize: 14, color: "#475569", marginBottom: 4 },
  card: { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: "#e0e7ff" },
});
```

**What this demonstrates:**

* Expo CLI keyboard shortcuts (`i`, `a`, `Shift+I`, `Shift+A`) as the primary launch path.
* `xcrun simctl` and `adb exec-out screencap` for reproducible visual snapshots outside the app.
* A minimal device-matrix script that boots multiple form factors and writes PNGs to a dated folder.
* `useWindowDimensions` + safe-area insets so screenshots encode the layout context reviewers need.

## Deep Dive

### How It Works

* **`npx expo start`** starts Metro; pressing **`i`** or **`a`** tells Expo CLI to find or boot a simulator/AVD and install **Expo Go** (managed workflow) or open your **development build** if one is installed.
* **Expo CLI targets the most recently opened iOS Simulator** - if multiple simulators are booted, the last one focused wins. Use `Shift+I` to pick explicitly.
* **Android requires `ANDROID_HOME`** on your `PATH` plus at least one AVD created in Android Studio's Virtual Device Manager. Expo CLI invokes `emulator` and `adb` under the hood.
* **Snapshots** here mean PNG captures of the virtual display - useful for visual diffing, design QA, and bug reports. They are not Jest component snapshots (see [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/)).
* **RN 0.86 / SDK 57** compiles against **Android 16 (API 36)** - install that platform in Android Studio before `npx expo run:android` or emulator builds succeed.

### Platform Setup Checklist

| Platform | Prerequisite | Verify |
| --- | --- | --- |
| iOS Simulator | Xcode + iOS platform in **Xcode > Settings > Components** | `xcodebuild -version` and `xcrun simctl list devices available` |
| Android Emulator | Android Studio, **SDK Platform 36**, Build-Tools, Emulator | `echo $ANDROID_HOME` and `emulator -list-avds` |
| Expo CLI device pick | Metro running | `Shift+I` / `Shift+A` lists devices |

```bash
# macOS Android env (add to ~/.zshrc)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
 
# Open Simulator manually when Expo CLI appears stuck
open -a Simulator
```

### Recommended Device Matrix

| Tier | iOS Simulator | Android AVD | Why |
| --- | --- | --- | --- |
| Compact phone | iPhone SE (3rd gen) | Pixel 6a API 36 | Small width, home-indicator layouts |
| Standard phone | iPhone 16 Pro | Pixel 8 API 36 | Notch/Dynamic Island + Material defaults |
| Large phone | iPhone 16 Pro Max | Pixel 8 Pro API 36 | Max width, one-handed reach tests |
| Tablet | iPad mini / iPad Pro 11" | Pixel Tablet API 36 | Split layouts, orientation changes |

Run your heaviest screens on at least **one iOS + one Android** device per tier before a release candidate.

### Simulator Limitations (Expo APIs)

| Hardware / behavior | iOS Simulator | Android Emulator |
| --- | --- | --- |
| Camera | Unavailable | Emulated (limited) |
| Barometer / motion | Unavailable | Partial |
| Push (real APNs/FCM) | Simulated only | Requires Google Play image + setup |
| Background tasks | Suspended aggressively (iOS 11+) | Closer to device, still not identical |

Validate camera, sensors, and push on a **physical device** before shipping.

### Expo CLI Device Commands

| Input / flag | Action |
| --- | --- |
| `i` | Open default or booted iOS Simulator |
| `a` | Open default Android Emulator |
| `Shift+I` | Interactive iOS simulator picker |
| `Shift+A` | Interactive Android picker |
| `--ios` | Start and launch iOS on server start |
| `--android` | Start and launch Android on server start |
| `npx expo run:ios` | Build native app + install on simulator |
| `npx expo run:android` | Build native app + install on emulator/device |

### TypeScript Notes

```tsx
import * as Device from "expo-device";
 
// expo-device is the reliable check - simulators/emulators return isDevice === false
if (__DEV__ && !Device.isDevice) {
  console.log("Virtual device - validate camera, push, and performance on hardware.");
}
```

Install with `npx expo install expo-device`.

## Gotchas

* **Expo CLI stuck on "Opening simulator"** - The Simulator app sometimes ignores the open command. **Fix:** Run `open -a Simulator`, choose **File > Open Simulator**, pick a device, then press `i` again.
* **Wrong iOS simulator receives the bundle** - Multiple booted simulators confuse targeting. **Fix:** Quit extra simulators or use `Shift+I` to select one; Expo CLI always targets the most recently opened.
* **Android `adb` version mismatch** - System `adb` conflicts with SDK `platform-tools`. **Fix:** Put `$ANDROID_HOME/platform-tools` first on `PATH`; verify with `which adb`.
* **Missing Android SDK Platform 36** - Gradle fails with SDK-not-found errors on RN 0.86. **Fix:** Android Studio → **SDK Platforms** → install **Android 16 (API 36)**.
* **Expo Go SDK mismatch on simulator** - Fresh SDK 57 project may not load in an older Expo Go install. **Fix:** Run `npx expo-go download ios 57` or create a development build.
* **Assuming simulator equals device performance** - Simulators use desktop CPU/GPU; jank profiles mislead. **Fix:** Profile on hardware for scroll and animation SLOs.
* **Screenshots with wrong theme or locale** - Matrix shots taken before the app sets appearance look inconsistent. **Fix:** Set theme/locale in app code before capture; store metadata alongside PNGs.

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221u1u3x1v1t1v1z1t20

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| iOS Simulator / Android Emulator | Daily dev, layout matrix, fast resets | Validating camera, haptics, or real push delivery |
| Physical device (USB / wireless) | Hardware fidelity, gestures, store-like behavior | You only need quick JSX iteration on one screen size |
| Expo Go on virtual device | SDK-only modules, fastest onboarding | Project uses custom native code or config plugins |
| Development build on emulator | Custom native modules + dev menu | You want zero native compile during early UI spikes |
| Browser (`w` in Expo CLI) | Web target or shared business logic | Testing native navigation, safe areas, or platform APIs |
| Cloud device farms (BrowserStack, Sauce) | CI on many real devices | Local iteration - too slow for inner dev loop |

## FAQs

How do I open the iOS Simulator from Expo CLI?

Start Metro with `npx expo start`, then press **`i`**. On macOS only - Windows and Linux cannot run the iOS Simulator. Use `Shift+I` to pick a specific model.

How do I open the Android Emulator?

Create an AVD in Android Studio, ensure `ANDROID_HOME` is set, run `npx expo start`, and press **`a`**. Or run `npx expo start --android` to launch on server start.

What Android SDK version does React Native 0.86 require?

**Android 16 (API 36).** Install it under Android Studio → **Settings > Languages & Frameworks > Android SDK > SDK Platforms**.

Why does Expo CLI install Expo Go on my emulator?

In a managed project without a development build, Expo Go is the host native shell. For custom native modules, install `expo-dev-client` and use a development build instead.

How do I take a screenshot of the iOS Simulator?

```bash
xcrun simctl io booted screenshot screenshot.png
```

Replace `booted` with a specific UDID from `xcrun simctl list devices`.

How do I screenshot the Android Emulator?

```bash
adb exec-out screencap -p > screenshot.png
```

Ensure exactly one device is connected: `adb devices`.

Can I run multiple simulators at once?

Yes on iOS - open several via **File > Open Simulator**. Expo CLI targets the most recently opened one. For predictable runs, boot one simulator at a time.

Shift+I does nothing - what should I check?

Confirm Xcode Command Line Tools are installed (**Xcode > Settings > Locations**), accept the Xcode license (`sudo xcodebuild -license`), and that at least one iOS runtime exists under **Settings > Components**.

Does the iOS Simulator support the camera?

No - camera hardware is unavailable. Use a physical device or mock image pickers in dev.

How do I list available Android virtual devices?

```bash
emulator -list-avds
```

Create new AVDs in Android Studio → **Virtual Device Manager**.

What is a device matrix and how many devices do I need?

A device matrix is a fixed set of form factors and OS levels you test every release against. Minimum practical set: compact phone, standard phone, and one tablet on **both** iOS and Android.

Should I use Expo Go or a development build on emulators?

Expo Go is fine for SDK-only spikes. Switch to a development build when you add native modules, custom URL schemes, or plugins that Expo Go does not ship.

How do I reset a corrupted iOS Simulator?

In the Simulator menu: **Device > Erase All Content and Settings**. This fixes stuck installs and low-disk corruption.

Can I develop iOS apps on Windows?

No - the iOS Simulator requires macOS. Use a physical iPhone, a Mac CI worker, or cloud Mac services for iOS builds.

## Related

* [Local Development Basics](https://docs.wahwei/reactnative.codeguides.io/expo-cli/local-development-basics/) - `expo start`, tunnel vs LAN, and QR workflows
* [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB, wireless debugging, and hardware validation
* [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/) - custom dev builds on simulators with native modules
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - when Expo Go on emulators is enough
* [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/) - inspect elements and performance on virtual devices
* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - scaffold SDK 57 before opening simulators

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
