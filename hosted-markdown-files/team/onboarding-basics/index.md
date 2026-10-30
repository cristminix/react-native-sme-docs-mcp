# Onboarding Basics

10 examples for **day-one machine setup** - Xcode, Android Studio, EAS CLI, simulators, and SDK 57 pin - so a new teammate runs the app before lunch.

Highlights / Onboarding Basics

* Pin Node 20 LTS and SDK 57 before cloning - mismatched peers break Metro on hour one
* Xcode + CocoaPods for iOS simulators; Android Studio SDK 35 for emulators
* EAS CLI links your laptop to cloud builds - eas login once, eas build:configure in the repo
* npx expo-doctor is the first command after npm install - catches skew before obscure red screens
* Expo Go is fine for day one; dev clients are the path to native modules and E2E
* Document machine setup in CONTRIBUTING.md so every hire reproduces the same green path

## Prerequisites

Clone the team repo and confirm the SDK contract in `package.json` before installing native tooling. If the project uses the default template, expect Expo Router and managed workflow (no committed `ios/` / `android/` until prebuild or EAS).

```bash
git clone git@github.com:your-org/your-app.git
cd your-app
node -v   # expect 20.x
cat package.json | grep '"expo"'
```

Target stack for this section:

```json
{
  "engines": { "node": ">=20.0.0" },
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. See [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) for scaffold flags and folder layout.

---

## Basic Examples

### 1. Node 20 and Package Manager

Install **Node 20 LTS** with `nvm`, `fnm`, or `mise` - SDK 57 tooling and EAS CLI expect it.

```bash
# nvm example
nvm install 20
nvm use 20
node -v   # v20.x.x
 
npm install
# or: corepack enable && pnpm install
```

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

* **One lockfile** in the repo - use the same package manager the team documents in `CONTRIBUTING.md`
* **`npm ci`** on CI; locally `npm install` is fine after clone
* If `engines` fails, fix Node before chasing Metro errors - wrong Node causes cryptic `transform` failures

> **Related:** [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - lockfile and `.gitignore` hygiene

---

### 2. SDK 57 Pin Verification

The `expo` package version is the compatibility contract for every `expo-*` module.

```bash
npm install
npx expo-doctor
npx expo install --check
```

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

* **`npx expo-doctor`** compares your graph to the SDK 57 matrix - run it on day one and after every `git pull`
* **`npx expo install <pkg>`** resolves peer versions - never hand-pick `expo-camera` without it
* Mismatch symptom: red screen mentioning native module version or Hermes parse errors
* New hires should not bump SDK in week one unless assigned - pin first, upgrade later

> **Related:** [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - `default@sdk-57` scaffold

---

### 3. Environment Variables and Secrets

Copy the example env file before first run - missing API URLs cause silent blank screens.

```bash
cp .env.example .env.local
```

```bash
# .env.example (committed)
EXPO_PUBLIC_API_URL=https://api.staging.example.com
# EAS secrets - not in .env for production builds
```

```ts
// app.config.ts - surface public vars via extra when needed
export default {
  expo: {
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
};
```

* **`EXPO_PUBLIC_*`** vars embed in the JS bundle - never put private keys here
* Production secrets live in **EAS Environment Variables**, not laptop `.env` files
* Ask your lead for **1Password / vault** links to `EXPO_TOKEN`, staging accounts, and TestFlight invites
* Restart Metro after changing env vars: `npx expo start -c`

---

### 4. First Run - Metro and Expo Go

Confirm JavaScript boots before installing multi-gigabyte native IDEs.

```bash
npx expo start
# press i for iOS simulator (requires Xcode)
# press a for Android emulator (requires Android Studio)
# scan QR with Expo Go on a physical device
```

```json
{
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android"
  }
}
```

* **Expo Go** is fastest for Router and UI work - limited native modules
* **`expo start -c`** clears Metro cache when imports look stale after branch switches
* If the project uses **expo-dev-client**, day-one may require a development build - check `eas.json` for `development` profile
* Success criteria: home screen loads, no redbox, `tsc --noEmit` passes

> **Related:** [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routes in `app/`

---

### 5. Xcode and iOS Simulator (macOS)

iOS development requires **Xcode** from the Mac App Store and command-line tools.

```bash
xcode-select --install
sudo xcodebuild -license accept
xcode-select -p
# /Applications/Xcode.app/Contents/Developer
 
# List simulators
xcrun simctl list devices available
 
# Open Simulator app
open -a Simulator
```

```bash
npx expo start --ios
# or: npx expo run:ios
```

* Install **Xcode 16+** compatible with SDK 57 - match what CI/EAS uses when documented
* First `run:ios` may trigger **CocoaPods** (`pod install`) if `ios/` exists or after prebuild
* **Apple Silicon:** simulators are `arm64` - faster than Rosetta x86 images
* Windows/Linux teammates use **EAS Build** for iOS artifacts - no local compile required

---

### 6. Android Studio and Emulator

Android builds need **Android Studio** with SDK Platform 35 and a virtual device (AVD).

```bash
# After Android Studio install - set ANDROID_HOME
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
 
adb devices
emulator -list-avds
```

**Android Studio → SDK Manager:**

* **SDK Platforms:** Android 15 (API 35) - matches RN 0.86 defaults
* **SDK Tools:** Android SDK Build-Tools, Platform-Tools, Emulator

```bash
npx expo start --android
```

* Create an AVD with **Google Play** image when testing Play Services features
* **`adb reverse`** helps Metro reach localhost APIs: `adb reverse tcp:8081 tcp:8081`
* Enable **USB debugging** on physical Android devices for on-device dev

---

### 7. EAS CLI and Expo Account

**EAS CLI** links your machine to Expo's cloud build service - required for store-shaped binaries.

```bash
npm install -g eas-cli@latest
# or project-local: npx eas-cli@latest
 
eas login
eas whoami
 
cd your-app
eas build:configure   # creates eas.json if missing
```

```json
// eas.json (minimal starter)
{
  "cli": { "version": ">= 16.0.0" },
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

* **`eas login`** uses your Expo account - request org invite from mobile lead
* **`eas build:configure`** wires project ID in `app.config.ts` via `extra.eas.projectId`
* CI uses **`EXPO_TOKEN`** robot account - humans use `eas login`; never commit tokens
* First cloud build: `eas build --profile development --platform ios --local` optional; default is cloud

> **Related:** [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles, credentials, first build

---

## Intermediate Examples

### 8. Development Client vs Expo Go

When the app adds custom native modules or config plugins, **Expo Go is not enough** - install a dev client.

```bash
npx expo install expo-dev-client
eas build --profile development --platform ios
# Install IPA via QR from EAS dashboard
npx expo start --dev-client
```

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    }
  }
}
```

* **Development profile** includes `expo-dev-client` and native code from config plugins
* **Simulator builds** (`ios.simulator: true`) install faster for iOS-only UI work
* Rebuild dev client when native deps change - JS-only changes still hot-reload
* Document which profile new hires should install in onboarding doc

> **Related:** [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - `developmentClient: true`

---

### 9. Simulator and Emulator Shortcuts

Standardize device names so pairing sessions and screenshots match.

```bash
# iOS - boot named simulator
xcrun simctl boot "iPhone 16"
open -a Simulator
 
# Android - start AVD by name
emulator -avd Pixel_8_API_35 &
 
# Expo targets specific device
npx expo run:ios --device "iPhone 16"
npx expo run:android --device Pixel_8_API_35
```

```json
// package.json - team shortcuts (optional)
{
  "scripts": {
    "ios:16": "expo run:ios --device 'iPhone 16'",
    "android:pixel": "expo run:android --device Pixel_8_API_35"
  }
}
```

* **Same device class in design reviews** - avoid "works on my iPhone SE" surprises
* Reset simulators when Keychain or push state gets corrupted: `xcrun simctl erase all` (destructive)
* Physical devices: register UDIDs for iOS internal distribution in EAS credentials

---

### 10. Day-One Verification Checklist

Run this script block before opening your first PR - catches 90% of onboarding drift.

```bash
node -v                    # 20.x
npm ci
npx expo-doctor
npm run typecheck          # or: npx tsc --noEmit
npm run lint
npm test -- --passWithNoTests
npx expo start
```

```markdown
## CONTRIBUTING.md excerpt - Machine setup
1. Node 20 via nvm
2. Clone + `npm ci`
3. `cp .env.example .env.local` (ask #mobile for values)
4. `npx expo-doctor` - must pass
5. `npx expo start` - iOS sim + Android emu smoke
6. `eas login` + org invite
7. Install dev client from EAS `development` profile if repo has expo-dev-client
```

* Add **`npx expo customize tsconfig.json`** if typed routes fail on clean clone
* Screenshot passing `expo-doctor` in your onboarding PR if your team tracks hire checklists
* Escalate to platform channel when doctor fails on fresh clone - likely repo drift, not hire error

> **Related:** [Project Setup Best Practices](https://docs.wahwei/reactnative.codeguides.io/project-setup/best-practices/) - conventions that survive week two

---

## FAQs

Do I need both Xcode and Android Studio?

For full-stack mobile teams, yes on macOS - you will touch both platforms in review. Windows/Linux hires can skip Xcode and use EAS for iOS binaries.

Expo Go or dev client on day one?

Expo Go if `package.json` has no `expo-dev-client`. If the README mentions a development build QR, install that first - Expo Go will not load custom native code.

How long does first `eas build` take?

20–40 minutes cloud-side. Start it after lunch on day one while reading the codebase tour - do not block morning Metro setup on it.

What if expo-doctor fails on a fresh clone?

Post output in #mobile with your OS version. Do not manually bump packages - run `npx expo install --fix` only when the lead confirms.

## Related

* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - scaffold, SDK pin, folder layout
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - first cloud build
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - `app/` mental model
* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - what to learn after machine setup
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - where code lives

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
