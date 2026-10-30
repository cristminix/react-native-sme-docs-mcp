# Config Plugins in CNG

Composable native changes that survive **`expo prebuild --clean`** (the SDK 57 default). Config plugins encode permissions, entitlements, Gradle dependencies, and manifest entries in version-controlled TypeScript - not hand-edited Xcode clicks.

Highlights / Config Plugins in CNG

* Config plugins mutate ios/ and android/ at prebuild time - not at Metro runtime
* Compose small plugins; chain with withPlugins from @expo/config-plugins
* Idempotent plugins produce zero diff on the second prebuild run
* Library plugins (expo-camera, etc.) ship with maintained SDK 57 support
* Plugin order matters when multiple mods touch Info.plist or build.gradle
* Pair with Native Module Rules before adding custom native patches

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @expo/config-plugins
mkdir -p plugins
```

```ts
// plugins/withMyFeature.ts
import {
  ConfigPlugin,
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} from "expo/config-plugins";
 
const withMyFeature: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMyFeatureUsageDescription =
      "Allow $(PRODUCT_NAME) to use My Feature.";
    return cfg;
  });
 
  config = withAndroidManifest(config, (cfg) => {
    const main = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      main,
      "com.example.MY_FEATURE_ENABLED",
      "true"
    );
    return cfg;
  });
 
  return config;
};
 
export default withMyFeature;
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
import withMyFeature from "./plugins/withMyFeature";
 
const config: ExpoConfig = {
  name: "MyApp",
  slug: "my-app",
  plugins: [
    "expo-router",
    withMyFeature,
    [
      "expo-build-properties",
      { ios: { deploymentTarget: "15.1" } },
    ],
  ],
};
 
export default config;
```

```bash
npx expo prebuild --no-install
npx expo prebuild --no-install   # second run: git diff ios android must be empty
```

**When to reach for this:**

* Adding iOS usage descriptions or Android permissions
* Wiring third-party SDK keys into `Info.plist` / `AndroidManifest.xml`
* Adjusting Gradle `minSdkVersion`, iOS deployment target, or ProGuard rules
* Porting brownfield native edits into reproducible CNG

## Working Example

A composable plugin stack for an app that needs camera access, a custom URL scheme, and a shared deployment target - typical SDK 57 production setup.

```ts
// plugins/withAppLinks.ts
import { ConfigPlugin, withEntitlementsPlist } from "expo/config-plugins";
 
const withAppLinks: ConfigPlugin<{ domain: string }> = (config, { domain }) => {
  return withEntitlementsPlist(config, (cfg) => {
    const key = "com.apple.developer.associated-domains";
    const existing = (cfg.modResults[key] as string[] | undefined) ?? [];
    const entry = `applinks:${domain}`;
    if (!existing.includes(entry)) {
      cfg.modResults[key] = [...existing, entry];
    }
    return cfg;
  });
};
 
export default withAppLinks;
```

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
import withAppLinks from "./plugins/withAppLinks";
 
const config: ExpoConfig = {
  name: "Shop",
  slug: "shop",
  scheme: "shop",
  ios: {
    bundleIdentifier: "com.example.shop",
  },
  android: {
    package: "com.example.shop",
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "Scan product barcodes in the store.",
      },
    ],
    [withAppLinks, { domain: "shop.example.com" }],
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "15.1" },
        android: { minSdkVersion: 24 },
      },
    ],
  ],
};
 
export default config;
```

```bash
# Validate plugin output without full compile
npx expo config --type introspect
 
# Generate and verify idempotency
rm -rf ios android
npx expo prebuild --no-install
npx expo prebuild --no-install
```

**What this demonstrates:**

* **Library plugin first** - `expo-camera` owns camera permission strings
* **Parameterized custom plugin** - `withAppLinks` accepts `domain` and deduplicates entitlements
* **Build properties last** - `expo-build-properties` adjusts toolchain versions after feature plugins
* **Idempotency** - associated domain is appended only if missing

## Deep Dive

### How Config Plugins Work

```
app.config.ts  →  expo prebuild  →  @expo/prebuild-config  →  config plugins (mods)  →  ios/ android/
```

1. **Evaluation:** Expo loads `app.config.ts` and resolves the `plugins` array (strings, tuples, or functions).
2. **Mod pipeline:** Each plugin receives `ExpoConfig` and returns modified config via `with*` helpers (`withInfoPlist`, `withGradleProperties`, etc.).
3. **Template merge:** SDK 57 template files are copied, then mods apply in plugin order.
4. **Clean regen:** Default prebuild deletes folders first - only plugin-encoded changes persist.

### Composition Patterns

| Pattern | Use When |
| --- | --- |
| String plugin `"expo-router"` | Library ships a zero-config plugin |
| Tuple `["expo-camera", { ... }]` | Library plugin needs options |
| Function `withMyFeature` | Custom native mutation |
| Tuple + function `[withAppLinks, { domain }]` | Custom plugin with parameters |
| `withPlugins(config, [a, b, c])` | Group related mods in one file |

```ts
// plugins/index.ts - compose related mods
import { ConfigPlugin, withPlugins } from "expo/config-plugins";
import withAppLinks from "./withAppLinks";
import withPushEnvironment from "./withPushEnvironment";
 
const withNativeStack: ConfigPlugin = (config) =>
  withPlugins(config, [
    [withAppLinks, { domain: "shop.example.com" }],
    [withPushEnvironment, { env: "production" }],
  ]);
 
export default withNativeStack;
```

### Plugin Order Rules

* Plugins that **create base structure** run before plugins that **patch the same file**
* **Entitlements** before features that depend on them
* **`expo-build-properties`** often runs late - deployment target affects other pods
* When debugging, **bisect** the `plugins` array - remove half until prebuild succeeds

### Idempotency Checklist

| Anti-pattern | Fix |
| --- | --- |
| Append same XML every run | Check if node exists before `add` |
| Duplicate `NSCameraUsageDescription` keys | Merge into existing key or use library plugin |
| Regex replace without anchor | Use structured mods (`withInfoPlist`) not text files |
| Global Gradle `apply plugin` twice | Guard with `if (!contents.includes(...))` |

### Debugging

```bash
# See resolved mods without writing ios/android
npx expo config --type introspect
 
# Diff after plugin change
rm -rf ios android && npx expo prebuild --no-install
git diff ios   # if tracked; CNG teams inspect in IDE
 
# Doctor catches invalid plugin config
npx expo-doctor
```

## Gotchas

* **Editing `ios/` after prebuild** - SDK 57 clean default wipes changes. **Fix:** Encode in a plugin.
* **Wrong plugin order** - Later plugin overwrites earlier `Info.plist` key. **Fix:** Document order; use introspect.
* **Non-idempotent append** - Second prebuild duplicates manifest entries. **Fix:** Existence check before add.
* **`npm install` for plugin packages** - Version skew vs SDK 57 native binaries. **Fix:** `npx expo install`.
* **Testing only in Expo Go** - Plugins affecting entitlements need dev client rebuild. **Fix:** `expo run:ios` after plugin merge.
* **Importing from wrong path** - Use `expo/config-plugins` in app plugins; libraries use `@expo/config-plugins` per package docs.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Config plugin (recommended) | Any repeatable native change under CNG | One-off local experiment with no production path |
| Library built-in plugin | Package documents `plugins` entry | Library has no SDK 57 plugin - fork or ADR |
| `expo-build-properties` | SDK versions, ProGuard, deployment target | Complex manifest XML - write a custom plugin |
| Committed native folders (brownfield) | Legacy app with no plugin migration path | Greenfield SDK 57 apps - use CNG |
| `patch-package` on generated files | Emergency hotfix with ADR | Standard workflow - patches lost on clean prebuild |

## FAQs

Where do config plugins run?

At **prebuild time** on the machine running `expo prebuild` or EAS Build - not on every Metro reload. Rebuild native binaries after plugin changes that affect entitlements or native deps.

Can I use config plugins without committing ios/?

Yes - that is the CNG default. Plugins are the source of truth; native folders are ephemeral output.

How do I test a plugin without a full compile?

`npx expo config --type introspect` shows mod results. For final validation, run prebuild twice and confirm zero diff.

What is the difference between app.config plugins and native-modules config-plugins page?

This page focuses on **CNG workflow** - composition, idempotency, and prebuild survival. [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) covers the API surface for module authors.

## Related

* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - what prebuild generates
* [expo prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - clean regen and local iteration checklist
* [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - plugin API for native module authors
* [../native-modules/patching-native-projects/patching-native-projects.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/) - when patches are unavoidable
* [../expo-rules/native-module-rules/native-module-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - Tier 2 install and plugin rules
* [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/) - `expo run:ios/android` after plugins land

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
