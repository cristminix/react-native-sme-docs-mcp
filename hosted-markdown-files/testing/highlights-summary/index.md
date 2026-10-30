# Testing Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Testing Highlights Summary

* The pyramid is wide at the bottom: many fast unit tests, fewer E2E flows
* `jest-expo` preset mocks Expo SDK modules so Jest runs without a simulator
* Query like a user: role and label before `testID`
* `jest-expo` auto-mocks most Expo modules - you override only what your test asserts
* Flows are YAML files in `.maestro/` - readable by QA and engineers alike
* Detox synchronizes with the RN bridge - it waits for animations, network, and timers to idle

## [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/)

* The pyramid is wide at the bottom: many fast unit tests, fewer E2E flows
* jest-expo preset mocks most Expo modules so Jest runs in Node without a simulator
* React Native Testing Library queries mirror how users find UI - label and role before testID
* Mock native modules at the boundary; never assert on implementation details inside components
* Maestro YAML flows are cheap smoke tests; Detox fits when you need native synchronization
* Contract tests catch API shape drift before a store build ships to production users

## [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/)

* `jest-expo` preset mocks Expo SDK modules so Jest runs without a simulator
* Install with `npx expo install` so versions match Expo SDK 57
* `transformIgnorePatterns` is the fix when Jest cannot parse ESM in node\_modules
* Keep tests out of `app/` - use `__tests__` or colocated `*.test.tsx` files
* Snapshots are for small presentational components - not full screens

## [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/)

* Query like a user: role and label before `testID`
* `screen` keeps queries scoped to the last `render` call
* Use `findBy*` and `waitFor` for async state - never bare `setTimeout`
* `userEvent` is async - always `await` press and type
* Importing from `@testing-library/react-native` registers Jest matchers automatically

## [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/)

* `jest-expo` auto-mocks most Expo modules - you override only what your test asserts
* Manual mocks live in `__mocks__/` adjacent to the module or via `jest.mock` inline
* Mock at your app's boundary (hooks/services), not every `node_modules` import
* Reset mocks in `afterEach` - leaked implementations cause order-dependent flakes
* A passing Jest suite does not prove native code works - complement with Maestro or device QA

## [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/)

* Flows are YAML files in `.maestro/` - readable by QA and engineers alike
* `appId` must match the installed bundle ID / application ID exactly
* EAS Workflows can build an APK/simulator app then run Maestro in one pipeline
* Regex matchers (`.*`, `Welcome!`) absorb minor copy and timing variance
* Keep flows short and independent - one user journey per file

## [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/)

* Detox synchronizes with the RN bridge - it waits for animations, network, and timers to idle
* Expo SDK 54+ uses `expo-detox-config-plugin` after prebuild - Expo Go cannot run Detox
* E2E tests live in `e2e/` and run through the `detox` CLI, not plain `jest`
* `testID` props are the stable selectors Detox matchers rely on
* Release/simulator builds bundle JS - rebuild after app code changes
* Reach for Detox when Maestro flakes on async native work; Maestro wins on YAML speed

## [Visual Regression & Storybook](https://docs.wahwei/reactnative.codeguides.io/testing/visual-regression-and-storybook/)

* Storybook 10+ swaps the app entry when `STORYBOOK_ENABLED=true` - zero Storybook code in production
* Portable stories (`composeStories`) reuse CSF files in Jest without duplicating props
* On-device Storybook is the source of truth for RN - web Storybook misses native layout
* Visual regression uses Maestro `takeScreenshot` + baseline diff - no built-in Chromatic for RN yet
* Set `onDeviceUI: false` when capturing screenshots so the Storybook chrome stays out of frame
* Pair stories with contract tests - pixels catch layout drift, schemas catch API drift

## [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/)

* Contract tests fail in Jest before a bad API response reaches a simulator
* Pact records consumer expectations and verifies providers against shared pact files
* Zod schema tests are lighter - validate fixtures and parsers without a mock server
* Mobile apps are Pact consumers - backends verify they still satisfy published contracts
* Store pact JSON in git or a Pact Broker - never only on a developer laptop
* Pair contracts with MSW in RNTL - same shapes, different test layer

## [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/)

* Follow the pyramid: many unit/component tests, few E2E flows
* Use jest-expo preset and mock native modules at service boundaries
* Query RNTL by role and label - not testID-only
* Prefer Maestro for YAML E2E; Detox when gray-box sync is required
* Contract-test API schemas before store builds
* Run smoke E2E on physical devices in release candidates

Reviewed by Chris St. John·Last updated Jul 18, 2026
