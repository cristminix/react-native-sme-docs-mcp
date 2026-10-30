# OTA Updates Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / OTA Updates Best Practices

* OTA ships JS and assets only - native modules and permissions need store builds
* runtimeVersion must match between eas build and eas update on every release
* Channels map to environments - preview soak before production on revenue paths
* Record last known-good update ID before every production publish
* Use eas update --environment on SDK 55+ - local .env is ignored
* Feature flags and OTA rollback are complementary incident tools

1. **OTA is JS and assets only:** Native modules, config plugins, permissions, entitlements, SDK upgrades, and app icons require `eas build` and store submission - OTA cannot add native symbols.
2. **Set explicit runtimeVersion policy:** Use `appVersion`, `nativeVersion`, or `fingerprint` consistently in `app.config` - document the choice in README and never mix policies across flavors without an ADR.
3. **Match runtime on build and update:** The `runtimeVersion` resolved by `eas build` must equal what `eas update` targets - verify with `npx expo config --type public` before every publish.
4. **Bump runtime when native changes:** New native dependency, plugin edit, or permission string means new store build and new runtime line - do not OTA JS that imports missing native modules.
5. **Configure updates.url and projectId:** Run `eas update:configure` after `eas init` - missing `updates.url` disables `expo-updates` silently in release builds.
6. **Wire channel headers to build profiles:** `updates.requestHeaders["expo-channel-name"]` must match `eas.json` `channel` for each profile - drive from `EAS_BUILD_PROFILE` in dynamic `app.config`.
7. **Use eas update --environment always:** On SDK 55+, update runners ignore local `.env` - pass `--environment production` (or preview) so OTA bundles match build env vars.
8. **Name channels for environments:** `development`, `preview`, `staging`, `production` - not engineer names; map channels to audiences in `docs/release-channels.md`.
9. **Linear promotion flow:** `development` → `preview` (QA) → `production` - no skipping preview for payment, auth, or checkout changes regardless of diff size.
10. **Preview builds for OTA sign-off:** QA tests on EAS `preview` profile binaries, not Expo Go - Expo Go cannot receive your production update configuration.
11. **CI-only production publish:** Prefer tagged GitHub Actions workflows for `eas update --channel production` - laptop publish is break-glass with second approver and postmortem.
12. **Record last known-good update ID:** Every production release ticket stores the previous bundle ID for `eas update:rollback` or `eas update:republish` - rollbacks without this are guesswork.
13. **Define rollback triggers before launch:** Crash-free drop, payment success drop, and auth error spike thresholds with owners - see Release & OTA Rules Tier 4.
14. **Practice rollback quarterly on preview:** Run `eas update:rollback` on the preview channel in a drill - target under 15 minutes from decision to verified channel head.
15. **Gate native-dependent JS with flags:** Remote kill switches plus `Application.nativeApplicationVersion` checks prevent crashes until store adoption crosses your threshold.
16. **Log updateId in production analytics:** `Updates.updateId`, `runtimeVersion`, and `channel` at session start - support and incident response depend on knowing the running bundle.
17. **checkAutomatically ON\_LOAD with fallback 0:** Check on cold start without blocking launch on slow networks - tune reload UX separately via expo-updates client API.
18. **Rebuild after first updates config:** Adding `expo-updates` wiring requires a new native binary - `eas update` alone does not enable updates on old installs.
19. **Treat bundle size regressions as releases:** Large OTA bundles hurt TTI - compare Metro output before production publish and link to performance budget rules.
20. **Backward-compatible API contracts:** Mobile users skip updates - JS shipped OTA must tolerate older API responses until store adoption is high; run contract tests in CI.
21. **Safe local storage migrations:** MMKV and SQLite schema bumps need tested upgrade paths from the previous production bundle - bad migrations brick installs and need rollback.
22. **Staged rollouts on production:** Use `--rollout-percentage` or `eas channel:rollout` after preview soak - monitor crash and payment metrics at each step before 100%.
23. **Tag Sentry with updateId:** Segment crash reports by bundle during rollouts - without cohort tags, percentage rollouts are blind.
24. **Track runtime distribution weekly:** Percentage of users per `runtimeVersion` - stale binaries stop receiving OTAs; enforce minimum native version when security requires.
25. **Two-track release checklist:** Store submission checklist for native changes and OTA checklist for preview soak, flags, rollback ID, and dashboards - attach both to every release ticket.

## FAQs

What is the default greenfield OTA stack?

`appVersion` runtime policy + `eas.json` channels per profile + `eas update:configure` + preview soak + CI production publish + `updateId` logging + quarterly rollback drill + Release & OTA Rules checklist.

Can I fix a native crash with OTA?

No - native crashes need a new store build. OTA fixes JavaScript logic and assets only. Roll back JS if the crash is from importing a missing native module, then ship binary.

Where do I start for first EAS Update setup?

[OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) for boundaries, then [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/) for `app.config`, then [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) for promotion flow.

appVersion or fingerprint for runtime?

`appVersion` for most consumer apps. `fingerprint` when native project drifts without marketing version bumps - see [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).

How do rollouts relate to rollback?

[Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) limit blast radius before full exposure. [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) recovers after a bad publish - use both with shared monitoring dashboards.

## Related

* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs store boundaries
* [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/) - `app.config` cookbook
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - promotion workflow
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - channel republish in minutes
* [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) - policy selection
* [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) - percentage rollouts and monitoring
* [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - client check/fetch/reload
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - binaries that receive updates
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - team enforcement checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
