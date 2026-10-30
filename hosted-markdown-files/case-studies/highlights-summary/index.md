# Case Studies Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Case Studies Highlights Summary

* Expo Router route groups split auth and app trees - one root gate in \_layout.tsx
* SQLite is source of truth on device - TanStack Query mirrors server snapshots where online
* OAuth PKCE via expo-auth-session - no client secrets in the mobile bundle
* Upgrade one SDK at a time - 54→55→56→57, never a single leap PR
* Strangler fig: new routes in app/; legacy screens wrapped, not rewritten day one
* FlatList → FlashList cut frame drops 38% on mid-tier Android at 500+ rows

## [Reference: B2C Expo SaaS App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-b2c-expo-saas-app/)

* Expo Router route groups split auth and app trees - one root gate in \_layout.tsx
* TanStack Query owns server snapshots; MMKV holds session prefs; SQLite is deferred until relational offline needs appear
* EAS profiles map development, preview, and production to channels and environments
* runtimeVersion policy appVersion ties OTA bundles to store binaries without drift
* OTA ships JS fixes weekly; native bumps ride monthly store trains
* Deep links, push payloads, and marketing URLs share the same file-based route manifest

## [Reference: Offline-First Field App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-offline-first-field-app/)

* SQLite is source of truth on device - TanStack Query mirrors server snapshots where online
* Outbox table replays mutations with Idempotency-Key on reconnect
* Background tasks flush outbox - foreground NetInfo reconnect remains primary
* Rugged Android (Zebra, Honeywell) tested on physical hardware, not simulators
* Four-state UX contract: live, stale, syncing, unavailable
* Server-authoritative reconciliation for inspection sign-off timestamps

## [Reference: Fintech Mobile Client](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-fintech-mobile-client/)

* OAuth PKCE via expo-auth-session - no client secrets in the mobile bundle
* Refresh tokens in SecureStore; access tokens in memory with proactive refresh
* Biometric step-up before transfers - not a substitute for secure storage
* Certificate pinning adopted with SPKI backup pins and rotation ADR
* Immutable client audit trail - who, what, when, device attestation level
* OTA cannot change pins or native payment SDK - store train for native bumps

## [Before/After: Expo SDK Major Upgrade](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-expo-sdk-major-upgrade/)

* Upgrade one SDK at a time - 54→55→56→57, never a single leap PR
* CNG teams delete ios/ and android/ after each bump - EAS regenerates via prebuild
* Rebuild dev clients after every native-affecting step - Metro cache lies
* expo-doctor gates merge; device matrix catches what doctor misses
* Reanimated, expo-image, and New Architecture flags need explicit changelog reads
* Honest timeline: three sprint increments, not a one-weekend bump to 57

## [Before/After: React Navigation → Expo Router](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-react-navigation-expo-router/)

* Strangler fig: new routes in app/; legacy screens wrapped, not rewritten day one
* Single root back stack - native-owned or Router-owned, never both
* Deep link manifest migrated path-by-path - marketing URLs stable throughout
* SDK 57 greenfield defaults to Router; brownfield migration is optional and incremental
* Analytics and auth gates consolidated in root \_layout.tsx over three sprints
* Big-bang rewrite rejected after dual-stack production incident in staging

## [Performance Case Study: Feed at Scale](https://docs.wahwei/reactnative.codeguides.io/case-studies/performance-case-study-feed-at-scale/)

* FlatList → FlashList cut frame drops 38% on mid-tier Android at 500+ rows
* expo-image recyclingKey eliminated wrong-thumbnail flash during scroll
* estimatedItemSize calibration from on-layout sampling - not guesses
* drawDistance tuned per device tier - not one global constant
* Benchmark protocol: release build, airplane-mode warm cache, 60s fast fling
* SDK 57 expo-image disk cache survives cold start - RN Image did not

## [Case Studies Best Practices](https://docs.wahwei/reactnative.codeguides.io/case-studies/best-practices/)

* Pin Expo SDK, React, and RN versions in every case study narrative
* Architecture diagrams in prose - boxes and arrows, not screenshot dumps
* Document decisions rejected, not only choices made
* Separate reference architectures from before/after migration stories
* Benchmarks need protocol: device, build type, cache state
* Cross-link cookbook pages - case studies are maps, not duplicates

Reviewed by Chris St. John·Last updated Jul 18, 2026
