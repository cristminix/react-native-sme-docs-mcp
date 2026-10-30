# Testing Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Testing Best Practices

* Follow the pyramid: many unit/component tests, few E2E flows
* Use jest-expo preset and mock native modules at service boundaries
* Query RNTL by role and label - not testID-only
* Prefer Maestro for YAML E2E; Detox when gray-box sync is required
* Contract-test API schemas before store builds
* Run smoke E2E on physical devices in release candidates

1. **Follow the testing pyramid:** Many fast unit and component tests, fewer integration tests, minimal E2E - E2E belongs on critical paths only.
2. **Use jest-expo as the preset:** Aligns transforms and mocks with Expo SDK 57 - custom Jest config from web tutorials breaks on native imports.
3. **Centralize setup in jest.setup.ts:** Matchers, reanimated mocks, and NetInfo stubs live once - not copy-pasted per test file.
4. **Fix transformIgnorePatterns when packages fail:** Opt specific `node_modules` into transpilation - document the list when adding native-heavy deps.
5. **Mock at service boundaries:** Mock `api/client`, not every `expo-*` module - over-mocking hides integration bugs.
6. **Avoid false confidence from empty mocks:** `jest.mock('expo-camera', () => ({}))` lets tests pass while production crashes - return realistic shapes.
7. **Query like users do:** RNTL priority is role, label, then text - `testID` is escape hatch, not default.
8. **Use userEvent over fireEvent:** Press sequences match real interaction - `fireEvent` skips accessibility and timing paths.
9. **Wait for async UI with findBy or waitFor:** Assertions immediately after `press` flake on mobile - network and animations need async matchers.
10. **Test presenters without providers when possible:** Pure props-in JSX-out components run in milliseconds - reserve MSW for integration tests.
11. **Snapshot only stable primitives:** Buttons and badges, not entire screens - snapshot churn trains teams to click-through approve.
12. **Colocate tests beside source:** `Button.test.tsx` next to `Button.tsx` - distant `__tests__` folders stop being updated.
13. **Run tests in CI on every PR:** `npm test -- --ci` with coverage optional - local-only testing does not scale past five engineers.
14. **Separate unit and contract scripts:** `test:contract` for Zod fixtures - fast signal without booting the full app.
15. **Contract-test API responses with Zod:** Shared schemas between client and tests - backend shape changes fail CI before QA.
16. **Add Pact when multiple teams own APIs:** Consumer-driven contracts complement schema tests - use when mobile and backend release independently.
17. **Start Maestro with three smoke flows:** Launch, sign-in, and primary tab - YAML flows are cheap to maintain vs Detox for many teams.
18. **Pin appId in Maestro to bundle identifier:** Wrong `appId` launches the wrong binary silently - match `app.config` ios.bundleIdentifier / android.package.
19. **Run Maestro on EAS build artifacts in CI:** Flows against release-like binaries - Expo Go is not a store submission stand-in.
20. **Reach for Detox when sync is the bug:** Gray-box synchronization helps gesture-heavy flows - accept native build setup cost.
21. **Use Storybook for visual states, not navigation:** Catalog loading/error/empty variants - on-device Storybook beats screenshotting production screens.
22. **Gate Storybook behind STORYBOOK\_ENABLED:** Swap entry in dev only - production bundles must not ship story routes.
23. **Flake policy: fix or quarantine:** Quarantined E2E must have owner and expiry - retry loops hide product bugs.
24. **Test offline and airplane mode paths:** NetInfo mocks in unit tests; real device check before release - mobile users lose signal constantly.
25. **Pre-submission checklist:** Unit + component green, smoke Maestro on physical device, contract tests, and manual payment/permission flows once per RC.

## FAQs

How many E2E tests are enough?

* Three to eight smoke flows covering revenue and auth paths.
* Add more only when a specific regression repeats in production.

Maestro or Detox for Expo SDK 57?

* Default Maestro for speed and YAML maintainability.
* Detox when you need tight native synchronization and already pay native CI cost.

Should we test Expo Router layouts?

* Use RNTL `renderRouter` for integration tests on critical stacks.
* Do not E2E every deep link - contract-test param parsing instead.

## Related

* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - pyramid tour and intro examples
* [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - presets and mocks
* [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - queries and async
* [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - boundary mocks
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - YAML flows and CI
* [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/) - Zod and Pact

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
