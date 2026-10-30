# CI/CD Best Practices

A condensed summary of the **25 most important CI/CD practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / CI/CD Best Practices

* One npm script surface for local dev and CI - lint, typecheck, test, format:check
* PR checks stay under ten minutes; native builds belong to release and preview lanes
* Pin build\_id from EAS through QA to eas submit - never promote a rebuilt binary
* OTA respects runtimeVersion; native changes always need eas build
* Maestro smoke gates automated submit - short flows, not mega-journeys
* Release calendar coordinates mobile, backend, and feature flags - not ad-hoc Friday tags

1. **Same scripts locally and in CI:** `npm run lint`, `typecheck`, `test`, and `format:check` must work on a fresh clone - CI should not invoke one-off tool commands developers never run.
2. **PR checks are fast gates:** Lint, TypeScript, and Jest on every pull request - target under ten minutes; block merge via branch protection.
3. **Release pipelines are separate:** Tag-driven `eas build` and submit workflows - different triggers, different failure budget than PR checks - [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/).
4. **No laptop store builds:** Production binaries come from EAS Build with credentials in EAS - not Xcode archives on one engineer's MacBook.
5. **Same artifact CI to store:** QA signs off on `build_id`; `eas submit` uses that ID - not `--latest` after a rebuild - [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/).
6. **EXPO\_TOKEN robot account:** CI uses an Expo access token stored in GitHub Secrets - never personal passwords or interactive `eas login` - [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/).
7. **`npm ci` in CI always:** Lockfile-driven installs - `npm install` in workflows creates non-reproducible failures.
8. **Node 20 LTS in CI:** Align `engines.node` with GitHub Actions and EAS Workflows - matches SDK 57 tooling expectations.
9. **Run `npx expo customize` before `tsc`:** Typed routes need `.expo/types` on clean checkouts - [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/).
10. **Quality before `type: build`:** EAS Workflows chain `needs: [quality]` so native compiles do not start on broken TypeScript - [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/).
11. **Preview builds are label-gated:** `needs-preview` label or path filters - not every typo spends EAS credits - [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).
12. **Internal distribution for PR previews:** `distribution: internal` + Android `apk` - QR install for QA on real devices - [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/).
13. **Separate `preview` and `production` profiles:** Preview must not touch production signing credentials or auto-increment store build numbers - [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/).
14. **Maestro smoke gates submit:** Two to four short flows on the production `build_id` before `type: submit` - [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/).
15. **E2E stays thin; Jest stays wide:** Critical paths in Maestro; branch coverage in unit tests - [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/).
16. **OTA only within `runtimeVersion`:** `eas update` ships JS compatible with installed store binaries - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
17. **Native changes require store build:** New Expo modules, config plugins, SDK bumps - never OTA alone - [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/).
18. **Explicit update channels:** `production`, `staging`, `preview` - no accidental cross-channel promotion - [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/).
19. **Document OTA rollback:** `eas update --roll-back` rehearsed before first production OTA - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/).
20. **Release train calendar is shared:** Mobile, backend, and QA see the same dependency checklist - API before breaking mobile, flags before visible features - [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/).
21. **Contract tests in PR checks:** API shape drift caught before nightly - especially when backend deploys continuously - [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/).
22. **Nightlies catch integration drift:** Scheduled full build on `main` when PR volume is high - alert, do not block merges.
23. **Concurrency cancels stale PR runs:** `cancel-in-progress: true` - save minutes and reduce confusing red checks on outdated commits.
24. **Monorepo path filters or Turbo filter:** Mobile CI skips when only unrelated packages change - but nightlies still validate full `main`.
25. **Staged rollout after submit:** Automated upload ≠ 100% users immediately - Play staged % and phased TestFlight - [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/).

## FAQs

GitHub Actions, EAS Workflows, or both?

Both is common: GitHub for PR checks; EAS Workflows for build → Maestro → submit chains. Keep npm scripts identical.

Minimum CI for a solo developer?

PR checks (lint + tsc + test) + manual `eas build` on tag. Add preview-on-PR and automated submit as the app grows.

How do I know if a change needs preview build?

Native module, config plugin, navigation shell, or camera/permissions - yes. Copy and unit-test-only - no.

What is the biggest CI/CD mistake?

QA testing one binary and stores receiving another. Pin `build_id` end-to-end.

Does expo-doctor belong in CI?

Yes - at least on release and nightly workflows. Catches dependency skew before expensive native builds.

## Related

* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR vs release vs nightly with 10 examples
* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - 30-item workflow checklist
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - secrets, caching, monorepo
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - QR distribution cookbook
* [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/) - gated submit
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - JS, native, backend coordination
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles and first cloud build
* [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/) - what to run before store submission

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
