# Brownfield Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Brownfield Best Practices

* One Metro project per embedded module - multiple runtimes need explicit iOS symbol planning
* Native owns session vault; RN reads shared state - never duplicate refresh logic silently
* Isolated artifacts decouple native CI from Node; integrated repos need prebuild in CI
* Version bridge contracts semver; bump Maven/SPM when message shapes change
* Debug artifacts + Metro for dev; release artifacts get offline smoke tests before host pin
* Strangler slices stay post-auth and off cold start until root navigation migrates

1. **Define brownfield explicitly:** If native `AppDelegate` / `Application` owns the root UI, RN is a guest - plan embed boundaries before choosing Expo Router routes.
2. **Score embed vs rewrite vs WebView per feature:** Use the three-way matrix in [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - permanent WebView shells without an ADR sunset are a common failure mode.
3. **Default to isolated `expo-brownfield` artifacts:** AAR + Swift Package lets native CI skip Node when teams are split - integrated only when one squad edits both sides daily.
4. **One Metro bundler per embedded module:** Two RN runtimes in one process require `multipleFrameworks: true` on iOS and a deliberate symbol strategy - avoid accidental double Metro projects.
5. **Initialize `ReactNativeHostManager` once at app launch:** Late init causes blank RN screens and flaky Expo module lifecycle - mirror Expo docs in host `AppDelegate` / `Application`.
6. **Match `moduleName` to JS registration:** Host `ReactNativeViewController(moduleName:)` must align with `registerRootComponent` / `app.json` entry - mismatch shows white screen with no JS error.
7. **Pin Expo SDK across `expo` and `expo-brownfield`:** Use `npx expo install` on SDK 57 - Hermes and native binaries drift if versions diverge.
8. **Run `npx expo-doctor` on every artifact build:** Catches native module skew before publishing Maven/XCFramework consumers ingest bad artifacts.
9. **Version Android artifacts in plugin config:** `android.version` must match Maven coordinates - tag Git and Maven with the same semver.
10. **Ship iOS debug and release Swift Packages separately:** SPM binary targets are flavor-specific - QA and App Store pins must not cross wires.
11. **Document a bridge contract version:** `BRIDGE_CONTRACT_VERSION` in shared types - breaking `SharedStateKeys` or message `type` values require coordinated native + RN releases.
12. **Native keychain owns refresh tokens:** RN gets short-lived access tokens via `useSharedState` - refresh stays native unless auth strangler explicitly migrated.
13. **Mount a root `SessionBridge` listener:** `SESSION_UPDATED` / `LOGOUT` messages in `_layout.tsx` - per-screen listeners miss events on fast navigation.
14. **Never pass refresh tokens in `initialProps`:** Bootstrap props are logged and introspected - use shared state set by native after secure read.
15. **Use `Brownfield.popToNative()` at flow completion:** Checkout and wizard ends should return control to native chrome - do not leave orphan RN stacks under native tabs.
16. **Enable `setNativeBackEnabled` when native owns back:** Hardware back should exit RN module when stack is empty - prevents trapped users on Android.
17. **Pick strangler slices post-auth and off cold start:** First slice should not block app launch - home tab RN init is a performance and navigation ownership trap.
18. **Record slice order in ADRs:** [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) ranked decisions prevent "random settings page" migrations with no journey cohesion.
19. **Separate release trains:** RN artifact pipeline, host store pipeline, optional OTA - semver them independently per [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/).
20. **OTA only within `runtimeVersion`:** `eas update` on the RN project must not outpace the Hermes runtime embedded in the host's pinned artifact.
21. **Offline-test release artifacts:** Airplane mode on host Release build before bumping Maven/SPM - debug Metro paths hide missing embedded bundles.
22. **Use `@expo/ui` `RNHostView` for native chrome inside RN screens:** Distinct from full brownfield presentation - native toolbars around RN bodies without custom view managers.
23. **Keep RN routes thin; features fat:** Same as greenfield - `app/` re-exports feature screens per [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/).
24. **Prefer config plugins over hand-edited host plists:** `expo-brownfield` plugin regenerates targets on `prebuild --clean` - manual Gradle edits are lost.
25. **Treat brownfield as alpha-capable, not alpha-careless:** Expo documents brownfield support as alpha - budget native build debugging, read SDK release notes, and file upstream issues with reproduction artifacts.

## FAQs

Expo Go for brownfield QA?

No - use debug brownfield artifacts with Metro or internal host builds. Expo Go cannot load your host shell.

When is WebView acceptable long term?

Legal, marketing, and rarely updated read-only content - not core product flows with offline or native navigation requirements.

How many RN modules in one host app?

One unless legal or team boundaries force two - each adds artifact CI, bridge contracts, and iOS linker complexity.

Does Expo Router replace native navigation during strangler?

Expo Router owns navigation **inside** the embedded module only until ADR declares native root retired - see navigation ADR in architecture-design.

Who bumps the host app when RN adds `expo-camera`?

RN squad publishes new artifact; native squad integration PR bumps dependency - OTA alone is insufficient for new native modules.

## Related

* [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - embed vs rewrite vs WebView with 10 examples
* [expo-brownfield Overview](https://docs.wahwei/reactnative.codeguides.io/brownfield/expo-brownfield-overview/) - AAR/XCFramework cookbook
* [RNHostView & Native UI Embedding](https://docs.wahwei/reactnative.codeguides.io/brownfield/rnhostview-and-native-ui-embedding/) - SwiftUI/Compose islands
* [Shared Authentication & Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/) - sessions and messaging
* [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - strangler fig ranked decisions
* [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/) - embedded bundles vs standalone releases
* [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - `expo-brownfield` plugin
* [../architecture-design/mobile-architecture-basics/mobile-architecture-basics.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - RN module structure

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
