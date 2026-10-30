# Production Troubleshooting Best Practices

A condensed summary of the **25 most important best practices** drawn from every page in this section. Runbooks stored **next to the code**, not in Slack search.

Highlights / Production Troubleshooting Best Practices

* Runbooks live in the repo - Slack threads are not durable incident docs
* Single incident commander; containment before root cause in minute zero
* Correlate native release, OTA update id, and backend deploy on every spike
* Record last known-good OTA group id before every production publish
* Practice OTA rollback quarterly on preview - muscle memory beats heroics
* Blameless post-mortems with owned action items - not meeting theater

1. **Single Incident Commander:** One named IC decides severity, containment, and rollback - parallel Slack threads without IC waste the first 15 minutes.
2. **Containment before RCA:** Pause store rollout, flip kill switches, and start OTA rollback at T+0 - root cause analysis runs in parallel, not first.
3. **Severity by user impact:** SEV1/SEV2 tie to revenue path and % users affected - not alert volume or executive anxiety.
4. **Tag every signal with release identity:** Native `version+build`, OTA `updateId`, `channel`, and `runtimeVersion` - see [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/).
5. **Separate comms channels:** Engineering incident channel vs curated comms channel - support macros must match status page wording.
6. **First-15-minutes checklist:** IC, scope confirmation, containment levers, dashboard links, scribe assigned - [Mobile Incident Basics](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/mobile-incident-basics/).
7. **Cluster before reading stacks:** Sort Sentry by fingerprint and `dist` - top 3 clusters usually explain >90% of spike.
8. **Bisect OTA vs native:** Crashes on one `dist` → OTA; all `dist` on one `release` → native binary; all releases → backend.
9. **Symbolicated stacks are mandatory:** Unsymbolicated Hermes frames block triage - source maps on every EAS production build.
10. **Record last known-good OTA group id:** Every production publish ticket stores rollback anchor - [OTA Updates Best Practices](https://docs.wahwei/reactnative.codeguides.io/ota-updates/best-practices/).
11. **OTA rollback target under 15 minutes:** Decision to verified channel head - practice quarterly on preview channel.
12. **Verify rollback three ways:** `eas channel:view`, device `Updates.updateId`, Sentry `dist` migration over 60 minutes.
13. **OTA cannot fix native crashes:** SIGABRT and missing native modules need `eas build` - do not burn rollback window on JS lever.
14. **Feature flags before bundle rollback:** Isolated logic errors - kill switch first; bundle-wide defects - channel revert.
15. **Pause phased/staged rollout early:** Store rollout containment is minutes - [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/).
16. **Build war room discipline:** Read EAS log **phase** first - credentials, prebuild, compile, sign - one hypothesis per rebuild.
17. **Credentials calendar reminders:** Apple distribution cert and Play upload key expiry cause release-week SEV2 - named owner required.
18. **Store delisting is SEV1:** Legal and exec in first hour - engineering owns technical timeline, not external policy email.
19. **Exec comms use ranges:** Binary submit ETA is engineering-owned; store review duration is a range - never promise review by 5pm.
20. **Scribe captures UTC timeline:** Decisions with timestamps beat post-incident memory - same-day capture before team disperses.
21. **Post-mortem within 5 business days:** SEV1/SEV2 require multi-layer RCA - JS, native, OTA, backend, store - [Post-Mortem Template](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/post-mortem-template-for-mobile/).
22. **Action items with verification:** Owner, due date, and metric proving fix - max 5–7 items or ownership dilutes.
23. **Update runbooks in repo after incidents:** Append to troubleshooting pages and `docs/incidents/` - not a Google Doc graveyard.
24. **Define rollback triggers before launch:** Crash-free -2% abs, payment -1% abs - align with [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/).
25. **Runbooks next to code in version control:** `site/reactnative/troubleshooting/` and `docs/ota-rollback-card.md` travel with branches - Slack pins rot.

## FAQs

Where do I start for my first production incident?

[Mobile Incident Basics](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/mobile-incident-basics/) for IC and first 15 minutes. If crash spike: [Crash Spike Triage](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/crash-spike-triage/). If bad OTA confirmed: [OTA Emergency Rollback](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/ota-emergency-rollback/).

How is this section different from OTA Updates rollback runbook?

[Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) documents OTA mechanics and triggers. Troubleshooting pages add incident command, bisect under pressure, store/build war rooms, and post-mortems - the human layer around the commands.

Should preview channel get the same runbooks?

Yes - run OTA rollback drills and crash triage exercises on preview before production trust. Preview failures are SEV3; production failures are SEV2+.

What observability is required before these runbooks work?

Sentry with `release` + `dist`, session tracking, source maps, and session-start logging of `updateId` - minimum viable triage per [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/).

When do I involve store operations vs mobile on-call?

Mobile on-call owns crash/OTA containment. Store ops joins for phased pause, submit blockers, delisting, and policy deadlines - [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/).

## Related

* [Mobile Incident Basics](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/mobile-incident-basics/) - severity, comms, first 15 minutes
* [Crash Spike Triage](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/crash-spike-triage/) - Sentry clustering and bisect
* [OTA Emergency Rollback](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/ota-emergency-rollback/) - channel revert under pressure
* [Native Build Failure War Room](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/native-build-failure-war-room/) - EAS, credentials, Xcode/Gradle
* [Store Outage & Policy Incident](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/store-outage-and-policy-incident/) - delisting and exec comms
* [Post-Mortem Template for Mobile](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/post-mortem-template-for-mobile/) - multi-layer RCA
* [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/) - signal tagging and SLOs
* [OTA Updates Best Practices](https://docs.wahwei/reactnative.codeguides.io/ota-updates/best-practices/) - publish and rollback hygiene
* [Store Operations Best Practices](https://docs.wahwei/reactnative.codeguides.io/store-operations/best-practices/) - release and compliance summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
