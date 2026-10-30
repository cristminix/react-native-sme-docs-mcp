# Agent Skills Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Agent Skills Best Practices

* Pin React 19.2.3, RN 0.86.0, and Expo SDK 57 in every SKILL.md header
* Skills document workflows - human docs in eas-build, expo-router, and testing stay authoritative
* Guardrails block unsafe OTA, credential commits, and hand-edited CNG native dirs
* Every skill output ends with verifiable commands - expo-doctor, tsc, test, eas channel:view
* Split skills by decision domain - monolithic mobile skills produce dangerous automation
* Refresh skills after SDK bumps, postmortems, and runtimeVersion policy changes

1. **Skills are playbooks, not tutorials:** `SKILL.md` files tell agents *how to execute* - [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/) defines structure; [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) teaches concepts.
2. **Pin the stack in every skill:** React **19.2.3**, RN **0.86.0**, Expo SDK **57** (`expo` ~57.0.4) - unpinned skills hallucinate deprecated APIs.
3. **One skill per decision domain:** Release, routing, native review, testing, upgrade, incident - never one mega-skill.
4. **Declare inputs before acting:** `eas.json`, `app.config.ts`, bundle IDs, `runtimeVersion`, last good `updateId` - agents guess without them.
5. **Outputs must be verifiable:** Commands and checklists, not prose summaries - reject skill runs that omit `npx expo-doctor`.
6. **Guardrails are the highest-value section:** OTA vs build boundaries, credential rules, rollout pause - see [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/).
7. **Invoke skills at decision points:** First production release, SDK upgrade, crash storm - not for reading introductory docs.
8. **Human docs remain source of truth:** Skills link to [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/), [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/), [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - don't duplicate.
9. **Run `npx expo-doctor` after dependency changes:** Mandatory gate in [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/) and every native-touching skill output.
10. **Use `npx expo install` in skills:** Never hand-pin `expo-*` versions - SDK 57 alignment drifts otherwise.
11. **Classify JS-only vs native-impacting before release:** Native module, plugin, or permission → `eas build` - OTA alone is unsafe.
12. **`runtimeVersion` in every OTA skill invocation:** Mismatch needs store binary - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
13. **Expo Router skills enable `typedRoutes`:** Regenerate with `npx expo start`; verify `npx tsc --noEmit` - [Expo Router Skill](https://docs.wahwei/reactnative.codeguides.io/skills/expo-router-skill/).
14. **Validate deep-link params at runtime:** Zod at screen entry - generated `Href` types don't prove malicious input.
15. **Native skills prefer config plugins:** CNG `prebuild --clean` erases hand-edited `ios/` - [Native Module Skill](https://docs.wahwei/reactnative.codeguides.io/skills/native-module-skill/).
16. **Idempotent plugins only:** Second `prebuild --clean` should produce empty git diff.
17. **App bridges → Expo Modules; TurboModules for RN libraries:** RN 0.86 New Architecture defaults - test on device.
18. **Testing skills respect the pyramid:** Many Jest, few Maestro - [Mobile Testing Skill](https://docs.wahwei/reactnative.codeguides.io/skills/mobile-testing-skill/).
19. **Maestro `appId` must match bundle ID:** Display name mismatches cause silent flow failures.
20. **E2E on EAS `e2e-test` builds:** Expo Go is not production-shaped - pair with EAS Workflows `type: maestro`.
21. **SDK upgrade skills use dedicated branches:** `prebuild --clean`, doctor, preview `eas build` matrix before production.
22. **Incident skills contain before diagnose:** Pause phased/staged rollout; assign IC - [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/).
23. **Tag crashes with buildNumber + updateId + route:** Triage without repro - [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/).
24. **OTA rollback < 15 minutes when JS regression:** Record known-good `updateId` in every release ticket - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/).
25. **Refresh skills after postmortems:** Every missed guardrail becomes a new bullet - version skills with semver in `createRunOncePlugin` spirit.

## FAQs

Where should SKILL.md files live?

App repo `.cursor/skills/` for project-specific `eas.json` conventions; org registry for shared incident and upgrade playbooks. Always pin SDK version.

Should agents edit eas.json without human approval?

Skill may draft diffs - human release captain approves before CI non-interactive runs. Guardrails block production track submit without explicit prompt.

How do skills relate to Expo's official upgrade assistant?

[SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/) orchestrates the same gates for agents - official release notes stay authoritative for breaking changes.

Can skills replace on-call runbooks?

No. Skills accelerate checklists; [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/) and rollback runbooks own production authority.

When is a skill stale?

After any SDK bump, `runtimeVersion` policy change, or postmortem action item. Run `npx expo-doctor` in the skill verification section on refresh.

## Related

* [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/) - SKILL.md anatomy with 10 examples
* [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/) - build, submit, OTA guardrails
* [Expo Router Skill](https://docs.wahwei/reactnative.codeguides.io/skills/expo-router-skill/) - routes and deep links
* [Native Module Skill](https://docs.wahwei/reactnative.codeguides.io/skills/native-module-skill/) - plugins and TurboModule review
* [Mobile Testing Skill](https://docs.wahwei/reactnative.codeguides.io/skills/mobile-testing-skill/) - Jest + Maestro from AC
* [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/) - Expo 57 upgrade checklist
* [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/) - crash clusters and rollback tree
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - human build reference
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - testing pyramid

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 636f64656775696465732e696f7c6367696f3931337c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
