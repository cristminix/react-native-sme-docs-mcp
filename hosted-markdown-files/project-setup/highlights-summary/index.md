# Project Setup Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Project Setup Highlights Summary

* Pin SDK 57 at scaffold time with default@sdk-57 - bare @latest may still resolve SDK 54
* default@sdk-57 is the team default - Expo Router, TypeScript, and recommended scripts
* Feature slices colocate screens, hooks, and components per product area - layers split by file type across the repo
* Expo SDK 52+ auto-configures Metro for monorepos - delete manual watchFolders if you migrated from older guides
* @nx/expo generators scaffold apps and libraries with consistent tsconfig, lint, and path aliases
* Expo SDK 52+ auto-configures Metro for workspaces - delete legacy watchFolders if your app still starts

## [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/)

* Pin SDK 57 at scaffold time with default@sdk-57 - bare @latest may still resolve SDK 54
* The default template centers on app/ (Expo Router), app.config.ts, and SDK-pinned package.json
* Scripts delegate to expo start so LAN, tunnel, and dev-client flags stay consistent across the team
* npx expo-doctor compares your graph to the SDK 57 matrix before Metro surfaces obscure errors
* tsconfig.json extends expo/tsconfig.base - add strict without fighting Metro path aliases
* app.config.ts is the manifest single source of truth for bundle IDs, icons, and plugins
* First-run verification: install → expo-doctor → tsc --noEmit → expo start

## [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/)

* default@sdk-57 is the team default - Expo Router, TypeScript, and recommended scripts
* tabs@sdk-57 and default@sdk-57 are interchangeable for most apps - pick one and standardize
* blank-typescript@sdk-57 is for spikes and brownfield experiments without navigation wired
* bare-minimum@sdk-57 runs prebuild immediately - only when you need android/ and ios/ on day one
* Always suffix templates with @sdk-57 during the SDK transition - bare @latest may scaffold SDK 54

## [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/)

* Feature slices colocate screens, hooks, and components per product area - layers split by file type across the repo
* Keep app/ routes thin - import FeatureScreen from features/ and render it
* index.ts is each feature's public API - other features import from there, not deep paths
* Shared primitives live in components/ui/ - product-specific UI stays inside the feature folder
* Switch from layers to slices when cross-feature imports and god screens outnumber isolated changes

## [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/)

* Expo SDK 52+ auto-configures Metro for monorepos - delete manual watchFolders if you migrated from older guides
* workspace:\* links apps/mobile to packages/ui via symlinks - edits are visible without publishing
* Duplicate react-native versions in one monorepo cause build and runtime failures - run pnpm why react-native
* turbo.json dev tasks should set cache: false and persistent: true for expo start
* Keep product features in the app - packages/ui holds primitives, not feature screens

## [Monorepo with Nx](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-nx/)

* @nx/expo generators scaffold apps and libraries with consistent tsconfig, lint, and path aliases
* nx affected runs lint and typecheck only on projects touched since main - critical for multi-app repos
* Tag projects type:app, type:lib, scope:shared and enforce boundaries in ESLint - apps import libs, not each other
* Expo SDK 57 still auto-configures Metro - Nx orchestrates tasks, not bundler resolution
* Keep product features in apps/mobile - Nx libraries hold primitives and shared domain logic
* Use nx run mobile:start locally; wire nx affected -t lint in CI for monorepo-aware gates

## [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/)

* Expo SDK 52+ auto-configures Metro for workspaces - delete legacy watchFolders if your app still starts
* watchFolders tells Metro which directories outside the app root trigger rebundles on save
* extraNodeModules and nodeModulesPaths override where Metro resolves a package name - use only when auto-config fails
* pnpm isolated installs symlink packages differently than npm hoisting - wrong nodeLinker causes native build errors
* Duplicate react-native in one monorepo breaks builds - run pnpm why react-native after every major bump
* SDK 55+ enables autolinkingModuleResolution for monorepos automatically - Metro and native link the same module copy

## [Multiple Apps in One Repo](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/)

* Each white-label app is a separate Expo project under apps/ - same packages/core, different app.config.ts identity
* APP\_VARIANT or BRAND env vars drive bundle IDs, icons, and display names without forking source
* packages/core holds screens and navigation - apps only wire brand theme, config, and store metadata
* Each app keeps its own eas.json and EAS project - builds run from the app directory with root install
* Different bundle identifiers let QA install staging and production side by side on one device
* Never hard-code brand colors in scope:shared libs - inject theme from each app's entry point

## [Project Setup Best Practices](https://docs.wahwei/reactnative.codeguides.io/project-setup/best-practices/)

* Pin Expo SDK at scaffold with default@sdk-57 and verify with expo-doctor
* Keep app routes thin; put features under features//
* One react-native copy in monorepos - duplicate native deps crash at runtime
* Prefer SDK 57 auto Metro config before hand-tuning watchFolders
* Commit lockfiles; never commit ios/ and android/ under CNG
* White-label with app.config env variants, not forked feature code

Reviewed by Chris St. John·Last updated Jul 18, 2026
