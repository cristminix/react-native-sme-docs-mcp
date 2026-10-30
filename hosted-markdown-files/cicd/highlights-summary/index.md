# CI/CD for Mobile Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / CI/CD for Mobile Highlights Summary

* PR checks are fast gates - lint, typecheck, unit tests - every merge request
* Workflow files live in `.eas/workflows/` - versioned beside `eas.json`
* expo-github-action installs EAS CLI and authenticates with EXPO\_TOKEN
* Preview profile produces internal-distribution binaries - install via QR, not the public store
* Submit jobs reference build\_id from the same workflow - never --latest after manual QA on different ID
* Three clocks: store binary (native), OTA bundle (JS), backend API - document dependencies

## [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/)

* PR checks are fast gates - lint, typecheck, unit tests - every merge request
* Release pipelines produce store binaries and OTA bundles from tagged commits
* Nightly builds catch integration drift when PR volume is high
* Same npm scripts locally and in CI - no special CI-only commands
* EAS Build replaces laptop Xcode/Android Studio for reproducible native artifacts
* Separate PR feedback (minutes) from release trains (hours/days) - different failure budgets

## [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/)

* Workflow files live in `.eas/workflows/` - versioned beside `eas.json`
* Job types: custom steps, build, maestro, submit, update - chain with `needs`
* PR triggers use `pull_request`; releases use `push` tags or `workflow_dispatch`
* Quality gates run before `type: build` - same npm scripts as GitHub Actions
* Maestro jobs consume `build_id` from an upstream build job - no manual APK upload
* Submit and update jobs promote artifacts already produced - never rebuild at submit time

## [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/)

* expo-github-action installs EAS CLI and authenticates with EXPO\_TOKEN
* npm ci + Node 20 + setup-node cache: npm for deterministic PR checks
* Monorepos use paths-filter or turbo --filter to skip unrelated packages
* Never store Apple passwords in YAML - EAS credentials and ASC API keys only
* Hybrid pattern: GitHub Actions for PR gates, EAS Workflows for build chains
* Concurrency groups cancel stale runs when contributors push fixup commits

## [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/)

* Preview profile produces internal-distribution binaries - install via QR, not the public store
* Label-gated or path-filtered triggers keep EAS credits under control
* expo-github-action or EAS Workflows both work - post install URL as PR comment
* Android APK previews install without Play Console; iOS uses ad hoc or simulator builds
* Pair preview builds with Maestro smoke when native navigation changed
* Document which PRs need previews - designers add a label, not every typo

## [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/)

* Submit jobs reference build\_id from the same workflow - never --latest after manual QA on different ID
* Maestro smoke is the minimum gate - login, home, one revenue or data-loss path
* Human approval step optional between smoke and submit for regulated industries
* Staged Play rollout and phased TestFlight remain post-submit - automation stops at upload
* Failed smoke blocks submit via needs - no bypass without documented hotfix process
* Same workflow produces iOS and Android artifacts - parallel platform chains

## [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/)

* Three clocks: store binary (native), OTA bundle (JS), backend API - document dependencies
* Backend breaking changes deploy before or with the mobile binary that requires them
* OTA-only weeks skip store submit but still need runtimeVersion discipline
* Code freeze windows protect Friday releases - hotfix lane documented separately
* Feature flags decouple binary live from feature visible to users
* Shared calendar visible to mobile, backend, and QA - not a spreadsheet only EM edits

## [CI/CD Best Practices](https://docs.wahwei/reactnative.codeguides.io/cicd/best-practices/)

* One npm script surface for local dev and CI - lint, typecheck, test, format:check
* PR checks stay under ten minutes; native builds belong to release and preview lanes
* Pin build\_id from EAS through QA to eas submit - never promote a rebuilt binary
* OTA respects runtimeVersion; native changes always need eas build
* Maestro smoke gates automated submit - short flows, not mega-journeys
* Release calendar coordinates mobile, backend, and feature flags - not ad-hoc Friday tags

Reviewed by Chris St. John·Last updated Jul 18, 2026
