# Prebuild Best Practices

A condensed summary of the **25 most important best practices** drawn from every page in CNG & Prebuild - never hand-edit generated files you cannot reproduce.

Highlights / Prebuild Best Practices

* Gitignore ios/ and android/ under CNG - app.config.ts and plugins are source of truth
* SDK 57 expo prebuild cleans by default - encode every native change as a plugin
* Run prebuild twice when authoring plugins - second diff must be empty
* Rebuild dev clients and store binaries when fingerprint or native deps change
* Use npx expo install for native packages - never float versions past the SDK matrix
* EAS Build generates native projects when folders are absent from the upload

1. **Treat CNG as the default on SDK 57:** Maintain `app.config.ts`, config plugins, and `modules/` - not hand-edited `ios/` and `android/` folders.
2. **Gitignore native directories:** Add `ios/` and `android/` to `.gitignore` unless a brownfield ADR explicitly requires committed native projects.
3. **Understand clean regen default:** `npx expo prebuild` deletes existing native folders before generating - pass `--no-clean` only during controlled migration work.
4. **Never edit generated files you cannot reproduce:** If a change is not in config or a plugin, it will be lost on the next clean prebuild.
5. **Express permissions in plugins:** `NSCameraUsageDescription`, Android permissions, and entitlements belong in the `plugins` array - not post-prebuild Xcode edits.
6. **Write idempotent config plugins:** Running prebuild twice must not duplicate manifest entries or Gradle `apply` lines - existence checks before every add.
7. **Document plugin order in `app.config.ts`:** Multiple plugins touching the same native file depend on execution order - comment the rationale.
8. **Prefer library config plugins:** `expo-camera`, `expo-notifications`, and Expo modules ship maintained SDK 57 plugins - do not reinvent them.
9. **Use `npx expo install` for native dependencies:** Manual `npm install` can pull JS versions incompatible with SDK 57 native binaries.
10. **Run `expo-doctor` before prebuild:** Catch invalid config and version skew before wasting a compile cycle on EAS or locally.
11. **Use `npx expo config --type introspect` while developing plugins:** Inspect mod results without full native generation on every save.
12. **Port brownfield native diffs to plugins before cutover:** Inventory every Xcode/Gradle change vs fresh prebuild - spreadsheet with owners per row.
13. **Commit `modules/` for custom native code:** Local Expo modules are source of truth; generated `ios/MyApp/` is ephemeral under CNG.
14. **Use `expo run:ios` / `expo run:android` for local native iteration:** Wraps prebuild + compile - rebuild after Swift/Kotlin changes; Fast Refresh does not update native code.
15. **Rebuild dev clients after SDK bumps:** `expo-dev-client` embeds native runtime - OTA cannot upgrade it after an SDK or native dependency change.
16. **Delete stale native folders on upgrade:** After `npx expo install --fix` on a new SDK, `rm -rf ios android` before prebuild - old templates target the previous RN version.
17. **Upgrade SDKs sequentially:** One SDK per PR - prebuild templates and plugin APIs change per release; skipping versions compounds pain.
18. **Commit lockfiles with every native-affecting change:** CI, EAS, and fingerprint hashes must resolve the same dependency tree as local dev.
19. **Adopt fingerprint gates in CI:** `@expo/fingerprint` detects when a new native build is required - do not ship OTA to incompatible binaries.
20. **Use `runtimeVersion.policy: "fingerprint"` for CNG OTA:** Ties update eligibility to native inputs, not semver alone when plugins change between store releases.
21. **Let EAS Build run prebuild in CI:** Upload config + JS - not generated native folders - unless brownfield migration is incomplete.
22. **Map `eas.json` profiles to environments:** `development`, `preview`, and `production` must align credentials and env vars with fingerprint and build jobs.
23. **Physical device smoke test after plugin merges:** Simulators miss push entitlements, App Links, and signing issues that prebuild alone cannot catch.
24. **Pair native work with Native Module Rules:** Search Expo SDK packages and config plugins before writing Swift/Kotlin - custom modules need ADRs and owners.
25. **Schedule brownfield CNG migration before the next major SDK:** Manual native merge cost grows every release - cut over when audit spreadsheet is complete and clean prebuild passes.

## FAQs

Should we commit ios/ and android/?

* **No** for standard CNG SDK 57 apps - EAS Build regenerates them.
* **Yes** only with a brownfield ADR and a dated migration plan to plugins + gitignore.

When is --no-clean appropriate?

* Porting hand edits into a config plugin during brownfield migration.
* Never on SDK upgrade branches or CI validation gates - use default clean regen.

How do we know OTA is safe after a merge?

* Fingerprint unchanged since last store binary → JS-only fixes may use `eas update`.
* Fingerprint changed → new `eas build` for production and development clients.

What is the fastest prebuild validation loop?

1. Edit plugin or `app.config.ts`
2. `npx expo config --type introspect`
3. `npx expo prebuild --no-install` twice - zero diff on second run
4. `expo run:ios` or EAS development build for device proof

Does Expo Go replace prebuild for custom native code?

* No - Expo Go uses a fixed binary and ignores your plugins' entitlements.
* Custom native code requires prebuild + dev client - see [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/).

## Related

* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - ten examples for generating native projects
* [expo prebuild Workflow](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - operational checklist
* [Config Plugins in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - composable native mutations
* [Custom Native Code in CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/custom-native-code-in-cng/) - local compile loops
* [Fingerprint & Native Change Detection](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/fingerprint-and-native-change-detection/) - CI and OTA gates
* [CNG in CI](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) - EAS generates vs checked-in native projects
* [../native-modules/native-modules-basics/native-modules-basics.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - native boundary fundamentals
* [../expo-rules/native-module-rules/native-module-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - integration path checklist
* [../expo-rules/expo-project-rules-checklist/expo-project-rules-checklist.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - team-wide Expo non-negotiables

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
