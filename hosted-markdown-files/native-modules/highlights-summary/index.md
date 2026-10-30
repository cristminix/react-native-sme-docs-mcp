# Native Modules Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Native Modules Highlights Summary

* Native modules bridge JavaScript to Swift, Kotlin, and C++ via JSI on RN 0.86
* Run the compatibility checklist before npm install - rebuild cost is measured in days
* Config plugins transform app.config into native project files during prebuild
* npx create-expo-module@latest scaffolds Swift, Kotlin, and TypeScript in one package
* expo-modules-autolinking scans dependencies at build time and wires Gradle/Pod entries
* TurboModules use Codegen specs for typed JSI bindings on RN 0.86 New Architecture

## [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/)

* Native modules bridge JavaScript to Swift, Kotlin, and C++ via JSI on RN 0.86
* Expo SDK packages are native modules with TypeScript surfaces - prefer them over raw bridge code
* Expo Go ships a fixed native binary - custom or third-party native deps need a development build
* Every native dependency change requires rebuilding ios/ and android/ - OTA cannot ship native code
* Search Expo SDK and config plugins before writing Swift or Kotlin - see Native Module Rules

## [Using Third-Party Native Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/)

* Run the compatibility checklist before npm install - rebuild cost is measured in days
* npx expo install pins SDK 57–compatible versions; manual npm ranges cause runtime crashes
* New Architecture support is mandatory on RN 0.86 - verify Fabric and TurboModule claims in issues
* Config plugins must encode permissions and Gradle/Pod changes - never post-prebuild hand edits
* Expo Go cannot load arbitrary native binaries - third-party libs require expo-dev-client

## [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/)

* Config plugins transform app.config into native project files during prebuild
* Permissions, entitlements, and manifest entries belong in plugins - not hand-edited ios/ or android/
* Plugin order matters when multiple plugins touch the same file - document ordering in comments
* Idempotent plugins survive npx expo prebuild --clean run twice with empty git diff
* Pair with Native Module Rules Tier 2 before merging any plugin change

## [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/)

* npx create-expo-module@latest scaffolds Swift, Kotlin, and TypeScript in one package
* Local modules in modules/ autolink on prebuild - no manual Podfile edits in CNG apps
* Expo Modules API is JSI-first and supports New Architecture on RN 0.86
* Ship a config plugin alongside the module when permissions or entitlements are required
* Custom native modules require an ADR per Native Module Rules - document the owner

## [Autolinking & expo-modules-core](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/)

* expo-modules-autolinking scans dependencies at build time and wires Gradle/Pod entries
* SDK 55+ enables autolinkingModuleResolution so Metro and native link the same copy
* Duplicate react-native in monorepos breaks autolinking - run pnpm why react-native
* requireNativeModule queries the JSI host object populated at native launch
* npx expo-modules-autolinking resolve debugs missing modules before Xcode/Gradle fails

## [Writing a TurboModule](https://docs.wahwei/reactnative.codeguides.io/native-modules/writing-a-turbomodule/)

* TurboModules use Codegen specs for typed JSI bindings on RN 0.86 New Architecture
* Prefer Expo Modules API for app-local bridges - TurboModules suit RN-ecosystem libraries
* Spec files live in src/Native\*.ts and generate C++, Java, and ObjC++ stubs
* Synchronous methods are allowed on TurboModules - validate thread constraints in native code
* Test on device with New Architecture enabled - bridge fallback hides sync API bugs

## [Patching Native Projects](https://docs.wahwei/reactnative.codeguides.io/native-modules/patching-native-projects/)

* expo-build-properties is the supported knob for SDK versions, ProGuard, and deployment targets
* CNG apps express Gradle/Pod changes as config - hand-edited ios/ and android/ die on prebuild --clean
* patch-package is a last resort for node\_modules native fixes - document removal path
* Run npx expo prebuild twice after plugin changes to verify idempotency before merge
* SDK upgrade survival means re-validating every plugin and build property against release notes

## [Native Modules Best Practices](https://docs.wahwei/reactnative.codeguides.io/native-modules/best-practices/)

* Search Expo SDK packages and config plugins before writing Swift or Kotlin
* npx expo install pins native-compatible versions - manual npm install causes runtime crashes
* Express native changes as idempotent config plugins, not hand-edited ios/ or android/
* Expo Go cannot load arbitrary native code - use expo-dev-client for third-party and custom modules
* Rebuild dev clients and store binaries after every native dependency or SDK change

Reviewed by Chris St. John·Last updated Jul 18, 2026
