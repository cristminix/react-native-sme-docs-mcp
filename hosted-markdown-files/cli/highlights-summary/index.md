# macOS & Linux CLI Highlights Summary

Every highlight bullet from the 5 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / macOS & Linux CLI Highlights Summary

* npx expo start is the daily entry - add --dev-client when native modules require your bundle ID
* xcrun simctl list devices available shows bootable runtimes without opening Simulator.app
* adb devices -l confirms emulator and USB hardware before expo run:android
* eas build:list --json is the canonical EAS artifact feed for shell scripts
* 25 portable CLI essentials for Expo SDK 57 teams on macOS and Linux

## [CLI Basics for RN](https://docs.wahwei/reactnative.codeguides.io/cli/cli-basics-for-rn/)

* npx expo start is the daily entry - add --dev-client when native modules require your bundle ID
* npx expo install pins packages to the SDK 57 matrix - never raw npm install for Expo modules
* npx expo-doctor catches version skew before Metro throws obscure transform errors
* npx expo run:ios and run:android wrap prebuild + native compile for local dev clients
* eas build produces signed store binaries - eas update ships JS-only OTA bundles
* Same npm scripts locally and in CI - lint, typecheck, and test before eas build --non-interactive

## [xcrun simctl & iOS Simulators](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/)

* xcrun simctl list devices available shows bootable runtimes without opening Simulator.app
* simctl boot + open -a Simulator boots headlessly then brings up the GUI
* simctl install pushes dev-client IPAs and .app bundles without Xcode Run
* simctl io booted screenshot captures CI artifacts and bug reports
* log stream --predicate filters native noise - pair with Metro for JS+native triage
* Simulator is fast for UI; device is truth for push, universal links, and biometrics

## [adb & Android Devices](https://docs.wahwei/reactnative.codeguides.io/cli/adb-and-android-devices/)

* adb devices -l confirms emulator and USB hardware before expo run:android
* adb reverse tcp:8081 tcp:8081 lets USB devices reach Metro without LAN IP hunting
* adb logcat '\*:S' ReactNativeJS:V filters JS console noise from system spam
* adb install -r pushes EAS APKs and local assembleDebug outputs
* adb shell am start opens deep links and cold-starts the dev client in one line
* Multiple devices require -s SERIAL on every adb subcommand

## [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/)

* eas build:list --json is the canonical EAS artifact feed for shell scripts
* jq -r selects fields without writing Node one-off parsers in CI
* rg searches JSONL build logs faster than grep - respects .gitignore, skips binaries
* Combine curl + jq to download the latest finished APK URL in one pipeline
* GitHub Actions step outputs pair with jq for downstream Maestro or adb install
* Keep jq filters in repo scripts - same query locally and on CI runners

## [macOS & Linux CLI Best Practices](https://docs.wahwei/reactnative.codeguides.io/cli/best-practices/)

* 25 portable CLI essentials for Expo SDK 57 teams on macOS and Linux
* Check scripts into scripts/ - same bash locally, on GitHub Actions, and EAS hooks
* Prefer npx expo and npx eas-cli over global CLI drift
* Pin jq/rg queries next to CI workflows - not copy-pasted Slack snippets
* Platform tools: simctl for iOS state, adb reverse for USB Metro
* Parse eas build:list --json - never scrape human tables in automation

Reviewed by Chris St. John·Last updated Jul 18, 2026
