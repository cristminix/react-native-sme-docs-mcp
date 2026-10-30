# Expo SDK Packages Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo SDK Packages Highlights Summary

* `npx expo install` pins semver ranges tested against your SDK - plain npm install can drift
* Request notification permission after an in-app rationale - not on first mount
* Request When In Use first - upgrade to Always only when background is essential
* expo-camera for live preview; expo-image-picker for library selection
* SDK 57 introduces File, Directory, and Paths - prefer over string URI juggling
* SecureStore maps to Keychain (iOS) and Keystore (Android) - not encrypted files

## [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/)

* `npx expo install` pins semver ranges tested against your SDK - plain npm install can drift
* Every Expo module version is validated against the `expo` package in package.json
* Config plugins require a development build or prebuild - Expo Go ignores many native plugins
* Import side effects at app entry for TaskManager and some native listeners
* Run `npx expo doctor` after SDK bumps to catch incompatible native modules early
* Unimodules share a single native bootstrap - one mismatched package breaks the whole binary

## [expo-notifications](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-notifications/)

* Request notification permission after an in-app rationale - not on first mount
* Android 13+ requires POST\_NOTIFICATIONS - create channels before posting
* setNotificationHandler controls foreground banners on iOS
* Push tokens require a development build and EAS projectId - Expo Go is limited
* Register token server-side per device - rotate on reinstall and logout
* Import notification handlers at app entry before the first push arrives

## [expo-location](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-location/)

* Request When In Use first - upgrade to Always only when background is essential
* Info.plist and Android manifest strings must explain why background access exists
* Background location requires a development build and UIBackgroundModes
* Stop updates on unmount - forgotten watchers drain battery
* Geofencing uses TaskManager.defineTask in global scope
* Never ship vague permission copy - App Review rejects 'This app needs location'

## [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/)

* expo-camera for live preview; expo-image-picker for library selection
* Request camera permission after explaining why capture is needed
* Downscale images before upload - full-resolution URIs exhaust memory
* Use quality and allowsEditing options to cap payload size
* Revoke object URLs and clear large base64 strings after upload
* Config plugin microphone permission only when recording video with audio

## [expo-file-system](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/)

* SDK 57 introduces File, Directory, and Paths - prefer over string URI juggling
* documentDirectory persists; cacheDirectory is evictable by the OS
* Never store secrets in Files - use expo-secure-store
* Legacy API lives at expo-file-system/legacy during migration
* Download with File.downloadFileAsync or createDownloadTask for progress
* Store file paths in SQLite - not multi-MB blobs in the database

## [expo-secure-store & expo-crypto](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/)

* SecureStore maps to Keychain (iOS) and Keystore (Android) - not encrypted files
* ~2 KB per-item limit - store tokens, not JSON user profiles
* WHEN\_UNLOCKED\_THIS\_DEVICE\_ONLY excludes iCloud Keychain export
* expo-crypto provides SHA digests and secure random bytes - not password storage
* Clear SecureStore keys on logout alongside Query cache and navigation
* Auth tokens pair with auth-session patterns - never AsyncStorage

## [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/)

* Updates.checkForUpdateAsync detects new JS bundles on your EAS Update channel
* fetchUpdateAsync downloads in background - reloadAsync applies on next launch or immediately
* Native changes still require a store build - OTA cannot add config plugins
* UseUpdates hook exposes checking/fetching state for in-app update UX
* Disable indiscriminate reload during active forms - prompt or defer to background
* Development builds skip production update channels - test on release profile

## [expo-task-manager & Background Tasks](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-task-manager-and-background-tasks/)

* TaskManager.defineTask must run in global scope before React mounts
* expo-background-task schedules deferrable work - minimum 15 minute interval
* Location geofencing and background fetch share the same defineTask registry
* Return BackgroundTaskResult.Success or Failed - failed tasks may retry per OS policy
* No React hooks inside defineTask - open SQLite and storage imperatively
* iOS simulators do not run BGTaskScheduler - test on physical devices

## [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/)

* 25 essentials for installing, permissioning, and operating Expo SDK modules
* Always npx expo install - never drift from the SDK compatibility matrix
* Pre-prompt before every OS permission dialog - especially notifications and location
* Graceful denial: Settings deep link, degraded mode, never infinite spinners
* Secrets in SecureStore; files in FileSystem; relational data in SQLite
* Background work is deferrable - foreground reconnect remains primary

Reviewed by Chris St. John·Last updated Jul 18, 2026
