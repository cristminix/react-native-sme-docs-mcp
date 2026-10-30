# CLI Basics for RN

The **20 terminal commands** you run daily building Expo SDK 57 apps - Metro, prebuild, local native runs, and EAS cloud workflows. Treat this page as a cookbook reference card; platform-specific debugging lives in [xcrun simctl](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/) and [adb](https://docs.wahwei/reactnative.codeguides.io/cli/adb-and-android-devices/).

Highlights / CLI Basics for RN

* npx expo start is the daily entry - add --dev-client when native modules require your bundle ID
* npx expo install pins packages to the SDK 57 matrix - never raw npm install for Expo modules
* npx expo-doctor catches version skew before Metro throws obscure transform errors
* npx expo run:ios and run:android wrap prebuild + native compile for local dev clients
* eas build produces signed store binaries - eas update ships JS-only OTA bundles
* Same npm scripts locally and in CI - lint, typecheck, and test before eas build --non-interactive

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Morning startup (dev client on simulator)
npx expo start --dev-client
npx expo run:ios --simulator "iPhone 16 Pro"   # or: npx expo run:android
 
# Health check before a PR or release
npx expo-doctor
npm run lint && npx tsc --noEmit && npm test -- --ci
 
# Cloud build + submit (after eas.json is configured)
eas build --profile production --platform all --non-interactive
eas submit --platform all --latest --non-interactive
```

**When to reach for this:**

* You need the exact flag for tunnel vs LAN vs dev-client without opening docs.
* A new teammate asks "what do I run after `git clone`?"
* CI scripts should mirror laptop commands - no special-case YAML verbs.
* You are deciding between local `expo run:*` and cloud `eas build`.

## Working Example

**Typical SDK 57 day - from clone to TestFlight-shaped binary:**

```bash
# 1. Install deps (lockfile-driven)
npm ci
 
# 2. Verify SDK alignment
npx expo-doctor
 
# 3. Start Metro for a dev client (not Expo Go)
npx expo start --dev-client --clear
 
# 4. Compile and install native shell (first time or after native dep change)
npx expo run:ios --simulator "iPhone 16 Pro"
# npx expo run:android   # parallel Android path
 
# 5. Add a native-capable package the Expo way
npx expo install expo-camera
npx expo prebuild --platform ios   # only when plugin changes native project
npx expo run:ios
 
# 6. Pre-merge quality gate (same as CI)
npm run lint
npx tsc --noEmit
npm test -- --ci
 
# 7. Production-shaped cloud build
eas build --profile production --platform ios --non-interactive --wait
eas build:list --limit 1 --json > /tmp/last-build.json   # see jq page for parsing
```

**What this demonstrates:**

* **`npm ci`** - deterministic installs; CI and laptops share the same graph.
* **`expo-doctor`** - catches React/RN/Expo version skew before native compile.
* **`expo start --dev-client`** - pairs with a custom dev build, not Expo Go alone.
* **`expo install`** - resolves compatible semver for SDK 57 modules.
* **`eas build --wait`** - blocks until the artifact URL is ready for QA handoff.

## Deep Dive

### The 20 Daily Commands

| # | Command | What it does | When you run it |
| --- | --- | --- | --- |
| 1 | `npx expo start` | Starts Metro bundler and Dev Tools | Every JS iteration session |
| 2 | `npx expo start --dev-client` | Metro tuned for `expo-dev-client` launcher | Daily when using custom dev builds |
| 3 | `npx expo start --clear` | Metro with cache reset | Stale bundle, weird HMR, after dep upgrades |
| 4 | `npx expo start --tunnel` | Expo tunnel when LAN/firewall blocks device | QA on cellular, corporate Wi-Fi |
| 5 | `npx expo install <pkg>` | Adds deps pinned to SDK 57 matrix | Any new `expo-*` or RN community module |
| 6 | `npx expo-doctor` | Validates project against Expo compatibility rules | Before PR, after SDK bump, when builds fail mysteriously |
| 7 | `npx expo prebuild` | Generates `ios/` and `android/` from `app.config.ts` | After config plugin or native entitlement change |
| 8 | `npx expo run:ios` | Prebuild (if needed) + Xcode build + simulator/device install | Local iOS dev client iteration |
| 9 | `npx expo run:android` | Prebuild (if needed) + Gradle assemble + install | Local Android dev client iteration |
| 10 | `npx expo lint` | Runs ESLint with Expo's recommended config | Pre-commit and PR checks |
| 11 | `npx tsc --noEmit` | TypeScript compile check without output | Pre-commit and PR checks |
| 12 | `npm test -- --ci` | Jest in CI-safe mode (no watch) | Every PR and before `eas build` |
| 13 | `eas build` | Cloud native compile with EAS credentials | Store binaries, QA builds, simulator IPAs |
| 14 | `eas build:list` | Lists recent cloud builds (status, artifact URLs) | "Where is my IPA?" after CI |
| 15 | `eas build --local` | Runs EAS build recipe on your machine | Reproduce cloud signing/compile failures |
| 16 | `eas submit` | Uploads latest build to App Store Connect / Play Console | After green QA on production profile |
| 17 | `eas update` | Publishes JS bundle to EAS Update channel | Hotfix JS without store review |
| 18 | `eas credentials` | Manage iOS certs/profiles and Android keystores | Signing errors, new bundle ID, push setup |
| 19 | `npx expo export` | Static export of web or embedded bundle | Web deploy, size audits, offline bundle inspection |
| 20 | `watchman watch-del-all` | Clears Watchman roots (macOS/Linux) | Metro file-watcher stuck after branch switch |

### Command Families

```text
┌──────────────────────────────────────────────────────────────┐
│ Metro / JS loop     │ expo start*, expo export, eas update │
├─────────────────────┼────────────────────────────────────────┤
│ Native shell        │ expo prebuild, expo run:ios/android    │
├─────────────────────┼────────────────────────────────────────┤
│ Quality gates       │ expo-doctor, lint, tsc, jest --ci      │
├─────────────────────┼────────────────────────────────────────┤
│ Cloud ship          │ eas build*, eas submit, eas credentials│
└──────────────────────────────────────────────────────────────┘
```

* **Metro commands** are cheap - run dozens of times per day.
* **Native run commands** are expensive - run after native dep or entitlement changes.
* **EAS commands** cost build minutes - reserve for profiles that match store signing.

### Flags Worth Memorizing

```bash
# Simulator / device targeting
npx expo run:ios --simulator "iPhone 16 Pro"
npx expo run:ios --device
npx expo run:android --device
 
# Non-interactive CI (always pair with EXPO_TOKEN)
eas build --profile preview --platform android --non-interactive --wait
eas submit --platform ios --latest --non-interactive
 
# Inspect last build as JSON (feeds jq recipes)
eas build:list --limit 5 --json --status finished
```

### Bash Notes

```bash
# Prefer npx for one-off Expo/EAS CLIs - avoids global version drift
npx expo-doctor
npx eas-cli@latest build --profile production --platform all
 
# Export token for CI shells (GitHub Actions sets secrets.EXPO_TOKEN)
export EXPO_TOKEN="your-robot-token"
eas whoami   # verify auth before --non-interactive builds
 
# Chain gates the way CI does - fail fast
npx expo-doctor && npm run lint && npx tsc --noEmit && npm test -- --ci
```

## Gotchas

* **`npm install expo-camera` instead of `npx expo install`** - version may not match SDK 57; native build fails in CocoaPods or Gradle. **Fix:** always `npx expo install <pkg>`.
* **`expo start` without `--dev-client` on a custom native build** - launcher cannot find the right entry or dev menu. **Fix:** `npx expo start --dev-client` after `expo run:*`.
* **Running `eas build` without `eas login` / `EXPO_TOKEN` in CI** - interactive prompts hang the job. **Fix:** `eas login` locally; robot token in CI - see [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/).
* **Skipping `expo-doctor` after merging dependabot** - green TypeScript but red native link step. **Fix:** doctor before every `expo run:*` or `eas build`.
* **`expo prebuild` on every JS save** - wipes hand-edited native files under CNG. **Fix:** prebuild only when `app.config.ts`, plugins, or native modules change.
* **Assuming `eas update` replaces entitlements or native modules** - OTA is JS-only. **Fix:** `eas build` when native code or config plugins change.
* **Different commands locally vs CI** - "works on my machine" release failures. **Fix:** npm scripts as single source of truth; CI calls `npm run` targets.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo Go (`expo start` + scan QR) | Learning RN, no custom native modules | Push, universal links, custom native SDKs |
| `eas build --local` | Reproduce cloud compile on a Mac with Xcode | You only need a quick Debug simulator run |
| `npx react-native run-ios` | Bare RN without Expo prebuild pipeline | Expo projects - loses config plugins |
| Global `eas` / `expo` install | You pin versions in every script anyway | Default - `npx` avoids team-wide CLI drift |

## FAQs

Do I need EAS CLI installed globally?

* No - `npx eas-cli@latest <command>` or `npm install eas-cli --save-dev` keeps versions in `package.json`.
* CI should use `expo/expo-github-action` or `npx eas-cli@latest` with `EXPO_TOKEN`.

expo start vs expo run:ios - which first?

* Run `expo run:ios` (or `run:android`) once to install the dev client binary.
* Then `expo start --dev-client` for daily JS reload - Metro stays up across saves.

When is --tunnel required?

* Device and laptop on different networks, or corporate firewall blocks LAN Metro.
* Tunnel is slower - prefer LAN or USB `adb reverse` on Android when possible.

What replaces expo start --ios in SDK 57?

* `npx expo start` plus press `i` in the terminal, or `npx expo run:ios` for native compile.
* There is no separate `expo start --ios` shortcut in modern Expo CLI.

How do I cancel a stuck cloud build?

* `eas build:cancel` - then `eas build:list` to confirm status before retrying.

## Related

* [xcrun simctl & iOS Simulators](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/) - boot, install, logs, screenshots
* [adb & Android Devices](https://docs.wahwei/reactnative.codeguides.io/cli/adb-and-android-devices/) - logcat, port reverse, APK install
* [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/) - parse `eas build:list --json` in CI
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles, `eas.json`, first cloud build
* [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - when `expo run:ios` pulls you into Xcode
* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - `adb` and Gradle mental model

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
