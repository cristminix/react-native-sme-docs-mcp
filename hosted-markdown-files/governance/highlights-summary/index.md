# Governance Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Governance Highlights Summary

* ESLint catches syntax; standards catch architecture - naming and folders need a written doc
* One command surface: format:check, lint, typecheck, test - local, hooks, and CI call the same scripts
* Lockfile is the contract - npm ci in CI; no floating installs on release branches
* N-1 window: production supports current SDK and one prior - not three years of drift
* One registry: docs/eol-registry.md - RN arch, Expo SDK, OS floors, and API deprecations
* Spike branches are time-boxed - ADR outcome required before any merge to main

## [Standards Basics](https://docs.wahwei/reactnative.codeguides.io/governance/standards-basics/)

* ESLint catches syntax; standards catch architecture - naming and folders need a written doc
* PascalCase components, camelCase hooks, kebab-case route folders - one table in CONTRIBUTING.md
* features//index.ts is the only public import path - deep imports are merge blockers
* Native touch rules: who edits ios/, android/, plugins/, and when prebuild --clean is mandatory
* ADR required for every native folder commit under CNG - otherwise drift becomes permanent
* Pair standards with expo-rules checklist and lint CI gates - docs alone do not enforce

## [Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/)

* One command surface: format:check, lint, typecheck, test - local, hooks, and CI call the same scripts
* eslint-config-expo/flat + Prettier + tsc --noEmit - three gates, three failure classes
* PR template checkboxes beat Slack reminders - standards without enforcement decay in month two
* Custom ESLint rules encode RN-specific bans: deep feature imports, inline styles on hot paths
* CODEOWNERS on app.config.ts, plugins/, eas.json - style guide extends to config files
* Zero-warning ESLint policy requires CI --max-warnings 0 - warnings become errors on main

## [Dependency & Supply-Chain Governance](https://docs.wahwei/reactnative.codeguides.io/governance/dependency-and-supply-chain-governance/)

* Lockfile is the contract - npm ci in CI; no floating installs on release branches
* npm audit gates critical/high in CI; document accepted risk in docs/security-exceptions.md
* SBOM per store release - CycloneDX from lockfile + native Podfile.lock / Gradle lock
* Native SDK licenses: iOS Settings bundle, Android OSS licenses screen, legal review on bumps
* Dependabot/Renovate with expo-doctor smoke - never auto-merge native-affecting bumps
* Supply-chain incidents need rollback binary + OTA plan - not only npm override

## [SDK Upgrade Policy](https://docs.wahwei/reactnative.codeguides.io/governance/sdk-upgrade-policy/)

* N-1 window: production supports current SDK and one prior - not three years of drift
* Named upgrade champion per bump - not 'whoever has time' in sprint 47
* Dedicated upgrade branch + spike worktree - never SDK bump mixed with feature on main
* expo-doctor + eas build matrix are merge gates - OTA cannot fix native skew
* runtimeVersion and OTA channels reviewed on every SDK PR - silent bricking is common
* Risk calendar aligns SDK train with store freeze and backend API deprecation

## [Deprecation & End-of-Life Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/)

* One registry: docs/eol-registry.md - RN arch, Expo SDK, OS floors, and API deprecations
* OS floor is a product decision - iOS 15 / Android API 26 minimums belong in app.config.ts + ADR
* Old Architecture sunset tracked per RN release - RN 0.86 defaults New Architecture on greenfield
* Expo SDK EOL tied to N-1 policy - not 'we'll upgrade when Apple complains'
* Deprecation without removal date is permanent - every entry needs owner + deadline
* Store analytics (% OS version) feeds floor bumps - not only engineering preference

## [Spikes, PoCs & New Architecture](https://docs.wahwei/reactnative.codeguides.io/governance/spikes-pocs-and-new-architecture/)

* Spike branches are time-boxed - ADR outcome required before any merge to main
* PoC success criteria written before code - 'looks cool' is not a metric
* Expo UI and experimental Router APIs belong on spike/\* with feature flags off in production
* Brownfield spikes use isolated worktree + artifact publish - not copy-paste into host main
* New Architecture validation needs release-like eas build - Expo Go is not proof
* Kill spikes loudly - document why not to pursue saves future sprint debates

## [Career Growth: Senior → Lead → Staff](https://docs.wahwei/reactnative.codeguides.io/governance/career-growth-senior-lead-staff/)

* Senior ships reliably; Lead multiplies the team; Staff shapes systems across squads
* Principal path on mobile = deep RN/Expo + release trains + governance others adopt
* Scope proof: ADRs, SDK calendar, and incident runbooks you wrote that outlive your tenure
* Staff impact is measurable - crash-free, upgrade lead time, PR cycle time, not lines of code
* Avoid 'staff as senior++' - cross-team policy without authority to say no is burnout
* T-shaped: one spike (NA, brownfield, perf) + breadth (CI, security, observability)

## [Governance Best Practices](https://docs.wahwei/reactnative.codeguides.io/governance/best-practices/)

* Written standards + CI gates - docs without enforcement decay by month two
* N-1 SDK window and named upgrade champions - not whoever is free in crunch week
* EOL registry with owners and dates - deprecation without deadline is permanent
* Spikes are time-boxed with ADR outcomes - never merge spike code without flags and QA
* Supply-chain: lockfile, audit, SBOM per release tag - legal asks 'what shipped?' once
* Staff+ impact is durable policy adopted by squads you do not manage

Reviewed by Chris St. John·Last updated Jul 18, 2026
