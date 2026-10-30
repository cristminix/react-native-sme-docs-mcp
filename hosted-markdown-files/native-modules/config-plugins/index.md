# Config Plugins

A cookbook for **`app.config` plugins** that modify `Info.plist`, `AndroidManifest.xml`, and Gradle - the CNG-safe way to wire native modules without manual drift in `ios/` and `android/`.

Highlights / Config Plugins

* Config plugins transform app.config into native project files during prebuild
* Permissions, entitlements, and manifest entries belong in plugins - not hand-edited ios/ or android/
* Plugin order matters when multiple plugins touch the same file - document ordering in comments
* Idempotent plugins survive npx expo prebuild --clean run twice with empty git diff
* Pair with Native Module Rules Tier 2 before merging any plugin change

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    // Built-in permission plugins (Info.plist + AndroidManifest)
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to scan product barcodes",
        microphonePermission: false,
      },
    ],
    // Build-time properties (Gradle, Podfile properties)
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "15.1" },
        android: { minSdkVersion: 24, compileSdkVersion: 35 },
      },
    ],
    // Local plugin for custom native changes
    "./plugins/with-custom-url-scheme",
  ],
});
```

```bash
# Apply plugins and inspect output
npx expo prebuild --clean
git diff ios/ android/   # review generated native changes
 
# Idempotency check - second run should produce no new diff
npx expo prebuild
git diff ios/ android/   # expect empty
```

**When to reach for this:**

* Adding iOS usage descriptions (`NSCameraUsageDescription`) required by native modules.
* Registering Android permissions, intent filters, or `queries` entries for package visibility.
* Tweaking Gradle `minSdkVersion`, ProGuard rules, or iOS deployment targets for a native SDK.
* Shipping a custom native module that needs entitlements or manifest metadata.

## Working Example

### Built-in plugin: camera permissions

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: "ConfigPluginCookbook",
  slug: "config-plugin-cookbook",
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow $(PRODUCT_NAME) to take photos for your profile",
        microphonePermission:
          "Allow $(PRODUCT_NAME) to record audio with video",
        recordAudioAndroid: true,
      },
    ],
  ],
});
```

After `npx expo prebuild`, iOS receives:

```xml
<!-- ios/<App>/Info.plist (generated) -->
<key>NSCameraUsageDescription</key>
<string>Allow ConfigPluginCookbook to take photos for your profile</string>
<key>NSMicrophoneUsageDescription</key>
<string>Allow ConfigPluginCookbook to record audio with video</string>
```

Android receives:

```xml
<!-- android/app/src/main/AndroidManifest.xml (generated excerpt) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Local plugin: custom URL scheme + queries

```ts
// plugins/with-custom-url-scheme.ts
import type { ConfigPlugin } from "expo/config-plugins";
import {
  AndroidConfig,
  IOSConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} from "expo/config-plugins";
 
const SCHEME = "myshop";
 
const withCustomUrlScheme: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (mod) => {
    const urlTypes = mod.modResults.CFBundleURLTypes ?? [];
    const exists = urlTypes.some(
      (entry) =>
        Array.isArray(entry.CFBundleURLSchemes) &&
        entry.CFBundleURLSchemes.includes(SCHEME)
    );
    if (!exists) {
      urlTypes.push({
        CFBundleURLName: "com.example.myshop",
        CFBundleURLSchemes: [SCHEME],
      });
      mod.modResults.CFBundleURLTypes = urlTypes;
    }
    return mod;
  });
 
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
 
    // Deep link intent filter
    AndroidConfig.Manifest.addIntentFilter(app, {
      action: "android.intent.action.VIEW",
      category: ["android.intent.category.DEFAULT", "android.intent.category.BROWSABLE"],
      data: [{ scheme: SCHEME }],
    });
 
    return mod;
  });
 
  return config;
};
 
export default createRunOncePlugin(withCustomUrlScheme, "with-custom-url-scheme", "1.0.0");
```

```ts
// app.config.ts - register local plugin
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: ["./plugins/with-custom-url-scheme"],
});
```

**What this demonstrates:**

* **`withInfoPlist`** mutates iOS metadata idempotently - checks before appending URL types.
* **`withAndroidManifest`** adds intent filters without regex-append drift.
* **`createRunOncePlugin`** prevents duplicate application when prebuild runs multiple times.
* Changes survive **`npx expo prebuild --clean`** - the CNG contract per [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).

### Gradle tweak via expo-build-properties

```ts
// app.config.ts excerpt - native SDK requires higher compileSdk
plugins: [
  [
    "expo-build-properties",
    {
      android: {
        minSdkVersion: 24,
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        extraProguardRules: `
          -keep class com.vendor.sdk.** { *; }
        `,
      },
      ios: {
        deploymentTarget: "15.1",
        useFrameworks: "static",
      },
    },
  ],
],
```

See [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/) for advanced Gradle survival strategies.

## Deep Dive

### Plugin execution model

```
app.config.ts / app.json
        │
        ▼
  plugins: [ "expo-camera", "./plugins/with-custom-url-scheme" ]
        │
        ▼  (sequential, in array order)
  Mod plugins: withInfoPlist, withAndroidManifest, withGradleProperties, …
        │
        ▼
  ios/ android/ written to disk
```

| Mod helper | Target file | Typical use |
| --- | --- | --- |
| `withInfoPlist` | `Info.plist` | Usage descriptions, URL schemes, background modes |
| `withAndroidManifest` | `AndroidManifest.xml` | Permissions, intent filters, `queries` |
| `withGradleProperties` | `gradle.properties` | JVM args, Android flags |
| `withAppBuildGradle` | `app/build.gradle` | Dependencies, packaging options |
| `withEntitlementsPlist` | `.entitlements` | Associated domains, push, keychain groups |

### Plugin ordering

When two plugins modify the same key, **later plugins win**. Document order in `app.config.ts`:

```ts
plugins: [
  "expo-router",           // Must run before plugins that add splash assets
  "expo-camera",           // Permissions first
  "./plugins/with-custom-url-scheme", // App-specific deep links after router
  [
    "expo-build-properties", // Build props last - may depend on prior structure
    { android: { minSdkVersion: 24 } },
  ],
],
```

### Static vs dynamic config

```ts
// app.config.ts - dynamic (env-aware)
import type { ExpoConfig } from "expo/config";
 
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
  plugins: [
    [
      "react-native-maps",
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY ?? "",
      },
    ],
  ],
});
```

Secrets belong in **EAS environment variables**, not committed `.env` files referenced at prebuild time in CI.

### Debugging plugin output

```bash
# Verbose prebuild logs
EXPO_DEBUG=1 npx expo prebuild --clean
 
# Diff only Info.plist
npx expo prebuild --platform ios --clean
diff ios/MyApp/Info.plist ios/MyApp/Info.plist.bak 2>/dev/null || true
 
# Validate with doctor
npx expo-doctor
```

## Gotchas

* **Missing `NS*UsageDescription` strings** - iOS crashes at permission request time. **Fix:** Use the library's config plugin or add `withInfoPlist` entries.
* **Non-idempotent plugins** - second prebuild duplicates manifest entries. **Fix:** Check existence before push; use `createRunOncePlugin`.
* **Editing generated native files directly** - wiped on `--clean`. **Fix:** Move change into a plugin per [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/).
* **Wrong plugin order** - router or splash plugin overwritten. **Fix:** Reorder and re-run prebuild twice to verify idempotency.
* **Android 11+ package visibility** - implicit intent to external apps fails without `<queries>`. **Fix:** `withAndroidManifest` adds `queries` entries.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Built-in Expo config plugin | Library ships `expo-camera`, `expo-location`, etc. | Vendor lib has no plugin |
| Local `expo/config-plugins` mod | One-off entitlements or manifest entries | Large native fork - write proper Expo module |
| `expo-build-properties` | SDK versions, ProGuard, deployment target | Complex multi-file Gradle surgery |
| Brownfield manual native edits | Legacy app not on CNG | Standard SDK 57 greenfield apps |

## FAQs

What is a config plugin?

A function registered in `app.config` `plugins` array that runs during `npx expo prebuild` and modifies native project files programmatically.

Where do plugins live?

Built-in plugins ship inside Expo SDK packages (`expo-camera`, `expo-build-properties`). Custom plugins live in your repo - commonly `plugins/with-*.ts`.

Do plugins run in EAS Build?

Yes. EAS Build runs prebuild (unless disabled), executing the same plugin pipeline as local `npx expo prebuild`.

How do I test idempotency?

Run `npx expo prebuild` twice. `git diff ios/ android/` after the second run must be empty.

Plugin vs native module?

A **native module** implements runtime JS-to-native calls. A **config plugin** configures the native project so the module compiles and has permissions - they often ship together.

## Related

* [Using Third-Party Native Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/) - plugin registration for community libs
* [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/) - modules that ship their own plugin
* [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/) - `expo-build-properties` deep dive
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - Tier 2 install and plugin rules
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - when plugins run
* [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - regeneration survival
* [Expo Prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - CI integration

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
