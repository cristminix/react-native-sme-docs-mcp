# Linting & Formatting Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Linting & Formatting Highlights Summary

* SDK 57 scaffolds ESLint 9 flat config via `npx expo lint` - no legacy `.eslintrc`
* One root .prettierrc covers apps/mobile and packages/ui - Metro does not care about import order, but humans do
* Extend expo/tsconfig.base - SDK 57 already sets jsx and moduleResolution Metro expects
* eslint-config-expo ships react-hooks/rules-of-hooks and exhaustive-deps - verify both are on before tuning
* Standardize scripts: lint (expo lint), typecheck, format:check, test - CI calls the same npm scripts as local
* Start with built-in no-restricted-syntax and no-restricted-imports before writing custom rule modules

## [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/)

* SDK 57 scaffolds ESLint 9 flat config via `npx expo lint` - no legacy `.eslintrc`
* `eslint-config-expo/flat` bundles React, hooks, import, and Expo-aware globals out of the box
* The `lint` npm script delegates to `expo lint` so CI and laptops share the same entry point
* Put global `ignores` in their own config object - mixing ignores with rules changes ESLint semantics
* Prefix intentionally unused params with `_` to satisfy `@typescript-eslint/no-unused-vars`
* Metro and Babel config files need Node globals - `eslint-config-expo` handles most of them automatically
* Pair `npm run lint` with `tsc --noEmit` before EAS builds - types and lint catch different failure classes

## [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/)

* One root .prettierrc covers apps/mobile and packages/ui - Metro does not care about import order, but humans do
* Use prettier --check in CI and --write locally; never format in CI without committing
* @ianvs/prettier-plugin-sort-imports groups react, react-native, expo, then relative paths
* eslint-config-prettier disables ESLint formatting rules so lint and format stay separate
* .prettierignore must skip .expo/, ios/, android/, and lock files
* Import sorting via Prettier plugin or ESLint import/order - pick one, not both fighting

## [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/)

* Extend expo/tsconfig.base - SDK 57 already sets jsx and moduleResolution Metro expects
* strict: true enables eight checks; noUncheckedIndexedAccess is separate and high-value for RN
* Type route params and API JSON at boundaries - not every StyleSheet line at once
* npx tsc --noEmit in CI catches cross-file breaks ESLint cannot see
* Enable strictNullChecks first when tightening a brownfield app
* Pair compiler strictness with @typescript-eslint/no-floating-promises for async screens

## [React Hooks Lint Rules](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/react-hooks-lint-rules/)

* eslint-config-expo ships react-hooks/rules-of-hooks and exhaustive-deps - verify both are on before tuning
* rules-of-hooks is always error; exhaustive-deps stays warn until the team trusts suppressions
* AppState, useFocusEffect, and NetInfo subscriptions are the top mobile stale-closure sources
* Never call hooks inside FlatList renderItem - extract a row component so lint and React agree
* Prefer functional setState and AbortController cleanup over blanket eslint-disable comments
* TanStack Query hook results belong in deps; the stable queryClient ref usually does not

## [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/)

* Standardize scripts: lint (expo lint), typecheck, format:check, test - CI calls the same npm scripts as local
* npm ci + Node 20 for deterministic GitHub Actions installs
* Run tsc --noEmit before EAS build jobs - native compile is too late to catch TS errors
* EAS Workflows use eas/checkout and eas/install\_node\_modules for cloud quality gates
* Branch protection requires status checks so red lint cannot merge to main
* Monorepos: turbo run lint typecheck test fans out across apps and packages

## [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/)

* Start with built-in no-restricted-syntax and no-restricted-imports before writing custom rule modules
* Ban console.log in src/ but allow structured logging wrappers in lib/logger.ts
* eslint-plugin-react-native-a11y catches missing accessibilityLabel on TextInput - not a device-test substitute
* import/no-restricted-paths enforces feature → feature boundaries without a custom AST visitor
* Local rules live in tools/eslint/rules/ and load via @typescript-eslint/utils createRule
* Scope test-only relaxations with files globs - never weaken a11y rules globally

## [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/)

* Knip finds unused files, exports, and dependencies from the module graph
* depcheck lists package.json deps Metro never imports - fast first pass
* Every unused native module is install size and autolinking surface - delete aggressively
* Ignore .expo/, ios/, android/, and config-only packages in knip.json
* False positives: expo plugins in app.config, jest setupFiles, side-effect imports
* Run knip in CI monthly or on dependency PRs - not every commit if noisy

## [Linting Best Practices](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/best-practices/)

* Start with npx expo lint and eslint-config-expo flat config
* Run Prettier and ESLint as separate concerns with eslint-config-prettier
* Enable TypeScript strict incrementally - do not flip everything in one PR
* Treat react-hooks/exhaustive-deps seriously on mobile lifecycle code
* Gate CI on lint, typecheck, format:check, and test scripts
* Run Knip and depcheck quarterly - native deps bloat binaries

Reviewed by Chris St. John·Last updated Jul 18, 2026
