# Essential Libraries Best Practices

A condensed summary of the **25 most important essential-library practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / Essential Libraries Best Practices

* npx expo install for every native module - SDK 57 matrix, not npm latest
* TanStack Query for server state; Zustand for client UI - never duplicate API caches
* MMKV for hot-path sync KV; AsyncStorage for boot hydration; SQLite for relational
* FlashList after profiling - not preemptive migration of every FlatList
* Reanimated plugin last in Babel; GestureHandlerRootView at root
* One crash reporter with source maps on every EAS production build

1. **`npx expo install` for native modules:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-mmkv`, `@shopify/flash-list`, and `@sentry/react-native` must match the SDK 57 compatibility table - manual npm pins cause EAS native build failures.
2. **Audit native transitive deps before adopting:** Every native library is autolinking surface, install size, and an SDK upgrade reconciliation item - run `npx expo-doctor` and `npx expo prebuild --dry-run` on dependency PRs.
3. **TanStack Query owns server state:** API lists, profiles, and settings with loading/error/cache belong in Query - not Zustand, Context, or `useEffect` fetches - [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/).
4. **Zustand owns client UI state:** Cart badges, theme prefs, onboarding flags, and filter chips - one store per domain with selectors - [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/).
5. **Never duplicate API data in global stores:** If Query already caches `products`, do not mirror them in Zustand - invalidation becomes manual and logout cleanup fails.
6. **Wire mobile Query lifecycle at bootstrap:** `onlineManager` + NetInfo and `focusManager` + AppState in `_layout` - without this, foreground refetch and offline retry behave like web defaults - [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/).
7. **One QueryClient per app:** Create in root layout with `useState(createQueryClient)` - never per screen or per navigator.
8. **Zustand selectors always:** `useStore((s) => s.field)` - bare `useStore()` re-renders on every slice change.
9. **Secrets never in Zustand persist or MMKV plaintext:** Tokens and refresh credentials live in `expo-secure-store` - MMKV holds non-secret prefs and drafts only.
10. **Pick storage by data shape:** AsyncStorage for small JSON at boot; MMKV for synchronous hot-path reads; SQLite for relational offline data - not one store for everything - [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/).
11. **Version every persisted schema:** `meta:schemaVersion` for MMKV, `PRAGMA user_version` for SQLite, keyed migrations before new shapes reach production.
12. **FlashList after profiling, not by default:** Migrate feeds when Android profiling shows scroll jank - keep FlatList for short settings screens - [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/).
13. **`estimatedItemSize` is mandatory on FlashList:** Wrong estimates cause scroll jump and blank gaps - set `minHeight` on rows to match.
14. **Memoize recycled list rows:** `memo` on row components, stable `renderItem` via `useCallback`, props-only state - recycled views expose stale closure bugs.
15. **Install Reanimated and Gesture Handler as a pair:** SDK 57 matrix - `react-native-reanimated` ~4.0.0 and `react-native-gesture-handler` ~2.28.0 - [react-native-reanimated & gesture-handler](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-reanimated-and-gesture-handler/).
16. **Babel plugin last:** `react-native-reanimated/plugin` is always the final entry in `babel.config.js` - then `npx expo start --clear`.
17. **GestureHandlerRootView at root:** Wrap `app/_layout.tsx` - pans and sheets fail silently without it.
18. **Import Animated from Reanimated for worklets:** Not from `react-native` - mixing APIs breaks gesture-driven UI.
19. **Rebuild dev client after native library changes:** MMKV, FlashList, Sentry, and Reanimated require EAS or dev client rebuild - Metro restart alone is not enough.
20. **One crash reporter:** `@sentry/react-native` with wizard setup - not `sentry-expo` (deprecated) and not two vendors - [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/).
21. **Sentry.init before other imports:** Top of `_layout.tsx`; `Sentry.wrap` on root once - pair with source map upload on every EAS production build.
22. **Set release and dist correctly:** `release` = native version + build; `dist` = OTA update id - aligns crash reports with the binary users run - [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/).
23. **Sunset unused libraries before SDK upgrades:** Run `npx knip` and `npx depcheck` - dead native modules inflate autolinking and break reconciliation - [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/).
24. **Dependency PR checklist:** `npx expo install`, `expo-doctor` clean, device test note, no duplicate problem-class library, ADR updated if team default changes.
25. **Logout clears all layers:** `queryClient.clear()`, Zustand reset, MMKV user instance wipe, SecureStore token delete, and SQLite user tables - stale cache is a security defect.

## FAQs

What is the default essential stack for SDK 57?

TanStack Query + NetInfo, Zustand, MMKV (when profiled), FlashList (for feeds), Reanimated 4 + Gesture Handler, and @sentry/react-native - installed via `npx expo install`.

Can I use npm install for any of these?

JS-only: `@tanstack/react-query`, `zustand`. Native modules: always `npx expo install`. Commit lockfile changes with every dependency PR.

When do I need MMKV vs AsyncStorage?

Start with AsyncStorage. Add MMKV when profiling shows async `getItem` on the critical path - composer drafts, feature flags read every mount, Zustand persist flicker.

Do I need FlashList on day one?

No - profile first. Short lists and settings screens stay on FlatList until scroll performance fails on target Android hardware.

Where do I go deeper on each library?

State Management and Observability sections have full cookbooks - Essential Libraries pages are the install-and-defaults cards with links inward.

## Related

* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - pick, pin, and sunset with 10 examples
* [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) - server state defaults
* [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/) - minimal global store
* [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/) - fast KV storage
* [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/) - migration checklist
* [react-native-reanimated & gesture-handler](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-reanimated-and-gesture-handler/) - SDK 57 version matrix
* [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/) - EAS crash reporting
* [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/) - keep the graph lean

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiODk2fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
