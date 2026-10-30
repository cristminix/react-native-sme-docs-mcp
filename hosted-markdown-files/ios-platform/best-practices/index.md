# iOS Platform Best Practices

A condensed summary of **25 iOS platform essentials** for Expo SDK 57 teams - parity decisions when Android can do more cheaply, drawn from every page in this section.

Highlights / iOS Platform Best Practices

* 25 essentials for Xcode, CocoaPods, entitlements, TestFlight, and App Review
* Treat entitlements as release artifacts - rebuild after push, domains, or background mode changes
* TestFlight production APNs and universal links on device before App Store submit
* Privacy manifests and Nutrition Labels must match SDK reality - ITMS-91053 blocks upload
* CNG: app.config.ts owns native truth - not Xcode tabs that prebuild overwrites
* Platform parity: ship iOS-native value where Apple review cares; don't cargo-cult Android shortcuts

1. **Open `.xcworkspace`, not `.xcodeproj`:** CocoaPods projects fail mysteriously when the workspace is skipped - `open ios/*.xcworkspace` is the only correct Xcode entry when `Pods/` exists.
2. **CLI-first daily builds:** Prefer `npx expo run:ios` over living in Xcode - native IDE is for signing mysteries, Instruments, and pod compile errors, not JS iteration.
3. **Simulator for speed, device for truth:** Push, universal links, Live Activities, BGTaskScheduler, camera, and biometrics require physical hardware - simulators give false confidence.
4. **Gitignore `ios/` under CNG:** Commit `app.config.ts` and plugins; regenerate native on EAS or `npx expo prebuild` - hand-edited `pbxproj` drifts on every SDK bump.
5. **Commit `Podfile.lock` when `ios/` is in git:** Bare teams need deterministic pods on CI - `pod install` not `pod update` on release branches.
6. **Use `npx pod-install` from repo root:** Avoids wrong-directory `Pods/` and matches Expo's expected CocoaPods invocation across M-series and Intel Macs.
7. **Prefer arm64 simulators on Apple Silicon:** Rosetta x86\_64 simulators are slower and cause architecture mismatch linker errors with modern RN 0.86 pods.
8. **Entitlements ship in the IPA, not OTA:** Push, associated domains, app groups, and background modes need `eas build` after `app.config.ts` changes - EAS Update cannot add capabilities.
9. **Declare `associatedDomains` with `applinks:` prefix:** Universal links fail silently in Safari when the prefix is wrong - pair with hosted AASA and rebuild; see [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/).
10. **Match Apple Developer portal and config:** App ID capabilities, bundle identifier, AASA `appID`, and EAS credentials must be identical strings - typos open Safari instead of your app.
11. **Production push uses production APNs:** TestFlight and App Store builds use `aps-environment: production` - sandbox tokens never deliver to TestFlight users.
12. **Only declare `UIBackgroundModes` you implement:** Speculative `audio`, `location`, or `fetch` entries trigger Guideline 2.5.4 - remove copy-paste modes from `infoPlist`.
13. **Run `npx expo-doctor` before every iOS release:** Catches version skew, invalid config, and dependency mistakes before they burn a TestFlight cycle.
14. **Aggregate privacy manifests before upload:** Merge `NSPrivacyAccessedAPITypes` from Expo SDK and third-party `PrivacyInfo.xcprivacy` files - ITMS-91053 blocks processing in minutes.
15. **Align Privacy Nutrition Labels with runtime SDKs:** Crash reporters, analytics, and auth SDKs collect data - labels must match manifests and Guideline 5.1.1 or human review rejects.
16. **Offer Sign in with Apple when offering Google/Facebook account creation:** Guideline 4.8 is enforced - `expo-apple-authentication` is cheaper than resubmission loops.
17. **Ship in-app account deletion:** If users can register in-app, Settings → Delete Account must call your backend - web-only deletion links fail review in 2026.
18. **Test Release builds before `eas submit`:** Metro Debug hides missing native modules, bad env embed, and Hermes production-only crashes - dogfood `production` or `preview` profiles.
19. **Use TestFlight internal for engineering, external for UAT:** Internal skips Beta App Review (100 Connect users); external scales to 10,000 with a lighter Apple gate - both expire at **90 days**.
20. **Plan TestFlight rebuild cadence:** Long betas need scheduled `eas build` before expiration - automate Connect API reminders at 14 days remaining.
21. **Fill App Review Information with working demo credentials:** Reviewers cannot log in is an instant 2.1 rejection - rotate passwords and document guest paths in notes.
22. **Widgets and Live Activities are separate targets:** `expo-widgets` uses SwiftUI - not RN views; requires app groups, dev client, and meaningful utility to pass 4.2 - not Expo Go.
23. **Do not cargo-cult Android patterns on iOS:** Side-loading APKs, arbitrary background services, and intent-based deep links have no iOS equivalent - invest in entitlements, AASA, and TestFlight instead.
24. **Verify entitlements in the built IPA before blaming JS:** `codesign -d --entitlements :-` on the archived `.app` settles associated-domain disputes faster than guessing Router config.
25. **Document iOS-only scope in parity ADRs:** When Android ships widgets or flexible backgrounds first, record iOS timeline, review risk, and user impact - stakeholders should not assume feature symmetry without native cost.

## FAQs

What is the minimum iOS toolchain for Expo SDK 57?

* macOS with Xcode current enough for iOS 18 SDK (Xcode 16+).
* Apple Developer Program for device, TestFlight, and App Store.
* EAS Build optional but recommended - local `eas build --local` reproduces cloud when needed.

CNG or committed ios/ for a new greenfield app?

* Default **CNG** (gitignored native) - upgrade path is `expo install --fix` + prebuild.
* Commit `ios/` only when brownfield merges or enterprise policies require it - see [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).

How does iOS platform work relate to EAS Build?

* EAS runs prebuild (when `ios/` absent), `pod install`, compile, and sign - your `app.config.ts` is still the source of entitlements and manifests.
* Cross-read [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/).

When should we skip iOS widgets?

* When glanceable value is low, team lacks capacity for extension QA, or Android parity is a hard requirement short-term.
* Rich push or in-app Live Activity may suffice - document the ADR.

## Related

* [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - Xcode mental model
* [CocoaPods & Pod Install](https://docs.wahwei/reactnative.codeguides.io/ios-platform/cocoapods-and-pod-install/) - lockfile and Apple Silicon
* [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/) - push, domains, keychain
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - 2026 rejection patterns
* [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) - internal/external testers
* [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/) - Required Reason APIs
* [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/) - expo-widgets boundaries
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - associated domains and AASA
* [Android Platform Best Practices](https://docs.wahwei/reactnative.codeguides.io/android-platform/best-practices/) - cross-platform parity context

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k2121213x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
