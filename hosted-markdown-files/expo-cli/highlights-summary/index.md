# Expo CLI & Dev Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo CLI & Dev Highlights Summary

* `npx expo start` launches Metro, prints a QR code, and keeps Fast Refresh running on save
* Press i or a in Expo CLI to launch iOS Simulator or Android Emulator
* Android: enable USB debugging, verify with adb devices, then npx expo run:android
* npx expo install expo-dev-client adds the development-build launcher and dev menu
* Press `j` in Metro or choose Open DevTools from the in-app dev menu
* Flipper is legacy for React Native JS debugging - RN DevTools replaced it from 0.76 onward

## [Local Development Basics](https://docs.wahwei/reactnative.codeguides.io/expo-cli/local-development-basics/)

* `npx expo start` launches Metro, prints a QR code, and keeps Fast Refresh running on save
* LAN is the default and fastest path when your laptop and phone share Wi‑Fi
* Tunnel reaches devices across VPNs and corporate firewalls - expect slower reloads
* Press `i` or `a` in the terminal to boot the iOS Simulator or Android emulator without retyping flags
* Expo Go is fastest for SDK-only modules; `expo-dev-client` is required once you add custom native code
* `--clear` resets Metro cache after dependency, Babel, or SDK changes
* Team `package.json` scripts keep host mode and client type consistent across machines

## [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/)

* Press i or a in Expo CLI to launch iOS Simulator or Android Emulator
* Shift+I and Shift+A pick a specific device when the default is wrong
* Android 16 (API 36) SDK is required to compile RN 0.86 - install it in Android Studio
* Capture simulator screenshots with xcrun simctl and adb for visual regression baselines
* Run a device matrix across phone, tablet, and OS versions before release

## [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/)

* Android: enable USB debugging, verify with adb devices, then npx expo run:android
* iOS: trust the Mac, enable Developer Mode on iOS 16+, pair in Xcode Devices window
* Wireless debugging removes the cable after the first USB pairing
* Internal distribution via EAS puts QA builds on TestFlight and Play internal tracks
* Physical hardware is mandatory for camera, push, haptics, and store-like performance

## [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/)

* npx expo install expo-dev-client adds the development-build launcher and dev menu
* Configure launchMode and defaultLaunchURL in app.json - requires a native rebuild
* registerDevMenuItems adds team shortcuts without forking native code
* npx expo start --dev-client serves JS to your custom binary, not Expo Go
* Native module changes need eas build or npx expo run:\* - JS still hot-reloads

## [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/)

* Press `j` in Metro or choose Open DevTools from the in-app dev menu
* React Components panel is the element inspector - select on device, edit props live
* Performance and Network panels ship in RN 0.83+; Expo apps may still show Expo Network for some requests
* RN 0.86 adds light/dark emulation via the DevTools Command Palette - no device settings change
* Hermes is required - remote Chrome debugging via chrome://inspect is unsupported
* DevTools launches as a bundled desktop app on macOS; browser fallback exists behind corporate firewalls

## [Flipper & Alternative Debuggers](https://docs.wahwei/reactnative.codeguides.io/expo-cli/flipper-and-alternative-debuggers/)

* Flipper is legacy for React Native JS debugging - RN DevTools replaced it from 0.76 onward
* Remote Chrome debugging and chrome://inspect are unsupported on Hermes stacks
* Use Xcode and Android Studio for native crashes, layout, and platform logs
* RN 0.85+ allows multiple CDP clients - DevTools and VS Code extensions can coexist
* Expo Go and dev-client both expose the same DevTools entry (`j` / dev menu)
* Reach for Flipper only for unmaintained native plugins - plan migration to RN DevTools

## [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/)

* Hot Reload is removed - Fast Refresh is the only live-reload path in RN 0.86
* Fast Refresh preserves function component state when the edited file exports only components
* Mixed exports (components + constants) force broader re-execution and often reset state
* Use // @refresh reset to force remount when tuning mount-only effects or animations
* Stale bundles after dependency changes need npx expo start --clear, not toggling reload modes
* useEffect always re-runs on Fast Refresh - design effects to tolerate occasional re-execution

## [Expo CLI Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-cli/best-practices/)

* Default to LAN; use tunnel only when firewalls block Metro
* Adopt expo-dev-client before custom native modules
* Press j for React Native DevTools - not remote Chrome debugging
* Clear Metro cache when Fast Refresh behaves inconsistently
* Test on physical devices before every release candidate
* Rebuild dev client after SDK or native dependency changes

3730363230327c3732396f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
