# Local Development Basics

10 examples to get you started with Local Development - 7 basic and 3 intermediate.

Highlights / Local Development Basics

* `npx expo start` launches Metro, prints a QR code, and keeps Fast Refresh running on save
* LAN is the default and fastest path when your laptop and phone share Wi‑Fi
* Tunnel reaches devices across VPNs and corporate firewalls - expect slower reloads
* Press `i` or `a` in the terminal to boot the iOS Simulator or Android emulator without retyping flags
* Expo Go is fastest for SDK-only modules; `expo-dev-client` is required once you add custom native code
* `--clear` resets Metro cache after dependency, Babel, or SDK changes
* Team `package.json` scripts keep host mode and client type consistent across machines

## Prerequisites

Local development with Expo is a **Metro dev server** on your laptop plus a **client app** on a simulator, emulator, or physical device. Scaffold once, then reuse the same start command every day.

```bash
npx create-expo-app@latest MyDevApp --template blank-typescript
cd MyDevApp
```

Confirm the SDK pin before your first run:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Install **Expo Go** on a physical device (App Store / Play Store) if you plan to scan QR codes. Simulators and emulators do not need Expo Go - the CLI opens them directly.

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Metro serves JavaScript on port **8081** by default.

---

## Basic Examples

### 1. Start the Dev Server

`npx expo start` is the daily entry point - it boots Metro, prints connection URLs, and shows a QR code in the terminal.

```bash
cd MyDevApp
npx expo start
```

```text
› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
 
› Press i │ open iOS simulator
› Press a │ open Android emulator
› Press r │ reload app
› Press ? │ show all commands
```

* Metro bundles **on demand** - saving a file triggers **Fast Refresh** without a full native rebuild
* The printed `exp://` URL is what simulators, Expo Go, and dev clients use to download the JS bundle
* Leave this terminal running; open a second tab for `git`, tests, or `eas` commands
* If the server exits immediately, run `npx expo doctor` to catch SDK or Node version mismatches before debugging network issues

> **Related:** [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - project layout and SDK pin | [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/) - what survives a save

---

### 2. LAN Mode (Default)

**LAN** advertises your laptop's local IP so phones and tablets on the same Wi‑Fi can reach Metro - no extra flags required.

```bash
# LAN is the default - Metro advertises your machine's local IP
npx expo start
```

```bash
# Sanity-check that the device can reach your machine (replace with the IP Metro printed)
curl -I http://192.168.1.42:8081/status
```

* LAN keeps traffic on your local network - **lowest latency** and the right default for office and home Wi‑Fi
* Both devices must be on the **same subnet**; guest networks and client isolation often block phone ↔ laptop traffic
* **VPNs** on either side frequently break LAN - disconnect VPN on the device or laptop before switching to tunnel
* Corporate firewalls that block inbound 8081 are the most common reason LAN "works on simulator but not on phone"

> **Related:** [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB debugging and wireless pairing when LAN is unreliable

---

### 3. Tunnel Mode

**Tunnel** routes Metro through Expo's relay so a device can load your bundle even when LAN is blocked - at the cost of speed.

```bash
# Use when LAN QR scans fail on guest Wi‑Fi, VPN, or remote pairing
npx expo start --tunnel
```

```text
› Metro waiting on exp://u3k1-xxxxx.exp.direct:80
› Tunnel ready.
```

* Tunnel is **slower** than LAN - expect longer initial loads and occasionally sluggish Fast Refresh
* First tunnel run may prompt you to log in with `npx expo login` so Expo can provision the relay URL
* Prefer LAN whenever it works; reserve tunnel for demos, client devices off-network, or locked-down corporate Wi‑Fi
* If tunnel hangs at "Connecting…", verify outbound HTTPS is allowed and retry with `npx expo start --tunnel --clear`

> **Related:** [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - when USB or internal builds replace tunnel entirely

---

### 4. QR Code Workflow with Expo Go

Scanning the terminal QR code is the fastest way to open a project on a real device without Xcode or Android Studio.

```bash
npx expo start
# Point your phone at the ASCII QR block in the terminal
```

| Platform | How to scan | Client |
| --- | --- | --- |
| **iOS** | Camera app → tap the `exp://` banner | Opens **Expo Go** (install from App Store if prompted) |
| **Android** | **Expo Go** → **Scan QR code** | Must use Expo Go's built-in scanner - the stock camera app is unreliable |

* The QR encodes the same `exp://` URL Metro prints - scanning is just a shortcut to typing the URL manually
* **Expo Go** ships a fixed native runtime; it only loads projects whose native modules are included in that Expo Go build for SDK 57
* After the first open, the project appears under **Recently opened** inside Expo Go for one-tap relaunch
* If the scan succeeds but the app stalls on "Downloading…", fall back to tunnel (Example 3) or confirm LAN reachability (Example 2)

> **Related:** [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/) - when Expo Go is no longer sufficient | [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - simulator-first workflows

---

### 5. Simulator and Emulator Shortcuts

With Metro running, single-key terminal shortcuts boot simulators without memorizing platform-specific commands.

```bash
npx expo start
```

| Key | Action |
| --- | --- |
| **`i`** | Open the default **iOS Simulator** and load the bundle |
| **`Shift + i`** | Pick a different iOS simulator (screen size, OS version) |
| **`a`** | Open the default **Android emulator** (requires a created AVD) |
| **`Shift + a`** | Pick a different Android emulator |
| **`r`** | Reload the JavaScript bundle |
| **`m`** | Toggle the in-app developer menu on the connected device |
| **`j`** | Open **React Native DevTools** (debugger attached to the running app) |

* Shortcuts only work in the terminal where `expo start` is **focused** - they are not global hotkeys
* **`i` / `a`** compile nothing themselves; they launch the simulator and deep-link into your running Metro server
* If **`a`** reports no emulator, create an AVD in Android Studio → **Device Manager**, then press **`a`** again
* **`j`** opens the RN 0.86 debugger story - element inspector, performance, and component tree without Flipper

> **Related:** [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - AVD setup, snapshots, and device matrix | [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/) - inspector and performance panels

---

### 6. Clear Metro Cache

Stale bundles after dependency or config changes are fixed by restarting Metro with a clean cache.

```bash
# After npm install, SDK bump, or babel.config.js edits
npx expo start --clear
 
# Combine with a host mode when needed
npx expo start --clear --tunnel
```

```bash
# Nuclear option when --clear is not enough (macOS / Linux)
rm -rf node_modules/.cache .expo
npx expo start --clear
```

* **`--clear`** wipes Metro's transform cache - the first reload after is slower, then speed returns to normal
* Run with **`--clear`** after **`npx expo install --fix`**, adding a Reanimated Babel plugin, or upgrading `expo` in `package.json`
* Symptoms that scream "clear the cache": imports resolve to old paths, Fast Refresh never picks up edits, red screens referencing deleted files
* Deleting **`.expo`** resets local CLI state (cached tunnel credentials, last opened device) - safe, but you may need to rescan QR

> **Related:** [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/) - diagnosing stale bundles vs state loss | [Expo CLI Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-cli/best-practices/) - daily hygiene checklist

---

### 7. Team Scripts in package.json

Encode host mode and platform entry points in `package.json` so every developer runs identical commands.

```json
{
  "scripts": {
    "start": "expo start",
    "start:clear": "expo start --clear",
    "start:tunnel": "expo start --tunnel",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "ios:device": "expo run:ios --device"
  }
}
```

```bash
npm run start          # LAN + QR - daily default
npm run start:tunnel   # Pairing session for QA on another network
npm run ios            # Simulator shortcut without an interactive terminal
```

* **`expo start --ios`** and **`--android`** combine Metro boot **and** client launch - useful in CI smoke scripts and VS Code tasks
* **`expo run:ios --device`** compiles and installs on a plugged-in iPhone (requires Apple development signing configured)
* Pin scripts in **`package.json`** instead of documenting one-off flags in README - onboarding stays copy-pasteable
* Pair **`start:clear`** with a post-install hook or document "run after every `git pull` that touches `package-lock.json`"

> **Related:** [Expo CLI Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-cli/best-practices/) - naming conventions and shared troubleshooting runbooks

---

## Intermediate Examples

### 8. Development Client (`expo-dev-client`)

Once you add native modules outside the Expo Go runtime, start Metro in **dev-client** mode so QR codes and URLs open your custom build instead of Expo Go.

```bash
# Install the dev-client library (once per project)
npx expo install expo-dev-client
 
# Build and install the native shell locally (first time, or after native changes)
npx expo run:ios
# npx expo run:android
 
# Daily JS iteration - same Metro server, different client
npx expo start --dev-client
```

```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "ios": "expo start --dev-client --ios",
    "android": "expo start --dev-client --android"
  }
}
```

* **`--dev-client`** changes the QR payload and deep link so installed development builds connect automatically
* You still get **Fast Refresh** - only the native shell is prebuilt; JavaScript loads from Metro as usual
* Rebuild the dev client after **native** changes (`app.json` plugins, new native modules, SDK upgrades) - JS-only edits do not require rebuild
* Press **`s`** in the interactive terminal to switch between **Expo Go** and **development build** when both clients are installed

> **Related:** [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/) - launcher settings and native module iteration | [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - choosing a client model

---

### 9. Localhost vs LAN Host Selection

Simulators on the same machine can use **localhost**; physical devices always need a reachable LAN or tunnel address.

```bash
# Simulators only - Metro listens on 127.0.0.1
npx expo start --localhost
 
# Physical device on desk - LAN is the default (no extra flag)
npx expo start
 
# Force a specific IP when Metro picks the wrong interface (VPN, Docker, Thunderbolt bridge)
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.42 npx expo start
```

| Host | Best for | Device requirement |
| --- | --- | --- |
| **`localhost`** | iOS Simulator, Android emulator on same laptop | Client must share the machine |
| **`lan`** | Physical phone/tablet on same Wi‑Fi | Must resolve laptop's RFC1918 IP |
| **`tunnel`** | Remote stakeholder device, isolated guest Wi‑Fi | Internet access on both ends |

* **`--localhost`** avoids advertising IPs on untrusted networks - useful on coffee-shop Wi‑Fi when you only need the simulator
* **`REACT_NATIVE_PACKAGER_HOSTNAME`** overrides auto-detection when your Mac has multiple active interfaces and Metro prints the wrong one
* Android emulators sometimes need **`adb reverse`** when using localhost-heavy setups - prefer **`--host lan`** for mixed simulator + hardware sessions
* Document the host flag your team uses in **`README`** - "always tunnel" and "always LAN" groups drift quickly without scripted defaults

> **Related:** [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - wireless debugging when hostname overrides are not enough

---

### 10. End-to-End Daily Workflow

Combine client type, host mode, cache policy, and debugger entry into one repeatable loop for SDK 57 projects.

```bash
#!/usr/bin/env bash
# scripts/dev.sh - optional team helper
set -euo pipefail
 
CLIENT="${1:-dev}"   # dev | go
HOST="${2:-lan}"     # lan | tunnel | localhost
 
FLAGS=()
case "${HOST}" in
  tunnel)     FLAGS+=(--tunnel) ;;
  localhost)  FLAGS+=(--localhost) ;;
  lan)        ;; # default - no extra flag
  *) echo "Unknown host: ${HOST}" >&2; exit 1 ;;
esac
 
if [[ "${CLIENT}" == "dev" ]]; then
  FLAGS+=(--dev-client)
elif [[ "${CLIENT}" == "go" ]]; then
  FLAGS+=(--go)
fi
 
# Clear cache on Mondays or after dependency changes
if [[ "${CLEAR_CACHE:-}" == "1" ]]; then
  FLAGS+=(--clear)
fi
 
npx expo start "${FLAGS[@]}"
```

```bash
# Expo Go on office LAN
./scripts/dev.sh go lan
 
# Custom dev client through tunnel for a remote QA device
./scripts/dev.sh dev tunnel
 
# Simulator-only Monday restart with a clean cache
CLEAR_CACHE=1 ./scripts/dev.sh dev localhost
```

**Troubleshooting order** when the app will not connect:

1. Confirm Metro is running and port **8081** is not taken by another RN project.
2. Retry **`npx expo start --clear`** after any `npm install`.
3. Switch host: **LAN → tunnel** (or set **`REACT_NATIVE_PACKAGER_HOSTNAME`**).
4. Verify client type: **Expo Go** for SDK modules only, **`--dev-client`** after `expo run:*`.
5. Press **`j`** to attach **React Native DevTools** if the app loads but behaves incorrectly.

* Scripting the matrix of flags prevents "works on my machine" drift between Expo Go and dev-client teammates
* **`CLEAR_CACHE=1`** as an opt-in env var beats always passing **`--clear`**, which punishes every start unnecessarily
* Keep **`go`** and **`dev`** paths explicit - auto-detecting the installed client fails silently when both apps are on the device
* When step 5 still fails, capture Metro logs and reproduce on simulator (**`i`**) to separate network issues from JavaScript defects

> **Related:** [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/) - attach debugger after the bundle loads | [Flipper & Alternative Debuggers](https://docs.wahwei/reactnative.codeguides.io/expo-cli/flipper-and-alternative-debuggers/) - native-level inspection when JS tools are not enough | [Expo CLI Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-cli/best-practices/) - team conventions and CI handoff

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
