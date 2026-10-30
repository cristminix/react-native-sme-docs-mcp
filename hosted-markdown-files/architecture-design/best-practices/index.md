# Architecture Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Architecture Best Practices

* Start with feature slices - add FSD layers and clean architecture when boundaries hurt
* Thin Expo Router routes; fat feature modules with public index.ts APIs
* TanStack Query for server state; Zustand for small global client state
* Factory functions and AppServicesProvider - no Java-style DI containers on day one
* Modular monolith + APP\_VARIANT before splitting into multiple apps
* Run the refactoring checklist on the five largest files before major releases

1. **Start with feature slices, not microservices:** Colocate screens, hooks, and components per product area in `features/<name>/` - evolve structure with team size, not day-one distributed systems.
2. **Keep Expo Router routes thin:** `app/**/*.tsx` re-exports feature screens and parses params - business logic belongs in `src/features/`, not route files.
3. **Expose a public API per feature:** Curate `features/<name>/index.ts` - sibling features import the barrel, never deep paths into `components/` or `model/`.
4. **Respect inward dependency flow:** `app → features → entities → shared` - shared code never imports features; entities never import features.
5. **Put shared primitives in `shared/ui`:** Generic `Button` and `Screen` live in shared; domain-specific `UserAvatar` lives in `entities/user/ui`.
6. **Model nouns in entities:** Plain types and pure functions for `User`, `Order` - zero React imports, testable in Node without a renderer.
7. **Hide IO behind adapters:** `createOrdersApi(client)` and `createSecureTokenStorage()` - screens and use cases never call `fetch` or `SecureStore` directly.
8. **Add use cases when tests need seams:** Extract `signIn`, `placeOrder` use cases when hooks mix IO, branching rules, and UI state - not for every button toggle.
9. **Return discriminated unions from use cases:** `{ ok: false, error: "network" }` beats thrown errors across layer boundaries - callers handle failures explicitly.
10. **Wire dependencies at the composition root:** `AppServicesProvider` in `app/_layout.tsx` binds production adapters - avoid module-scope singletons.
11. **Prefer factory injection over DI frameworks:** `createX(deps)` plus React context covers mobile needs - skip tsyringe/Inversify unless org mandates it.
12. **Default to TanStack Query for server state:** Lists, details, and mutations belong in Query cache - not Redux or Zustand slices duplicating API data.
13. **Use Zustand for small global client state:** Cart, preferences, and UI chrome - selectors prevent list re-render storms; not for server JSON blobs.
14. **Keep ephemeral UI state local:** Sheet open state and accordion index stay in the screen tree until a second unrelated route genuinely needs them.
15. **Put URL state in Expo Router params:** Filters and tabs via `useLocalSearchParams` - shareable deep links beat global store keys.
16. **Document navigation choice in an ADR:** Greenfield SDK 57 apps default to Expo Router; brownfield React Navigation stays valid - record the decision for onboarding.
17. **Map FSD layers pragmatically:** `app/`, `features/`, `entities/`, `shared/` - skip `widgets/` and `pages/` until a composite block repeats across routes.
18. **Enforce boundaries with ESLint:** `no-restricted-imports` blocking `@/features/*/components/*` - folder conventions alone fail at 10+ features.
19. **Modular monolith before multi-app:** One repo with `APP_VARIANT` and feature flags until bundle IDs, compliance, or release cadence truly diverge.
20. **Separate EAS Update channels per variant:** `production-consumer` vs `production-business` - wrong channel updates the wrong store listing.
21. **Centralize config in `getAppConfig()`:** Read `Constants.expoConfig?.extra` once - features do not scatter `process.env` and `__DEV__` branches.
22. **Orchestrate cross-feature flows at routes:** Pass `onAddToCart` callbacks from route files - features do not import sibling feature stores.
23. **Run the refactoring checklist before RC:** Audit top five files by line count and import fan-out - god modules block parallel PRs and SDK upgrades.
24. **Extract incrementally, one boundary per PR:** Move one hook or component per merge - abandon multi-week "cleanup" branches that diverge from `main`.
25. **Match architecture investment to risk:** Auth, payments, and offline sync earn ports and use cases - three-screen MVPs earn hooks and an API module until complexity proves otherwise.

## FAQs

When should we adopt full Clean Architecture?

When you need swappable IO (mock/staging/prod), compliance unit tests on business rules, or multiple adapters per feature - not on day one of a CRUD app.

Is Expo Router mandatory on SDK 57?

Default for greenfield apps. Brownfield React Navigation remains supported - migrate when deep linking pain exceeds migration cost.

How many global stores is too many?

More than Query + one client store (Zustand or Context) warrants an audit. Server data should not live in client stores.

## Related

* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - layers, boundaries, and 10 starter examples
* [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - slice layers and import rules
* [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/) - entities, use cases, adapters
* [Dependency Injection in RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/) - testable services without frameworks
* [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - pre-release god module audit
* [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) - Expo Router vs React Navigation
* [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - Query-first vs Zustand vs Redux

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

pbqrthvqrf.vb|ptvb875|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
