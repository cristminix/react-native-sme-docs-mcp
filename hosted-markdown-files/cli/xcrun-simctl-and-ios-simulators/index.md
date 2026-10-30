# xcrun simctl & iOS Simulators

`xcrun simctl` is the **bash-first control plane** for iOS Simulators - boot devices, install dev builds, tail logs, and capture screenshots without living in Xcode. On Expo SDK 57 you still run apps via `npx expo run:ios`; this page covers what to do when Simulator state is wrong, CI needs headless installs, or you need native logs beside Metro.

Highlights / xcrun simctl & iOS Simulators

* xcrun simctl list devices available shows bootable runtimes without opening Simulator.app
* simctl boot + open -a Simulator boots headlessly then brings up the GUI
* simctl install pushes dev-client IPAs and .app bundles without Xcode Run
* simctl io booted screenshot captures CI artifacts and bug reports
* log stream --predicate filters native noise - pair with Metro for JS+native triage
* Simulator is fast for UI; device is truth for push, universal links, and biometrics

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# List bootable simulators (Apple Silicon: prefer arm64 devices)
xcrun simctl list devices available
 
# Boot + show Simulator.app
DEVICE="iPhone 16 Pro"
xcrun simctl boot "$DEVICE" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$(xcrun simctl list devices available | rg "$DEVICE" -m 1 | rg -o '[A-F0-9-]{36}')"
 
# Install a dev build or EAS simulator .app/.tar.gz artifact
xcrun simctl install booted ./build/YourApp.app
 
# Screenshot + logs
xcrun simctl io booted screenshot ./screenshots/home.png
xcrun simctl spawn booted log stream --level debug --predicate 'processImagePath CONTAINS "YourApp"'
```

**When to reach for this:**

* `npx expo run:ios` fails because no simulator is booted.
* You need to install an EAS **simulator build** without recompiling locally.
* QA wants reproducible screenshots for visual regression or App Store attachments.
* Native crash logs never reach the JS redbox - filter Simulator console from the terminal.
* Universal link or deep link smoke tests via `simctl openurl`.

## Working Example

**End-to-end: boot simulator, install EAS dev client, smoke test, capture evidence.**

```bash
#!/usr/bin/env bash
set -euo pipefail
 
APP_NAME="ShopApp"
BUNDLE_ID="com.example.shopapp"
SIM_NAME="iPhone 16 Pro"
ARTIFACT="./ShopApp.app"   # from eas build --profile development --platform ios (simulator)
 
# 1. Resolve UDID
UDID=$(xcrun simctl list devices available -j \
  | jq -r --arg name "$SIM_NAME" '
      .devices | to_entries[].value[] |
      select(.name == $name and .isAvailable == true) | .udid' \
  | head -1)
 
if [[ -z "$UDID" ]]; then
  echo "Simulator not found: $SIM_NAME" >&2
  exit 1
fi
 
# 2. Boot (idempotent) and focus Simulator UI
xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$UDID"
 
# 3. Clean install dev client
xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install "$UDID" "$ARTIFACT"
 
# 4. Launch without Xcode
xcrun simctl launch "$UDID" "$BUNDLE_ID"
 
# 5. Deep link smoke (universal links still need device for full AASA chain)
xcrun simctl openurl "$UDID" "shopapp://orders/42"
 
# 6. Evidence for PR
mkdir -p ./screenshots
xcrun simctl io "$UDID" screenshot "./screenshots/${APP_NAME}-orders.png"
 
# 7. Tail native logs (Ctrl+C to stop) - run in second terminal
xcrun simctl spawn "$UDID" log stream \
  --style compact \
  --predicate "processImagePath CONTAINS \"$APP_NAME\"" \
  --level debug
```

**Pair with Metro in another terminal:**

```bash
npx expo start --dev-client --clear
```

**What this demonstrates:**

* **JSON device list + `jq`** - stable UDID lookup for scripts (see [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/)).
* **`simctl install`** - faster iteration when the native shell is unchanged.
* **`simctl openurl`** - route and scheme testing without tapping through UI.
* **`simctl io screenshot`** - PNG artifacts for CI or bug tickets.
* **`log stream --predicate`** - native-only filter; less noise than Console.app.

## Deep Dive

### How It Works

* **`xcrun`** selects the active Xcode toolchain - commands track your `xcode-select` path.
* **`simctl`** talks to `com.apple.CoreSimulator` - each simulator is a VM-like device with its own filesystem and keychain.
* **`booted`** is a magic alias for whichever simulator is currently booted (only one "primary" booted device in simple workflows).
* **Expo** wraps many flows in `npx expo run:ios --simulator "Name"` - `simctl` is the escape hatch when Expo cannot fix state.

### Boot & Lifecycle

| Command | Purpose |
| --- | --- |
| `xcrun simctl list devices available` | Human-readable inventory |
| `xcrun simctl list devices available -j` | JSON for scripting |
| `xcrun simctl boot <UDID>` | Power on device |
| `xcrun simctl shutdown <UDID>` | Power off |
| `xcrun simctl erase <UDID>` | Factory reset - fixes poisoned keychain / caches |
| `open -a Simulator` | GUI - required for some GPU rendering paths |

```bash
# Shutdown all simulators (free RAM before eas build --local)
xcrun simctl shutdown all
 
# Erase stuck Keychain or Associated Domains cache
xcrun simctl erase booted
```

### Install & Launch

```bash
# Install .app bundle (simulator builds only - not device IPA)
xcrun simctl install booted /path/Build/Products/Debug-iphonesimulator/MyApp.app
 
# Uninstall by bundle ID (matches app.config ios.bundleIdentifier)
xcrun simctl uninstall booted com.example.myapp
 
# Launch - prints PID
xcrun simctl launch booted com.example.myapp
 
# Terminate
xcrun simctl terminate booted com.example.myapp
```

* **Device IPAs** from `eas build --profile production` cannot install on simulator - use a **simulator** or **development** profile artifact.
* After `npx expo prebuild`, the `.app` path often lives under `ios/build/Build/Products/Debug-iphonesimulator/`.

### Logs

```bash
# Compact RN-friendly filter
xcrun simctl spawn booted log stream \
  --style compact \
  --predicate 'subsystem == "com.facebook.react.log" OR processImagePath CONTAINS "MyApp"'
 
# Historical crash reports
xcrun simctl spawn booted log show --last 5m --predicate 'eventType == "logEvent" AND messageType == "error"'
 
# Legacy alias (still works on many setups)
npx react-native log-ios
```

### Screenshots & Video

```bash
# PNG screenshot
xcrun simctl io booted screenshot ~/Desktop/sim-home.png
 
# Record short video (macOS 13+)
xcrun simctl io booted recordVideo ./demo.mov
# Ctrl+C stops recording
 
# Compare screenshots in CI with a known baseline path
mkdir -p artifacts && xcrun simctl io booted screenshot artifacts/ios-tab-bar.png
```

### Permissions & Settings

```bash
# Grant camera/microphone/photos for automated flows
xcrun simctl privacy booted grant camera com.example.myapp
xcrun simctl privacy booted grant photos com.example.myapp
 
# Simulate location
xcrun simctl location booted set 37.7749,-122.4194
 
# Pasteboard (clipboard) for copy/paste E2E
xcrun simctl pbcopy booted "coupon-code-123"
```

### Bash Notes

```bash
# simctl requires Xcode CLT - verify before scripting CI on self-hosted Mac
xcode-select -p
xcrun simctl help
 
# Prefer UDID over device name in scripts - names collide across runtimes
UDID=$(xcrun simctl list devices available -j | jq -r '...')
 
# Apple Silicon: pick arm64 simulator runtimes - x86_64 is slower and breaks some pods
xcrun simctl list devices available | rg "iPhone 16"
```

## Gotchas

* **Installing a device IPA on simulator** - `simctl install` fails with opaque errors. **Fix:** `eas build` with `ios.simulator: true` or local Debug `iphonesimulator` product.
* **No simulator booted** - `booted` alias targets nothing. **Fix:** `xcrun simctl boot <UDID>` before install/screenshot.
* **Assuming simulator proves push or universal links** - APNs and AASA edge cases need hardware. **Fix:** USB device testing - [iOS Basics](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/).
* **Name-based device selection in CI** - "iPhone 15" string changes with Xcode updates. **Fix:** resolve UDID from JSON; pin Xcode image on CI.
* **`erase booted` during active Metro session** - dev client uninstalled, Keychain cleared. **Fix:** reinstall with `simctl install` or `expo run:ios`.
* **Opening `.xcodeproj` instead of workspace** - unrelated to simctl but pairs with native rebuild pain. **Fix:** `open ios/*.xcworkspace` - see [CocoaPods & Pod Install](https://docs.wahwei/reactnative.codeguides.io/ios-platform/cocoapods-and-pod-install/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `npx expo run:ios --simulator` | Daily compile + install + Metro | You already have a fresh `.app` artifact |
| Simulator.app GUI | Visual inspection, accessibility audit | Headless CI - use `simctl` |
| Xcode → Debug → Run | Native breakpoints in `AppDelegate` | Pure JS iteration - stay in Metro |
| Physical device (`expo run:ios --device`) | Push, camera, biometrics, performance truth | Fast UI layout iteration |

## FAQs

How do I list only booted simulators?

* `xcrun simctl list devices booted`
* JSON: `xcrun simctl list devices booted -j`

Can I run simctl on Linux CI?

* No - CoreSimulator is macOS + Xcode only.
* Use EAS macOS workers for iOS simulator builds; run Android on Linux agents.

Where does simctl put app data?

* `~/Library/Developer/CoreSimulator/Devices/<UDID>/data/`
* `erase` wipes this volume - treat it like factory reset.

simctl openurl vs universal links?

* Custom schemes (`myapp://`) work reliably.
* `https://` universal links may open Safari if AASA is not loaded - validate on device before release.

How do I free disk space from old simulators?

* Xcode → Settings → Platforms - delete unused runtimes.
* `xcrun simctl delete unavailable` removes orphaned device pairs.

## Related

* [CLI Basics for RN](https://docs.wahwei/reactnative.codeguides.io/cli/cli-basics-for-rn/) - `expo run:ios` and daily Expo commands
* [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/) - parse `simctl list -j`
* [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - Xcode vocabulary and CNG workflow
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - simulator vs device build profiles
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - why device IPAs differ from simulator builds

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
