# State Management Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / State Management Best Practices

* Classify state before choosing a library: server, client, URL, form, secrets
* Default stack: TanStack Query + Zustand (or Context) + Expo Router params
* Never store API catalogs in global client stores - Query owns server state
* Wire focusManager and onlineManager for mobile lifecycle on day one
* Hydrate session and prefs before routing to avoid flash of wrong screen
* Document the team choice in an ADR before the third global store appears

1. **Classify state first:** Label every piece as server, client UI, URL/navigation, form, or secret - then match to a tool. Random library picks create overlapping caches.
2. **Query-first for API data:** TanStack Query owns lists, details, loading, errors, dedupe, and background refresh. Do not hand-roll `useEffect` fetch on the fifth networked screen.
3. **Keep client UI out of Query cache:** Theme toggles, wizard steps, and modal flags are not query keys. Misusing cache semantics serializes UI into server infrastructure.
4. **Default greenfield stack:** TanStack Query (server) + Zustand or split Context (client) + Expo Router search params (shareable filters). Add Redux only when an ADR requires it.
5. **useState for ephemeral screen UI:** Modal open, single-screen selection, and simple toggles stay local until another route genuinely needs the value.
6. **useReducer for coupled transitions:** Wizards, small multi-field forms, and step machines get one reducer - not five independent `useState` calls that drift out of sync.
7. **Split Context by update frequency:** Theme, session state, and actions live in separate contexts. One mega-context re-renders the list on every cart tick.
8. **Memoize provider values:** `useMemo` for state objects and `useCallback` for actions. Inline `{ signOut: () => ... }` in provider value breaks `React.memo` downstream.
9. **Reach for Zustand when selectors matter:** Global cart, preferences, and flags need fine-grained subscriptions. Select primitives - `useStore((s) => s.count)` - not the whole store.
10. **One store per domain:** `cartStore`, `preferencesStore` - not `appStore` with forty unrelated fields. Import cycles and test resets get painful fast.
11. **Redux Toolkit when audit matters:** Regulated workflows, mandated DevTools, and middleware ecosystems justify RTK. Not for a badge counter on day one.
12. **Do not run two server caches:** Pick TanStack Query or RTK Query for the same API - never both. Migration is slice-by-slice with a checklist.
13. **Wire mobile lifecycle for Query:** `onlineManager` + NetInfo and `focusManager` + AppState in bootstrap. Web defaults do not refetch on app foreground.
14. **Tune staleTime and gcTime deliberately:** Catalog reads tolerate minutes of staleness; balances and checkout totals do not. Document defaults in `createQueryClient`.
15. **Optimistic mutations with rollback:** Use `onMutate`, `cancelQueries`, snapshot `previous`, and restore on `onError`. Manual optimistic `useState` scales poorly across screens.
16. **Persist reads, not secrets:** `persistQueryClient` and Zustand `persist` for public catalog and prefs. Access tokens go to `expo-secure-store` - never AsyncStorage.
17. **Hydrate before routing:** Session and persisted prefs must finish loading before choosing auth vs app stacks. Pair with splash hold to avoid flash of login screen.
18. **Clear all layers on logout:** Secure token, Zustand slices, Query cache, and disk persister. Shared tablets leak PII when only one layer clears.
19. **URL state via Expo Router params:** Filters and tabs that marketing wants shareable belong in `useLocalSearchParams` - not a global store that breaks deep links.
20. **Forms stay colocated:** React Hook Form or screen-level reducer for inputs; `useMutation` on submit. Do not stream every keystroke into Zustand.
21. **Jotai for atomic UIs only when justified:** Builder and inspector panels benefit from derived atoms. Default hires know Zustand - document Jotai in an ADR if adopted.
22. **Test store boundaries:** Reset Zustand with `setState(initial, true)`; isolated `QueryClient` with `retry: false`. Mock network at service edge, not inside reducers.
23. **Measure before optimizing:** React DevTools Profiler on list scroll beats premature Jotai adoption. Fix provider storms before sprinkling `React.memo` on two hundred rows.
24. **Version persisted schemas:** Bump `name: "preferences-v3"` or Query `buster` on breaking API or shape changes. OTA without cache bust parses stale JSON into crashes.
25. **Record the decision in an ADR:** Before squad B installs MobX while squad A uses Redux, write [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) and link it from store modules.

## FAQs

What is the smallest stack for a new Expo SDK 57 app?

TanStack Query + `useState`/`useReducer` on screens. Add Zustand when a second route needs the same client state. Add Context for session if Zustand feels heavy for one user object.

When is Redux still correct?

Audit trails, time-travel debugging requirements, and existing org standards. See [Redux Toolkit](https://docs.wahwei/reactnative.codeguides.io/state-management/redux-toolkit/).

How do I know state is in the wrong layer?

Same API data edited in Zustand and Query; token in Query cache; filter in global store but not in URL when shareable. Run the checklist in [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/).

## Related

* [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/) - 10 intro examples and classification
* [useState & useReducer](https://docs.wahwei/reactnative.codeguides.io/state-management/usestate-and-usereducer/) - local workflows
* [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - provider performance
* [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - global client store
* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server cache on mobile
* [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - cold start and tokens
* [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - ranked decisions

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
