# EAS Build & Submit Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / EAS Build & Submit Highlights Summary

* EAS Build runs expo prebuild + native compile in Expo-managed cloud runners
* EAS can generate and store distribution certs, provisioning profiles, and push keys
* EAS generates and stores upload keystores encrypted - eas credentials is team source of truth
* eas.json profiles are named build recipes - not the same as Android product flavors
* eas submit uploads finished EAS builds or local IPA/AAB artifacts to store consoles
* distribution: internal in eas.json targets testers - not public store users

## [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/)

* EAS Build runs expo prebuild + native compile in Expo-managed cloud runners
* eas.json profiles map development, preview, and production to credentials and env
* CNG teams upload JS + config - ios/ and android/ are generated on the build server
* developmentClient: true produces installable dev clients with expo-dev-client
* eas build --profile production --platform all is the first store-shaped compile
* Pair every profile with EAS environments - not laptop .env files

## [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/)

* EAS can generate and store distribution certs, provisioning profiles, and push keys
* App Store builds need Apple Distribution cert + App Store provisioning profile
* Internal/ad hoc builds need profiles that include registered device UDIDs
* Bundle ID in app.config.ts must match the Apple Developer portal identifier
* Push notification keys are separate from signing certs - configure once per team
* Never commit .p12 files or provisioning profiles to git - use eas credentials

## [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/)

* EAS generates and stores upload keystores encrypted - eas credentials is team source of truth
* Play App Signing holds the app signing key; you sign AABs with the upload key
* assetlinks.json must use Play App Signing SHA-256 - not the upload key fingerprint
* Losing an upload key is recoverable with Play App Signing enabled
* Never commit .jks, .keystore, or passwords to git
* versionCode must increase monotonically on every Play upload

## [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/)

* eas.json profiles are named build recipes - not the same as Android product flavors
* Map development, preview, and production to EAS environments for env var parity
* White-label apps use app.config.ts variants with distinct bundle IDs per brand
* channel on a profile ties store binaries to eas update promotion paths
* APP\_VARIANT env vars drive dynamic app.config.ts for staging vs production
* Each flavor needs separate credentials - one keystore per package name

## [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/)

* eas submit uploads finished EAS builds or local IPA/AAB artifacts to store consoles
* iOS needs App Store Connect API key or Apple ID + app-specific password
* Android needs a Play Console service account JSON with release permissions
* eas.json submit profiles mirror build profiles for repeatable CI uploads
* --auto-submit on eas build chains compile + upload in one workflow
* Submit to internal tracks first - production rollout is a separate Play Console step

## [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/)

* distribution: internal in eas.json targets testers - not public store users
* iOS ad hoc requires UDID registration via eas device:create before build
* TestFlight internal testers avoid ad hoc device limits - still uses store signing
* Android APK from EAS gives a direct install link without Play Console
* Play internal track delivers AAB through Play - closest to production delivery
* Enterprise (Apple Enterprise Program) is a separate program - not standard App Store

## [Custom Build Hooks](https://docs.wahwei/reactnative.codeguides.io/eas-build/custom-build-hooks/)

* package.json scripts eas-build-pre-install and eas-build-post-install run on EAS workers
* Hooks execute after repo upload - not a replacement for config plugins
* Use hooks for private registry auth, codegen, and asset preparation
* Avoid long-running hooks - they bill EAS build minutes
* eas-build-on-success runs locally after cloud build completes
* Custom eas.json build steps are for native pipeline control beyond npm scripts

## [EAS Build Best Practices](https://docs.wahwei/reactnative.codeguides.io/eas-build/best-practices/)

* Commit lockfiles - EAS resolves the same tree as local and CI
* Gitignore ios/ and android/ under CNG - let EAS run prebuild
* Map eas.json profiles to EAS environments - never rely on laptop .env
* Fingerprint gates decide rebuild vs eas update - not gut feel
* Use autoIncrement and appVersionSource remote for monotonic store versions
* Document eas-build hooks and non-obvious eas.json in README

Reviewed by Chris St. John·Last updated Jul 18, 2026
