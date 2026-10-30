# Expo CLI Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Expo CLI Best Practices

* Default to LAN; use tunnel only when firewalls block Metro
* Adopt expo-dev-client before custom native modules
* Press j for React Native DevTools - not remote Chrome debugging
* Clear Metro cache when Fast Refresh behaves inconsistently
* Test on physical devices before every release candidate
* Rebuild dev client after SDK or native dependency changes

1. **Start Metro with `npx expo start`:** Use the Expo CLI entry - raw `react-native start` skips Expo-specific middleware and doctor integrations.
2. **Default to LAN on shared Wi-Fi:** Fastest iteration for phone + laptop on the same network - tunnel adds latency and external dependencies.
3. **Reach for tunnel only when blocked:** Corporate VPNs and guest Wi-Fi isolation need `--tunnel` - document the slower reload expectation for the team.
4. **Use `--clear` when bundles look stale:** Suspect Fast Refresh ghosts or wrong entry files - cache clears are cheaper than hour-long debug rabbit holes.
5. **Standardize npm scripts:** `start`, `start:tunnel`, `ios`, `android` - onboarding should not require memorizing flag combinations.
6. **Open iOS Simulator with `i` from the terminal:** Faster than context-switching to Xcode for daily UI work - keep one simulator booted during feature dev.
7. **Pick a realistic Android API level:** Match RN 0.86 guidance (recent API images) - ancient emulators hide edge-to-edge and permission regressions.
8. **Snapshot simulators in CI screenshots:** `xcrun simctl` and `adb exec-out screencap` - visual regression does not need physical devices for every PR.
9. **Test on a physical device weekly minimum:** Simulators miss camera, push, haptics, and performance - USB or internal EAS builds close the gap.
10. **Use `expo run:ios --device` for native iteration:** Development builds on hardware beat Expo Go once custom native code ships.
11. **Pair Android USB with `adb reverse` when needed:** `localhost` Metro on device workflows need reverse port forwarding - document the command in README.
12. **Adopt expo-dev-client early:** Install before the first native module - Expo Go cannot load arbitrary native dependencies.
13. **Start dev client with `npx expo start --dev-client`:** The launcher expects the custom scheme - mixing Expo Go flags causes confusing connection errors.
14. **Rebuild dev client on SDK bumps:** OTA cannot change native shells - schedule `eas build --profile development` in the upgrade checklist.
15. **Register custom dev menu items sparingly:** `registerDevMenuItems` for feature flags and env badges - not ten entries nobody remembers.
16. **Open React Native DevTools with `j`:** Hermes debugging lives in DevTools - remote Chrome debugging is unsupported on modern RN.
17. **Use Components panel for layout bugs:** Select-on-device beats `console.log` layout guesses - inspect props and style arrays live.
18. **Emulate light/dark in DevTools on RN 0.86:** Command Palette media emulation catches theme bugs without flipping system settings constantly.
19. **Treat Flipper as legacy:** Default to DevTools + platform IDEs - do not add Flipper to greenfield Expo SDK 57 apps without a concrete gap.
20. **Use Xcode and Android Studio for native crashes:** JS DevTools do not replace native stack traces - open the native IDE when the redbox is native-side.
21. **Trust Fast Refresh, not Hot Reload:** Hot Reload is gone - if state looks wrong after edit, check mixed default/named exports breaking refresh boundaries.
22. **Mark files `// @refresh reset` when needed:** Stateful modules that must remount should opt out of preservation - document why in the comment.
23. **Expect useEffect to re-run after refresh:** Do not fight re-fetch on refresh - idempotent effects or guard with refs when duplication hurts.
24. **Wireless debugging after USB pairing works:** Android `adb pair` / iOS Xcode network pairing - verify once per device, then drop the cable for desk testing.
25. **Internal distribution for QA outside engineering:** EAS `preview` builds for PM and design - Expo Go is not a stand-in for production native behavior.

## FAQs

Why is tunnel slow?

* Traffic routes through Expo's relay - fine for demos, poor for all-day dev.
* Fix LAN/firewall issues first; keep tunnel as fallback.

Do I need Flipper in 2026?

* Rarely for Expo managed/prebuild apps.
* Use RN DevTools, Sentry, and native IDEs unless you depend on a Flipper-only plugin.

When does Fast Refresh lose state?

* Non-component exports edited alongside components, class components, and files marked `@refresh reset`.
* Full reload (`r`) is the escape hatch - not a daily habit.

## Related

* [Local Development Basics](https://docs.wahwei/reactnative.codeguides.io/expo-cli/local-development-basics/) - expo start, LAN, tunnel, QR
* [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - setup and snapshots
* [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB, wireless, internal builds
* [expo-dev-client](https://docs.wahwei/reactnative.codeguides.io/expo-cli/expo-dev-client/) - custom dev menus and native iteration
* [React Native DevTools](https://docs.wahwei/reactnative.codeguides.io/expo-cli/react-native-devtools/) - inspector and RN 0.86 emulation
* [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/) - state preservation rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
