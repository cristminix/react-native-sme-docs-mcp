# Governance Best Practices

A condensed summary of the **25 most important governance practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / Governance Best Practices

* Written standards + CI gates - docs without enforcement decay by month two
* N-1 SDK window and named upgrade champions - not whoever is free in crunch week
* EOL registry with owners and dates - deprecation without deadline is permanent
* Spikes are time-boxed with ADR outcomes - never merge spike code without flags and QA
* Supply-chain: lockfile, audit, SBOM per release tag - legal asks 'what shipped?' once
* Staff+ impact is durable policy adopted by squads you do not manage

1. **Publish standards in `docs/CONTRIBUTING.md`:** Naming, folders, and native touch rules live in git - not Slack pins that new hires never see ([Standards Basics](https://docs.wahwei/reactnative.codeguides.io/governance/standards-basics/)).
2. **Feature barrels are merge blockers:** Import only from `@/features/<name>` - deep imports couple refactors; enforce with ESLint `no-restricted-imports` ([Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/)).
3. **Thin `app/`, fat `src/features/`:** Route files re-export screens; business logic never lives in Expo Router filenames - aligns with [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/).
4. **Native touch rules have named owners:** `plugins/`, `app.config.ts`, and checked-in `ios/` / `android/` require platform CODEOWNERS - CNG teams regenerate, never hand-edit ([Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/)).
5. **One command surface for quality:** `format:check`, `lint`, `typecheck`, `test` - identical in Husky, laptop, and GitHub Actions ([CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/)).
6. **Zero-warning ESLint on `main`:** `expo lint -- --max-warnings 0` in CI - warnings become ignored debt within one sprint ([Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/)).
7. **Prettier and ESLint do not fight:** Pick Prettier for formatting and import order; disable overlapping ESLint stylistic rules ([Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/)).
8. **PR template encodes human gates:** Device evidence, native diff attachments, and standards checkboxes - policy beats honor system ([Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/)).
9. **ADR for every intentional exception:** "Temporary" native edits or architecture violations without ADR become permanent - use [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/).
10. **Commit lockfiles; CI uses `npm ci`:** Floating installs hide native/JS skew until TestFlight - never gitignore `package-lock.json` ([Dependency & Supply-Chain Governance](https://docs.wahwei/reactnative.codeguides.io/governance/dependency-and-supply-chain-governance/)).
11. **`npx expo install` for Expo packages:** Manual version pins cause doctor failures and production native crashes - [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/).
12. **npm audit fails on high/critical in CI:** Document accepted risk in `docs/security-exceptions.md` with expiry - exceptions without dates are not accepted ([Dependency & Supply-Chain Governance](https://docs.wahwei/reactnative.codeguides.io/governance/dependency-and-supply-chain-governance/)).
13. **SBOM per store release tag:** CycloneDX from lockfile archived with EAS `build_id` - enterprise audits ask what shipped in build `abc123`, not today's `main`.
14. **Native OSS licenses ship in-app:** iOS Settings bundle and Android OSS screen updated on every native bump - legal review on GPL-class additions.
15. **N-1 SDK support window only:** Production supports current SDK and one prior - three SDK generations in the wild breaks OTA and support ([SDK Upgrade Policy](https://docs.wahwei/reactnative.codeguides.io/governance/sdk-upgrade-policy/)).
16. **Named upgrade champion per SDK bump:** Accountable for branch, `expo-doctor`, preview matrix, and `runtimeVersion` ADR - not a volunteer in sprint 47 ([SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/)).
17. **SDK upgrades on dedicated branches + worktrees:** Never mix `expo upgrade` with feature work on `main` - hotfixes stay possible on parallel worktree ([Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/)).
18. **`expo-doctor` and preview `eas build` are merge gates:** OTA cannot fix native skew from a bad SDK merge - full build matrix before production ([Release and OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/)).
19. **EOL registry with owners and deadlines:** RN architecture, Expo SDK, OS floors, and API deprecations in `docs/eol-registry.md` - reviewed quarterly ([Deprecation & EOL Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/)).
20. **OS floor bumps are product decisions:** ASC / Play analytics + ADR before raising `deploymentTarget` / `minSdkVersion` - engineering preference alone is insufficient.
21. **Spikes are time-boxed with ADR outcomes:** ADOPT, DEFER, or REJECT documented; spike branches deleted after demo - no Friday merge without flags and QA ([Spikes, PoCs & New Architecture](https://docs.wahwei/reactnative.codeguides.io/governance/spikes-pocs-and-new-architecture/)).
22. **Brownfield spikes use isolated artifacts:** `expo-brownfield` AAR/XCFramework - never copy-paste JS bundles into host assets ([Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/)).
23. **New Architecture validated on release-like builds:** Expo Go is not proof - EAS preview + device smoke before org-wide NA enablement on RN 0.86.
24. **Risk calendar aligns three clocks:** Store binary, OTA bundle, and backend API deprecation on one shared doc - mobile EOL must not lag API removal ([Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/)).
25. **Staff+ governance is measured by durability:** Policies, runbooks, and ADRs adopted by squads after you move on - not lines of code or heroic release weekends ([Career Growth: Senior → Lead → Staff](https://docs.wahwei/reactnative.codeguides.io/governance/career-growth-senior-lead-staff/)).

## FAQs

Minimum governance for a two-person mobile team?

`CONTRIBUTING.md`, lockfile + `npm ci`, `expo lint` + `tsc` in CI, PR template with device evidence, and one `docs/eol-registry.md` row per SDK. Add champions and SBOM when a third app or enterprise customer appears.

How do governance and expo-rules differ?

**Governance** is process (who, when, how decisions are recorded). **expo-rules** are technical non-negotiables (secrets, OTA, navigation). Both appear in PR review; violations of either can block merge.

Biggest governance failure on RN teams?

**Undocumented SDK drift** - multiple `runtimeVersion` families in production with no EOL calendar, leading to OTA bricks and security patches that never reach the oldest app.

Who maintains governance docs?

**Staff / platform lead authors**; **Lead enforces** in review; **EM sponsors** calendar time. Everyone proposes ADR updates when reality diverges from policy.

## Related

* [Standards Basics](https://docs.wahwei/reactnative.codeguides.io/governance/standards-basics/) - naming, folders, native touch
* [Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/) - enforcement cookbook
* [Dependency & Supply-Chain Governance](https://docs.wahwei/reactnative.codeguides.io/governance/dependency-and-supply-chain-governance/) - audit and SBOM
* [SDK Upgrade Policy](https://docs.wahwei/reactnative.codeguides.io/governance/sdk-upgrade-policy/) - N-1 and champions
* [Deprecation & EOL Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/) - registry
* [Spikes, PoCs & New Architecture](https://docs.wahwei/reactnative.codeguides.io/governance/spikes-pocs-and-new-architecture/) - safe experimentation
* [Career Growth: Senior → Lead → Staff](https://docs.wahwei/reactnative.codeguides.io/governance/career-growth-senior-lead-staff/) - principal path
* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - technical non-negotiables
* [Linting & Formatting Best Practices](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/best-practices/) - quality gate summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). Y29kZWd1aWRlcy5pb3xjZ2lvOTAwfDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
