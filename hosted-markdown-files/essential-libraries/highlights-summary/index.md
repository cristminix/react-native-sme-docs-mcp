# Essential Libraries Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Essential Libraries Highlights Summary

* npx expo install pins native modules to the SDK 57 compatibility table - not npm guesses
* QueryClient defaults: staleTime 30s, gcTime 5min, retry 2 - tuned for mobile LTE
* No Provider tree - import useStore hook anywhere in the JS bundle
* Synchronous mmap reads - orders of magnitude faster than AsyncStorage await
* estimatedItemSize is required - wrong estimates cause scroll jump and blank gaps
* SDK 57 matrix: react-native-reanimated ~4.0.0, gesture-handler ~2.28.0

## [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/)

* npx expo install pins native modules to the SDK 57 compatibility table - not npm guesses
* Every native dependency is autolinking surface, install size, and an EAS rebuild trigger
* Server state → TanStack Query; client UI → Zustand; never duplicate API caches in global stores
* Sunset unused libraries before SDK upgrades - knip and depcheck catch dead weight early
* ADR or team defaults beat per-feature library roulette - one list stack, one crash reporter
* Lockfile + expo-doctor in CI catches version skew before expensive native builds

## [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/)

* QueryClient defaults: staleTime 30s, gcTime 5min, retry 2 - tuned for mobile LTE
* Wire onlineManager to NetInfo and focusManager to AppState at bootstrap
* One QueryClient per app - create in \_layout, never per screen
* Mutations invalidate related query keys - not manual Zustand cache copies
* JS-only install - npx expo install @tanstack/react-query plus NetInfo
* Full patterns in state-management/tanstack-query - this page is the defaults card

## [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/)

* No Provider tree - import useStore hook anywhere in the JS bundle
* Selectors prevent list screens from re-rendering on unrelated slice updates
* One store per domain: cart, preferences, onboarding flags
* persist + MMKV or AsyncStorage for non-secret preferences only
* Never store API responses - TanStack Query owns server cache
* Full patterns in state-management/zustand - this page is the minimal cookbook

## [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/)

* Synchronous mmap reads - orders of magnitude faster than AsyncStorage await
* Ideal for feature flags, drafts, Zustand persist on hot paths
* Requires a development build - not available in stock Expo Go
* Multiple named instances isolate domains: app, cache, experiments
* Not a database - no queries; use expo-sqlite for relational offline data
* Secrets need encryption key from expo-secure-store

## [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/)

* estimatedItemSize is required - wrong estimates cause scroll jump and blank gaps
* View recycling demands memoized rows with props-only state
* Migration: install, swap import, add estimate, audit variable heights
* drawDistance tunes pre-render distance ahead of the viewport
* FlatList remains fine for short settings screens - profile before migrating
* Trade-offs and tuning in lists-scrolling/flashlist-vs-flatlist

## [react-native-reanimated & gesture-handler](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-reanimated-and-gesture-handler/)

* SDK 57 matrix: react-native-reanimated ~4.0.0, gesture-handler ~2.28.0
* Install both together with npx expo install - never hand-pin native versions
* react-native-reanimated/plugin must be the last babel.config.js plugin
* GestureHandlerRootView wraps the root layout - required for pans and sheets
* Import Animated from react-native-reanimated for worklet components
* Deep patterns in animations-gestures section - this page is install + matrix

## [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/)

* Initialize Sentry before other app imports in \_layout or index.js
* Upload source maps on every EAS production build - Hermes stacks need symbolication
* Set release to native version+build and dist to OTA update id when applicable
* Sentry.wrap on root component - one wrap, not duplicate captureException
* Wizard configures Metro plugin and EAS build hooks for SDK 57
* Full observability patterns in sentry-for-react-native deep guide

## [Essential Libraries Best Practices](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/best-practices/)

* npx expo install for every native module - SDK 57 matrix, not npm latest
* TanStack Query for server state; Zustand for client UI - never duplicate API caches
* MMKV for hot-path sync KV; AsyncStorage for boot hydration; SQLite for relational
* FlashList after profiling - not preemptive migration of every FlatList
* Reanimated plugin last in Babel; GestureHandlerRootView at root
* One crash reporter with source maps on every EAS production build

49454e4f4d5f434e4f5904434556494d434512121c56181a181c1a1d

Reviewed by Chris St. John·Last updated Jul 19, 2026
