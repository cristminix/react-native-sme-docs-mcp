# EAS Build Best Practices

A condensed summary of the **25 most important best practices** drawn from every page in EAS Build - reproducible builds with locked dependencies, fingerprint gates, and credential hygiene on Expo SDK 57.

Highlights / EAS Build Best Practices

* Commit lockfiles - EAS resolves the same tree as local and CI
* Gitignore ios/ and android/ under CNG - let EAS run prebuild
* Map eas.json profiles to EAS environments - never rely on laptop .env
* Fingerprint gates decide rebuild vs eas update - not gut feel
* Use autoIncrement and appVersionSource remote for monotonic store versions
* Document eas-build hooks and non-obvious eas.json in README

1. **Run `eas build:configure` early:** Link `projectId` in `app.config.ts` before the first cloud compile - builds without it fail with opaque config errors.
2. **Commit lockfiles with every native-affecting change:** `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` must match what EAS installs - floating ranges cause non-reproducible binaries.
3. **Gitignore `ios/` and `android/` under CNG:** Upload JS + config - EAS runs `expo prebuild` when native folders are absent. See [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).
4. **Use three baseline profiles:** `development`, `preview`, `production` in `eas.json` - avoid engineer-named one-off profiles that rot undocumented.
5. **Bind every profile to an EAS environment:** `environment: "production"` pulls vars from Expo dashboard - local `.env.local` is ignored on build runners.
6. **Align `channel` with `eas update`:** Production binaries on `channel: "production"` must receive updates published to the same channel - [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/).
7. **Set explicit `runtimeVersion` policy:** Use `appVersion`, `sdkVersion`, or `fingerprint` consistently - mismatch strands users on stale JS silently.
8. **Adopt fingerprint CI gates:** `@expo/fingerprint` diff before merge tells you whether OTA is safe or a new `eas build` is mandatory.
9. **Rebuild dev clients after native changes:** SDK bumps, new native modules, and config plugin edits require new `development` profile builds - OTA cannot upgrade embedded native code.
10. **Let EAS manage iOS credentials:** Distribution certs and provisioning profiles stored encrypted - teammates use `--non-interactive` without Xcode signing exports.
11. **Let EAS generate Android keystores for greenfield apps:** Upload existing keystores only when migrating a live Play app - fingerprint must match Play Console upload certificate.
12. **Enable Play App Signing:** Google holds the app signing key - upload key loss is recoverable; app signing key loss is catastrophic.
13. **Use `buildType: "app-bundle"` for Play production:** APK is for internal sideload preview - AAB is required for store production uploads.
14. **Enable `autoIncrement` on store profiles:** Remote `buildNumber` / `versionCode` prevents "redundant binary" and "version code already used" rejections.
15. **Register iOS devices before ad hoc builds:** `eas device:create` → tester enrollment → rebuild - profiles embed UDIDs at compile time.
16. **Prefer TestFlight internal over ad hoc for iOS QA:** Production signing, easier installs, no per-device profile rebuild for ASC team members - [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/).
17. **Submit to Play internal track before production:** Catch signing and policy issues on up to 100 testers - promote through closed → open → staged rollout.
18. **Store submit secrets in CI vaults:** App Store Connect `.p8` and Play service account JSON - never in git; reference paths in `eas.json` submit profiles.
19. **Use `EXPO_TOKEN` for CI builds and submits:** Machine tokens from expo.dev - personal session tokens expire and break pipelines.
20. **Run `npx expo-doctor` before `eas build`:** Catch invalid config and SDK version skew before spending EAS minutes on a doomed compile.
21. **Express native changes in config plugins:** Hand-editing generated `Info.plist` or `build.gradle` is lost on prebuild `--clean` - hooks are not a substitute.
22. **Document `eas-build-pre-install` / `post-install` hooks:** Non-obvious pipeline steps belong in README - future engineers will not read `package.json` scripts first.
23. **Keep hooks fast:** Private registry auth and codegen are fine - 20-minute E2E suites belong in CI gates before triggering EAS, not on the worker.
24. **Pin `cli.version` in eas.json:** Ensures local and CI use compatible EAS CLI semantics - bump deliberately when adopting new flags.
25. **Physical device smoke test after credential or plugin changes:** Simulators miss push entitlements, App Links, and signing edge cases that only appear on signed IPAs and release APKs.

## FAQs

When is OTA safe after a merged PR?

* Fingerprint unchanged since last store binary → JS-only fixes may use `eas update`.
* Fingerprint changed → new `eas build` for production and development clients.
* See [Fingerprint & Native Change Detection](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/).

Should preview builds use internal or store distribution?

* **internal** - fastest APK/ad hoc loops for daily QA.
* **store** + TestFlight when you need production-identical signing and push environment.
* Both are release-compiled - preview is not a debug binary.

How do we onboard a new engineer to EAS builds?

1. `eas login` + clone repo with lockfile
2. `eas build --profile development --platform ios` (simulator) or Android APK
3. Install dev client → `npx expo start --dev-client`
4. Read [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) and credential pages before touching production profiles.

What is the fastest validation loop before EAS?

1. `npx expo-doctor`
2. `npx expo prebuild --no-install` (twice - zero diff on second run)
3. `eas build --profile preview --platform <one>` for device proof
4. Promote to production profile only after QA sign-off.

Does Expo Go replace EAS Build for custom native code?

* No - Expo Go uses a fixed binary and ignores your entitlements and custom modules.
* Custom native code requires prebuild + dev client or store build - [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/).

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - ten examples for first cloud builds
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - signing credential cookbook
* [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/) - upload keys and Play App Signing
* [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - environment and white-label mapping
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - store upload automation
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - ad hoc, TestFlight, Play internal
* [Custom Build Hooks](https://docs.wahwei/reactnative.codeguides.io/eas-build/custom-build-hooks/) - pre/post install pipeline extension
* [../cng-prebuild/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/) - CNG and prebuild summary
* [../cng-prebuild/fingerprint-and-native-change-detection/fingerprint-and-native-change-detection.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/) - native change gates
* [../ios-platform/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/best-practices/) - iOS platform summary
* [../android-platform/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/best-practices/) - Android platform summary
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - OTA promotion and rollback rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
