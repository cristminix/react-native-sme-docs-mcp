# Android Platform Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section - Android Studio literacy, edge-to-edge, permissions, signing, testing tracks, 16 KB compliance, and Gradle performance for Expo SDK 57.

Highlights / Android Platform Best Practices

* Test on low-RAM devices, not just Pixel emulators
* Use Play internal track before production - policy and native bugs are cheaper there
* Play App Signing SHA-256 goes in assetlinks.json, not your upload key
* RN 0.86 edge-to-edge needs inset discipline - SafeAreaProvider at root
* 16 KB page size compliance is native - smoke test API 35 16 KB AVD before launch

1. **Set JDK 17 and ANDROID\_HOME before Gradle:** React Native 0.86 / AGP 8.x expect JDK 17. Point `ANDROID_HOME` at the Android SDK and add `platform-tools` to `PATH` - cryptic Gradle failures usually trace to toolchain drift.
2. **Use `npx expo run:android` for daily native loops:** Android Studio Run ▶ does not wire Metro the way Expo dev clients expect. Terminal-driven builds match how EAS and CI compile.
3. **Treat `android/` as generated in CNG:** Edit `app.config.ts` and config plugins, not hand-merge `build.gradle` on every SDK bump. Run `npx expo prebuild --clean` only when native config actually changed.
4. **Know the Gradle map:** `settings.gradle` registers modules, `app/build.gradle` holds `applicationId` and deps, `gradle.properties` holds JVM and New Arch flags. Inspect merged `AndroidManifest.xml` for final permissions.
5. **Filter `adb logcat` for RN signals:** `ReactNativeJS`, `ReactNative`, and `AndroidRuntime` tags surface JS logs and native crashes. USB debugging needs `adb reverse tcp:8081 tcp:8081` for Metro.
6. **Test on API 34–35 emulators:** Ancient API images hide edge-to-edge, photo picker, notification permission, and back-gesture behavior that RN 0.86 targets.
7. **Wrap the app in `SafeAreaProvider`:** Edge-to-edge Android (RN 0.86 default) draws behind system bars - inset hooks require a provider at the root layout.
8. **Pair `expo-status-bar` with inset padding:** Status bar modules style icon color; they do not pad content. Use `react-native-safe-area-context` for layout clearance.
9. **Theme the nav bar with `expo-navigation-bar`:** Transparent gesture nav bars need `setBackgroundColorAsync` and `setButtonStyleAsync` - often reapplied per screen on focus.
10. **Assign one inset owner per axis:** Do not stack `SafeAreaView` and manual `insets.top` on the same edge. Tab screens omit bottom safe edge when the tab bar handles it.
11. **Request permissions in context:** Explain why on a screen, then call `requestPermission` - never a splash-time permission dump. Play policy rejects "not core to app purpose" sensitive access.
12. **Prefer the system photo picker:** `expo-image-picker` one-off flows should avoid broad `READ_MEDIA_IMAGES` unless continuous gallery sync is a core feature.
13. **Audit the merged manifest after prebuild:** `rg uses-permission android/app/src/main/AndroidManifest.xml` - catch transitive permissions from unused SDKs and strip with `blockedPermissions`.
14. **Keep Data safety aligned with SDKs:** Every analytics, crash, auth, or payment SDK must appear in Play Console Data safety and your privacy policy - "no data collected" with Sentry installed is a rejection path.
15. **Request `POST_NOTIFICATIONS` on API 33+:** Before `getExpoPushTokenAsync`, check and request notification permission - pushes silently fail without it.
16. **Enable Play App Signing on new listings:** Google holds the app signing key; you keep an upload key. Upload key loss is recoverable; app signing key loss is not.
17. **Let EAS manage upload keystores:** Use `eas credentials` as team source of truth - never commit `.jks` files or passwords to git. Vault a downloaded backup.
18. **Put Play App Signing SHA-256 in assetlinks.json:** Production [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) verify against Google's re-signing cert - not your upload or debug fingerprint.
19. **Increment `versionCode` every Play upload:** Monotonic integers across all tracks. Use `autoIncrement: true` in `eas.json` or bump `android.versionCode` in `app.config.ts`.
20. **Ship internal track before production:** `eas submit` with `"track": "internal"` catches signing, Data safety, IAP, and App Links issues before public staged rollout.
21. **Test Play-delivered builds for store features:** EAS APK links and sideload debug builds do not fully exercise Play re-signing, billing, or verified App Links - install from internal track.
22. **Validate 16 KB page size on API 35:** Use 16 KB page size AVDs when available; cold-start smoke native libs before launch. Third-party `.so` SDKs are the usual compliance gap.
23. **Maintain a device matrix beyond Pixel:** Include low-RAM Samsung A-series, gesture vs 3-button nav, and a tablet or foldable width - emulator-only QA misses OEM inset and memory behavior.
24. **Tune Gradle JVM and caching:** Set `org.gradle.jvmargs`, `parallel`, and `caching` in `gradle.properties` - avoid habitual `prebuild --clean`. Enable EAS build cache for cloud compiles.
25. **Profile Gradle with `--scan` when builds regress:** Measure task time before guessing - CMake, codegen, and dex merges dominate RN 0.86; fix the actual slow task.

## FAQs

Should I read this page before or after the topic pages?

* Skim this list for orientation, then dive into topic pages as you hit each workflow (first Play upload, edge-to-edge bug, permission rejection).
* Return here as a release checklist before promoting internal → production.

Why exactly 25 items?

* Capped at 25 for one-sitting scanability - each maps to a dedicated page in Android Platform.
* Full recipes and commands live in the linked topic articles below.

Do these practices apply to bare React Native without Expo?

* Gradle, adb, Play policy, and 16 KB rules apply to all Android RN apps.
* EAS-specific items map to your CI signing and upload pipeline in bare workflows.

What is the single highest-risk Android mistake?

* **Shipping to production without internal track QA on a Play-installed build** - signing, App Links, and IAP surprises only appear with Play re-signing.

What is the most common edge-to-edge bug?

* **Bottom CTAs hidden under the gesture nav pill** - fix with `insets.bottom` on buttons and list footers, not opaque nav bar hacks.

Which permission triggers the most Play rejections?

* **Broad storage and background location** without core feature justification - use photo picker and foreground location only.

How does Android Platform relate to EAS Build docs?

* This section is Play- and device-centric; [EAS Build](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) covers cloud build profiles - use both for release trains.

When must I care about 16 KB page size?

* Targeting API 35 for Play submissions from **November 2025** onward - plan compliance on SDK 57 before the deadline, not after pre-launch blockers.

Where do App Links fit in the Android checklist?

* After first Play upload: register Play App Signing fingerprint, verify on internal track - [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/).

What device should every team own?

* At least one **low-RAM physical Android** (4 GB class) - Pixel emulators do not reproduce OOM and slow I/O your users hit daily.

## Related

* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - Android Studio, adb, Gradle mental model
* [Edge-to-Edge on Android](https://docs.wahwei/reactnative.codeguides.io/android-platform/edge-to-edge-on-android/) - status/nav bars and `expo-navigation-bar`
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - runtime permissions and Data safety
* [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) - upload keys and EAS credentials
* [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - closed/open testing before production
* [16 KB Page Size & Device Matrix](https://docs.wahwei/reactnative.codeguides.io/android-platform/16-kb-page-size-and-device-matrix/) - Play native binary requirements
* [Gradle Performance & Caching](https://docs.wahwei/reactnative.codeguides.io/android-platform/gradle-performance-and-caching/) - faster local and EAS builds
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - verified HTTPS deep links

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
