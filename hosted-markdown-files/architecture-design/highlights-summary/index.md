# Architecture & Design Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Architecture & Design Highlights Summary

* Keep app/ routes thin - they wire navigation; features/ owns product logic
* Map FSD layers to app/, features/, entities/, and shared/ - skip pages/ and widgets/ until you need them
* Entities are plain types + pure functions - zero React imports
* Modular monolith: one bundle ID, feature modules toggled by flags and build-time config
* Factory functions (createOrdersApi) are DI - no container framework required
* Expo Router is the default for new SDK 57 apps - file-based routes, typed routes, deep links

## [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/)

* Keep app/ routes thin - they wire navigation; features/ owns product logic
* Dependency direction flows inward: app → features → entities → shared
* Each feature exposes a public API through index.ts - no deep imports
* shared/ holds primitives and infra; features never import sibling feature internals
* Entities model domain nouns; use cases orchestrate verbs without UI imports
* Start with feature slices; add clean-architecture layers only when tests demand seams

## [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/)

* Map FSD layers to app/, features/, entities/, and shared/ - skip pages/ and widgets/ until you need them
* Import rule: a layer may only import from layers below it
* Each slice exposes a public API via index.ts - @x notation is optional in RN
* Segments (ui, model, api, lib) group files inside a slice without inventing new top-level folders
* Expo Router lives in app/ - it is the FSD app layer, not a dumping ground for feature logic
* Enforce boundaries with ESLint no-restricted-imports before the graph becomes unmappable

## [Clean Architecture on Mobile](https://docs.wahwei/reactnative.codeguides.io/architecture-design/clean-architecture-on-mobile/)

* Entities are plain types + pure functions - zero React imports
* Use cases orchestrate one user intent - signIn, placeOrder, syncOfflineQueue
* Adapters implement ports - RestAuthGateway, SecureTokenStorage
* Screens call use cases through hooks - they never import fetch or AsyncStorage
* Add layers when tests need swappable IO - not on day one of a three-screen app
* One use case per file keeps mobile workflows readable without Java-style ceremony

## [Modular Monolith vs Multi-App](https://docs.wahwei/reactnative.codeguides.io/architecture-design/modular-monolith-vs-multi-app/)

* Modular monolith: one bundle ID, feature modules toggled by flags and build-time config
* Multi-app: separate slugs, bundle IDs, and EAS projects per product surface
* APP\_VARIANT and app.config.ts branch identity without forking the repo
* Feature flags gate runtime behavior - they do not replace architectural module boundaries
* White-label is modular monolith with per-tenant config - not N separate codebases
* Split into multi-app when release cadence, compliance, or store listings truly diverge

## [Dependency Injection in RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/dependency-injection-in-rn/)

* Factory functions (createOrdersApi) are DI - no container framework required
* React context wires production implementations at the app root
* Module boundaries expose ports; adapters are swappable in tests via props or overrides
* Prefer constructor injection via factories over service locator singletons
* expo-router root \_layout.tsx is the composition root for most Expo apps
* Jest module mocks replace adapters - keep use cases ignorant of React

## [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/)

* Expo Router is the default for new SDK 57 apps - file-based routes, typed routes, deep links
* React Navigation fits brownfield apps already invested in imperative navigators
* Expo Router is built on React Navigation - you are not choosing different rendering engines
* Deep linking and universal links are simpler when routes match the filesystem
* Escape hatch: Expo Router supports custom navigators when file-based routing is insufficient
* Document the choice in an ADR when onboarding exceeds one sprint or multiple squads ship routes

## [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/)

* Server state belongs in TanStack Query - not Redux, not Zustand
* Zustand fits client UI state and small global slices without provider nesting
* Redux Toolkit pays off when time-travel debugging and middleware ecosystems are required
* React 19 useOptimistic and useActionState cover local optimistic UI without a store
* One store per domain beats a single global atom for everything
* Document the default stack in an ADR before every squad picks a different library

## [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/)

* Run this checklist on the five largest files before every major release
* God modules block parallel PRs - file length and import fan-out are objective signals
* Tier 1 items are cheap to fix early; Tier 4 items need dedicated refactor sprints
* Extract one boundary per PR - not a month-long cleanup branch
* Pair with ESLint import rules so regressions fail CI, not code review
* Score findings: P0 blocks release, P1 next sprint, P2 backlog

## [Architecture Best Practices](https://docs.wahwei/reactnative.codeguides.io/architecture-design/best-practices/)

* Start with feature slices - add FSD layers and clean architecture when boundaries hurt
* Thin Expo Router routes; fat feature modules with public index.ts APIs
* TanStack Query for server state; Zustand for small global client state
* Factory functions and AppServicesProvider - no Java-style DI containers on day one
* Modular monolith + APP\_VARIANT before splitting into multiple apps
* Run the refactoring checklist on the five largest files before major releases

Reviewed by Chris St. John·Last updated Jul 18, 2026
