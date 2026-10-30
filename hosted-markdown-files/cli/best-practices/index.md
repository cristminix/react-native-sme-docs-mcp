# macOS & Linux CLI Best Practices

A condensed summary of **25 macOS and Linux CLI essentials** for Expo SDK 57 teams - shared portable scripts, device tooling, and JSON automation drawn from every page in this section.

Highlights / macOS & Linux CLI Best Practices

* 25 portable CLI essentials for Expo SDK 57 teams on macOS and Linux
* Check scripts into scripts/ - same bash locally, on GitHub Actions, and EAS hooks
* Prefer npx expo and npx eas-cli over global CLI drift
* Pin jq/rg queries next to CI workflows - not copy-pasted Slack snippets
* Platform tools: simctl for iOS state, adb reverse for USB Metro
* Parse eas build:list --json - never scrape human tables in automation

1. **Check scripts into the repo:** Put `scripts/ci/` bash under version control - laptops, GitHub Actions, and EAS hooks run the same entrypoints, not one-off Slack snippets.
2. **Use `npx` for Expo and EAS CLIs:** `npx expo-doctor` and `npx eas-cli@latest` avoid global version drift between teammates and CI images.
3. **Standardize on `npm ci` in automation:** Lockfile-driven installs on CI; `npm install` only on local feature branches when intentionally updating deps.
4. **Run `npx expo-doctor` before native work:** Catches SDK 57 version skew before `expo run:*` or `eas build` waste twenty minutes on CocoaPods or Gradle.
5. **Pair `expo start --dev-client` with dev builds:** Custom native shells need the dev-client Metro flag - plain `expo start` targets Expo Go semantics.
6. **Clear Metro with intent:** `npx expo start --clear` after dependency upgrades; do not alias it to every save - it hides bundler bugs.
7. **Reserve `expo prebuild` for native changes:** Config plugins, entitlements, and new native modules - not every JS commit under CNG.
8. **Mirror CI gates locally:** `npm run lint && npx tsc --noEmit && npm test -- --ci` before `eas build --non-interactive` - same commands, same failure surface.
9. **Export `EXPO_TOKEN` on CI only:** Robot tokens in GitHub Secrets / EAS - never commit; verify with `eas whoami` in a dry-run job.
10. **Parse `eas build:list --json`:** Use `jq` for artifact URLs - human tables are not machine-readable and break when CLI formatting changes.
11. **Fail closed with `jq -er`:** Required JSON fields should exit non-zero when missing - prevents `curl` downloading HTML error pages as "APKs".
12. **Use `rg` for log triage:** Ripgrep JSONL and EAS logs with `-g` globs - faster than `grep -R` and respects `.gitignore`.
13. **Resolve iOS simulator UDIDs in scripts:** Device names collide across Xcode versions - `xcrun simctl list devices available -j | jq` is stable.
14. **Boot simulators before `simctl install`:** The `booted` alias targets nothing when Simulator is shut down - `simctl boot` then install.
15. **Screenshot with `simctl io` for evidence:** PNG artifacts for PRs, Maestro baselines, and App Store attachments - reproducible without Xcode UI.
16. **Set `ANDROID_HOME` and JDK 17 explicitly:** RN 0.86 Gradle expects JDK 17 - document paths in `README` and CI env blocks.
17. **`adb reverse tcp:8081` on USB Android:** Physical devices do not reach laptop `localhost` without reverse - do this after every cable reconnect.
18. **Suffix `adb -s SERIAL` with multiple devices:** Emulator plus phone causes ambiguous target errors - enumerate with `adb devices -l`.
19. **Filter logcat aggressively:** `'*:S' ReactNativeJS:V AndroidRuntime:E` surfaces JS and fatal native errors without system spam.
20. **Install APKs with `adb install -r`:** Reinstall dev clients from EAS or `assembleDebug` without Android Studio - verify `android.package` matches.
21. **Prefer LAN Metro; tunnel as fallback:** `--tunnel` is slower - use USB `adb reverse` or shared Wi-Fi before defaulting to tunnel.
22. **Chain commands with `&&` in scripts:** `set -euo pipefail` plus explicit gates - fail fast like CI, not silent partial success.
23. **Store jq filters beside workflows:** `scripts/jq/latest-apk.jq` reviewed in PRs - not inline one-liners duplicated across three YAML files.
24. **Linux CI for Android; macOS for iOS simctl:** Do not pretend `simctl` runs on `ubuntu-latest` - split jobs by platform capability.
25. **Cross-read platform docs when CLI is not enough:** Signing, entitlements, and Play tracks live in [EAS Build](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/), [iOS Platform](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/), and [Android Platform](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - CLI clears dev friction, not store policy.

## FAQs

Should we use Make or just bash scripts?

* Either works - pick one entry style (`make ci` or `npm run ci:android`).
* Bash scripts in `scripts/` are enough for most Expo teams; avoid macOS-only Makefile assumptions on Linux CI.

Where do shellcheck and shfmt fit?

* Run `shellcheck scripts/**/*.sh` in PR checks when scripts grow past trivial.
* Keeps `set -euo pipefail` scripts portable between macOS bash and Linux dash-linked environments.

Can Linux developers do all mobile CLI tasks?

* Android `adb`, Metro, and EAS JSON tooling run on Linux fully.
* iOS `simctl` and Xcode builds require macOS - use EAS cloud for iOS when Linux is the daily driver.

## Related

* [CLI Basics for RN](https://docs.wahwei/reactnative.codeguides.io/cli/cli-basics-for-rn/) - 20 daily Expo and EAS commands
* [xcrun simctl & iOS Simulators](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/) - boot, install, logs, screenshots
* [adb & Android Devices](https://docs.wahwei/reactnative.codeguides.io/cli/adb-and-android-devices/) - logcat, reverse ports, APK install
* [jq, rg & JSON Logs](https://docs.wahwei/reactnative.codeguides.io/cli/jq-rg-and-json-logs/) - EAS and CI JSON parsing
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - cloud build profiles and artifacts
* [iOS Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - when simctl is not enough
* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - Gradle and Play workflow context

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
