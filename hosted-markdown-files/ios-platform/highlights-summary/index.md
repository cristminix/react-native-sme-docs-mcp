# iOS Platform Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / iOS Platform Highlights Summary

* Open the .xcworkspace - never the .xcodeproj when CocoaPods is present
* Run npx pod-install from the repo root - it picks the right Ruby/CocoaPods env
* Entitlements are signed capabilities - they ship in the IPA, not via OTA
* Guideline 2.1 crashes on launch are the fastest rejection - test Release builds on device
* Internal testers: up to 100 App Store Connect users - no Beta App Review
* PrivacyInfo.xcprivacy declares Required Reason API usage - missing reasons trigger ITMS-91053

## [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/)

* Open the .xcworkspace - never the .xcodeproj when CocoaPods is present
* Schemes select which target builds; Debug vs Release changes signing and optimizations
* npx expo run:ios wraps prebuild + xcodebuild - you rarely open Xcode daily
* Simulator is fast; device is truth for push, camera, universal links, and performance
* Signing lives in Apple Developer + EAS - local Xcode signing is for USB debugging
* When ios/ is gitignored (CNG), treat Xcode as a debugger - not the source of truth

## [CocoaPods & Pod Install](https://docs.wahwei/reactnative.codeguides.io/ios-platform/cocoapods-and-pod-install/)

* Run npx pod-install from the repo root - it picks the right Ruby/CocoaPods env
* Commit Podfile.lock when ios/ is in git; regenerate when ios/ is CNG-gitignored
* Apple Silicon: use arm64 simulators; avoid Rosetta-only x86\_64 simulator runtimes
* expo-modules-autolinking writes Podfile entries - do not hand-edit for standard packages
* CDN trunk failures are transient - retry pod install before chasing phantom header errors
* Clean pods when upgrades hallucinate: rm -rf Pods Podfile.lock && npx pod-install

## [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/)

* Entitlements are signed capabilities - they ship in the IPA, not via OTA
* Declare push, associated domains, and background modes in app.config.ts or plugins
* associatedDomains uses applinks: prefix for universal links - rebuild after changes
* Keychain access groups require matching entitlements for expo-secure-store sharing
* UIBackgroundModes must match real behavior - App Review rejects speculative entries
* Expo Go cannot represent your production entitlements - test on dev clients

## [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/)

* Guideline 2.1 crashes on launch are the fastest rejection - test Release builds on device
* ITMS-91053 missing privacy manifest reasons block upload before human review
* Sign in with Apple is mandatory when third-party social login creates accounts
* Account deletion in-app is required for apps that support account creation
* Permission strings and Privacy Nutrition Labels must match actual SDK behavior
* Expo WebView shells and minimum-functionality clones fail Guideline 4.2

## [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/)

* Internal testers: up to 100 App Store Connect users - no Beta App Review
* External testers: up to 10,000 - requires Beta App Review per build
* TestFlight builds expire after 90 days - plan rebuild cadence for long QA cycles
* eas build + eas submit uploads IPAs; Connect distributes to TestFlight groups
* TestFlight uses production APNs - match push entitlements before push QA
* Universal links and associated domains need TestFlight builds, not Expo Go

## [iOS Privacy Manifests & Required Reason APIs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/)

* PrivacyInfo.xcprivacy declares Required Reason API usage - missing reasons trigger ITMS-91053
* Configure via expo.ios.privacyManifests in app.config.ts under CNG
* Expo SDK packages ship manifests in node\_modules - aggregate reasons into your app manifest
* Apple may not merge static pod manifests - your app manifest must list combined reasons
* NSPrivacyCollectedDataTypes documents data collection for Nutrition Labels alignment
* Rebuild native after manifest changes - not an OTA update

## [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/)

* expo-widgets adds a separate Widget Extension target - not available in Expo Go
* App groups bridge data between main app and widgets via group. identifiers
* Layouts use @expo/ui SwiftUI components - not standard React Native views
* Live Activities need enablePushNotifications and production APNs for remote updates
* Widget deep links should use universal links - see iOS Universal Links
* App Review rejects decorative widgets with no real utility - ship meaningful glanceable value

## [iOS Platform Best Practices](https://docs.wahwei/reactnative.codeguides.io/ios-platform/best-practices/)

* 25 essentials for Xcode, CocoaPods, entitlements, TestFlight, and App Review
* Treat entitlements as release artifacts - rebuild after push, domains, or background mode changes
* TestFlight production APNs and universal links on device before App Store submit
* Privacy manifests and Nutrition Labels must match SDK reality - ITMS-91053 blocks upload
* CNG: app.config.ts owns native truth - not Xcode tabs that prebuild overwrites
* Platform parity: ship iOS-native value where Apple review cares; don't cargo-cult Android shortcuts

pbqrthvqrf.vb|ptvb920|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
