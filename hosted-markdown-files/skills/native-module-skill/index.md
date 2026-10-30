# Native Module Skill

Config plugin and TurboModule scaffolding reviews - an **Agent Skill** for safely adding native surface area on **Expo SDK 57** / **React Native 0.86** with CNG and the New Architecture.

Highlights / Native Module Skill

* Skill reviews config plugin idempotency and TurboModule Codegen alignment for RN 0.86 NA
* CNG apps must use plugins - never hand-edit ios/ or android/ without a follow-up plugin
* Prefer create-expo-module for app-local bridges; TurboModules for RN-ecosystem libraries
* Output includes prebuild --clean diff review and npx expo-doctor gate
* New native dependency always triggers eas build - skill must flag OTA-only requests as unsafe
* Cross-check against Config Plugins and Writing a TurboModule human docs

## What This Skill Does

Reviews or scaffolds:

* **Config plugins** (`app.config.ts` + `plugins/with-*.ts`)
* **Expo Modules** via `create-expo-module` layout
* **TurboModule** Codegen specs when RN-ecosystem library patterns apply
* Prebuild diff checklist and `expo-doctor` verification

## When to Invoke

* Adding third-party SDK with manifest / plist / Gradle requirements
* Writing local `plugins/with-custom-feature.ts`
* Evaluating TurboModule vs Expo Modules API for a new bridge
* PR review: "is this plugin idempotent under `prebuild --clean`?"
* Before merging any change that touches `ios/` or `android/` manually

## Inputs

| Input | Why |
| --- | --- |
| `app.config.ts` | Current `plugins` array and order |
| Native requirement | Permissions, entitlements, Gradle flags |
| Package name | npm module or local `./modules/foo` |
| Architecture mode | New Architecture default on RN 0.86 |
| CNG policy | Generated vs checked-in native dirs |

## Outputs

* Plugin skeleton or review checklist (idempotency, ordering)
* `package.json` / autolinking notes
* `npx expo prebuild --clean` + `git diff ios/ android/` steps
* `npx expo-doctor` gate
* **Build required** flag - never approve OTA-only for native changes

## Guardrails

1. **Config plugins over manual native edits** - [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/).
2. **Plugin order matters** - document when multiple plugins touch `Info.plist` or `AndroidManifest.xml`.
3. **Idempotent plugins** - running `prebuild --clean` twice yields empty git diff.
4. **App bridges → `create-expo-module`** - TurboModules for RN-first libraries ([Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/)).
5. **Test on New Architecture device build** - bridge fallback hides sync API bugs on RN 0.86.
6. **Native change → `eas build`** - skill rejects OTA-only release plans.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "15.1" },
        android: { minSdkVersion: 24, compileSdkVersion: 35 },
      },
    ],
    "./plugins/with-analytics-sdk",
  ],
});
```

```ts
// plugins/with-analytics-sdk.ts
import {
  ConfigPlugin,
  withInfoPlist,
  withAndroidManifest,
  createRunOncePlugin,
} from "expo/config-plugins";
 
const withAnalyticsSdk: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.MyAnalyticsEnabled = true;
    return cfg;
  });
  config = withAndroidManifest(config, (cfg) => {
    // add manifest entries - keep idempotent
    return cfg;
  });
  return config;
};
 
export default createRunOncePlugin(
  withAnalyticsSdk,
  "with-analytics-sdk",
  "1.0.0"
);
```

```bash
npx expo prebuild --clean
git diff ios/ android/
npx expo-doctor
eas build --profile preview --platform all   # never OTA-only for this change
```

**When to reach for this skill:**

* Vendor SDK docs say "add this to `AndroidManifest.xml`" - skill converts to plugin
* Engineer pasted manual `ios/Podfile` edit - skill redirects to CNG-safe path
* Library README mentions TurboModule Codegen - skill picks Expo Module vs Turbo path

---

## Working Example

### Path A - Config plugin (most app teams)

**Review checklist the skill emits:**

```markdown
## Config plugin review
- [ ] Uses createRunOncePlugin with name + version
- [ ] No absolute paths; reads from config props
- [ ] Info.plist / manifest changes are merge-safe
- [ ] Documented plugin order relative to expo-build-properties
- [ ] prebuild --clean → review diff → second prebuild → empty diff
- [ ] expo-doctor passes
- [ ] eas build planned (OTA insufficient)
```

See [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/) when upstream lacks a plugin.

### Path B - Expo Module (app-local native bridge)

```bash
npx create-expo-module@latest expo-secure-counter
# Wire in app:
npx expo install ./modules/expo-secure-counter
```

* Autolinking: [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/)
* Prefer over TurboModule for **app-specific** Swift/Kotlin bridges

### Path C - TurboModule (RN ecosystem library)

```ts
// modules/my-turbo-lib/src/NativeMyTurboLib.ts
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";
 
export interface Spec extends TurboModule {
  getConstants(): { value: string };
  process(input: string): string;
}
 
export default TurboModuleRegistry.getEnforcing<Spec>("MyTurboLib");
```

```json
// package.json codegenConfig excerpt
{
  "codegenConfig": {
    "name": "MyTurboLibSpec",
    "type": "modules",
    "jsSrcsDir": "src"
  }
}
```

* Skill verifies **New Architecture** test plan on device
* Third-party without Expo config: [Using Third-Party Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/)

---

## Example Invocation Prompts

```text
Use Native Module skill. SDK 57, CNG (no checked-in ios/android).
Vendor requires NSCameraUsageDescription + Android CAMERA permission for barcode SDK.
Produce config plugin skeleton and app.config.ts plugins array entry.
Include prebuild --clean verification and eas build note.
```

```text
Use Native Module skill - PR review mode.
Attached: plugins/with-payments.ts
Check idempotency, plugin ordering with expo-build-properties, and guardrails.
Do not rewrite vendor code - checklist only.
```

```text
Use Native Module skill.
Need bi-directional native bridge for host app token refresh.
Recommend Expo Module vs TurboModule with RN 0.86 NA default. Scaffold chosen path only.
```

---

## Decision: Expo Module vs TurboModule

| Criterion | Expo Module | TurboModule |
| --- | --- | --- |
| Owner | App team, single app | RN library, multi-consumer |
| Setup | `create-expo-module` | Codegen + `codegenConfig` |
| Config plugin | Often bundled | Usually `react-native.config.js` |
| Expo CNG fit | Excellent | Good with prebuild |
| Skill default | **Yes for app bridges** | When publishing RN package |

---

## FAQs

Can the skill approve a one-line Info.plist hand-edit?

Only as emergency hotfix with follow-up plugin ticket. CNG `prebuild --clean` will erase hand edits - skill must flag debt.

Does adding expo-camera need this skill?

Built-in config plugins often suffice. Invoke skill when combining multiple permission plugins or custom Gradle flags.

OTA after native module?

Never for users on old binaries without the module. Skill output always includes `eas build` and runtimeVersion review.

## Related

* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - plugin cookbook
* [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/) - app-local modules
* [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/) - Codegen skeleton
* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - concepts
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - CNG workflow
* [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/) - build after native change

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
