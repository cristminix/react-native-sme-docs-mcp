# Navigation & Routing Rules

File-based routing conventions and deep-link hygiene for Expo Router on Expo SDK 57. These rules keep navigation predictable as the `app/` tree grows, prevent auth and param bugs from malformed URLs, and ensure store builds handle universal links correctly on iOS and Android.

Highlights / Navigation & Routing Rules

* Route files re-export feature screens - no business logic in app/
* One root \_layout.tsx owns providers; nested layouts only handle stack/tab chrome
* Declare scheme and associated domains in app.config before shipping deep links
* Validate route params with Zod at the feature boundary - never trust URL input
* Use typed routes (experiments.typedRoutes) and href objects - not stringly-typed paths
* Test critical deep links in Maestro smoke flows and contract-test param parsing in Jest

## How to Use This Checklist

* Apply **Tier 1** when scaffolding `app/` or adding a new route group - layout mistakes are expensive to unwind.
* Review **Tiers 2–3** on every PR that touches `app/`, `Link`, `router.push`, or `app.config` scheme settings.
* Run **Tier 4** before store submission - deep links and auth redirects are top crash sources in production analytics.
* Pair param validation rules with Jest contract tests - lint cannot prove a malformed deep link is rejected.
* Document non-standard navigation patterns (modals as routes vs overlays) in an ADR before the third team copies them.

---

## Tier 1: File Structure & Layouts (1–6)

1. **Route files re-export feature screens:** `app/(tabs)/orders/index.tsx` imports `OrdersScreen` from `features/orders` - no hooks, fetch calls, or Redux in route files.

   * **Target:** Route files under 20 lines; logic lives in testable feature modules.
   * **Reject:** 200-line screens committed directly under `app/`.
2. **One root `_layout.tsx` owns global providers:** Theme, auth session, query client, and error boundaries mount once at `app/_layout.tsx` - not repeated in every nested layout.

   * **Order:** Splash → fonts → providers → `<Slot />` or stack - document the sequence in README.
   * **Reject:** Duplicate `QueryClientProvider` in tab and stack layouts.
3. **Nested layouts handle chrome only:** Tab `_layout.tsx` defines icons and tab bar; stack `_layout.tsx` sets `headerShown` and transitions - not feature data fetching.

   * **Pattern:** `useFocusEffect` refetch belongs in the screen component, not `_layout.tsx`.
   * **Exception:** Auth gate layouts that redirect unauthenticated users - keep redirect logic minimal.
4. **Use route groups for organization, not runtime behavior:** `(auth)`, `(tabs)`, and `(modals)` group files without affecting the URL path - parentheses folders are for structure.

   * **Naming:** Lowercase kebab-case file names match URL segments - `order-detail.tsx` → `/order-detail`.
   * **Reject:** Deep nesting purely to mirror org chart (`app/team-a/feature-b/...`).
5. **Index routes for list hubs; dynamic segments for entities:** `orders/index.tsx` lists orders; `orders/[id].tsx` shows one order - predictable REST-like URLs aid deep linking and analytics.

   * **Catch-all:** Reserve `[...slug].tsx` for CMS or legacy URL support - validate segments immediately.
   * **Reject:** Opaque IDs in query strings when a path segment is clearer (`/orders/123` not `/orders?id=123`).
6. **Colocate loading and error UI with routes when using Suspense boundaries:** `orders/[id].tsx` can export a parallel `orders/[id]/loading.tsx` or handle skeletons in the screen - do not leave blank flashes during navigation.

   * **Pattern:** Feature screen accepts `isLoading` prop; route wires suspense if adopted.
   * **Test:** RNTL `renderRouter` for critical stacks.

---

## Tier 2: Navigation API & Typed Routes (7–12)

7. **Prefer `href` objects over string paths:** `router.push({ pathname: '/orders/[id]', params: { id } })` - typed routes catch typos at compile time when `experiments.typedRoutes` is enabled.

   * **Enable:** `experiments: { typedRoutes: true }` in `app.config` for SDK 57 projects.
   * **Reject:** `router.push('/orders/' + id)` without param validation.
8. **Use `Link` for declarative navigation; `router` for imperative:** `Link` preserves accessibility and prefetch semantics - imperative `router.replace` only after mutations or auth redirects.

   * **Back stack:** `router.replace` after login/logout - `push` duplicates auth screens on back gesture.
   * **Reject:** `router.push` inside `onPress` when `Link` with `asChild` and `Pressable` suffices.
9. **Centralize route constants in one module:** `routes.ts` exports `href` builders - features import `orderDetailHref(id)` instead of scattering path strings.

   * **Monorepo:** Shared `packages/navigation` for white-label apps with identical route shapes.
   * **Reject:** Copy-pasted `'/settings/account'` in twelve files.
10. **Modal and presentation routes are explicit:** Full-screen modals get a `(modals)` group or `presentation: 'modal'` in stack options - half-implemented overlays confuse Android back behavior.

    * **Android:** Test hardware back on every modal route - it must dismiss the modal, not exit the app.
    * **ADR:** Document when using React Native `Modal` vs a route-based modal.
11. **Protect authenticated routes in layout, not per-screen guards:** `(app)/_layout.tsx` checks session and redirects to `/(auth)/login` - individual screens should not each duplicate auth checks.

    * **Stale session:** Listen for token expiry at the layout level and call `router.replace`.
    * **Reject:** `if (!user) return null` in every protected screen without redirect.
12. **Handle initial URL and cold-start deep links once:** `useURL()` or Expo Router's linking config resolves the launch URL - do not parse `Linking.getInitialURL()` in every screen.

    * **Pattern:** Auth layout reads pending deep link after login and navigates to stored path.
    * **Test:** Maestro flow opening `myapp://orders/42` from outside the app.

---

## Tier 3: Deep Links & Universal Links (13–18)

13. **Declare `scheme` in `app.config` before shipping custom URL schemes:** `scheme: "acme"` enables `acme://` links - must match marketing and QA documentation.

    * **Multiple schemes:** Use `scheme: ["acme", "acme-dev"]` for environment variants - not one scheme for all builds.
    * **Verify:** `npx uri-scheme list` after prebuild.
14. **Configure associated domains for universal links (iOS) and app links (Android):** `ios.associatedDomains` and `android.intentFilters` in `app.config` - hand-editing native files breaks on CNG prebuild.

    * **Config plugin:** Use `expo-router` plugin and documented associated-domain plugins.
    * **Reject:** Shipping universal links without `apple-app-site-association` hosted and validated.
15. **Validate route params at the feature boundary:** Zod (or similar) parses `useLocalSearchParams()` before rendering - malformed deep links show a friendly error, not a redbox.

    * **Example:** `const { id } = orderParamsSchema.parse(params)` in `OrderDetailScreen`.
    * **CI:** Contract tests for param schemas - not E2E for every param combo.
16. **Never trust query-string input for security decisions:** Deep-link `?admin=true` does not grant admin - authorize on the server and in session state.

    * **Sanitize:** Strip unknown params; log rejected payloads in staging.
    * **Reject:** `if (params.promo)` applying discounts without server validation.
17. **Document supported deep-link matrix in README:** Path, required params, auth requirement, and example URL per route - support and marketing depend on this table.

    * **Version:** Bump matrix when routes rename - broken links survive in email campaigns for years.
    * **Tooling:** Generate matrix from route types where possible.
18. **Fallback route for unknown paths:** `[...unmatched].tsx` or `+not-found.tsx` shows recoverable UI with a link home - default 404 redboxes hurt store reviews.

    * **Analytics:** Log unmatched paths to catch broken campaigns.
    * **Test:** Open `myapp://does-not-exist` in Maestro smoke.

---

## Tier 4: Performance, Testing & Review (19–24)

19. **Lazy-load heavy tab screens when tabs are rarely visited:** Dynamic `import()` for settings sub-screens or admin tools - not for primary revenue tabs users open every session.

    * **Measure:** Bundle analyzer before lazy-splitting - premature splits add latency.
    * **Reject:** Lazy-loading the home tab first paint path.
20. **Avoid navigation state in global mutable singletons:** Pass params via router or feature stores - module-level `let pendingOrderId` breaks on fast navigations and OTA reloads.

    * **Fix:** TanStack Query cache keyed by route param, or route params as source of truth.
    * **Smell:** `global.pendingDeepLink` set in one file, read in another.
21. **Reset stack on logout:** `router.dismissAll()` or replace to auth stack - back gesture must not return to authenticated screens with a cleared token.

    * **Test:** Logout → hardware back → should not show PII.
    * **Pair with:** [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) token clearing.
22. **Do not block first paint on navigation font/icon loading:** Load tab icons from static assets; defer custom font routes until root layout finishes `useFonts`.

    * **Pattern:** Root layout returns `null` until fonts load - child routes do not duplicate font gates.
    * **Reject:** `if (!fontsLoaded) return null` mid-hook-order in a screen (hooks rule violation).
23. **E2E smoke covers three deep-link paths:** Launch, auth-gated path, and primary entity detail - Maestro YAML against EAS preview builds, not Expo Go alone.

    * **Pin:** `appId` to bundle identifier from `app.config`.
    * **CI:** Run on release candidates on physical devices.
24. **PR checklist for routing changes:** Renamed file? Updated deep-link matrix? Param schema test? Android back on modals? - attach to routing PR template.

    * **Breaking change:** Route rename is a breaking API for marketing links - version or redirect old paths.
    * **OTA note:** JS-only route additions are OTA-safe; scheme changes require a store build.

## Applying the Checklist in Order

* **Tier 1 (1–6):** File and layout structure - establish before adding features; moving screens later breaks bookmarks and analytics.
* **Tier 2 (7–12):** Navigation API - prevents stringly-typed paths and duplicated auth logic.
* **Tier 3 (13–18):** Deep links - required before external campaigns and universal links go live.
* **Tier 4 (19–24):** Performance and verification - gate release candidates and OTA promotions.

## FAQs

Should business logic live in app/ or features/?

Always in `features/` - `app/` is a routing table. Route files import and re-export screens; they do not fetch data or own hooks beyond trivial wiring.

How do I enable typed routes in SDK 57?

Set `experiments: { typedRoutes: true }` in `app.config` and use `href` objects with `router.push` and `Link`. Run `npx expo customize tsconfig.json` if the template has not already.

Where do auth redirects belong?

In a dedicated layout (`(app)/_layout.tsx` or `(auth)/_layout.tsx`) that checks session once and calls `router.replace`. Avoid per-screen `useEffect` redirects that race on cold start.

Custom scheme vs universal links?

Custom schemes (`acme://`) are easier to test but can be hijacked on some Android versions. Universal/app links (`https://app.acme.com/...`) are required for email and web-to-app campaigns - configure both for production apps.

How do I validate deep-link params?

Parse `useLocalSearchParams()` with Zod at the top of the feature screen. Show a 404 or error state on failure. Add Jest tests for the schema - not Maestro for every invalid param.

Modal as route or React Native Modal?

Route-based modals participate in deep linking and Android back - prefer them for shareable flows. RN `Modal` is fine for ephemeral pickers with no URL representation. Document the choice in an ADR.

Can I rename a route file after launch?

Yes in JS via OTA, but old URLs break unless you add redirects in `[...unmatched].tsx` or keep alias files. Treat route paths as a public API - version breaking changes.

How many \_layout.tsx files is too many?

One root plus one per major navigator (tabs, auth stack, modals group) is typical. More than four nested layouts usually means the tree should be flattened or route groups reorganized.

Does Expo Router work with New Architecture?

Yes on RN 0.86 and SDK 57 - navigation rules are unchanged. Test gestures and screen transitions on mid-tier Android when enabling New Architecture.

Should I use redirect in middleware?

Expo Router supports redirect exports in route files for simple cases. Auth gates with async session hydration still belong in layout components that wait for auth state before rendering children.

How do I test navigation in Jest?

Use `@testing-library/react-native` `renderRouter` for integration tests on critical stacks. Unit-test param schemas separately. Reserve Maestro for full deep-link cold-start flows.

What breaks OTA vs store builds for routing?

Adding JS routes is OTA-safe. Changing `scheme`, associated domains, or intent filters requires a new native build and store submission.

How do I handle pending deep links after login?

Store the initial URL from `useURL()` or linking config in memory, complete login, then `router.replace` to the stored path. Clear the pending value after navigation to prevent loops.

## Related

* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - thin `app/` and project scaffolding rules
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - auth tokens and secure logout navigation
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - what routing changes ship OTA vs native
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - lazy loading and TTI ownership
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - document modal and auth architecture choices
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
