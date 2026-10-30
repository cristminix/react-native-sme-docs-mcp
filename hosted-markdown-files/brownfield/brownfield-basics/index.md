# Brownfield Basics

10 examples to decide when to **embed React Native**, **rewrite in RN**, or **fall back to WebView** - 7 basic and 3 intermediate.

Highlights / Brownfield Basics

* Brownfield apps have a native entry point - React Native is added as a screen or feature, not the root
* Embed React Native when you need native UX, offline, and shared logic - not for static marketing pages
* Full rewrite only when navigation, auth, and release cadence all justify the migration cost
* WebView is a valid fallback for low-interaction content - not a substitute for product screens
* Isolated approach (AAR/XCFramework) keeps native CI free of Node.js; integrated couples repos
* Expo SDK modules, Router, and EAS Build work in brownfield - Expo Go and some OTA paths do not

## Prerequisites

Brownfield work assumes you already ship a native iOS and/or Android app whose **main entry point is not React Native**. You add RN as a library, screen, or feature module.

For hands-on integration after these decisions, see [expo-brownfield Overview](https://docs.wahwei/reactnative.codeguides.io/brownfield/expo-brownfield-overview/). For architecture boundaries inside the RN slice, see [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/).

```bash
# Spike: minimal Expo project to validate embed feasibility
npx create-expo-app@latest RnSpike --template blank-typescript@sdk-57
cd RnSpike
npx expo install expo-brownfield
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Brownfield integration APIs are **alpha** - budget time for native build debugging.

---

## Basic Examples

### 1. Brownfield vs Greenfield

**Greenfield** means React Native (or Expo) is the app's root - every screen branches from a JS entry. **Brownfield** means UIKit/Swift, Jetpack Compose/Kotlin, or another native stack owns the shell; RN is embedded on demand.

```text
Greenfield                          Brownfield
┌─────────────────────┐            ┌─────────────────────┐
│  RN root (main)     │            │  Native root        │
│  ├─ Tab A           │            │  ├─ Home (native)   │
│  ├─ Tab B           │            │  ├─ Settings (nat.) │
│  └─ Modal           │            │  └─ Checkout (RN)   │  ← RN island
└─────────────────────┘            └─────────────────────┘
```

* If your **AppDelegate / Application class** launches a native storyboard first, you are brownfield
* Expo **Dev Client** does not target brownfield host apps today - use Metro + debug artifacts or integrated prebuild for local dev
* **Expo SDK modules**, **Expo Router**, **EAS Build**, and **EAS Submit** do support brownfield per Expo's compatibility matrix

> **Related:** [expo-brownfield Overview](https://docs.wahwei/reactnative.codeguides.io/brownfield/expo-brownfield-overview/) - packaging RN as AAR/XCFramework | [../architecture-design/mobile-architecture-basics/mobile-architecture-basics.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - structuring the RN slice once embedded

---

### 2. Embed React Native - When It Wins

Embed RN when the feature needs **native-feeling UI**, **offline/cache behavior**, **device APIs**, or **shared TypeScript** with a web team - and the legacy native screen would take quarters to rebuild.

| Signal | Embed RN |
| --- | --- |
| Complex forms with validation | ✓ |
| Lists with gestures / Reanimated | ✓ |
| Camera, biometrics, BLE via Expo modules | ✓ |
| Reuse existing React design system | ✓ |
| One static FAQ page | ✗ (WebView or native) |

```tsx
// The RN slice can still use Expo Router inside the host-provided container
// app/_layout.tsx - RN navigation is internal to the embedded module
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="checkout" />
      <Stack.Screen name="order-confirmation" />
    </Stack>
  );
}
```

* Embedding does **not** require rewriting the whole app - start with one high-churn flow (checkout, onboarding, support chat)
* Use **`expo-brownfield`** isolated artifacts when native teams refuse Node in CI
* Plan **one Metro project** per embedded module - avoid two RN runtimes in one process without `multipleFrameworks` planning on iOS

> **Related:** [RNHostView & Native UI Embedding](https://docs.wahwei/reactnative.codeguides.io/brownfield/rnhostview-and-native-ui-embedding/) - RN inside SwiftUI/Compose layouts | [../native-modules/native-modules-basics/native-modules-basics.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when JS alone is insufficient

---

### 3. Full Rewrite - When It Wins

A **rewrite** replaces the native shell with an Expo/RN app. Justified when **most screens** are changing anyway, **dual navigation** costs exceed migration, or you need **one OTA pipeline** for the entire product.

| Signal | Rewrite |
| --- | --- |
| >60% of roadmap touches UI shared with web | ✓ |
| Native codebase unmaintainable (no tests, no owners) | ✓ |
| Store compliance requires single binary identity | ✓ |
| One team owns one feature in an otherwise stable app | ✗ (embed) |

```text
Rewrite decision checklist (all "yes" → strong rewrite case):
□ Native and mobile web share a component library
□ Auth, push, and deep links need unified routing (Expo Router)
□ Native headcount cannot sustain two UI stacks
□ Leadership accepts 2–4 sprint migration freeze on affected flows
```

* Rewrites fail when treated as **big-bang** - use strangler fig (see [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/))
* Brownfield embed is often the **first phase** of a rewrite, not the alternative to one
* Document the choice in an ADR before re-platforming store listings or bundle IDs

> **Related:** [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - ranked strangler fig decisions | [../architecture-design/adr-navigation-library-choice/adr-navigation-library-choice.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) - Expo Router vs React Navigation during migration

---

### 4. WebView Fallback - When It Wins

**WebView** ships mobile web inside the native shell. Best for **read-only**, **rarely updated**, or **legally hosted** content where native UX and offline are non-goals.

```tsx
import { WebView } from "react-native-webview";
 
export function HelpCenterWebView({ url }: { url: string }) {
  return (
    <WebView
      source={{ uri: url }}
      startInLoadingState
      sharedCookiesEnabled
      // Host app must inject auth cookie or token via injectedJavaScript
    />
  );
}
```

| Signal | WebView |
| --- | --- |
| Marketing / legal / help center | ✓ |
| Internal admin tools used monthly | ✓ |
| Checkout with PCI constraints | ✗ (native or RN + certified SDK) |
| Offline-first field app | ✗ |

* **Cookie/session sharing** with the native app is fragile - plan explicit token handoff (see [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/))
* WebView **does not** give you Expo modules, Reanimated, or consistent offline - it is a browser tab with an app icon
* Prefer **Safari View Controller / Chrome Custom Tabs** for OAuth flows that forbid embedded WebViews

> **Related:** [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/) - passing sessions into WebView and RN

---

### 5. Three-Way Decision Matrix

Score each candidate feature 1–5 on these axes; highest total suggests the column.

| Axis | Embed RN | Rewrite | WebView |
| --- | --- | --- | --- |
| UI complexity | High forms/lists | Entire app | Static HTML |
| Offline need | Required | Required | Optional |
| Release cadence | Weekly feature | Major version | Rare copy change |
| Native team capacity | Low | Willing to exit native UI | Any |
| Shared code with web | High | High | Already on web |
| Risk tolerance | Medium (island) | High (platform) | Low |

```text
Example: "Order tracking" in a native retail app
  UI complexity: 4  |  Offline: 3  |  Cadence: 5  |  Shared TS: 4
  → Embed RN (strangler fig on tracking stack)
 
Example: "Terms of service"
  UI: 1  |  Offline: 0  |  Cadence: 1
  → WebView or SFSafariViewController
```

* No column wins every row - **document the scoring** in your ADR repo
* Revisit when **EAS Update** or **store policy** changes - WebView-only checkout may fail review

> **Related:** [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - formal ranked decisions per scenario

---

### 6. Integrated vs Isolated Embedding

Expo documents two brownfield shapes:

| Approach | RN location | Native CI needs Node? | Best for |
| --- | --- | --- | --- |
| **Integrated** | RN project wraps or neighbors native `ios/`/`android/` | Yes | Single team, frequent cross-boundary changes |
| **Isolated** | Separate repo/monorepo package → AAR + XCFramework | No (consumes artifacts) | Separate native and RN squads |

```json
// app.config.ts - isolated path uses expo-brownfield config plugin
export default {
  expo: {
    plugins: [
      [
        "expo-brownfield",
        {
          ios: { targetName: "CheckoutBrownfield" },
          android: {
            group: "com.example",
            libraryName: "checkout-brownfield",
            version: "2.1.0",
          },
        },
      ],
    ],
  },
};
```

```bash
# RN squad publishes artifacts; native squad consumes Maven / Swift Package
npx expo-brownfield build:android --release
npx expo-brownfield build:ios --release --package CheckoutPackage
```

* **Isolated** is the default recommendation when native release trains cannot absorb Yarn/Metro
* **Integrated** fits when you already run `npx expo prebuild` inside the host repo
* Both approaches still need **one Hermes + RN version** aligned with SDK 57

> **Related:** [expo-brownfield Overview](https://docs.wahwei/reactnative.codeguides.io/brownfield/expo-brownfield-overview/) - full cookbook | [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - `expo-brownfield` plugin options

---

### 7. Presenting the First RN Screen (Host Side)

The host app initializes the RN runtime once, then presents a view controller or activity.

```swift
// iOS - call early in AppDelegate
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
 
// UIKit - push RN checkout
let vc = ReactNativeViewController(
  moduleName: "main",
  initialProps: ["cartId": cartId]
)
navigationController?.pushViewController(vc, animated: true)
```

```kotlin
// Android - BrownfieldActivity + fragment
class CheckoutActivity : BrownfieldActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showReactNativeFragment()
  }
}
```

* **`moduleName`** must match `registerRootComponent` / `app.json` `main` registration in the RN project
* **`initialProps`** seed route params - pair with shared auth keys (next article)
* Debug builds load from **Metro** (`npx expo start`); release builds use the **embedded bundle** inside the artifact

> **Related:** [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/) - debug vs release artifact pipelines

---

## Intermediate Examples

### 8. Strangler Fig - First Slice Selection

Pick a flow that is **painful in native**, **bounded**, and **not** on the critical cold-start path.

```text
Good first slices:
  ✓ Post-login dashboard (auth already native)
  ✓ Settings sub-flow rarely opened at launch
  ✓ New feature with no legacy code
 
Poor first slices:
  ✗ App launch splash / home tab (cold start + RN init cost)
  ✗ Deep native navigation hub (back-stack ownership unclear)
  ✗ Background tasks / widgets (RN not in process)
```

```tsx
// RN side - listen for native "open slice" messages
import * as Brownfield from "expo-brownfield";
import { useEffect } from "react";
import { router } from "expo-router";
 
export function useNativeDeepLinks() {
  useEffect(() => {
    const sub = Brownfield.addMessageListener((event) => {
      if (event.type === "OPEN_TRACKING" && event.orderId) {
        router.push(`/orders/${event.orderId}`);
      }
    });
    return () => sub.remove();
  }, []);
}
```

* Native still owns **tab bar and root navigation** until the strangler retires those screens
* Use **`Brownfield.popToNative()`** when RN finishes a flow and returns control to UIKit/Compose
* Record slice order in [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/)

> **Related:** [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/) - `BrownfieldMessaging` contract

---

### 9. WebView vs RN for the Same Product Screen

When PM asks for "just use the mobile website," run this comparison on one screen.

| Criterion | WebView | Embedded RN |
| --- | --- | --- |
| Scroll performance on low-end Android | Janky | Native list virtualization |
| Pull-to-refresh | Custom bridge | `RefreshControl` |
| Push deep link to row | URL fragility | Typed Expo Router path |
| App Store "minimum functionality" | Risk if thin shell | Stronger native presence |
| Engineering cost this quarter | Days | Weeks |

```tsx
// Compromise: WebView for MVP spike, RN for v2 - gate with feature flag
import { useFeatureFlag } from "@/shared/feature-flags";
 
export function LoyaltyScreen() {
  const useNative = useFeatureFlag("loyalty_rn_v2");
  return useNative ? <LoyaltyNative /> : <LoyaltyWebView uri="https://m.example.com/loyalty" />;
}
```

* Time-box WebView spikes - **do not** let temporary shells become permanent without an ADR
* If the web page needs **camera or file upload**, WebView permission plumbing often exceeds RN cost

> **Related:** [../architecture-design/modular-monolith-vs-multi-app/modular-monolith-vs-multi-app.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/modular-monolith-vs-multi-app/) - feature flags vs separate apps

---

### 10. Ownership Boundaries in a Hybrid App

Define who owns each layer before the first PR lands.

```text
Native squad owns:
  - App launch, push registration, keychain/session vault
  - Presenting ReactNativeViewController / BrownfieldActivity
  - Store binaries, signing, native crash triage
 
RN squad owns:
  - Metro project, Expo SDK pin, JS bundle quality
  - Screens inside the embedded module, OTA policy (if enabled)
  - expo-brownfield artifact version bumps
 
Shared contract (document in repo):
  - Message types: OPEN_*, SESSION_*, LOGOUT
  - Shared state keys: auth.accessToken, auth.userId
  - Semantic versioning on AAR/Maven + iOS Swift Package
```

```typescript
// Version the bridge contract - breaking changes require major artifact bump
export const BRIDGE_CONTRACT_VERSION = "1.2.0";
 
export type HostToRnMessage =
  | { type: "SESSION_UPDATED"; accessToken: string; userId: string }
  | { type: "OPEN_CHECKOUT"; cartId: string };
```

* **One Metro bundler** per embedded module - two RN instances without `multipleFrameworks: true` on iOS risk duplicate symbols
* Align with [Brownfield Best Practices](https://docs.wahwei/reactnative.codeguides.io/brownfield/best-practices/) before scaling to multiple slices

> **Related:** [Brownfield Best Practices](https://docs.wahwei/reactnative.codeguides.io/brownfield/best-practices/) - 25-item summary | [../native-modules/autolinking-and-expo-modules-core/autolinking-and-expo-modules-core.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - autolinking in monorepos

---

## FAQs

Can we use Expo Go to test brownfield?

No - Expo Go is a greenfield container. Use debug `expo-brownfield` artifacts with Metro, or an integrated dev client inside the host app.

Does EAS Update work for embedded bundles?

Yes for the RN module when runtime versions align - but the **host store binary** must still ship when native deps change. See [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/).

WebView or RN for authenticated dashboards?

RN when you need offline, native navigation integration, or shared components with web. WebView when content is rarely updated and owned by a separate web team with no mobile capacity.

How many RN modules can one host app load?

One is simplest. Multiple isolated frameworks on iOS require `multipleFrameworks: true` and careful symbol mangling - plan in an ADR before duplicating Expo projects.

## Related

* [expo-brownfield Overview](https://docs.wahwei/reactnative.codeguides.io/brownfield/expo-brownfield-overview/) - build AAR/XCFramework and wire the host app
* [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - strangler fig ranked decisions
* [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/) - sessions across native and RN
* [../architecture-design/mobile-architecture-basics/mobile-architecture-basics.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - feature slices inside the RN project
* [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - `expo-brownfield` config plugin

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
