# expo prebuild Workflow

Operational checklist for **`npx expo prebuild`** on Expo SDK 57 - clean regeneration defaults, when to pass `--no-clean`, and how to iterate locally without corrupting native projects. Use this before SDK upgrades, config plugin PRs, and first-time dev-client setup.

Highlights / expo prebuild Workflow

* SDK 57 defaults to clean regen - expo prebuild deletes ios/ and android/ first
* Use --no-clean only when migrating hand edits into config plugins
* Run prebuild twice when authoring plugins - second diff must be empty
* expo run:ios/android wraps prebuild + compile for local native iteration
* Pair with expo-doctor before every prebuild on upgrade branches
* Gitignore native folders under CNG - EAS Build runs the same prebuild step

## How to Use This Checklist

* Run **Tier 1** before every SDK upgrade or fresh clone - stale `ios/`/`android/` from an older SDK block RN 0.86 templates.
* Apply **Tier 2** when authoring or reviewing config plugins - non-idempotent plugins destroy native projects on the second run.
* Use **Tier 3** for day-to-day local iteration with `expo run:ios` / `expo run:android`.
* Record brownfield exceptions (committed native dirs) in `docs/adr/` - CNG is the default path on SDK 57.
* Pair with [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) when adding packages with native code.

---

## Tier 1: Clean Regen & SDK 57 Defaults (1–6)

1. **Understand SDK 57 clean default:** `npx expo prebuild` **removes** existing `ios/` and `android/` before generating fresh projects.

   * **Opt out:** `npx expo prebuild --no-clean` layers template updates onto existing folders.
   * **After SDK bump:** Always use default clean - never `--no-clean` on upgrade branches.
2. **Delete stale native folders before upgrade prebuild:** Committed `ios/` from SDK 56 targets RN 0.85 Hermes and Pod versions.

   * **CNG pattern:** `rm -rf ios android` then `npx expo prebuild`.
   * **Verify:** `package.json` shows `expo` ~57.0.4 and `react-native` 0.86.0.
3. **Run expo-doctor before prebuild:** Invalid `app.config.ts` fields fail late - doctor catches schema drift early.

   * **Gate:** `npx expo-doctor` exits zero before `expo prebuild` in upgrade scripts.
   * **Fix:** `npx expo install --fix` when doctor reports version skew.
4. **Gitignore native dirs under CNG:** Standard teams do not commit `ios/` and `android/`.

   * **`.gitignore`:** Add `ios/` and `android/` at app root.
   * **Reject:** "Quick fix" Xcode edits that are not encoded in config plugins.
5. **Use `--no-install` for CI diff checks:** Skips `pod install` and Gradle sync - faster validation of plugin output.

   * **Local full build:** Omit `--no-install` when you need to compile immediately after prebuild.
   * **EAS Build:** Cloud builders run install steps automatically.
6. **Platform-scoped prebuild when iterating:** `--platform ios` or `--platform android` saves time on single-platform plugin work.

   * **Full release:** Run both platforms before merging plugin changes that touch shared config.
   * **Reject:** Merging iOS-only tested plugins without Android prebuild verification.

---

## Tier 2: Config Plugins & Idempotency (7–12)

7. **Express native changes as plugins:** Permissions, entitlements, Gradle dependencies, and manifest entries belong in `app.config.ts` `plugins` array.

   * **Inspect:** `npx expo config --type introspect` before full prebuild.
   * **Deep dive:** [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/).
8. **Run prebuild twice for every new plugin:** Second run must produce **zero diff** in native output.

   * **Test:** `npx expo prebuild && npx expo prebuild` - `git diff ios android` empty on second pass.
   * **Reject:** Regex-append plugins without existence checks.
9. **Document plugin order in comments:** Multiple plugins touching `Info.plist` or `build.gradle` depend on execution order.

   * **Pattern:** Base entitlements first, feature plugins second, custom patch plugin last.
   * **Debug:** Bisect by removing plugins one at a time when prebuild fails.
10. **Prefer library plugins over hand edits:** `expo-camera`, `expo-notifications`, and most Expo modules ship maintained plugins.

    * **Install:** `npx expo install <package>` - not `npm install @latest`.
    * **Reference:** [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/).
11. **Migrate hand edits with `--no-clean` temporarily:** When porting brownfield Xcode changes, use `--no-clean` while developing the plugin, then verify with full clean.

    * **Done when:** Clean prebuild reproduces the same native behavior as the hand edit.
    * **Delete:** Temporary native patches once the plugin lands.
12. **Never edit generated files you cannot reproduce:** If a change is not in config or a plugin, it will be lost on clean prebuild.

    * **ADR required:** Any committed native file outside CNG must document the owner and upgrade path.
    * **Pair:** [../expo-rules/native-module-rules/native-module-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) Tier 2.

---

## Tier 3: Local Iteration Loops (13–18)

13. **`expo run:ios` wraps prebuild + compile:** Generates `ios/` if missing, runs `pod install`, opens Xcode build.

    * **Script:** `"ios:native": "expo run:ios"` in `package.json`.
    * **Requires:** Xcode and CocoaPods for local iOS builds.
14. **`expo run:android` wraps prebuild + Gradle:** Same flow for Android - generates `android/` if absent.

    * **Device:** `expo run:android --device` for physical hardware testing.
    * **Emulator:** Ensure `ANDROID_HOME` and SDK platforms are installed.
15. **Rebuild dev client after native dependency changes:** `expo-dev-client` embeds native code - Metro reload is not enough.

    * **Trigger:** New native npm package, SDK bump, or plugin changing entitlements.
    * **OTA cannot replace:** `eas update` ships JS only within the same runtime.
16. **Clear Metro cache after prebuild config changes:** Stale caches mask autolinking and config resolution issues.

    * **Command:** `npx expo start --clear` after adding native modules.
    * **Nuclear:** `rm -rf node_modules/.cache` on stubborn bundler errors.
17. **Use `npx expo config` to debug without writing files:** Faster than full prebuild when validating env variants.

    * **Public manifest:** `npx expo config --type public` before store submission.
    * **Introspect:** See mod results plugins will apply.
18. **Physical device smoke test after prebuild:** Simulators do not catch entitlement, push, or App Links issues.

    * **Matrix:** One iOS device + one Android device minimum after plugin PRs.
    * **CI complement:** EAS `development` profile builds for teammates without Xcode.

---

## Tier 4: Upgrade & Release Gates (19–24)

19. **Sequential SDK upgrades:** Step one SDK at a time - prebuild templates change per SDK.

    * **Sequence:** `expo install expo@^<sdk>` → `--fix` → `expo-doctor` → delete native dirs → prebuild.
    * **Reference:** [../expo-platform/upgrading-expo-sdk-versions/upgrading-expo-sdk-versions.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/).
20. **Commit lockfiles with prebuild-related dep changes:** `expo install --fix` updates `package-lock.json` - CI must resolve the same tree.

    * **Reject:** Upgrade PRs that change `package.json` without lockfile.
    * **Check:** `npx expo install --check` in weekly hygiene scripts.
21. **EAS Build runs prebuild when native dirs are absent:** Upload without `ios/`/`android/` - cloud builder generates them.

    * **Local optional:** Teams without Xcode rely entirely on EAS for native compile.
    * **Deep dive:** [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/).
22. **Fingerprint native changes for OTA/runtime version:** When native fingerprint changes, OTA updates must target a new runtime.

    * **Tool:** `@expo/fingerprint` - see [Fingerprint & Native Change Detection](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/).
    * **Reject:** Shipping OTA to binaries built before a native plugin merge.
23. **New Architecture alignment:** SDK 57 prebuild templates enable New Architecture by default on RN 0.86.

    * **Verify:** Third-party native libs support TurboModules/Fabric before merging.
    * **Escape hatch:** `newArchEnabled: false` requires ADR and rebuild.
24. **Store release after native-affecting merges:** Production `eas build` must run on the same commit that passed local/EAS prebuild.

    * **Reject:** Merging plugin PRs without a green development build on CI.
    * **Rollback:** Single-purpose native PRs map cleanly to store version rollback.

---

## Tier 5: Brownfield & Migration (25–28)

25. **Inventory hand-maintained native diffs before CNG adoption:** List every Xcode and Gradle change not in config.

    * **Output:** Spreadsheet mapping file → config plugin or ADR exception.
    * **Runbook:** [Migrating Manual Native Projects to CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/migrating-manual-native-projects-to-cng/).
26. **Use `--no-clean` only during migration, not in CI:** CI must prove clean prebuild is reproducible.

    * **Final gate:** `rm -rf ios android && npx expo prebuild` passes on migration branch.
    * **Done when:** Native dirs gitignored and clean prebuild is the only path.
27. **Autolinking verification after migration:** `expo-modules-autolinking` must appear in generated Podfile and `settings.gradle`.

    * **Fix:** `npx expo prebuild --clean` if autolinking entries are missing.
    * **Reference:** [../native-modules/autolinking-and-expo-modules-core/autolinking-and-expo-modules-core.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/autolinking-and-expo-modules-core/).
28. **Document who owns native regressions post-CNG:** Platform engineer or mobile lead reviews plugin PRs.

    * **CODEOWNERS:** `app.config.ts`, `plugins/`, and any `modules/` native code.
    * **Onboarding:** README states CNG workflow - no silent Xcode edits.

---

## FAQs

When should I use --no-clean?

* Iterating on a config plugin while porting a brownfield native edit.
* Debugging incremental template updates without full delete/regen.
* **Never** on SDK upgrade branches or CI validation - use default clean.

Does expo prebuild run automatically on EAS Build?

* Yes, when `ios/` and `android/` are not uploaded or are gitignored.
* EAS runs the same config evaluation and plugin pipeline as local prebuild.

What is the fastest local native iteration loop?

1. Edit `app.config.ts` or plugin
2. `npx expo prebuild --platform <ios|android>`
3. `npx expo run:<platform>`
4. Repeat - use `--no-install` on prebuild only when skipping compile

Can I skip prebuild if I use Expo Go?

* Expo Go uses a fixed native binary - it ignores your config plugins for native entitlements.
* Custom native code requires prebuild + dev client - Expo Go is not a production test target.

## Related

* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - ten examples for generating native projects from config
* [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - composable native mutations
* [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/) - when to commit `ios/` and `android/`
* [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) - EAS generates vs checked-in native projects
* [../expo-rules/expo-project-rules-checklist/expo-project-rules-checklist.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - team non-negotiables
* [Prebuild Best Practices](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
