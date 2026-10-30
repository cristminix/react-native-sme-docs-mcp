# Native Module Rules

When to write native code versus reach for an Expo SDK package. These rules keep teams on the supported path for Expo SDK 57 and React Native 0.86, minimize CNG/prebuild surprises, and ensure native dependencies ship with matching dev-client and store binaries.

Highlights / Native Module Rules

* Search expo SDK packages and config plugins before writing Swift or Kotlin
* Expo Go cannot load arbitrary native code - use expo-dev-client when you leave the SDK path
* Express native changes as idempotent config plugins, not hand-edited ios/ or android/
* npx expo install pins native-compatible versions - manual npm install causes runtime crashes
* Rebuild dev clients and store binaries after every native dependency or SDK change
* Custom native modules require an ADR with maintenance owner and New Architecture compatibility plan

## How to Use This Checklist

* Walk **Tier 1** before adding any npm package with native code - the wrong dependency forces a dev-client rebuild and may block Expo Go entirely.
* Apply **Tiers 2–3** when integrating config plugins or writing custom native modules - mistakes corrupt `ios/` and `android/` on every prebuild.
* Run **Tier 4** before merging native changes - CI must prove prebuild is reproducible and the New Architecture build still compiles.
* Every custom native module needs an ADR with a named owner - orphan native code becomes undeletable.
* Pair with `npx expo-doctor` after every native dependency change.

---

## Tier 1: Choose the Right Integration Path (1–6)

1. **Search Expo SDK packages first:** `expo-camera`, `expo-location`, `expo-notifications`, and 100+ modules ship with SDK 57 native binaries - prefer them over random npm native wrappers.

   * **Install:** `npx expo install expo-camera` - not `npm install expo-camera@latest`.
   * **Verify:** Package appears in Expo docs for SDK 57 before adopting.
2. **Second choice: community module with Expo config plugin:** Many libraries ship a config plugin in `app.config` `plugins` array - read their SDK 57 compatibility matrix before installing.

   * **Check:** GitHub issues for RN 0.86 and New Architecture support.
   * **Reject:** Unmaintained modules last updated for SDK 49.
3. **Third choice: Expo Modules API for thin custom native bridges:** When no package exists, write an Expo module in `modules/my-feature/` - autolinking and TypeScript types integrate cleanly with CNG.

   * **Template:** `npx create-expo-module@latest` for the module scaffold.
   * **ADR required:** Document why SDK packages were insufficient.
4. **Last resort: bare Swift/Kotlin patches via config plugin:** Hand-maintained `ios/` and `android/` folders are for brownfield only - standard CNG apps express changes as plugins.

   * **Brownfield:** ADR explains why CNG is not used.
   * **Reject:** "Quick fix" edits to `Podfile` that are not encoded in a plugin.
5. **Expo Go is not a native test target for custom modules:** Packages not bundled in Expo Go require `expo-dev-client` - do not claim QA sign-off from Expo Go alone.

   * **CI:** `development` EAS profile builds installable dev clients.
   * **Onboarding:** README states Expo Go limitations on day one.
6. **One native change per PR when possible:** Mixing a new payment SDK, camera plugin, and custom module in one merge makes bisect impossible when prebuild fails.

   * **Rollback:** Single-purpose PRs map cleanly to store and OTA rollback decisions.
   * **Review:** Native changes get a dedicated reviewer with mobile platform experience.

---

## Tier 2: Install, Link & Config Plugins (7–12)

7. **Always `npx expo install` for native deps:** Resolves versions compatible with SDK 57 native binaries - compile success does not guarantee runtime stability.

   * **After SDK bump:** `npx expo install --fix` then `expo-doctor`.
   * **CI:** Fail if `package.json` ranges drift from Expo's bundled versions without ADR.
8. **Register config plugins in `app.config.ts`:** Native permissions, entitlements, and manifest entries belong in plugins - not post-prebuild manual edits.

   * **Order:** Plugin order matters when multiple plugins touch the same file - document ordering in comments.
   * **Inspect:** `npx expo prebuild --clean` locally before merging plugin changes.
9. **Write idempotent config plugins:** Running `prebuild` twice must not duplicate entries in `Info.plist` or `AndroidManifest.xml`.

   * **Test:** Run prebuild twice and `git diff` native output - should be empty the second time.
   * **Reject:** Regex append plugins without existence checks.
10. **Declare permissions with user-facing strings:** iOS `NSCameraUsageDescription` and Android permission rationale - missing strings crash or reject store review.

    * **Source:** Plugin or `app.config` `ios.infoPlist` - never only in generated files.
    * **Localization:** Plan `locales/` for permission strings in shipped languages.
11. **Use `expo-build-properties` for compile SDK and deployment targets:** Centralize `minSdkVersion`, `compileSdkVersion`, and iOS deployment target - scattered Gradle edits are lost on prebuild.

    * **SDK 57 defaults:** Start from Expo defaults; override only with measured need.
    * **ADR:** Document why minimum OS version was raised.
12. **Autolinking handles most linking - do not manually edit settings.gradle:** Expo autolinking registers native modules - manual `pod install` hacks belong in plugins if truly necessary.

    * **Debug:** `npx expo-modules-autolinking resolve` when a module is not found.
    * **Monorepo:** Ensure one `react-native` instance - duplicate copies break autolinking silently.

---

## Tier 3: CNG, Prebuild & Dev Clients (13–18)

13. **Gitignore generated `ios/` and `android/` under CNG:** Committed native folders block SDK 57 template updates - EAS Build runs prebuild remotely.

    * **Local debug:** `npx expo prebuild --clean` reproduces CI native projects.
    * **Exception:** Brownfield ADR with merge strategy for native dirs.
14. **Rebuild dev client after every native dependency change:** OTA (`eas update`) updates JavaScript only - new native modules require `eas build --profile development`.

    * **Communicate:** Post in #mobile when dev client URL changes - stale shells cause "module not found" red herrings.
    * **Version:** Bump `expo-dev-client` with SDK upgrades.
15. **Store builds and native changes are never OTA-only:** If a JS feature requires a new native module, ship a store build first - gate JS with runtime version checks until adoption threshold is met.

    * **Pattern:** `expo-updates` runtime version policy + feature flag for new native API.
    * **See:** [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/).
16. **Test on physical devices for hardware modules:** Camera, BLE, NFC, and push behave differently on simulators - sim-only QA misses permission and background failures.

    * **Matrix:** Document minimum device list per native module (e.g., Android 10 mid-tier, iPhone SE).
    * **CI:** Maestro on EAS preview artifacts, not Expo Go.
17. **New Architecture compatibility is explicit:** RN 0.86 favors New Architecture - verify third-party native modules declare Fabric/TurboModule support or document fallback.

    * **Check:** Library README and `expo-doctor` warnings.
    * **ADR:** Record modules that require Old Architecture until upstream fixes land.
18. **Release native handles and listeners:** Long-lived `SharedObject` instances from Expo modules (players, sensors) need `release()` on unmount - leaks crash backgrounded apps.

    * **Pattern:** `useEffect` cleanup calls module `remove()` or subscription `remove()`.
    * **Profile:** Xcode Instruments / Android Profiler for native module leaks before release.

---

## Tier 4: Custom Modules, Review & Governance (19–24)

19. **Custom Expo modules live in `modules/` with typed JS API:** Export a narrow TypeScript surface - features import `@/modules/my-feature`, not raw `NativeModules` strings.

    * **Tests:** Mock at the module boundary in Jest; E2E on device for integration.
    * **Docs:** README in module folder with platform support matrix.
20. **No business logic in native code:** Native layer handles platform APIs and marshaling - pricing rules and validation stay in TypeScript.

    * **Smell:** Swift `if user.isPremium` duplicated from JS.
    * **Fix:** Pass primitives across the bridge; keep one source of truth in JS.
21. **Semantic versioning for internal modules:** Breaking native API changes require a store build and changelog - treat `modules/` like a published package.

    * **Coordinate:** JS and native version skew is impossible in one bundle - ship together.
    * **Monorepo:** Internal modules still get CHANGELOG entries.
22. **Security review for native modules that touch secrets:** Keychain wrappers, payment SDKs, and attestation libraries need security sign-off - not only mobile lead review.

    * **See:** [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/).
    * **Reject:** Storing tokens in native `UserDefaults` without encryption.
23. **Prebuild in CI on native PRs:** Run `npx expo prebuild --clean --no-install` (or full EAS build) to catch plugin failures before merge.

    * **Cache:** EAS remote builds are acceptable when local prebuild is slow.
    * **Artifact:** Attach prebuild diff summary to PR for reviewer.
24. **ADR for every custom native module and non-Expo native dependency:** Status, owner, alternatives considered, New Architecture stance, and retirement trigger.

    * **Template:** [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/).
    * **Revisit:** Quarterly - delete modules that SDK now covers natively.

## Applying the Checklist in Order

* **Tier 1 (1–6):** Integration path - choosing wrong tier costs weeks of native maintenance.
* **Tier 2 (7–12):** Install and plugins - fixes prebuild before developers download broken dev clients.
* **Tier 3 (13–18):** CNG workflow - ensures binaries match JavaScript expectations.
* **Tier 4 (19–24):** Governance - prevents native debt accumulation.

## FAQs

Expo module vs React Native native module?

Prefer Expo Modules API for new custom bridges - autolinking, TypeScript, and config plugins integrate with CNG. Legacy RN native modules work but need more manual linking maintenance on SDK 57.

When is hand-editing ios/ acceptable?

Brownfield apps with committed native dirs and a documented merge strategy. Standard greenfield Expo apps should never hand-edit generated files - use config plugins.

Do I need to rebuild after adding a config plugin?

Yes - plugins mutate native projects at prebuild time. Run a new dev-client and store build; OTA alone is insufficient.

How do I know if a package works with Expo Go?

Check Expo docs - if the package is not in the Expo Go bundle, you need a dev build. `expo-doctor` may also warn about incompatible dependencies.

Can I ship a native module via OTA?

No - native code ships in the binary. You can ship JS that calls an existing native module OTA, but adding the module itself requires a store build.

What is the Expo Modules API entry point?

Create a module with `npx create-expo-module@latest`, register it in the app's `package.json` workspaces or `modules/` folder, and autolinking picks it up on prebuild.

How do monorepos share native modules?

Place shared modules in `packages/native-feature/` with proper `react-native` peer deps. One app runs prebuild; the module autolinks from the workspace path Metro resolves.

Does New Architecture break older native modules?

Some community modules lag Fabric/TurboModule support on RN 0.86. Verify before adopting; document Old Architecture fallback in an ADR if required temporarily.

When should I fork a native dependency?

Almost never - upstream a fix or wrap with a config plugin. Forks when the maintainer is gone require an ADR with security patch ownership.

How do I test native modules in Jest?

Mock at the TypeScript boundary (`jest.mock('@/modules/my-feature')`) with realistic return shapes. Run integration tests on device via Maestro or manual QA for hardware paths.

What triggers expo prebuild --clean?

SDK upgrades, plugin changes, autolinking failures, and unexplained native build errors. `--clean` is the default recovery path on SDK 57 - not a last resort.

Can config plugins run only on EAS Build?

Plugins run on any prebuild - local and remote. Keep local prebuild reproducible so CI and laptops generate identical native projects.

Who owns native module maintenance?

The ADR names a primary owner (iOS/Android or full-stack mobile). Unowned native code is a merge blocker in mature teams.

## Related

* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - CNG, gitignore native dirs, expo install
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - native vs OTA shipping boundaries
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - secure native storage and SDK choices
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - native module impact on startup and binary size
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - document native path decisions
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
