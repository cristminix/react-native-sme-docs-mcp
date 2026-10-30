# CNG & Prebuild Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / CNG & Prebuild Highlights Summary

* CNG (Continuous Native Generation) turns app.config.ts + plugins into ios/ and android/
* SDK 57 defaults to clean regen - expo prebuild deletes ios/ and android/ first
* Config plugins mutate ios/ and android/ at prebuild time - not at Metro runtime
* expo run:ios and expo run:android run prebuild then compile locally
* @expo/fingerprint hashes everything that affects native binaries
* Inventory every ios/ and android/ diff vs a fresh SDK 57 prebuild

## [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/)

* CNG (Continuous Native Generation) turns app.config.ts + plugins into ios/ and android/
* SDK 57 runs expo prebuild with --clean by default - stale native folders are deleted first
* Gitignore ios/ and android/ under CNG; regenerate on EAS Build or local prebuild
* Every native permission, entitlement, and manifest entry should flow from config plugins
* expo run:ios and expo run:android invoke prebuild then compile a dev client locally
* Pair with Native Module Rules before adding packages that touch native code

## [expo prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/)

* SDK 57 defaults to clean regen - expo prebuild deletes ios/ and android/ first
* Use --no-clean only when migrating hand edits into config plugins
* Run prebuild twice when authoring plugins - second diff must be empty
* expo run:ios/android wraps prebuild + compile for local native iteration
* Pair with expo-doctor before every prebuild on upgrade branches
* Gitignore native folders under CNG - EAS Build runs the same prebuild step

## [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/)

* Config plugins mutate ios/ and android/ at prebuild time - not at Metro runtime
* Compose small plugins; chain with withPlugins from @expo/config-plugins
* Idempotent plugins produce zero diff on the second prebuild run
* Library plugins (expo-camera, etc.) ship with maintained SDK 57 support
* Plugin order matters when multiple mods touch Info.plist or build.gradle
* Pair with Native Module Rules before adding custom native patches

## [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/)

* expo run:ios and expo run:android run prebuild then compile locally
* Custom Expo modules live in modules/ and autolink via expo-modules-autolinking
* Default CNG: gitignore ios/ and android/ - commit modules/ and plugins/
* Commit native dirs only with ADR when CNG migration is blocked
* Rebuild dev client after every native code or SDK change
* Pair with create-expo-module before writing raw Swift/Kotlin patches

## [Fingerprint & Native Change Detection](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/)

* @expo/fingerprint hashes everything that affects native binaries
* Runtime version policies can fingerprint instead of appVersion alone
* CI fingerprint diff gates catch accidental native drift before merge
* OTA updates must target binaries built with the same runtime fingerprint
* Pair fingerprint checks with CNG - generated ios/ is not the source of truth
* EAS Workflows can run fingerprint jobs per environment

## [Migrating Manual Native Projects to CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/migrating-manual-native-projects-to-cng/)

* Inventory every ios/ and android/ diff vs a fresh SDK 57 prebuild
* Port hand edits to config plugins and modules/ before deleting committed native dirs
* Run expo prebuild --clean as the final migration gate
* Sequential SDK upgrade before CNG cutover reduces simultaneous variables
* ADR documents brownfield exceptions until full CNG parity
* Pair with Native Module Rules for third-party native library audit

## [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/)

* EAS Build runs expo prebuild when ios/ and android/ are absent
* CNG CI uploads JS + config - not generated native folders
* Brownfield CI may diff committed native dirs against prebuild output
* Fingerprint jobs gate OTA vs native rebuild decisions in PRs
* eas.json profiles must match EAS environment for credential resolution
* Lockfiles and app.config.ts are the reproducible inputs - not ios/Pods

## [Prebuild Best Practices](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/)

* Gitignore ios/ and android/ under CNG - app.config.ts and plugins are source of truth
* SDK 57 expo prebuild cleans by default - encode every native change as a plugin
* Run prebuild twice when authoring plugins - second diff must be empty
* Rebuild dev clients and store binaries when fingerprint or native deps change
* Use npx expo install for native packages - never float versions past the SDK matrix
* EAS Build generates native projects when folders are absent from the upload

Reviewed by Chris St. John·Last updated Jul 18, 2026
