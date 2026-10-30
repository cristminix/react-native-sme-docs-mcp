# Case Studies Best Practices

A condensed summary of the **25 most important practices** for writing, reading, and applying mobile case studies in this documentation set. Mobile stacks age in quarters, not years - annotate **Expo SDK 57** explicitly or the lesson expires.

Highlights / Case Studies Best Practices

* Pin Expo SDK, React, and RN versions in every case study narrative
* Architecture diagrams in prose - boxes and arrows, not screenshot dumps
* Document decisions rejected, not only choices made
* Separate reference architectures from before/after migration stories
* Benchmarks need protocol: device, build type, cache state
* Cross-link cookbook pages - case studies are maps, not duplicates

## How to Use This List

* **Authors:** Apply items 1–12 when drafting a new case study; 13–20 when publishing; 21–25 when revisiting quarterly.
* **Readers:** Treat composite references as pattern libraries - verify constraints match your compliance, device matrix, and release model before copying.
* **Tech leads:** Link ADRs to case study decisions - "we chose X for the same reason as Reference: Fintech" beats tribal knowledge.

---

1. **Pin the stack in the opening paragraph:** State **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4) - not "latest Expo."
2. **Declare composite vs shipped product:** These references blend real patterns; honesty prevents "Acme Bank shipped this" confusion.
3. **Use architecture diagrams in prose:** ASCII boxes and arrows survive doc theme changes; screenshots rot.
4. **Follow the case study spine:** Context → Architecture → Recipe → Decisions → Outcomes → Lessons → Related - matches cookbook depth without hiding narrative.
5. **Record rejected alternatives:** "We considered CRDT" teaches more than listing SQLite alone - see [Reference: Offline-First Field App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-offline-first-field-app/).
6. **Separate reference from before/after:** Reference architectures show steady-state; migration stories show timeline and regressions - do not merge genres in one file.
7. **Quantify outcomes with caveats:** Pilot fleet size, date range, and attribution limits belong beside every metric table.
8. **Document honest upgrade paths:** SDK 54→57 means 55 and 56 checkpoints - [Before/After: Expo SDK Major Upgrade](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-expo-sdk-major-upgrade/).
9. **Strangler migrations need invariants:** One root back stack, frozen marketing URLs, no dual `NavigationContainer` - [Before/After: React Navigation → Expo Router](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-react-navigation-expo-router/).
10. **Benchmarks require a protocol:** Release vs dev, device model, cache warm/cold, duration - [Performance Case Study: Feed at Scale](https://docs.wahwei/reactnative.codeguides.io/case-studies/performance-case-study-feed-at-scale/).
11. **OTA vs store decisions are architecture:** B2C SaaS OTA-heavy and fintech store-only are both valid - document compliance trigger - compare [Reference: B2C Expo SaaS App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-b2c-expo-saas-app/) and [Reference: Fintech Mobile Client](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-fintech-mobile-client/).
12. **Offline-first case studies need a UX contract:** Live, stale, syncing, unavailable - four states, not a single offline banner - [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/).
13. **Cross-link cookbook pages:** Case studies point to recipes; they do not duplicate [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) or [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) in full.
14. **Link ADRs for contested decisions:** Navigation, pinning, OTA policy - [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/).
15. **End every page with the stack versions footer:** Last line, blockquote format - enables grep-based staleness audits across the site.
16. **Tag highlights in frontmatter:** Search and index cards surface decisions without opening the full article.
17. **Name devices in field and perf stories:** "Mid-tier Android" is vague; Pixel 6a API 34 and Zebra TC57 are actionable.
18. **Include incident classes avoided:** "No runtimeVersion mismatch strandings" is as valuable as latency milliseconds.
19. **Pin SDK in audit and support payloads:** Field IT and fraud ops correlate behavior months later - [Reference: Fintech Mobile Client](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-fintech-mobile-client/).
20. **Revisit case studies after SDK bumps:** expo-image, Reanimated, and Router APIs change - add a changelog note at top when refreshed.
21. **Do not treat case studies as mandates:** Brownfield React Navigation on SDK 57 remains valid per [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/).
22. **Pair case studies with checklists:** [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) and [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) operationalize reference architectures.
23. **Lessons section: six items max focus:** Long lesson lists dilute; prioritize what surprised the team.
24. **Recipe blocks stay copy-pasteable:** Even narrative case studies need one quick-reference card - cookbook spine requirement.
25. **Mobile ages fast - date the narrative:** "Twelve weeks on SDK 57" and "Q3 feature freeze" anchor reader judgment better than timeless claims.

## FAQs

Are these case studies real shipped apps?

No. They are **composite references** built from recurring production patterns across Expo SDK 57 teams. Names, metrics, and timelines are illustrative but technically consistent with the pinned stack.

Which case study should a greenfield SDK 57 team read first?

Start with [Reference: B2C Expo SaaS App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-b2c-expo-saas-app/) for Router + Query + EAS shape. Add [Reference: Offline-First Field App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-offline-first-field-app/) if connectivity is unreliable. Add [Reference: Fintech Mobile Client](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-fintech-mobile-client/) if compliance mandates pinning and audit trails.

Should we copy the benchmark numbers into our perf budget?

Use the **protocol**, not the absolute FPS values. Your row shapes, image CDN, and device matrix will differ. Adopt thresholds from [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/).

How do case studies relate to brownfield docs?

Brownfield ADRs rank options; case studies narrate outcomes. Read [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) alongside [Before/After: React Navigation → Expo Router](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-react-navigation-expo-router/).

## Related

* [Reference: B2C Expo SaaS App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-b2c-expo-saas-app/) - Router, Query, EAS, OTA
* [Reference: Offline-First Field App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-offline-first-field-app/) - SQLite sync and rugged devices
* [Reference: Fintech Mobile Client](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-fintech-mobile-client/) - auth, pinning, audit
* [Before/After: Expo SDK Major Upgrade](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-expo-sdk-major-upgrade/) - SDK 54→57 path
* [Before/After: React Navigation → Expo Router](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-react-navigation-expo-router/) - strangler migration
* [Performance Case Study: Feed at Scale](https://docs.wahwei/reactnative.codeguides.io/case-studies/performance-case-study-feed-at-scale/) - FlashList benchmarks
* [Architecture Design Best Practices](https://docs.wahwei/reactnative.codeguides.io/architecture-design/best-practices/) - modular monolith patterns
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - checklist index

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
