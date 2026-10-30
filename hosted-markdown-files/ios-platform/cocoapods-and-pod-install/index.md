# CocoaPods & Pod Install

Podfile.lock hygiene and Apple Silicon simulator quirks - the CocoaPods cookbook React Native developers need when `npx expo run:ios` fails in `Pods/`, EAS Build reports a pod resolution error, or an M-series Mac picks the wrong simulator architecture.

Highlights / CocoaPods & Pod Install

* Run npx pod-install from the repo root - it picks the right Ruby/CocoaPods env
* Commit Podfile.lock when ios/ is in git; regenerate when ios/ is CNG-gitignored
* Apple Silicon: use arm64 simulators; avoid Rosetta-only x86\_64 simulator runtimes
* expo-modules-autolinking writes Podfile entries - do not hand-edit for standard packages
* CDN trunk failures are transient - retry pod install before chasing phantom header errors
* Clean pods when upgrades hallucinate: rm -rf Pods Podfile.lock && npx pod-install

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Preferred entry point from project root (Expo wraps CocoaPods)
npx pod-install
 
# Equivalent when already in ios/
cd ios && pod install && cd ..
 
# Full native regen (CNG) then pods
npx expo prebuild --platform ios
npx pod-install
 
# Nuclear reset when pods are corrupted after an SDK bump
rm -rf ios/Pods ios/Podfile.lock ios/build
npx expo prebuild --platform ios
npx pod-install
npx expo run:ios
```

**When to reach for this:**

* `The sandbox is not in sync with the Podfile.lock` after a git pull.
* Adding or removing a native module (`expo-camera`, `react-native-maps`, etc.).
* Upgrading Expo SDK or React Native - pod versions shift.
* Simulator build fails with architecture errors on Apple Silicon.
* EAS Build passes locally but fails - lockfile drift between teammates.

## Working Example

**Step 1 - Know what owns the Podfile**

Under Expo SDK 57, `npx expo prebuild` generates:

```ruby
# ios/Podfile (excerpt - do not hand-maintain autolinking block)
require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")
 
target 'ShopApp' do
  use_expo_modules!
  config = use_native_modules!
  use_react_native!(:path => config[:reactNativePath], :hermes_enabled => true)
end
```

Native modules from `package.json` appear via **autolinking** - not manual `pod 'SomeLibrary'` lines unless a library's docs explicitly require it.

**Step 2 - Add a native dependency the right way**

```bash
npx expo install expo-camera
npx expo prebuild --platform ios   # applies plugin + Podfile entries
npx pod-install
npx expo run:ios
```

**Step 3 - Podfile.lock hygiene**

| `ios/` in git? | Podfile.lock policy |
| --- | --- |
| **Yes** (bare / committed native) | **Commit** `Podfile.lock` - CI and EAS must resolve identical pod versions |
| **No** (CNG / gitignored) | Lockfile is **ephemeral** - EAS regenerates on each build; still commit `package-lock.json` |

```bash
# After intentional pod upgrades on committed ios/
git add ios/Podfile.lock
git commit -m "chore(ios): pin pods after expo-camera add"
```

**Step 4 - Apple Silicon simulator selection**

```bash
# List runtimes - prefer arm64 (Apple Silicon) simulators
xcrun simctl list devices available | grep -E "iPhone|Booted"
 
# Run on a named arm64 simulator
npx expo run:ios --simulator "iPhone 16 Pro"
```

In Xcode → Product → Destination: avoid simulators marked **Rosetta** unless a legacy pod forces x86\_64 (rare on SDK 57).

**Step 5 - Fix "building for iOS Simulator, but linking in object file built for iOS"**

```bash
# 1. Ensure no mixed-arch caches
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ios/Pods ios/build
 
# 2. Reinstall pods
npx pod-install
 
# 3. Rebuild
npx expo run:ios --simulator "iPhone 16 Pro"
```

If a **third-party** pod ships prebuilt x86\_64 binaries only, options are: upgrade the pod, pick an arm64-compatible version, or temporarily use a Rosetta simulator as a bridge - not a long-term fix.

**What this demonstrates:**

* **`npx pod-install`** is the cross-platform entry point Expo documents.
* **Lockfile discipline** prevents "works on my Mac" EAS failures.
* **Architecture alignment** between simulator runtime and compiled pods.
* **Autolinking** replaces manual Podfile edits for ecosystem modules.

## Deep Dive

### pod install vs pod update

| Command | Effect |
| --- | --- |
| `pod install` | Resolves from **Podfile.lock** when present; adds/removes pods to match Podfile |
| `pod update SomePod` | Bumps `SomePod` to latest allowed by Podfile - **changes lockfile** |
| `pod update` | Updates everything - avoid on release branches |

On teams with committed `ios/`, run `pod install` after pull - not `pod update` - unless you intend to upgrade native deps.

### Expo prebuild and pods

```
package.json deps
      ↓
expo-modules-autolinking + RN autolinking
      ↓
ios/Podfile (generated)
      ↓
pod install → Pods/ + Podfile.lock
      ↓
YourApp.xcworkspace
```

Config plugins may inject pod subspecs or `use_frameworks!` - see [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/). If a plugin and manual Podfile edit conflict, **plugin wins on next prebuild**.

### Apple Silicon notes (M1/M2/M3/M4)

* **Host**: CocoaPods and Xcode run natively on Apple Silicon - Rosetta for CocoaPods is not required on modern Expo/RN.
* **Simulator**: Default iOS simulators are **arm64** - matches device ARM architecture, faster than Rosetta x86\_64.
* **"My Mac (Designed for iPad)"** - Mac Catalyst destination; not your RN iOS app target.
* **`USE_FRAMEWORKS=static`** - some CI scripts set this for Firebase; match EAS `eas.json` `env` with local builds.

### CDN and network failures

```text
[!] CDN: trunk URL couldn't be downloaded: https://cdn.cocoapods.org/...
```

```bash
# Retry with repo update
cd ios && pod install --repo-update && cd ..
 
# Persistent corporate proxy: set HTTP_PROXY / HTTPS_PROXY for the shell running pod install
```

### Ruby environment

EAS Build manages Ruby/CocoaPods on cloud workers. Locally:

* macOS system Ruby is deprecated - Homebrew Ruby or `rbenv` is fine.
* `npx pod-install` uses the project's expected path; prefer it over guessing `pod` on PATH.
* `sudo gem install cocoapods` causes permission pain - use user-level gem installs.

### New Architecture (SDK 57 default)

React Native 0.86 enables New Architecture by default. Pods compile as Fabric/TurboModule-aware. If a **legacy** library is not compatible, `expo-doctor` and compile errors surface early - fix by upgrading or replacing the library, not by disabling New Arch in production without an ADR.

## Gotchas

* **Manual `pod 'ExpoModulesCore'` lines** - duplicated with autolinking, duplicate symbol errors. **Fix:** remove hand edits; `npx expo prebuild --clean`.
* **Committing `Pods/` directory** - bloated repo, merge hell. **Fix:** commit `Podfile.lock` only; ignore `Pods/` in `.gitignore` (Expo default).
* **Stale lockfile after branch switch** - sandbox sync errors. **Fix:** `npx pod-install` or delete `Pods/` and reinstall.
* **Running pod from wrong directory** - creates stray `Pods/` at repo root. **Fix:** only run inside `ios/` or use `npx pod-install` from root.
* **x86\_64 simulator on arm64 Mac for daily dev** - slow and architecture mismatch errors. **Fix:** use arm64 simulator runtimes from Xcode → Settings → Platforms.
* **Different CocoaPods versions across teammates** - lockfile churn. **Fix:** document CocoaPods version in README; EAS ignores local drift by clean prebuild.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Swift Package Manager | Pure Swift deps, no RN ecosystem | React Native pods - ecosystem is CocoaPods-first |
| `eas build --local` | Reproduce cloud pod resolution | Quick JS-only iteration |
| `npx expo prebuild --clean` | ios/ is generated and haunted | Committed native with hand merges you must preserve |
| `use_frameworks! :linkage => :static` | Firebase / gRPC docs require it | Default RN apps - adds build time |

## FAQs

Should I run pod install before or after npm install?

* Always **`npm install` first** - autolinking reads `node_modules`.
* Then `npx expo prebuild` (if using CNG) then `npx pod-install`.

Does EAS Build run pod install for me?

* Yes - when `ios/` is absent, EAS runs `expo prebuild` which includes pod installation.
* When `ios/` is committed, EAS uses your folder and runs `pod install` on the worker.

Why does expo prebuild --clean delete my Podfile edits?

* CNG assumes native is generated - hand Podfile edits are not durable.
* Encode changes in a **config plugin** or maintain committed `ios/` without `--clean`.

Can I use Bundler for CocoaPods?

* Yes - some teams add `Gemfile` with `cocoapods` pin and run `bundle exec pod install`.
* `npx pod-install` remains the simplest Expo default.

What about use\_modular\_headers!?

* Occasionally required for Swift pods in mixed targets.
* Prefer `expo-build-properties` or a config plugin over one-off manual Podfile hacks.

## Related

* [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - workspace, schemes, Xcode entry
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - when `ios/` regenerates
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - durable native changes
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - adding packages safely
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - cloud iOS compile

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
