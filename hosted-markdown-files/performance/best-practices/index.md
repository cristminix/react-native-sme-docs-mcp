# Performance Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Performance Best Practices

* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Define TTI, FPS, bundle, and memory budgets with named owners before feature freeze
* Virtualize feeds - ScrollView for short static content only
* Profile navigation transitions in React DevTools before sprinkling memo
* Hermes sampling and Flashlight scores validate release builds, not Expo Go
* Performance regressions are rollback triggers - link to Performance Budget Rules

1. **Measure on mid-tier Android first:** Pixel 6a class exposes jank, memory pressure, and slow storage that iPhone Pro hides - if it passes reference Android, iOS is usually fine; the reverse is false.
2. **Define TTI before optimizing:** Cold start → primary tab interactive (not splash hide alone) - document the gate in `docs/performance-budgets.md` with a reference device.
3. **Publish budgets with named owners:** Bundle MB, TTI seconds, FPS floors, and memory ceilings - anonymous budgets are ignored in crunch week; see [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/).
4. **Profile release-like builds:** Expo Go and dev client timings are not production - use EAS `preview` or release variants for TTI, bundle, and Flashlight scores.
5. **Separate JS FPS from UI FPS:** JS at 0 means taps queue even when UI FPS looks fine - scroll jank on feeds often involves both threads.
6. **Instrument TTI with marks:** `performance.now()` at root layout and primary screen interactive - ship analytics events in production, not only `console.info`.
7. **Keep root `_layout` imports minimal:** Heavy SDKs, charts, and editors belong in lazy routes - every root import is on the cold-start critical path.
8. **Hold splash until first meaningful frame:** Avoid splash hide → full-screen spinner → content; load one body font for TTI, defer the rest.
9. **Defer post-TTI work with InteractionManager:** Analytics, migrations, remote config, and secondary prefetch run after animations - cancel tasks on unmount.
10. **Analyze bundle size in CI:** `react-native-bundle-visualizer` on `--dev false` bundles - fail PRs over budget without ADR exception.
11. **Lazy-load heavy Expo Router screens:** `React.lazy` + `Suspense` for reports, maps, and editors - confirm treemap blocks leave the main bundle.
12. **Use narrow package imports:** Per-icon and per-function paths - full `lodash` and barrel re-exports dominate treemaps.
13. **Record React DevTools Profiler on navigation:** Tab switch, stack push/pop, modal open - fix unstable context and `screenOptions` before memoizing leaves.
14. **Stabilize list parents before row memo:** `useCallback` `renderItem`, module-scope `keyExtractor`, and `extraData` for selection - see [Lists Best Practices](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/best-practices/).
15. **Default to FlatList for growing feeds:** ScrollView mounts every child - switch at ~20 rows or any pagination; evaluate FlashList when profiling proves mount cost.
16. **Run Hermes sampling on hot scenarios:** Fast fling, tab switch, cold start - export `.cpuprofile` to speedscope when JS CPU spikes without obvious React commits.
17. **Flashlight score the primary scroll scenario:** BAM aggregated score on reference Android - compare iterations across releases, not one demo on a flagship.
18. **Build a two-device matrix:** Mid-tier gate + budget floor device - flagship scores are informational only.
19. **Cap list memory and paginate with eviction:** Unbounded `data` arrays are the #1 session RAM leak - ring buffer or max items with persisted cursor.
20. **Clean up listeners in every `useEffect`:** AppState, NetInfo, navigation `addListener`, intervals - missing cleanup doubles work and retains closures.
21. **Clear caches on logout:** TanStack Query `clear()`, MMKV user scope, global image maps - stale cache is a memory and security defect.
22. **Soak-test memory for 10 minutes:** Realistic scroll, stack navigation, background/foreground - leaks appear late, not in 30-second smoke tests.
23. **Tune `windowSize` only after hygiene:** Lower reduces memory; too low causes blank rows - profile with Flashlight before changing defaults.
24. **Link regressions to rollback policy:** TTI > 15%, score drop > 10 points, or bundle overrun triggers release review - document in Performance Budget Rules.
25. **Fix measurement before micro-optimizations:** Repro script → DevTools commits → Hermes hotspots → bundle treemap - not random `useMemo` on presentational chips.

## FAQs

What is the default greenfield performance stack?

Written budgets + reference Android device + release `preview` builds + React DevTools Profiler for navigation + Hermes sampling for JS hotspots + Flashlight for scroll scores + Metro visualizer in CI.

Where do I start on a slow feed?

[Lists Best Practices](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/best-practices/) first - keys, memo, `renderItem`. Then [React DevTools Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/react-devtools-profiler/). Then [Hermes Sampling Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/hermes-sampling-profiler/) if JS CPU remains high.

Expo Go good enough for perf review?

No - native shell, module graph, and dev overhead differ. Ship perf sign-off on **EAS preview/production** artifacts only.

How does this section relate to Expo Rules?

[Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) owns **thresholds, CI gates, and owners**. This section owns **measurement tools and fix patterns**.

FlatList or FlashList for SDK 57?

FlatList for short and medium feeds with correct hygiene. FlashList when profiling shows recycling/mount cost dominates - benchmark with [Flashlight](https://docs.wahwei/reactnative.codeguides.io/performance/flashlight-benchmarking/) before migrating.

## Related

* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - TTI, FPS, and memory tiers
* [React DevTools Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/react-devtools-profiler/) - navigation re-render cookbook
* [Hermes Sampling Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/hermes-sampling-profiler/) - release CPU hotspots
* [Flashlight Benchmarking](https://docs.wahwei/reactnative.codeguides.io/performance/flashlight-benchmarking/) - BAM scores across devices
* [Bundle Size Analysis](https://docs.wahwei/reactnative.codeguides.io/performance/bundle-size-analysis/) - Metro visualizer and lazy routes
* [Memory Leaks & List Churn](https://docs.wahwei/reactnative.codeguides.io/performance/memory-leaks-and-list-churn/) - listeners and unbounded lists
* [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) - splash, deferral, bytecode
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - CI gates and owners
* [Lists Best Practices](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/best-practices/) - feed virtualization checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiOTA2fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
