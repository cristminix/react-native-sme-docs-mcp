# Agent Skills Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Agent Skills Highlights Summary

* Agent Skills are SKILL.md playbooks - not app tutorials - that pin Expo SDK 57 workflows
* Skill output is a ordered build → submit → OTA checklist - not a tutorial on EAS concepts
* Skill scaffolds app/ files, typed Href builders, and scheme-based deep links for SDK 57
* Skill reviews config plugin idempotency and TurboModule Codegen alignment for RN 0.86 NA
* Skill converts acceptance criteria into Jest unit/component tests plus Maestro YAML flows
* Ordered upgrade checklist: branch, expo install, prebuild --clean, doctor, device smoke

## [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/)

* Agent Skills are SKILL.md playbooks - not app tutorials - that pin Expo SDK 57 workflows
* Every skill declares inputs, outputs, guardrails, and example prompts for repeatable AI assistance
* Invoke skills at decision points: release, routing, native bridges, testing, upgrades, incidents
* SDK-pinned skills prevent agents from suggesting React 18 or pre-SDK-57 APIs
* Skills compose with human docs - eas-build and testing sections are the source of truth
* Run npx expo-doctor after any skill output that touches dependencies or native config

## [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/)

* Skill output is a ordered build → submit → OTA checklist - not a tutorial on EAS concepts
* Always classify changes as JS-only vs native-impacting before choosing eas update vs eas build
* runtimeVersion and channel must appear in every OTA skill invocation
* Submit profiles mirror build profiles - production credentials never land in git
* Verification ends with eas channel:view and npx expo-doctor
* Pair with EAS Build Basics and OTA Updates Basics for human-readable depth

## [Expo Router Skill](https://docs.wahwei/reactnative.codeguides.io/skills/expo-router-skill/)

* Skill scaffolds app/ files, typed Href builders, and scheme-based deep links for SDK 57
* experiments.typedRoutes: true is mandatory output - run tsc --noEmit to verify
* Dynamic routes use object hrefs with pathname + params - never raw string interpolation
* Deep links require scheme in app.config.ts plus optional universal links host
* Validate runtime URL params with Zod - generated types do not prove deep-link input
* Delegate navigation concepts to expo-router section docs - skill produces file tree + code

## [Native Module Skill](https://docs.wahwei/reactnative.codeguides.io/skills/native-module-skill/)

* Skill reviews config plugin idempotency and TurboModule Codegen alignment for RN 0.86 NA
* CNG apps must use plugins - never hand-edit ios/ or android/ without a follow-up plugin
* Prefer create-expo-module for app-local bridges; TurboModules for RN-ecosystem libraries
* Output includes prebuild --clean diff review and npx expo-doctor gate
* New native dependency always triggers eas build - skill must flag OTA-only requests as unsafe
* Cross-check against Config Plugins and Writing a TurboModule human docs

## [Mobile Testing Skill](https://docs.wahwei/reactnative.codeguides.io/skills/mobile-testing-skill/)

* Skill converts acceptance criteria into Jest unit/component tests plus Maestro YAML flows
* jest-expo preset and transformIgnorePatterns are part of every SDK 57 output
* Mock native I/O at Jest boundaries - exercise real bridges in Maestro on EAS builds
* One user journey per Maestro file - appId must match installed bundle exactly
* EAS Workflows type: maestro jobs preferred over ad-hoc CI shell for SDK 57
* Outputs include npm run test:ci and maestro test commands with flaky-test controls

## [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/)

* Ordered upgrade checklist: branch, expo install, prebuild --clean, doctor, device smoke
* npx expo-doctor is a hard gate - skill stops on failure before merge
* runtimeVersion and eas.json profiles must be reviewed on every SDK bump
* Native module and config plugin diffs require full eas build matrix before production
* Aligned with Expo official upgrade flow - not a substitute for reading SDK 57 release notes
* Outputs include rollback branch name and preview build verification commands

## [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/)

* Skill produces timed contain → diagnose → recover checklist with explicit IC roles
* Crash clusters need release tags: buildNumber, updateId, runtimeVersion, channel
* Decision tree: feature flag off → OTA rollback → pause rollout → store hotfix binary
* Native SIGABRT crashes cannot be fixed by eas update - skill must escalate to eas build
* Pair with Sentry symbolication gates and Rollback Runbook verification commands
* SDK 57: distinguish Hermes JS errors from native module regressions on RN 0.86 NA

## [Agent Skills Best Practices](https://docs.wahwei/reactnative.codeguides.io/skills/best-practices/)

* Pin React 19.2.3, RN 0.86.0, and Expo SDK 57 in every SKILL.md header
* Skills document workflows - human docs in eas-build, expo-router, and testing stay authoritative
* Guardrails block unsafe OTA, credential commits, and hand-edited CNG native dirs
* Every skill output ends with verifiable commands - expo-doctor, tsc, test, eas channel:view
* Split skills by decision domain - monolithic mobile skills produce dangerous automation
* Refresh skills after SDK bumps, postmortems, and runtimeVersion policy changes

Reviewed by Chris St. John·Last updated Jul 18, 2026
