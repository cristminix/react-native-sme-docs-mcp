# Physical Device Testing

Simulators are fast; physical devices are truthful. USB and wireless debugging connect your SDK 57 app to real hardware, and **internal distribution** ships installable builds to QA without App Store review - the loop every mobile team needs before production.

Highlights / Physical Device Testing

* Android: enable USB debugging, verify with adb devices, then npx expo run:android
* iOS: trust the Mac, enable Developer Mode on iOS 16+, pair in Xcode Devices window
* Wireless debugging removes the cable after the first USB pairing
* Internal distribution via EAS puts QA builds on TestFlight and Play internal tracks
* Physical hardware is mandatory for camera, push, haptics, and store-like performance

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Android USB - verify the device is visible
adb devices
# Expect: <serial>    device
 
# Run a development build directly on the plugged-in phone
npx expo install expo-dev-client
npx expo run:android --device
 
# iOS USB - pick the connected iPhone in Xcode or:
npx expo run:ios --device
 
# Start Metro for an installed dev client (same Wi‑Fi or USB)
npx expo start --dev-client --lan
 
# Android wireless (Android 11+) after initial USB pairing
adb pair <ip>:<pairing-port>    # one-time, from Developer options
adb connect <ip>:5555
adb devices
 
# Internal QA build (installable .ipa / .apk)
eas build --profile preview --platform all
```

**When to reach for this:**

* Validating camera, biometrics, push notifications, or haptics that simulators fake or skip.
* Measuring scroll performance and memory on real SoCs.
* QA needs an installable build without public store release.
* Debugging LAN issues - USB (`--localhost` / `adb reverse`) bypasses flaky Wi‑Fi.
* Dogfooding a release candidate on teammates' phones via TestFlight or Play internal testing.

## Working Example

```bash
#!/usr/bin/env bash
# scripts/qa-device-session.sh - USB check, dev build, internal preview build
set -euo pipefail
 
PLATFORM="${1:-android}"   # android | ios
 
echo "▶ Checking expo-dev-client…"
npx expo install expo-dev-client
 
if [[ "$PLATFORM" == "android" ]]; then
  echo "▶ Android devices:"
  adb devices
  if ! adb devices | grep -w device | grep -v "List of devices" >/dev/null; then
    echo "❌ No Android device in 'device' state. Enable USB debugging and accept the RSA prompt."
    exit 1
  fi
  npx expo run:android --device
  npx expo start --dev-client --lan
else
  echo "▶ iOS devices (requires Xcode):"
  xcrun xctrace list devices 2>/dev/null || instruments -s devices
  npx expo run:ios --device
  npx expo start --dev-client --lan
fi
```

```json
// eas.json - development (daily) + preview (internal QA distribution)
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "gradleCommand": ":app:assembleDebug" },
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    }
  }
}
```

```bash
# After eas.json exists:
eas login
eas build:configure   # if not already done
 
# Daily dev on your phone
eas build --profile development --platform android
# Install from the QR/link, then:
npx expo start --dev-client
 
# Hand to QA - internal distribution (no store review)
eas build --profile preview --platform ios
eas build --profile preview --platform android
# iOS → TestFlight internal group; Android → direct APK or Play internal track
```

```tsx
// App.tsx - show connection mode so QA can report environment accurately
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
 
export default function App() {
  const [info, setInfo] = useState("Loading…");
 
  useEffect(() => {
    const model = Device.modelName ?? "unknown";
    const os = `${Device.osName} ${Device.osVersion}`;
    const build = Constants.expoConfig?.version ?? "0.0.0";
    const channel = Constants.expoConfig?.extra?.eas?.channel ?? "local";
    setInfo(`${model} · ${os} · v${build} · channel:${channel}`);
  }, []);
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QA device probe</Text>
      <Text style={styles.body}>{info}</Text>
      <Text style={styles.hint}>Shake device → dev menu → Reload after Metro reconnects.</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, textAlign: "center", color: "#334155" },
  hint: { marginTop: 16, fontSize: 12, color: "#64748b" },
});
```

**What this demonstrates:**

* `adb devices` as the gate before Android USB deploys.
* `npx expo run:android --device` / `npx expo run:ios --device` for local native compiles onto hardware.
* `eas.json` profiles separating **development** (dev client + debug) from **preview** (internal QA).
* `expo-device` metadata on screen so bug reports include model and OS.

## Deep Dive

### How It Works

* **USB debugging** exposes the device to `adb` (Android) or Xcode's `devicectl`/`ios-deploy` (iOS). Expo CLI and `npx expo run:*` forward Metro's bundle over the connection.
* **`npx expo start --dev-client`** serves JavaScript to an installed development build - the native shell stays on the phone; JS hot reloads over LAN, tunnel, or USB port forwarding.
* **Wireless debugging** keeps the same Metro URL after you pair once - Android uses `adb pair` + `adb connect`; iOS uses Xcode **Window > Devices and Simulators** wireless pairing (iOS 17+ workflow in Xcode 15+).
* **Internal distribution** (`distribution: "internal"` in `eas.json`) produces ad-hoc iOS IPAs (registered devices) or Android APKs / Play internal track uploads - not public store listings.
* **Preview channel** builds pair well with EAS Update so QA can receive OTA JS bundles after the native shell is installed.

### Android USB Setup

| Step | Location | Notes |
| --- | --- | --- |
| Enable Developer options | **Settings > About phone** → tap **Build number** 7× | Unlocks dev menus |
| USB debugging | **Settings > Developer options** | Toggle on |
| Verify connection | Terminal: `adb devices` | Accept RSA fingerprint on phone |
| Run app | `npx expo run:android --device` | Builds debug APK, installs, starts Metro |

```bash
# USB port reverse - device hits laptop localhost (works when LAN is blocked)
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

### iOS USB Setup

| Step | Action |
| --- | --- |
| Trust this computer | Tap **Trust** on the iPhone prompt |
| Developer Mode | **Settings > Privacy & Security > Developer Mode** (iOS 16+) - reboot required |
| Register device | Xcode **Window > Devices and Simulators** - team provisioning |
| Run app | `npx expo run:ios --device` or pick device in Xcode |

Free Apple IDs can deploy to your own device for limited testing; team distribution needs an Apple Developer Program membership.

### Wireless Debugging

| Platform | Pair once | Connect for sessions |
| --- | --- | --- |
| Android 11+ | **Wireless debugging** → **Pair device with pairing code** → `adb pair ip:port` | `adb connect ip:5555` |
| iOS | Connect via USB → Xcode **Devices** → **Connect via network** checkbox | Same Mac network; device shows as wireless in Xcode |

After wireless `adb connect`, run `npx expo start --dev-client --lan` and ensure the phone and laptop share a subnet (guest Wi‑Fi often blocks peer traffic).

### Internal Distribution Profiles

| Profile | `developmentClient` | `distribution` | Typical output |
| --- | --- | --- | --- |
| `development` | `true` | `internal` | Debug dev client for engineers |
| `preview` | `false` | `internal` | QA/release-candidate APK or TestFlight internal |
| `production` | `false` | `store` | App Store / Play production |

```bash
# Register iOS test devices before ad-hoc/internal iOS builds
eas device:create
 
# Submit preview iOS build to TestFlight internal testers
eas build --profile preview --platform ios
eas submit --platform ios --latest
```

### Connection Modes for Metro

| Flag | Device reaches Metro via | Use when |
| --- | --- | --- |
| `--lan` | `http://<laptop-ip>:8081` | Phone and Mac on same trusted Wi‑Fi |
| `--localhost` + `adb reverse` | `http://127.0.0.1:8081` on device | Corporate Wi‑Fi isolates clients |
| `--tunnel` | Expo tunnel URL | Remote QA or restrictive networks (slower) |

### TypeScript Notes

```tsx
import * as Device from "expo-device";
 
if (__DEV__ && Device.isDevice) {
  console.log(`Physical device: ${Device.modelName}, OS ${Device.osVersion}`);
}
```

Install with `npx expo install expo-device` - versions align with SDK 57 automatically.

## Gotchas

* **`adb devices` shows `unauthorized`** - The RSA prompt was dismissed. **Fix:** Revoke USB debugging authorizations on the phone, replug USB, accept the prompt.
* **iOS build fails with provisioning errors** - Device UDID not in the profile. **Fix:** Run `eas device:create` and rebuild, or register the device in Apple Developer portal.
* **Metro unreachable on LAN** - Guest networks block device-to-laptop traffic. **Fix:** Use `adb reverse` + `--localhost` on Android, or `--tunnel` on both platforms.
* **Expo Go on device mismatches SDK 57** - App Store Expo Go may lag your project SDK. **Fix:** Use a development build; Expo Go cannot load arbitrary native modules anyway.
* **Wireless `adb` drops silently** - Phone slept or changed IP. **Fix:** `adb connect` again; keep Developer options wireless debugging enabled.
* **Internal iOS build won't install** - Tester device not registered. **Fix:** Collect UDIDs via `eas device:create` link before `preview` builds.
* **QA tests debug performance** - Debug builds include dev tooling overhead. **Fix:** Ship `preview` or release builds for performance sign-off.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| USB debugging | First pairing, fastest bundle load, `adb reverse` | Cable length is a hard constraint |
| Wireless debugging | Desk-free iteration after pairing | Initial setup or unstable office Wi‑Fi |
| `eas build --profile development` | Teammates without Android Studio / Xcode | You need native C++ iteration every hour |
| `eas build --profile preview` | QA on many devices, TestFlight internal | You only need your own phone for JSX tweaks |
| Simulators / emulators | Layout iteration, automated screenshots | Camera, push, or real-world performance |
| Public TestFlight / Play open testing | Wider beta before launch | Features under NDA or incomplete backend |

## FAQs

How do I verify my Android phone is connected?

```bash
adb devices
```

You should see your serial number with the state **`device`**. If it says `unauthorized`, accept the debugging prompt on the phone.

How do I run my Expo app on a physical iPhone?

Install Xcode, enable **Developer Mode** on the phone, trust the Mac, then run `npx expo run:ios --device` or select the device in Xcode. For cloud builds, use `eas build --profile development --platform ios` and install from the link.

What is the difference between expo start and expo start --dev-client?

`--dev-client` targets your custom development build instead of Expo Go. Required once `expo-dev-client` and custom native modules are in the project.

How does wireless debugging work on Android?

On **Developer options > Wireless debugging**, pair with `adb pair <ip>:<port>` using the six-digit code, then `adb connect <ip>:5555`. The device should appear in `adb devices` without USB.

How do I enable wireless debugging on iOS?

Connect via USB, open Xcode **Window > Devices and Simulators**, select your iPhone, and check **Connect via network**. After pairing, Xcode and `npx expo run:ios --device` can target the wireless device.

What is internal distribution in EAS?

`"distribution": "internal"` in `eas.json` produces builds for registered testers - ad-hoc iOS IPAs, Android APKs, or Play internal track - without public store release.

When should I use the preview profile vs development?

**development** - engineers with dev menus and fast iteration.**preview** - QA builds closer to production, installable via TestFlight internal or APK link.

Metro cannot connect on Wi‑Fi - what now?

Try `npx expo start --dev-client --tunnel`, or on Android run `adb reverse tcp:8081 tcp:8081` and start with `--localhost`.

Do I need expo-dev-client for physical device testing?

Only if you use native modules beyond Expo Go's bundle. For SDK-only spikes, scan the QR with Expo Go. Most production apps outgrow Expo Go quickly.

How do I register iOS devices for internal builds?

```bash
eas device:create
```

Share the registration URL with testers before running `eas build --profile preview --platform ios`.

Can I install an Android preview build without Google Play?

Yes - set `"buildType": "apk"` under the Android profile. EAS provides a direct download link you can share in Slack or email.

Why is my physical device slower than the simulator?

Debug builds include dev tooling, Metro network overhead, and real thermal throttling. Use release or preview builds for representative performance.

What hardware features must be tested on a real device?

Camera, push notifications, biometrics, haptics, precise GPS, barometer, and background tasks. Simulators omit or fake these.

How do I share a build with non-developer QA?

Run `eas build --profile preview`, distribute the install link or TestFlight invite, and document the Metro channel if you also push EAS Update bundles.

## Related

* [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - fast virtual devices for daily layout work
* [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/) - dev menu, launcher, and native module iteration on device
* [Local Development Basics](https://docs.wahwei/reactnative.codeguides.io/expo-cli/local-development-basics/) - tunnel vs LAN when the device cannot reach Metro
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - when Expo Go on a phone is still enough
* [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - staging API URLs in preview builds
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - ad hoc, enterprise, and store internal tracks

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
