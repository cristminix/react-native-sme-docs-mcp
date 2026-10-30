# Expo Platform Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Expo Platform Best Practices

* Pin SDK at scaffold time with default@sdk-57 and verify with expo-doctor
* Use app.config.ts and EXPO\_PUBLIC\_ for env - never commit secrets to extra
* Adopt expo-dev-client when you need native modules beyond Expo Go
* Let npx expo install resolve SDK-compatible native dependency versions
* Gitignore ios/ and android/ under CNG; regenerate with prebuild on upgrades
* Scope EAS projects, credentials, and env vars per app under an organization

1. **Pin the SDK at scaffold time:** Use `npx create-expo-app@latest --template default@sdk-57` (or equivalent) so `expo` starts at `~57.0.4` - upgrading later is harder than starting on the current supported SDK.
2. **Run expo-doctor after every scaffold or upgrade:** `npx expo-doctor` catches mismatched native module versions, invalid `app.json` fields, and config drift before you merge an upgrade branch.
3. **Always use `npx expo install` for Expo packages:** Manual `npm install` can pull JS stubs that do not match the native binaries for SDK 57 - compile success does not guarantee runtime stability.
4. **Treat `app.config.ts` as the source of truth:** Dynamic config supports environments, typed helpers, and conditional plugins; static `app.json` alone does not scale past one build flavor.
5. **Never commit secrets to `extra` or `EXPO_PUBLIC_*`:** Prefix public vars with `EXPO_PUBLIC_` only for values safe to ship in the client bundle; server secrets belong in EAS Secrets.
6. **Audit the public manifest before release:** Run `npx expo config --type public` and confirm no private keys, internal URLs, or staging endpoints leaked into the build-time config.
7. **Read config at runtime via `Constants.expoConfig`:** Do not `import app.json` in feature code - the processed manifest from Expo's config plugin pipeline is what actually ships.
8. **Start with Expo Go, graduate to dev builds:** Expo Go is fine for learning and demos; add `expo-dev-client` as soon as you depend on native modules not bundled in Expo Go.
9. **Rebuild the dev client after every SDK bump:** OTA updates (`eas update`) change JavaScript only - `expo-dev-client` native shells must be rebuilt with `eas build --profile development`.
10. **Register the root with `registerRootComponent`:** Bare or brownfield entry points that skip `expo` bootstrap miss autolinking initialization and fail mysteriously when calling native modules.
11. **Prefer `requireNativeModule` from `expo` in apps:** Library packages should import from `expo-modules-core` to avoid peer-dependency cycles; app code can use the `expo` re-export.
12. **Map EAS build profiles to environments:** Use `eas.json` `environment` keys (`development`, `preview`, `production`) so credentials and env vars resolve consistently in CI and locally.
13. **Pull env vars with `eas env:pull`:** Sync team-managed secrets into `.env.local` for local dev without copying values into chat or shared drives.
14. **Upgrade SDKs sequentially:** Jumping multiple SDK versions in one PR compounds breaking changes - step 54 → 55 → 56 → 57, reading each changelog between merges.
15. **Delete stale native folders after CNG upgrades:** Committed `ios/` and `android/` from an older SDK block `prebuild` templates for RN 0.86 - gitignore them and let EAS Build regenerate.
16. **Express native changes as config plugins:** Hand-editing generated `Info.plist` or `AndroidManifest.xml` files is lost on `npx expo prebuild --clean` (the SDK 57 default).
17. **Write idempotent config plugins:** Plugins that append regex replacements twice corrupt native projects - design plugins to be safe on repeated prebuild runs.
18. **Set `owner` for organization projects:** Omitting `"owner": "org-slug"` in `app.config` routes builds and credentials to a personal account instead of the team.
19. **One `projectId` per app binary:** Reusing an EAS project across unrelated bundle IDs collides credentials, update channels, and environment variables.
20. **Default engineers to Developer role:** Reserve Owner for bus-factor coverage (two owners max); Admin for leads who manage billing and invites - not every IC.
21. **Use robot tokens for CI, not personal passwords:** Organization-scoped robot users survive employee departures and provide an auditable revocation path.
22. **Keep `slug` flexible, `projectId` stable:** Rename display slugs when branding changes; never rotate `projectId` - EAS services key off the UUID for the app's lifetime.
23. **Match `MainComponent` / `moduleName` to JS registration:** Bare apps whose native entry says `"MyApp"` while JS registers `"main"` show a blank screen with no obvious JS error.
24. **Release SharedObjects explicitly:** Long-lived native handles from Expo modules (players, sensors) leak memory until `release()` or the package hook cleans up on unmount.
25. **Read SDK 57 and RN 0.86 release notes before upgrading:** Hermes, Reanimated, and New Architecture defaults change behavior even when TypeScript still compiles - treat the changelog as part of the upgrade checklist.

## FAQs

Should new Expo projects use managed workflow or bare workflow?

* Expo's current recommendation is **CNG (Continuous Native Generation)** - you maintain `app.config.ts` and config plugins, not hand-edited `ios/`/`android/` folders.
* "Managed" and "bare" are legacy labels; both map to the same upgrade path when native folders are gitignored and regenerated.

When is Expo Go still acceptable?

* Prototyping UI with only SDK-bundled modules.
* Teaching workshops where participants should not install Xcode or Android Studio.
* Never for production feature development that depends on custom native code.

What is the fastest way to verify an upgrade succeeded?

* `npx expo-doctor` with zero failures.
* A clean `eas build --profile development` on CI.
* Smoke-test native modules (camera, push, auth) on a physical device - not just the simulator.

Where do staging API URLs belong?

* In `EXPO_PUBLIC_API_URL` tied to an EAS `preview` environment - not hardcoded in source.
* Swap values per environment via `eas env` rather than maintaining parallel `app.config` files.

Can I skip prebuild if I commit native folders?

* You can, but you inherit manual merge work on every SDK bump.
* CNG teams gitignore native folders specifically to avoid this tax.

Who should have Owner on an Expo organization?

* At most two people for bus-factor coverage.
* Everyone else should be Developer or Admin depending on whether they manage billing and invites.

Does `eas update` replace a store release after an SDK upgrade?

* No - store binaries embed a specific native runtime.
* Ship a new `eas build` for production after upgrading SDK 57; use OTA only for JS/asset changes within the same runtime version.

What is the most common secret leak in Expo apps?

* Putting private API keys in `extra` or non-prefixed env vars that get inlined into the JS bundle.
* Audit with `npx expo config --type public` before every release.

## Related

* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - one-page tour of Expo workflow primitives
* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - scaffold with the right SDK template
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - dynamic config and secrets-safe patterns
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - when to leave Expo Go
* [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - install --fix, doctor, and native regen
* [Expo Account, Projects & Permissions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-account-projects-and-permissions/) - org RBAC and CI tokens

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev/docs/more-resources](https://reactnative.dev/docs/more-resources) - curated further reading, tools, starter kits
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
