# Performance Profiling Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Performance Profiling Highlights Summary

* TTI is cold start until the primary screen is interactive - not splash dismissal alone
* Record a navigation transition - not idle home - to catch provider and tab re-renders
* Sampling profiler runs on device - no Chrome DevTools JS sampling in release
* Flashlight is BAM's Lighthouse-style audit - aggregated perf score for Android apps
* npx react-native-bundle-visualizer treemap shows which packages dominate Hermes bundle
* Leaks are retained references - listeners, timers, and closures holding screens

## [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/)

* TTI is cold start until the primary screen is interactive - not splash dismissal alone
* 60 fps is the target; sustained 55 fps on lists is the audit floor on mid-tier Android
* JS FPS and UI FPS are separate - JS at 0 means taps queue until the thread clears
* Memory budgets are session ceilings - measure after 10 minutes on a reference device
* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Publish written budgets with owners before feature freeze - see Performance Budget Rules

## [React DevTools Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/react-devtools-profiler/)

* Record a navigation transition - not idle home - to catch provider and tab re-renders
* Ranked chart shows which components committed; flame chart shows why parents dragged children
* Why did this render? highlights changed props, state, and context in React 19
* Fix unstable context values and inline props before sprinkling memo on leaf rows
* Pair Profiler with list hygiene - navigation often re-renders every visible FlatList row
* Profile release-like builds on device - Fast Refresh hides real commit costs

## [Hermes Sampling Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/hermes-sampling-profiler/)

* Sampling profiler runs on device - no Chrome DevTools JS sampling in release
* Profile release or preview builds - dev transforms and Fast Refresh skew hotspots
* Export .cpuprofile and open in speedscope or RN DevTools Performance tab
* Look for long sync loops in renderItem, JSON.parse on fetch, and style flattening
* Enable Hermes profiling in native build flags before EAS production if needed
* Pair with React DevTools - sampling finds CPU; Profiler finds avoidable React commits

## [Flashlight Benchmarking](https://docs.wahwei/reactnative.codeguides.io/performance/flashlight-benchmarking/)

* Flashlight is BAM's Lighthouse-style audit - aggregated perf score for Android apps
* No in-app setup - CLI measures installed APK/AAB on real devices via adb
* flashlight test automates iterations; flashlight measure gives live CPU/FPS graphs
* Compare scores across Pixel 6a, Samsung A-series, and flagship - not one phone
* JS thread CPU at 100% correlates with JS FPS at 0 - watch the third graph
* Store reports per release SHA - BAM scores are regression gates, not one-off demos

## [Bundle Size Analysis](https://docs.wahwei/reactnative.codeguides.io/performance/bundle-size-analysis/)

* npx react-native-bundle-visualizer treemap shows which packages dominate Hermes bundle
* Measure production bundles - dev:false strips differently than Expo Go
* Expo Router lazy routes split heavy screens from the main TTI path
* Replace default imports with per-icon or per-function paths when treemap shows bloat
* Gate bundle size in CI - pair with Performance Budget Rules thresholds
* Lazy chunks still count toward TTI if loaded before primary interactive

## [Memory Leaks & List Churn](https://docs.wahwei/reactnative.codeguides.io/performance/memory-leaks-and-list-churn/)

* Leaks are retained references - listeners, timers, and closures holding screens
* FlatList churn: unbounded data arrays, unstable keys, and huge windowSize
* Always remove AppState, NetInfo, and navigation listeners in useEffect cleanup
* Global caches without eviction blow session memory - cap LRU or scope per user
* Images in lists need size limits and cache policy - not full-res URIs for thumbnails
* Profile soak tests - 10 minutes on reference Android, not 30-second smoke tests

## [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/)

* TTI = bytecode load + critical JS + first interactive frame - optimize each segment
* Keep app/\_layout.tsx imports minimal - heavy SDKs belong in lazy routes
* Hide splash only after fonts and auth gate resolve - avoid flash then spinner
* Hermes ships precompiled bytecode - smaller main bundle loads faster
* Defer analytics, migrations, and prefetch with InteractionManager after first paint
* Measure cold start on release builds - dev client startup is not comparable

## [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/)

* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Define TTI, FPS, bundle, and memory budgets with named owners before feature freeze
* Virtualize feeds - ScrollView for short static content only
* Profile navigation transitions in React DevTools before sprinkling memo
* Hermes sampling and Flashlight scores validate release builds, not Expo Go
* Performance regressions are rollback triggers - link to Performance Budget Rules

Reviewed by Chris St. John·Last updated Jul 18, 2026
