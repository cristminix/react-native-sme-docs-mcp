# create-expo-module

A cookbook for scaffolding a **local native module** with a typed TypeScript surface - the supported path when Expo SDK packages and third-party libraries do not cover your integration.

Highlights / create-expo-module

* npx create-expo-module@latest scaffolds Swift, Kotlin, and TypeScript in one package
* Local modules in modules/ autolink on prebuild - no manual Podfile edits in CNG apps
* Expo Modules API is JSI-first and supports New Architecture on RN 0.86
* Ship a config plugin alongside the module when permissions or entitlements are required
* Custom native modules require an ADR per Native Module Rules - document the owner

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# From your Expo app root
npx create-expo-module@latest modules/attestation
 
# Answer prompts: module name, description, platforms (ios + android)
 
cd modules/attestation
npm install
npm run build   # compiles TypeScript surface
 
# Wire into the app (workspace or file dependency)
cd ../..
npm install ./modules/attestation
 
# Regenerate native projects
npx expo prebuild --clean
npx expo run:ios
```

```ts
// App usage after scaffold
import AttestationModule from "attestation";
 
const result = await AttestationModule.isDeviceTrustedAsync();
```

**When to reach for this:**

* Bridging a vendor SDK (fraud detection, proprietary scanner) with a thin native API.
* Exposing one or two platform APIs not covered by Expo SDK (e.g., custom Keychain access group).
* Sharing native code across multiple apps in a monorepo via `packages/attestation`.
* Prototyping before extracting a publishable npm package.

## Working Example

### 1. Scaffold the module

```bash
npx create-expo-app@latest AttestationApp --template blank-typescript@sdk-57 --yes
cd AttestationApp
npx create-expo-module@latest modules/device-trust
```

Typical output layout:

```text
AttestationApp/
├── app.json
├── package.json
├── App.tsx
└── modules/
    └── device-trust/
        ├── android/
        │   └── src/main/java/expo/modules/devicetrust/DeviceTrustModule.kt
        ├── ios/
        │   └── DeviceTrustModule.swift
        ├── src/
        │   ├── DeviceTrustModule.ts
        │   └── index.ts
        ├── expo-module.config.json
        └── package.json
```

### 2. Implement the native surface

```swift
// modules/device-trust/ios/DeviceTrustModule.swift
import ExpoModulesCore
 
public class DeviceTrustModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeviceTrust")
 
    AsyncFunction("isDeviceTrustedAsync") { () -> Bool in
      // Replace with DeviceCheck / App Attest integration
      #if targetEnvironment(simulator)
      return false
      #else
      return true
      #endif
    }
  }
}
```

```kotlin
// modules/device-trust/android/src/main/java/expo/modules/devicetrust/DeviceTrustModule.kt
package expo.modules.devicetrust
 
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
 
class DeviceTrustModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeviceTrust")
 
    AsyncFunction("isDeviceTrustedAsync") {
      // Replace with Play Integrity API
      !Build.FINGERPRINT.contains("generic")
    }
  }
}
```

```ts
// modules/device-trust/src/DeviceTrustModule.ts
import { requireNativeModule } from "expo-modules-core";
 
type DeviceTrustModuleType = {
  isDeviceTrustedAsync: () => Promise<boolean>;
};
 
export default requireNativeModule<DeviceTrustModuleType>("DeviceTrust");
```

```ts
// modules/device-trust/src/index.ts
export { default } from "./DeviceTrustModule";
```

### 3. Link into the app

```json
// AttestationApp/package.json (excerpt)
{
  "dependencies": {
    "device-trust": "file:./modules/device-trust",
    "expo": "~57.0.4",
    "expo-dev-client": "~6.0.0",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

```tsx
// App.tsx
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import DeviceTrust from "device-trust";
 
export default function App() {
  const [trusted, setTrusted] = useState<boolean | null>(null);
 
  useEffect(() => {
    DeviceTrust.isDeviceTrustedAsync().then(setTrusted);
  }, []);
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Trust Module</Text>
      <Text>Trusted: {trusted === null ? "…" : trusted ? "yes" : "no"}</Text>
      <Button title="Re-check" onPress={() => DeviceTrust.isDeviceTrustedAsync().then(setTrusted)} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
```

```bash
# Build module TS, prebuild, run
cd modules/device-trust && npm run build && cd ../..
npx expo install expo-dev-client
npx expo prebuild
npx expo run:ios
```

**What this demonstrates:**

* **`create-expo-module`** generates matching Swift/Kotlin/TypeScript skeletons with correct `Name("DeviceTrust")` registration.
* **`requireNativeModule`** loads the JSI binding after autolinking compiles native code.
* **`file:./modules/...` dependency** keeps the module local - publish later if reused across repos.
* **Development build** is required - custom modules are never in Expo Go.

### 4. Optional config plugin

If the module needs entitlements, add `app.plugin.js` inside the module package and register it in the app's `app.config.ts`. See [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/).

## Deep Dive

### expo-module.config.json

```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["DeviceTrustModule"]
  },
  "android": {
    "modules": ["expo.modules.devicetrust.DeviceTrustModule"]
  }
}
```

Autolinking reads this file during `npx expo prebuild` and wires Gradle/Pod entries - no manual linking in CNG apps.

### Monorepo placement

| Layout | Path | Dependency |
| --- | --- | --- |
| Single app | `modules/device-trust` | `"file:./modules/device-trust"` |
| Monorepo package | `packages/device-trust` | `"workspace:*"` in app `package.json` |
| Published npm | external registry | `"device-trust": "^1.0.0"` |

For monorepo autolinking nuances, see [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/).

### Module vs TurboModule

| Expo Module (`create-expo-module`) | RN TurboModule (Codegen) |
| --- | --- |
| Expo autolinking + config plugins | RN-first; manual Codegen setup |
| Swift/Kotlin `ModuleDefinition` DSL | C++/Java/ObjC with spec files |
| Best for SDK 57 Expo apps | Best for RN-core libraries without `expo` |

Most app teams should start with **Expo Modules API**. Reach for [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/) when sharing C++ across platforms or upstreaming to RN community.

### ADR requirement

Per [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/), document:

* Why Expo SDK and third-party packages were insufficient
* Named maintainer and review cadence
* New Architecture test plan
* Config plugin ownership for permissions

## Gotchas

* **Forgetting `npm run build` in the module** - app imports stale `build/` output. **Fix:** Add `"prepare": "expo-module build"` or build in CI before app compile.
* **Mismatch between `Name("DeviceTrust")` and `requireNativeModule("DeviceTrust")`** - runtime throw. **Fix:** Keep names identical across Swift, Kotlin, and TS.
* **Testing in Expo Go** - custom module native code not present. **Fix:** Development build always.
* **Skipping prebuild after module scaffold** - Xcode project never references the module. **Fix:** `npx expo prebuild --clean`.
* **Fat native SDK in module repo** - bloated binaries and license risk. **Fix:** Thin bridge module; vendor SDK version pinned in ADR.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo SDK package | Feature exists upstream | Proprietary API |
| Third-party npm native lib | Maintained community bridge | Unmaintained or no New Arch |
| Expo Module (this page) | Thin custom bridge in Expo app | Heavy C++ shared core |
| TurboModule + Codegen | RN ecosystem library | Standard Expo CNG app integration |

## FAQs

Does create-expo-module work outside Expo apps?

Yes, in bare React Native apps with `expo-modules-core` installed via `npx install-expo-modules`. Expo prebuild is still the easiest wiring path.

Can I put the module inside packages/ in a monorepo?

Yes. Use `workspace:*` and enable `autolinkingModuleResolution` - see autolinking page.

How do I add events from native to JS?

Use `Events("onTrustChanged")` in `ModuleDefinition` and `EventEmitter` on the JS side - same pattern as `expo-sensors`.

Do I need a config plugin?

Only when the module requires permissions, entitlements, Gradle dependencies, or manifest metadata not covered by autolinking defaults.

How do I publish the module to npm?

Complete the scaffold, add README and tests, run `npm publish` from `modules/device-trust`. Consumers `npx expo install device-trust` and register any plugin.

## Related

* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when native code is required
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - permissions for custom modules
* [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - monorepo linking
* [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/) - Codegen alternative
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - ADR and tier checklist
* [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/) - run loops and commit policy
* [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - runtime loader

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
