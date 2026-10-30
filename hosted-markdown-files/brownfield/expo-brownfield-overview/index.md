# expo-brownfield Overview

Cookbook for shipping **Expo modules inside existing iOS/Android shells** - from `expo-brownfield` install through artifact publish and host-app integration.

Highlights / expo-brownfield Overview

* expo-brownfield packages your Expo app as Android AAR and iOS XCFramework or Swift Package
* Config plugin generates BrownfieldActivity, ReactNativeViewController, and messaging APIs
* Isolated approach lets native CI consume Maven/Swift Package without Node.js
* Debug builds load from Metro; release artifacts embed the Hermes bundle
* build:ios --package produces a self-contained Swift Package for Xcode local dependencies
* Pair expo-build-properties usePrecompiledModules on iOS for faster artifact builds

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# 1. Create RN module (separate repo or monorepo package)
npx create-expo-app@latest CheckoutModule --template default@sdk-57
cd CheckoutModule
npx expo install expo-brownfield
```

```json
// app.config.ts - plugin + optional iOS precompiled modules
{
  "expo": {
    "scheme": "checkout",
    "plugins": [
      ["expo-build-properties", { "ios": { "usePrecompiledModules": true } }],
      [
        "expo-brownfield",
        {
          "ios": { "targetName": "CheckoutBrownfield" },
          "android": {
            "group": "com.example",
            "libraryName": "checkout-brownfield",
            "package": "com.example.checkout.brownfield",
            "version": "1.0.0"
          }
        }
      ]
    ]
  }
}
```

```bash
# 2. Generate native brownfield targets (debug native code, CI codegen)
npx expo prebuild
 
# 3. Build artifacts
npx expo-brownfield build:android --release
npx expo-brownfield build:ios --release --package CheckoutPackage
 
# 4. Dev loop - Metro + host debug build
npx expo start
# Launch host app from Xcode / Android Studio → RN screen loads from Metro
```

```kotlin
// Android host - build.gradle.kts dependency (version from plugin config)
dependencies {
  implementation("com.example:checkout-brownfield:1.0.0")
}
```

```swift
// iOS host - AppDelegate + present RN
import CheckoutBrownfield
 
ReactNativeHostManager.shared.initialize()
 
let vc = ReactNativeViewController(moduleName: "main", initialProps: ["cartId": id])
navigationController?.pushViewController(vc, animated: true)
```

**When to reach for this:**

* Native squads **cannot** add Node/Yarn/Metro to their release pipeline - consume **pre-built AAR or Swift Package** instead.
* You want **Expo SDK 57 modules** (camera, secure store, router) inside a **UIKit / Compose** shell without rewriting the host app.
* Product strategy is **strangler fig** - ship one RN-powered flow while legacy native screens remain.
* You need **bi-directional messaging** (`BrownfieldMessaging`) between host and RN without writing a custom TurboModule on day one.

---

## Step-by-Step Cookbook

### 1. Scaffold the Expo module

The RN project does **not** have to live inside the native repo. A monorepo `packages/checkout-rn/` or a separate Git repository both work.

```bash
npx create-expo-app@latest CheckoutModule --template default@sdk-57
cd CheckoutModule
npx expo install expo-brownfield
```

Confirm SDK pin:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "expo-brownfield": "~57.0.3",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Structure screens with thin routes and fat features per [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/).

---

### 2. Configure the plugin

`expo-brownfield` adds a config plugin that generates:

* **Android:** library module with `BrownfieldActivity`, `ReactNativeFragment`, `ReactNativeHostManager`, `BrownfieldMessaging`
* **iOS:** framework target with `ReactNativeViewController`, `ReactNativeView` (SwiftUI), `ReactNativeHostManager`, `BrownfieldMessaging`

```typescript
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "Checkout Module",
  slug: "checkout-module",
  scheme: "checkout",
  plugins: [
    [
      "expo-brownfield",
      {
        ios: {
          targetName: "CheckoutBrownfield",
          bundleIdentifier: "com.example.checkout.brownfield",
        },
        android: {
          group: "com.example",
          libraryName: "checkout-brownfield",
          package: "com.example.checkout.brownfield",
          version: "1.0.0",
          publishing: [{ type: "localMaven" }],
        },
      },
    ],
  ],
};
 
export default config;
```

Run prebuild to materialize targets:

```bash
npx expo prebuild
```

See [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) for idempotent plugin patterns when combining `expo-brownfield` with other native modifiers.

---

### 3. Build Android AAR

```bash
npx expo-brownfield build:android --release
```

Default publish target is **local Maven** (`~/.m2`). Host `build.gradle.kts` needs:

```kotlin
dependencyResolutionManagement {
  repositories {
    google()
    mavenCentral()
    mavenLocal()
  }
}
 
dependencies {
  implementation("com.example:checkout-brownfield:1.0.0")
}
```

Present RN from the host:

```kotlin
import com.example.checkout.brownfield.BrownfieldActivity
import com.example.checkout.brownfield.showReactNativeFragment
 
class CheckoutActivity : BrownfieldActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showReactNativeFragment()
  }
}
```

`AndroidManifest.xml` entry needs a **NoActionBar** theme and `configChanges` for keyboard/orientation - the generated `BrownfieldActivity` docs list the full attribute set.

---

### 4. Build iOS XCFramework or Swift Package

```bash
# XCFrameworks in ./artifacts/
npx expo-brownfield build:ios --release
 
# Self-contained Swift Package (recommended for host Xcode integration)
npx expo-brownfield build:ios --release --package CheckoutPackage
```

**Swift Package path:** In Xcode → **Add Package Dependencies → Add Local** → select `artifacts/CheckoutPackage-release/`. Xcode links bundled `.xcframework` files (brownfield, Hermes, React, dependencies).

**XCFramework path:** Drag `{TargetName}.xcframework` and `hermesvm.xcframework` into the host project; set **Embed & Sign**.

Initialize early:

```swift
import CheckoutBrownfield
 
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    ReactNativeHostManager.shared.initialize()
    return true
  }
}
```

SwiftUI presentation:

```swift
import SwiftUI
import CheckoutBrownfield
 
struct CheckoutButton: View {
  @State private var showCheckout = false
  var body: some View {
    Button("Checkout") { showCheckout = true }
      .fullScreenCover(isPresented: $showCheckout) {
        ReactNativeView(moduleName: "main", initialProps: ["cartId": cartId])
      }
  }
}
```

Build **debug and release** packages separately - SPM binary targets are flavor-specific.

---

### 5. Wire communication and navigation

```typescript
// RN module - send events to native
import * as Brownfield from "expo-brownfield";
 
export function completeCheckout(orderId: string) {
  Brownfield.sendMessage({ type: "CHECKOUT_COMPLETE", orderId });
  Brownfield.popToNative(true);
}
```

```kotlin
// Android - receive from RN
BrownfieldMessaging.addListener { event ->
  if (event["type"] == "CHECKOUT_COMPLETE") {
    // Refresh native order list, pop RN fragment
  }
}
```

Enable hardware back to return to native when appropriate:

```typescript
Brownfield.setNativeBackEnabled(true);
```

Full session patterns: [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/).

---

### 6. Multiple frameworks in one host (iOS)

When two Expo brownfield modules coexist in one iOS app:

```json
{
  "plugins": [
    [
      "expo-brownfield",
      {
        "ios": {
          "targetName": "CheckoutBrownfield",
          "multipleFrameworks": true
        }
      }
    ]
  ]
}
```

This prefixes ObjC symbols to avoid duplicate linker errors. Treat as **advanced** - prefer one RN module with multiple routes until boundaries force a split.

---

## Working Example: Monorepo Layout

```text
acme-mobile/
├── apps/
│   ├── host-ios/          # Xcode - consumes Swift Package
│   └── host-android/      # Gradle - consumes Maven AAR
├── packages/
│   └── checkout-rn/       # Expo project with expo-brownfield
│       ├── app/
│       ├── app.config.ts
│       └── package.json
└── package.json           # workspace root
```

CI sketch:

```yaml
# packages/checkout-rn - publish artifacts on tag
- run: npx expo-brownfield build:android --release
- run: npx expo-brownfield build:ios --release --package CheckoutPackage
- run: aws s3 sync ./artifacts s3://ci-artifacts/checkout-rn/${{ github.sha }}/
```

Host pipelines download pinned artifact versions - no `npm install` on native runners. Details: [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/).

---

## Tooling Compatibility

| Expo tool | Brownfield isolated host |
| --- | --- |
| Expo SDK modules | ✓ |
| Expo Router | ✓ (inside RN module) |
| `expo start` / Metro | ✓ (debug) |
| EAS Build (RN project) | ✓ |
| EAS Update | ✓ (with runtime version discipline) |
| Expo Go | ✗ |
| Expo Dev Client in host | ✗ (use debug artifacts + Metro) |

Brownfield support is **alpha** - pin `expo-brownfield` to the same SDK line as `expo` and read release notes each upgrade.

---

## FAQs

Integrated or isolated?

**Isolated** when native CI must stay Node-free. **Integrated** when one team edits native and RN in one repo daily. See [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/).

What does prebuild generate?

Brownfield library targets alongside (not replacing) the app targets - use them to debug native glue and run `build:*` CLI commands.

How do native devs get a new RN version?

Bump `android.version` / iOS package tag, run `build:android` / `build:ios`, publish artifacts, update host dependency coordinates - same as any native library.

Can I use Expo Router in the embedded module?

Yes - routes live entirely inside the RN package. Native opens `moduleName: "main"`; Router handles internal paths.

## Related

* [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - embed vs rewrite vs WebView
* [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/) - artifact pipelines vs standalone EAS releases
* [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/) - `useSharedState` and messaging
* [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - plugin ordering with `expo-brownfield`
* [../native-modules/autolinking-and-expo-modules-core/autolinking-and-expo-modules-core.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - monorepo autolinking

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
