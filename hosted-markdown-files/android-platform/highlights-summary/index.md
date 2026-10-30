# Android Platform Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Android Platform Highlights Summary

* You rarely edit Gradle by hand in Expo CNG - config plugins and prebuild own the native project
* RN 0.86 draws content behind status and navigation bars by default on Android
* Dangerous permissions require runtime prompts - manifest declaration alone is not enough
* You sign AABs with an upload key; Google re-signs with the app signing key for users
* Internal → closed → open → production is the risk gradient - catch policy and native bugs early
* Google Play requires 16 KB memory page support for apps targeting Android 15+ (API 35)

## [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/)

* You rarely edit Gradle by hand in Expo CNG - config plugins and prebuild own the native project
* adb is the RN dev's terminal: devices, logcat, port reverse, and APK install
* settings.gradle registers modules; app/build.gradle is where app-level deps and signing live
* Run npx expo run:android instead of opening Android Studio for day-to-day JS work
* JAVA\_HOME and ANDROID\_HOME must point at JDK 17 and the Android SDK - wrong paths cause cryptic Gradle failures

## [Edge-to-Edge on Android](https://docs.wahwei/reactnative.codeguides.io/android-platform/edge-to-edge-on-android/)

* RN 0.86 draws content behind status and navigation bars by default on Android
* Safe area insets - not opaque system bars - keep tappable UI out of the overlap zone
* expo-status-bar controls icon style; expo-navigation-bar controls Android nav bar color and visibility
* Test on API 35 emulators - classic opaque-bar assumptions break on modern devices
* Tab bars and FABs need bottom inset padding; full-bleed heroes can ignore top inset intentionally

## [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/)

* Dangerous permissions require runtime prompts - manifest declaration alone is not enough
* Android 13+ photo picker avoids broad storage READ permissions for one-off image selection
* POST\_NOTIFICATIONS is runtime on Android 13+ - request before sending FCM marketing pushes
* Play Console Data safety form must match actual SDK and API behavior - mismatches trigger rejection
* Declare only permissions you use - Play policy flags READ\_MEDIA\_IMAGES and location as high scrutiny

## [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/)

* You sign AABs with an upload key; Google re-signs with the app signing key for users
* Play App Signing certificate SHA-256 goes in assetlinks.json - not your upload key
* EAS manages keystores remotely - eas credentials is the source of truth for teams
* Losing an upload key is recoverable with Play App Signing; losing the app signing key is catastrophic
* Never commit keystore files or passwords to git - use EAS secrets or CI encrypted storage

## [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/)

* Internal → closed → open → production is the risk gradient - catch policy and native bugs early
* Internal track accepts builds in minutes; up to 100 testers - ideal for QA and founders
* Closed testing supports email lists and Google Groups before public open beta
* eas submit --track internal automates upload; versionCode must monotonically increase
* Production staged rollout percentage is separate - start at 5–10% after tracks pass

## [16 KB Page Size & Device Matrix](https://docs.wahwei/reactnative.codeguides.io/android-platform/16-kb-page-size-and-device-matrix/)

* Google Play requires 16 KB memory page support for apps targeting Android 15+ (API 35)
* Deadline: November 1, 2025 for new apps and updates targeting API 35; broader enforcement continues into 2026
* Failure mode is native crash at load time - .so alignment, not JavaScript
* Expo SDK 57 / RN 0.86 ship rebuilt native deps - third-party .so files are the usual gap
* Test on 16 KB Android 15 emulator images and at least one physical device class in your matrix

## [Gradle Performance & Caching](https://docs.wahwei/reactnative.codeguides.io/android-platform/gradle-performance-and-caching/)

* gradle.properties JVM heap and parallel workers dominate local clean build time
* Avoid expo prebuild --clean unless native config changed - it invalidates Gradle caches
* EAS remote build cache persists android/ Gradle outputs between cloud builds
* Configuration cache speeds sync; incompatible plugins break it - enable gradually
* Dependency resolution hits Maven on every cold CI node - lock versions and cache ~/.gradle

## [Android Platform Best Practices](https://docs.wahwei/reactnative.codeguides.io/android-platform/best-practices/)

* Test on low-RAM devices, not just Pixel emulators
* Use Play internal track before production - policy and native bugs are cheaper there
* Play App Signing SHA-256 goes in assetlinks.json, not your upload key
* RN 0.86 edge-to-edge needs inset discipline - SafeAreaProvider at root
* 16 KB page size compliance is native - smoke test API 35 16 KB AVD before launch

Reviewed by Chris St. John·Last updated Jul 18, 2026
