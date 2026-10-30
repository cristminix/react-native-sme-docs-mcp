# Store Operations Best Practices

A condensed summary of the **25 most important store operations habits** drawn from every page in this section - for teams shipping Expo SDK 57 apps through App Store Connect and Google Play Console.

Highlights / Store Operations Best Practices

* Version build numbers in git before every EAS production build
* TestFlight and Play internal are mandatory gates - not optional niceties
* Privacy inventory drives iOS labels and Play Data safety - one spreadsheet
* Phased and staged rollout are default; 100% day-one is the exception
* Review notes and demo accounts expire - rotate every release
* Incident runbooks name who can pause rollout before the outage happens

1. **Treat store ops as a pipeline:** Build → internal test → submit → phased release → monitor - not a Friday afternoon task after feature freeze.
2. **Increment `buildNumber` and `versionCode` every upload:** Stores reject duplicates; hotfixes on the same marketing `version` still need new integers.
3. **Tag git commits that produced store binaries:** Incidents trace to source; `eas build:list` alone is not enough for audits.
4. **Run `npx expo-doctor` on release branches:** SDK drift causes upload failures and native crashes reviewers see before you do.
5. **Smoke-test Release builds on physical devices:** Simulators hide push, biometrics, IAP, ATT, and performance - Guideline 2.1 lives on real hardware.
6. **Use TestFlight internal before App Review:** Same IPA as production; catches signing, entitlements, and privacy manifest issues cheaply.
7. **Use Play internal track before production:** Minutes-to-hours feedback; validates Data safety and `versionCode` monotonicity.
8. **Automate upload with EAS Submit:** Humans choose release timing; machines avoid Transporter typos and wrong IPA selection.
9. **Keep metadata in git:** `store/metadata.ts` and locale folders - Connect and Play copy paste from one source of truth.
10. **Automate screenshot pipelines per locale:** Fastlane Snapshot, Detox, or Maestro - stale screenshots trigger 2.3.3 rejections.
11. **Maintain review notes with working demo credentials:** Rotate passwords every release; expired accounts cause false rejections.
12. **Align App Privacy, Nutrition Labels, and Play Data safety:** One privacy inventory spreadsheet drives all three - see [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/).
13. **Request ATT only when you truly track across other companies' apps:** False tracking declarations are Guideline 5.1.2 strikes; non-personalized ads when denied.
14. **Match permission strings and manifest entries to runtime behavior:** iOS `infoPlist` descriptions and Android `blockedPermissions` - see [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/).
15. **Rebuild native for privacy manifest and ATT changes:** OTA cannot fix ITMS-91053 or missing `NSUserTrackingUsageDescription`.
16. **Default iOS phased release and Android staged rollout to ON:** Start Play at 5–10%; plan marketing around 7-day iOS curve.
17. **Monitor crash rate by build number during partial rollout:** Sentry and Play vitals sliced on `versionCode` - aggregate app stats hide regressions.
18. **Document who can pause phased release and halt Play rollout:** Vacation gaps delay containment - name primary and backup in runbook.
19. **Know rollback limits:** Stores are forward-only; you ship fixes, not downgrades - [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/).
20. **Classify rejections by Guideline or policy topic:** Emotional replies waste cycles - use [Store Rejection Playbook](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-rejection-playbook/) templates.
21. **Attach evidence to Resolution Center replies:** Screen recordings, test accounts, and manifest excerpts beat "we cannot reproduce."
22. **Escalate after two evidence-based round-trips:** Not after first denial - Apple App Review Board and Play appeals need facts.
23. **Reserve expedited review for measurable user harm:** Revenue promises alone burn credibility - [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/).
24. **Run incident command for delisting and SEV1 crashes:** IC, scribe, comms, legal - not parallel Slack threads - [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/).
25. **Postmortem every SEV1/SEV2 store incident:** Update playbook, privacy inventory, and release checklist within five business days.

## FAQs

What is the minimum viable store ops for a solo dev?

* Production EAS profiles, version bump discipline, TestFlight + internal track, phased/staged rollout, privacy forms honest, review notes with demo login.

iOS first or Android first?

* Either works - ship the ready platform; keep API backward compatible if staggered by a week.

How often refresh screenshots?

* Every major UI release and localization add - automate generation in CI where possible.

Where does EAS Update fit?

* JS-only fixes on compatible runtime versions - never substitute for native compliance or crash-on-launch fixes.

## Related

* [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/) - 10 introductory examples
* [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - iOS checklist
* [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/) - Play checklist
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - iOS policy cookbook
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - Android policy cookbook
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - upload automation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 10, 2026
