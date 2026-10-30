# State Management Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / State Management Highlights Summary

* Classify state first: server, client UI, URL/navigation, form - then pick a tool
* useState fits toggles, counters, and single-screen selections
* One Context value object forces every consumer to re-render on any field change
* No provider tree - import useStore hook anywhere in the JS bundle
* Adopt when audit trails, middleware, and DevTools are organizational requirements
* Query owns API data - loading, error, cache, dedupe, and background refresh

## [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/)

* Classify state first: server, client UI, URL/navigation, form - then pick a tool
* TanStack Query owns API data; Zustand or useState own client UI that survives screen changes
* Expo Router search params are URL state - prefer them over global stores for filters
* Intermittent networks need stale-while-revalidate, not spinners on every tab focus
* Default greenfield stack: Query + Zustand (or Context) + Router params
* One global store per domain beats a single god object for the whole app
* Secure tokens belong in expo-secure-store - not Query cache or Redux persist

## [useState & useReducer](https://docs.wahwei/reactnative.codeguides.io/state-management/usestate-and-usereducer/)

* useState fits toggles, counters, and single-screen selections
* useReducer groups related transitions - forms, wizards, and step machines
* Dispatch is stable in React 19 - safe to omit from effect deps
* Keep server data in TanStack Query - not in reducer initial state from fetch
* Colocate reducers beside the screen that owns the workflow
* useActionState is web-centric; mobile forms still use Hook Form or useReducer

## [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/)

* One Context value object forces every consumer to re-render on any field change
* Split by update frequency: ThemeContext vs SessionContext vs ActionsContext
* Memoize provider value with useMemo - stable action callbacks with useCallback
* use-context-selector or Zustand when many components need one slice
* Context fits theme, locale, and session - not API catalog caches
* Measure with React DevTools Profiler before adding a global store

## [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/)

* No provider tree - import useStore hook anywhere in the JS bundle
* Selectors prevent list screens from re-rendering on unrelated slice updates
* One store per domain: cart, preferences, onboarding flags
* persist middleware + AsyncStorage for non-secret preferences only
* devtools middleware works with Flipper / Redux DevTools adapters in dev
* Reset store state in tests with useStore.setState(initial)

## [Redux Toolkit](https://docs.wahwei/reactnative.codeguides.io/state-management/redux-toolkit/)

* Adopt when audit trails, middleware, and DevTools are organizational requirements
* createSlice reduces Redux boilerplate - immer-powered reducers by default
* RTK Query is optional - prefer TanStack Query unless already on Redux
* configureStore sets up DevTools and thunk middleware in one call
* One slice per feature domain - avoid a single orders-and-ui-and-auth monolith
* Test reducers as pure functions; integration tests use mock store factory

## [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/)

* Query owns API data - loading, error, cache, dedupe, and background refresh
* staleTime controls how long cached data stays fresh without refetching
* gcTime controls how long inactive cache remains in memory after unmount
* onlineManager + NetInfo and focusManager + AppState wire mobile lifecycle
* persistQueryClient with AsyncStorage or expo-sqlite for offline reads
* Mutations use onMutate for optimistic UI with automatic rollback on error

## [Jotai & Atomic State](https://docs.wahwei/reactnative.codeguides.io/state-management/jotai-and-atomic-state/)

* Atoms are minimal units of state - components subscribe only to atoms they use
* Derived atoms compute from other atoms without manual dependency arrays
* Fine-grained updates help canvas editors, builders, and multi-panel dashboards
* No provider required for atoms - Provider only for store scope in tests
* Prefer Zustand unless the team already thinks in atomic graphs
* Keep server data in TanStack Query - atoms for client UI composition

## [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/)

* Cold start UX: show last good UI while stores rehydrate asynchronously
* Gate navigation on session hydration - not on every Zustand preference read
* expo-secure-store for access tokens; AsyncStorage for non-sensitive prefs
* persistQueryClient dehydrates server cache - clear on logout
* Avoid hydration flash with PersistGate pattern or splash hold until ready
* Version persisted schemas - migrate or bump storage keys on breaking changes

## [State Management Best Practices](https://docs.wahwei/reactnative.codeguides.io/state-management/best-practices/)

* Classify state before choosing a library: server, client, URL, form, secrets
* Default stack: TanStack Query + Zustand (or Context) + Expo Router params
* Never store API catalogs in global client stores - Query owns server state
* Wire focusManager and onlineManager for mobile lifecycle on day one
* Hydrate session and prefs before routing to avoid flash of wrong screen
* Document the team choice in an ADR before the third global store appears

Reviewed by Chris St. John·Last updated Jul 18, 2026
