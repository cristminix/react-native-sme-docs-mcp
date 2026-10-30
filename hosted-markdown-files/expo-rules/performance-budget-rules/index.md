# Performance Budget Rules

Bundle size, time-to-interactive (TTI), and frame-rate thresholds with named owners for Expo SDK 57 apps on React Native 0.86. Performance budgets turn subjective "feels slow" into merge and release gates. Assign owners - anonymous budgets are ignored.

Highlights / Performance Budget Rules

* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Set JS bundle budget with owner: mobile platform team gates production OTA
* TTI from cold start to interactive primary tab - track per release on reference device
* 60 fps for scroll and gestures; 55 fps sustained minimum on lists during audit
* Hermes bundle analyzer in CI - fail PRs that exceed budget without ADR exception
* Performance regressions are rollback triggers - link to Release & OTA Rules

## How to Use This Checklist

* Set **Tier 1** budgets during project kickoff - retrofitting limits after 200 screens is politically harder than technically.
* **Tier 2** runs in CI on every PR touching dependencies, lists, or startup path.
* **Tier 3** is manual device audit before store submission and major OTA promotions.
* When a budget is exceeded, require an ADR exception or a fix - waivers expire next release.
* Default measurement device: mid-tier Android (e.g., Pixel 6a class) plus one older iPhone SE - not the lead's Pro Max.

### Budget Owners (fill in your org)

| Metric | Threshold (starter) | Owner role |
| --- | --- | --- |
| Main JS bundle (Hermes) | ≤ 4 MB gzipped | Mobile platform lead |
| Total download (OTA update) | ≤ 8 MB | Release engineer |
| Cold start TTI (primary tab) | ≤ 2.5 s on reference Android | Feature squad lead |
| Scroll FPS (primary list) | ≥ 55 fps sustained | UI performance champ |
| Memory after 10 min session | ≤ 350 MB on reference Android | Mobile on-call |

Adjust numbers per app category - document your thresholds in `docs/performance-budgets.md` and link from README.

---

## Tier 1: Define & Document Budgets (1–6)

1. **Publish written budgets before feature freeze:** Bundle MB, TTI seconds, FPS floors, and memory ceilings - starter table above is a template, not a universal law.

   * **Owner:** Each metric has a named person, not "the team."
   * **Review:** Quarterly or when MAU doubles.
2. **Pick reference devices and OS versions:** One mid-tier Android and one older iOS device - all audits use the same hardware pool.

   * **CI cannot replace:** Device lab or engineer rotation for pre-release audit.
   * **Reject:** "Works on my iPhone 16 Pro" as sign-off.
3. **Define TTI measurement:** Cold start → first interactive frame on primary revenue tab (e.g., home feed submit button enabled).

   * **Instrument:** `performance.mark` in root layout and screen `onLayout`, or React Native Performance API.
   * **Exclude:** Dev client and Fast Refresh timings from production budgets.
4. **Define bundle scope:** Main Hermes bundle + lazy chunks loaded before TTI - document which async splits count toward first-open budget.

   * **Tool:** `npx react-native bundle` with `--verbose` or Expo export analysis.
   * **OTA:** Production update size limit separate from install size.
5. **Link regressions to rollback policy:** Bundle or TTI regression beyond X% triggers [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) rollback consideration.

   * **X:** Often 10% relative or fixed absolute overrun.
   * **Communicate:** On-call knows performance triggers alongside crash triggers.
6. **ADR for permanent budget exceptions:** Heavy offline maps or video apps may need higher ceilings - document user value and mitigation (lazy load, on-demand download).

   * **Expiry:** Exception reviewed every two releases.
   * **See:** [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/).

---

## Tier 2: CI & PR Gates (7–12)

7. **Hermes bundle size check in CI:** Script compares exported bundle to threshold - fail PR when over budget without `perf-budget` label approval.

   * **Owner:** Mobile platform maintains script in `scripts/check-bundle-size.sh`.
   * **Baseline:** Update baseline only with ADR, not silent PR bumps.
8. **Dependency size review on native and JS adds:** `npx expo install` new package → check import cost and native binary size impact.

   * **Reject:** Duplicate date libraries, moment.js, full lodash.
   * **Prefer:** `date-fns` per-function imports, lodash-es subsets.
9. **No new synchronous require on startup path:** Defer heavy modules with `import()` in non-critical tabs - grep `require(` in `app/_layout.tsx` and root providers.

   * **Smell:** Importing entire charting library in root layout.
   * **Fix:** Lazy screen-level import with skeleton.
10. **Image and font budgets:** WebP/AVIF where supported; subset fonts via `expo-font` - max two font families on critical path.

    * **Owner:** Design system lead approves new weights.
    * **Reject:** 800 KB background PNG when compressed WebP exists.
11. **List performance lint in review:** `FlatList` / `FlashList` requires `keyExtractor`, stable `renderItem` component, and memoized rows - no hooks inside `renderItem`.

    * **See:** React Hooks lint rules for `renderItem` hook violations.
    * **Measure:** Flashlight or RN perf monitor on longest list screen.
12. **Reanimated and gesture worklets stay off JS thread:** Animations dropping frames trigger investigation before merge - profile with `react-native-performance`.

    * **Budget:** Interaction animations ≤ 300 ms to settled state.
    * **Reject:** `LayoutAnimation` on lists with 500+ rows.

---

## Tier 3: Runtime Measurement & Audit (13–18)

13. **Cold start TTI on reference Android every RC:** Record median of 5 cold starts - compare to last RC and budget.

    * **Owner:** Release engineer logs in release ticket.
    * **Block:** RC promotion if TTI regresses > 15% without waiver.
14. **Scroll FPS on primary list screen:** Flip test through 50 items - sustained fps floor (55+) on reference device.

    * **Tool:** Performance monitor overlay or Systrace sample.
    * **Fix:** `FlashList`, smaller row components, image size fixes.
15. **Memory snapshot after 10-minute scripted session:** Navigate tabs, open detail, return - heap stable without climb indicating leaks.

    * **Owner:** Mobile on-call reviews leak suspects.
    * **Native:** Release `SharedObject` handles from Expo modules on unmount.
16. **OTA update download size before production publish:** `eas update` artifact size - warn when over OTA budget.

    * **Compress:** Assets via `expo-asset` pipeline; dedupe images.
    * **Rollback:** Large OTA correlates with slow updates and user churn.
17. **Network waterfall on primary screen:** Parallelize independent requests; avoid serial `await` chains blocking paint.

    * **Pattern:** TanStack Query parallel queries on screen mount.
    * **Budget:** First contentful API response < 800 ms p95 on staging.
18. **Battery and thermal spot check:** 15-minute navigation session - device should not throttle severely on reference Android.

    * **Smell:** Location polling every second in background.
    * **Fix:** Coalesce watchers; use significant-change location when possible.

---

## Tier 4: Accountability & Process (19–24)

19. **Performance PR label:** Changes touching lists, images, startup, or deps > 50 KB require `perf-review` from budget owner.

    * **Bot:** GitHub label rules from CODEOWNERS paths.
    * **Education:** Reviewers link to failing metric, not vague "optimize this."
20. **Weekly dashboard:** TTI, crash-free, fps sampling (if RUM available), bundle size trend - visible to product and engineering.

    * **Owner:** Mobile platform posts snapshot in #mobile.
    * **Alert:** Week-over-week regression auto-post.
21. **New Architecture verification on upgrade:** RN 0.86 New Architecture may shift perf characteristics - re-baseline after SDK bumps.

    * **Compare:** Same reference devices before/after upgrade.
    * **Document:** Findings in SDK upgrade ADR.
22. **Feature flags for perf experiments:** Roll out infinite scroll or new image pipeline to 5% before full OTA - watch RUM metrics.

    * **Kill:** Auto-disable flag when fps or crash triggers fire.
    * **Pair:** [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/).
23. **No perf debt tickets without metric:** "Make app faster" is not a ticket - "Reduce home TTI from 3.1s to 2.5s on Pixel 6a" is.

    * **Done:** Measured improvement attached to PR.
    * **Reject:** Premature memoization without profiling.
24. **Store submission perf appendix:** Release ticket includes TTI, bundle size, FPS audit results, and waiver ADR links - QA sign-off references numbers.

    * **Apple:** Watch for main thread violations in Instruments before iOS submit.
    * **Google:** Android vitals monitored post-launch.

## Applying the Checklist in Order

* **Tier 1 (1–6):** Define budgets and owners - without numbers, nothing is enforceable.
* **Tier 2 (7–12):** Automate in CI - catch regressions at PR time.
* **Tier 3 (13–18):** Device audit - simulators and Pro iPhones lie.
* **Tier 4 (19–24):** Process - keeps budgets alive past the first sprint.

## FAQs

What is a reasonable JS bundle budget for Expo SDK 57?

Many consumer apps target 3–5 MB gzipped Hermes main bundle at TTI. Heavy apps (maps, video) need higher ceilings with ADR justification. Measure your baseline before copying a number.

Why measure on mid-tier Android?

Low-end Android exposes jank, memory pressure, and slow storage that flagship iPhones hide. If it passes on mid-tier Android, iOS is usually fine; the reverse is false.

How do I measure TTI in React Native?

Mark app launch in root `_layout.tsx`, mark interactive when primary screen finishes layout and data gate opens. Use Performance API or custom analytics events - exclude dev client builds.

Does OTA affect bundle budget?

Yes - each update has a download size budget. Large OTA bundles slow updates and increase failure rates. Check artifact size before production `eas update`.

FlashList or FlatList?

Default to FlashList for long heterogeneous lists on SDK 57. FlatList is fine for short static lists. Budget owner reviews list changes on primary feeds.

Can CI measure FPS?

Rarely reliably - FPS audit stays manual or RUM-based. CI excels at bundle size and dependency checks; device lab covers frames.

What triggers a performance rollback?

Team-defined - often TTI regression > 15%, crash increase, or bundle overrun linked to startup crashes. Document triggers in Release & OTA Rules table.

Do images in expo-asset count toward bundle?

Yes if bundled at build time. Prefer appropriately sized assets, modern formats, and remote CDN for rarely used media.

How does New Architecture affect budgets?

Fabric can improve list scroll perf but may shift memory - re-baseline after enabling on RN 0.86. Do not assume identical numbers to Old Architecture.

Who approves budget waiver?

The named owner for that metric plus mobile lead. Waiver ADR includes expiry release version and mitigation plan.

Should we profile in production?

Yes with sampling RUM (Sentry performance, custom analytics) - respect privacy, no PII in perf events. Staging mirrors prod architecture for deep dives.

What about Expo Go benchmarks?

Expo Go includes extra overhead - never use for budget sign-off. Use preview or production-profile EAS builds on reference devices.

How do monorepos attribute bundle size?

Measure per app export from `apps/mobile`. Shared packages count toward each app that imports them - enforce package boundaries to avoid accidental bloat imports.

## Related

* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - performance regression rollback triggers
* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - Metro, monorepo, and dependency hygiene
* [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - lazy routes and startup path
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - native binary size and startup cost
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - budget exception ADRs
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
