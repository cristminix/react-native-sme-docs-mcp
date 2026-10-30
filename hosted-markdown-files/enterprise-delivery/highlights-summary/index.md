# Enterprise Delivery Highlights Summary

Every highlight bullet from the 6 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Enterprise Delivery Highlights Summary

* Two clocks: store binary (native) and OTA bundle (JS) - never confuse which path a change takes
* Remote flags decouple binary live from feature visible - essential for store + OTA trains
* Canary OTA limits blast radius with eas update --rollout-percentage before 100%
* Mobile lead time starts at merge - ends when users receive change (OTA) or store version (binary)
* Go/No-Go meeting happens after RC sign-off - not as a substitute for QA
* One shared release calendar - not separate iOS, Android, and JS spreadsheets

## [Mobile Delivery Basics](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/mobile-delivery-basics/)

* Two clocks: store binary (native) and OTA bundle (JS) - never confuse which path a change takes
* runtimeVersion links Clock A binaries to Clock B updates - mismatch strands users silently
* Feature flags decouple binary live from feature visible - essential for coordinated trains
* Backend API changes deploy before or with the mobile binary that depends on them
* Same build\_id from EAS through QA to eas submit - no rebuild between sign-off and store
* OTA-only weeks skip store submit but still need channel discipline and rollback cards

## [Feature Flags on Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/feature-flags-on-mobile/)

* Remote flags decouple binary live from feature visible - essential for store + OTA trains
* LaunchDarkly (or similar) provides kill switches, percentage rollouts, and cohort targeting
* EAS Update channels segment binaries - flags segment behavior within a bundle
* Cache flags locally so a dead config endpoint does not brick cold starts
* Default to safe (off) when flags are unknown - never assume a new screen is production-ready
* Pair flags with error boundaries - boundary reports; flag service decides exposure

## [Canary OTA & Blue-Green](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/canary-ota-and-blue-green/)

* Canary OTA limits blast radius with eas update --rollout-percentage before 100%
* Blue-green uses two branches on one channel - instant revert by republishing stable
* Automatic rollback triggers tie Sentry crash-free and payment metrics to runbook actions
* Feature flags provide intra-bundle kill switches while canary measures bundle health
* Only one active rollout per branch or channel - end before publishing conflicting updates
* Quarterly rollback drills on preview channel - production trust is earned, not assumed

## [DORA Metrics for Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/dora-metrics-for-mobile/)

* Mobile lead time starts at merge - ends when users receive change (OTA) or store version (binary)
* Split metrics by delivery path - OTA lead time is hours; store lead time is days
* Change-fail rate includes OTA rollbacks, store hotfixes, and staged rollout halts
* Deployment frequency counts OTA and store submits separately - blending hides bottlenecks
* MTTR for mobile: flag off (minutes) < OTA rollback (minutes) < store hotfix (days)
* Store review wait is lead-time noise - track review separately from engineering cycle time

## [Release Checklist & Go/No-Go](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/release-checklist-and-go-no-go/)

* Go/No-Go meeting happens after RC sign-off - not as a substitute for QA
* Pin build\_id in the checklist - submit uses the artifact QA tested
* Backend dependencies must be live or backward-compatible before store submit
* Rollback card filled: OTA update ID, flag names, previous store version
* Stakeholders sign RACI roles - EM accountable, QA responsible for device matrix
* No-Go reasons are documented - recurring blockers become pipeline investments

## [Enterprise Delivery Best Practices](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/best-practices/)

* One shared release calendar - not separate iOS, Android, and JS spreadsheets
* Two clocks: store binary and OTA bundle - every PR declares which path
* runtimeVersion links binaries to updates - mismatch strands users silently
* Feature flags decouple binary live from feature visible - essential for store review
* Pin build\_id from QA through eas submit - never promote a rebuilt binary
* Rollback cards, canary gates, and DORA metrics turn delivery into a measurable system

Reviewed by Chris St. John·Last updated Jul 18, 2026
