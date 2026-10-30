# Custom Native Code in CNG

Local **`expo run:ios`** / **`expo run:android`** loops and the decision of **when to commit `ios/` and `android/`** in a Continuous Native Generation workflow. Custom native code belongs in `modules/`, config plugins, and EAS Build - not silent Xcode edits that vanish on clean prebuild.

Highlights / Custom Native Code in CNG

* expo run:ios and expo run:android run prebuild then compile locally
* Custom Expo modules live in modules/ and autolink via expo-modules-autolinking
* Default CNG: gitignore ios/ and android/ - commit modules/ and plugins/
* Commit native dirs only with ADR when CNG migration is blocked
* Rebuild dev client after every native code or SDK change
* Pair with create-expo-module before writing raw Swift/Kotlin patches

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx create-expo-app@latest CustomNative --template blank-typescript@sdk-57 --yes
cd CustomNative
npx expo install expo-dev-client expo-modules-core
```

```bash
# Scaffold a local Expo module (preferred over raw bridge code)
npx create-expo-module@latest expo-device-info-plus
# Move into modules/ if the CLI created a sibling folder
```

```text
CustomNative/
├── app.config.ts
├── modules/
│   └── expo-device-info-plus/   # Commit this - source of truth
├── plugins/                     # Commit custom config plugins
├── ios/                         # Gitignore under CNG
└── android/                     # Gitignore under CNG
```

```json
// package.json scripts
{
  "scripts": {
    "ios": "expo run:ios",
    "android": "expo run:android",
    "prebuild": "expo prebuild"
  }
}
```

```bash
npx expo run:ios
# or
npx expo run:android --device
```

**When to reach for this:**

* Debugging a custom Expo module on a physical device
* Iterating on Swift/Kotlin before publishing a module
* Validating autolinking after adding `modules/my-feature/`
* Deciding whether brownfield native folders must stay committed

## Working Example

An app with a local Expo module, a dev client, and CNG gitignore - the standard SDK 57 custom native loop.

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "CustomNative",
  slug: "custom-native",
  ios: { bundleIdentifier: "com.example.customnative" },
  android: { package: "com.example.customnative" },
  plugins: ["expo-dev-client"],
};
 
export default config;
```

```gitignore
# .gitignore - CNG default
ios/
android/
.expo/
```

```tsx
// App.tsx
import * as DeviceInfoPlus from "expo-device-info-plus";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
 
export default function App() {
  const [model, setModel] = useState<string>("…");
 
  useEffect(() => {
    DeviceInfoPlus.getModelAsync().then(setModel);
  }, []);
 
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Device model: {model}</Text>
    </View>
  );
}
```

```bash
# First native compile on a fresh clone
npm install
npx expo run:ios
 
# After changing Swift/Kotlin in modules/
npx expo run:ios --no-build-cache
```

**What this demonstrates:**

* **`modules/` is committed** - native source survives clean prebuild
* **`ios/`/`android/` are generated** - recreated from config + autolinking on each prebuild
* **`expo run:ios`** orchestrates prebuild → pod install → Xcode build
* **Module changes require recompile** - Fast Refresh does not reload native code

## Deep Dive

### The Local Native Loop

```
Edit modules/*.swift or *.kt  →  expo run:<platform>  →  prebuild (if needed)  →  compile  →  device test
```

| Step | Command | Notes |
| --- | --- | --- |
| Generate native projects | `npx expo prebuild` | SDK 57 cleans by default |
| iOS compile + install | `npx expo run:ios` | Requires Xcode |
| Android compile + install | `npx expo run:android` | Requires Android SDK |
| Skip prebuild if folders exist | `expo run:ios --no-bundler` | Variants exist - see `expo run:ios --help` |
| Cloud compile | `eas build --profile development` | No local Xcode |

### What to Commit vs Gitignore

| Path | CNG default | Commit when |
| --- | --- | --- |
| `app.config.ts` | ✅ Commit | Always |
| `plugins/` | ✅ Commit | Always |
| `modules/` | ✅ Commit | Custom Expo modules |
| `ios/` | ❌ Gitignore | Brownfield ADR - manual native maintenance |
| `android/` | ❌ Gitignore | Brownfield ADR - manual native maintenance |
| `patches/` (patch-package) | ⚠️ ADR | Last resort - prefer plugins |

### Integration Paths (Prefer Top to Bottom)

1. **Expo SDK package** - `npx expo install expo-*` with built-in plugin
2. **Community package + config plugin** - verify RN 0.86 / New Architecture support
3. **Local Expo module** - `npx create-expo-module@latest` in `modules/`
4. **Config plugin patch** - for thin native manifest/Gradle changes
5. **Committed native dirs** - brownfield only, with migration plan to CNG

See [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) Tier 1 for the decision tree.

### Autolinking After Prebuild

`expo-modules-autolinking` discovers:

* npm dependencies with `expo-module.config.json`
* Local `modules/*` folders
* Config plugin registrations

```bash
npx expo prebuild --no-install
# Verify Podfile contains expo autolinking script
# Verify android/settings.gradle includes useExpoModules()
```

Missing autolinking manifests as **undefined native module** at runtime - not a Metro error.

### When to Commit Native Directories

Commit `ios/` and `android/` **only** when:

* A **brownfield** app has native code that cannot yet be expressed as plugins
* An **ADR** names the owner, upgrade process, and CNG migration milestone
* **CI** runs `expo prebuild --check` or fingerprint diff to detect drift

Do **not** commit native dirs when:

* Starting a greenfield SDK 57 app
* All native changes live in plugins and `modules/`
* EAS Build generates native projects in CI ([CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/))

### Hybrid Migration Pattern

```bash
# 1. Inventory Xcode/Gradle diffs vs fresh prebuild
rm -rf ios android
npx expo prebuild --no-install
git diff  # against old committed ios/
 
# 2. Port each diff hunk to a config plugin or modules/ change
 
# 3. Final gate: clean prebuild matches behavior
rm -rf ios android && npx expo prebuild
```

Full runbook: [Migrating Manual Native Projects to CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/migrating-manual-native-projects-to-cng/).

## Gotchas

* **Editing generated `AppDelegate` without a plugin** - Lost on SDK 57 clean prebuild. **Fix:** `expo-dev-client` plugin or custom config plugin.
* **Expecting Expo Go to load custom modules** - Expo Go binary is fixed. **Fix:** Dev client via `expo run:ios` or EAS development build.
* **Forgetting rebuild after Swift change** - Metro Fast Refresh only updates JS. **Fix:** Re-run `expo run:ios`.
* **Two copies of react-native in monorepo** - Autolinking picks wrong instance. **Fix:** `npx expo-doctor`, single hoisted `react-native`.
* **Committing `ios/Pods/`** - Massive repo bloat and merge conflicts. **Fix:** Gitignore Pods; `pod install` in CI/EAS.
* **Mixing CNG and hand-edited Gradle** - Prebuild overwrites unencoded edits. **Fix:** `expo-build-properties` or custom plugin.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Local `expo run:*` loop | Daily module development with Xcode/Android Studio | Team has no local toolchains - use EAS development builds |
| EAS development profile | Engineers without Macs; consistent CI binaries | You need sub-minute native iteration - local is faster |
| Committed native dirs | Brownfield blocked on plugin migration | Greenfield CNG apps |
| Published private npm module | Reuse native code across multiple apps | Single-app module - keep in `modules/` |
| Raw React Native TurboModule | Expo Modules API insufficient (rare) | Before trying `create-expo-module` |

## FAQs

Does expo run:ios always run prebuild?

If `ios/` is missing, yes. If `ios/` exists, it uses the existing project - which may be stale. After config plugin changes, run `npx expo prebuild` or delete `ios/` first.

Where should custom Swift code live?

In `modules/<module-name>/ios/` as an Expo module - autolinking wires it on prebuild. Avoid editing generated `ios/MyApp/` directly under CNG.

Can I use Xcode to debug then move changes to a plugin?

Yes - common brownfield migration path. Use `expo prebuild --no-clean` while iterating, then verify clean prebuild reproduces the behavior.

How do third-party native libraries fit CNG?

Install with `npx expo install`, add their config plugin to `app.config.ts`, run prebuild. See [../native-modules/using-third-party-native-libraries/using-third-party-native-libraries.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/).

## Related

* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - generating native projects
* [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - encoding native edits
* [../native-modules/create-expo-module/create-expo-module.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/) - scaffolding local modules
* [../native-modules/writing-a-turbomodule/writing-a-turbomodule.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/) - TurboModule path on RN 0.86
* [../expo-rules/native-module-rules/native-module-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - integration path checklist
* [Migrating Manual Native Projects to CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/migrating-manual-native-projects-to-cng/) - brownfield adoption

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
