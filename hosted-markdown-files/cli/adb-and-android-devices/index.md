# adb & Android Devices

`adb` (Android Debug Bridge) is the **terminal interface** to emulators and USB hardware - list devices, reverse Metro ports, tail `logcat`, and install dev builds without opening Android Studio. Expo SDK 57 wraps daily compiles in `npx expo run:android`; this page is the cookbook for when logcat, port forwarding, or APK installs need explicit control.

Highlights / adb & Android Devices

* adb devices -l confirms emulator and USB hardware before expo run:android
* adb reverse tcp:8081 tcp:8081 lets USB devices reach Metro without LAN IP hunting
* adb logcat '\*:S' ReactNativeJS:V filters JS console noise from system spam
* adb install -r pushes EAS APKs and local assembleDebug outputs
* adb shell am start opens deep links and cold-starts the dev client in one line
* Multiple devices require -s SERIAL on every adb subcommand

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Verify toolchain + device
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
adb devices -l
 
# USB dev: Metro port reverse (8081 default)
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client
 
# RN-focused logcat
adb logcat '*:S' ReactNative:V ReactNativeJS:V AndroidRuntime:E
 
# Install dev APK (EAS internal or local debug)
adb install -r ./build/app-debug.apk
adb shell am start -n com.example.app/.MainActivity
```

**When to reach for this:**

* `npx expo run:android` cannot see a device (`no devices/emulators found`).
* USB hardware cannot load the JS bundle - Metro works on emulator but not phone.
* You need native crash stack traces beyond the redbox.
* CI or QA installs a prebuilt APK without Gradle on the laptop.
* Deep link or notification cold-start must be scripted for Maestro prep.

## Working Example

**USB physical device: reverse Metro, install dev client, tail logs, open deep link.**

```bash
#!/usr/bin/env bash
set -euo pipefail
 
PACKAGE="com.example.shopapp"
APK="./shopapp-debug.apk"   # from eas build --profile development --platform android
 
# 1. Single device guard
SERIAL=$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')
if [[ -z "$SERIAL" ]]; then
  echo "No adb device in 'device' state. Enable USB debugging." >&2
  exit 1
fi
echo "Using device: $SERIAL"
 
# 2. Port reverse for Metro (USB)
adb -s "$SERIAL" reverse tcp:8081 tcp:8081
adb -s "$SERIAL" reverse --list
 
# 3. Install / upgrade dev client
adb -s "$SERIAL" install -r "$APK"
 
# 4. Cold start main activity
adb -s "$SERIAL" shell am force-stop "$PACKAGE"
adb -s "$SERIAL" shell am start -n "$PACKAGE/.MainActivity"
 
# 5. Deep link smoke
adb -s "$SERIAL" shell am start -a android.intent.action.VIEW \
  -d "shopapp://orders/42" "$PACKAGE"
 
# 6. Logs in second terminal - native crashes + JS console
adb -s "$SERIAL" logcat '*:S' ReactNative:V ReactNativeJS:V AndroidRuntime:E
```

**Start Metro (separate terminal):**

```bash
npx expo start --dev-client --clear
```

**What this demonstrates:**

* **`-s SERIAL`** - mandatory when emulator and phone are both connected.
* **`adb reverse`** - USB path to Metro without Wi-Fi IP alignment.
* **`install -r`** - replaces existing debug build while keeping app data (usually).
* **`am start -a VIEW -d`** - intent filter / deep link verification from bash.
* **Filtered `logcat`** - surfaces `ReactNativeJS` and fatal `AndroidRuntime` errors.

## Deep Dive

### How It Works

* **`adb`** speaks to `adbd` on the device/emulator over USB or TCP (wireless debugging).
* **Metro** serves JS on `localhost:8081` on your laptop - the device needs a path to that port (`reverse`, shared LAN IP, or tunnel).
* **`npx expo run:android`** invokes Gradle `installDebug` then launches the app - `adb install` skips compile when you already have an APK.
* **Dev clients** built with `expo-dev-client` still need Metro for JS - `adb reverse` is the USB shortcut.

### Device Discovery

```bash
adb devices -l                    # serial, state, model
adb kill-server && adb start-server # reset daemon when devices flap
adb -e <cmd>                        # only emulator
adb -d <cmd>                        # only USB device
```

| State | Meaning | Fix |
| --- | --- | --- |
| `device` | Ready | Proceed |
| `unauthorized` | RSA key not accepted on phone | Tap "Allow USB debugging" |
| `offline` | Cable/driver glitch | Replug, `adb kill-server` |
| empty list | No emulator running | Android Studio AVD or `emulator -avd <name>` |

```bash
# List AVDs and boot one (emulator binary is in ANDROID_HOME)
emulator -list-avds
emulator -avd Pixel_8_API_35 &
adb wait-for-device
```

### Port Reverse & Forward

```bash
# Metro (default 8081)
adb reverse tcp:8081 tcp:8081
 
# DevTools or custom packager port
adb reverse tcp:8082 tcp:8082
 
# Show active reverses
adb reverse --list
 
# Remove all reverses
adb reverse --remove-all
 
# Forward device port to laptop (less common in RN)
adb forward tcp:9000 tcp:9000
```

* **Wi-Fi dev** - skip `reverse`; use `npx expo start --dev-client --host lan` and ensure phone and laptop share subnet.
* **Corporate VPN** - often breaks LAN; try `--tunnel` on Metro or USB `reverse`.

### logcat Recipes

```bash
# RN daily driver
adb logcat '*:S' ReactNative:V ReactNativeJS:V AndroidRuntime:E
 
# Clear buffer before reproducing a crash
adb logcat -c && adb logcat '*:S' ReactNativeJS:V AndroidRuntime:E
 
# Save to file for CI artifact
adb logcat -d > android-logcat.txt
 
# Filter by PID after launch (adb shell pidof)
PID=$(adb shell pidof -s com.example.app)
adb logcat --pid="$PID"
 
# Kotlin/Java crash stack only
adb logcat '*:S' AndroidRuntime:E
```

### Install & Launch

```bash
# Debug APK from expo run:android
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
 
# EAS internal distribution APK
adb install -r ./downloads/shopapp.apk
 
# Uninstall clean
adb uninstall com.example.app
 
# Launch launcher activity
adb shell monkey -p com.example.app -c android.intent.category.LAUNCHER 1
 
# Force stop
adb shell am force-stop com.example.app
 
# Clear app data (logout / corrupted storage)
adb shell pm clear com.example.app
```

* **`applicationId`** in `app.config.ts` (`android.package`) must match `adb` package strings.
* **Play-signed AAB** from production `eas build` is not installable via `adb` - use internal APK/AAB track or `bundletool`.

### Shell Utilities

```bash
# Screenshot (PNG to stdout redirected)
adb exec-out screencap -p > screen.png
 
# Screen record (max 180s on many devices)
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
 
# Input text (ASCII only - no spaces without %s)
adb shell input text "hello"
 
# Open system settings deep link
adb shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS \
  -d package:com.example.app
```

### Bash Notes

```bash
# macOS default SDK path - align with Android Studio install
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
 
# JDK 17 required for RN 0.86 / Expo SDK 57 Gradle
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
 
# Loop until device is ready (CI emulator boot)
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
```

## Gotchas

* **Forgot `adb reverse` on USB** - dev client shows "Unable to load script". **Fix:** `adb reverse tcp:8081 tcp:8081` after every reconnect.
* **Multiple devices, no `-s SERIAL`** - `adb: more than one device/emulator`. **Fix:** `adb devices` then suffix every command.
* **Installing release AAB with `adb install`** - fails; wrong artifact type. **Fix:** internal APK profile or Play internal track - [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/).
* **Logcat flood without filters** - thousands of lines/sec hide RN errors. **Fix:** `'*:S' ReactNativeJS:V` pattern above.
* **`npm install` native module without rebuild** - JS updates but native code stale. **Fix:** `npx expo run:android` or install fresh EAS dev APK.
* **Wireless debugging drops** - `adb disconnect` then re-pair. **Fix:** USB for reliable `reverse` during native debugging.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `npx expo run:android` | Daily Gradle compile + install | APK already built in CI |
| Android Studio Logcat GUI | Multi-filter UI, pinning threads | Headless CI - use `adb logcat` |
| `npx expo start --tunnel` | No USB, LAN blocked | USB available - `reverse` is faster |
| Wireless `adb connect` | Cable-free desk | Need stable Metro during long debug |

## FAQs

Why does emulator see Metro but USB phone does not?

* Emulator uses `10.0.2.2` to reach host localhost - physical devices do not.
* Use `adb reverse` on USB or `--host lan` with correct laptop IP on Wi-Fi.

How do I find the installable APK path after expo run:android?

* `android/app/build/outputs/apk/debug/app-debug.apk` for standard debug builds.
* EAS artifacts download from `eas build:list` - see [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/).

adb unauthorized after macOS update?

* Revoke USB debugging authorizations on the phone (Developer options).
* Replug cable and accept the RSA fingerprint dialog.

Can I grant permissions from adb?

* `adb shell pm grant com.example.app android.permission.CAMERA`
* Runtime permissions still may need in-app prompts on Android 13+ for notifications.

Does adb work on iOS?

* No - use `xcrun simctl` and Xcode devices window for Apple platforms.

## Related

* [CLI Basics for RN](https://docs.wahwei/reactnative.codeguides.io/cli/cli-basics-for-rn/) - `expo run:android` and EAS commands
* [xcrun simctl & iOS Simulators](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/) - iOS counterpart
* [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/) - parse `eas build:list --json` for APK URLs
* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - Gradle, `ANDROID_HOME`, JDK 17
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - development vs preview APK profiles
* [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - Play distribution when `adb install` is not the path

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
