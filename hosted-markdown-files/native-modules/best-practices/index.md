# Native Modules Best Practices

A condensed summary of the **25 most important native module practices** drawn from every page in this section.

Highlights / Native Modules Best Practices

* Search Expo SDK packages and config plugins before writing Swift or Kotlin
* npx expo install pins native-compatible versions - manual npm install causes runtime crashes
* Express native changes as idempotent config plugins, not hand-edited ios/ or android/
* Expo Go cannot load arbitrary native code - use expo-dev-client for third-party and custom modules
* Rebuild dev clients and store binaries after every native dependency or SDK change

1. **Search Expo SDK packages first:** `expo-camera`, `expo-location`, `expo-secure-store`, and 100+ modules ship with SDK 57 native binaries - prefer them over random npm native wrappers per [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/).
2. **Run the third-party checklist before `npm install`:** Verify RN 0.86, New Architecture support, config plugin availability, and maintenance - see [Using Third-Party Native Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/).
3. **Always `npx expo install` for native deps:** Resolves versions compatible with SDK 57 native binaries - compile success does not guarantee runtime stability.
4. **Treat Expo Go as SDK-only:** Third-party and custom native modules require `expo-dev-client` and a development build - never sign off QA from Expo Go alone.
5. **Rebuild native after every native `package.json` change:** Metro hot reload does not compile Swift/Kotlin - run `npx expo run:ios` / `eas build` before claiming done.
6. **OTA cannot ship native code:** EAS Update delivers JavaScript and assets only - native changes need a new store binary or dev client.
7. **Express permissions in config plugins:** iOS `NS*UsageDescription` and Android manifest entries belong in `app.config` plugins - see [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/).
8. **Write idempotent plugins:** Running `npx expo prebuild` twice must not duplicate `Info.plist` or `AndroidManifest` entries - `git diff` after second run should be empty.
9. **Document plugin order in `app.config.ts`:** Later plugins win when modifying the same key - comment why `expo-router` precedes custom plugins.
10. **Prefer `expo-build-properties` for Gradle/Pod pins:** `compileSdkVersion`, deployment target, and ProGuard rules survive regeneration - see [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/).
11. **Never hand-edit `ios/` and `android/` in CNG apps:** Next `prebuild --clean` wipes edits - encode changes in plugins per [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).
12. **Use `create-expo-module` for app-local bridges:** Expo Modules API integrates autolinking, TypeScript, and config plugins - see [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/).
13. **Require an ADR for custom native modules:** Document why SDK packages failed, name a maintainer, and plan New Architecture testing - Native Module Rules Tier 3.
14. **Verify autolinking before Xcode/Gradle rabbit holes:** `npx expo-modules-autolinking resolve --platform ios` shows what actually compiles into the binary.
15. **Align Metro and native resolution in monorepos:** Enable `autolinkingModuleResolution` and avoid duplicate `react-native` copies - [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/).
16. **Declare workspace native packages as direct app dependencies:** Transitive autolinking of `packages/*` modules is unreliable - app `package.json` must list them explicitly.
17. **Mock at the service boundary in Jest:** `jest-expo` stubs Expo modules; override only what tests assert - see [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/).
18. **A passing Jest suite does not prove native works:** Complement unit tests with device QA or Maestro on a development build.
19. **Choose TurboModules only with justification:** Codegen + C++ ceremony suits RN ecosystem libraries - app teams default to Expo Modules unless sharing native C++ core - [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/).
20. **Test New Architecture on release builds:** RN 0.86 defaults to Fabric/TurboModules - debug Metro can mask bridge fallback bugs; run `--configuration Release` on hardware.
21. **One native dependency per PR when possible:** Mixing payment SDK, maps, and custom module in one merge makes bisect impossible when prebuild fails.
22. **Run `npx expo-doctor` after every native change:** Catches incompatible versions, missing plugins, and misconfigured workspaces before CI.
23. **Use `patch-package` only with a removal ticket:** Prefer config plugins and upstream fixes - patches on `node_modules` break on `expo install --fix`.
24. **Post-SDK-bump native survival script:** `expo install --fix` → `expo-doctor` → `prebuild --clean` → idempotency check → release compile on both platforms.
25. **Pre-release native checklist:** Development build on device, primary native user flows, permission denial paths, `expo-modules-autolinking resolve` clean, plugin idempotency, and store credential rebuild if native deps changed.

## FAQs

Should I read this page before or after the topic pages?

Skim this summary first for orientation, then deep-dive individual pages when implementing. Return here before code review or SDK upgrades.

Expo Go or development build for daily dev?

Expo Go while prototyping with SDK-only modules. Switch to `expo-dev-client` before merging any third-party or custom native dependency.

Minimum config for native permissions?

Register the library's config plugin in `app.config.ts`, run `npx expo prebuild --clean`, and verify usage description strings exist in generated `Info.plist`.

How do native modules relate to CNG?

CNG regenerates native projects from config. Native modules install via autolinking; config plugins apply their permissions and build requirements during prebuild - [CNG prebuild](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/).

When is custom native code justified?

When Expo SDK, maintained third-party packages, and thin Expo modules cannot meet a documented requirement - with ADR, owner, and dev-client QA plan per Native Module Rules.

## Related

* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when JS fails
* [Using Third-Party Native Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/) - compatibility cookbook
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - Info.plist and AndroidManifest
* [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/) - local module scaffold
* [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/) - monorepo linking
* [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/) - Codegen skeleton
* [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/) - build properties
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - tiered checklist
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - CNG workflow
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - runtime constraints

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
