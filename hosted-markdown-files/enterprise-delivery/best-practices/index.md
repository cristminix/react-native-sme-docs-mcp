# Enterprise Delivery Best Practices

A condensed summary of the **25 most important enterprise delivery practices** for Expo SDK 57 mobile teams - one calendar for iOS, Android, backend, and OTA, drawn from every page in this section.

Highlights / Enterprise Delivery Best Practices

* One shared release calendar - not separate iOS, Android, and JS spreadsheets
* Two clocks: store binary and OTA bundle - every PR declares which path
* runtimeVersion links binaries to updates - mismatch strands users silently
* Feature flags decouple binary live from feature visible - essential for store review
* Pin build\_id from QA through eas submit - never promote a rebuilt binary
* Rollback cards, canary gates, and DORA metrics turn delivery into a measurable system

1. **Run two delivery clocks:** Store binary (native) and OTA bundle (JS) - never confuse which path a change takes - [Mobile Delivery Basics](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/mobile-delivery-basics/).
2. **One shared release calendar:** Mobile, backend, QA, and support see the same train - not ad-hoc Friday tags - [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/).
3. **Declare delivery path in every PR:** JS-only → OTA; native change → `eas build` required - fingerprint CI gates enforce it.
4. **Set explicit `runtimeVersion` policy:** `appVersion`, `fingerprint`, or `sdkVersion` - consistent across builds and updates - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
5. **Align `eas.json` channel with `eas update` target:** Production binaries on `channel: production` receive updates published to the same channel.
6. **Pin `build_id` from QA to submit:** The artifact QA signed off on is the artifact stores receive - no rebuild between gates - [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/).
7. **Freeze OTA to production during store RC:** Prevents JS drift between QA sign-off and `eas submit` - hotfix lane reopens after binary is live.
8. **Backend deploys before mobile OTA that depends on it:** API live with backward compatibility; flags hide new UI until both sides ready.
9. **Feature flags default off:** Remote kill switches decouple binary live from feature visible - [Feature Flags on Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/feature-flags-on-mobile/).
10. **Cache flags locally:** Dead config endpoint must not brick cold starts - safe defaults when remote is unreachable.
11. **Preview soak before production OTA:** Minimum 24h on revenue paths - rollouts are not a substitute for QA - [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/).
12. **Canary OTA at 10% before 100%:** `eas update --rollout-percentage=10` with monitoring gates - [Canary OTA & Blue-Green](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/canary-ota-and-blue-green/).
13. **Flag off first on incident; OTA rollback second:** Seconds vs minutes - bundle defects need channel republish - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/).
14. **Record last known-good update ID per release:** Rollback without guessing - quarterly drill on preview channel.
15. **Staged store rollout is default:** Play staged percentage and ASC phased release - 100% day-one is the exception - [Store Operations Best Practices](https://docs.wahwei/reactnative.codeguides.io/store-operations/best-practices/).
16. **Go/No-Go before every store submit:** Checklist complete before the meeting; decision recorded with named approvers - [Release Checklist & Go/No-Go](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/release-checklist-and-go-no-go/).
17. **Physical device matrix on every RC:** Simulators miss push, biometrics, IAP, and signing - QA sign-off names devices tested.
18. **Contract tests in PR checks:** API drift caught before calendar day - backend and mobile stay compatible.
19. **Split DORA metrics by path:** LT-OTA, LT-Store, DF-OTA, DF-Store - blending hides bottlenecks - [DORA Metrics for Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/dora-metrics-for-mobile/).
20. **Count rollbacks in change-fail rate:** OTA revert, rollout halt, and store hotfix are all failures - vanity CFR helps no one.
21. **Report MTTR by tier:** Flag off (< 5m), OTA rollback (< 15m), store hotfix (days) - never average them.
22. **OTA-only weeks still need discipline:** Channel promotion, rollback cards, and preview soak - skipping store is not skipping process.
23. **White-label apps get separate channels:** Never share one production channel across bundle IDs - [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/).
24. **Automate release pipelines; human gates promotion:** EAS Workflows build and update; EM approves Go/No-Go - [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/).
25. **Postmortem every production rollback:** Update checklist, canary thresholds, and calendar template within five business days - delivery improves through incidents, not despite them.

## FAQs

How do we start if we only ship store builds today?

1. Configure `expo-updates` and `runtimeVersion` on the next store release.
2. Add preview → production channel promotion for JS-only fixes.
3. Introduce feature flags before increasing OTA frequency.
4. Read [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) and [Mobile Delivery Basics](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/mobile-delivery-basics/).

Who owns the release calendar?

Engineering manager or release captain - accountable. Mobile, backend, QA, and support are consulted. The calendar is a living doc tied to the release epic, not a one-time spreadsheet.

Can OTA replace store trains entirely?

No. OTA cannot add native modules, permissions, SDK bumps, or entitlements. High DF-OTA with low DF-Store is healthy - not a failure to ship store builds.

What is the minimum viable enterprise delivery stack?

EAS Build + EAS Update + shared calendar + pinned `build_id` + preview soak + rollback card. Add LaunchDarkly and DORA dashboards as volume grows.

## Related

* [Mobile Delivery Basics](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/mobile-delivery-basics/) - ten examples for store + OTA coordination
* [Feature Flags on Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/feature-flags-on-mobile/) - LaunchDarkly + EAS channels cookbook
* [Canary OTA & Blue-Green](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/canary-ota-and-blue-green/) - progressive exposure and auto-rollback
* [DORA Metrics for Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/dora-metrics-for-mobile/) - lead time and change-fail for app stores
* [Release Checklist & Go/No-Go](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/release-checklist-and-go-no-go/) - stakeholder sign-off gate
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR vs release pipelines
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - three-clock coordination
* [EAS Build Best Practices](https://docs.wahwei/reactnative.codeguides.io/eas-build/best-practices/) - reproducible store binaries
* [OTA Updates Best Practices](https://docs.wahwei/reactnative.codeguides.io/ota-updates/best-practices/) - OTA promotion and rollback summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
