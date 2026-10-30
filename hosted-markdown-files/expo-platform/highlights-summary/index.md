# Expo Platform Highlights Summary

Every highlight bullet from the 10 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo Platform Highlights Summary

* Expo is a platform layer on React Native - you still write RN components, Expo handles native project wiring
* Pin SDK 57 explicitly with --template default@sdk-57 - bare @latest may scaffold SDK 54 during the transition
* Static app.json for tooling edits; app.config.ts when you need env branches and typed config
* Expo Go is a fixed native binary - only its preinstalled native modules are callable from your JS
* The expo package installs ExpoModulesCore native infrastructure at app launch
* EAS provides three built-in environments: development, preview, and production

## [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/)

* Expo is a platform layer on React Native - you still write RN components, Expo handles native project wiring
* The managed workflow keeps ios/ and android/ generated; you opt into native folders only when needed
* Pin `expo` ~57.0.4 in package.json - every Expo module version is validated against that SDK
* `npx expo install` resolves compatible semver ranges; plain npm install can drift from the SDK matrix
* Expo Go is fastest for learning; custom native modules require a development build with expo-dev-client
* app.config.ts can branch on APP\_VARIANT without committing secrets to app.json
* Linking an EAS projectId early keeps builds, updates, and environment variables scoped to one Expo project

## [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/)

* Pin SDK 57 explicitly with --template default@sdk-57 - bare @latest may scaffold SDK 54 during the transition
* default template ships Expo Router, TypeScript, and the recommended Expo CLI scripts
* Verify the pin in package.json: expo ~57.0.4 and react-native 0.86.0
* Run npx expo-doctor after scaffold to catch version skew before you write feature code
* bare-minimum runs prebuild immediately - choose it only when you need android/ and ios/ on day one

## [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/)

* Static app.json for tooling edits; app.config.ts when you need env branches and typed config
* EXPO\_PUBLIC\_ vars inline at bundle time - never put secrets there
* extra passes non-secret runtime config via Constants.expoConfig.extra
* npx expo config --type public shows exactly what ships in the client bundle
* Config plugins in app.config mutate native projects at prebuild/EAS build time

## [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/)

* Expo Go is a fixed native binary - only its preinstalled native modules are callable from your JS
* Development builds include expo-dev-client and YOUR native dependencies
* Switch before custom native modules, push credentials, or universal/app links
* npx expo install expo-dev-client then eas build --profile development
* JS hot reload works in both; native code changes require a new native build

## [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/)

* The expo package installs ExpoModulesCore native infrastructure at app launch
* requireNativeModule resolves JSI bindings first, then falls back to legacy bridge proxies
* registerRootComponent wires AppRegistry and dev-only Fast Refresh helpers
* NativeModule and SharedObject extend EventEmitter over JSI - same API on iOS and Android
* Works in managed, bare, and brownfield apps once the native entry point is configured

## [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/)

* EAS provides three built-in environments: development, preview, and production
* Map eas.json build profiles to EAS environments with the `environment` field
* Only `EXPO_PUBLIC_` variables are safe to embed in client JavaScript - treat them as public
* `eas env:pull` syncs cloud variables to `.env.local` for local dev without committing secrets
* SDK 55+ requires `--environment` on `eas update` so OTA bundles match build-time config
* Secret visibility variables are for build-time tooling (NPM tokens), not client-side API keys

## [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/)

* Upgrade one SDK version at a time - never skip majors in a single PR
* `npx expo install --fix` realigns every Expo module to the SDK compatibility matrix
* `npx expo-doctor` catches unmet peer deps, config plugin drift, and New Architecture mismatches
* CNG projects delete ios/ and android/ after a bump - EAS Build regenerates them via prebuild
* SDK 57 targets React Native 0.86 with no intentional breaking changes from 0.85
* Rebuild development clients after every native-affecting SDK upgrade

## [Managed to Bare Migration](https://docs.wahwei/reactnative.codeguides.io/expo-platform/managed-to-bare-migration/)

* Managed vs bare workflow is deprecated - Continuous Native Generation (CNG) is the modern model
* CNG generates ios/ and android/ on demand; you maintain app.config + config plugins, not native diffs
* Committing native folders opts out of automatic EAS prebuild - upgrades require manual native merges
* SDK 57 runs expo prebuild --clean by default; pass --no-clean to layer incremental changes
* Migrate native customizations to config plugins before deleting hand-edited native code
* Bare RN CLI projects can adopt prebuild without losing Expo modules or EAS services

## [Expo Account, Projects & Permissions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-account-projects-and-permissions/)

* Personal accounts suit solo work; organizations enable team RBAC and shared credentials
* Four org roles: Owner, Admin, Developer, Viewer - least privilege for day-to-day work
* Set expo.owner in app.json so builds and credentials land under the correct account
* extra.eas.projectId is the stable identifier for EAS Build, Update, and env vars
* Account-wide environment variables share tooling tokens across multiple apps
* Project transfers require Owner/Admin on both source and destination accounts

## [Expo Platform Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-platform/best-practices/)

* Pin SDK at scaffold time with default@sdk-57 and verify with expo-doctor
* Use app.config.ts and EXPO\_PUBLIC\_ for env - never commit secrets to extra
* Adopt expo-dev-client when you need native modules beyond Expo Go
* Let npx expo install resolve SDK-compatible native dependency versions
* Gitignore ios/ and android/ under CNG; regenerate with prebuild on upgrades
* Scope EAS projects, credentials, and env vars per app under an organization

Reviewed by Chris St. John·Last updated Jul 18, 2026
